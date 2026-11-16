const PREFIX='https://raw.githubusercontent.com/ankertam-cyber/anker-portfolio/main/';
export function uploadedRepoPath(source){
 if(typeof source!=='string'||!source.startsWith(PREFIX))return null;
 const path=source.slice(PREFIX.length);
 return /^media-uploads\/[A-Za-z0-9_-]{1,90}\/[A-Za-z0-9_-]{5,120}(?:-preview)?\.(?:jpe?g|png|webp|gif|avif)$/.test(path)?path:null;
}
export function uploadedMediaUrl(path){const source=PREFIX+path;if(uploadedRepoPath(source)!==path)throw Error('上載檔案路徑不正確');return source;}
export function referencedMediaSources(content){
 const sources=new Set(),remember=item=>{for(const value of [item?.src,item?.thumbnail,item?.poster])if(typeof value==='string')sources.add(value);};
 for(const project of [...Object.values(content.overrides||{}),...(content.additions||[])])for(const item of project.media||[])remember(item);
 for(const item of content.library?.items||[])remember(item);
 return sources;
}
import {libraryInventory} from './content-model.mjs';
export function uploadedDeletionPaths(before,after,entries=[]){
 const deleted=new Set((after.library?.purged||[]).filter(src=>!before.library?.purged?.includes(src))),surviving=new Set(),result=new Set();
 for(const item of libraryInventory(entries,after))for(const src of [item.src,item.thumbnail,item.poster])if(src)surviving.add(src);
 for(const src of deleted){const path=uploadedRepoPath(src);if(path)result.add(path);}
 for(const item of libraryInventory(entries,before))if(deleted.has(item.src))for(const src of [item.thumbnail,item.poster]){const path=uploadedRepoPath(src);if(path&&!surviving.has(src))result.add(path);}
 return [...result];
}
