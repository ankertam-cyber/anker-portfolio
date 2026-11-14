import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMediaViewer} from '../site/media-viewer.mjs';

// Small DOM boundary double: tests controller behavior, not browser fullscreen rendering.
class Element extends EventTarget{
  hidden=false;disabled=false;isConnected=true;attributes=new Map();
  pauses=0;loads=0;
  pause(){this.pauses++;}
  load(){this.loads++;}
  setAttribute(k,v){this.attributes.set(k,v);}
  removeAttribute(k){this.attributes.delete(k);delete this[k];}
  focus(){document.activeElement=this;}
  click(){this.dispatchEvent(new Event('click'));}
}
function fixture(t,native='unsupported'){
  const original=globalThis.document;
  const doc=new EventTarget(),classes=new Set();
  doc.body={classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}};
  const trigger=new Element();doc.activeElement=trigger;globalThis.document=doc;
  t.after(()=>{globalThis.document=original;});
  const ids=['image','title','counter','previous','next','close','fullscreen','project','video'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
  const surface=new Element();surface.querySelectorAll=()=>['previous','next','close','fullscreen','project'].map(id=>nodes[id]);
  if(native==='reject')surface.requestFullscreen=()=>Promise.reject(new Error('Denied by browser'));
  if(native==='allow'){
    surface.requestFullscreen=async()=>{doc.fullscreenElement=surface;doc.dispatchEvent(new Event('fullscreenchange'));};
    doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));};
  }
  const dialog=new Element();dialog.open=false;
  dialog.querySelector=selector=>selector==='.lightbox-surface'?surface:nodes[selector.replace('#lightbox-','')];
  dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new Event('close'));};
  return {doc,dialog,nodes,trigger,viewer:mountMediaViewer(dialog)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const images=['assets/media/bam-festival-hero.avif','assets/media/bam-festival-detail.avif'];

test('a rejected native request still opens the gallery, allows navigation, and closes with restored focus',async t=>{
  const {doc,dialog,nodes,trigger,viewer}=fixture(t,'reject');
  assert.equal(viewer.open({images,title:'BAM Festival'},{fullscreen:true}),true);await tick();
  assert.equal(dialog.open,true);assert.equal(doc.body.classList.contains('viewer-is-open'),true);
  assert.equal(nodes.image.src,images[0]);nodes.next.click();assert.equal(nodes.image.src,images[1]);
  nodes.next.click();assert.equal(nodes.image.src,images[0]);
  const cancel=new Event('cancel',{cancelable:true});dialog.dispatchEvent(cancel);await tick();
  assert.equal(cancel.defaultPrevented,true);assert.equal(dialog.open,false);
  assert.equal(doc.body.classList.contains('viewer-is-open'),false);assert.equal(doc.activeElement,trigger);
});
test('unsupported devices keep the viewport viewer and single images have no redundant navigation',async t=>{
  const {dialog,nodes,viewer}=fixture(t);
  assert.equal(viewer.open({images:[],title:'Empty'}),false);assert.equal(dialog.open,false);
  viewer.open({images:images.slice(0,1),title:'One image'},{fullscreen:true});
  assert.equal(dialog.open,true);assert.equal(nodes.fullscreen.hidden,true);
  assert.equal(nodes.previous.hidden,true);assert.equal(nodes.next.hidden,true);assert.equal(nodes.counter.textContent,'01 / 01');
  await viewer.close();assert.equal(viewer.isOpen(),false);
});
test('opening a project from native fullscreen exits the viewer before the project action',async t=>{
  const {doc,dialog,nodes,viewer}=fixture(t,'allow');let opened=false;
  viewer.open({images,title:'BAM Festival',index:1,onProject:()=>{assert.equal(dialog.open,false);assert.equal(doc.fullscreenElement,null);opened=true;}},{fullscreen:true});
  await tick();assert.equal(nodes.image.src,images[1]);assert.ok(doc.fullscreenElement);
  nodes.project.click();await tick();assert.equal(opened,true);assert.equal(doc.body.classList.contains('viewer-is-open'),false);
});

test('a mixed film and photo gallery releases video playback when changing items and closing',async t=>{
  const {nodes,viewer,trigger,doc}=fixture(t);
  const media=[{type:'video',src:'assets/portfolio/film.mp4',poster:'assets/portfolio/poster.jpg'},{type:'image',src:images[0]}];
  viewer.open({media,title:'A screening'});assert.equal(nodes.video.src,media[0].src);assert.equal(nodes.video.poster,media[0].poster);assert.equal(nodes.image.hidden,true);assert.equal(nodes.video.hidden,false);
  const prior=nodes.video.pauses;nodes.next.click();assert.ok(nodes.video.pauses>prior);assert.equal(nodes.video.src,undefined);assert.equal(nodes.image.src,images[0]);assert.equal(nodes.video.hidden,true);
  nodes.previous.click();assert.equal(nodes.video.src,media[0].src);await viewer.close();assert.equal(nodes.video.src,undefined);assert.equal(nodes.video.hidden,true);assert.equal(doc.activeElement,trigger);
});
