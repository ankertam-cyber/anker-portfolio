import test from 'node:test';
import assert from 'node:assert/strict';
import {seatCameraFrame,projectCinemaPoint,mountSeatJourney,SEAT_JOURNEY_MS,headTurnFrame,adjacentScreening,SEAT_TURN_MS} from '../site/seat-journey.mjs';

test('the shared camera approaches, sits, and tilts up before stopping on an uncropped screen',()=>{
  const overhead=seatCameraFrame(0,390,844),sitting=seatCameraFrame(.67,390,844),end=seatCameraFrame(1,390,844);
  assert.ok(overhead.y<sitting.y);assert.ok(sitting.angle<end.angle);assert.equal(end.settled,true);
  for(const [w,h] of [[320,568],[390,844],[768,1024],[1440,900],[844,390]]){
    const frame=seatCameraFrame(1,w,h);
    for(const x of [-500,500])for(const y of [-611.25,-48.75]){
      const point=projectCinemaPoint({x,y,z:0},frame,w,h);
      assert.ok(point.depth<0);assert.ok(point.x>0&&point.x<w);assert.ok(point.y>0&&point.y<h);
    }
    const a=projectCinemaPoint({x:0,y:-330,z:0},frame,w,h);
    assert.ok(Math.abs(a.x-w/2)<.001);assert.ok(Math.abs(a.y-h*.47)<.001);
  }
});

test('camera time clamps, has continuous stops, and reduced motion lands directly at the same final view',()=>{
  assert.deepEqual(seatCameraFrame(-1,390,844),seatCameraFrame(0,390,844));
  assert.deepEqual(seatCameraFrame(9,390,844),seatCameraFrame(1,390,844));
  assert.deepEqual(seatCameraFrame(.2,390,844,false),seatCameraFrame(1,390,844));
  for(const p of [.42,.67]){
    const a=seatCameraFrame(p-.00001,390,844),b=seatCameraFrame(p+.00001,390,844);
    for(const k of ['y','z','angle'])assert.ok(Math.abs(a[k]-b[k])<.001,k);
  }
});

class Element extends EventTarget{
  paused=true;
  pause(){this.paused=true;}
  play(){this.paused=false;return Promise.resolve();}
  load(){}
  hidden=false;disabled=false;isConnected=true;dataset={};style={setProperty(k,v){this[k]=v;}};children=[];clientWidth=390;clientHeight=844;
  setAttribute(k,v){this[k]=v;}
  removeAttribute(k){delete this[k];}
  append(...nodes){this.children.push(...nodes);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  focus(){document.activeElement=this;}
  click(){this.dispatchEvent(new Event('click'));}
}
function fixture(t){
  const names=['document','window','Image','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','performance','setTimeout','clearTimeout'];
  const originals=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  t.after(()=>{for(const k of names){if(originals[k])Object.defineProperty(globalThis,k,originals[k]);else delete globalThis[k];}});
  const doc=new EventTarget(),classes=new Set(),frames=new Map(),loads=[],timers=new Map();let clock=0,timerNumber=0;
  globalThis.performance={now:()=>clock};
  globalThis.setTimeout=(fn,ms)=>{timers.set(++timerNumber,{fn,at:clock+ms});return timerNumber;};
  globalThis.clearTimeout=id=>timers.delete(id);
  const trigger=new Element();doc.activeElement=trigger;doc.hidden=false;
  doc.createElement=()=>new Element();doc.documentElement={style:{scrollBehavior:'smooth'}};
  doc.body={style:{position:'',top:'',width:''},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}};
  const scrolls=[];globalThis.document=doc;globalThis.window={scrollY:1472,scrollTo:opts=>scrolls.push(opts)};
  let frameNumber=0,motion=true;
  globalThis.requestAnimationFrame=callback=>{frames.set(++frameNumber,callback);return frameNumber;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  globalThis.ResizeObserver=class{observe(){}};
  globalThis.Image=class{constructor(){loads.push(this);}complete=false;naturalWidth=0;};
  const ids=['viewport','world','screen','image','placeholder','title','seat','status','counter','close','previous','next','gallery','project','previous-show','next-show','programme','turn-controls','info'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
  let imageSource;nodes.image.naturalWidth=2048;nodes.image.naturalHeight=1365;
  Object.defineProperty(nodes.image,'src',{get:()=>imageSource,set:value=>{imageSource=value;loads.push({onload:nodes.image.onload||(()=>{}),onerror:nodes.image.onerror||(()=>{})});},configurable:true});
  const removeImageAttribute=nodes.image.removeAttribute.bind(nodes.image);nodes.image.removeAttribute=name=>{if(name==='src')imageSource=undefined;else removeImageAttribute(name);};
  nodes.screen.append(nodes.image);nodes.world.append(nodes.screen);nodes.viewport.append(nodes.world);
  const dialog=new Element();dialog.open=false;dialog.querySelector=s=>nodes[s.slice(14,-1)];
  dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new Event('close'));};
  const galleries=[],projects=[],selections=[];
  const controller=mountSeatJourney(dialog,()=>motion,{onGallery:p=>galleries.push(p),onProject:id=>projects.push(id),onSelect:id=>selections.push(id)});
  function advance(ms){const end=clock+ms;for(;clock<end;clock+=16){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(clock);}}
  function advanceTimers(ms){clock+=ms;for(const [id,timer] of timers)if(timer.at<=clock){timers.delete(id);timer.fn();}}
  return {doc,dialog,nodes,trigger,controller,frames,loads,scrolls,galleries,projects,selections,classes,advance,advanceTimers,timers,setMotion:value=>{motion=value;controller.setMotion();}};
}
const bam={id:'bam',title:'BAM Festival',images:['bam-1.avif','bam-2.avif']};

