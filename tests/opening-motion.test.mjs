import test from 'node:test';
import assert from 'node:assert/strict';
import {openingFrame,seatRevealProgress} from '../site/opening-motion.mjs';

test('opening hands the invitation directly to the visible cinema',()=>{
  const start=openingFrame(0);assert.equal(start.hero,1);assert.equal(start.curtain,0);assert.equal(start.cinema,0);
  const invitation=openingFrame(.4);assert.equal(invitation.hero,0);assert.equal(invitation.reveal,1);assert.ok(invitation.curtain>.8);
  const end=openingFrame(1);assert.equal(end.stage,0);assert.equal(end.reveal,0);assert.equal(end.cinema,1);assert.equal(end.title,1);assert.equal(end.screen,1);assert.equal(end.screenScale,1);assert.ok(Math.abs(end.projection)<1e-8);
});

test('the transition never loses every visible content layer between scenes',()=>{
  for(let i=0;i<=200;i++){
    const frame=openingFrame(i/200);
    assert.ok(Math.max(frame.hero*frame.stage,frame.reveal*frame.stage,frame.cinema*frame.title)>.1,`blank transition at ${i/200}`);
  }
});

test('direct links, restored scroll positions and reverse scrolling have deterministic endpoints',()=>{
  assert.deepEqual(openingFrame(8),openingFrame(1));assert.deepEqual(openingFrame(-3),openingFrame(0));
  assert.deepEqual(openingFrame(.7),openingFrame(.7));
});

test('seats animate when their row reaches the viewport rather than before it can be seen',()=>{
  assert.equal(seatRevealProgress(900,800),0);assert.equal(seatRevealProgress(600,800),1);
  assert.ok(seatRevealProgress(740,800)>0&&seatRevealProgress(740,800)<1);
  assert.ok(seatRevealProgress(680,800)>seatRevealProgress(790,800));
});

test('reduced motion leaves the hero and entire cinema readable without a hidden interstitial',()=>{
  for(const p of [0,.4,.7,1,2]){
    const frame=openingFrame(p,false);assert.equal(frame.hero,1);assert.equal(frame.reveal,0);assert.equal(frame.cinema,1);assert.equal(frame.title,1);assert.equal(frame.screen,1);assert.equal(frame.screenLift,0);assert.equal(frame.projection,0);
  }
  assert.equal(seatRevealProgress(1600,800,false),1);
});
