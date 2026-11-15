import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdminVideoPreview} from '../site/admin-video-preview.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
const films=[{type:'video',src:'assets/first.mp4',label:'First film'},{type:'image',src:'assets/still.jpg'},{type:'vimeo',src:'https://player.vimeo.com/video/123?h=private'},{type:'video',src:'assets/last%20film.mp4'}];
class Element extends EventTarget{
 constructor(tag,doc){super();Object.assign(this,{tagName:tag,ownerDocument:doc,children:[],attributes:{},style:{},dataset:{},hidden:false,textContent:'',isConnected:true,focusCalls:0});}
 appendChild(child){child.remove();child.parentNode=this;this.children.push(child);return child;}
 remove(){if(this.parentNode)this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 removeAttribute(key){delete this.attributes[key];}
 focus(){this.focusCalls++;}
 fire(name){this.dispatchEvent(new Event(name,{cancelable:true}));}
}
class Video extends Element{
 constructor(doc){super('video',doc);Object.assign(this,{paused:true,duration:125,playCalls:0,pauseCalls:0,loadCalls:0,playImpl:()=>Promise.resolve()});}
 set src(value){this.setAttribute('src',value);}get src(){return this.getAttribute('src')||'';}
 set poster(value){this.setAttribute('poster',value);}
 play(){this.playCalls++;this.paused=false;this.fire('play');return this.playImpl();}
 pause(){this.pauseCalls++;const playing=!this.paused;this.paused=true;if(playing)this.fire('pause');}
 load(){this.loadCalls++;}
}
class Player{
 constructor(frame){Object.assign(this,{frame,readiness:deferred(),handlers:new Map(),playCalls:0,pauseCalls:0,destroyCalls:0});}
 ready(){return this.readiness.promise;}
 on(name,fn){this.handlers.set(name,fn);}off(name){this.handlers.delete(name);}
 play(){this.playCalls++;this.handlers.get('play')?.();return Promise.resolve();}
 pause(){this.pauseCalls++;return Promise.resolve();}
 destroy(){this.destroyCalls++;return Promise.resolve();}
}
function harness(t){
 const doc=new EventTarget();doc.hidden=false;doc.defaultView=new EventTarget();doc.createElement=tag=>new Element(tag,doc);doc.activeElement=new Element('button',doc);
 const dialog=new Element('dialog',doc),elements={};
 for(const id of ['preview-native','preview-vimeo','video-preview-status','video-preview-previous','video-preview-next','video-preview-title','video-preview-context','video-preview-filename','video-preview-count','video-preview-close'])elements[id]=id==='preview-native'?new Video(doc):doc.createElement('div');
 dialog.querySelector=selector=>elements[selector.slice(1)];dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.fire('close');};dialog.getBoundingClientRect=()=>({left:10,right:100,top:10,bottom:100});
 const players=[],preview=mountAdminVideoPreview(dialog,{site:new URL('https://example.com/portfolio/'),document:doc,createPlayer:frame=>{const player=new Player(frame);players.push(player);return player;}});
 t.after(()=>preview.close());
 return{doc,dialog,players,preview,video:elements['preview-native'],slot:elements['preview-vimeo'],el:id=>elements[id],click:id=>elements[id].fire('click')};
}
test('native preview plays the selected film, skips photos, and closing releases media and returns focus',t=>{
 const h=harness(t);h.preview.open(films,{src:films[3].src,context:'Selected project'});
 assert.equal(h.video.src,'https://example.com/portfolio/assets/last%20film.mp4');assert.equal(h.video.playCalls,1);assert.equal(h.video.controls,true);assert.equal(h.video.playsInline,true);
 assert.equal(h.el('video-preview-count').textContent,'3 / 3 條影片');assert.equal(h.el('video-preview-context').textContent,'Selected project');assert.equal(h.el('video-preview-filename').textContent,'last film.mp4');assert.equal(h.el('video-preview-next').disabled,true);
 h.click('video-preview-close');assert.equal(h.dialog.open,false);assert.equal(h.video.paused,true);assert.equal(h.video.getAttribute('src'),null);assert.equal(h.slot.children.length,0);assert.equal(h.doc.activeElement.focusCalls,1);
});
test('switching films detaches Vimeo before native playback and stale readiness cannot start old audio',async t=>{
 const h=harness(t);h.preview.open(films,{src:films[2].src});const player=h.players[0];assert.equal(h.slot.children.length,1);
 h.click('video-preview-next');assert.equal(h.video.src,'https://example.com/portfolio/assets/last%20film.mp4');assert.equal(h.slot.children.length,0);assert.equal(player.frame.src,'about:blank');assert.equal(player.pauseCalls,1);assert.equal(player.destroyCalls,1);
 player.readiness.resolve();await flush();assert.equal(player.playCalls,0);assert.equal(h.dialog.dataset.playback,'playing');
});
test('Vimeo preview uses the official controls and pauses and detaches on Escape',async t=>{
 const h=harness(t);h.preview.open(films,{src:films[2].src});const player=h.players[0];assert.equal(new URL(player.frame.src).searchParams.get('controls'),'1');assert.equal(player.frame.getAttribute('allowfullscreen'),'');
 player.readiness.resolve();await flush();assert.equal(player.playCalls,1);assert.equal(h.dialog.dataset.playback,'playing');assert.equal(h.video.hidden,true);
 h.dialog.fire('cancel');assert.equal(h.slot.children.length,0);assert.equal(player.destroyCalls,1);assert.equal(h.dialog.open,false);
});
test('hidden tabs pause playback and delayed Vimeo readiness does not restart it',async t=>{
 const h=harness(t);h.preview.open(films,{src:films[0].src});h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.video.paused,true);assert.equal(h.dialog.dataset.playback,'paused');
 h.doc.hidden=false;h.preview.open(films,{src:films[2].src});const player=h.players[0];h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));player.readiness.resolve();await flush();assert.equal(player.playCalls,0);assert.ok(player.pauseCalls>=1);assert.equal(h.dialog.dataset.playback,'paused');
});
test('a rejected pending play cannot overwrite a closed viewer or a media error',async t=>{
 const h=harness(t),pending=deferred();h.video.playImpl=()=>pending.promise;h.preview.open(films,{src:films[0].src});h.preview.close();pending.reject(Error('interrupted'));await flush();assert.equal(h.dialog.dataset.playback,'closed');
 const failure=deferred();h.video.playImpl=()=>failure.promise;h.preview.open(films,{src:films[0].src});h.video.fire('error');failure.reject(Error('unsupported'));await flush();assert.equal(h.dialog.dataset.playback,'error');assert.match(h.el('video-preview-status').textContent,/未能載入/);
});
test('invalid or missing sources are rejected before disturbing the active film',t=>{
 const h=harness(t);h.preview.open(films,{src:films[0].src});const source=h.video.src,loads=h.video.loadCalls;
 for(const bad of [{type:'video',src:'javascript:alert(1)'},{type:'vimeo',src:'https://evil.example/video/123'}])assert.throws(()=>h.preview.open([bad],{src:bad.src}));
 assert.throws(()=>h.preview.open(films,{src:'missing.mp4'}));assert.equal(h.video.src,source);assert.equal(h.video.loadCalls,loads);assert.equal(h.dialog.open,true);
});
test('previous/next use the current preview playlist without mutating supplied media',t=>{
 const h=harness(t),before=JSON.stringify(films);h.preview.open(films,{src:films[3].src});h.click('video-preview-previous');h.click('video-preview-previous');assert.equal(h.el('video-preview-title').textContent,'First film');assert.equal(h.el('video-preview-previous').disabled,true);assert.equal(JSON.stringify(films),before);
 h.doc.defaultView.dispatchEvent(new Event('pagehide'));assert.equal(h.video.getAttribute('src'),null);assert.equal(h.dialog.open,false);
});
test('the reported BAM clip uses the same-origin playback file while its draft URL remains intact',t=>{
 const h=harness(t),name='6e422e_673a66651a714533a59b6983c87a429b-07e341c7e1873d7b7a42.mp4',film={type:'video',src:'https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/'+name};
 h.preview.open([film],{src:film.src});assert.equal(h.video.src,'https://example.com/portfolio/assets/web-video-v1/'+name);assert.match(film.src,/github\.com/);
});
