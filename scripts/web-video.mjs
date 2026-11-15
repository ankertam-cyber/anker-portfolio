import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import path from 'node:path';

export function inspectWebVideo(bytes){
 const boxes=[];let offset=0;
 while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset),header=8;const type=bytes.toString('ascii',offset+4,offset+8);if(size===1){if(offset+16>bytes.length)throw Error('Truncated MP4');size=Number(bytes.readBigUInt64BE(offset+8));header=16;}if(size===0)size=bytes.length-offset;if(size<header||offset+size>bytes.length)throw Error('Invalid MP4 box');boxes.push({type,offset,size});offset+=size;}
 const moov=boxes.find(b=>b.type==='moov'),mdat=boxes.find(b=>b.type==='mdat');
 if(boxes[0]?.type!=='ftyp'||!moov||!mdat||moov.offset>mdat.offset||mdat.size<=8)throw Error('Playback MP4 must have fast-start metadata before video data');
 const metadata=bytes.subarray(moov.offset,moov.offset+moov.size);
 if(!metadata.includes(Buffer.from('avc1')))throw Error('Playback MP4 requires H.264');
 return{bytes:bytes.length,fastStart:true,videoCodec:'h264'};
}
async function hash(file){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
function run(executable,args){return new Promise((resolve,reject)=>{let errors='';const child=spawn(executable,args,{stdio:['ignore','ignore','pipe'],timeout:900000,windowsHide:true});child.stderr.on('data',data=>{errors=(errors+data).slice(-4000);});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Playback encoding failed: '+errors)));});}
const encodingOptions=(compact=false)=>['-map','0:v:0','-map','0:a?','-sn','-dn','-vf',"scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,fps=30",'-c:v','libx264','-preset','fast','-crf',compact?'28':'25','-maxrate',compact?'650k':'1000k','-bufsize',compact?'1300k':'2000k','-profile:v','main','-level:v','4.0','-pix_fmt','yuv420p','-tag:v','avc1','-g','60','-threads','2','-c:a','aac','-b:a','96k','-ac','2','-ar','48000','-movflags','+faststart','-map_metadata','-1'];
export async function prepareWebVideos(manifest,{output,cache,repository,ffmpeg=process.env.FFMPEG_PATH||'ffmpeg'}={}){
 const folder=path.join(cache,'web-v1'),destination=path.join(output,'assets/web-video-v1');await fs.mkdir(folder,{recursive:true});await fs.mkdir(destination,{recursive:true});
 const results=[];let cursor=0;
 async function worker(){while(cursor<manifest.videos.length){
  const item=manifest.videos[cursor++];if(!/^[\w-]+\.mp4$/.test(item.archiveName))throw Error('Unsafe playback filename');
  const target=path.join(folder,item.archiveName),receipt=target+'.json';let valid=false;
  try{const record=JSON.parse(await fs.readFile(receipt,'utf8'));valid=record.sourceSha256===item.sha256&&record.policy==='web-v1'&&(await fs.stat(target)).size===record.bytes&&await hash(target)===record.sha256;if(valid)inspectWebVideo(await fs.readFile(target));}catch{valid=false;}
  if(!valid){
   const original=path.join(cache,item.archiveName);let originalOK=false;try{originalOK=(await fs.stat(original)).size===item.bytes&&await hash(original)===item.sha256;}catch{}
   if(!originalOK){const url='https://github.com/'+repository+'/releases/download/portfolio-media-v1/'+item.archiveName,response=await fetch(url,{signal:AbortSignal.timeout(300000)});if(!response.ok)throw Error('Original film download failed: '+response.status);const partial=original+'.partial';await pipeline(Readable.fromWeb(response.body),createWriteStream(partial));if((await fs.stat(partial)).size!==item.bytes||await hash(partial)!==item.sha256)throw Error('Original film checksum differs');await fs.rename(partial,original);}
   const partial=target+'.partial.mp4';
   await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-i',original,...encodingOptions(true),partial]);
   const info=inspectWebVideo(await fs.readFile(partial));await fs.rename(partial,target);await fs.writeFile(receipt,JSON.stringify({...info,policy:'web-v1',compact:true,sourceSha256:item.sha256,sha256:await hash(target)}));
  }
  await fs.copyFile(target,path.join(destination,item.archiveName));const bytes=(await fs.stat(target)).size;results.push({name:item.archiveName,bytes});console.log('Prepared browser film '+results.length+'/'+manifest.videos.length+' · '+item.archiveName);
 }}
 await Promise.all([worker(),worker()]);
 // Keep the complete programme within the existing Pages media budget. Encode
 // the largest browser copies more compactly from the masters, never from an
 // already compressed copy. Source archives and saved URLs remain unchanged.
 let total=results.reduce((n,r)=>n+r.bytes,0);
 for(const result of [...results].sort((a,b)=>b.bytes-a.bytes)){
  if(total<=280000000)break;
  const item=manifest.videos.find(v=>v.archiveName===result.name),target=path.join(folder,result.name),record=JSON.parse(await fs.readFile(target+'.json','utf8'));if(record.compact)continue;
  const original=path.join(cache,result.name);try{await fs.access(original);}catch{const response=await fetch('https://github.com/'+repository+'/releases/download/portfolio-media-v1/'+result.name,{signal:AbortSignal.timeout(300000)});if(!response.ok)throw Error('Original film download failed');await pipeline(Readable.fromWeb(response.body),createWriteStream(original));}
  if(await hash(original)!==item.sha256)throw Error('Original film checksum differs');
  const partial=target+'.partial.mp4';await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-i',original,...encodingOptions(true),partial]);
  const info=inspectWebVideo(await fs.readFile(partial));await fs.rename(partial,target);await fs.writeFile(target+'.json',JSON.stringify({...info,policy:'web-v1',compact:true,sourceSha256:item.sha256,sha256:await hash(target)}));await fs.copyFile(target,path.join(destination,result.name));total+=info.bytes-result.bytes;result.bytes=info.bytes;console.log('Optimized playback budget · '+result.name);
 }
 if(total>280000000)throw Error('Browser film copies exceed their 280 MB publication budget');
 return{films:results.length,bytes:results.reduce((n,r)=>n+r.bytes,0)};
}
