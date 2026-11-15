import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../site/',import.meta.url)),records=new Map(),order=[];
async function visit(file){
 if(records.has(file))return records.get(file).id;
 const record={id:'m'+records.size,exports:[]};records.set(file,record);
 let code=(await fs.readFile(file,'utf8')).replaceAll('\r\n','\n');
 for(const item of [...code.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm)]){
  const name=item[2].split('?')[0];if(!name.startsWith('.'))throw Error('Only local dependencies supported');
  const dependency=path.resolve(path.dirname(file),name);if(path.relative(root,dependency).startsWith('..'))throw Error('Dependency outside static source');
  const id=await visit(dependency);code=code.replace(item[0],'const {'+item[1].replace(/\s+as\s+/g,':')+'}='+id+';\n');
 }
 for(const item of code.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g))record.exports.push(item[1]);
 code=code.replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/g,'');
 if(/^\s*(?:import|export)\b/m.test(code))throw Error('Unsupported module syntax: '+path.basename(file));
 record.code='const '+record.id+'=(()=>{\n'+code+'\nreturn {'+record.exports.join(',')+'};\n})();';order.push(record);return record.id;
}
await visit(path.join(root,'admin.mjs'));
const bundle='// Generated owner editor; no external runtime dependencies.\n(()=>{\n"use strict";\ntry{\n'+order.map(r=>r.code).join('\n')+'\n}catch(error){console.error("Owner editor startup failed",error);dispatchEvent(new CustomEvent("anker-admin-error",{detail:"後台程式未能啟動，請重新載入。原有草稿仍保留。"}));}\n})();\n';
const name='browser-admin.'+createHash('sha256').update(bundle).digest('hex').slice(0,12)+'.js';
await fs.writeFile(path.join(root,name),bundle);
const file=path.join(root,'admin/index.html');let html=await fs.readFile(file,'utf8');
const marker=/<script\b[^>]*id="admin-entry"[^>]*>[\s\S]*?<\/script>/;
if(!marker.test(html))throw Error('Missing admin entry marker');
html=html.replace(marker,'<script id="admin-entry" defer src="../'+name+'"></script>');await fs.writeFile(file,html);
console.log('Prepared owner editor bundle: '+name+' ('+records.size+' modules)');
