import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_STORIES,projectStoryFor} from '../site/project-stories.mjs';
const stories=Object.values(PROJECT_STORIES);
test('every authored case study contains the editorial sections and unique source ID',()=>{
  assert.equal(stories.length,12);
  assert.equal(new Set(stories.map(s=>s.id)).size,stories.length);
  for(const story of stories){
    assert.equal(projectStoryFor(story.id),story);
    for(const k of ['title','eyebrow','intro','challenge','approach','role','outcome','evidence'])assert.ok(story[k]?.trim(),story.id+' missing '+k);
    assert.ok(story.highlights.length>=2,story.id+' missing visual highlight labels');
    assert.equal(story.spotlight,true);
  }
});
test('2025 CLA remains a proposal, not an executed project',()=>{
  const cla=stories.find(s=>s.title.includes('CLA Car City'));
  assert.equal(cla.stage,'pitch-concept-only');
  assert.match(cla.outcome,/final pitch round/i);
});
test('three customer experience days have distinct creative themes',()=>{
  const days=stories.filter(s=>/Experience Day/.test(s.title));
  assert.equal(days.length,3);
  assert.deepEqual(days.map(s=>s.eyebrow).sort(),['BON APPÉTIT','MB AGENT','TEAM UP PLAYLAND'].sort());
});
