import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('_site'),data=JSON.parse(await fs.readFile(path.join(root,'projects.json'),'utf8'));
if(data.previewOnly||!data.entries.length||data.entries.some(p=>p.publicationStatus!=='published'))throw Error('Invalid public catalogue');
const files=new Set();
for(const project of data.entries){for(const file of project.images)files.add(file);for(const info of Object.values(project.imageInfo||{}))if(info.thumbnail)files.add(info.thumbnail);for(const movie of project.videos){files.add(movie.src);if(movie.poster)files.add(movie.poster);}}
for(const file of files){if(!file.startsWith('assets/')||file.includes('..'))throw Error('Non-local portfolio media');if(!(await fs.stat(path.join(root,file))).size)throw Error('Empty media file');}
const manifest=JSON.parse(await fs.readFile('media-sources.json','utf8'));
for(const movie of manifest.videos){const h=createHash('sha256');for await(const chunk of createReadStream(path.join(root,movie.path)))h.update(chunk);if(h.digest('hex')!==movie.sha256)throw Error('Published film does not match its verified source');}
let bytes=0;async function count(folder){for(const item of await fs.readdir(folder,{withFileTypes:true})){const p=path.join(folder,item.name);if(item.isDirectory())await count(p);else bytes+=(await fs.stat(p)).size;}}await count(root);
if(bytes>990000000)throw Error('The published site exceeds the GitHub Pages size budget');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');if(html.includes('PRIVATE DESIGN PREVIEW')||html.includes('noindex,nofollow'))throw Error('Preview-only metadata remains');
const entry=html.match(/id="portfolio-entry"[^>]*src="([^"]+)"/)?.[1];if(!entry)throw Error('Missing browser entry');await fs.access(path.join(root,entry));
const report={projects:data.entries.length,images:data.entries.reduce((n,p)=>n+p.images.length,0),videos:manifest.videos.length,bytes,verifiedAt:new Date().toISOString()};
await fs.writeFile('deployment-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
