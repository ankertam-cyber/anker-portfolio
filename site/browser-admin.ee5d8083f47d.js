// Generated owner editor; no external runtime dependencies.
(()=>{
"use strict";
try{
const m3=(()=>{
const GRAPHIC_KINDS=new Set(['graphic','graphics','rendering','render','design']);
const source=item=>typeof item==='string'?item:item?.src;
function unique(items,key){const seen=new Set();return items.filter(item=>{const value=key(item);if(!value||seen.has(value))return false;seen.add(value);return true;});}
function projectMedia(project){
  const films=unique((project?.videos||[]).filter(v=>v?.src).map(v=>({...v,type:v.type==='vimeo'?'vimeo':'video',mediaKind:'video'})),v=>v.src);
  const photos=[],graphics=[];
  for(const item of project?.images||[]){const src=source(item);if(!src)continue;const info={...(project.imageInfo?.[src]||{}),...(typeof item==='object'?item:{})};const mediaKind=String(info.mediaKind||'photo').toLowerCase();const image={...info,type:'image',src,mediaKind};(GRAPHIC_KINDS.has(mediaKind)?graphics:photos).push(image);}
  for(const item of project?.graphics||[]){const src=source(item);if(!src)continue;const info={...(project.imageInfo?.[src]||{}),...(typeof item==='object'?item:{})};graphics.push({...info,type:'image',src,mediaKind:info.mediaKind||'graphic'});}
  // One shared sequence for the cinema, project dialog and fullscreen viewer.
  // Neither a legacy images-first flag nor an array length can change this order.
  return [...films,...unique([...photos,...graphics],v=>v.src)];
}

function projectImages(project){return projectMedia(project).filter(item=>item.type==='image');}

return {projectMedia,projectImages};
})();
const m2=(()=>{
const {projectMedia}=m3;

const DRAFT_KEY='anker-portfolio-owner-draft-v1';
const PROFILE_DEFAULTS=Object.freeze({name:'Anker Tam',role:'Creative Director',location:'Hong Kong',aboutTitle:'Hello,\nI’m Anker.',aboutIntro:'I’m Anker Tam, a Hong Kong-based Creative Director and Head of Design with 15 years of experience in visual communication, brand storytelling and experiential design.',aboutBody:'My work brings together concept development, spatial design, graphics and motion. I lead creative teams from the first pitch through design development and execution — shaping how an idea becomes an experience people can step into.',email:'ankertam@gmail.com',linkedin:'https://www.linkedin.com/in/anker-tam-a733a4266/',contactTitle:'Let’s make\nthe next show.',metaDescription:'Anker Tam, a Hong Kong-based Creative Director. A portfolio of brand experiences, events and spatial design.'});
const emptyContent=()=>({version:1,profile:{},order:[],overrides:{},additions:[]});
const clone=value=>JSON.parse(JSON.stringify(value));
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const badKeys=new Set(['__proto__','prototype','constructor']);
const patchKeys=new Set(['title','year','category','location','cinema','description','hidden','media','story']);
const storyKeys=new Set(['eyebrow','intro','challenge','approach','role','outcome','highlights','stage','spotlight']);
function normalizeStory(story){return story===null?null:Object.fromEntries(Object.entries(story||{}).filter(([k])=>storyKeys.has(k)));}
const hasEmoji=text=>/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u20E3]/u.test(text.replaceAll('©',''));
function record(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' 格式不正確');for(const k of Object.keys(value))if(badKeys.has(k))throw Error('不支援嘅欄位名稱');}
function text(value,label,max=20000){if(typeof value!=='string'||value.length>max)throw Error(label+' 文字太長或格式不正確');if(hasEmoji(value))throw Error(label+' 唔可以包含 emoji');}
function safeMediaUrl(value){
 if(typeof value!=='string'||!value||/[\u0000-\u0020\\]/u.test(value))return false;
 if(value.startsWith('assets/')){try{return !decodeURIComponent(value).split('/').includes('..')&&!value.includes('?')&&!value.includes('#');}catch{return false;}}
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
function normalizeMedia(item){
 const media={type:item.type==='vimeo'?'vimeo':item.type==='video'?'video':'image',src:item.src,mediaKind:item.type==='video'||item.type==='vimeo'?'video':['graphic','graphics','render','rendering','design'].includes(item.mediaKind)?'graphic':'photo'};
 for(const k of ['label','contribution','poster','thumbnail','alt','width','height','animated'])if(item[k]!==undefined)media[k]=item[k];
 return media;
}
function mediaRank(m){return m.type!=='image'?0:m.mediaKind==='graphic'?2:1;}
function orderedMedia(items){return items.map(normalizeMedia).sort((a,b)=>mediaRank(a)-mediaRank(b));}
function normalizeVimeoInput(value){
 const url=new URL(value.trim());
 if(url.protocol!=='https:'||url.username||url.password)throw Error('請輸入有效嘅 HTTPS Vimeo 網址');
 if(['vimeo.com','www.vimeo.com'].includes(url.hostname)){
  const match=url.pathname.match(/^\/(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);if(!match)throw Error('請貼上個別 Vimeo 影片網址');
  url.hostname='player.vimeo.com';url.pathname='/video/'+match[1];if(match[2])url.searchParams.set('h',match[2]);
 }
 if(url.hostname!=='player.vimeo.com'||!/^\/video\/[1-9]\d*\/?$/.test(url.pathname))throw Error('Vimeo 網址格式不正確');
 return url.href;
}
function validateMedia(items){
 if(!Array.isArray(items)||items.length>2000)throw Error('素材清單格式不正確');
 const seen=new Set();let previous=-1;
 for(const item of items){record(item,'素材');if(!['image','video','vimeo'].includes(item.type)||!safeMediaUrl(item.src))throw Error('素材需要有效嘅 HTTPS 網址或現有 assets 路徑');
  if(seen.has(item.src))throw Error('同一作品唔可以重複加入相同素材');seen.add(item.src);
  const rank=mediaRank(item);if(rank<previous)throw Error('素材次序需要保持：影片、相片、設計圖');previous=rank;
  if(item.type==='vimeo'&&normalizeVimeoInput(item.src)!==item.src)throw Error('請使用 Vimeo player 網址');
  if(item.type==='video'&&!/\.(mp4|webm)(?:[?#]|$)/i.test(item.src))throw Error('影片請用 MP4／WebM 直接連結，或選 Vimeo');
  for(const k of ['poster','thumbnail'])if(item[k]&&!safeMediaUrl(item[k]))throw Error('封面圖片網址不正確');
  for(const k of ['label','contribution','alt'])if(item[k]!==undefined)text(item[k],'素材文字',4000);
  for(const k of ['width','height'])if(item[k]!==undefined&&(!Number.isFinite(item[k])||item[k]<1||item[k]>30000))throw Error('素材尺寸不正確');
 }
}
function validatePatch(patch){
 record(patch,'作品');for(const k of Object.keys(patch))if(!patchKeys.has(k))throw Error('不支援嘅作品欄位：'+k);
 for(const k of ['title','year','category','location','description'])if(own(patch,k))text(patch[k],'作品 '+k,k==='description'?20000:1000);
 if(own(patch,'title')&&!patch.title.trim())throw Error('作品名稱唔可以留空');
 if(own(patch,'cinema')&&!['c1','c2'].includes(patch.cinema))throw Error('請選擇影院');
 if(own(patch,'hidden')&&typeof patch.hidden!=='boolean')throw Error('作品顯示狀態不正確');
 if(own(patch,'media'))validateMedia(patch.media);
 if(own(patch,'story')&&patch.story!==null){record(patch.story,'Case study');for(const [k,v]of Object.entries(patch.story)){if(!storyKeys.has(k))throw Error('不支援嘅 Case study 欄位');if(k==='highlights'){if(!Array.isArray(v)||v.length>30)throw Error('重點格式不正確');v.forEach(s=>text(s,'Case study 重點',1000));}else if(k==='spotlight'){if(typeof v!=='boolean')throw Error('精選狀態不正確');}else text(v,'Case study '+k);}}
}
function validateContent(doc,entries=[]){
 record(doc,'網站內容');if(doc.version!==1)throw Error('唔支援呢個草稿版本');
 for(const k of Object.keys(doc))if(!['version','revision','updatedAt','profile','order','overrides','additions','library'].includes(k))throw Error('不支援嘅網站內容欄位');
 record(doc.profile,'個人簡介');record(doc.overrides,'作品修改');
 for(const [k,v]of Object.entries(doc.profile)){if(!own(PROFILE_DEFAULTS,k))throw Error('不支援嘅個人簡介欄位');text(v,'個人簡介 '+k);if(['name','aboutTitle','contactTitle'].includes(k)&&!v.trim())throw Error('名稱或標題唔可以留空');}
 if(doc.profile.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.profile.email))throw Error('電郵地址格式不正確');
 if(doc.profile.linkedin&&(!safeMediaUrl(doc.profile.linkedin)||!['linkedin.com','www.linkedin.com'].includes(new URL(doc.profile.linkedin).hostname)))throw Error('請輸入有效嘅 LinkedIn HTTPS 網址');
 for(const k of ['revision','updatedAt'])if(doc[k]!==undefined)text(doc[k],'版本資料',100);
 if(!Array.isArray(doc.additions)||doc.additions.length>300||!Array.isArray(doc.order)||doc.order.length>1000)throw Error('作品清單格式不正確');
 const ids=new Set(entries.map(p=>p.id));
 for(const p of doc.additions){record(p,'新增作品');if(typeof p.id!=='string'||!/^owner-[a-zA-Z0-9-]{5,80}$/.test(p.id)||ids.has(p.id))throw Error('新增作品編號重複或不正確');ids.add(p.id);const {id,...patch}=p;validatePatch(patch);if(!p.title?.trim())throw Error('新增作品需要名稱');}
 const orderIds=new Set();for(const id of doc.order){if(!ids.has(id)||orderIds.has(id))throw Error('作品排序包含重複或未知作品');orderIds.add(id);}
 for(const [id,patch]of Object.entries(doc.overrides)){if(!ids.has(id))throw Error('草稿包含已不存在嘅作品，請重新載入正式內容');validatePatch(patch);}
 if(doc.library!==undefined){record(doc.library,'素材庫');if(Object.keys(doc.library).some(k=>!['items','removed'].includes(k)))throw Error('不支援嘅素材庫欄位');validateMedia(doc.library.items);if(!Array.isArray(doc.library.removed)||doc.library.removed.length>6000||new Set(doc.library.removed).size!==doc.library.removed.length||doc.library.removed.some(src=>!safeMediaUrl(src)))throw Error('素材庫移除清單不正確');}
 if(new TextEncoder().encode(JSON.stringify(doc)).length>900000)throw Error('草稿超過 900 KB，請減少重複素材資料');
 return true;
}
function editableEntries(entries,doc){
 const all=[...entries,...doc.additions.map(p=>({images:[],videos:[],graphics:[],imageInfo:{},publicationStatus:'published',...p}))];
 const positions=new Map(doc.order.map((id,i)=>[id,i]));
 const removed=new Set(doc.library?.removed||[]);
 return all.map(p=>{const result={...p,...doc.overrides[p.id]};if(result.media||removed.size){const media=orderedMedia(result.media||projectMedia(result)).filter(m=>!removed.has(m.src)).map(m=>{for(const key of ['poster','thumbnail'])if(removed.has(m[key]))delete m[key];return m;});result.videos=media.filter(m=>m.type!=='image');result.images=media.filter(m=>m.type==='image'&&m.mediaKind!=='graphic').map(m=>m.src);result.graphics=media.filter(m=>m.type==='image'&&m.mediaKind==='graphic');result.imageInfo=Object.fromEntries(media.filter(m=>m.type==='image').map(m=>[m.src,m]));}return result;}).sort((a,b)=>(positions.get(a.id)??1e6)-(positions.get(b.id)??1e6));
}
function libraryInventory(entries,doc){
 const records=new Map(),remember=item=>{if(item?.src&&!records.has(item.src))records.set(item.src,{...normalizeMedia(item),projectIds:[],removed:false});};
 for(const p of entries)projectMedia(p).forEach(remember);
 for(const p of doc.additions)if(p.media)p.media.forEach(remember);
 for(const patch of Object.values(doc.overrides))if(patch.media)patch.media.forEach(remember);
 for(const item of doc.library?.items||[])remember(item);
 const unfiltered={...doc,library:{items:doc.library?.items||[],removed:[]}};
 for(const p of editableEntries(entries,unfiltered))for(const item of projectMedia(p))for(const src of [item.src,item.poster,item.thumbnail]){const record=records.get(src);if(record&&!record.projectIds.includes(p.id))record.projectIds.push(p.id);}
 const removed=new Set(doc.library?.removed||[]);return [...records.values()].map(item=>({...item,removed:removed.has(item.src)}));
}
function applyContent(entries,doc){validateContent(doc,entries);const visible=editableEntries(entries,doc).filter(p=>!p.hidden);if(!visible.length)throw Error('至少需要保留一個顯示中嘅作品');return visible;}
function mediaForEditor(project){return orderedMedia(projectMedia(project));}
function changeSummary(before,after,entries){
 const changes=[];if(canonical(before.profile)!==canonical(after.profile))changes.push('更新個人簡介／聯絡資料');
 if(canonical(before.library||{})!==canonical(after.library||{})){const old=new Set(before.library?.removed||[]),next=new Set(after.library?.removed||[]),deleted=[...next].filter(src=>!old.has(src)).length,restored=[...old].filter(src=>!next.has(src)).length;changes.push('更新素材庫'+(deleted?'：移除 '+deleted+' 個素材':'')+(restored?'：還原 '+restored+' 個素材':'')+'（原檔保留）');}
 if(canonical(before.order)!==canonical(after.order))changes.push('調整作品排序');
 const old=new Map(editableEntries(entries,before).map(p=>[p.id,p]));
 for(const p of editableEntries(entries,after)){const prev=old.get(p.id);if(!prev){changes.push('新增作品：'+p.title+(p.hidden?'（隱藏）':''));continue;}if(canonical(p)===canonical(prev))continue;const labels=[];if(p.title!==prev.title)labels.push('改名');if(Boolean(p.hidden)!==Boolean(prev.hidden))labels.push(p.hidden?'隱藏':'重新顯示');if(canonical(mediaForEditor(p))!==canonical(mediaForEditor(prev)))labels.push('素材／排序');if(!labels.length)labels.push('文字／設定');changes.push(p.title+'：'+labels.join('、'));}
 for(const [id,p]of old)if(!editableEntries(entries,after).some(x=>x.id===id))changes.push('移除新增作品：'+p.title);
 return changes;
}

return {DRAFT_KEY,PROFILE_DEFAULTS,emptyContent,clone,canonical,normalizeStory,hasEmoji,safeMediaUrl,normalizeMedia,mediaRank,orderedMedia,normalizeVimeoInput,validateContent,editableEntries,libraryInventory,applyContent,mediaForEditor,changeSummary};
})();
const m4=(()=>{
const {clone,canonical,validateContent,orderedMedia}=m2;

// A remotely confirmed library cleanup may arrive while this device has text
// or ordering edits. Merge only additive removals, never unrelated remote edits.
function rebaseLibraryCleanup(baseline,published,local,entries){
 try{
  const before=typeof baseline==='string'?JSON.parse(baseline):baseline;
  validateContent(before,entries);validateContent(published,entries);validateContent(local,entries);
  const core=doc=>Object.fromEntries(Object.entries(doc).filter(([key])=>!['library','revision','updatedAt'].includes(key)));
  if(canonical(core(before))!==canonical(core(published)))return null;
  const old=before.library||{items:[],removed:[]},remote=published.library||{items:[],removed:[]},draft=local.library||{items:[],removed:[]};
  const prior=new Set(old.removed),now=new Set(remote.removed);if([...prior].some(src=>!now.has(src)))return null;
  const added=remote.removed.filter(src=>!prior.has(src));if(!added.length)return null;
  const changes=new Set(added),previousItems=new Map(old.items.map(item=>[item.src,item])),remoteItems=new Map(remote.items.map(item=>[item.src,item]));
  for(const [src,item]of previousItems)if(canonical(remoteItems.get(src))!==canonical(item))return null;
  for(const item of remote.items)if(!previousItems.has(item.src)&&!changes.has(item.src))return null;
  const result=clone(local),items=new Map([...remote.items,...draft.items].map(item=>[item.src,item]));
  result.library={items:orderedMedia([...items.values()]),removed:[...new Set([...draft.removed,...added])]};
  for(const key of ['revision','updatedAt']){if(published[key]===undefined)delete result[key];else result[key]=published[key];}
  validateContent(result,entries);return result;
 }catch{return null;}
}

return {rebaseLibraryCleanup};
})();
const m1=(()=>{
const {clone,canonical,validateContent}=m2;

const {rebaseLibraryCleanup}=m4;

function restoreOwnerDraft(saved,published,entries){
 if(!saved?.draft)return {draft:clone(published),state:'current'};
 validateContent(saved.draft,entries);
 const live=canonical(published),local=canonical(saved.draft);
 if(saved.baseline===live)return {draft:clone(saved.draft),state:local===live?'current':'restored'};
 // There is nothing unpublished to lose when the old draft was unmodified,
 // or when it is the exact content that has just reached the public site.
 if(local===saved.baseline||local===live)return {draft:clone(published),state:'refreshed'};
 const merged=rebaseLibraryCleanup(saved.baseline,published,saved.draft,entries);
 if(merged)return {draft:merged,state:'merged'};
 return {draft:clone(saved.draft),state:'conflict'};
}

function ownerDraftStatus({ready,busy,stale,changed,storageOK=true,loadError=false}){
 if(!ready)return loadError?'網站內容未能載入':'正在讀取網站內容…';
 if(!storageOK)return '瀏覽器無法儲存草稿，請下載備份';
 if(stale)return '內容已讀取 · 草稿版本需核對';
 if(busy)return '正在提交 GitHub…';
 return changed?'草稿已自動儲存 · 尚未發佈':'內容與已提交版本一致';
}

return {restoreOwnerDraft,ownerDraftStatus};
})();
const m5=(()=>{
const {validateContent}=m2;

// Bound the entire transfer, including a response body that never finishes.
async function readSiteJson(url,{request=globalThis.fetch,timeoutMs=15000,attempts=2,cache='no-store',onRetry=()=>{}}={}){
 for(let attempt=1;attempt<=attempts;attempt++){
  const controller=new AbortController();let timer,retryable=true;
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('讀取逾時，請檢查網絡後重試'));},timeoutMs);});
   return await Promise.race([deadline,(async()=>{
    const response=await request(url,{cache,signal:controller.signal});
    if(!response.ok){retryable=response.status===408||response.status===429||response.status>=500;throw Error('網站內容未能讀取（'+response.status+'）');}
    try{return await response.json();}catch(error){if(error.name==='SyntaxError'){retryable=false;throw Error('網站內容格式有誤，請稍後重試');}throw error;}
   })()]);
  }catch(error){if(attempt===attempts||!retryable)throw error;onRetry(attempt);}
  finally{clearTimeout(timer);controller.abort();}
 }
}

async function readPublishedContent(site,{onStatus=()=>{},...options}={}){
 onStatus('正在讀取作品清單及正式內容…');
 const names=['projects.v28.json','content.json'];let completed=0,active=true,data;
 const report=copy=>{if(active)onStatus(copy);};
 try{data=await Promise.all(names.map(name=>readSiteJson(new URL(name,site),{...options,cache:name==='content.json'?'no-store':'no-cache',onRetry:()=>report('網絡較慢，正在重試讀取'+(name==='content.json'?'正式內容':'作品清單')+'…')}).then(data=>{completed++;report('已讀取 '+completed+' / 2 份網站資料…');return data;})));}finally{active=false;}
 const [catalogue,content]=data;
 if(!Array.isArray(catalogue?.entries))throw Error('作品清單格式有誤，請稍後重試');
 const entries=catalogue.entries.filter(p=>p.publicationStatus==='published');validateContent(content,entries);
 return {entries,content};
}

return {readSiteJson,readPublishedContent};
})();
const m7=(()=>{
const HEX=/^[a-f0-9]{64}$/i;
const isComparablePhoto=item=>item?.type==='image'&&!['graphic','graphics','rendering','render','design'].includes(String(item.mediaKind||'').toLowerCase())&&!item.animated&&!/\.(?:gif|svg)(?:[?#]|$)/i.test(item.src);
function hashDistance(a,b){if(!/^[a-f0-9]{16}$/i.test(a||'')||!/^[a-f0-9]{16}$/i.test(b||''))return 64;let bits=BigInt('0x'+a)^BigInt('0x'+b),count=0;while(bits){bits&=bits-1n;count++;}return count;}
function similarPhotos(a,b){
 if(!a||!b||!Number.isFinite(a.detail)||!Number.isFinite(b.detail)||a.detail<12||b.detail<12||!a.width||!a.height||!b.width||!b.height)return false;
 const ratio=(a.width/a.height)/(b.width/b.height);if(Math.abs(Math.log(ratio))>.025)return false;
 if(hashDistance(a.p,b.p)>6||hashDistance(a.d,b.d)>10)return false;
 if(a.color?.length!==27||b.color?.length!==27)return false;
 return a.color.reduce((sum,value,i)=>sum+Math.abs(value-b.color[i]),0)/27<=14;
}
const quality=item=>(item.fingerprint?.width||item.width||0)*(item.fingerprint?.height||item.height||0);
function findPhotoDuplicates(input){
 const seen=new Set(),items=input.filter(item=>isComparablePhoto(item)&&item.fingerprint&&!seen.has(item.src)&&seen.add(item.src)).map((item,index)=>({...item,sourceIndex:index}));
 const parents=items.map((_,i)=>i),keys=new Map();const root=i=>parents[i]===i?i:(parents[i]=root(parents[i]));
 items.forEach((item,i)=>{for(const key of ['sha256','pixels']){const value=item.fingerprint[key];if(!HEX.test(value||''))continue;const identity=key+':'+value;if(keys.has(identity))parents[root(i)]=root(keys.get(identity));else keys.set(identity,i);}});
 const clusters=new Map();items.forEach((item,i)=>{const id=root(i);if(!clusters.has(id))clusters.set(id,[]);clusters.get(id).push(item);});
 const rank=(a,b)=>quality(b)-quality(a)||(b.fingerprint.bytes||0)-(a.fingerprint.bytes||0)||a.sourceIndex-b.sourceIndex;
 const nodes=[...clusters.values()].map(group=>{group.sort(rank);return{items:group,keep:group[0].src,fingerprint:group[0].fingerprint};}).sort((a,b)=>rank(a.items[0],b.items[0]));
 const exact=nodes.filter(node=>node.items.length>1).map(node=>({id:'exact:'+node.keep,kind:'exact',keep:node.keep,items:node.items}));
 const available=new Set(nodes),similar=[];
 for(const anchor of nodes){if(!available.delete(anchor))continue;const members=[anchor];
  for(const candidate of nodes){if(!available.has(candidate))continue;if(members.every(member=>similarPhotos(member.fingerprint,candidate.fingerprint))){members.push(candidate);available.delete(candidate);}}
  if(members.length>1)similar.push({id:'similar:'+anchor.keep,kind:'similar',keep:anchor.keep,items:members.flatMap(node=>node.items)});
 }
 return{exact,similar,compared:items.length};
}
function duplicateRemovalItems(groups,keepers,selected){
 const protectedSources=new Set(groups.map(group=>keepers.get(group.id)||group.keep)),bySource=new Map(groups.flatMap(group=>group.items.map(item=>[item.src,item])));
 for(const src of selected){if(!bySource.has(src))throw Error('選取嘅相片已唔喺呢份比對結果');if(protectedSources.has(src))throw Error('每組最少需要保留一張相片');}
 return [...selected].map(src=>bySource.get(src));
}
function recommendedDuplicateSources(groups,keepers=new Map()){
 return new Set(groups.filter(group=>group.kind==='exact').flatMap(group=>group.items.filter(item=>item.src!==(keepers.get(group.id)||group.keep)).map(item=>item.src)));
}

return {isComparablePhoto,hashDistance,similarPhotos,findPhotoDuplicates,duplicateRemovalItems,recommendedDuplicateSources};
})();
const m8=(()=>{
function hexBits(bits){let value=0n;for(const bit of bits)value=(value<<1n)|(bit?1n:0n);return value.toString(16).padStart(16,'0');}
function fingerprintPixels(pixels){
 const cosine=Array.from({length:8},(_,u)=>Array.from({length:32},(_,x)=>Math.cos(Math.PI*(x+.5)*u/32))),values=[];
 for(let v=0;v<8;v++)for(let u=0;u<8;u++){let sum=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)sum+=pixels[y*32+x]*cosine[u][x]*cosine[v][y];values.push(sum);}
 const sorted=values.slice(1).sort((a,b)=>a-b),median=sorted[31],average=pixels.reduce((n,x)=>n+x,0)/pixels.length;
 return{p:hexBits(values.map(x=>x>median)),detail:Math.sqrt(pixels.reduce((n,x)=>n+(x-average)**2,0)/pixels.length)};
}
function loadImage(url,{document:doc,signal}){return new Promise((resolve,reject)=>{const image=doc.createElement('img');image.crossOrigin='anonymous';const timer=setTimeout(()=>finish(Error('相片載入逾時')),12000);const abort=()=>finish(new DOMException('Cancelled','AbortError'));function finish(error){clearTimeout(timer);signal?.removeEventListener('abort',abort);image.onload=image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);}image.onload=()=>finish();image.onerror=()=>finish(Error('相片來源唔容許畫面比對'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();else image.src=url;});}
function sample(image,width,height,doc){const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);return context.getImageData(0,0,width,height).data;}
const gray=rgba=>Array.from({length:rgba.length/4},(_,i)=>Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2]));
function createPhotoFingerprintReader({site,document:doc=globalThis.document,request=globalThis.fetch}={}){
 let indexPromise;
 async function index(){if(!indexPromise)indexPromise=request(new URL('image-fingerprints.json?v=duplicates1',site),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('無法讀取相片比對資料');return r.json();}).then(data=>{if(data.version!==1||data.algorithm!=='photo-content-v1'||!data.records)throw Error('相片比對資料版本不正確');return data.records;}).catch(error=>{indexPromise=null;throw error;});return indexPromise;}
 const read=async(item,{signal}={})=>{
  const records=await index();if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const url=new URL(item.src,site),root=new URL(site),relative=url.origin===root.origin&&url.pathname.startsWith(root.pathname)?url.pathname.slice(root.pathname.length):'';
  if(records[relative]&&!url.search&&!url.hash)return records[relative];
  const image=await loadImage(url.href,{document:doc,signal}),small=gray(sample(image,32,32,doc)),gradient=gray(sample(image,9,8,doc)),colors=sample(image,3,3,doc);
  const result={...fingerprintPixels(small),d:hexBits(Array.from({length:64},(_,i)=>gradient[Math.floor(i/8)*9+i%8]>gradient[Math.floor(i/8)*9+i%8+1])),width:image.naturalWidth,height:image.naturalHeight,color:Array.from(colors).filter((_,i)=>i%4!==3)};
  if(url.origin===root.origin){const response=await request(url,{signal});if(response.ok&&Number(response.headers.get('content-length')||0)<=10000000){const bytes=await response.arrayBuffer();if(bytes.byteLength<=10000000){result.bytes=bytes.byteLength;result.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}}}
  return result;
 };read.prepare=index;return read;
}

