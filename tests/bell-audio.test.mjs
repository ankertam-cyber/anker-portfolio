import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeskBell} from '../site/bell-audio.mjs';
test('a direct bell tap unmutes and starts the actual clip from the beginning',async()=>{
 const states=[];let played=0;const audio={muted:true,currentTime:1,volume:0,pause(){},async play(){played++;}};
 assert.equal(await createDeskBell({audio,onState:s=>states.push(s)}).ring(),true);
 assert.equal(played,1);assert.equal(audio.muted,false);assert.equal(audio.currentTime,0);assert.deepEqual(states,['playing']);
});
test('fallback awaits interrupted audio recovery before scheduling the bell',async()=>{
 let resumed=false,oscillators=0;
 const parameter={setValueAtTime(){assert.ok(resumed);},exponentialRampToValueAtTime(){}};
 const context={state:'interrupted',currentTime:0,destination:{},async resume(){await Promise.resolve();resumed=true;this.state='running';},createGain(){return {gain:parameter,connect(){},disconnect(){}};},createOscillator(){oscillators++;return {frequency:parameter,connect(){},start(){assert.ok(resumed);},stop(){}};}};
 const audio={pause(){},async play(){throw Error('Unavailable media');}};
 assert.equal(await createDeskBell({audio,contextFactory:()=>context,schedule(){}}).ring(),true);assert.equal(oscillators,4);
});
test('blocked playback reports failure instead of claiming the bell played',async()=>{
 const states=[];const bell=createDeskBell({audio:{pause(){},async play(){throw Error('blocked');}},onState:s=>states.push(s)});
 assert.equal(await bell.ring(),false);assert.deepEqual(states,['blocked']);
});