test('the entrance deadline unlocks media without any animation frames and is cancelled on close',t=>{
 const f=fixture(t);f.controller.open(bam);
 assert.equal(f.dialog.dataset.phase,'entering');
 f.advanceTimers(SEAT_JOURNEY_MS+101);
 assert.equal(f.dialog.dataset.phase,'seated');
 f.nodes.gallery.click();assert.equal(f.galleries.length,1);
 f.controller.close();assert.equal(f.timers.size,0);
 f.controller.open(bam);assert.equal(f.timers.size,1);
 f.controller.close();assert.equal(f.timers.size,0);
 f.advanceTimers(30000);assert.equal(f.dialog.dataset.phase,'closed');
});

test('native video previews pause when their full-screen gallery opens',t=>{
 const f=fixture(t);f.setMotion(false);f.controller.open({id:'film',title:'Film',images:[],videos:[{type:'video',src:'film.mp4'}]});
 const video=f.nodes.screen.children.find(n=>n.className==='pov-video-preview');
 video.onloadeddata();assert.equal(video.paused,false);
 f.nodes.gallery.click();assert.equal(video.paused,true);assert.equal(f.galleries[0].media[0].src,'film.mp4');
});

test('seat activation completes one camera move, changes gallery images, and restores the original seat and scroll',t=>{
  const f=fixture(t);f.controller.open(bam,{seat:'CINEMA 01 / SEAT A01',trigger:f.trigger});
  assert.equal(f.dialog.open,true);assert.equal(f.doc.body.style.position,'fixed');assert.equal(f.nodes.seat.textContent,'CINEMA 01 / SEAT A01');
  const scenicSeats=f.nodes.world.children.filter(n=>n.className==='pov-seat');assert.equal(scenicSeats.length,48);
  assert.equal(f.nodes.world.children.some(n=>n.className==='pov-aisle-light'),false);
  for(let row=1;row<8;row++)for(let col=0;col<6;col++)assert.equal(scenicSeats[row*6+col].style.transform.split(',')[0],scenicSeats[col].style.transform.split(',')[0]);
  f.loads[0].onload();assert.equal(f.nodes.image.src,'bam-1.avif');
  f.advance(SEAT_JOURNEY_MS+100);assert.equal(f.dialog.dataset.phase,'seated');assert.equal(f.frames.size,0);
  f.nodes.next.click();f.loads[1].onload();assert.equal(f.nodes.image.src,'bam-2.avif');
  f.nodes.gallery.click();assert.equal(f.galleries[0].index,1);assert.equal(f.galleries[0].id,'bam');
  f.nodes.close.click();assert.equal(f.dialog.open,false);assert.equal(f.frames.size,0);assert.equal(f.doc.activeElement,f.trigger);
  assert.equal(f.doc.body.style.position,'');assert.equal(f.scrolls[0].top,1472);assert.equal(f.doc.documentElement.style.scrollBehavior,'smooth');
});

test('reopening with another seat ignores stale images, stops motion immediately on request, and opens the correct project',t=>{
  const f=fixture(t);f.controller.open(bam,{trigger:f.trigger});
  f.controller.open({id:'eqs',title:'Maybach — EQS SUV',images:['eqs.avif']},{seat:'A02'});
  f.loads[0].onload();assert.equal(f.nodes.image['data-loading'],'true');
  f.loads[1].onload();assert.equal(f.nodes.image.src,'eqs.avif');assert.equal(f.nodes.title.textContent,'Maybach — EQS SUV');
  f.setMotion(false);assert.equal(f.dialog.dataset.phase,'seated');assert.equal(f.frames.size,0);
  f.nodes.project.click();assert.deepEqual(f.projects,['eqs']);assert.equal(f.dialog.open,false);
  assert.equal(f.scrolls.length,1);assert.equal(f.doc.activeElement,f.trigger);
});

