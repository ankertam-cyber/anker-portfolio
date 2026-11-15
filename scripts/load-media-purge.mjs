import fs from 'node:fs/promises';
import path from 'node:path';
import {planMediaPurge} from './media-purge-plan.mjs';
export async function loadMediaPurge(){
 const [content,catalogue,manifest,checksums]=await Promise.all(['site/content.json','site/projects.json','media-sources.json','asset-checksums.json'].map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
 return planMediaPurge({content,catalogue,manifest,checksums});
}
export async function removeContainedFile(root,relative){
 if(typeof relative!=='string'||relative.includes('\\')||relative.split('/').some(part=>part==='..'||!part)||path.isAbsolute(relative))throw Error('Unsafe deletion path');
 const base=path.resolve(root),target=path.resolve(base,relative);if(!target.startsWith(base+path.sep))throw Error('Deletion target outside managed media folder');
 try{const realBase=await fs.realpath(base),parent=await fs.realpath(path.dirname(target));if(parent!==realBase&&!parent.startsWith(realBase+path.sep))throw Error('Deletion target outside managed media folder');const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Deletion target must be a regular media file');await fs.unlink(target);return stat.size;}catch(error){if(error.code==='ENOENT')return 0;throw error;}
}
