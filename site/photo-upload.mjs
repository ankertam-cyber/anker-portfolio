import {uploadedMediaUrl} from './upload-paths.mjs';
export const MAX_PHOTO_BYTES=25*1024*1024;
export function photoFileKind(bytes){
 const ascii=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',mime:'image/jpeg'};
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return {ext:'png',mime:'image/png'};
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return {ext:'webp',mime:'image/webp'};
 if(/^GIF8[79]a$/.test(ascii(0,6)))return {ext:'gif',mime:'image/gif'};
 if(ascii(4,8)==='ftyp'&&/avif|avis/.test(ascii(8,40)))return {ext:'avif',mime:'image/avif'};
 throw Error('請選擇 JPEG、PNG、WebP、GIF 或 AVIF 相片；其他格式請先匯出成 JPEG。');
}
export async function decodePhoto(blob,{document:doc=globalThis.document,URL:urls=globalThis.URL}={}){
 const url=urls.createObjectURL(blob),image=doc.createElement('img');
 try{image.src=url;await image.decode();const width=image.naturalWidth,height=image.naturalHeight;if(width<64||height<64||width>30000||height>30000)throw Error('相片尺寸不正確，最少需要 64 × 64 像素');
  const ratio=Math.min(1,480/Math.max(width,height)),canvas=doc.createElement('canvas');canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const thumbnail=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(!thumbnail)throw Error('未能建立相片預覽，請重試');return {width,height,thumbnail};
 }finally{image.src='';urls.revokeObjectURL(url);}
}
export async function preparePhotoUpload(file,projectId,{id=()=>crypto.randomUUID(),decode=decodePhoto}={}){
 if(!/^[A-Za-z0-9_-]{1,90}$/.test(projectId))throw Error('請先選擇或建立 Project');
 if(!file?.size||file.size>MAX_PHOTO_BYTES)throw Error('每張相片最多 25 MB，請分批上載');
 const kind=photoFileKind(new Uint8Array(await file.slice(0,64).arrayBuffer())),info=await decode(file),key=id();
 if(!/^[A-Za-z0-9_-]{5,100}$/.test(key))throw Error('上載檔案編號不正確');
 const path='media-uploads/'+projectId+'/'+key+'.'+kind.ext,thumbnailPath='media-uploads/'+projectId+'/'+key+'-preview.jpg';
 const label=String(file.name||'新相片').replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu,'').slice(0,500).trim()||'新相片';
 return {src:uploadedMediaUrl(path),path,thumbnailPath,mime:kind.mime,blob:file,thumbnailBlob:info.thumbnail,bytes:file.size,name:label,width:info.width,height:info.height,createdAt:new Date().toISOString(),media:{type:'image',mediaKind:'photo',src:uploadedMediaUrl(path),thumbnail:uploadedMediaUrl(thumbnailPath),width:info.width,height:info.height,label,alt:label}};
}
export function previewUploadedEntries(entries,resolve){
 const clean=item=>{const result={...item};for(const key of ['src','thumbnail','poster'])if(result[key])result[key]=resolve(result[key]);return result;};
 return entries.map(project=>({...project,images:(project.images||[]).map(item=>typeof item==='string'?resolve(item):clean(item)),graphics:(project.graphics||[]).map(item=>typeof item==='string'?resolve(item):clean(item)),videos:(project.videos||[]).map(clean),imageInfo:Object.fromEntries(Object.entries(project.imageInfo||{}).map(([src,info])=>[resolve(src),clean(info)]))}));
}
