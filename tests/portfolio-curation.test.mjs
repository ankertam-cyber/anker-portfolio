import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectMedia} from '../site/project-media.mjs';
const data=JSON.parse(await fs.readFile(new URL('../site/projects.v28.json',import.meta.url),'utf8'));
const rules=JSON.parse(await fs.readFile(new URL('../site/portfolio-curation.json',import.meta.url),'utf8'));
const entries=data.entries.filter(p=>p.images.length||p.videos.length);

test('the owner-selected programme contains fifty posts and cannot revive an excluded project',()=>{
 assert.equal(entries.length,rules.expectedPublishedProjects);
 assert.deepEqual(entries.slice(0,3).map(p=>p.id),rules.pinnedProjectIds);
 for(const id of rules.excludedProjectIds){assert.equal(data.entries.some(p=>p.id===id),false,id);assert.equal(Boolean(data.projectRedirects[id]),false);}
 for(const [id,year] of Object.entries(rules.confirmedYears)){const p=entries.find(p=>p.id===id);assert.equal(p.projectDate.year,year);assert.equal(p.projectDate.requiresReview,false);}
});
test('merged posts retain every component, resolve old links, and put the requested pictures first',()=>{
 for(const group of rules.groups){const p=entries.find(p=>p.id===group.id);assert.ok(p);assert.deepEqual(p.mergedProjects.map(p=>p.id),group.members);assert.equal(p.mediaOrder,'images-first');assert.equal(projectMedia(p)[0].src,p.images[0]);for(const id of group.members)if(id!==group.id){assert.equal(entries.some(p=>p.id===id),false);assert.equal(data.projectRedirects[id],group.id);}}
 for(const [id,lead] of Object.entries(rules.leadImages))assert.deepEqual(entries.find(p=>p.id===id).images.slice(0,lead.length),lead);
 const charging=entries.find(p=>p.title==='Mercedes-Benz — Charging Stations');let renderSeen=false;for(const src of charging.images){if(charging.imageInfo[src].mediaKind==='render')renderSeen=true;else assert.equal(renderSeen,false,'A physical photo must precede the renders');}
});
test('Experience Days stay adjacent in descending years, and the three new films lead their cases',()=>{
 const positions=rules.experienceDayProjectIds.map(id=>entries.findIndex(p=>p.id===id));assert.ok(positions[0]>=0);assert.deepEqual(positions,[positions[0],positions[0]+1,positions[0]+2]);assert.deepEqual(positions.map(i=>entries[i].projectDate.year),[2023,2022,2021]);
 for(const code of rules.newFilmFirstIds){const p=entries.find(p=>p.videos.some(v=>v.sourcePage?.includes(code)));assert.ok(p,code);assert.ok(p.videos[0].sourcePage.includes(code));assert.equal(projectMedia(p)[0].src,p.videos[0].src);assert.ok(p.videos[0].bytes>0);assert.equal(p.videos[0].type,'video');}
});
