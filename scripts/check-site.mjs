import fs from 'node:fs/promises';
import path from 'node:path';
import {assertPortfolioImage} from './image-dimensions.mjs';
import {projectMedia} from '../site/project-media.mjs';
const root=path.resolve('_site'),data=JSON.parse(await fs.readFile(path.join(root,'projects.v28.json'),'utf8'));
const rules=JSON.parse(await fs.readFile(path.join(root,'portfolio-curation.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile('media-sources.json','utf8'));
if(data.previewOnly||!data.entries.length||data.entries.some(p=>p.publicationStatus!=='published'))throw Error('Invalid public catalogue');
if(data.entries.length!==rules.expectedPublishedProjects)throw Error('The owner-selected programme changed');
if(JSON.stringify(data.entries.slice(0,3).map(p=>p.id))!==JSON.stringify(rules.pinnedProjectIds))throw Error('The three confirmed featured projects moved');
if(data.entries.some(p=>rules.excludedProjectIds.includes(p.id)))throw Error('An excluded project was reintroduced');
const names=new Set(manifest.videos.map(v=>v.archiveName)),files=new Set();let movies=0,vimeo=0;
for(const project of data.entries){
 const programme=projectMedia(project);let rank=-1;
 for(const item of programme){const next=item.type==='video'||item.type==='vimeo'?0:['graphic','graphics','rendering','render','design'].includes(item.mediaKind)?2:1;if(next<rank)throw Error('Media sequence changed: '+project.title);rank=next;if(/\.psd(?:$|\?)/i.test(item.src))throw Error('PSD cannot be published');}
 for(const graphic of project.graphics||[]){const file=typeof graphic==='string'?graphic:graphic.src;files.add(file);assertPortfolioImage(await fs.readFile(path.join(root,file)),file,typeof graphic==='object'?graphic:project.imageInfo[file]);}
 for(const file of project.images){files.add(file);assertPortfolioImage(await fs.readFile(path.join(root,file)),file,project.imageInfo[file]);}
 for(const info of Object.values(project.imageInfo||{}))if(info.thumbnail)files.add(info.thumbnail);
 for(const movie of project.videos){const url=new URL(movie.src);if(movie.type==='vimeo'){vimeo++;if(url.origin!=='https://player.vimeo.com'||!/^\/video\/\d+$/.test(url.pathname))throw Error('Invalid remote Vimeo player');}else{movies++;if(url.origin!=='https://github.com'||!url.pathname.startsWith('/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/')||!names.has(url.pathname.split('/').at(-1)))throw Error('Unexpected public film destination');}if(movie.poster)files.add(movie.poster);}
}
for(const file of files){if(!file.startsWith('assets/')||file.includes('..'))throw Error('Non-local project image');assertPortfolioImage(await fs.readFile(path.join(root,file)),file);}
if(movies!==manifest.videos.length)throw Error('Film manifest count differs from the published programme');
const archive=JSON.parse(await fs.readFile('media-archive-checks.json','utf8'));if(archive.verified!==movies)throw Error('Film archive has not been verified');
let bytes=0;async function count(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await count(file);else bytes+=(await fs.stat(file)).size;}}await count(root);
if(bytes>990000000)throw Error('The published site exceeds its GitHub Pages image budget');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');if(html.includes('PRIVATE DESIGN PREVIEW')||html.includes('noindex,nofollow'))throw Error('Preview-only metadata remains');
const entry=html.match(/id="portfolio-entry"[^>]*src="([^"]+)"/)?.[1];if(!entry)throw Error('Missing browser entry');await fs.access(path.join(root,entry));
if(/[\p{Extended_Pictographic}]/u.test(html.replaceAll('©','')))throw Error('Emoji-capable glyph in the website UI');
const report={projects:data.entries.length,images:data.entries.reduce((n,p)=>n+p.images.length,0),graphics:data.entries.reduce((n,p)=>n+p.graphics.length,0),videos:movies+vimeo,githubFilms:movies,vimeoEmbeds:vimeo,checkedImageFiles:files.size,bytes,verifiedAt:new Date().toISOString()};
await fs.writeFile('deployment-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
