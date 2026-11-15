import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findPhotoDuplicates,similarPhotos,hashDistance,duplicateRemovalItems,recommendedDuplicateSources} from '../site/photo-duplicates.mjs';
import {createPhotoFingerprintReader,fingerprintPixels} from '../site/photo-fingerprints.mjs';
import {emptyContent,editableEntries,mediaForEditor} from '../site/content-model.mjs';
import {removeProjectMedia,removeLibraryMedia} from '../site/media-actions.mjs';
const fingerprint=(overrides={})=>({p:'123456789abcdef0',d:'0fedcba987654321',width:2000,height:1500,detail:40,color:Array(27).fill(120),bytes:100000,...overrides});
const item=(src,overrides={})=>({type:'image',mediaKind:'photo',src,fingerprint:fingerprint(overrides)});
test('different names with identical file or full-pixel hashes are exact duplicates',()=>{
 const result=findPhotoDuplicates([item('assets/a.jpg',{sha256:'a'.repeat(64)}),item('assets/renamed.jpg',{sha256:'a'.repeat(64),pixels:'b'.repeat(64)}),item('assets/metadata-change.png',{pixels:'b'.repeat(64)})]);
 assert.equal(result.exact.length,1);assert.equal(result.exact[0].items.length,3);assert.equal(recommendedDuplicateSources(result.exact).size,2);
});
test('the recommendation preserves the highest resolution, then quality size, then original order',()=>{
 const result=findPhotoDuplicates([item('assets/small.jpg',{sha256:'a'.repeat(64),width:800,height:600}),item('assets/master.jpg',{sha256:'a'.repeat(64),width:4000,height:3000}),item('assets/master-copy.jpg',{sha256:'a'.repeat(64),width:4000,height:3000})]);
 assert.equal(result.exact[0].keep,'assets/master.jpg');assert.ok(!recommendedDuplicateSources(result.exact).has('assets/master.jpg'));
});
test('resized and recompressed matches remain review-only and cannot become bulk recommendations',()=>{
 const a=item('assets/original.jpg'),b=item('assets/recompressed.jpg',{width:1000,height:750,p:'123456789abcdef1'}),result=findPhotoDuplicates([a,b]);
 assert.equal(result.exact.length,0);assert.equal(result.similar.length,1);assert.equal(recommendedDuplicateSources(result.similar).size,0);
});
test('flat images, different colour/layout, aspect ratios and missing metadata cannot masquerade as matches',()=>{
 const base=fingerprint();for(const patch of [{detail:0},{detail:undefined},{width:1000,height:1000},{color:Array(27).fill(180)},{p:'ffffffffffffffff'},{d:'ffffffffffffffff'}])assert.equal(similarPhotos(base,fingerprint(patch)),false);
 assert.equal(hashDistance('0000000000000000','000000000000000f'),4);assert.equal(hashDistance('invalid','0000000000000000'),64);
});
test('lookalike chains cannot merge images that fail direct comparison',()=>{
 const result=findPhotoDuplicates([item('assets/a.jpg',{p:'0000000000000000'}),item('assets/b.jpg',{p:'000000000000003f'}),item('assets/c.jpg',{p:'0000000000000fff'})]);
 assert.equal(result.similar.length,1);assert.equal(result.similar[0].items.length,2);
});
test('video, animated media, design images and repeated references are excluded',()=>{
 const base=item('assets/photo.jpg',{sha256:'a'.repeat(64)});const result=findPhotoDuplicates([base,base,{...base,src:'assets/design.jpg',mediaKind:'graphic'},{...base,src:'assets/render.jpg',mediaKind:'design'},{...base,src:'assets/movie.mp4',type:'video'},{...base,src:'assets/motion.gif'},{...base,src:'assets/animated.jpg',animated:true}]);
 assert.equal(result.compared,1);assert.equal(result.exact.length,0);
});
test('removal plans reject unknown sources and always protect a retained photo in every group',()=>{
 const groups=findPhotoDuplicates([item('assets/a.jpg',{sha256:'a'.repeat(64)}),item('assets/b.jpg',{sha256:'a'.repeat(64)})]).exact,keepers=new Map([[groups[0].id,'assets/b.jpg']]);
 assert.throws(()=>duplicateRemovalItems(groups,keepers,new Set(['assets/b.jpg'])),/保留/);assert.throws(()=>duplicateRemovalItems(groups,keepers,new Set(['assets/unknown.jpg'])));
 assert.deepEqual(duplicateRemovalItems(groups,keepers,new Set(['assets/a.jpg'])).map(i=>i.src),['assets/a.jpg']);
});
test('confirmed deduplication keeps project order, other projects and originals; library removal stays recoverable',()=>{
 const a=item('assets/a.jpg',{sha256:'a'.repeat(64)}),b=item('assets/b.jpg',{sha256:'a'.repeat(64)}),c=item('assets/c.jpg',{p:'ffffffffffffffff'}),groups=findPhotoDuplicates([a,b,c]).exact;
 const selected=duplicateRemovalItems(groups,new Map(),recommendedDuplicateSources(groups));const base=[{id:'first',images:[a.src,b.src,c.src],videos:[],graphics:[],imageInfo:{}},{id:'second',images:[b.src],videos:[],graphics:[],imageInfo:{}}],before=JSON.stringify(base),doc=emptyContent();
 removeProjectMedia(doc,base[0],selected.map(i=>i.src));const edited=editableEntries(base,doc);assert.deepEqual(mediaForEditor(edited[0]).map(i=>i.src),[a.src,c.src]);assert.deepEqual(edited[1].images,[b.src]);assert.equal(doc.library.items[0].src,b.src);assert.equal(JSON.stringify(base),before);
 removeLibraryMedia(doc,selected);assert.ok(doc.library.removed.includes(b.src));assert.ok(doc.library.items.some(i=>i.src===b.src));
});
test('the fingerprint index covers catalogue images and matches the source package checksums',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('../site/image-fingerprints.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../asset-checksums.json',import.meta.url))),files=new Map(manifest.files.map(f=>[f.path,f]));
 for(const [src,record]of Object.entries(index.records)){assert.equal(record.sha256,files.get('site/'+src)?.sha256,src);assert.equal(record.bytes,files.get('site/'+src)?.size,src);}
});
test('known photos share one index request and do not download original files',async()=>{
 let requests=0;const expected=fingerprint({sha256:'a'.repeat(64)}),read=createPhotoFingerprintReader({site:new URL('https://example.test/portfolio/'),document:{createElement(){throw Error('Original should not load');}},request:async()=>{requests++;return{ok:true,json:async()=>({version:1,algorithm:'photo-content-v1',records:{'assets/a.jpg':expected}})};}});
 await read.prepare();const results=await Promise.all([read(item('assets/a.jpg')),read(item('https://example.test/portfolio/assets/a.jpg'))]);assert.equal(requests,1);assert.deepEqual(results,[expected,expected]);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>read(item('assets/a.jpg'),{signal:controller.signal}),{name:'AbortError'});
});
test('a failed index can retry and flat pixel data remains low-confidence',async()=>{
 let attempt=0;const read=createPhotoFingerprintReader({site:new URL('https://example.test/'),request:async()=>({ok:++attempt>1,json:async()=>({version:1,algorithm:'photo-content-v1',records:{}})})});await assert.rejects(()=>read.prepare());await read.prepare();assert.equal(attempt,2);
 assert.equal(fingerprintPixels(Array(1024).fill(80)).detail,0);
});