return {fingerprintPixels,createPhotoFingerprintReader};
})();
const m6=(()=>{
const {findPhotoDuplicates,duplicateRemovalItems,isComparablePhoto,recommendedDuplicateSources}=m7;

const {createPhotoFingerprintReader}=m8;

const make=(tag,cls='',text)=>{const element=document.createElement(tag);element.className=cls;if(text!==undefined)element.textContent=text;return element;};
const action=(text,handler,cls='')=>{const element=make('button',cls,text);element.type='button';element.addEventListener('click',handler);return element;};
const filename=src=>{try{return decodeURIComponent(new URL(src,'https://example.test/').pathname.split('/').at(-1));}catch{return src;}};
function mountPhotoDuplicateManager(dialog,{site,getProject,getItems,onRemove}={}){
 const find=id=>dialog.querySelector('#'+id),scope=find('duplicate-scope'),status=find('duplicate-status'),results=find('duplicate-results'),count=find('duplicate-count'),remove=find('duplicate-remove'),scan=find('duplicate-scan');
 const exactTab=find('duplicates-exact'),similarTab=find('duplicates-similar'),suggest=find('duplicate-suggest'),clear=find('duplicate-clear');
 const read=createPhotoFingerprintReader({site}),viewer=document.getElementById('duplicate-photo-dialog'),photo=document.getElementById('duplicate-photo-image');
 let session=null,projectId='',mode='exact',data={exact:[],similar:[]},keepers=new Map(),selected=new Set(),focus=null,viewing=[],viewIndex=0;
 const groups=()=>data[mode];
 function refresh(){
  const total=selected.size;count.textContent=total?'已選 '+total+' 張待移除':'未選取相片';remove.disabled=!total||Boolean(session?.loading);remove.textContent=total?'檢查並移除 '+total+' 張':'檢查並移除';clear.disabled=!total;suggest.disabled=mode!=='exact'||!groups().length||Boolean(session?.loading);
  for(const card of results.querySelectorAll('.duplicate-card')){const kept=keepers.get(card.dataset.group)===card.dataset.src;card.classList.toggle('is-kept',kept);card.classList.toggle('is-selected',selected.has(card.dataset.src));card.querySelector('input[type=radio]').checked=kept;const check=card.querySelector('input[type=checkbox]');check.disabled=kept;check.checked=selected.has(card.dataset.src);card.querySelector('.duplicate-decision').textContent=kept?'保留':'可選擇移除';}
 }
 function recommend(){selected=recommendedDuplicateSources(groups(),keepers);refresh();}
 function paintPhoto(){const item=viewing[viewIndex];if(!item)return;photo.src=new URL(item.src,site).href;photo.alt=item.label||filename(item.src);document.getElementById('duplicate-photo-caption').textContent=(viewIndex+1)+' / '+viewing.length+' · '+(keepers.get(item.groupId)===item.src?'保留':'待核對')+' · '+filename(item.src);document.getElementById('duplicate-photo-previous').disabled=viewIndex===0;document.getElementById('duplicate-photo-next').disabled=viewIndex===viewing.length-1;}
 function enlarge(group,item){viewing=group.items.map(value=>({...value,groupId:group.id}));viewIndex=viewing.findIndex(value=>value.src===item.src);paintPhoto();viewer.showModal();}
 function render(){
  exactTab.setAttribute('aria-pressed',String(mode==='exact'));similarTab.setAttribute('aria-pressed',String(mode==='similar'));exactTab.textContent='完全相同 · '+data.exact.length+' 組';similarTab.textContent='疑似重複 · '+data.similar.length+' 組';results.replaceChildren();
  if(!groups().length){results.append(make('p','help-box',mode==='exact'?'未發現可確定完全相同嘅相片。可以再睇「疑似重複」。':'未發現符合比對條件嘅相似相片。呢個比對唔涵蓋大幅裁切、翻轉或大角度變化。'));refresh();return;}
  groups().forEach((group,index)=>{
   const section=make('section','duplicate-group'),head=make('div','duplicate-group-heading');head.append(make('h3','',String(index+1).padStart(2,'0')+' · '+(mode==='exact'?'內容完全相同':'畫面相似')+' · '+group.items.length+' 張'),make('p','small',mode==='exact'?'已建議保留解像度較高嘅一張；你可以改選。':'角度相近亦可能有用，請放大核對後自行勾選。'));section.append(head);
   const grid=make('div','duplicate-grid');section.append(grid);
   for(const item of group.items){
    const card=make('article','duplicate-card');card.dataset.group=group.id;card.dataset.src=item.src;const preview=action('',()=>enlarge(group,item),'duplicate-image-button');preview.setAttribute('aria-label','放大相片 '+filename(item.src));const image=make('img');image.src=new URL(item.thumbnail||item.src,site).href;image.alt=item.label||filename(item.src);image.loading='lazy';preview.append(image,make('span','','放大比對'));card.append(preview);
    const info=item.fingerprint;card.append(make('p','duplicate-decision'),make('p','duplicate-filename',filename(item.src)),make('p','small',info.width+' × '+info.height+(info.bytes?' · '+(info.bytes/1024).toFixed(0)+' KB':'')),make('p','small',(item.projectNames||[]).slice(0,3).join('、')));
    const controls=make('div','duplicate-card-controls'),keepLabel=make('label'),keep=make('input');keep.type='radio';keep.name='duplicate-keep-'+index;keep.value=item.src;keepLabel.append(keep,document.createTextNode('保留呢張'));keep.addEventListener('change',()=>{keepers.set(group.id,item.src);selected.delete(item.src);if(mode==='exact'){for(const member of group.items)if(member.src!==item.src)selected.add(member.src);}refresh();});
    const removeLabel=make('label'),check=make('input');check.type='checkbox';check.setAttribute('aria-label','移除相片 '+filename(item.src));removeLabel.append(check,document.createTextNode('移除呢張'));check.addEventListener('change',()=>{if(check.checked)selected.add(item.src);else selected.delete(item.src);refresh();});controls.append(keepLabel,removeLabel);card.append(controls);grid.append(card);
   }
   results.append(section);
  });refresh();
 }
 async function run(){
  session?.controller.abort();const current={controller:new AbortController(),loading:true};session=current;data={exact:[],similar:[]};keepers=new Map();selected=new Set();results.replaceChildren();scan.disabled=true;scope.disabled=true;exactTab.disabled=similarTab.disabled=true;refresh();
  try{
   await read.prepare();if(session!==current||current.controller.signal.aborted)return;
   const items=getItems(scope.value,projectId).filter(isComparablePhoto),compared=[];let cursor=0,done=0,skipped=0;
   status.textContent='正在按畫面內容比對 '+items.length+' 張相片…';
   async function worker(){while(cursor<items.length&&session===current&&!current.controller.signal.aborted){const item=items[cursor++];try{const fingerprint=await read(item,{signal:current.controller.signal});compared.push({...item,fingerprint});}catch(error){if(error.name==='AbortError')return;skipped++;}done++;if(done%32===0||done===items.length){if(session!==current)return;status.textContent='已比對 '+done+' / '+items.length+' 張相片…';await new Promise(resolve=>setTimeout(resolve,0));}}}
   await Promise.all([worker(),worker(),worker()]);if(session!==current||current.controller.signal.aborted)return;
   data=findPhotoDuplicates(compared);mode='exact';for(const group of [...data.exact,...data.similar])keepers.set(group.id,group.keep);
   status.textContent='已比對 '+data.compared+' 張相片；'+data.exact.length+' 組完全相同，'+data.similar.length+' 組疑似重複。'+(skipped?'另有 '+skipped+' 張未能比對（可能係來源限制或網絡問題）。':'')+' 今次比對只顯示結果，未有更改草稿。';
   current.loading=false;render();recommend();
  }catch(error){if(session===current&&error.name!=='AbortError'){status.textContent='未能完成比對：'+error.message;current.loading=false;refresh();}}
  finally{if(session===current){scan.disabled=false;scope.disabled=false;exactTab.disabled=similarTab.disabled=false;}}
 }
 function close(){session?.controller.abort();session=null;if(viewer.open)viewer.close();if(dialog.open)dialog.close();if(focus?.isConnected)focus.focus({preventScroll:true});focus=null;}
 function open({projectId:id='',scope:initial='project',trigger=document.activeElement}={}){projectId=id;focus=trigger;const project=getProject(id);scope.replaceChildren();for(const [value,label]of [...(project?[['project','目前作品 · '+project.title]]:[]),['library','整個素材庫（會顯示跨作品使用情況）']]){const option=make('option','',label);option.value=value;scope.append(option);}scope.value=project&&initial==='project'?'project':'library';if(!dialog.open)dialog.showModal();void run();}
 find('duplicate-close').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{session?.controller.abort();session=null;});scope.addEventListener('change',()=>void run());scan.addEventListener('click',()=>void run());suggest.addEventListener('click',recommend);clear.addEventListener('click',()=>{selected.clear();refresh();});
 for(const [tab,value]of [[exactTab,'exact'],[similarTab,'similar']])tab.addEventListener('click',()=>{mode=value;selected.clear();render();});
 remove.addEventListener('click',async()=>{try{const items=duplicateRemovalItems(groups(),keepers,selected);if(!items.length)return;remove.disabled=true;const done=await onRemove(items,projectId,scope.value==='library');if(done)close();else{status.textContent='未有移除相片，選取仍然保留。';refresh();}}catch(error){status.textContent=error.message;refresh();}});
 document.getElementById('duplicate-photo-close').addEventListener('click',()=>viewer.close());document.getElementById('duplicate-photo-previous').addEventListener('click',()=>{viewIndex--;paintPhoto();});document.getElementById('duplicate-photo-next').addEventListener('click',()=>{viewIndex++;paintPhoto();});viewer.addEventListener('close',()=>{photo.removeAttribute('src');viewing=[];});
 return{open,close};
}

return {mountPhotoDuplicateManager};
})();
const m11=(()=>{
// Generated from the verified source manifest; source identities remain stable.
const NATIVE_VIDEO_FILES=[
  [
    "assets/imported/o0/instagram/C1WIwn-v-RB.mp4",
    "C1WIwn-v-RB-111ac9dc49eb30123ada.mp4"
  ],
  [
    "assets/imported/o0/instagram/C3SFingPYGT-02.mp4",
    "C3SFingPYGT-02-ddaffd56ec5a730df26b.mp4"
  ],
  [
    "assets/imported/o0/instagram/C3PCWcOvwOs-02.mp4",
    "C3PCWcOvwOs-02-0b452866fdaccdecae8d.mp4"
  ],
  [
    "assets/imported/o0/instagram/C3MrgtnPxId-02.mp4",
    "C3MrgtnPxId-02-60098fb9d15c49fef0d2.mp4"
  ],
  [
    "assets/imported/o0/instagram/C2_uThcvajX-03.mp4",
    "C2_uThcvajX-03-c975bb3ebd82b3d42705.mp4"
  ],
  [
    "assets/imported/o0/instagram/C2ef5ktvMte-03.mp4",
    "C2ef5ktvMte-03-a35a57b16dc7be48d6ee.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/drive-1R6AlKHiVkv3E4K-zt_t6EaPFaw_p2g_I.mp4",
    "drive-1R6AlKHiVkv3E4K-zt_t6EaPFaw_p2g_I-f474fc3099e7d44262e7.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/drive-1H22AJca1Wjc3FmgDuU3QA_6JuP8NlVJQ.mp4",
    "drive-1H22AJca1Wjc3FmgDuU3QA_6JuP8NlVJQ-43d08f4f97f437b2fefe.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/drive-1Klab2gSGKNFf71PyuHhHdqYMGGVbULDF.mp4",
    "drive-1Klab2gSGKNFf71PyuHhHdqYMGGVbULDF-f99fc51a01ad509083e2.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/6e422e_673a66651a714533a59b6983c87a429b.mp4",
    "6e422e_673a66651a714533a59b6983c87a429b-07e341c7e1873d7b7a42.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/at-4db186_6329f7b225ef43819ebefaf4c32bd52f.mp4",
    "at-4db186_6329f7b225ef43819ebefaf4c32bd52f-b4fec20cb2bd7f5902c6.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/at-4db186_d427f49186e44323b1f52f00231c3bfb.mp4",
    "at-4db186_d427f49186e44323b1f52f00231c3bfb-1d5cc46f34b5b081f088.mp4"
  ],
  [
    "assets/portfolio/1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j/at-4db186_0f4863627d004dd49ab476767f96ae51.mp4",
    "at-4db186_0f4863627d004dd49ab476767f96ae51-9f0d6a8f87853c00be5f.mp4"
  ],
  [
    "assets/portfolio/1XVL41h99QcZDcYzZfl28SbsFy4QJNh4_/6e422e_0eadacdf9135482dac879bd4996c38ed.mp4",
    "6e422e_0eadacdf9135482dac879bd4996c38ed-81515356d82a6e2ab045.mp4"
  ],
  [
    "assets/portfolio/1XVL41h99QcZDcYzZfl28SbsFy4QJNh4_/6e422e_b27e3649818043ff8d9cadf0e56b91e3.mp4",
    "6e422e_b27e3649818043ff8d9cadf0e56b91e3-89492c54b8c967f5e55b.mp4"
  ],
  [
    "assets/imported/o2/drive/1udjxeUOTTabvdqfMdMThdgJynF8aPtZ9.mp4",
    "1udjxeUOTTabvdqfMdMThdgJynF8aPtZ9-e85842de7145708d6b0a.mp4"
  ],
  [
    "assets/portfolio/19XhwSYzZ8gheZZVxhBB17S0_IruFdHeW/6e422e_c5708023668443d19b192b7db9d3c7eb.mp4",
    "6e422e_c5708023668443d19b192b7db9d3c7eb-21a1bdafcf94494b3164.mp4"
  ],
  [
    "assets/imported/o3/instagram/instagram-DVyFqafCIy3.mp4",
    "instagram-DVyFqafCIy3-ef7707e3fa616bf39a8c.mp4"
  ],
  [
    "assets/portfolio/1suawVT8NiDvCSslbqgJEKl84YRrUIBXc/drive-1qaaOQD7_jcjnpuUnOB0-5tFLmhQlEiSg.mp4",
    "drive-1qaaOQD7_jcjnpuUnOB0-5tFLmhQlEiSg-b8eeef7754f53261dcfa.mp4"
  ],
  [
    "assets/portfolio/1suawVT8NiDvCSslbqgJEKl84YRrUIBXc/drive-1dexoK5s4AVr_QvvEnAGFLtEAhLD79Szq.mp4",
    "drive-1dexoK5s4AVr_QvvEnAGFLtEAhLD79Szq-17880a0e440eda7e581f.mp4"
  ],
  [
    "assets/portfolio/1n04gvbm6RQ8Jskp3ixGfLvlIgFslv8td/drive-1lI68opSN-xw0f6Z4Owy8YOXQMLLHglV5.mp4",
    "drive-1lI68opSN-xw0f6Z4Owy8YOXQMLLHglV5-39f9930cc1536bbabc4c.mp4"
  ],
  [
    "assets/portfolio/1n04gvbm6RQ8Jskp3ixGfLvlIgFslv8td/drive-1pIJDIr_7nX4lJpzkMa9MYq4N7l1DFUUu.mp4",
    "drive-1pIJDIr_7nX4lJpzkMa9MYq4N7l1DFUUu-0a4517850c8eb326931b.mp4"
  ],
  [
    "assets/imported/o16/drive/1C9qvaTos7XOfqsj24NgWExQJ1keH5pik.mp4",
    "1C9qvaTos7XOfqsj24NgWExQJ1keH5pik-58af94ffb08ee50915a8.mp4"
  ],
  [
    "assets/portfolio/1GfyV3sNkUN5jf38IkIePWYTmgj-64lX0/6e422e_0cfd4661b67846cfad7a95358a630d41.mp4",
    "6e422e_0cfd4661b67846cfad7a95358a630d41-0dbda26b73945589b8ea.mp4"
  ],
  [
    "assets/imported/o17/instagram/instagram-DP6CAPHCQmq.mp4",
    "instagram-DP6CAPHCQmq-f9f7cfa37d2a964cd097.mp4"
  ],
  [
    "assets/imported/o18/instagram/DBQ0sQlvFIb.mp4",
    "DBQ0sQlvFIb-9e6d185bbd1eba35100e.mp4"
  ],
  [
    "assets/imported/o18/instagram/DBQyw2OvSxl.mp4",
    "DBQyw2OvSxl-0e1bee2998c0b7cd05b8.mp4"
  ],
  [
    "assets/imported/o18/drive/15lYluqLRmg_5DUJu5Kq7W2yRwPZx8Xv4.mp4",
    "15lYluqLRmg_5DUJu5Kq7W2yRwPZx8Xv4-9a7ddce0c194b2bd4220.mp4"
  ],
  [
    "assets/imported/o18/drive/13AHdZ511S482kZwWPjAKuAYllKa2tkIF.mp4",
    "13AHdZ511S482kZwWPjAKuAYllKa2tkIF-b78fa7b215deca90f004.mp4"
  ],
  [
    "assets/imported/o18/drive/1TQ7I8_jlBmgpfXO-qEQD7ZG7nMR6FJIB.mp4",
    "1TQ7I8_jlBmgpfXO-qEQD7ZG7nMR6FJIB-8b736e9466d3a60791d3.mp4"
  ],
  [
    "assets/imported/o18/drive/1wyLGM65DsWcPqPmIICE8ZQsit5rMqker.mp4",
    "1wyLGM65DsWcPqPmIICE8ZQsit5rMqker-b1144cf7f7698b471585.mp4"
  ],
  [
    "assets/portfolio/1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp/6e422e_410ee44c52fc47b28a84c43c57e79073.mp4",
    "6e422e_410ee44c52fc47b28a84c43c57e79073-94a7e896199f162d7953.mp4"
  ],
  [
    "assets/portfolio/1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp/6e422e_e3ba729a7fac4cfabc4078394329e790.mp4",
    "6e422e_e3ba729a7fac4cfabc4078394329e790-3f7364b7ae451dc7ed51.mp4"
  ],
  [
    "assets/portfolio/1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp/6e422e_5447b89768a74c59a991d6f073c3ab9c.mp4",
    "6e422e_5447b89768a74c59a991d6f073c3ab9c-c1e275586f029ed68c81.mp4"
  ],
  [
    "assets/portfolio/1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp/6e422e_ef03512e972b477fa09420b7e56395fb.mp4",
    "6e422e_ef03512e972b477fa09420b7e56395fb-77f3791fd736867c223f.mp4"
  ],
  [
    "assets/portfolio/1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp/6e422e_18e1195c6d5a42028e30e11c3dbcb2a2.mp4",
    "6e422e_18e1195c6d5a42028e30e11c3dbcb2a2-a9d134290f2340cfddc5.mp4"
  ],
  [
    "assets/imported/o21/instagram/DH-tWnjv0rp.mp4",
    "DH-tWnjv0rp-326b41d78451f0620357.mp4"
  ],
  [
    "assets/imported/o28/instagram/DEO5uapvfws.mp4",
    "DEO5uapvfws-0968613021f4be259f09.mp4"
  ],
  [
    "assets/imported/o28/instagram/instagram-DEO5f_jvDOm.mp4",
    "instagram-DEO5f_jvDOm-b0df734cfc1feb9d76d7.mp4"
  ],
  [
    "assets/imported/o28/drive/1hJibXUOQKKCLwR9vLIVcZLsVsc1nn8JP.mp4",
    "1hJibXUOQKKCLwR9vLIVcZLsVsc1nn8JP-db42dddf796df27f2664.mp4"
  ],
  [
    "assets/portfolio/1wko49Yx2Tdk96dN_Tfj0HwOk9g5tKikO/6e422e_9eeaf24864d24bcebbd995e052e62b13.mp4",
    "6e422e_9eeaf24864d24bcebbd995e052e62b13-54898057360dd96321bf.mp4"
  ],
  [
    "assets/portfolio/1SiSlf2IXvBazwkCHEaWh4eS0d3nY0GW4/drive-1UT2ocyI_R89L55vxR3kNHB-fQXdcNgjn.mp4",
    "drive-1UT2ocyI_R89L55vxR3kNHB-fQXdcNgjn-a8adf8104ea47da8185a.mp4"
  ],
  [
    "assets/portfolio/1SiSlf2IXvBazwkCHEaWh4eS0d3nY0GW4/drive-13gc0fN1Zsl_pnxjEFTcSXpLmR34lVrKB.mp4",
    "drive-13gc0fN1Zsl_pnxjEFTcSXpLmR34lVrKB-f41296f999c6eb5f5b63.mp4"
  ],
  [
    "assets/portfolio/1SiSlf2IXvBazwkCHEaWh4eS0d3nY0GW4/drive-1wYrj81TuFMGJl2PHa1WI4R6tq1I0fjT-.mp4",
    "drive-1wYrj81TuFMGJl2PHa1WI4R6tq1I0fjT--9504641d2b5b09b26dd0.mp4"
  ],
  [
    "assets/imported/o27/instagram/C1B6TI4vNtW.mp4",
    "C1B6TI4vNtW-73dc77ade847ef7b7845.mp4"
  ],
  [
    "assets/portfolio/1QdTb7ehS2_qHHy2mV5aVoLTsHdG9zE1I/drive-1kaEmINALsbk1-tXoQY0zjtF7BkBnKhe0.mp4",
    "drive-1kaEmINALsbk1-tXoQY0zjtF7BkBnKhe0-9c9edb34f509462e9827.mp4"
  ],
  [
    "assets/portfolio/1QdTb7ehS2_qHHy2mV5aVoLTsHdG9zE1I/drive-1XiTOhxZm0jd90awRWdDlx92OIyQXywCg.mp4",
    "drive-1XiTOhxZm0jd90awRWdDlx92OIyQXywCg-8b071bedcb4c7d3af4fd.mp4"
  ],
  [
    "assets/portfolio/1QdTb7ehS2_qHHy2mV5aVoLTsHdG9zE1I/at-c56b0a_d5d38cb6edc742a39b2ce5cd1da30ccd.mp4",
    "at-c56b0a_d5d38cb6edc742a39b2ce5cd1da30ccd-d3cdc54642ce5a6399f0.mp4"
  ],
  [
    "assets/portfolio/1QdTb7ehS2_qHHy2mV5aVoLTsHdG9zE1I/at-c56b0a_bdf95a2b56a2481b8cb69a11e9c655bd.mp4",
    "at-c56b0a_bdf95a2b56a2481b8cb69a11e9c655bd-48f0d776c41faca4912b.mp4"
  ],
  [
    "assets/portfolio/1QdTb7ehS2_qHHy2mV5aVoLTsHdG9zE1I/at-c56b0a_d7f6ae99d4ff42d7b4a15c09b489ff09.mp4",
    "at-c56b0a_d7f6ae99d4ff42d7b4a15c09b489ff09-0fb106329ede27028795.mp4"
  ],
  [
    "assets/portfolio/1-Vx_mcZ1c_Y30Z28EWpi7lRqFVIEEwCx/drive-1sO43Abu60GbefFhgQxKnKC6ucjYzebQH.mp4",
    "drive-1sO43Abu60GbefFhgQxKnKC6ucjYzebQH-03a6d9db449bf7b2e7c1.mp4"
  ],
  [
    "assets/portfolio/1-Vx_mcZ1c_Y30Z28EWpi7lRqFVIEEwCx/at-76e122_1e0c4ac528224d3d9d046e2a30a7fcc9.mp4",
    "at-76e122_1e0c4ac528224d3d9d046e2a30a7fcc9-7661f4df6a9eb7f5656e.mp4"
  ],
  [
    "assets/portfolio/1-Vx_mcZ1c_Y30Z28EWpi7lRqFVIEEwCx/at-76e122_26f87060842f4a619996ccc23a836a3e.mp4",
    "at-76e122_26f87060842f4a619996ccc23a836a3e-d9d56eaa73e5a2431bb7.mp4"
  ],
  [
    "assets/imported/o32/instagram/C0Q_mL3vUAC.mp4",
    "C0Q_mL3vUAC-895fc382b1edbbcd3b82.mp4"
  ],
  [
    "assets/imported/o32/drive/1ukUr3ODRSlOi1BJjOt8wl5-FASe0okBD.mp4",
    "1ukUr3ODRSlOi1BJjOt8wl5-FASe0okBD-85ad0d5515c2839cfc42.mp4"
  ],
  [
    "assets/imported/o32/drive/1BcSucVNc9_t6kDi_Kz2J4y01YfvK8bBt.mp4",
    "1BcSucVNc9_t6kDi_Kz2J4y01YfvK8bBt-ca553870a176fbd78b23.mp4"
  ],
  [
    "assets/portfolio/15PAo02r-yt3T4yBWmMfjtvOQAB4Xi-hq/6e422e_cd3b146174524099b6de7937bf7ee62d.mp4",
    "6e422e_cd3b146174524099b6de7937bf7ee62d-21e818a4bb60ef016b2d.mp4"
  ],
  [
    "assets/portfolio/15PAo02r-yt3T4yBWmMfjtvOQAB4Xi-hq/6e422e_d2f739179d7c49f6b8add9e5292dfb79.mp4",
    "6e422e_d2f739179d7c49f6b8add9e5292dfb79-eaefa67739428bb757a5.mp4"
  ],
  [
    "assets/imported/o33/instagram/C0lLl23vr6u.mp4",
    "C0lLl23vr6u-09a2abcc546e75e3a4a0.mp4"
  ],
  [
    "assets/imported/o33/drive/144rezPqGCX559ZlFMSnmLZ_H6Ymx4sXH.mp4",
    "144rezPqGCX559ZlFMSnmLZ_H6Ymx4sXH-4232f4bc9d9c3a7c3bcf.mp4"
  ],
  [
    "assets/portfolio/13U1vCVeJMizkXMamFXhcSUfER4dMg8RI/6e422e_6066de373be2408ea3cab64744d8d5df.mp4",
    "6e422e_6066de373be2408ea3cab64744d8d5df-a974e90a5ad9f17feb90.mp4"
  ],
  [
    "assets/imported/o34/instagram/ClOQCdCrWf3.mp4",
    "ClOQCdCrWf3-48bc725692c925257d01.mp4"
  ],
  [
    "assets/imported/o34/drive/16UJANQ1MSjKaN1XC8cUlsIs4l5iMiY6W.mp4",
    "16UJANQ1MSjKaN1XC8cUlsIs4l5iMiY6W-428dac9d2656bd91ce52.mp4"
  ],
  [
    "assets/portfolio/1_Kw87ovGpiZaIlxf7IErssUdoZ3X14oE/6e422e_06bfad2d450b453cb4939545f931d9f2.mp4",
    "6e422e_06bfad2d450b453cb4939545f931d9f2-4825ab65b700acb6cb69.mp4"
  ],
  [
    "assets/imported/o36/instagram/CfTNpolNrMp.mp4",
    "CfTNpolNrMp-1cf91577c94dd0d75fb5.mp4"
  ],
  [
    "assets/portfolio/1mXDiXFnazJ836O_QmpJhfo-YOEgkj5Bq/at-52e2da_6344615d79544622b3db80a650e84180.mp4",
    "at-52e2da_6344615d79544622b3db80a650e84180-b6ba2d3acdebaa64d544.mp4"
  ],
  [
    "assets/imported/o39/drive/108IxcJePyZR4BF5QpjzX9ONRd2A0HLSX.mp4",
    "108IxcJePyZR4BF5QpjzX9ONRd2A0HLSX-d4ae2683ddc35c621800.mp4"
  ],
  [
    "assets/portfolio/1MKyea3H-xjJghrxSm9HO-Zz9n3l4heaH/at-52e2da_007a7548effd46a287d77cd2e48fd4e1.mp4",
    "at-52e2da_007a7548effd46a287d77cd2e48fd4e1-1a616566b8694c5df6fe.mp4"
  ],
  [
    "assets/imported/o41/instagram/Cmx9c9RJtuV.mp4",
    "Cmx9c9RJtuV-695454e906555d5acab0.mp4"
  ],
  [
    "assets/portfolio/1zgvgf7nFR3YSS9hyUBtbHW1ov6sM6w0k/drive-1Xc8Sw7Q-4oXyWeTVBuke0WIq6f3CzBLl.mp4",
    "drive-1Xc8Sw7Q-4oXyWeTVBuke0WIq6f3CzBLl-8444fbd0140100041e2a.mp4"
  ],
  [
    "assets/portfolio/at-xrj9r/at-52e2da_ab25ca98d56b4831ae7165b4f225c6ef.mp4",
    "at-52e2da_ab25ca98d56b4831ae7165b4f225c6ef-eff0f0efd0f3198909ed.mp4"
  ],
  [
    "assets/imported/o44/drive/15yUmT8ROhF2nPdcvzvdRkL8E8weaMNtR.mp4",
    "15yUmT8ROhF2nPdcvzvdRkL8E8weaMNtR-423558b499ea3003a178.mp4"
  ],
  [
    "assets/portfolio/1R3_LaXZYXtwEW6W7xxrHkB7byCUN6Tjl/6e422e_176a3b5a717f4f0481f3ce37cb074470.mp4",
    "6e422e_176a3b5a717f4f0481f3ce37cb074470-bb296270096f39debb95.mp4"
  ],
  [
    "assets/portfolio/wix-35f86cde-dd04-4071-9dea-a3d755da871e/6e422e_4a6904ffaff74db68a93fb3c9fe92812.mp4",
    "6e422e_4a6904ffaff74db68a93fb3c9fe92812-1e976a3a8e17d394aa7a.mp4"
  ],
  [
    "assets/portfolio/1VvuqxdUW2jjzA5e_ndIebagvWs795-I2/drive-1BZwd0SQdjhqDOZ8k1377MCWOJl_tOc_G.mp4",
    "drive-1BZwd0SQdjhqDOZ8k1377MCWOJl_tOc_G-b52ced2f9d6dc8a4d5b8.mp4"
  ],
  [
    "assets/portfolio/1VvuqxdUW2jjzA5e_ndIebagvWs795-I2/drive-1pKBatAbOT22bQuZJL6TZZjUIjcZhmhES.mp4",
    "drive-1pKBatAbOT22bQuZJL6TZZjUIjcZhmhES-cb0c4217df45e0f3cb88.mp4"
  ]
];

return {NATIVE_VIDEO_FILES};
})();
const m10=(()=>{
const {NATIVE_VIDEO_FILES}=m11;

const archiveRoot='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/';
const files=new Map(NATIVE_VIDEO_FILES.flatMap(([source,name])=>[[source,name],[archiveRoot+name,name]]));
// Resolve only at playback. Draft IDs, selections, removals and source archives
// keep their original URLs, including drafts created before this delivery fix.
function videoPlaybackSource(src,site=globalThis.document?.baseURI){
 let name=files.get(src);
 if(!name&&site){try{const url=new URL(src,site),root=new URL('./',site);if(!url.username&&!url.password&&!url.search&&!url.hash&&url.origin===root.origin&&url.pathname.startsWith(root.pathname))name=files.get(url.pathname.slice(root.pathname.length));}catch{}}
 if(!name)return src;
 const path='assets/web-video-v1/'+name;
 return site?new URL(path,site).href:path;
}

return {videoPlaybackSource};
})();
const m12=(()=>{
// The official SDK is loaded separately; this controller creates players on demand.
// Official APIs: https://github.com/vimeo/player.js#readme
// Parameters: https://help.vimeo.com/hc/en-us/articles/12426260232977-About-Player-Parameters

function normalizeVimeoEmbedUrl(src) {
  let url;
  try {
    if (typeof src !== 'string') throw new TypeError();
    url = new URL(src);
  } catch {
    throw new TypeError('Expected an absolute Vimeo player URL.');
  }
  if (url.origin !== 'https://player.vimeo.com' || url.username || url.password ||
      !/^\/video\/[1-9][0-9]*\/?$/.test(url.pathname)) {
    throw new TypeError('Only https://player.vimeo.com/video/<numeric ID> is supported.');
  }
  // Preserve observed hashes, privacy h tokens and other query parameters.
  // These explicit overrides enforce manual playback and retain native controls.
  const policy = {
    dnt: '1', title: '0', byline: '0', portrait: '0',
    autoplay: '0', playsinline: '1', controls: '1', background: '0'
  };
  for (const [name, value] of Object.entries(policy)) url.searchParams.set(name, value);
  return url.href;
}

function createVimeoPlayer(iframe) {
  const Player = globalThis.Vimeo?.Player;
  if (typeof Player !== 'function') {
    const error = new Error('The Vimeo player library is unavailable. Please try again.');
    error.name = 'VimeoUnavailableError';
    throw error;
  }
  return new Player(iframe);
}

function ignoreFailure(call) {
  try { return Promise.resolve(call()).catch(() => {}); }
  catch { return Promise.resolve(); }
}

function observe(callback, detail) {
  // Host callbacks must not interrupt player teardown or create unhandled rejections.
  ignoreFailure(() => callback(detail));
}

function errorMessage(error, reason) {
  if (reason === 'timeout') return 'Vimeo took too long to load. Check your connection and try again.';
  if (error?.name === 'PrivacyError') return 'Vimeo restricts access to this film. Please choose another film or try again.';
  if (error?.name === 'PasswordError') return 'This Vimeo film is password protected. Please choose another film or try again.';
  const detail = typeof error?.message === 'string' ? error.message.slice(0, 240) : '';
  return detail ? `This Vimeo film could not load: ${detail}` : 'This Vimeo film could not load. Please try again.';
}

/**
 * open(media) -> Promise<{status: 'ready'|'error'|'closed', ...media}>.
 * Invalid URLs reject before touching an active film. A later SDK error is
 * reported through onStatus even after open() has resolved ready.
 * onStatus receives {status, message, reason?, src, sourcePage, title}.
 * onPlay receives media; the host should pause its native videos there.
 * Call pause() before opening other media, and close() when leaving the viewer.
 * close() detaches synchronously; its Promise only awaits best-effort SDK cleanup.
 */
function mountVimeoPlayer(slot, {
  document: doc = slot?.ownerDocument ?? globalThis.document,
  createPlayer = createVimeoPlayer,
  onStatus = () => {},
  onPlay = () => {},
  timeoutMs = 15000,
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout
} = {}) {
  if (!slot?.appendChild || !doc?.createElement) throw new TypeError('A DOM slot and document are required.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be positive.');
  let current = null;

  const live = session => current === session && !session.disposed;
  const notify = (session, status, message, reason) => observe(onStatus, {
    ...session.media, status, message, ...(reason ? {reason} : {})
  });
  function settle(session, status, message = '') {
    if (session.settled) return;
    session.settled = true;
    session.resolve({...session.media, status, message});
  }
  function stop(session, keepRoot = false) {
    if (session.timer !== null) { cancel(session.timer); session.timer = null; }
    if (!session.disposed) {
      session.disposed = true;
      const player = session.player;
      if (player) {
        ignoreFailure(() => player.off('play', session.handlePlay));
        ignoreFailure(() => player.off('error', session.handleError));
        ignoreFailure(() => player.pause());
        session.cleanup = ignoreFailure(() => player.destroy());
      }
      // Do not wait for a blocked provider, a rejected pause, or destroy Promise.
      // Detaching and navigating this particular frame releases its browsing context.
      session.iframe.remove();
      session.iframe.src = 'about:blank';
      session.player = null;
    }
    if (!keepRoot) {
      if (session.retry) session.retry.removeEventListener('click', session.handleRetry);
      session.root.remove();
    }
    return session.cleanup;
  }
  function fail(session, error, reason = 'sdk-error') {
    if (!live(session)) return;
    session.phase = 'error';
    const message = errorMessage(error, reason);
    stop(session, true);
    session.root.setAttribute('aria-busy', 'false');
    session.message.hidden = false;
    session.message.setAttribute('role', 'alert');
    session.message.textContent = message;
    session.retry = doc.createElement('button');
    session.retry.type = 'button';
    session.retry.textContent = 'Retry film';
    session.handleRetry = () => {
      if (current === session && session.phase === 'error') void open(session.media);
    };
    session.retry.addEventListener('click', session.handleRetry);
    session.root.appendChild(session.retry);
    settle(session, 'error', message);
    notify(session, 'error', message, reason);
  }
  function close() {
    const session = current;
    if (!session) return Promise.resolve();
    current = null; // Invalidate callbacks before any SDK cleanup can run.
    session.phase = 'closed';
    const cleanup = stop(session);
    settle(session, 'closed');
    notify(session, 'closed', 'Film closed.');
    return cleanup;
  }
  function open(media = {}) {
    let normalized;
    try { normalized = normalizeVimeoEmbedUrl(media.src); }
    catch (error) { return Promise.reject(error); }
    if (current) {
      const previous = current;
      current = null;
      previous.phase = 'closed';
      stop(previous);
      settle(previous, 'closed');
    }
    const root = doc.createElement('div');
    root.className = 'vimeo-player';
    root.style.width = '100%';
    root.style.height = '100%';
    root.setAttribute('aria-busy', 'true');
    const message = doc.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = 'Loading Vimeo film…';
    const iframe = doc.createElement('iframe');
    iframe.src = normalized;
    iframe.title = typeof media.title === 'string' && media.title.trim() ? media.title : 'Vimeo film';
    iframe.hidden = true;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('frameborder', '0');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    root.appendChild(message);
    root.appendChild(iframe);
    slot.appendChild(root);
    const session = {
      media: {src: normalized, sourcePage: typeof media.sourcePage === 'string' ? media.sourcePage : '', title: iframe.title},
      root, message, iframe, phase: 'loading', disposed: false, settled: false,
      timer: null, player: null, cleanup: Promise.resolve(), resolve: null, retry: null
    };
    const result = new Promise(resolve => { session.resolve = resolve; });
    current = session;
    session.handlePlay = () => { if (live(session)) observe(onPlay, session.media); };
    session.handleError = error => fail(session, error);
    try {
      session.player = createPlayer(iframe);
      session.player.on('play', session.handlePlay);
      session.player.on('error', session.handleError);
      if (live(session)) {
        session.timer = schedule(() => fail(session, null, 'timeout'), timeoutMs);
        Promise.resolve(session.player.ready()).then(() => {
          if (!live(session) || session.phase !== 'loading') return;
          session.phase = 'ready';
          cancel(session.timer);
          session.timer = null;
          iframe.hidden = false;
          message.hidden = true;
          root.setAttribute('aria-busy', 'false');
          settle(session, 'ready');
          notify(session, 'ready', 'Ready. Press play to start the film.');
        }, error => fail(session, error));
      }
    } catch (error) { fail(session, error); }
    if (live(session)) notify(session, 'loading', message.textContent);
    return result;
  }
  async function pause() {
    const session = current;
    if (!session || !live(session) || !session.player) return false;
    try { await session.player.pause(); return live(session); }
    catch (error) { if (live(session)) fail(session, error, 'pause-error'); return false; }
  }
  return {open, pause, close};
}

return {normalizeVimeoEmbedUrl,createVimeoPlayer,mountVimeoPlayer};
})();
const m9=(()=>{
const {videoPlaybackSource}=m10;

const {safeMediaUrl}=m2;

const {mountVimeoPlayer,createVimeoPlayer,normalizeVimeoEmbedUrl}=m12;

function mountAdminVideoPreview(dialog,{site,document:doc=dialog.ownerDocument,createVimeo=mountVimeoPlayer,createPlayer=createVimeoPlayer}={}){
 const find=id=>dialog.querySelector('#'+id),video=find('preview-native'),slot=find('preview-vimeo'),status=find('video-preview-status');
 const previous=find('video-preview-previous'),next=find('video-preview-next');
 let playlist=[],index=0,context='',active=null,serial=0,returnFocus=null,vimeoPlayer=null;
 const message=(session,copy,phase)=>{if(active!==session)return;status.textContent=copy;dialog.dataset.playback=phase;};
 const offerPlay=session=>{if(!doc.hidden&&dialog.dataset.playback!=='error')message(session,'撳播放器內嘅播放鍵開始預覽。','ready');};
 const vimeo=createVimeo(slot,{document:doc,createPlayer:iframe=>{vimeoPlayer=createPlayer(iframe);return vimeoPlayer;},onStatus:state=>{
  const session=active;if(!session||session.type!=='vimeo'||state.src!==session.normalized)return;
  if(state.status==='loading')message(session,'正在載入 Vimeo 影片…','loading');
  if(state.status==='ready'&&!doc.hidden&&dialog.dataset.playback!=='playing')message(session,'影片已就緒，可以播放、拖時間軸或全螢幕。','ready');
  if(state.status==='error')message(session,'Vimeo 影片未能載入。'+state.message,'error');
 },onPlay:()=>{if(active?.type==='vimeo'){video.pause();message(active,'播放中','playing');}}});
 function release(){
  serial++;const session=active;active=null;
  if(session?.removeListeners)session.removeListeners();
  video.pause();video.removeAttribute('src');video.removeAttribute('poster');video.load();video.hidden=true;
  void vimeo.close();vimeoPlayer=null;slot.hidden=true;
 }
 function close(){release();playlist=[];dialog.dataset.playback='closed';if(dialog.open)dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
 function validate(film){
  if(!film||!['video','vimeo'].includes(film.type)||!safeMediaUrl(film.src))throw Error('影片預覽需要有效嘅影片網址');
  if(film.type==='vimeo')normalizeVimeoEmbedUrl(film.src);
 }
 function show(target){
  if(target<0||target>=playlist.length)return;const film=playlist[target];validate(film);release();index=target;
  const session={id:++serial,type:film.type,normalized:film.type==='vimeo'?normalizeVimeoEmbedUrl(film.src):''};active=session;
  const path=new URL(film.src,site).pathname;let filename=path.split('/').at(-1)||'';try{filename=decodeURIComponent(filename);}catch{}
  find('video-preview-title').textContent=film.label||film.alt||('影片 '+(index+1));
  find('video-preview-context').textContent=context;
  find('video-preview-filename').textContent=film.type==='vimeo'?'Vimeo · '+path:filename;
  find('video-preview-count').textContent=(index+1)+' / '+playlist.length+' 條影片';previous.disabled=index===0;next.disabled=index===playlist.length-1;
  message(session,'正在載入影片…','loading');
  if(film.type==='vimeo'){
   slot.hidden=false;
   const opening=vimeo.open({src:film.src,title:film.label||'影片預覽'}),player=vimeoPlayer;
   void Promise.resolve(opening).then(result=>{
    if(active!==session||doc.hidden||result.status!=='ready'||!player?.play)return;
    return Promise.resolve(player.play()).catch(()=>offerPlay(session));
   }).catch(()=>message(session,'影片未能載入，請稍後重試。','error'));
  }else{
   video.hidden=false;video.controls=true;video.playsInline=true;video.preload='metadata';video.src=new URL(videoPlaybackSource(film.src,site),site).href;
   if(film.poster&&safeMediaUrl(film.poster))video.poster=new URL(film.poster,site).href;
   const events={loadedmetadata:()=>{if(!video.paused)return;const seconds=Number.isFinite(video.duration)?Math.floor(video.duration):0;message(session,'影片已就緒'+(seconds?' · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'')+'，可以播放或拖時間軸。','ready');},play:()=>message(session,'播放中','playing'),pause:()=>message(session,'已暫停，可以拖時間軸辨認影片。','paused'),ended:()=>message(session,'影片已播完，可切換下一條。','ended'),error:()=>message(session,'影片未能載入。請檢查來源網址，或稍後重試。','error')};
   for(const [name,handler]of Object.entries(events))video.addEventListener(name,handler);
   session.removeListeners=()=>{for(const [name,handler]of Object.entries(events))video.removeEventListener(name,handler);};
   try{void Promise.resolve(video.play()).catch(()=>offerPlay(session));}catch{offerPlay(session);}
  }
 }
 function open(items,{src,context:label='',trigger=doc.activeElement}={}){
  const films=items.filter(item=>item.type==='video'||item.type==='vimeo'),target=films.findIndex(item=>item.src===src);
  if(target<0)throw Error('搵唔到要預覽嘅影片');validate(films[target]);playlist=films;context=label;returnFocus=trigger;
  if(!dialog.open)dialog.showModal();show(target);
 }
 find('video-preview-close').addEventListener('click',close);previous.addEventListener('click',()=>show(index-1));next.addEventListener('click',()=>show(index+1));
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(active)close();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();});
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden||!active)return;video.pause();void vimeo.pause();message(active,'已暫停，返回後可以繼續播放。','paused');});
 doc.defaultView?.addEventListener('pagehide',close);
 return {open,close};
}

return {mountAdminVideoPreview};
})();
const m14=(()=>{
const {mediaRank,orderedMedia,normalizeMedia,mediaForEditor}=m2;

// Move each selected set within its category; keep the owner's video/photo/design order.
function moveMediaSelection(items,selected,action,position=1){
 const chosen=new Set(selected),result=[];
 for(const rank of [0,1,2]){
  const group=items.filter(item=>mediaRank(item)===rank).map(item=>({...item}));
  if(action==='up'){for(let i=1;i<group.length;i++)if(chosen.has(group[i].src)&&!chosen.has(group[i-1].src))[group[i-1],group[i]]=[group[i],group[i-1]];}
  else if(action==='down'){for(let i=group.length-2;i>=0;i--)if(chosen.has(group[i].src)&&!chosen.has(group[i+1].src))[group[i],group[i+1]]=[group[i+1],group[i]];}
  else{
   const moving=group.filter(item=>chosen.has(item.src)),rest=group.filter(item=>!chosen.has(item.src));
   const at=action==='first'?0:action==='last'?rest.length:Math.max(0,Math.min(rest.length,Math.trunc(Number(position)||1)-1));
   rest.splice(at,0,...moving);group.splice(0,group.length,...rest);
  }
  result.push(...group);
 }
 return result;
}
function rememberLibrary(doc,items){
 doc.library??={items:[],removed:[]};
 const records=new Map(doc.library.items.map(item=>[item.src,item]));for(const item of items)records.set(item.src,normalizeMedia(item));
 doc.library.items=orderedMedia([...records.values()]);
}
function removeProjectMedia(doc,project,selected){
 const chosen=new Set(selected),items=mediaForEditor(project);rememberLibrary(doc,items.filter(item=>chosen.has(item.src)));
 doc.overrides[project.id]??={};doc.overrides[project.id].media=items.filter(item=>!chosen.has(item.src)).map(item=>{for(const key of ['poster','thumbnail'])if(chosen.has(item[key]))delete item[key];return item;});
}
function removeLibraryMedia(doc,items){rememberLibrary(doc,items);doc.library.removed=[...new Set([...doc.library.removed,...items.map(item=>item.src)])];}
function restoreLibraryMedia(doc,sources){const chosen=new Set(sources);if(doc.library)doc.library.removed=doc.library.removed.filter(src=>!chosen.has(src));}
function selectionDescription(items){const counts=[items.filter(m=>m.type!=='image').length,items.filter(m=>m.type==='image'&&m.mediaKind!=='graphic').length,items.filter(m=>m.type==='image'&&m.mediaKind==='graphic').length];return counts.map((count,i)=>count?count+[' 條影片',' 張相片',' 張設計圖'][i]:'').filter(Boolean).join('、');}
function createLongPress({onSelect,schedule=globalThis.setTimeout,cancel=globalThis.clearTimeout,now=()=>Date.now(),delay=480}={}){
 let timer=null,start=null,suppressUntil=0;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;start=null;};
 return {start(event){clear();if(event.button!==undefined&&event.button!==0)return;start={x:event.clientX,y:event.clientY};timer=schedule(()=>{timer=null;start=null;suppressUntil=now()+800;onSelect();},delay);},move(event){if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)clear();},cancel:clear,suppressClick(){return now()<suppressUntil;}};
}

