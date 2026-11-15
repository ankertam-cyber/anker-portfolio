import {clone,canonical,safeMediaUrl} from './content-model.mjs';
import {NATIVE_VIDEO_FILES} from './native-video-files.mjs';

// Only small source identities remain, to prevent an older draft or source pack
// from restoring deleted bytes. No reusable library entry is retained.
export function permanentlyRemoveMedia(content,sources){
 const result=clone(content),purged=new Set([...(result.library?.purged||[]),...sources]);
 for(const [path,name]of NATIVE_VIDEO_FILES){const url='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/'+name;if(purged.has(path)||purged.has(url)){purged.add(path);purged.add(url);}}
 if([...purged].some(src=>!safeMediaUrl(src)))throw Error('永久刪除清單含有不正確網址');
 const clean=items=>(items||[]).filter(item=>!purged.has(item.src)).map(item=>{for(const key of ['poster','thumbnail'])if(purged.has(item[key]))delete item[key];return item;});
 result.library??={items:[],removed:[]};result.library.items=clean(result.library.items);result.library.removed=result.library.removed.filter(src=>!purged.has(src));result.library.purged=[...purged];
 for(const project of [...Object.values(result.overrides),...result.additions])if(project.media)project.media=clean(project.media);
 return result;
}
export function assertNoDeletedMediaRestore(before,after){
 const retained=new Set(after.library?.purged||[]);
 if((before.library?.purged||[]).some(src=>!retained.has(src)))throw Error('永久刪除嘅素材唔可以由舊草稿還原；請重新載入正式內容，再重新上載需要嘅檔案');
}
export function rebasePermanentDeletion(baseline,published,local){
 try{
  const before=typeof baseline==='string'?JSON.parse(baseline):baseline,added=(published.library?.purged||[]).filter(src=>!before.library?.purged?.includes(src));if(!added.length)return null;
  const core=doc=>Object.fromEntries(Object.entries(doc).filter(([key])=>!['revision','updatedAt'].includes(key)));
  if(canonical(core(permanentlyRemoveMedia(before,added)))!==canonical(core(published)))return null;
  return {...permanentlyRemoveMedia(local,added),revision:published.revision,updatedAt:published.updatedAt};
 }catch{return null;}
}
