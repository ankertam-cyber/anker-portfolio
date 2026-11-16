import {uploadedMediaUrl,referencedMediaSources} from './upload-paths.mjs';
export function createUploadStore({indexedDB:database=globalThis.indexedDB,URL:urls=globalThis.URL}={}){
 const records=new Map(),previews=new Map();let opened;
 const db=()=>opened??=(new Promise((resolve,reject)=>{if(!database){reject(Error('瀏覽器未能儲存相片，請用一般瀏覽模式重試'));return;}const request=database.open('anker-owner-photo-uploads-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'src'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('相片儲存未能開啟'));}));
 async function transaction(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('files',mode);let result;const request=action(tx.objectStore('files'));if(request)request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('相片未能儲存，請檢查瀏覽器空間'));tx.onabort=()=>reject(tx.error||Error('相片儲存已中止'));});}
 const show=record=>{records.set(record.src,record);for(const [src,blob]of [[record.src,record.blob],[uploadedMediaUrl(record.thumbnailPath),record.thumbnailBlob]])if(!previews.has(src))previews.set(src,urls.createObjectURL(blob));};
 return {
  async restore(){const all=await transaction('readonly',store=>store.getAll());all.forEach(show);return all.length;},
  async put(record){await transaction('readwrite',store=>store.put(record));show(record);},
  resolve(src){return previews.get(src)||src;},has(src){return records.has(src);},
  referenced(content){const used=referencedMediaSources(content),purged=new Set(content.library?.purged||[]);return [...records.values()].filter(record=>used.has(record.src)&&!purged.has(record.src));},
  async forget(sources,{revoke=false}={}){for(const src of sources){const record=records.get(src);if(!record)continue;await transaction('readwrite',store=>store.delete(src));records.delete(src);if(revoke)for(const source of [record.src,uploadedMediaUrl(record.thumbnailPath)]){const url=previews.get(source);if(url)urls.revokeObjectURL(url);previews.delete(source);}}},
  release(){for(const url of previews.values())urls.revokeObjectURL(url);previews.clear();}
 };
}
export const ownerUploads=createUploadStore();
export const uploadedImageSource=src=>ownerUploads.resolve(src);