return {moveMediaSelection,rememberLibrary,removeProjectMedia,removeLibraryMedia,restoreLibraryMedia,selectionDescription,createLongPress};
})();
const m13=(()=>{
const {mediaForEditor,mediaRank,safeMediaUrl,normalizeVimeoInput}=m2;

const {moveMediaSelection,selectionDescription,createLongPress}=m14;

const make=(tag,cls='',text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const action=(text,handler,cls='')=>{const button=make('button',cls,text);button.type='button';button.addEventListener('click',handler);return button;};
function mountMediaManager(container,project,{state,site,getProject,onChange,onRemove,onNotice,onPreview}={}){
 const items=mediaForEditor(project),available=new Set(items.map(item=>item.src));
 if(state.projectId!==project.id){state.projectId=project.id;state.selected=new Set();state.anchor=null;state.mode=false;}
 state.selected=new Set([...state.selected].filter(src=>available.has(src)));state.layout??='grid';
 container.className='media-manager';
 const toolbar=make('div','media-bulk-bar'),summary=make('span','media-selection-count');summary.setAttribute('role','status');
 const top=make('div','media-bulk-top'),selectActions=make('div','media-bulk-actions');top.append(summary,selectActions);toolbar.append(top);
 const rows=new Map(),moves=[];
 const chosen=()=>items.filter(item=>state.selected.has(item.src));
 function refresh(){
  summary.textContent=state.selected.size?'已選 '+selectionDescription(chosen()):'未選取素材';container.classList.toggle('is-selecting',state.mode);
  for(const [src,{row,check}]of rows){check.checked=state.selected.has(src);row.classList.toggle('is-selected',check.checked);}
  remove.disabled=!state.selected.size;clear.disabled=!state.selected.size;at.disabled=position.disabled=!state.selected.size;
  for(const [button,direction]of moves){const moved=moveMediaSelection(items,state.selected,direction);button.disabled=!state.selected.size||moved.every((item,i)=>item.src===items[i].src);}
 }
 function toggle(src,event={},force){
  const index=items.findIndex(item=>item.src===src);state.mode=true;
  if(event.shiftKey&&state.anchor!==null){const anchor=items.findIndex(item=>item.src===state.anchor);for(let i=Math.min(index,anchor<0?index:anchor);i<=Math.max(index,anchor<0?index:anchor);i++)state.selected.add(items[i].src);}
  else{const select=force??!state.selected.has(src);if(select)state.selected.add(src);else state.selected.delete(src);}
  state.anchor=src;refresh();
 }
 selectActions.append(action('全選相片',()=>{state.mode=true;state.selected=new Set(items.filter(item=>item.type==='image'&&mediaRank(item)===1).map(item=>item.src));refresh();}),action('全選本作品',()=>{state.mode=true;state.selected=new Set(items.map(item=>item.src));refresh();}));
 const clear=action('取消選取',()=>{state.selected.clear();state.mode=false;refresh();});selectActions.append(clear,action(state.layout==='grid'?'顯示詳細資料':'顯示縮圖',()=>{state.layout=state.layout==='grid'?'detail':'grid';onChange(null,{uiOnly:true});}));
 const moveActions=make('div','media-bulk-actions');toolbar.append(moveActions);
 for(const [label,direction]of [['上移一格','up'],['下移一格','down'],['移到最前','first'],['移到最後','last']]){const button=action(label,()=>onChange(moveMediaSelection(mediaForEditor(getProject()),state.selected,direction)));moves.push([button,direction]);moveActions.append(button);}
 const position=make('input','media-position');position.type='number';position.min='1';position.max=String(Math.max(1,items.length));position.value='1';position.setAttribute('aria-label','同類素材目標位置');
 const positionLabel=make('label','media-position-label','同類第 ');positionLabel.append(position,document.createTextNode(' 位'));
 const at=action('移到指定位置',()=>{if(!position.checkValidity()){position.reportValidity();return;}onChange(moveMediaSelection(mediaForEditor(getProject()),state.selected,'position',position.value));});
 const remove=action('移除已選素材',()=>onRemove(chosen()),'danger-action');moveActions.append(positionLabel,at,remove);
 toolbar.append(make('p','small','長按縮圖進入多選，亦可勾選、Shift 連選。批量移動會保留相片先後次序；影片、相片、設計圖分組排序。'));
 container.append(toolbar);
 if(!items.length){container.append(make('p','help-box','呢個作品暫時未有素材。你可以新增公開圖片或影片連結。'));refresh();return;}
 for(const rank of [0,1,2]){
  const members=items.filter(item=>mediaRank(item)===rank);if(!members.length)continue;
  const section=make('section','media-group'),heading=make('h4','media-group-title',`${['影片','相片','設計圖'][rank]} · ${members.length}`),grid=make('div','media-items '+(state.layout==='grid'?'media-grid':'media-detail'));section.append(heading,grid);container.append(section);
  for(const item of members){
   const index=items.findIndex(value=>value.src===item.src),row=make('article','media-row');row.draggable=true;row.tabIndex=0;row.dataset.mediaSrc=item.src;
   const preview=make('div','media-preview'),check=make('input','media-select');check.type='checkbox';check.setAttribute('aria-label','選取素材 '+(index+1));check.addEventListener('click',event=>{event.stopPropagation();toggle(item.src,event,check.checked);});preview.append(check);
   const source=item.type==='image'?item.src:item.poster;
   if(source&&safeMediaUrl(source)){const image=make('img','media-thumb');image.src=new URL(source,site).href;image.alt=item.label||`素材 ${index+1}`;image.loading='lazy';image.draggable=false;image.addEventListener('contextmenu',event=>event.preventDefault());preview.append(image);}else preview.append(make('div','media-thumb media-placeholder',item.type==='image'?'IMAGE':'FILM'));
   if(item.type!=='image'&&onPreview){const play=action('預覽播放',event=>{event.stopPropagation();onPreview(item,event.currentTarget);},'media-preview-play');play.setAttribute('aria-label','預覽影片 '+(index+1)+(item.label?' · '+item.label:''));preview.append(play);}
   row.append(preview);const info=make('div','media-fields');info.append(make('p','small',`${String(index+1).padStart(2,'0')} / ${item.type==='vimeo'?'VIMEO':['FILM','PHOTO','DESIGN'][rank]}`));
   const label=make('input','media-name');label.value=item.label||item.alt||'';label.placeholder='素材名稱／說明';label.setAttribute('aria-label','素材 '+(index+1)+' 名稱');label.addEventListener('input',()=>{const all=mediaForEditor(getProject());const live=all.find(value=>value.src===item.src);if(!live)return;live.label=label.value;if(item.type==='image')live.alt=label.value;onChange(all,{render:false,list:false});});info.append(label);
   const url=make('input');url.value=item.src;url.setAttribute('aria-label','素材 '+(index+1)+' 網址');url.addEventListener('change',()=>{try{const value=item.type==='vimeo'?normalizeVimeoInput(url.value):url.value.trim();if(!safeMediaUrl(value))throw Error('請用有效 HTTPS 網址或現有 assets 路徑');const all=mediaForEditor(getProject()),live=all.find(value=>value.src===item.src);if(!live)return;live.src=value;if(state.selected.delete(item.src))state.selected.add(live.src);onChange(all);}catch(error){url.value=item.src;onNotice(error.message,true);}});info.append(url);
   if(item.type!=='image'){const cover=make('input');cover.value=item.poster||'';cover.placeholder='封面圖片網址（選填）';cover.setAttribute('aria-label','素材 '+(index+1)+' 封面');cover.addEventListener('change',()=>{if(cover.value&&!safeMediaUrl(cover.value.trim())){onNotice('封面需要有效 HTTPS 網址',true);return;}const all=mediaForEditor(getProject()),live=all.find(value=>value.src===item.src);if(live){live.poster=cover.value.trim();onChange(all);}});info.append(cover);}row.append(info);
   const controls=make('div','media-controls');
   for(const [label,direction,delta]of [['上移','up',-1],['下移','down',1]]){const move=action(label,()=>onChange(moveMediaSelection(mediaForEditor(getProject()),[item.src],direction)));move.setAttribute('aria-label',label+'素材 '+(index+1));move.disabled=!items[index+delta]||mediaRank(items[index+delta])!==rank;controls.append(move);}
   controls.append(action('移除',()=>onRemove([item]),'remove-media'));row.append(controls);
   const gesture=createLongPress({onSelect:()=>toggle(item.src,{},true)});
   row.addEventListener('pointerdown',event=>{row.draggable=event.pointerType!=='touch'&&event.pointerType!=='pen';if(!event.target.closest('input,button,label'))gesture.start(event);});row.addEventListener('pointermove',gesture.move);row.addEventListener('pointerup',gesture.cancel);row.addEventListener('pointercancel',gesture.cancel);
   row.addEventListener('click',event=>{if(event.target.closest('input,button,label')||gesture.suppressClick()||Date.now()<(state.dragUntil||0))return;if(state.mode||event.ctrlKey||event.metaKey||event.shiftKey)toggle(item.src,event);else toggle(item.src,{},true);});
   row.addEventListener('keydown',event=>{if(event.target===row&&(event.key===' '||event.key==='Enter')){event.preventDefault();toggle(item.src,event);}});
   row.addEventListener('dragstart',event=>{gesture.cancel();if(event.target.closest('input,button')){event.preventDefault();return;}state.dragSources=state.selected.has(item.src)?[...state.selected]:[item.src];state.dragUntil=Date.now()+1000;event.dataTransfer.setData('text/plain',item.src);event.dataTransfer.effectAllowed='move';});
   row.addEventListener('dragover',event=>{event.preventDefault();row.classList.add('drag-over');});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
   row.addEventListener('drop',event=>{event.preventDefault();row.classList.remove('drag-over');const sources=state.dragSources||[];state.dragSources=[];if(!sources.length||sources.includes(item.src))return;const all=mediaForEditor(getProject());if(all.some(value=>sources.includes(value.src)&&mediaRank(value)!==rank)){onNotice('請喺同一類素材之間拖動排序。');return;}const rest=all.filter(value=>mediaRank(value)===rank&&!sources.includes(value.src)),at=rest.findIndex(value=>value.src===item.src)+1;onChange(moveMediaSelection(all,sources,'position',at));});
   row.addEventListener('dragend',()=>{state.dragSources=[];state.dragUntil=Date.now()+500;});rows.set(item.src,{row,check});grid.append(row);
  }
 }
 container.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!event.target.closest('input,textarea,select')){event.preventDefault();state.selected=new Set(items.map(item=>item.src));state.mode=true;refresh();}});
 refresh();
}

