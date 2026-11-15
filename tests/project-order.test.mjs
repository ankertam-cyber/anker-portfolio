import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dateFromProjectTitle,sortProjectEntries,PINNED_PROJECT_IDS} from '../site/project-order.mjs';
const data=JSON.parse(await fs.readFile(new URL('../site/projects.json',import.meta.url),'utf8'));

test('BAM, Maybach EQS and C-Class occupy the three confirmed opening seats',()=>{
  assert.deepEqual(data.entries.slice(0,3).map(p=>p.id),PINNED_PROJECT_IDS);
  assert.equal(data.entries[0].title,'BAM Festival');assert.equal(data.entries[1].title,'Maybach — EQS SUV');
  assert.equal(new Set(data.entries.map(p=>p.id)).size,data.entries.length);assert.ok(data.entries.length>=47);
  for(const removed of ['1ct8QutQf4KVMdD71QwAwot__gxFJ9Ulr','142cliMzqQ08saOjqehnXksde6fQ5QpQh','17BelP36yjHdIlyNagEzu476pefIoRUEv','19-zmxbbZVE7ZO58kosQEh4CN3TPvrkHi','1ReUL1qjkhd0LHJyUGQRXsCra27w7swPV'])assert.equal(data.entries.some(p=>p.id===removed),false);
});
test('remaining projects follow dates, with each requested series represented by its newest member',()=>{
  const seen=new Set();const remaining=data.entries.slice(3).filter(p=>{if(!p.orderGroup)return true;if(seen.has(p.orderGroup))return false;seen.add(p.orderGroup);return true;});
  const numeric=p=>(p.projectDate.year??0)*10000+(p.projectDate.month??0)*100+(p.projectDate.day??0);
  for(let i=1;i<remaining.length;i++)assert.ok(numeric(remaining[i-1])>=numeric(remaining[i]));
  const withUploadTimes=[{id:'a',sourceOrder:0,projectDate:{year:2021},driveModifiedTime:'2026-11-13'},{id:'b',sourceOrder:1,projectDate:{year:2026},driveModifiedTime:'2021-01-01'}];
  assert.equal(sortProjectEntries(withUploadTimes)[0].id,'b');
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