test('empty and unavailable projects remain navigable; Escape cancels the transition and clears pending work',t=>{
  const f=fixture(t);f.setMotion(false);f.controller.open({id:'archive',title:'Archive',images:[]});
  assert.equal(f.dialog.dataset.phase,'seated');assert.equal(f.nodes.gallery.hidden,true);
  assert.equal(f.nodes.previous.hidden,true);assert.equal(f.nodes.next.hidden,true);
  f.controller.close();f.setMotion(true);f.controller.open(bam);
  f.loads[0].onerror();assert.match(f.nodes.placeholder.textContent,/unavailable|could not load/);
  const event=new Event('cancel',{cancelable:true});f.dialog.dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assert.equal(f.frames.size,0);assert.equal(f.dialog.open,false);
  f.loads[0].onload();assert.equal(f.nodes.image.src,undefined);
});

test('leaving the tab suspends frame scheduling and returns to the same unfinished journey',t=>{
  const f=fixture(t);f.controller.open(bam);f.advance(480);
  const transform=f.nodes.world.style.transform;
  f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size,0);assert.equal(f.nodes.world.style.transform,transform);
  f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size,1);assert.equal(f.nodes.world.style.transform,transform);
  f.advance(SEAT_JOURNEY_MS);assert.equal(f.dialog.dataset.phase,'seated');assert.equal(f.frames.size,0);
});

test('head turns have mirrored angles, hide the content swap at the midpoint, and return to the same seat perspective',()=>{
  for(const p of [0,.1,.3,.5,.7,1]){
    const right=headTurnFrame(p,1),left=headTurnFrame(p,-1);assert.equal(right.yaw,-left.yaw);
  }
  assert.equal(headTurnFrame(.5).screenOpacity,0);assert.equal(headTurnFrame(.499).swap,false);assert.equal(headTurnFrame(.5).swap,true);
  assert.equal(headTurnFrame(1).done,true);assert.ok(Math.abs(headTurnFrame(1).yaw)<1e-12);
  assert.deepEqual(headTurnFrame(.2,1,false),headTurnFrame(1,1));
  assert.equal(adjacentScreening(51,1,52),0);assert.equal(adjacentScreening(0,-1,52),51);
  const w=1440,h=900,reserve=180,frame=seatCameraFrame(1,w,h,true,reserve);
  assert.ok(projectCinemaPoint({x:500,y:-48.75,z:0},frame,w,h).y<h-reserve);
});

test('a seated visitor can turn between projects and wrap the programme without replaying entry or unlocking the page',t=>{
  const f=fixture(t),eqs={id:'eqs',title:'Maybach — EQS SUV',images:['eqs.avif']};
  f.controller.open(bam,{programme:[bam,eqs],seatLabelFor:p=>p.id==='bam'?'A01':'A02'});f.advance(SEAT_JOURNEY_MS+100);
  assert.equal(f.controller.turnTo(1),true);assert.equal(f.controller.turnTo(1),false);assert.equal(f.dialog.dataset.phase,'turning');
  f.advance(SEAT_TURN_MS+100);f.loads.at(-1).onload();
  assert.equal(f.nodes.title.textContent,eqs.title);assert.equal(f.nodes.image.src,'eqs.avif');assert.equal(f.nodes.seat.textContent,'A02');
  assert.equal(f.nodes.programme.textContent,'02 / 02');assert.deepEqual(f.selections,['eqs']);assert.equal(f.scrolls.length,0);
  assert.equal(f.dialog.dataset.phase,'seated');assert.equal(f.frames.size,0);assert.equal(f.doc.body.style.position,'fixed');
  f.controller.turnTo(1);f.setMotion(false);assert.equal(f.nodes.title.textContent,bam.title);assert.deepEqual(f.selections,['eqs','bam']);
  assert.equal(f.dialog.open,true);assert.equal(f.nodes.screen.style.opacity,'1');assert.equal(f.frames.size,0);
});

test('image swipes change only the image, while background swipes turn to the next show without opening full screen',t=>{
  const f=fixture(t),eqs={id:'eqs',title:'EQS',images:[]};f.setMotion(false);f.controller.open(bam,{programme:[bam,eqs]});f.loads[0].onload();
  function swipe(target){
    for(const [type,x] of [['pointerdown',250],['pointerup',100]]){
      const e=new Event(type,{cancelable:true});Object.defineProperties(e,{target:{value:target},pointerType:{value:'touch'},clientX:{value:x},clientY:{value:400}});f.nodes.viewport.dispatchEvent(e);
    }
  }
  swipe(f.nodes.image);f.loads.at(-1).onload();assert.equal(f.nodes.image.src,'bam-2.avif');assert.equal(f.nodes.title.textContent,bam.title);
  f.nodes.screen.click();assert.equal(f.galleries.length,0);assert.deepEqual(f.selections,[]);
  swipe(f.nodes.viewport);assert.equal(f.nodes.title.textContent,'EQS');assert.deepEqual(f.selections,['eqs']);assert.equal(f.dialog.open,true);
});
