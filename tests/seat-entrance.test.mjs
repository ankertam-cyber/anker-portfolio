import test from 'node:test';
import assert from 'node:assert/strict';
import {seatEntranceElapsed,seatCameraFrame,SEAT_JOURNEY_MS} from '../site/seat-journey.mjs';

test('entrance reaches final camera after a stalled animation frame',()=>{
  const started=1000;
  assert.equal(seatEntranceElapsed(started,started),0);
  assert.equal(seatEntranceElapsed(started,started+400),400);
  const elapsed=seatEntranceElapsed(started,started+30000);
  assert.equal(elapsed,SEAT_JOURNEY_MS);
  assert.equal(seatCameraFrame(elapsed/SEAT_JOURNEY_MS,958,394,true,100).settled,true);
});

test('reduced motion is seated immediately; intermediate frames remain animated',()=>{
  assert.equal(seatCameraFrame(0,958,394,false,100).settled,true);
  assert.equal(seatCameraFrame(.5,958,394,true,100).settled,false);
});
