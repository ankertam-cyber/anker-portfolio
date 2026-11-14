import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../site/',import.meta.url));
const records=new Map(),order=[];
async function visit(file){
  if(records.has(file))return records.get(file).id;
  const record={id:'m'+records.size,exports:[]};records.set(file,record);
  let code=(await fs.readFile(file,'utf8')).replaceAll('\r\n','\n');
  const imports=[...code.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm)];
  for(const item of imports){
    const name=item[2].split('?')[0];if(!name.startsWith('.'))throw Error('Only local dependencies supported');
    const dependency=path.resolve(path.dirname(file),name);if(path.relative(root,dependency).startsWith('..'))throw Error('Dependency outside static source');
    const id=await visit(dependency),bindings=item[1].replace(/\s+as\s+/g,':');
    code=code.replace(item[0],'const {'+bindings+'}='+id+';\n');
  }
  for(const item of code.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g))record.exports.push(item[1]);
  code=code.replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/g,'');
  if(/^\s*(?:import|export)\b/m.test(code))throw Error('Unsupported module syntax: '+path.basename(file));
  const entry=path.basename(file)==='app.mjs';
  record.code=entry?'(async()=>{\n'+code+'\n})().catch(error=>{console.error("Portfolio initialization failed",error);document.documentElement.dataset.bootError=error.name;const s=document.getElementById("opening-playback-state");if(s)s.textContent="RELOAD";});':'const '+record.id+'=(()=>{\n'+code+'\nreturn {'+record.exports.join(',')+'};\n})();';
  order.push(record);return record.id;
}
await visit(path.join(root,'app.mjs'));
const bundle='// Generated from the local module graph; no external runtime dependencies.\n(()=>{\n"use strict";\n'+order.map(r=>r.code).join('\n')+'\n})();\n';
const hash=createHash('sha256').update(bundle).digest('hex').slice(0,12),name='browser-app.'+hash+'.js';
await fs.writeFile(path.join(root,name),bundle);
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
const marker=/<script\b[^>]*id="portfolio-entry"[^>]*>[\s\S]*?<\/script>/;
if(!marker.test(html))throw Error('Missing portfolio entry marker');
html=html.replace(marker,'<script id="portfolio-entry" defer src="'+name+'"></script>');
await fs.writeFile(path.join(root,'index.html'),html);
await fs.writeFile(path.join(root,'browser-build.json'),JSON.stringify({entry:name,sha256:createHash('sha256').update(bundle).digest('hex'),modules:[...records.keys()].map(f=>path.relative(root,f).replaceAll('\\','/'))},null,2));
console.log('Prepared classic browser bundle: '+name+' ('+records.size+' modules)');
