function hexBits(bits){let value=0n;for(const bit of bits)value=(value<<1n)|(bit?1n:0n);return value.toString(16).padStart(16,'0');}
export function fingerprintPixels(pixels){
 const cosine=Array.from({length:8},(_,u)=>Array.from({length:32},(_,x)=>Math.cos(Math.PI*(x+.5)*u/32))),values=[];
 for(let v=0;v<8;v++)for(let u=0;u<8;u++){let sum=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)sum+=pixels[y*32+x]*cosine[u][x]*cosine[v][y];values.push(sum);}
 const sorted=values.slice(1).sort((a,b)=>a-b),median=sorted[31],average=pixels.reduce((n,x)=>n+x,0)/pixels.length;
 return{p:hexBits(values.map(x=>x>median)),detail:Math.sqrt(pixels.reduce((n,x)=>n+(x-average)**2,0)/pixels.length)};
}
function loadImage(url,{document:doc,signal}){return new Promise((resolve,reject)=>{const image=doc.createElement('img');image.crossOrigin='anonymous';const timer=setTimeout(()=>finish(Error('相片載入逾時')),12000);const abort=()=>finish(new DOMException('Cancelled','AbortError'));function finish(error){clearTimeout(timer);signal?.removeEventListener('abort',abort);image.onload=image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);}image.onload=()=>finish();image.onerror=()=>finish(Error('相片來源唔容許畫面比對'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();else image.src=url;});}
function sample(image,width,height,doc){const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);return context.getImageData(0,0,width,height).data;}
const gray=rgba=>Array.from({length:rgba.length/4},(_,i)=>Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2]));
export function createPhotoFingerprintReader({site,document:doc=globalThis.document,request=globalThis.fetch}={}){
 let indexPromise;
 async function index(){if(!indexPromise)indexPromise=request(new URL('image-fingerprints.json?v=duplicates1',site),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('無法讀取相片比對資料');return r.json();}).then(data=>{if(data.version!==1||data.algorithm!=='photo-content-v1'||!data.records)throw Error('相片比對資料版本不正確');return data.records;}).catch(error=>{indexPromise=null;throw error;});return indexPromise;}
 const read=async(item,{signal}={})=>{
  const records=await index();if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const url=new URL(item.src,site),root=new URL(site),relative=url.origin===root.origin&&url.pathname.startsWith(root.pathname)?url.pathname.slice(root.pathname.length):'';
  if(records[relative]&&!url.search&&!url.hash)return records[relative];if(records[url.href])return records[url.href];
  const image=await loadImage(uploadedImageSource(url.href),{document:doc,signal}),small=gray(sample(image,32,32,doc)),gradient=gray(sample(image,9,8,doc)),colors=sample(image,3,3,doc);
  const result={...fingerprintPixels(small),d:hexBits(Array.from({length:64},(_,i)=>gradient[Math.floor(i/8)*9+i%8]>gradient[Math.floor(i/8)*9+i%8+1])),width:image.naturalWidth,height:image.naturalHeight,color:Array.from(colors).filter((_,i)=>i%4!==3)};
  if(url.origin===root.origin){const response=await request(url,{signal});if(response.ok&&Number(response.headers.get('content-length')||0)<=10000000){const bytes=await response.arrayBuffer();if(bytes.byteLength<=10000000){result.bytes=bytes.byteLength;result.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}}}
  return result;
 };read.prepare=index;return read;
}
import {uploadedImageSource} from './upload-store.mjs';