return {mountMediaManager};
})();
const m15=(()=>{
// Creative-direction case studies written from the owner-provided interview.
// Editorial copy. Do not present exploratory elements as executed.
const PROJECT_STORIES = {
  "19XhwSYzZ8gheZZVxhBB17S0_IruFdHeW": {
    "id": "19XhwSYzZ8gheZZVxhBB17S0_IruFdHeW",
    "title": "Mercedes-Benz — C-Class Launch",
    "eyebrow": "A FIRST PITCH WIN",
    "intro": "A car launch reimagined as an audiovisual performance, using architecture, art and light to build anticipation before the reveal.",
    "challenge": "Freespace offered exceptional ceiling height and rigging points. The opportunity was to turn those technical advantages into a memorable launch rather than a conventional product presentation.",
    "approach": "I pitched an artist-led light-and-shadow unveiling with Keith Lam, shaping the venue into a storytelling environment where the performance became part of the car reveal.",
    "role": "Pitch concept, creative direction, artist collaboration, and production coordination.",
    "outcome": "The pitch was won and the event went ahead despite Typhoon Signal No. 8. The client and artist team responded enthusiastically to the outcome.",
    "highlights": [
      "Artist-led unveiling",
      "Light and shadow storytelling",
      "Freespace architectural integration"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1mXDiXFnazJ836O_QmpJhfo-YOEgkj5Bq": {
    "id": "1mXDiXFnazJ836O_QmpJhfo-YOEgkj5Bq",
    "title": "Mercedes-Benz EQXX Launch Exhibition",
    "eyebrow": "OTHERWORLDLY BY DESIGN",
    "intro": "An unconventional exhibition world where future mobility met surreal, sculptural nature.",
    "challenge": "The team needed to present four vehicles within a constrained footprint while making the space feel distinctive, inviting and worthy of discovery.",
    "approach": "I explored a dramatic overhead portal for an AR-driven social experience, then developed an alien botanical language with a florist: metallic-sprayed plants and a twisted, transparent mushroom form.",
    "role": "Pitch development, spatial concept, material research, and specialist collaboration.",
    "outcome": "The botanical installation concept received client approval without design revisions. The more ambitious overhead AR portal was explored but not realized because of budget limitations.",
    "highlights": [
      "Surreal botanical art direction",
      "Compact four-car spatial planning",
      "AR portal proposal"
    ],
    "stage": "executed-with-unrealised-proposal",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1Y5JQ1Kzp1r2kRrw62sgNI6l7o8Hj0HKD": {
    "id": "1Y5JQ1Kzp1r2kRrw62sgNI6l7o8Hj0HKD",
    "title": "Mercedes-Benz Experience Day 2021",
    "eyebrow": "MB AGENT",
    "intro": "An after-sales customer event transformed into a clue-led adventure.",
    "challenge": "Make a service-focused customer experience feel exciting and participatory rather than informational.",
    "approach": "The MB Agent concept used a digital pass and UV-revealed clues to guide guests through a playful challenge.",
    "role": "Winning pitch, experience concept and interactive activity direction.",
    "outcome": "The design gave visitors a reason to explore, participate and interact with the brand beyond the usual after-sales showcase.",
    "highlights": [
      "Digital mission pass",
      "UV-revealed clues",
      "Gamified guest journey"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1_Kw87ovGpiZaIlxf7IErssUdoZ3X14oE": {
    "id": "1_Kw87ovGpiZaIlxf7IErssUdoZ3X14oE",
    "title": "Mercedes-Benz Experience Day 2022",
    "eyebrow": "TEAM UP PLAYLAND",
    "intro": "A high-energy playground built around teamwork, friendly competition and shared moments.",
    "challenge": "Bring fresh energy to a traditionally functional automotive customer event.",
    "approach": "I developed team-based interactive tasks, including a lightbox quiz, matching-box challenges and balloon-inflation activities.",
    "role": "Winning pitch, creative direction, activity design and experience planning.",
    "outcome": "The competitive format sparked lively audience participation and enthusiastic cheers.",
    "highlights": [
      "Team-based challenges",
      "Interactive lightbox quiz",
      "Live audience engagement"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "13U1vCVeJMizkXMamFXhcSUfER4dMg8RI": {
    "id": "13U1vCVeJMizkXMamFXhcSUfER4dMg8RI",
    "title": "Mercedes-Benz Experience Day 2023",
    "eyebrow": "BON APPÉTIT",
    "intro": "An automotive customer event served with an unexpected culinary twist.",
    "challenge": "Find an approachable theme that could connect service, hospitality and participation across the full event.",
    "approach": "Bon Appétit brought the food theme into the experience through coordinated helper styling, themed gifts and visual storytelling. The key visual's hand was photographed against a wall in our own office.",
    "role": "Winning pitch, campaign idea, visual direction and event experience design.",
    "outcome": "The result was a cohesive, welcoming experience that made an after-sales occasion feel more playful and immersive.",
    "highlights": [
      "Food-led experience concept",
      "Art-directed gifts and wardrobe",
      "In-house key visual production"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "15PAo02r-yt3T4yBWmMfjtvOQAB4Xi-hq": {
    "id": "15PAo02r-yt3T4yBWmMfjtvOQAB4Xi-hq",
    "title": "Mercedes-Benz EQS SUV Launch",
    "eyebrow": "THE PIONEER'S JOURNEY",
    "intro": "An immersive car reveal that invited guests to move between live performance, interactive technology and sensory discovery.",
    "challenge": "Create a distinctive launch narrative at The Murray that went beyond a standard screen-led reveal.",
    "approach": "I helped develop a pioneer character who moved through the crowd, activated a cyber-inspired screen and led the performance. Guests checked their heartbeats to receive one of four mood-based postcards, each connected to a scent station.",
    "role": "Storyline, script, casting, audience journey and interactive experience direction.",
    "outcome": "The performance and scent interactions created engaging photo moments and a more personal connection with the launch story.",
    "highlights": [
      "Live character-led storytelling",
      "Heartbeat-to-scent interaction",
      "Screen-synced performance"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1XVL41h99QcZDcYzZfl28SbsFy4QJNh4_": {
    "id": "1XVL41h99QcZDcYzZfl28SbsFy4QJNh4_",
    "title": "Mercedes-Benz - Maybach — EQS SUV",
    "eyebrow": "WELCOME TO BEYOND",
    "intro": "A luxury launch inspired by the feeling of leaving Earth, designed as an intimate imagined journey into space.",
    "challenge": "Translate an aspirational space-travel experience into a physical luxury setting with strict production and budget constraints.",
    "approach": "Inspired by a Las Vegas space experience, I pitched a simulated ascent viewed through three windows, with satellite imagery, music and a toast to Earth. I also explored levitating drinks and a weightlessness-inspired VIP therapy experience.",
    "role": "Winning pitch, creative direction, spatial storytelling, experience design and vendor research.",
    "outcome": "The client responded positively to the immersive concept. Some ambitious effects remained exploratory because of budget limitations, rather than being presented as completed installations.",
    "highlights": [
      "Three-window simulated ascent",
      "Space Perspective-inspired narrative",
      "Experimental VIP experience research"
    ],
    "stage": "executed-with-unrealised-proposals",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp": {
    "id": "1TbCipQqe25zIREgvrAMoD9TyQuNkDiUp",
    "title": "Mercedes-Benz The new G-Class Range Launch",
    "eyebrow": "G ROAR",
    "intro": "A brand experience built on the G-Class's formidable character, connecting multiple zones through one bold creative idea.",
    "challenge": "Create a memorable photo moment and cinematic launch despite site restrictions, an unusually low showroom ceiling and complex vehicle movement.",
    "approach": "The G Roar concept carried a wave-inspired design across the venue. I secured approval for an outdoor mountain-style photo setting and collaborated on drone-led visuals synchronized with the screen.",
    "role": "Winning pitch, concept and spatial direction, specialist collaboration, and close oversight of technical feasibility.",
    "outcome": "The team carefully tested and executed an indoor G-turn, balancing the dramatic reveal with practical safety considerations. The outdoor installation became a popular check-in location.",
    "highlights": [
      "G Roar creative platform",
      "Mountain-inspired photo installation",
      "Tested indoor G-turn"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1wko49Yx2Tdk96dN_Tfj0HwOk9g5tKikO": {
    "id": "1wko49Yx2Tdk96dN_Tfj0HwOk9g5tKikO",
    "title": "Mercedes Benz - G-Class @ AIA Carnival",
    "eyebrow": "THE VIRTUAL SUMMIT",
    "intro": "A gamified experience designed to turn carnival footfall into meaningful brand engagement.",
    "challenge": "Stand out in a busy entertainment environment while giving visitors a reason to participate and connect with the brand.",
    "approach": "I pitched several game directions and refined the selected virtual mountaintop challenge. Reaching the summit earned free tokens, connecting the fun of the game with a participation and data-capture strategy.",
    "role": "Winning pitch, digital-game concept, guest incentive strategy and marketing experience development.",
    "outcome": "The client valued a solution that combined interactive creativity with a considered promotional strategy.",
    "highlights": [
      "Virtual mountaintop game",
      "Free-token incentive",
      "Engagement-led promotion"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1GfyV3sNkUN5jf38IkIePWYTmgj-64lX0": {
    "id": "1GfyV3sNkUN5jf38IkIePWYTmgj-64lX0",
    "title": "Porsche — Grand Opening",
    "eyebrow": "MODERN, NOT NEON",
    "intro": "A refined opening experience that brought fresh energy to the brand without relying on predictable automotive-event graphics.",
    "challenge": "Build a visually distinctive handover and opening event within the limits of a soft launch and lean budget.",
    "approach": "I proposed a contemporary purple visual direction with restrained, playful language instead of the overly saturated neon style often used in promotional settings. I also sourced a cost-conscious production solution for supporting details.",
    "role": "Winning pitch, visual identity, creative direction, and production sourcing.",
    "outcome": "The client responded positively to the modern graphic direction, and the concept stayed aligned with the event's practical constraints.",
    "highlights": [
      "Contemporary purple visual identity",
      "Brand-sensitive tone of voice",
      "Budget-conscious execution"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1AFiS56tpQYV45aNLxA2MNqM7ojQqaROV": {
    "id": "1AFiS56tpQYV45aNLxA2MNqM7ojQqaROV",
    "title": "Citic Group - Jardini",
    "eyebrow": "SECRET HOLLOW",
    "intro": "A pitch-winning environment centred on a distinctive Secret Hollow concept.",
    "challenge": "Create an immersive visual world that stood apart from more conventional branded event proposals.",
    "approach": "I led the creative thinking and proposal presentation, developing the Secret Hollow concept into a spatial experience.",
    "role": "Winning pitch, concept creation, creative direction and proposal leadership.",
    "outcome": "The Secret Hollow idea became the defining design language for the project.",
    "highlights": [
      "Secret Hollow concept",
      "Immersive spatial storytelling",
      "Pitch leadership"
    ],
    "stage": "executed",
    "evidence": "user-interview",
    "spotlight": true
  },
  "1VvuqxdUW2jjzA5e_ndIebagvWs795-I2": {
    "id": "1VvuqxdUW2jjzA5e_ndIebagvWs795-I2",
    "title": "Mercedes-Benz - CLA Car City Promotion",
    "eyebrow": "THE UNEXPECTED CLA",
    "intro": "A bold, youthfully styled CLA campaign proposal that blended a sophisticated brand language with playful family appeal.",
    "challenge": "Position the concept between a premium headquarters visual identity and the interests of younger families, while making the location work by day and night.",
    "approach": "I developed contrasting day-to-night views, glossy-ink graphics, balloon-inspired installations and photogenic frames. Remote-controlled balloon movement was explored as a possible enhancement.",
    "role": "Creative pitch leadership, visual concept, spatial design and presentation storytelling.",
    "outcome": "The proposal reached the final pitch round. Concepts presented here are pitching work and must not be described as executed installations.",
    "highlights": [
      "Finalist pitch",
      "Day-and-night visual concept",
      "Glossy-ink and balloon exploration"
    ],
    "stage": "pitch-concept-only",
    "evidence": "user-interview; project mapping from 2025 CLA title needs final owner review",
    "spotlight": true
  }
};
const projectStoryFor=(id,project)=>Object.prototype.hasOwnProperty.call(project||{},'story')?project.story:PROJECT_STORIES[id]||null;

return {PROJECT_STORIES,projectStoryFor};
})();
const m16=(()=>{
const {canonical}=m2;

const REPOSITORY='ankertam-cyber/anker-portfolio';
const API='https://api.github.com/repos/'+REPOSITORY;
const encodeContent=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);};
const decodeContent=value=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
function createGitHubPublisher({request=globalThis.fetch}={}){
 let credential='',sha=null,baseline='';
 async function api(route,options={}){
  const response=await request(API+route,{...options,redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(credential?{Authorization:'Bearer '+credential}:{}),...(options.body?{'Content-Type':'application/json'}:{})}});
  if(!response.ok){if(response.status===401)throw Error('GitHub 權限已失效，請重新連接');if(response.status===403)throw Error('GitHub 權限不足或暫時達到請求限制；請確認 Contents: Read and write、Actions: Read-only');if([409,422].includes(response.status))throw Error('GitHub 已有其他更新，請先重新載入正式內容，草稿仍保留');throw Error('GitHub 請求未完成（'+response.status+'），草稿仍保留');}return response.json();
 }
 async function remoteContent(){const file=await api('/contents/site/content.json?ref=main');if(file.encoding!=='base64'||!file.content||!file.sha)throw Error('無法讀取 GitHub 內容檔');return {sha:file.sha,doc:JSON.parse(decodeContent(file.content))};}
 return {
  async connect(token,published){credential=token.trim();sha=null;if(!credential)throw Error('請先輸入 GitHub token');try{const repo=await api('');if(repo.full_name!==REPOSITORY||!repo.permissions?.push)throw Error('呢個 token 未有本網站嘅寫入權限');const remote=await remoteContent();if(canonical(remote.doc)!==canonical(published))throw Error('GitHub 有較新內容，請下載草稿備份後重新載入正式內容');sha=remote.sha;baseline=canonical(published);return true;}catch(error){credential='';throw error;}},
  disconnect(){credential='';sha=null;baseline='';},
  connected(){return Boolean(credential&&sha);},
  async publish(doc,published){if(!credential||!sha)throw Error('請先連接 GitHub');if(canonical(published)!==baseline)throw Error('正式內容版本已改變，請重新連接 GitHub');const current=await remoteContent();if(current.sha!==sha)throw Error('GitHub 已有其他更新，請下載草稿備份後重新載入正式內容');const result=await api('/contents/site/content.json',{method:'PUT',body:JSON.stringify({message:'Update portfolio content from owner back office',branch:'main',sha,content:encodeContent(JSON.stringify(doc,null,2)+'\n')})});sha=result.content.sha;baseline=canonical(doc);return {sha:result.commit.sha,url:'https://github.com/'+REPOSITORY+'/commit/'+result.commit.sha,revision:doc.revision};},
  async deployment(commit){const data=await api('/actions/workflows/pages.yml/runs?head_sha='+encodeURIComponent(commit)+'&per_page=5');let run=data.workflow_runs?.find(r=>r.head_sha===commit);if(!run){const recent=await api('/actions/workflows/pages.yml/runs?per_page=20');run=recent.workflow_runs?.find(r=>r.head_sha===commit);}return run?{status:run.status,conclusion:run.conclusion,url:run.html_url}:null;}
 };
}

return {REPOSITORY,encodeContent,decodeContent,createGitHubPublisher};
})();
const m0=(()=>{
const {restoreOwnerDraft,ownerDraftStatus}=m1;

const {readPublishedContent,readSiteJson}=m5;

const {mountPhotoDuplicateManager}=m6;

const {mountAdminVideoPreview}=m9;

const {mountMediaManager}=m13;

const {rememberLibrary,removeProjectMedia,removeLibraryMedia,restoreLibraryMedia,selectionDescription,createLongPress}=m14;

const {DRAFT_KEY,PROFILE_DEFAULTS,emptyContent,clone,canonical,validateContent,applyContent,editableEntries,mediaForEditor,orderedMedia,mediaRank,normalizeVimeoInput,normalizeStory,safeMediaUrl,changeSummary,libraryInventory,normalizeMedia}=m2;

const {projectStoryFor}=m15;

const {createGitHubPublisher}=m16;

const $=id=>document.getElementById(id),SITE=new URL('../',location.href),PENDING_KEY='anker-portfolio-pending-v1';
const publisher=createGitHubPublisher();
const videoPreview=mountAdminVideoPreview($('video-preview-dialog'),{site:SITE});
const photoDuplicates=mountPhotoDuplicateManager($('duplicate-dialog'),{site:SITE,getProject:id=>projectById(id),getItems:(scope,id)=>{const names=new Map(currentEntries().map(p=>[p.id,p.title])),inventory=libraryInventory(entries,draft),bySource=new Map(inventory.map(item=>[item.src,item]));const items=scope==='project'?mediaForEditor(projectById(id)||{}):inventory.filter(item=>!item.removed);return items.map(item=>({...item,projectNames:(bySource.get(item.src)?.projectIds||[]).map(id=>names.get(id)).filter(Boolean)}));},onRemove:removeMedia});
let entries=[],published=emptyContent(),draft=emptyContent(),selected='',view='projects',ready=false,loadError=false,busy=false,storageOK=true,stale=false,undo=[],redo=[],dragProject='',dragMedia=-1,fieldId=0,monitorId=0;
const node=(tag,cls='',copy)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const currentEntries=()=>editableEntries(entries,draft);
const projectById=id=>currentEntries().find(p=>p.id===id);
const mediaUI={selected:new Set(),layout:'grid'},libraryUI={selected:new Set(),filter:'active',query:'',page:0};
let removalResolve=null;
let confirmResolve=null;
function ask(copy){$('confirm-copy').textContent=copy;$('confirm-dialog').showModal();return new Promise(resolve=>confirmResolve=resolve);}
function answer(value){$('confirm-dialog').close();const resolve=confirmResolve;confirmResolve=null;resolve?.(value);}
$('confirm-cancel').addEventListener('click',()=>answer(false));$('confirm-accept').addEventListener('click',()=>answer(true));$('confirm-dialog').addEventListener('cancel',event=>{event.preventDefault();answer(false);});
function notice(message,error=false){$('notice').hidden=!message;$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function button(copy,onClick,cls=''){const el=node('button',cls,copy);el.type='button';el.addEventListener('click',onClick);return el;}
function save(){
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify({draft,baseline:canonical(published),savedAt:new Date().toISOString()}));storageOK=true;$('draft-status').textContent='草稿已自動儲存 · 尚未發佈';}
 catch{storageOK=false;$('draft-status').textContent='瀏覽器無法儲存草稿，請下載備份';notice('草稿未能儲存。請先下載備份，並檢查瀏覽器儲存空間。',true);}
 updateToolbar();
}
function updateToolbar(){
 const changed=canonical(draft)!==canonical(published);
 for(const id of ['export-draft','import-draft','reload-published','preview','add-project'])$(id).disabled=!ready||busy;
 $('undo').disabled=!undo.length||busy||stale;$('redo').disabled=!redo.length||busy||stale;
 $('publish-open').disabled=!ready||busy||!changed||stale;
 $('project-search').disabled=$('project-filter').disabled=!ready||busy;
 $('connect-open').disabled=!ready||busy;
 $('editor').inert=busy||stale;$('project-list').inert=busy;$('projects-tab').disabled=$('profile-tab').disabled=$('library-tab').disabled=!ready||busy;
 if(stale)for(const id of ['preview','add-project','import-draft'])$(id).disabled=true;
 $('office').setAttribute('aria-busy',String(!ready||busy));
 $('connection-status').textContent=publisher.connected()?'GitHub 已連接':'GitHub 未連接';$('connection-status').classList.toggle('connected',publisher.connected());
 $('draft-status').textContent=ownerDraftStatus({ready,busy,stale,changed,storageOK,loadError});
}
function mutate(action,{render=true,list=true}={}){
 if(busy||stale)return;const before=clone(draft);action();if(canonical(before)===canonical(draft))return;
 undo.push(before);if(undo.length>40)undo.shift();redo=[];notice('');save();if(render)renderEditor();if(list)renderList();
}
function patchProject(id,key,value){draft.overrides[id]??={};draft.overrides[id][key]=value;}
function assertDraft(){if(stale)throw Error('草稿版本已過期，請先下載備份並重新載入正式內容');validateContent(draft,entries);applyContent(entries,draft);if(!storageOK)throw Error('請先解決草稿儲存問題或下載備份');}
function renderList(){
 const all=currentEntries(),query=$('project-search').value.trim().toLocaleLowerCase(),filter=$('project-filter').value;
 $('project-count').textContent=all.filter(p=>!p.hidden).length+' 顯示中 / '+all.length+' 個作品';
 const list=$('project-list');list.replaceChildren();
 for(const p of all.filter(p=>(!query||[p.title,p.year,p.category].join(' ').toLocaleLowerCase().includes(query))&&(filter==='all'||filter==='hidden'?filter!=='hidden'||p.hidden:p.cinema===filter))){
  const row=node('div','project-row'+(p.hidden?' hidden-project':''));row.draggable=true;row.dataset.project=p.id;
  const select=button('',()=>{selected=p.id;view='projects';renderView();},'project-select');select.setAttribute('aria-current',String(selected===p.id));select.append(node('span','project-name',p.title),node('span','small',(p.cinema==='c2'?'CINEMA 02':'CINEMA 01')+(p.year?' · '+p.year:'')+(p.hidden?' · 已隱藏':'')));
  const moves=node('div','row-moves');for(const [label,delta]of [['上移',-1],['下移',1]]){const move=button(label,()=>moveProject(p.id,delta));move.setAttribute('aria-label',label+'作品 '+p.title);move.disabled=all.findIndex(x=>x.id===p.id)+delta<0||all.findIndex(x=>x.id===p.id)+delta>=all.length;moves.append(move);}row.append(select,moves);
  row.addEventListener('dragstart',event=>{dragProject=p.id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',p.id);});
  row.addEventListener('dragover',event=>{event.preventDefault();row.classList.add('drag-over');});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
  row.addEventListener('drop',event=>{event.preventDefault();row.classList.remove('drag-over');if(!dragProject||dragProject===p.id)return;const ids=currentEntries().map(p=>p.id),from=ids.indexOf(dragProject),to=ids.indexOf(p.id);if(from<0)return;ids.splice(to,0,...ids.splice(from,1));mutate(()=>draft.order=ids,{render:false});dragProject='';});list.append(row);
 }
 if(!list.children.length)list.append(node('p','small','搵唔到符合條件嘅作品。'));
}
function moveProject(id,delta){const ids=currentEntries().map(p=>p.id),from=ids.indexOf(id),to=from+delta;if(to<0||to>=ids.length)return;[ids[from],ids[to]]=[ids[to],ids[from]];mutate(()=>draft.order=ids,{render:false});}
function field(parent,label,value,onInput,{area=false,type='text',help='',options=null}={}){
 const id='field-'+(++fieldId),wrap=node('div'),caption=node('label','',label);caption.htmlFor=id;wrap.append(caption);
 const input=node(options?'select':area?'textarea':'input');input.id=id;if(!options&&!area)input.type=type;
 if(options)for(const [value,copy]of options){const option=node('option','',copy);option.value=value;input.append(option);}input.value=value??'';
 input.addEventListener(options?'change':'input',()=>onInput(input.value));wrap.append(input);if(help)wrap.append(node('p','small',help));parent.append(wrap);return input;
}
function titleBlock(title,sub){const head=node('div','editor-heading'),copy=node('div');copy.append(node('p','eyebrow',view==='profile'?'BEHIND THE IDEAS':'THE PROGRAMME'),node('h2','',title),node('p','small',sub));head.append(copy);$('editor').append(head);return head;}
function renderView(){
 $('projects-tab').setAttribute('aria-pressed',String(view==='projects'));$('profile-tab').setAttribute('aria-pressed',String(view==='profile'));$('project-tools').hidden=view!=='projects';$('profile-note').hidden=view!=='profile';$('library-note').hidden=view!=='library';$('library-tab').setAttribute('aria-pressed',String(view==='library'));renderList();renderEditor();updateToolbar();
}
function renderEditor(){
 const editor=$('editor');editor.replaceChildren();fieldId=0;
 if(!ready)return;
 if(view==='profile'){renderProfile();return;}
 if(view==='library'){renderLibrary();return;}
 const p=projectById(selected);if(!p){titleBlock('新增你嘅下一個作品。','由左邊揀作品，或者撳「新增作品」。');return;}
 const head=titleBlock(p.title,p.hidden?'已隱藏 · 正式網站唔會顯示':'顯示中 · 改動會先存入草稿');
 const actions=node('div','editor-actions');actions.append(button('複製作品',()=>duplicate(p)),button(p.hidden?'重新顯示':'隱藏作品',()=>mutate(()=>patchProject(p.id,'hidden',!p.hidden))));head.append(actions);
 field(editor,'作品名稱',p.title,value=>{mutate(()=>patchProject(p.id,'title',value),{render:false});head.querySelector('h2').textContent=value;});
 const grid=node('div','field-grid');editor.append(grid);
 for(const [key,label]of [['year','年份'],['category','類別'],['location','地點']])field(grid,label,p[key]||'',value=>mutate(()=>patchProject(p.id,key,value),{render:false,list:key==='year'}));
 field(grid,'影院',p.cinema||'c1',value=>mutate(()=>patchProject(p.id,'cinema',value),{render:false}),{options:[['c1','Cinema 01 · Executed projects'],['c2','Cinema 02 · Concepts & design']]});
 field(editor,'作品 Description',p.description||'',value=>mutate(()=>patchProject(p.id,'description',value),{render:false,list:false}),{area:true,help:'顯示喺作品詳細頁面。留空會移除你自行加入嘅 Description。'});
 const storySection=node('details'),summary=node('summary','','編輯 Case study／創作故事');storySection.append(summary);editor.append(storySection);
 const story=projectStoryFor(p.id,p),storyLabel=node('label','visibility-label'),storyCheck=node('input');storyCheck.type='checkbox';storyCheck.checked=Boolean(story);storyLabel.append(storyCheck,document.createTextNode('顯示 Case study／創作故事'));storySection.append(storyLabel);
 storyCheck.addEventListener('change',()=>mutate(()=>patchProject(p.id,'story',storyCheck.checked?{eyebrow:'CREATIVE CASE STUDY',intro:'',challenge:'',approach:'',role:'',outcome:'',stage:p.cinema==='c2'?'pitch-concept-only':'executed',spotlight:false}:null)));
 if(story){
  for(const [key,label]of [['eyebrow','小標題'],['intro','故事簡介'],['challenge','The challenge'],['approach','The idea'],['role','My role'],['outcome','The result']])field(storySection,label,story[key]||'',value=>mutate(()=>{const live=normalizeStory(projectStoryFor(p.id,projectById(p.id)));live[key]=value;patchProject(p.id,'story',live);},{render:false,list:false}),{area:key!=='eyebrow'});
  field(storySection,'故事重點（每行一項）',(story.highlights||[]).join('\n'),value=>mutate(()=>{const live=normalizeStory(projectStoryFor(p.id,projectById(p.id)));live.highlights=value.split('\n').map(s=>s.trim()).filter(Boolean);patchProject(p.id,'story',live);},{render:false,list:false}),{area:true});
 }
 const mediaHead=node('div','section-title');mediaHead.append(node('h3','','影片、相片與設計圖'),button('新增素材',()=>openMedia()),button('找重複相片',event=>photoDuplicates.open({projectId:p.id,trigger:event.currentTarget})));editor.append(mediaHead,node('p','small','長按縮圖或勾選多個素材，再一批移動或移除。影片、相片、設計圖會保持分組。'));
 const mediaList=node('div','media-list');editor.append(mediaList);renderMedia(mediaList,p);
 const restore=node('div','section-title');restore.append(node('p','small','原有作品同素材檔案會保留。'),button('還原呢個作品',async()=>{if(await ask('還原呢個作品嘅所有草稿修改？其他作品唔受影響。'))mutate(()=>delete draft.overrides[p.id]);}));editor.append(restore);
 if(draft.additions.some(x=>x.id===p.id))editor.append(button('移除呢個新增作品',async()=>{if(await ask('從草稿移除呢個新增作品？可以用「復原」還原。'))mutate(()=>{draft.additions=draft.additions.filter(x=>x.id!==p.id);delete draft.overrides[p.id];draft.order=draft.order.filter(id=>id!==p.id);selected=currentEntries()[0]?.id||'';});},'text-action'));
}
function renderMedia(list,p){mountMediaManager(list,p,{state:mediaUI,site:SITE,getProject:()=>projectById(p.id),onChange:(items,options={})=>{if(options.uiOnly){renderEditor();return;}mutate(()=>patchProject(p.id,'media',items),{list:false,...options});},onRemove:items=>removeMedia(items,p.id),onNotice:notice,onPreview:(item,trigger)=>videoPreview.open(mediaForEditor(projectById(p.id)),{src:item.src,context:projectById(p.id).title,trigger})});}
function askMediaRemoval(items,projectId,libraryOnly=false){
 const inventory=libraryInventory(entries,draft),sources=new Set(items.map(item=>item.src)),affected=new Set(inventory.filter(item=>sources.has(item.src)).flatMap(item=>item.projectIds));
 $('remove-media-summary').textContent='已選 '+selectionDescription(items)+'。請先選擇素材庫及原檔嘅處理方式，再確認。';
 const thumbs=$('remove-media-thumbnails');thumbs.replaceChildren();for(const item of items.slice(0,8)){const src=item.type==='image'?item.src:item.poster;if(src&&safeMediaUrl(src)){const image=node('img');image.src=new URL(src,SITE).href;image.alt=item.label||'選取素材';thumbs.append(image);}}
 $('remove-project-option').hidden=libraryOnly;
 const projectOption=document.querySelector('input[name="removal-policy"][value="project"]'),libraryOption=document.querySelector('input[name="removal-policy"][value="library"]');projectOption.checked=!libraryOnly;libraryOption.checked=libraryOnly;
 const describe=()=>{const global=libraryOption.checked,names=currentEntries().filter(p=>affected.has(p.id)).map(p=>p.title);$('remove-media-impact').textContent=global?'會影響 '+affected.size+' 個作品'+(names.length?'：'+names.slice(0,8).join('、')+(names.length>8?'，以及其他 '+(names.length-8)+' 個作品':''):'。'):'只從「'+(projectById(projectId)?.title||'目前作品')+'」移除，其他作品同素材庫保留。';};
 projectOption.onchange=libraryOption.onchange=describe;describe();$('remove-media-dialog').showModal();return new Promise(resolve=>removalResolve=resolve);
}
$('remove-media-confirm').addEventListener('click',()=>{const resolve=removalResolve;removalResolve=null;const scope=document.querySelector('input[name="removal-policy"]:checked').value;$('remove-media-dialog').close();resolve?.(scope);});
$('remove-media-dialog').addEventListener('close',()=>{if(removalResolve){const resolve=removalResolve;removalResolve=null;resolve(null);}});
async function removeMedia(items,projectId,libraryOnly=false){
 if(!items.length||busy||stale||removalResolve)return false;const snapshot=items.map(normalizeMedia),scope=await askMediaRemoval(snapshot,projectId,libraryOnly);if(!scope||busy||stale)return false;
 mutate(()=>{if(scope==='library')removeLibraryMedia(draft,snapshot);else removeProjectMedia(draft,projectById(projectId),snapshot.map(item=>item.src));mediaUI.selected.clear();libraryUI.selected.clear();});
 notice('已將 '+selectionDescription(snapshot)+(scope==='library'?'移到素材庫回收區，原檔保留。':'從目前作品移除，素材庫及原檔保留。')+' 改動尚未發佈，可撳「復原」。');return true;
}
function renderLibrary(){
 const heading=titleBlock('素材庫','作品移除嘅素材可重新加入；回收區素材唔會喺任何作品顯示。原檔保留。');heading.append(button('找重複相片',event=>photoDuplicates.open({projectId:selected,scope:'library',trigger:event.currentTarget})));
 const editor=$('editor'),inventory=libraryInventory(entries,draft),known=new Set(inventory.map(item=>item.src));libraryUI.selected=new Set([...libraryUI.selected].filter(src=>known.has(src)));
 const filters=node('div','library-filters'),search=node('input'),filter=node('select');search.type='search';search.placeholder='搜尋素材名稱、網址或作品…';search.value=libraryUI.query;search.setAttribute('aria-label','搜尋素材庫');
 for(const [value,label]of [['active','素材庫'],['unused','暫時冇作品使用'],['removed','回收區']]){const option=node('option','',label);option.value=value;filter.append(option);}filter.value=libraryUI.filter;filter.setAttribute('aria-label','素材庫範圍');filters.append(search,filter);editor.append(filters);
 const bar=node('div','library-bulk-bar'),count=node('span','media-selection-count');count.setAttribute('role','status');bar.append(count);
 const projectSelect=node('select');projectSelect.setAttribute('aria-label','加入素材嘅目標作品');for(const p of currentEntries()){const option=node('option','',p.title+(p.hidden?'（已隱藏）':''));option.value=p.id;projectSelect.append(option);}if(projectById(selected))projectSelect.value=selected;
 const choose=()=>inventory.filter(item=>libraryUI.selected.has(item.src)),names=new Map(currentEntries().map(p=>[p.id,p.title]));
 let filtered=[];
 const selectAll=button('全選篩選結果',()=>{libraryUI.selected=new Set(filtered.map(item=>item.src));refresh();});
 const clear=button('取消選取',()=>{libraryUI.selected.clear();refresh();});
 const add=button('加入目標作品',()=>{const target=projectById(projectSelect.value),items=choose().filter(item=>!item.removed);if(!target||!items.length)return;mutate(()=>{const merged=new Map(mediaForEditor(target).map(item=>[item.src,item]));for(const item of items)merged.set(item.src,normalizeMedia(item));patchProject(target.id,'media',orderedMedia([...merged.values()]));rememberLibrary(draft,items);libraryUI.selected.clear();});notice('已加入「'+target.title+'」嘅草稿，尚未發佈。');});
 const restore=button('還原已選素材',async()=>{const items=choose().filter(item=>item.removed);if(!items.length||!await ask('將 '+selectionDescription(items)+' 從回收區還原？原有作品引用亦會恢復。'))return;mutate(()=>{restoreLibraryMedia(draft,items.map(item=>item.src));libraryUI.selected.clear();});});
 const remove=button('移到回收區',()=>removeMedia(choose().filter(item=>!item.removed),selected,true),'danger-action');bar.append(selectAll,clear,projectSelect,add,restore,remove);editor.append(bar);
 const results=node('p','small'),grid=node('div','library-grid'),pages=node('div','library-pages');editor.append(results,grid,pages);
 function refresh(){const items=choose();count.textContent=items.length?'已選 '+selectionDescription(items):'未選取素材';clear.disabled=!items.length;add.disabled=!items.some(item=>!item.removed);remove.disabled=!items.some(item=>!item.removed);restore.disabled=!items.some(item=>item.removed);for(const card of grid.children){const check=card.querySelector('input');if(!check)continue;check.checked=libraryUI.selected.has(card.dataset.src);card.classList.toggle('is-selected',check.checked);}}
 function renderCards(){
  const query=libraryUI.query.trim().toLocaleLowerCase();filtered=inventory.filter(item=>(libraryUI.filter==='removed'?item.removed:!item.removed&&(libraryUI.filter!=='unused'||!item.projectIds.length))&&(!query||[item.label,item.src,...item.projectIds.map(id=>names.get(id)||'')].join(' ').toLocaleLowerCase().includes(query)));
  const pageCount=Math.max(1,Math.ceil(filtered.length/60));libraryUI.page=Math.max(0,Math.min(pageCount-1,libraryUI.page));results.textContent=filtered.length+' 個素材 · 第 '+(libraryUI.page+1)+' / '+pageCount+' 頁';grid.replaceChildren();
  for(const item of filtered.slice(libraryUI.page*60,(libraryUI.page+1)*60)){
   const card=node('article','library-card');card.tabIndex=0;card.dataset.src=item.src;const check=node('input','media-select');check.type='checkbox';check.setAttribute('aria-label','選取素材庫 '+(item.label||item.src));
   const toggle=()=>{if(libraryUI.selected.has(item.src))libraryUI.selected.delete(item.src);else libraryUI.selected.add(item.src);refresh();};check.addEventListener('click',event=>{event.stopPropagation();toggle();});card.append(check);
   const src=item.type==='image'?item.src:item.poster;if(src&&safeMediaUrl(src)){const image=node('img','library-thumb');image.src=new URL(src,SITE).href;image.alt=item.label||'素材';image.loading='lazy';image.draggable=false;image.addEventListener('contextmenu',event=>event.preventDefault());card.append(image);}else card.append(node('div','library-thumb media-placeholder','FILM'));
   if(item.type!=='image'){const play=button('預覽播放',event=>{event.stopPropagation();videoPreview.open(filtered,{src:item.src,context:'素材庫',trigger:event.currentTarget});},'library-preview-play');play.setAttribute('aria-label','預覽素材庫影片 '+(item.label||item.src));card.append(play);}
   card.append(node('p','library-label',item.label||item.src.split('/').at(-1)),node('p','small',item.removed?'回收區 · 原檔保留':item.projectIds.length?'由 '+item.projectIds.length+' 個作品使用':'暫時冇作品使用'));
   const gesture=createLongPress({onSelect:()=>{libraryUI.selected.add(item.src);refresh();}});card.addEventListener('pointerdown',event=>{if(!event.target.closest('input,button,label'))gesture.start(event);});card.addEventListener('pointermove',gesture.move);card.addEventListener('pointerup',gesture.cancel);card.addEventListener('pointercancel',gesture.cancel);card.addEventListener('click',event=>{if(!event.target.closest('input,button,label')&&!gesture.suppressClick())toggle();});card.addEventListener('keydown',event=>{if(event.target===card&&(event.key===' '||event.key==='Enter')){event.preventDefault();toggle();}});grid.append(card);
  }
  if(!filtered.length)grid.append(node('p','help-box','呢個範圍暫時未有素材。'));
  pages.replaceChildren();const previous=button('上一頁',()=>{libraryUI.page--;renderCards();}),next=button('下一頁',()=>{libraryUI.page++;renderCards();});previous.disabled=libraryUI.page===0;next.disabled=libraryUI.page>=pageCount-1;pages.append(previous,node('span','small',(libraryUI.page+1)+' / '+pageCount),next);refresh();
 }
 search.addEventListener('input',()=>{libraryUI.query=search.value;libraryUI.page=0;libraryUI.selected.clear();renderCards();});filter.addEventListener('change',()=>{libraryUI.filter=filter.value;libraryUI.page=0;libraryUI.selected.clear();renderCards();});renderCards();
}
function renderProfile(){
 titleBlock('個人簡介與聯絡資料','修改後可以預覽整個網站，再確認發佈。');const values={...PROFILE_DEFAULTS,...draft.profile};
 for(const [key,label,area]of [['name','姓名'],['role','職銜'],['location','所在地'],['aboutTitle','About 標題（可換行）',true],['aboutIntro','個人簡介第一段',true],['aboutBody','個人簡介第二段',true],['email','聯絡電郵'],['linkedin','LinkedIn 網址'],['contactTitle','Box Office 標題（可換行）',true],['metaDescription','網站簡介',true]])field($('editor'),label,values[key],value=>mutate(()=>draft.profile[key]=value,{render:false,list:false}),{area});
}
function addProject(){const id='owner-'+crypto.randomUUID();mutate(()=>{draft.additions.push({id,title:'新作品',cinema:'c1',year:'',category:'',location:'',description:'',hidden:true,media:[],story:null});draft.order=[...currentEntries().map(p=>p.id).filter(x=>x!==id),id];selected=id;view='projects';});renderView();notice('新作品已加入草稿，暫時隱藏。完成編輯後撳「重新顯示」。');}
function duplicate(p){const id='owner-'+crypto.randomUUID(),copy={id,title:p.title+' — Copy',year:p.year||'',category:p.category||'',location:p.location||'',cinema:p.cinema||'c1',description:p.description||'',hidden:true,media:mediaForEditor(p),story:normalizeStory(projectStoryFor(p.id,p))};mutate(()=>{draft.additions.push(copy);selected=id;});notice('作品已複製到草稿，暫時隱藏。');}
function openMedia(){for(const id of ['media-url','media-label','media-poster'])$(id).value='';$('media-error').hidden=true;$('media-dialog').showModal();}
$('media-submit').addEventListener('click',()=>{try{const kind=$('media-type').value,src=kind==='vimeo'?normalizeVimeoInput($('media-url').value):$('media-url').value.trim();const item={type:kind==='photo'||kind==='graphic'?'image':kind,mediaKind:kind==='graphic'?'graphic':kind==='photo'?'photo':'video',src,label:$('media-label').value.trim()};if($('media-poster').value.trim())item.poster=$('media-poster').value.trim();const media=orderedMedia([...mediaForEditor(projectById(selected)),item]);const candidate=clone(draft);candidate.overrides[selected]??={};candidate.overrides[selected].media=media;validateContent(candidate,entries);mutate(()=>{rememberLibrary(draft,[item]);restoreLibraryMedia(draft,[item.src]);patchProject(selected,'media',media);});$('media-dialog').close();}catch(error){$('media-error').textContent=error.message;$('media-error').hidden=false;}});
function preview(){try{assertDraft();save();const url=new URL(SITE);url.searchParams.set('owner-preview','1');url.searchParams.set('draft',crypto.randomUUID());if(view==='profile')url.hash='about';else if(selected&&!projectById(selected)?.hidden)url.hash='project='+encodeURIComponent(selected);else url.hash='work';const opened=window.open(url.href,'anker-owner-preview');if(!opened)notice('瀏覽器阻止咗預覽視窗，請允許呢個網站開新視窗。',true);}catch(error){notice(error.message,true);}}
function download(){const payload={format:'anker-portfolio-draft-v1',baseline:canonical(published),draft,savedAt:new Date().toISOString()},url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),link=node('a');link.href=url;link.download='anker-portfolio-draft-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function readPublished(){return readPublishedContent(SITE,{onStatus:copy=>{if(!ready)$('draft-status').textContent=copy;}});}
async function initialize(){
 try{const data=await readPublished();entries=data.entries;published=data.content;draft=clone(published);let saved=null;try{saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');}catch{notice('未能讀取舊草稿。舊資料未被覆寫；你可以先下載現有內容備份。',true);stale=true;}
  if(saved?.draft){const restored=restoreOwnerDraft(saved,published,entries);draft=restored.draft;if(restored.state==='merged'){save();notice('已合併正式網站確認嘅重複相片清理；你未發佈嘅文字、排序同其他草稿修改保留。');}else if(restored.state==='refreshed'){save();notice('已讀取最新正式內容；原有草稿冇未發佈改動。');}else if(restored.state==='conflict'){stale=true;notice('內容已讀取，但呢份本機草稿係按較舊版本編輯。請先下載草稿備份，再撳「重新載入正式內容」，避免覆蓋較新更新。',true);}else if(restored.state==='restored')notice('已還原你上次喺呢個瀏覽器未發佈嘅草稿。');}
  ready=true;selected=currentEntries()[0]?.id||'';renderView();$('office').dataset.loadState='ready';dispatchEvent(new Event('anker-admin-ready'));let pending=null;try{pending=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');}catch{}if(pending?.sha)void monitorDeployment(pending);
 }catch(error){loadError=true;updateToolbar();notice(error.message,true);$('draft-status').textContent='網站內容未能載入';$('office').dataset.loadState='error';$('office').setAttribute('aria-busy','false');dispatchEvent(new CustomEvent('anker-admin-error',{detail:error.message+'。原有草稿仍保留。'}));}
}
function review(){try{assertDraft();if(!publisher.connected()){notice('首次發佈需要先連接 GitHub。你嘅草稿已保留。');$('connect-dialog').showModal();return;}const changes=changeSummary(published,draft,entries);if(!changes.length)throw Error('未有需要發佈嘅內容改動');$('review-list').replaceChildren(...changes.map(copy=>node('li','',copy)));$('publish-error').hidden=true;$('review-dialog').showModal();}catch(error){notice(error.message,true);}}
async function publish(){
 if(busy)return;try{assertDraft();const snapshot=clone(draft);snapshot.revision=crypto.randomUUID();snapshot.updatedAt=new Date().toISOString();busy=true;updateToolbar();$('publish-confirm').disabled=true;$('publish-error').hidden=true;
  const pending=await publisher.publish(snapshot,published);published=clone(snapshot);draft=clone(snapshot);undo=[];redo=[];save();try{localStorage.setItem(PENDING_KEY,JSON.stringify(pending));}catch{}$('review-dialog').close();notice('已提交 GitHub，正式網站正等待部署。你可以繼續編輯下一份草稿。');void monitorDeployment(pending);
 }catch(error){$('publish-error').textContent=error.message;$('publish-error').hidden=false;notice(error.message,true);}finally{busy=false;$('publish-confirm').disabled=false;updateToolbar();}
}
async function monitorDeployment(pending){
 const run=++monitorId,start=Date.now(),status=$('deployment');status.hidden=false;let lastUrl=pending.url;
 const show=(copy,url)=>{status.replaceChildren(document.createTextNode(copy+' '));if(url){const link=node('a','','查看 GitHub 發佈記錄');link.href=url;link.target='_blank';link.rel='noopener noreferrer';status.append(link);}};
 while(run===monitorId&&Date.now()-start<15*60*1000){
  try{const state=await publisher.deployment(pending.sha);if(run!==monitorId)return;if(state?.url)lastUrl=state.url;
   if(state?.status==='completed'&&state.conclusion!=='success'){show('部署未完成（'+state.conclusion+'）。GitHub 已保留提交，請查看記錄。',lastUrl);return;}
   if(state?.conclusion==='success'){const live=await readSiteJson(new URL('content.json?revision='+encodeURIComponent(pending.revision),SITE),{attempts:1});if(run!==monitorId)return;if(live.revision===pending.revision){show('正式網站已更新。',lastUrl);const link=node('a','','開啟正式網站');link.href=new URL('?v='+encodeURIComponent(pending.revision),SITE).href;link.target='_blank';link.rel='noopener';status.append(document.createTextNode(' · '),link);try{localStorage.removeItem(PENDING_KEY);}catch{}if(!stale)notice('發佈完成，正式網站已更新。'+(canonical(draft)!==canonical(published)?' 你之後新增嘅草稿修改尚未發佈。':''));return;}}
   show(state?.conclusion==='success'?'部署完成，正在等候網站快取更新…':state?'GitHub 正在建置及部署網站…':'已提交 GitHub，正在等候部署開始…',lastUrl);
  }catch(error){show(error.message+' 可直接查看發佈記錄；唔需要重複提交。',lastUrl);return;}
  await new Promise(resolve=>setTimeout(resolve,12000));
 }
 if(run===monitorId)show('GitHub 已收到提交，部署仍處理中。稍後可重新開啟後台追蹤。',lastUrl);
}
$('connect-open').addEventListener('click',()=>{$('connect-error').hidden=true;$('connect-dialog').showModal();});
$('connect-submit').addEventListener('click',async()=>{$('connect-submit').disabled=true;$('connect-error').hidden=true;try{await publisher.connect($('github-token').value,published);$('connect-dialog').close();notice('GitHub 已連接。完成預覽後，撳「檢查並發佈」。');updateToolbar();}catch(error){$('connect-error').textContent=error.message;$('connect-error').hidden=false;}finally{$('github-token').value='';$('connect-submit').disabled=false;updateToolbar();}});
$('disconnect').addEventListener('click',()=>{publisher.disconnect();$('github-token').value='';$('connect-dialog').close();updateToolbar();notice('已斷開 GitHub；草稿仍保留。');});
for(const close of document.querySelectorAll('[data-close]'))close.addEventListener('click',()=>$(close.dataset.close).close());
$('connect-dialog').addEventListener('close',()=>{$('github-token').value='';});
$('library-tab').addEventListener('click',()=>{view='library';renderView();});
$('projects-tab').addEventListener('click',()=>{view='projects';renderView();});$('profile-tab').addEventListener('click',()=>{view='profile';renderView();});
$('project-search').addEventListener('input',renderList);$('project-filter').addEventListener('change',renderList);$('add-project').addEventListener('click',addProject);
$('undo').addEventListener('click',()=>{if(!undo.length)return;redo.push(clone(draft));draft=undo.pop();save();renderView();});$('redo').addEventListener('click',()=>{if(!redo.length)return;undo.push(clone(draft));draft=redo.pop();save();renderView();});
$('export-draft').addEventListener('click',download);$('import-draft').addEventListener('click',()=>$('draft-file').click());
$('draft-file').addEventListener('change',async()=>{try{const file=$('draft-file').files[0];if(!file)return;if(file.size>1200000)throw Error('草稿備份檔案太大');const imported=JSON.parse(await file.text());if(imported.format!=='anker-portfolio-draft-v1')throw Error('唔係本網站嘅草稿備份');validateContent(imported.draft,entries);if(imported.baseline!==canonical(published))throw Error('呢份備份係較舊正式版本嘅草稿，請先核對版本，避免覆蓋較新內容');if(await ask('匯入備份會取代目前草稿。繼續？')){mutate(()=>draft=clone(imported.draft));renderView();notice('已匯入草稿備份，未發佈。');}}catch(error){notice(error.message,true);}finally{$('draft-file').value='';}});
$('reload-published').addEventListener('click',async()=>{if(!await ask('重新載入會清除目前草稿修改。請先下載需要保留嘅草稿備份。繼續？'))return;try{const data=await readPublished();entries=data.entries;published=data.content;draft=clone(published);stale=false;undo=[];redo=[];publisher.disconnect();save();selected=currentEntries()[0]?.id||'';renderView();notice('已重新載入正式內容。');}catch(error){notice(error.message,true);}});
$('preview').addEventListener('click',preview);$('review-preview').addEventListener('click',preview);$('publish-open').addEventListener('click',review);$('publish-confirm').addEventListener('click',()=>void publish());
addEventListener('storage',event=>{if(event.key!==DRAFT_KEY||!ready||busy)return;try{const incoming=JSON.parse(event.newValue||'null');if(incoming?.baseline===canonical(published)&&canonical(incoming.draft)===canonical(draft))return;}catch{}stale=true;notice('另一個後台分頁更新咗草稿。為免互相覆蓋，呢個分頁已停止儲存；請先下載需要保留嘅備份，再重新整理。',true);updateToolbar();$('editor').inert=true;});
addEventListener('pagehide',()=>publisher.disconnect());
updateToolbar();void initialize();

return {};
})();
}catch(error){console.error("Owner editor startup failed",error);dispatchEvent(new CustomEvent("anker-admin-error",{detail:"後台程式未能啟動，請重新載入。原有草稿仍保留。"}));}
})();
