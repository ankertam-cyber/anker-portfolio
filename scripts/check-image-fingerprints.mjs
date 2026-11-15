import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function checkImageFingerprints(root,catalogue){
 const data=JSON.parse(await fs.readFile(root+'/image-fingerprints.json','utf8'));if(data.version!==1||data.algorithm!=='photo-content-v1'||!data.records)throw Error('Invalid photo fingerprint index');
 const expected=new Set(catalogue.entries.flatMap(p=>p.images.map(item=>typeof item==='string'?item:item.src)).filter(src=>!/\.(?:gif|svg)$/i.test(src)));
 for(const src of expected){const record=data.records[src];if(!record)throw Error('Photo fingerprint missing: '+src);}
 for(const [src,record]of Object.entries(data.records)){
  if(!src.startsWith('assets/')||src.includes('..')||src.includes('\\'))throw Error('Invalid photo fingerprint source');
  const bytes=await fs.readFile(root+'/'+src);if(bytes.length!==record.bytes||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Photo fingerprint is stale: '+src);
  if(!/^[a-f0-9]{64}$/.test(record.pixels)||!['p','d'].every(key=>/^[a-f0-9]{16}$/.test(record[key]))||record.color?.length!==27||record.color.some(value=>!Number.isInteger(value)||value<0||value>255)||!Number.isFinite(record.detail)||record.detail<0||!(record.width>0&&record.height>0))throw Error('Invalid image-content fingerprint');
 }
 return expected.size;
}
