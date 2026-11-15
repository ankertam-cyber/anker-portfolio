import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyContent,applyContent,editableEntries,validateContent,mediaForEditor,normalizeStory,normalizeVimeoInput,canonical} from '../site/content-model.mjs';
import {projectStoryFor} from '../site/project-stories.mjs';
import {createGitHubPublisher,encodeContent,decodeContent} from '../site/github-publisher.mjs';

const catalogue=()=>[{id:'first',title:'First',cinema:'c1',publicationStatus:'published',images:['assets/photo-a.jpg','assets/photo-b.jpg'],videos:[{type:'video',src:'https://example.com/film-a.mp4'},{type:'video',src:'https://example.com/film-b.mp4'}],graphics:['assets/design.png'],imageInfo:{}},{id:'second',title:'Second',cinema:'c2',publicationStatus:'published',images:[],videos:[],graphics:[],imageInfo:{}}];
test('empty owner content preserves V29.1 and edits do not mutate original catalogue',()=>{
 const base=catalogue(),before=canonical(base),doc=emptyContent();assert.deepEqual(applyContent(base,doc),base);
 doc.overrides.first={title:'New title',description:'廣東話內容',hidden:true};doc.order=['second','first'];
 assert.deepEqual(applyContent(base,doc).map(p=>p.id),['second']);assert.equal(editableEntries(base,doc)[1].title,'New title');assert.equal(canonical(base),before);
 delete doc.overrides.first;assert.equal(editableEntries(base,doc)[1].title,'First');
});
test('media reordering/removal changes cinema and gallery together while retaining the originals',()=>{
 const base=catalogue(),doc=emptyContent(),media=mediaForEditor(base[0]);
 [media[0],media[1]]=[media[1],media[0]];media.splice(2,1);doc.overrides.first={media};
 const changed=applyContent(base,doc)[0];assert.deepEqual(mediaForEditor(changed).map(m=>m.src),media.map(m=>m.src));assert.equal(base[0].images.length,2);assert.equal(changed.images.length,1);
 assert.throws(()=>validateContent({...doc,overrides:{first:{media:[media.at(-1),media[0]]}}},base),/素材次序/);
});
test('new projects and story edits render through the same public content model',()=>{
 const doc=emptyContent();doc.additions.push({id:'owner-test-project',title:'New work',cinema:'c2',description:'New description',media:[],hidden:false});doc.order=['owner-test-project','first','second'];
 const result=applyContent(catalogue(),doc);assert.equal(result[0].title,'New work');assert.deepEqual(result[0].images,[]);
 const story=normalizeStory({id:'evidence-id',title:'Original',intro:'Edited copy',evidence:'Private source',stage:'executed',spotlight:true});doc.overrides.first={story};validateContent(doc,catalogue());assert.equal(projectStoryFor('first',applyContent(catalogue(),doc)[1]).intro,'Edited copy');doc.overrides.first.story=null;assert.equal(projectStoryFor('first',applyContent(catalogue(),doc)[1]),null);
});
test('invalid or hostile imports cannot publish and at least one visible project is required',()=>{
 const base=catalogue();
 for(const patch of [{title:''},{title:'Bad '+String.fromCodePoint(0x1f600)},{media:[{type:'image',src:'javascript:alert(1)'}]},{media:[{type:'image',src:'assets/%2e%2e/secret'}]},{media:[{type:'vimeo',src:'https://evil.test/video/123'}]},{media:[{type:'video',src:'https://example.com/share'}]}])assert.throws(()=>validateContent({...emptyContent(),overrides:{first:patch}},base));
 assert.throws(()=>validateContent(JSON.parse('{"version":1,"profile":{},"order":[],"overrides":{"__proto__":{}},"additions":[]}'),base));
 assert.throws(()=>validateContent({...emptyContent(),token:'never allowed'},base));
 assert.throws(()=>validateContent({...emptyContent(),order:['first','first']},base));
 assert.throws(()=>applyContent(base,{...emptyContent(),overrides:{first:{hidden:true},second:{hidden:true}}}),/至少/);
 assert.equal(normalizeVimeoInput('https://vimeo.com/123456/secret'),'https://player.vimeo.com/video/123456?h=secret');
});
function fakeGitHub({conflict=false,failure=false}={}){
 const calls=[];let reads=0,doc=emptyContent();
 const request=async(url,options)=>{calls.push({url,options});if(failure)return {ok:false,status:401};
  if(!url.includes('/contents/'))return {ok:true,json:async()=>({full_name:'ankertam-cyber/anker-portfolio',permissions:{push:true}})};
  if(options.method==='PUT'){doc=JSON.parse(decodeContent(JSON.parse(options.body).content));return {ok:true,json:async()=>({content:{sha:'next-file-sha'},commit:{sha:'commit-sha'}})};}
  reads++;return {ok:true,json:async()=>({encoding:'base64',sha:conflict&&reads>1?'changed-by-someone-else':'original-file-sha',content:encodeContent(JSON.stringify(doc))})};
 };return {request,calls,get doc(){return doc;}};
}
test('publisher writes only the reviewed UTF-8 content file with an expected SHA',async()=>{
 const fake=fakeGitHub(),publisher=createGitHubPublisher({request:fake.request}),base=emptyContent();await publisher.connect('fixture-session-token',base);
 const next={...emptyContent(),profile:{aboutIntro:'我嘅作品與設計。'},revision:'reviewed-version'};const result=await publisher.publish(next,base);assert.equal(result.sha,'commit-sha');assert.deepEqual(fake.doc,next);
 const writes=fake.calls.filter(c=>c.options.method==='PUT');assert.equal(writes.length,1);const body=JSON.parse(writes[0].options.body);assert.equal(body.sha,'original-file-sha');assert.equal(body.branch,'main');assert.equal(writes[0].url,'https://api.github.com/repos/ankertam-cyber/anker-portfolio/contents/site/content.json');assert.ok(!JSON.stringify(fake.doc).includes('fixture-session-token'));
 publisher.disconnect();assert.equal(publisher.connected(),false);await assert.rejects(()=>publisher.publish(next,next),/先連接/);
});
test('concurrent GitHub updates and expired credentials never overwrite published content',async()=>{
 const fake=fakeGitHub({conflict:true}),publisher=createGitHubPublisher({request:fake.request});await publisher.connect('fixture-session-token',emptyContent());await assert.rejects(()=>publisher.publish({...emptyContent(),profile:{name:'Test'}},emptyContent()),/其他更新/);assert.equal(fake.calls.filter(c=>c.options.method==='PUT').length,0);
 const denied=createGitHubPublisher({request:fakeGitHub({failure:true}).request});await assert.rejects(()=>denied.connect('invalid-fixture',emptyContent()),/失效/);assert.equal(denied.connected(),false);
});
