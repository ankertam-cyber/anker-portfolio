import {canonical} from './content-model.mjs';
export const REPOSITORY='ankertam-cyber/anker-portfolio';
const API='https://api.github.com/repos/'+REPOSITORY;
export const encodeContent=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);};
export const decodeContent=value=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export function createGitHubPublisher({request=globalThis.fetch}={}){
 let credential='',sha=null,baseline='';
 async function api(route,options={}){
  const response=await request(API+route,{...options,redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(credential?{Authorization:'Bearer '+credential}:{}),...(options.body?{'Content-Type':'application/json'}:{})}});
  if(!response.ok){if(response.status===401)throw Error('GitHub 權限已失效，請重新連接');if(response.status===403)throw Error('GitHub 權限不足或暫時達到請求限制；請確認 Contents: Read and write、Actions: Read-only');if([409,422].includes(response.status))throw Error('GitHub 已有其他更新，請先重新載入正式內容，草稿仍保留');throw Error('GitHub 請求未完成（'+response.status+'），草稿仍保留');}return response.json();
 }
 async function remoteContent(){const file=await api('/contents/site/content.json?ref=main');if(file.encoding!=='base64'||!file.content||!file.sha)throw Error('無法讀取 GitHub 內容檔');return {sha:file.sha,doc:JSON.parse(decodeContent(file.content))};}
 return {
  async connect(token,published){credential=token.trim();sha=null;if(!credential)throw Error('請先輸入 GitHub token');try{const repo=await api('');if(repo.full_name!==REPOSITORY||!repo.permissions?.push)throw Error('呢個 token 未有本網站嘅寫入權限');const remote=await remoteContent();if(canonical(remote.doc)!==canonical(published))throw Error('GitHub 有較新內容，請下載草稿備份後重新載入正式內容');sha=remote.sha;baseline=canonical(published);return true;}catch(error){credential='';throw error;}},
  disconnect(){credential='';sha=null;baseline='';},
  connected(){return Boolean(credential&&sha);},
  async publish(doc,published){if(!credential||!sha)throw Error('請先連接 GitHub');if(canonical(published)!==baseline)throw Error('正式內容版本已改變，請重新連接 GitHub');const current=await remoteContent();if(current.sha!==sha)throw Error('GitHub 已有其他更新，請下載草稿備份後重新載入正式內容');const result=await api('/contents/site/content.json',{method:'PUT',body:JSON.stringify({message:'Update portfolio content from owner back office',branch:'main',sha,content:encodeContent(JSON.stringify(doc,null,2)+'\n')})});sha=result.content.sha;baseline=canonical(doc);return {sha:result.commit.sha,url:'https://github.com/'+REPOSITORY+'/commit/'+result.commit.sha,revision:doc.revision};},
  async deployment(commit){const data=await api('/actions/workflows/pages.yml/runs?head_sha='+encodeURIComponent(commit)+'&per_page=5');const run=data.workflow_runs?.find(r=>r.head_sha===commit);return run?{status:run.status,conclusion:run.conclusion,url:run.html_url}:null;}
 };
}
