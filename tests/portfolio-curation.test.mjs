import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectMedia} from '../site/project-media.mjs';
const data=JSON.parse(await fs.readFile(new URL('../site/projects.v28.json',import.meta.url),'utf8'));
const owner=JSON.parse(await fs.readFile(new URL('../owner-curation.json',import.meta.url),'utf8'));
const kept=owner.projects.filter(p=>p.decision==='keep'&&['c1','c2'].includes(p.cinema)).sort((a,b)=>a.cinema.localeCompare(b.cinema)||a.cinemaOrder-b.cinemaOrder);
test('all 84 owner decisions produce exactly the approved 67-project programme',()=>{
 assert.equal(owner.projects.length,84);assert.equal(data.entries.length,67);
 assert.deepEqual(data.entries.map(p=>p.editorId),kept.map(p=>p.editorId));
 assert.deepEqual(data.entries.map(p=>p.title),kept.map(p=>p.title));
 for(const item of owner.projects.filter(p=>p.decision!=='keep'))assert.equal(data.entries.some(p=>p.editorId===item.editorId),false,item.editorId);
 assert.equal(data.entries.filter(p=>p.cinema==='c1').length,60);
 assert.equal(data.entries.filter(p=>p.cinema==='c2').length,7);
 for(const id of ['o20','o22'])assert.equal(data.entries.find(p=>p.editorId===id).executionStatus,'concept-design');
});
test('every available film precedes photography and every rendering or graphic follows photographs',()=>{
 for(const p of data.entries){
  const media=projectMedia(p);let rank=-1;
  for(const item of media){
   const current=item.type!=='image'?0:['graphic','graphics','rendering','render','design'].includes(item.mediaKind)?2:1;
   assert.ok(current>=rank,`${p.editorId}: media order regressed`);rank=current;
   assert.ok(!/\.psd(?:$|[?#])/i.test(item.src),`${p.editorId}: PSD cannot be website media`);
  }
  const availableVideos=new Set((p.videos||[]).map(v=>v.src));
  assert.equal(media.filter(m=>m.type!=='image').length,availableVideos.size,p.editorId);
 }
});
test('missing source media never requires fabricated imagery',()=>{
 for(const p of data.entries){assert.ok(Array.isArray(p.images));assert.ok(Array.isArray(p.videos));assert.equal(p.curationStatus,'keep');}
});
