import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {readSiteJson,readPublishedContent} from '../site/admin-data.mjs';
import {restoreOwnerDraft,ownerDraftStatus} from '../site/admin-draft-state.mjs';
import {emptyContent,clone,canonical} from '../site/content-model.mjs';
import {createGitHubPublisher} from '../site/github-publisher.mjs';
const entries=[{id:'one',title:'First',publicationStatus:'published',images:[],graphics:[],videos:[],imageInfo:{}}];

test('a stalled download is aborted, retried once, then reports an error',async()=>{
 const signals=[],retries=[];
 await assert.rejects(()=>readSiteJson('https://example.test/content.json',{timeoutMs:10,request:async(_url,options)=>{signals.push(options.signal);return new Promise(()=>{});},onRetry:n=>retries.push(n)}),/逾時/);
 assert.equal(signals.length,2);assert.ok(signals.every(signal=>signal.aborted));assert.deepEqual(retries,[1]);
});
test('the timeout also covers an unfinished response body',async()=>{
 await assert.rejects(()=>readSiteJson('https://example.test/content.json',{timeoutMs:10,attempts:1,request:async()=>({ok:true,json:()=>new Promise(()=>{})})}),/逾時/);
});
test('a transient error recovers but invalid JSON and missing files do not keep retrying',async()=>{
 let calls=0;assert.deepEqual(await readSiteJson('url',{request:async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({loaded:true})}}),{loaded:true});assert.equal(calls,2);
 calls=0;await assert.rejects(()=>readSiteJson('url',{request:async()=>{calls++;return {ok:false,status:404};}}),/404/);assert.equal(calls,1);
 calls=0;await assert.rejects(()=>readSiteJson('url',{request:async()=>{calls++;return {ok:true,json:async()=>{throw new SyntaxError('bad JSON');}};}}),/格式/);assert.equal(calls,1);
});
test('catalogue and live content load in parallel and validate before editing',async()=>{
 const requests=[],status=[],release=[];
 const loaded=readPublishedContent('https://example.test/site/',{onStatus:s=>status.push(s),request:(url,options)=>{requests.push({url:String(url),cache:options.cache});return new Promise(resolve=>release.push(()=>resolve({ok:true,json:async()=>String(url).includes('projects')?{entries}:emptyContent()})));}});
 assert.equal(requests.length,2);release.forEach(done=>done());assert.deepEqual(await loaded,{entries,content:emptyContent()});assert.equal(status.at(-1),'已讀取 2 / 2 份網站資料…');assert.deepEqual(requests.map(r=>r.cache),['no-cache','no-store']);
 await assert.rejects(()=>readPublishedContent('https://example.test/',{request:async url=>({ok:true,json:async()=>String(url).includes('projects')?{}:emptyContent()})}),/作品清單格式/);
});
test('an untouched old draft safely refreshes to the latest published version',()=>{
 const old=emptyContent(),latest={...emptyContent(),profile:{aboutIntro:'Latest owner update'},revision:'new'};
 const result=restoreOwnerDraft({baseline:canonical(old),draft:old},latest,entries);assert.equal(result.state,'refreshed');assert.deepEqual(result.draft,latest);assert.notEqual(result.draft,latest);
 const submitted=restoreOwnerDraft({baseline:canonical(old),draft:latest},latest,entries);assert.equal(submitted.state,'refreshed');
});
test('unsaved work survives reload and a genuine version conflict remains protected',()=>{
 const old=emptyContent(),local=clone(old);local.profile.aboutIntro='Unsaved text';const saved={baseline:canonical(old),draft:local};
 assert.equal(restoreOwnerDraft(saved,old,entries).state,'restored');
 const latest={...emptyContent(),profile:{aboutIntro:'Different published edit'}};
 const before=JSON.stringify(saved),result=restoreOwnerDraft(saved,latest,entries);assert.equal(result.state,'conflict');assert.deepEqual(result.draft,local);assert.equal(JSON.stringify(saved),before);
 const invalid=clone(saved);invalid.draft.token='must not be accepted';assert.throws(()=>restoreOwnerDraft(invalid,latest,entries));
});
test('a loaded conflicting or dirty draft can never claim it is still loading',()=>{
 assert.equal(ownerDraftStatus({ready:true,stale:true,changed:true}),'內容已讀取 · 草稿版本需核對');
 assert.equal(ownerDraftStatus({ready:true,changed:true}),'草稿已自動儲存 · 尚未發佈');
 assert.equal(ownerDraftStatus({ready:true,busy:true}),'正在提交 GitHub…');
 assert.equal(ownerDraftStatus({ready:false,loadError:true}),'網站內容未能載入');
});
test('deployment status falls back to recent runs and always matches the exact commit',async()=>{
 const calls=[],publisher=createGitHubPublisher({request:async url=>{calls.push(url);return {ok:true,json:async()=>({workflow_runs:url.includes('head_sha=')?[]:[{head_sha:'another',status:'completed',conclusion:'success'},{head_sha:'owner-update',status:'in_progress',conclusion:null,html_url:'https://github.com/run/owner'}]})};}});
 assert.deepEqual(await publisher.deployment('owner-update'),{status:'in_progress',conclusion:null,url:'https://github.com/run/owner'});assert.equal(calls.length,2);assert.equal(await publisher.deployment('missing'),null);
});
test('a failed editor script exposes recovery without writing or clearing the draft',async()=>{
 const elements=new Map();const make=()=>({dataset:{},children:[],setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},addEventListener(){}});
 for(const id of ['office','draft-status','editor'])elements.set(id,make());
 const listeners={},timers=[];let writes=0;
 const context={document:{getElementById:id=>elements.get(id),createElement:make},addEventListener:(name,fn)=>listeners[name]=fn,setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},localStorage:{setItem(){writes++;},removeItem(){writes++;}},location:{reload(){}}};
 vm.runInNewContext(await fs.readFile(new URL('../site/admin-startup.js',import.meta.url),'utf8'),context);
 listeners.error({target:{id:'admin-entry'}});assert.equal(elements.get('office').dataset.loadState,'error');assert.equal(elements.get('draft-status').textContent,'網站內容未能載入');assert.deepEqual(elements.get('editor').children[0].children.slice(1).map(n=>n.textContent),['重新載入後台','下載原有草稿備份']);assert.equal(writes,0);
 elements.get('office').dataset.loadState='ready';timers[0]();assert.equal(elements.get('office').dataset.loadState,'ready');
});
