import {projectMedia} from './project-media.mjs';

export const DRAFT_KEY='anker-portfolio-owner-draft-v1';
export const PROFILE_DEFAULTS=Object.freeze({name:'Anker Tam',role:'Creative Director',location:'Hong Kong',aboutTitle:'Hello,\nI’m Anker.',aboutIntro:'I’m Anker Tam, a Hong Kong-based Creative Director and Head of Design with 15 years of experience in visual communication, brand storytelling and experiential design.',aboutBody:'My work brings together concept development, spatial design, graphics and motion. I lead creative teams from the first pitch through design development and execution — shaping how an idea becomes an experience people can step into.',email:'ankertam@gmail.com',linkedin:'https://www.linkedin.com/in/anker-tam-a733a4266/',contactTitle:'Let’s make\nthe next show.',metaDescription:'Anker Tam, a Hong Kong-based Creative Director. A portfolio of brand experiences, events and spatial design.'});
export const emptyContent=()=>({version:1,profile:{},order:[],overrides:{},additions:[]});
export const clone=value=>JSON.parse(JSON.stringify(value));
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const badKeys=new Set(['__proto__','prototype','constructor']);
const patchKeys=new Set(['title','year','category','location','cinema','description','hidden','media','story']);
const storyKeys=new Set(['eyebrow','intro','challenge','approach','role','outcome','highlights','stage','spotlight']);
export function normalizeStory(story){return story===null?null:Object.fromEntries(Object.entries(story||{}).filter(([k])=>storyKeys.has(k)));}
export const hasEmoji=text=>/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u20E3]/u.test(text.replaceAll('©',''));
function record(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' 格式不正確');for(const k of Object.keys(value))if(badKeys.has(k))throw Error('不支援嘅欄位名稱');}
function text(value,label,max=20000){if(typeof value!=='string'||value.length>max)throw Error(label+' 文字太長或格式不正確');if(hasEmoji(value))throw Error(label+' 唔可以包含 emoji');}
export function safeMediaUrl(value){
 if(typeof value!=='string'||!value||/[\u0000-\u0020\\]/u.test(value))return false;
 if(value.startsWith('assets/')){try{return !decodeURIComponent(value).split('/').includes('..')&&!value.includes('?')&&!value.includes('#');}catch{return false;}}
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function normalizeMedia(item){
 const media={type:item.type==='vimeo'?'vimeo':item.type==='video'?'video':'image',src:item.src,mediaKind:item.type==='video'||item.type==='vimeo'?'video':['graphic','graphics','render','rendering','design'].includes(item.mediaKind)?'graphic':'photo'};
 for(const k of ['label','contribution','poster','thumbnail','alt','width','height','animated'])if(item[k]!==undefined)media[k]=item[k];
 return media;
}
export function mediaRank(m){return m.type!=='image'?0:m.mediaKind==='graphic'?2:1;}
export function orderedMedia(items){return items.map(normalizeMedia).sort((a,b)=>mediaRank(a)-mediaRank(b));}
export function normalizeVimeoInput(value){
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
export function validateContent(doc,entries=[]){
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
 if(doc.library!==undefined){record(doc.library,'素材庫');if(Object.keys(doc.library).some(k=>!['items','removed','purged'].includes(k)))throw Error('不支援嘅素材庫欄位');validateMedia(doc.library.items);for(const key of ['removed','purged']){const values=doc.library[key]??(key==='purged'?[]:null);if(!Array.isArray(values)||values.length>6000||new Set(values).size!==values.length||values.some(src=>!safeMediaUrl(src)))throw Error('素材庫移除清單不正確');}}
 if(new TextEncoder().encode(JSON.stringify(doc)).length>900000)throw Error('草稿超過 900 KB，請減少重複素材資料');
 return true;
}
export function editableEntries(entries,doc){
 const all=[...entries,...doc.additions.map(p=>({images:[],videos:[],graphics:[],imageInfo:{},publicationStatus:'published',...p}))];
 const positions=new Map(doc.order.map((id,i)=>[id,i]));
 const removed=new Set([...(doc.library?.removed||[]),...(doc.library?.purged||[])]);
 return all.map(p=>{const result={...p,...doc.overrides[p.id]};if(result.media||removed.size){const media=orderedMedia(result.media||projectMedia(result)).filter(m=>!removed.has(m.src)).map(m=>{for(const key of ['poster','thumbnail'])if(removed.has(m[key]))delete m[key];return m;});result.videos=media.filter(m=>m.type!=='image');result.images=media.filter(m=>m.type==='image'&&m.mediaKind!=='graphic').map(m=>m.src);result.graphics=media.filter(m=>m.type==='image'&&m.mediaKind==='graphic');result.imageInfo=Object.fromEntries(media.filter(m=>m.type==='image').map(m=>[m.src,m]));}return result;}).sort((a,b)=>(positions.get(a.id)??1e6)-(positions.get(b.id)??1e6));
}
export function libraryInventory(entries,doc){
 const purged=new Set(doc.library?.purged||[]),records=new Map(),remember=item=>{if(item?.src&&!purged.has(item.src)&&!records.has(item.src))records.set(item.src,{...normalizeMedia(item),projectIds:[],removed:false});};
 for(const p of entries)projectMedia(p).forEach(remember);
 for(const p of doc.additions)if(p.media)p.media.forEach(remember);
 for(const patch of Object.values(doc.overrides))if(patch.media)patch.media.forEach(remember);
 for(const item of doc.library?.items||[])remember(item);
 const unfiltered={...doc,library:{items:doc.library?.items||[],removed:[],purged:[...purged]}};
 for(const p of editableEntries(entries,unfiltered))for(const item of projectMedia(p))for(const src of [item.src,item.poster,item.thumbnail]){const record=records.get(src);if(record&&!record.projectIds.includes(p.id))record.projectIds.push(p.id);}
 const removed=new Set(doc.library?.removed||[]);return [...records.values()].map(item=>({...item,removed:removed.has(item.src)}));
}
export function applyContent(entries,doc){validateContent(doc,entries);const visible=editableEntries(entries,doc).filter(p=>!p.hidden);if(!visible.length)throw Error('至少需要保留一個顯示中嘅作品');return visible;}
export function mediaForEditor(project){return orderedMedia(projectMedia(project));}
export function changeSummary(before,after,entries){
 const changes=[];if(canonical(before.profile)!==canonical(after.profile))changes.push('更新個人簡介／聯絡資料');
 if(canonical(before.library||{})!==canonical(after.library||{})){const old=new Set(before.library?.removed||[]),next=new Set(after.library?.removed||[]),deleted=[...next].filter(src=>!old.has(src)).length,restored=[...old].filter(src=>!next.has(src)).length;changes.push('更新素材庫'+(deleted?'：移除 '+deleted+' 個素材':'')+(restored?'：還原 '+restored+' 個素材':'')+'（原檔保留）');}
 if(canonical(before.order)!==canonical(after.order))changes.push('調整作品排序');
 const old=new Map(editableEntries(entries,before).map(p=>[p.id,p]));
 for(const p of editableEntries(entries,after)){const prev=old.get(p.id);if(!prev){changes.push('新增作品：'+p.title+(p.hidden?'（隱藏）':''));continue;}if(canonical(p)===canonical(prev))continue;const labels=[];if(p.title!==prev.title)labels.push('改名');if(Boolean(p.hidden)!==Boolean(prev.hidden))labels.push(p.hidden?'隱藏':'重新顯示');if(canonical(mediaForEditor(p))!==canonical(mediaForEditor(prev)))labels.push('素材／排序');if(!labels.length)labels.push('文字／設定');changes.push(p.title+'：'+labels.join('、'));}
 for(const [id,p]of old)if(!editableEntries(entries,after).some(x=>x.id===id))changes.push('移除新增作品：'+p.title);
 return changes;
}
