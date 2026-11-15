import {projectMedia} from '../site/project-media.mjs';
const archive='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/';
const localAsset=src=>typeof src==='string'&&src.startsWith('assets/')&&!src.includes('..')&&!/[\\?#%]/.test(src);
export function planMediaPurge({content,catalogue,manifest,checksums}){
 const deleted=new Set(content.library?.purged||[]),files=new Set(),cacheFiles=new Set(),seeds=new Set(),films=[],references=new Set(),candidates=new Set(),sources=new Map();
 for(const film of manifest.videos){const url=archive+film.archiveName;sources.set(url,film);sources.set(film.path,film);}
 const isDeleted=src=>deleted.has(src)||(sources.has(src)&&[sources.get(src).path,archive+sources.get(src).archiveName].some(alias=>deleted.has(alias)));
 const projects=catalogue.entries.map(project=>{
  const media=projectMedia(project),kept=media.filter(item=>!isDeleted(item.src));
  for(const item of media){if(isDeleted(item.src)){if(localAsset(item.src))candidates.add(item.src);for(const key of ['poster','thumbnail'])if(localAsset(item[key]))candidates.add(item[key]);}else for(const src of [item.src,item.poster,item.thumbnail])if(localAsset(src)&&!isDeleted(src))references.add(src);}
  if(kept.length===media.length&&!media.some(item=>isDeleted(item.poster)||isDeleted(item.thumbnail)))return {...project};
  const source=item=>typeof item==='string'?item:item.src,clean=item=>{if(typeof item==='string')return item;const result={...item};for(const key of ['poster','thumbnail'])if(isDeleted(result[key]))delete result[key];return result;};
  return {...project,videos:(project.videos||[]).filter(item=>!isDeleted(item.src)).map(clean),images:(project.images||[]).filter(item=>!isDeleted(source(item))).map(clean),graphics:(project.graphics||[]).filter(item=>!isDeleted(source(item))).map(clean),imageInfo:Object.fromEntries(Object.entries(project.imageInfo||{}).filter(([src])=>!isDeleted(src)).map(([src,info])=>[src,clean(info)]))};
 });
 // Owner-added media can share an existing thumbnail. Keep every surviving use.
 for(const project of [...Object.values(content.overrides),...content.additions])for(const item of project.media||[])if(!isDeleted(item.src))for(const src of [item.src,item.poster,item.thumbnail])if(localAsset(src)&&!isDeleted(src))references.add(src);
 for(const item of content.library?.items||[])if(!isDeleted(item.src))for(const src of [item.src,item.poster,item.thumbnail])if(localAsset(src)&&!isDeleted(src))references.add(src);
 const packaged=new Map(checksums.files.map(f=>[f.path,f]));
 for(const src of deleted){const film=sources.get(src);if(film&&!films.includes(film)){films.push(film);files.add('assets/web-video-v1/'+film.archiveName);seeds.add('site/'+film.path);for(const part of film.localParts||[])seeds.add(part.path);if(film.localSource)seeds.add(film.localSource);for(const name of [film.archiveName,film.archiveName+'.partial','web-v1/'+film.archiveName,'web-v1/'+film.archiveName+'.json','web-v1/'+film.archiveName+'.partial.mp4'])cacheFiles.add(name);}}
 for(const src of candidates)if(!references.has(src)){files.add(src);seeds.add('site/'+src);}
 const activeManifest={...manifest,videos:manifest.videos.filter(film=>!films.includes(film))};
 return {sources:[...deleted],files:[...files],cacheFiles:[...cacheFiles],seeds:[...seeds],films,activeManifest,catalogue:{...catalogue,entries:projects},sourceBytes:[...seeds].reduce((n,file)=>n+(packaged.get(file)?.size||0),0)};
}
