import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),output=path.join(root,'_site'),cache=path.join(root,'.media-cache');
const manifest=JSON.parse(await fs.readFile('media-sources.json','utf8')),repository=process.env.GITHUB_REPOSITORY||manifest.repository;
if(repository!==manifest.repository||repository!=='ankertam-cyber/anker-portfolio')throw Error('Unexpected publishing repository');
const token=process.env.GH_TOKEN,tag='portfolio-media-v1';
async function hash(file){const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');}
async function api(route,options={}){const response=await fetch('https://api.github.com/repos/'+repository+route,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})},redirect:'error'});if(response.status===404)return null;if(!response.ok)throw Error('GitHub media archive request failed: '+response.status);return response.json();}
let release=await api('/releases/tags/'+tag);
if(token&&!release)release=await api('/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,name:'Portfolio media',body:'',draft:false,prerelease:false})});
const archived=new Map((release?.assets||[]).map(a=>[a.name,a]));
await fs.mkdir(cache,{recursive:true});await fs.cp('site',output,{recursive:true});
let cursor=0,completed=0;
async function worker(){while(cursor<manifest.videos.length){const item=manifest.videos[cursor++];
 if(!/^assets\/portfolio\/[\w-]+\/[\w-]+\.mp4$/.test(item.path))throw Error('Unsafe film destination');
 const cached=path.join(cache,item.archiveName);let valid=false;try{valid=await hash(cached)===item.sha256;}catch{}
 if(!valid){
  if(item.localSource){if(!/^media-sources\/[\w-]+\.mp4$/.test(item.localSource))throw Error('Unsafe film source');await fs.copyFile(item.localSource,cached);}
  else{const url=archived.get(item.archiveName)?.browser_download_url||item.sourceUrl;const origin=new URL(url);if(origin.protocol!=='https:'||!['drive.google.com','drive.usercontent.google.com','video.wixstatic.com','github.com'].includes(origin.hostname))throw Error('Unexpected film source');const response=await fetch(url,{signal:AbortSignal.timeout(240000)});if(!response.ok)throw Error('Film download failed: '+response.status);await pipeline(Readable.fromWeb(response.body),createWriteStream(cached));}
  if(await hash(cached)!==item.sha256)throw Error('Film checksum mismatch: '+item.id);
 }
 if(token&&!archived.has(item.archiveName)){
  const upload=new URL(release.upload_url.replace(/\{.*$/,''));if(upload.hostname!=='uploads.github.com')throw Error('Unexpected archive host');upload.searchParams.set('name',item.archiveName);
  const stat=await fs.stat(cached);const response=await fetch(upload,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4','Content-Length':String(stat.size)},body:createReadStream(cached),duplex:'half',redirect:'error',signal:AbortSignal.timeout(240000)});
  if(!response.ok)throw Error('Film archive upload failed: '+response.status);const asset=await response.json();archived.set(item.archiveName,asset);
 }
 const destination=path.resolve(output,item.path);if(!destination.startsWith(output+path.sep))throw Error('Unsafe film destination');await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(cached,destination);
 console.log(`Prepared film ${++completed}/${manifest.videos.length}`);
}}
await Promise.all([worker(),worker(),worker()]);
console.log('Portfolio films are delivered from this website, with independent GitHub media backups.');
