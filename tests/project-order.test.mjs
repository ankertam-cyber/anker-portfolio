import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dateFromProjectTitle,sortProjectEntries,PINNED_PROJECT_IDS} from '../site/project-order.mjs';
const owner=JSON.parse(await fs.readFile(new URL('../owner-curation.json',import.meta.url),'utf8'));
const data=JSON.parse(await fs.readFile(new URL('../site/projects.json',import.meta.url),'utf8'));

test('the current published order follows the complete owner decisions rather than chronology',()=>{
 const kept=owner.projects.filter(p=>p.decision==='keep'&&['c1','c2'].includes(p.cinema)).sort((a,b)=>a.cinema.localeCompare(b.cinema)||a.cinemaOrder-b.cinemaOrder);
 assert.equal(owner.projects.length,84);assert.equal(kept.length,67);
 assert.deepEqual(data.entries.map(p=>p.editorId),kept.map(p=>p.editorId));
 assert.deepEqual(data.entries.map(p=>p.title),kept.map(p=>p.title));
 assert.equal(new Set(data.entries.map(p=>p.id)).size,67);
});
test('only written date components are recorded and conflicting years are flagged',()=>{
  const month=dateFromProjectTitle('2026 - Brand 2026 07 Outpost');assert.equal(month.month,7);assert.equal(month.day,null);assert.equal(month.precision,'month');
  const day=dateFromProjectTitle('2025 - Dinner 2025 11 13');assert.equal(day.day,13);
  const conflict=dateFromProjectTitle('2025 - DG 2026 03 20 VIP Dinner');assert.equal(conflict.year,2026);assert.equal(conflict.requiresReview,true);
  const greeting=dateFromProjectTitle('2025 - Christmas 2025 & Happy 2026');assert.equal(greeting.year,2025);assert.equal(greeting.month,null);
  const invalid=dateFromProjectTitle('2025 - Event 2025 02 31');assert.equal(invalid.precision,'year');
  assert.equal(dateFromProjectTitle('Undated Archive').year,null);
});
test('year-only ties retain source order and are never assigned invented months',()=>{
  const entries=[{id:'a',sourceOrder:4,projectDate:dateFromProjectTitle('2024 - A')},{id:'b',sourceOrder:1,projectDate:dateFromProjectTitle('2024 - B')}];
  assert.deepEqual(sortProjectEntries(entries).map(p=>p.id),['b','a']);
  assert.ok(entries.every(p=>p.projectDate.month===null&&p.projectDate.day===null));
});
