import test from 'node:test';
import assert from 'node:assert/strict';
import {moveMediaSelection,removeProjectMedia,removeLibraryMedia,restoreLibraryMedia,rememberLibrary,createLongPress} from '../site/media-actions.mjs';
import {emptyContent,applyContent,editableEntries,mediaForEditor,libraryInventory,validateContent,canonical,changeSummary} from '../site/content-model.mjs';
const photo=name=>({type:'image',mediaKind:'photo',src:'assets/'+name+'.jpg'}),film=name=>({type:'video',mediaKind:'video',src:'https://example.com/'+name+'.mp4'}),design=name=>({type:'image',mediaKind:'graphic',src:'assets/'+name+'.png'});
const names=items=>items.map(item=>item.src.split('/').at(-1));
test('batch moves preserve selected order, unselected order, category boundaries and every item',()=>{
 const items=[film('v1'),film('v2'),...['a','b','c','d','e','f'].map(photo),design('g')],original=canonical(items),selected=[items[3].src,items[5].src];
 assert.deepEqual(names(moveMediaSelection(items,selected,'first')),['v1.mp4','v2.mp4','b.jpg','d.jpg','a.jpg','c.jpg','e.jpg','f.jpg','g.png']);
 assert.deepEqual(names(moveMediaSelection(items,selected,'last')),['v1.mp4','v2.mp4','a.jpg','c.jpg','e.jpg','f.jpg','b.jpg','d.jpg','g.png']);
 assert.deepEqual(names(moveMediaSelection(items,selected,'down')),['v1.mp4','v2.mp4','a.jpg','c.jpg','b.jpg','e.jpg','d.jpg','f.jpg','g.png']);
 assert.deepEqual(names(moveMediaSelection(items,[items[3].src,items[4].src],'up')),['v1.mp4','v2.mp4','b.jpg','c.jpg','a.jpg','d.jpg','e.jpg','f.jpg','g.png']);
 assert.deepEqual(names(moveMediaSelection(items,selected,'position',3)),['v1.mp4','v2.mp4','a.jpg','c.jpg','b.jpg','d.jpg','e.jpg','f.jpg','g.png']);
 const mixed=moveMediaSelection(items,[items[1].src,items[3].src,items[8].src],'first');assert.deepEqual(names(mixed).slice(0,3),['v2.mp4','v1.mp4','b.jpg']);assert.equal(new Set(mixed.map(x=>x.src)).size,items.length);assert.equal(canonical(items),original);
 assert.deepEqual(names(moveMediaSelection(items,items.map(m=>m.src),'down')),names(items));
});
const catalogue=()=>[{id:'one',title:'First',images:['assets/shared.jpg','assets/a.jpg'],videos:[],graphics:[],imageInfo:{}},{id:'two',title:'Second',images:['assets/shared.jpg'],videos:[{...film('v1'),poster:'assets/shared.jpg'}],graphics:[],imageInfo:{}}];
test('removal from one project retains the file in the library and leaves other projects intact',()=>{
 const entries=catalogue(),before=canonical(entries),doc=emptyContent();removeProjectMedia(doc,entries[0],['assets/shared.jpg']);validateContent(doc,entries);
 const result=applyContent(entries,doc);assert.deepEqual(result[0].images,['assets/a.jpg']);assert.deepEqual(result[1].images,['assets/shared.jpg']);
 const retained=libraryInventory(entries,doc).find(m=>m.src==='assets/shared.jpg');assert.equal(retained.removed,false);assert.deepEqual(retained.projectIds,['two']);assert.ok(doc.library.items.some(m=>m.src===retained.src));assert.equal(canonical(entries),before);
});
test('library removal hides all shared uses and covers; restoration restores all uses without losing source data',()=>{
 const entries=catalogue(),doc=emptyContent();removeLibraryMedia(doc,[photo('shared')]);validateContent(doc,entries);
 const removed=applyContent(entries,doc);assert.deepEqual(removed[0].images,['assets/a.jpg']);assert.deepEqual(removed[1].images,[]);assert.equal(removed[1].videos[0].poster,undefined);assert.equal(libraryInventory(entries,doc).find(m=>m.src==='assets/shared.jpg').removed,true);
 const reloaded=JSON.parse(JSON.stringify(doc));restoreLibraryMedia(reloaded,['assets/shared.jpg']);assert.deepEqual(applyContent(entries,reloaded).map(p=>p.images),entries.map(p=>p.images));assert.equal(applyContent(entries,reloaded)[1].videos[0].poster,'assets/shared.jpg');
 assert.ok(changeSummary(emptyContent(),doc,entries).some(copy=>copy.includes('原檔保留')));
});
test('project-only removal clears that project cover references while preserving covers in other projects',()=>{
 const entries=catalogue();entries[0].videos=[{...film('local'),poster:'assets/shared.jpg'}];const doc=emptyContent();removeProjectMedia(doc,entries[0],['assets/shared.jpg']);
 const result=applyContent(entries,doc);assert.equal(result[0].videos[0].poster,undefined);assert.equal(result[1].videos[0].poster,'assets/shared.jpg');assert.equal(entries[0].videos[0].poster,'assets/shared.jpg');
});
test('new linked media stays in the reusable library after being removed from its only project',()=>{
 const entries=catalogue(),doc=emptyContent(),added=photo('new');doc.overrides.one={media:[...mediaForEditor(entries[0]),added]};rememberLibrary(doc,[added]);
 removeProjectMedia(doc,editableEntries(entries,doc)[0],[added.src]);const saved=JSON.parse(JSON.stringify(doc));validateContent(saved,entries);
 const retained=libraryInventory(entries,saved).find(m=>m.src===added.src);assert.ok(retained);assert.deepEqual(retained.projectIds,[]);assert.equal(retained.removed,false);
});
test('library import validation rejects unsafe URLs, duplicate removal entries and arbitrary fields',()=>{
 const entries=catalogue();for(const library of [{items:[],removed:['javascript:alert(1)']},{items:[],removed:['assets/a.jpg','assets/a.jpg']},{items:[],removed:[],deleteOriginals:true}])assert.throws(()=>validateContent({...emptyContent(),library},entries));
});
test('long press selects once, suppresses the following click and cancels when scrolling or releasing early',()=>{
 let callback=null,selected=0,time=1000;const gesture=createLongPress({onSelect:()=>selected++,schedule:fn=>(callback=fn,1),cancel:()=>callback=null,now:()=>time});
 gesture.start({clientX:20,clientY:30,button:0});callback();assert.equal(selected,1);assert.equal(gesture.suppressClick(),true);gesture.cancel();time+=1000;assert.equal(gesture.suppressClick(),false);
 gesture.start({clientX:20,clientY:30,button:0});gesture.move({clientX:20,clientY:48});assert.equal(callback,null);
 gesture.start({clientX:20,clientY:30,button:0});gesture.cancel();assert.equal(callback,null);assert.equal(selected,1);
});
