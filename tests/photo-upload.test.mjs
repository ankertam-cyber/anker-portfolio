import test from 'node:test';
import assert from 'node:assert/strict';
import {photoFileKind,preparePhotoUpload,previewUploadedEntries,MAX_PHOTO_BYTES} from '../site/photo-upload.mjs';
import {uploadedMediaUrl,uploadedRepoPath,uploadedDeletionPaths} from '../site/upload-paths.mjs';
import {emptyContent,clone,validateContent,canonical} from '../site/content-model.mjs';
import {permanentlyRemoveMedia} from '../site/media-purge.mjs';
import {createGitHubPublisher,encodeContent,encodeBinaryContent,decodeContent} from '../site/github-publisher.mjs';
const path='media-uploads/owner-photo-project/photo-fixture.jpg',preview='media-uploads/owner-photo-project/photo-fixture-preview.jpg',source=uploadedMediaUrl(path),thumbnail=uploadedMediaUrl(preview);
const bytes=Uint8Array.from([255,216,255,224,0,4,65,66,255,217]);
function upload(){return {src:source,path,thumbnailPath:preview,name:'Photo.jpg',blob:new Blob([bytes],{type:'image/jpeg'}),thumbnailBlob:new Blob([bytes],{type:'image/jpeg'})};}
function content(){const doc=emptyContent();doc.additions=[{id:'owner-photo-project',title:'New project',cinema:'c1',media:[{type:'image',mediaKind:'photo',src:source,thumbnail,width:6000,height:4000}],hidden:false}];return doc;}
test('managed upload URLs cannot escape this repository or upload folder',()=>{
 assert.equal(uploadedRepoPath(source),path);for(const src of [source+'?private=1',source.replace('raw.githubusercontent.com','raw.githubusercontent.com.evil.test'),source.replace('/main/','/other/'),source.replace('media-uploads/','site/'),source.replace('photo-fixture.jpg','../secret.txt')])assert.equal(uploadedRepoPath(src),null);assert.throws(()=>uploadedMediaUrl('../config'),/路徑/);
});
test('photo staging retains original bytes and full dimensions while creating a separate thumbnail',async()=>{
 const file=upload().blob;Object.defineProperty(file,'name',{value:'My photo.jpg'});const thumb=new Blob(['preview']);const record=await preparePhotoUpload(file,'owner-photo-project',{id:()=> 'photo-fixture',decode:async original=>{assert.equal(original,file);return {width:6000,height:4000,thumbnail:thumb};}});
 assert.equal(record.blob,file);assert.equal(record.thumbnailBlob,thumb);assert.equal(record.media.width,6000);assert.equal(record.media.height,4000);assert.equal(record.src,source);assert.equal(record.media.thumbnail,thumbnail);assert.equal(record.bytes,file.size);validateContent({...emptyContent(),library:{items:[record.media],removed:[]}});
});
test('unsafe formats, empty and oversized files fail before any upload',async()=>{
 assert.throws(()=>photoFileKind(new TextEncoder().encode('<svg onload=bad>')),/JPEG/);assert.equal(photoFileKind(Uint8Array.from([137,80,78,71,13,10,26,10])).ext,'png');
 await assert.rejects(()=>preparePhotoUpload({size:MAX_PHOTO_BYTES+1},'project'),/25 MB/);await assert.rejects(()=>preparePhotoUpload(new Blob([]),'project'),/25 MB/);await assert.rejects(()=>preparePhotoUpload(upload().blob,'../escape'),/Project/);
});
test('draft previews display local images without persisting blob URLs in website content',()=>{
 const original=[{id:'one',images:[source],graphics:[],videos:[{type:'video',src:'https://example.test/film.mp4',poster:thumbnail}],imageInfo:{[source]:{thumbnail,width:6000,height:4000}}}],before=JSON.stringify(original),result=previewUploadedEntries(original,src=>src===source?'blob:original':src===thumbnail?'blob:preview':src);
 assert.equal(result[0].images[0],'blob:original');assert.equal(result[0].imageInfo['blob:original'].thumbnail,'blob:preview');assert.equal(result[0].videos[0].poster,'blob:preview');assert.equal(JSON.stringify(original),before);
});
test('binary encoding preserves image bytes rather than decoding them as UTF-8',async()=>{
 assert.deepEqual(Buffer.from(await encodeBinaryContent(upload().blob),'base64'),Buffer.from(bytes));
});
function github({failBlob=false,conflict=false,missing=false}={}){
 let doc=emptyContent(),fileSha='original-content',blob=0;const calls=[],blobs=new Map();
 const ok=data=>({ok:true,status:200,json:async()=>data});
 const request=async(url,options={})=>{const route=url.replace('https://api.github.com/repos/ankertam-cyber/anker-portfolio','');calls.push({route,options});
  if(route==='')return ok({full_name:'ankertam-cyber/anker-portfolio',permissions:{push:true}});
  if(route.startsWith('/contents/'))return ok({sha:fileSha,encoding:'base64',content:encodeContent(JSON.stringify(doc))});
  if(route==='/git/ref/heads/main')return ok({object:{sha:'latest-head'}});
  if(route==='/git/commits/latest-head')return ok({tree:{sha:'latest-tree'}});
  if(route==='/git/trees/latest-tree?recursive=1')return ok({tree:[{path:'site/content.json',sha:missing?'someone-else':fileSha},{path:'unrelated-code.mjs',sha:'untouched'}]});
  if(route==='/git/blobs'){if(failBlob)return {ok:false,status:503};const body=JSON.parse(options.body),sha='blob-'+(++blob);blobs.set(sha,body);return ok({sha});}
  if(route==='/git/trees')return ok({sha:'new-tree'});
  if(route==='/git/commits')return ok({sha:'reviewed-commit'});
  if(route==='/git/refs/heads/main'){if(conflict)return {ok:false,status:422};const treeCall=calls.find(call=>call.route==='/git/trees'),entry=JSON.parse(treeCall.options.body).tree.find(item=>item.path==='site/content.json');fileSha=entry.sha;doc=JSON.parse(blobs.get(fileSha).content);return ok({object:{sha:'reviewed-commit'}});}
  throw Error('Unexpected request '+route);
 };return {request,calls,blobs,get doc(){return doc;}};
}
test('projects and all selected photo files publish together in one commit based on the latest code tree',async()=>{
 const fake=github(),publisher=createGitHubPublisher({request:fake.request}),before=emptyContent(),after=content(),progress=[];await publisher.connect('fixture-token',before);const result=await publisher.publish(after,before,{uploads:[upload()],onProgress:event=>progress.push(event)});
 assert.deepEqual(fake.doc,after);assert.deepEqual(result.uploadedSources,[source]);assert.equal(fake.calls.filter(call=>call.route==='/git/refs/heads/main').length,1);assert.equal(fake.calls.filter(call=>call.options.method==='PUT').length,0);
 const tree=JSON.parse(fake.calls.find(call=>call.route==='/git/trees').options.body);assert.equal(tree.base_tree,'latest-tree');assert.deepEqual(tree.tree.map(item=>item.path),[path,preview,'site/content.json']);const commit=JSON.parse(fake.calls.find(call=>call.route==='/git/commits').options.body);assert.deepEqual(commit.parents,['latest-head']);assert.equal(progress.at(-1).completed,2);assert.equal(fake.blobs.get('blob-1').encoding,'base64');assert.deepEqual(Buffer.from(fake.blobs.get('blob-1').content,'base64'),Buffer.from(bytes));assert.ok(!JSON.stringify(fake.doc).includes('fixture-token'));
});
test('failed photo uploads never advance the branch or partially publish a project',async()=>{
 const fake=github({failBlob:true}),publisher=createGitHubPublisher({request:fake.request}),base=emptyContent(),after=content(),saved=canonical(after);await publisher.connect('fixture-token',base);await assert.rejects(()=>publisher.publish(after,base,{uploads:[upload()]}),/未完成/);assert.equal(fake.calls.filter(call=>call.route==='/git/refs/heads/main').length,0);assert.deepEqual(fake.doc,base);assert.equal(canonical(after),saved);
});
test('a concurrent GitHub change is rejected without forcing a branch update',async()=>{
 const fake=github({conflict:true}),publisher=createGitHubPublisher({request:fake.request}),base=emptyContent();await publisher.connect('fixture-token',base);await assert.rejects(()=>publisher.publish(content(),base,{uploads:[upload()]}),/其他更新/);const patch=fake.calls.find(call=>call.route==='/git/refs/heads/main');assert.equal(JSON.parse(patch.options.body).force,false);assert.deepEqual(fake.doc,base);
});
test('a draft imported on another device cannot publish missing photo bytes',async()=>{
 const fake=github(),publisher=createGitHubPublisher({request:fake.request}),base=emptyContent();await publisher.connect('fixture-token',base);await assert.rejects(()=>publisher.publish(content(),base),/未有原檔/);assert.equal(fake.calls.filter(call=>call.options.method==='POST').length,0);
});
test('permanent deletion removes an owned upload and its unused preview while protecting shared previews',()=>{
 const before=content(),after=permanentlyRemoveMedia(before,[source]);assert.deepEqual(uploadedDeletionPaths(before,after),[path,preview]);
 const shared=clone(before);shared.additions[0].media.push({type:'image',mediaKind:'photo',src:'https://example.test/keep.jpg',thumbnail});assert.deepEqual(uploadedDeletionPaths(shared,permanentlyRemoveMedia(shared,[source])),[path]);
});
