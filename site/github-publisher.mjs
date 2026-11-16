import {canonical} from './content-model.mjs';
import {assertNoDeletedMediaRestore} from './media-purge.mjs';
import {uploadedRepoPath,referencedMediaSources,uploadedDeletionPaths,uploadedMediaUrl} from './upload-paths.mjs';
export const REPOSITORY='ankertam-cyber/anker-portfolio';
const API='https://api.github.com/repos/'+REPOSITORY;
export const encodeContent=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);};
export const decodeContent=value=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export async function encodeBinaryContent(blob){const bytes=new Uint8Array(await blob.arrayBuffer()),chunks=[];for(let index=0;index<bytes.length;index+=32768)chunks.push(String.fromCharCode(...bytes.subarray(index,index+32768)));return btoa(chunks.join(''));}
export function createGitHubPublisher({request=globalThis.fetch}={}){
 let credential='',sha=null,baseline='';
 async function api(route,{timeoutMs=25000,...options}={}){
  const response=await request(API+route,{...options,redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(credential?{Authorization:'Bearer '+credential}:{}),...(options.body?{'Content-Type':'application/json'}:{})}});
  if(!response.ok){if(response.status===401)throw Error('GitHub 權限已失效，請重新連接');if(response.status===403)throw Error('GitHub 權限不足或暫時達到請求限制；請確認 Contents: Read and write、Actions: Read-only');if([409,422].includes(response.status))throw Error('GitHub 已有其他更新，請先重新載入正式內容，草稿仍保留');throw Error('GitHub 請求未完成（'+response.status+'），草稿仍保留');}return response.json();
 }
 async function remoteContent(){const file=await api('/contents/site/content.json?ref=main');if(file.encoding!=='base64'||!file.content||!file.sha)throw Error('無法讀取 GitHub 內容檔');return {sha:file.sha,doc:JSON.parse(decodeContent(file.content))};}
 async function commitPhotos(doc,published,{uploads=[],entries=[],onProgress=()=>{}}={}){
  const ref=await api('/git/ref/heads/main'),head=ref.object.sha,commit=await api('/git/commits/'+head),tree=await api('/git/trees/'+commit.tree.sha+'?recursive=1');if(tree.truncated)throw Error('素材清單太大，請先下載草稿備份');
  const existing=new Map(tree.tree.map(item=>[item.path,item]));if(existing.get('site/content.json')?.sha!==sha)throw Error('GitHub 已有其他更新，請重新載入正式內容，草稿仍保留');
  const used=referencedMediaSources(doc),files=new Map();for(const upload of uploads){if(uploadedRepoPath(upload.src)!==upload.path||uploadedRepoPath(uploadedMediaUrl(upload.thumbnailPath))!==upload.thumbnailPath)throw Error('上載檔案路徑不正確');if(!used.has(upload.src)||doc.library?.purged?.includes(upload.src))continue;files.set(upload.path,{blob:upload.blob,name:upload.name});files.set(upload.thumbnailPath,{blob:upload.thumbnailBlob,name:upload.name+' · 預覽'});}
  for(const src of used){const path=uploadedRepoPath(src);if(path&&!existing.has(path)&&!files.has(path))throw Error('草稿有未上載相片，但呢個裝置未有原檔。請重新揀相上載，草稿已保留。');}
  const changes=[];let completed=0;for(const [path,file]of files){onProgress({phase:'upload',completed,total:files.size,name:file.name});const result=await api('/git/blobs',{method:'POST',timeoutMs:120000,body:JSON.stringify({content:await encodeBinaryContent(file.blob),encoding:'base64'})});changes.push({path,mode:'100644',type:'blob',sha:result.sha});completed++;onProgress({phase:'upload',completed,total:files.size,name:file.name});}
  for(const path of uploadedDeletionPaths(published,doc,entries))if(existing.has(path))changes.push({path,mode:'100644',type:'blob',sha:null});
  const content=await api('/git/blobs',{method:'POST',body:JSON.stringify({content:JSON.stringify(doc,null,2)+'\n',encoding:'utf-8'})});changes.push({path:'site/content.json',mode:'100644',type:'blob',sha:content.sha});
  const updated=await api('/git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:changes})}),created=await api('/git/commits',{method:'POST',body:JSON.stringify({message:'Publish portfolio projects and photo uploads',tree:updated.sha,parents:[head]})});
  await api('/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:created.sha,force:false})});sha=content.sha;baseline=canonical(doc);return {sha:created.sha,url:'https://github.com/'+REPOSITORY+'/commit/'+created.sha,revision:doc.revision,uploadedSources:uploads.filter(u=>used.has(u.src)).map(u=>u.src)};
 }
 return {
  async connect(token,published){credential=token.trim();sha=null;if(!credential)throw Error('請先輸入 GitHub token');try{const repo=await api('');if(repo.full_name!==REPOSITORY||!repo.permissions?.push)throw Error('呢個 token 未有本網站嘅寫入權限');const remote=await remoteContent();if(canonical(remote.doc)!==canonical(published))throw Error('GitHub 有較新內容，請下載草稿備份後重新載入正式內容');sha=remote.sha;baseline=canonical(published);return true;}catch(error){credential='';throw error;}},
  disconnect(){credential='';sha=null;baseline='';},
  connected(){return Boolean(credential&&sha);},
  async publish(doc,published,options={}){if(!credential||!sha)throw Error('請先連接 GitHub');if(canonical(published)!==baseline)throw Error('正式內容版本已改變，請重新連接 GitHub');assertNoDeletedMediaRestore(published,doc);const current=await remoteContent();if(current.sha!==sha)throw Error('GitHub 已有其他更新，請下載草稿備份後重新載入正式內容');if(options.uploads?.length||[...referencedMediaSources(doc)].some(uploadedRepoPath)||uploadedDeletionPaths(published,doc,options.entries).length)return commitPhotos(doc,published,options);const result=await api('/contents/site/content.json',{method:'PUT',body:JSON.stringify({message:'Update portfolio content from owner back office',branch:'main',sha,content:encodeContent(JSON.stringify(doc,null,2)+'\n')})});sha=result.content.sha;baseline=canonical(doc);return {sha:result.commit.sha,url:'https://github.com/'+REPOSITORY+'/commit/'+result.commit.sha,revision:doc.revision};},
  async deployment(commit){const data=await api('/actions/workflows/pages.yml/runs?head_sha='+encodeURIComponent(commit)+'&per_page=5');let run=data.workflow_runs?.find(r=>r.head_sha===commit);if(!run){const recent=await api('/actions/workflows/pages.yml/runs?per_page=20');run=recent.workflow_runs?.find(r=>r.head_sha===commit);}return run?{status:run.status,conclusion:run.conclusion,url:run.html_url}:null;}
 };
}
