import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import path from 'node:path';
const root=process.cwd(),manifest=JSON.parse(await fs.readFile('asset-checksums.json','utf8'));
const expected=new Map(manifest.files.map(f=>[f.path,f])),seen=new Set();
export async function hash(file){const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');}
const packs=JSON.parse(await fs.readFile('media-seeds.json','utf8'));
for(const pack of packs.packs){
 if(!/^media-seeds\/[\w.-]+\.zip$/.test(pack.path)||await hash(pack.path)!==pack.sha256)throw Error('Media pack failed integrity check');
 const zip=await fs.readFile(pack.path),floor=Math.max(0,zip.length-65557);let end=zip.length-22;
 while(end>=floor&&zip.readUInt32LE(end)!==0x06054b50)end--;
 if(end<floor)throw Error('Invalid media archive');
 const count=zip.readUInt16LE(end+10);let position=zip.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  if(zip.readUInt32LE(position)!==0x02014b50)throw Error('Invalid ZIP directory');
  const flags=zip.readUInt16LE(position+8),method=zip.readUInt16LE(position+10),compressed=zip.readUInt32LE(position+20),length=zip.readUInt32LE(position+24),nameLength=zip.readUInt16LE(position+28),extraLength=zip.readUInt16LE(position+30),commentLength=zip.readUInt16LE(position+32),offset=zip.readUInt32LE(position+42);
  const name=zip.toString('utf8',position+46,position+46+nameLength),record=expected.get(name);
  if(!record||seen.has(name)||name.includes('..')||name.includes('\\')||!(name.startsWith('site/assets/')||name.startsWith('media-sources/'))||(flags&1))throw Error('Unexpected media archive member');
  if(zip.readUInt32LE(offset)!==0x04034b50)throw Error('Invalid ZIP member');
  const start=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28),payload=zip.subarray(start,start+compressed);
  const bytes=method===0?payload:method===8?inflateRawSync(payload):null;
  if(!bytes||bytes.length!==length||length!==record.size||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Media asset failed integrity check');
  const destination=path.resolve(root,name);if(!destination.startsWith(root+path.sep))throw Error('Unsafe asset destination');
  await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes);seen.add(name);
  position+=46+nameLength+extraLength+commentLength;
 }
}
if(seen.size!==expected.size)throw Error('A required media asset was not packaged');
console.log('Verified and extracted '+seen.size+' website assets.');
