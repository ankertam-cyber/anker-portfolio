import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTagline} from '../site/tagline-motion.mjs';

test('tagline autoplays without input, animates real bulbs and resumes after visibility or image load',()=>{
  const names=['document','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','addEventListener'];
  const saved=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));
  const doc=new EventTarget(),page=new EventTarget(),image=new EventTarget();
  doc.hidden=false;doc.createElement=()=>({style:{opacity:'0'}});
  image.complete=true;image.naturalWidth=1086;
  const layer={hidden:true,dataset:{},parentElement:{},replaceChildren(...nodes){this.children=nodes;}};
  let nextId=0;const frames=new Map();let observer;
  try{
    globalThis.document=doc;
    globalThis.addEventListener=page.addEventListener.bind(page);
    globalThis.IntersectionObserver=class{constructor(fn){observer=fn;}observe(){}};
    globalThis.requestAnimationFrame=fn=>{frames.set(++nextId,fn);return nextId;};
    globalThis.cancelAnimationFrame=id=>frames.delete(id);
    const tick=now=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
    mountTagline(layer,image);
    assert.equal(layer.hidden,false);assert.equal(layer.children.length,24);assert.equal(frames.size,1);
    tick(1000);const first=layer.children.map(b=>b.style.opacity);
    tick(1080);assert.equal(layer.dataset.playback,'playing');
    assert.notDeepEqual(layer.children.map(b=>b.style.opacity),first);
    doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(frames.size,0);assert.equal(layer.dataset.playback,'paused');
    doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));tick(2000);tick(2080);
    assert.equal(layer.dataset.playback,'playing');
    observer([{isIntersecting:false}]);assert.equal(frames.size,0);
    observer([{isIntersecting:true}]);assert.equal(frames.size,1);
    image.complete=false;image.naturalWidth=0;image.dispatchEvent(new Event('error'));
    assert.equal(layer.hidden,true);assert.equal(frames.size,0);
    image.complete=true;image.naturalWidth=1086;image.dispatchEvent(new Event('load'));
    assert.equal(layer.hidden,false);assert.equal(frames.size,1);
    page.dispatchEvent(new Event('pageshow'));assert.equal(frames.size,1);
    tick(3000);tick(3080);assert.equal(layer.dataset.playback,'playing');
  }finally{for(const [name,value] of saved){if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}}
});
