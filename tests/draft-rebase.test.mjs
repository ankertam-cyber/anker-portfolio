import test from 'node:test';
import assert from 'node:assert/strict';
import {rebaseLibraryCleanup} from '../site/draft-rebase.mjs';
import {emptyContent,clone,canonical,editableEntries,mediaForEditor} from '../site/content-model.mjs';
const entries=[{id:'project-a',title:'A',images:['assets/high.jpg','assets/low.jpg'],graphics:[],videos:[],imageInfo:{}},{id:'project-b',title:'B',images:['assets/other.jpg'],graphics:[],videos:[],imageInfo:{}}];
function cleanup(base=emptyContent()){const remote=clone(base);remote.library??={items:[],removed:[]};remote.library.items.push({type:'image',mediaKind:'photo',src:'assets/low.jpg'});remote.library.removed.push('assets/low.jpg');remote.revision='cleanup-version';remote.updatedAt='2026-11-15T00:00:00Z';return remote;}
test('confirmed duplicate cleanup preserves unsaved text, order and other local edits',()=>{
 const base=emptyContent(),remote=cleanup(base),local=clone(base);local.profile.aboutIntro='My unsaved text';local.order=['project-b','project-a'];local.overrides['project-a']={description:'Unsaved description',media:[{type:'image',mediaKind:'photo',src:'assets/low.jpg'},{type:'image',mediaKind:'photo',src:'assets/high.jpg'}]};
 const before=JSON.stringify(local),merged=rebaseLibraryCleanup(canonical(base),remote,local,entries);assert.ok(merged);assert.equal(merged.profile.aboutIntro,local.profile.aboutIntro);assert.deepEqual(merged.order,local.order);assert.deepEqual(merged.overrides,local.overrides);assert.equal(merged.revision,remote.revision);assert.equal(JSON.stringify(local),before);
 assert.deepEqual(mediaForEditor(editableEntries(entries,merged).find(p=>p.id==='project-a')).map(item=>item.src),['assets/high.jpg']);
});
test('an unchanged local draft becomes exactly the new published cleanup',()=>{
 const base=emptyContent(),remote=cleanup(base),merged=rebaseLibraryCleanup(base,remote,base,entries);assert.equal(canonical(merged),canonical(remote));
});
test('local library labels and other removals survive an additive cleanup',()=>{
 const base=emptyContent(),local=clone(base);local.library={items:[{type:'image',mediaKind:'photo',src:'assets/low.jpg',label:'My custom label'}],removed:['assets/other.jpg']};const merged=rebaseLibraryCleanup(base,cleanup(base),local,entries);assert.equal(merged.library.items[0].label,'My custom label');assert.deepEqual(new Set(merged.library.removed),new Set(['assets/low.jpg','assets/other.jpg']));
});
test('an unrelated local restore is preserved while the new confirmed cleanup is applied',()=>{
 const base=emptyContent();base.library={items:[{type:'image',mediaKind:'photo',src:'assets/other.jpg'}],removed:['assets/other.jpg']};const local=clone(base);local.library.removed=[];
 const merged=rebaseLibraryCleanup(base,cleanup(base),local,entries);assert.deepEqual(merged.library.removed,['assets/low.jpg']);
});
test('unrelated remote text, ordering, media edits and restores require the existing stale-draft review',()=>{
 const base=emptyContent();for(const patch of [{profile:{name:'Remote name'}},{order:['project-b','project-a']},{overrides:{'project-a':{description:'Remote edit'}}}]){const remote={...cleanup(base),...patch};assert.equal(rebaseLibraryCleanup(base,remote,base,entries),null);}
 const removed=cleanup(base),restored=clone(removed);restored.library.removed=[];assert.equal(rebaseLibraryCleanup(removed,restored,removed,entries),null);
 const edited=cleanup(removed);edited.library.items[0].label='Remote changed label';assert.equal(rebaseLibraryCleanup(removed,edited,removed,entries),null);
});
test('invalid saved baselines and unrelated new library records never silently merge',()=>{
 const base=emptyContent(),remote=cleanup(base);assert.equal(rebaseLibraryCleanup('not json',remote,base,entries),null);remote.library.items.push({type:'image',mediaKind:'photo',src:'assets/unrelated.jpg'});assert.equal(rebaseLibraryCleanup(base,remote,base,entries),null);
});
