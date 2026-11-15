import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {prepareWebVideos} from './web-video.mjs';
import {loadMediaPurge,removeContainedFile} from './load-media-purge.mjs';
const root=process.cwd(),output=path.join(root,'_site'),cache=path.join(root,'.media-cache');
const purge=await loadMediaPurge(),manifest=purge.activeManifest,repository=process.env.GITHUB_REPOSITORY||manifest.repository;
if(repository!=='ankertam-cyber/anker-portfolio'||repository!==manifest.repository)throw Error('Unexpected publishing repository');
const token=process.env.GH_TOKEN,tag='portfolio-media-v1';
async function hash(file){const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');}
async function api(route,options={}){
 const r=await fetch('https://api.github.com/repos/'+repository+route,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})},redirect:'error'});
 if(r.status===404)return null;if(!r.ok)throw Error('GitHub film archive request failed: '+r.status);return r.json();
}
let release=await api('/releases/tags/'+tag);
if(token&&!release)release=await api('/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,name:'Portfolio media',body:'',draft:false,prerelease:false})});
const archived=new Map((release?.assets||[]).map(a=>[a.name,a]));
await fs.mkdir(cache,{recursive:true});await fs.cp('site',output,{recursive:true});
for(const file of purge.files){await removeContainedFile(output,file);await removeContainedFile(path.join(root,'site'),file);}
for(const file of purge.cacheFiles)await removeContainedFile(cache,file);
for(const file of purge.seeds)await removeContainedFile(root,file);
const fingerprints=JSON.parse(await fs.readFile(path.join(output,'image-fingerprints.json'),'utf8'));for(const file of purge.files)delete fingerprints.records[file];await fs.writeFile(path.join(output,'image-fingerprints.json'),JSON.stringify(fingerprints));
function decode(s){return s.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"');}
async function publicFilm(url){
 const source=new URL(url);if(source.protocol!=='https:'||!['drive.google.com','drive.usercontent.google.com','video.wixstatic.com','github.com'].includes(source.hostname))throw Error('Unexpected film source');
 let response=await fetch(source,{signal:AbortSignal.timeout(300000)});
 if(source.hostname==='drive.google.com'&&response.headers.get('content-type')?.includes('text/html')){
  // Follow Google's normal public-file download-confirmation form. No login,
  // quota restrictions or inaccessible files are bypassed; no form tokens persist.
  const text=await response.text(),form=text.match(/<form\b[^>]*id="download-form"[^>]*>[\s\S]*?<\/form>/i)?.[0];
  if(!form)throw Error('Drive did not offer a public download form');
  const action=new URL(decode(form.match(/action="([^"]+)"/)?.[1]||''));
  if(action.origin!=='https://drive.usercontent.google.com'||action.pathname!=='/download')throw Error('Unexpected Drive download form');
  for(const input of form.matchAll(/<input\b[^>]*>/g)){const attrs=Object.fromEntries([...input[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));if(['id','export','confirm','uuid'].includes(attrs.name))action.searchParams.set(attrs.name,attrs.value||'');}
  if(action.searchParams.get('id')!==source.searchParams.get('id'))throw Error('Drive confirmation changed the requested file');
  response=await fetch(action,{signal:AbortSignal.timeout(300000)});
 }
 if(!response.ok||!response.headers.get('content-type')?.includes('video/mp4')){await response.body?.cancel();throw Error('Public film download is unavailable or is not MP4: '+response.status);}
 return response;
}
let cursor=0,completed=0;
async function worker(){while(cursor<manifest.videos.length){const item=manifest.videos[cursor++];
 if(!/^assets\/(?:portfolio|imported)\/[\w/-]+\.mp4$/.test(item.path)||!/^[\w-]+\.mp4$/.test(item.archiveName))throw Error('Unsafe film destination');
 const existing=archived.get(item.archiveName);
 if(existing&&(existing.size!==item.bytes||existing.digest&&existing.digest!=='sha256:'+item.sha256))throw Error('Existing film archive does not match the catalogue');
 if(!existing){
  const cached=path.join(cache,item.archiveName);let valid=false;try{valid=(await fs.stat(cached)).size===item.bytes&&await hash(cached)===item.sha256;}catch{}
  if(!valid){const partial=cached+'.partial';
   if(item.localParts?.length){
    await fs.writeFile(partial,Buffer.alloc(0));
    for(const part of item.localParts){
     if(!/^media-sources\/[\w-]+\.part-\d{2}$/.test(part.path))throw Error('Unsafe film segment');
     const bytes=await fs.readFile(part.path);if(bytes.length!==part.bytes||createHash('sha256').update(bytes).digest('hex')!==part.sha256)throw Error('Film segment integrity check failed');
     await fs.appendFile(partial,bytes);
    }
   }
   else if(item.localSource){if(!/^media-sources\/[\w-]+\.mp4$/.test(item.localSource))throw Error('Unsafe prepared film source');await fs.copyFile(item.localSource,partial);}
   else await pipeline(Readable.fromWeb((await publicFilm(item.sourceUrl)).body),createWriteStream(partial));
   if((await fs.stat(partial)).size!==item.bytes||await hash(partial)!==item.sha256)throw Error('Film integrity check failed: '+item.id);
   await fs.rename(partial,cached);
  }
  if(token){const upload=new URL(release.upload_url.replace(/\{.*$/,''));if(upload.origin!=='https://uploads.github.com')throw Error('Unexpected archive host');upload.searchParams.set('name',item.archiveName);
   const r=await fetch(upload,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4','Content-Length':String(item.bytes)},body:createReadStream(cached),duplex:'half',redirect:'error',signal:AbortSignal.timeout(300000)});
   if(!r.ok)throw Error('Film archive upload failed: '+r.status);const asset=await r.json();if(asset.size!==item.bytes||asset.digest&&asset.digest!=='sha256:'+item.sha256)throw Error('Uploaded film digest does not match');archived.set(item.archiveName,asset);
  }
 }
 console.log(`Verified film ${++completed}/${manifest.videos.length}`);
}}
await Promise.all([worker(),worker(),worker()]);
const playback=await prepareWebVideos(manifest,{output,cache,repository});
const published=purge.catalogue,byPath=new Map(manifest.videos.map(v=>[v.path,v]));
// Keep original archive filenames in the source audit, without emoji in public metadata.
for(const project of published.entries)for(const film of project.videos||[]){
 if(film.sourceName)film.sourceName=film.sourceName.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
}
for(const p of published.entries)for(const film of p.videos){if(film.type==='vimeo')continue;const source=byPath.get(film.src);if(!source)throw Error('Film is missing from the archive manifest');film.src='https://github.com/'+repository+'/releases/download/'+tag+'/'+source.archiveName;}
for(const name of ['projects.v27.json','projects.v28.json'])await fs.writeFile(path.join(output,name),JSON.stringify(published,null,2));
// Old cached browser entries understand native MP4 only; keep their catalogue
// usable while the new versioned entry exposes the complete Vimeo programme.
const compatible={...published,entries:published.entries.map(p=>({...p,videos:p.videos.filter(v=>v.type!=='vimeo')}))};
await fs.writeFile(path.join(output,'projects.json'),JSON.stringify(compatible,null,2));
await fs.writeFile('media-archive-checks.json',JSON.stringify({films:manifest.videos.length,verified:completed,playback,delivery:'Same-origin H.264/AAC playback; originals retained in GitHub release archive'},null,2));
console.log('Project films play from same-origin browser files; source archives remain intact.');
