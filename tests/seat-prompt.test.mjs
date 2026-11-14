import test from 'node:test';
import assert from 'node:assert/strict';
import {seatPromptPosition,mountSeatPrompt} from '../site/seat-prompt.mjs';

test('a seat bubble stays within phone edges and moves below seats near the top',()=>{
  for(const rect of [{left:0,top:210,width:40,bottom:250},{left:280,top:210,width:40,bottom:250},{left:140,top:24,width:40,bottom:64}]){
    const p=seatPromptPosition(rect,320,568);
    assert.ok(p.x>=12&&p.x+208<=308);assert.ok(p.y>=12&&p.y+76<=556);assert.ok(p.arrow>=20&&p.arrow<=188);
  }
  assert.equal(seatPromptPosition({left:140,top:24,width:40,bottom:64},320,568).below,true);
});

class Element extends EventTarget{
  hidden=true;isConnected=true;dataset={};attributes=new Map();offsetWidth=208;offsetHeight=76;
  style={setProperty(k,v){this[k]=v;}};
  setAttribute(k,v){this.attributes.set(k,v);}
  focus(){document.activeElement=this;}
  getBoundingClientRect(){return {left:80,top:220,width:44,height:44,bottom:264};}
  contains(node){return node===this;}
  click(){this.dispatchEvent(new Event('click'));}
}
function fixture(t){
  const originals=Object.fromEntries(['document','window'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  t.after(()=>{for(const k of ['document','window']){if(originals[k])Object.defineProperty(globalThis,k,originals[k]);else delete globalThis[k];}});
  const doc=new EventTarget(),win=new EventTarget();win.innerWidth=390;win.innerHeight=844;globalThis.document=doc;globalThis.window=win;
  const bubble=new Element();bubble.id='seat-prompt';const confirm=new Element(),cancel=new Element(),label=new Element();
  bubble.querySelector=s=>s.includes('confirm')?confirm:s.includes('cancel')?cancel:label;
  const accepted=[],controller=mountSeatPrompt(bubble,{onConfirm:p=>accepted.push(p)});
  return {doc,win,bubble,confirm,cancel,label,accepted,controller,seat:new Element()};
}

test('first tap only offers a seat; confirmation or a second tap admits exactly that seat once',t=>{
  const f=fixture(t);f.controller.offer(f.seat,{id:'bam',label:'A01'});
  assert.equal(f.accepted.length,0);assert.equal(f.bubble.hidden,false);assert.equal(f.label.textContent,'A01');assert.equal(f.doc.activeElement,f.confirm);
  assert.equal(f.seat.attributes.get('aria-expanded'),'true');
  f.confirm.click();f.confirm.click();assert.equal(f.accepted.length,1);assert.equal(f.accepted[0].id,'bam');assert.equal(f.bubble.hidden,true);
  f.controller.offer(f.seat,{id:'eqs',label:'A02'});f.controller.offer(f.seat,{id:'eqs',label:'A02'});
  assert.equal(f.accepted.length,2);assert.equal(f.accepted[1].id,'eqs');assert.equal(f.seat.attributes.get('aria-expanded'),'false');
});

test('a different seat replaces the pending choice; cancel, Escape, and scrolling never admit a visitor',t=>{
  const f=fixture(t),other=new Element();f.controller.offer(f.seat,{id:'bam',label:'A01'});f.controller.offer(other,{id:'eqs',label:'A02'});
  assert.equal(f.seat.attributes.get('aria-expanded'),'false');f.cancel.click();assert.equal(f.doc.activeElement,other);assert.equal(f.accepted.length,0);
  f.controller.offer(f.seat,{id:'bam',label:'A01'});const escape=new Event('keydown',{cancelable:true});Object.defineProperty(escape,'key',{value:'Escape'});f.doc.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented,true);assert.equal(f.doc.activeElement,f.seat);assert.equal(f.controller.isOpen(),false);
  f.controller.offer(f.seat,{id:'bam',label:'A01'});f.win.dispatchEvent(new Event('scroll'));assert.equal(f.controller.isOpen(),false);assert.equal(f.accepted.length,0);
});
