import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {emptyContent,clone,canonical,validateContent,editableEntries,libraryInventory} from '../site/content-model.mjs';
import {permanentlyRemoveMedia,assertNoDeletedMediaRestore} from '../site/media-purge.mjs';
import {restoreOwnerDraft} from '../site/admin-draft-state.mjs';
import {NATIVE_VIDEO_FILES} from '../site/native-video-files.mjs';
import {planMediaPurge} from '../scripts/media-purge-plan.mjs';
import {removeContainedFile} from '../scripts/load-media-purge.mjs';
import {deleteArchivedFilms,removeObsoleteMediaCaches} from '../scripts/complete-media-purge.mjs';
const photo=src=>({type:'image',mediaKind:'photo',src}),entries=[{id:'one',title:'First',images:['assets/a.jpg','assets/b.jpg'],graphics:[],videos:[],imageInfo:{}},{id:'two',title:'Second',images:['assets/a.jpg'],graphics:[],videos:[],imageInfo:{}}];
test('permanent deletion removes reusable records, recycled entries and all project uses',()=>{
 const original=emptyContent();original.library={items:[photo('assets/a.jpg'),photo('assets/b.jpg')],removed:['assets/a.jpg']};original.overrides.one={description:'Keep this text',media:[photo('assets/a.jpg'),{...photo('assets/b.jpg'),thumbnail:'assets/a.jpg'}]};
 const before=JSON.stringify(original),next=permanentlyRemoveMedia(original,['assets/a.jpg']);validateContent(next,entries);
 assert.equal(JSON.stringify(original),before);assert.equal(next.overrides.one.description,'Keep this text');assert.deepEqual(next.library.items,[photo('assets/b.jpg')]);assert.deepEqual(next.library.removed,[]);assert.deepEqual(next.library.purged,['assets/a.jpg']);assert.equal(next.overrides.one.media[0].thumbnail,undefined);
 assert.deepEqual(editableEntries(entries,next).map(p=>p.images),[['assets/b.jpg'],[]]);assert.ok(!libraryInventory(entries,next).some(item=>item.src==='assets/a.jpg'));
});
test('a deletion transaction publishes only the removal while retaining other local text and order',()=>{
 const published=emptyContent(),local=clone(published);local.profile.aboutIntro='Not approved yet';local.order=['two','one'];local.overrides.one={description:'Unsaved copy'};
 const commit=permanentlyRemoveMedia(published,['assets/a.jpg']),remaining=permanentlyRemoveMedia(local,['assets/a.jpg']);assert.deepEqual(commit.profile,{});assert.deepEqual(commit.order,[]);assert.equal(remaining.profile.aboutIntro,local.profile.aboutIntro);assert.deepEqual(remaining.order,local.order);assert.deepEqual(remaining.overrides,local.overrides);
 const restored=restoreOwnerDraft({baseline:canonical(published),draft:local},commit,entries);assert.equal(restored.state,'purged');assert.equal(restored.draft.profile.aboutIntro,local.profile.aboutIntro);assert.ok(!libraryInventory(entries,restored.draft).some(item=>item.src==='assets/a.jpg'));
});
test('old drafts cannot remove deletion markers and native source aliases cannot restore a film',()=>{
 const [source,name]=NATIVE_VIDEO_FILES[0],url='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/'+name,next=permanentlyRemoveMedia(emptyContent(),[url]);
 assert.deepEqual(new Set(next.library.purged),new Set([source,url]));assert.throws(()=>assertNoDeletedMediaRestore(next,emptyContent()),/唔可以/);assert.doesNotThrow(()=>assertNoDeletedMediaRestore(next,permanentlyRemoveMedia(next,['assets/a.jpg'])));
 for(const purged of [['javascript:bad'],['assets/a.jpg','assets/a.jpg'],'bad'])assert.throws(()=>validateContent({...emptyContent(),library:{items:[],removed:[],purged}},entries));
});
function fixture(){
 const film={path:'assets/imported/master.mp4',archiveName:'master.mp4',bytes:10,sha256:'a'.repeat(64),localParts:[{path:'media-sources/master.part-00'}]},other={path:'assets/imported/other.mp4',archiveName:'other.mp4',bytes:11,sha256:'b'.repeat(64)};
 const catalogue={entries:[{id:'one',title:'First',images:['assets/photo.jpg','assets/keep.jpg'],graphics:[],videos:[{type:'video',src:film.path,poster:'assets/shared.jpg'},{type:'video',src:other.path,poster:'assets/shared.jpg'}],imageInfo:{'assets/photo.jpg':{thumbnail:'assets/thumb.jpg'},'assets/keep.jpg':{thumbnail:'assets/thumb.jpg'}}}]};
 const content=permanentlyRemoveMedia(emptyContent(),['assets/photo.jpg','https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/master.mp4']);
 return {content,catalogue,manifest:{videos:[film,other]},checksums:{files:[{path:'site/assets/photo.jpg',size:20},{path:'media-sources/master.part-00',size:10}]}};
}
test('storage planning excludes the deleted master, source segments, playback and cached copies',()=>{
 const data=fixture(),plan=planMediaPurge(data);assert.deepEqual(plan.activeManifest.videos.map(v=>v.archiveName),['other.mp4']);
 assert.ok(plan.files.includes('assets/web-video-v1/master.mp4'));assert.ok(plan.seeds.includes('media-sources/master.part-00'));assert.ok(plan.cacheFiles.includes('web-v1/master.mp4.json'));assert.equal(plan.sourceBytes,30);
 assert.deepEqual(plan.catalogue.entries[0].images,['assets/keep.jpg']);assert.equal(plan.catalogue.entries[0].videos.length,1);assert.ok(!Object.keys(plan.catalogue.entries[0].imageInfo).includes('assets/photo.jpg'));
 assert.ok(!plan.files.includes('assets/shared.jpg'));assert.ok(!plan.files.includes('assets/thumb.jpg'));
});
test('a deployment with no confirmed permanent deletions preserves the complete catalogue exactly',()=>{
 const data=fixture();data.content=emptyContent();data.catalogue.entries[0].images.push('assets/render.jpg');data.catalogue.entries[0].imageInfo['assets/render.jpg']={mediaKind:'rendering',width:2000,height:1000};
 const plan=planMediaPurge(data);assert.deepEqual(plan.catalogue,data.catalogue);assert.deepEqual(plan.files,[]);assert.deepEqual(plan.films,[]);assert.deepEqual(plan.activeManifest,data.manifest);
});
test('unshared thumbnails are removed while unrelated application files remain protected',()=>{
 const data=fixture();data.catalogue.entries[0].imageInfo['assets/keep.jpg']={};data.content.library.purged.push('assets/fonts/app.ttf');data.checksums.files.push({path:'site/assets/fonts/app.ttf',size:1000});
 const plan=planMediaPurge(data);assert.ok(plan.files.includes('assets/thumb.jpg'));assert.ok(!plan.files.includes('assets/fonts/app.ttf'));
});
test('actual file cleanup removes bytes, is idempotent, and cannot escape its managed directory',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'portfolio-purge-test-'));await fs.mkdir(path.join(root,'assets'));await fs.writeFile(path.join(root,'assets/film.mp4'),'disposable test video');
 assert.equal(await removeContainedFile(root,'assets/film.mp4'),21);await assert.rejects(()=>fs.access(path.join(root,'assets/film.mp4')));assert.equal(await removeContainedFile(root,'assets/film.mp4'),0);
 for(const file of ['../outside','assets/../../outside','assets\\film.mp4','/outside'])await assert.rejects(()=>removeContainedFile(root,file),/Unsafe|outside/);
 await assert.rejects(()=>removeContainedFile(root,'assets'),/regular/);await fs.rmdir(path.join(root,'assets'));await fs.rmdir(root);
});
function fakeArchive({denied=false,mismatch=false,pages=false}={}){
 const calls=[];return {calls,request:async(url,options)=>{calls.push({url,options});if(denied)return {ok:false,status:403};if(options.method==='DELETE')return {ok:true,status:204,json:()=>{throw Error('204 has no JSON');}};
 const data=url.includes('/tags/')?{id:123}:pages&&url.endsWith('page=1')?Array.from({length:100},(_,i)=>({id:i,name:'unrelated-'+i,size:1})):[{id:7,name:'master.mp4',size:mismatch?999:10,digest:'sha256:'+'a'.repeat(64)},{id:8,name:'keep.mp4',size:99}];return {ok:true,status:200,json:async()=>data};}};
}
test('confirmed release storage is actually deleted, accepts 204, and never deletes other assets',async()=>{
 const fake=fakeArchive(),film=fixture().manifest.videos[0],result=await deleteArchivedFilms([film],{request:fake.request,token:'test-only'});assert.equal(result.bytes,10);assert.deepEqual(result.deleted,['master.mp4']);const deletes=fake.calls.filter(c=>c.options.method==='DELETE');assert.equal(deletes.length,1);assert.ok(deletes[0].url.endsWith('/releases/assets/7'));
});
test('missing files are idempotent; no token, a different file or denied access never reports success',async()=>{
 const film=fixture().manifest.videos[0];await assert.rejects(()=>deleteArchivedFilms([film]),/授權/);const denied=fakeArchive({denied:true});await assert.rejects(()=>deleteArchivedFilms([film],{request:denied.request,token:'test-only'}),/incomplete/);
 const changed=fakeArchive({mismatch:true});await assert.rejects(()=>deleteArchivedFilms([film],{request:changed.request,token:'test-only'}),/differs/);assert.equal(changed.calls.filter(c=>c.options.method==='DELETE').length,0);
 assert.deepEqual((await deleteArchivedFilms([film],{token:'test-only',request:async()=>({ok:false,status:404})})).deleted,['master.mp4']);
 const paged=fakeArchive({pages:true});await deleteArchivedFilms([film],{request:paged.request,token:'test-only'});assert.ok(paged.calls.some(c=>c.url.endsWith('page=2')));
});
test('obsolete media cache archives are physically removed while the current cache and other jobs are preserved',async()=>{
 const calls=[],currentKey='Linux-portfolio-web-v1-current',request=async(url,options)=>{calls.push({url,options});return options.method==='DELETE'?{ok:true,status:204}:{ok:true,json:async()=>({actions_caches:[{id:1,key:'Linux-portfolio-web-v1-old',ref:'refs/heads/main',size_in_bytes:123},{id:2,key:currentKey,ref:'refs/heads/main'},{id:3,key:'other-job',ref:'refs/heads/main'}]})};};
 assert.equal(await removeObsoleteMediaCaches({request,token:'test-only',currentKey}),123);assert.deepEqual(calls.filter(c=>c.options.method==='DELETE').map(c=>c.url.split('/').at(-1)),['1']);
});
