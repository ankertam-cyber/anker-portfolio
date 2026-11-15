import {mountMediaManager} from './media-manager.mjs';
import {rememberLibrary,removeProjectMedia,removeLibraryMedia,restoreLibraryMedia,selectionDescription,createLongPress} from './media-actions.mjs';
import {DRAFT_KEY,PROFILE_DEFAULTS,emptyContent,clone,canonical,validateContent,applyContent,editableEntries,mediaForEditor,orderedMedia,mediaRank,normalizeVimeoInput,normalizeStory,safeMediaUrl,changeSummary,libraryInventory,normalizeMedia} from './content-model.mjs?v=bulk1';
import {projectStoryFor} from './project-stories.mjs';
import {createGitHubPublisher} from './github-publisher.mjs';

const $=id=>document.getElementById(id),SITE=new URL('../',location.href),PENDING_KEY='anker-portfolio-pending-v1';
const publisher=createGitHubPublisher();
let entries=[],published=emptyContent(),draft=emptyContent(),selected='',view='projects',ready=false,busy=false,storageOK=true,stale=false,undo=[],redo=[],dragProject='',dragMedia=-1,fieldId=0,monitorId=0;
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
 $('connect-open').disabled=busy;
 $('editor').inert=busy||stale;$('project-list').inert=busy;$('projects-tab').disabled=$('profile-tab').disabled=$('library-tab').disabled=busy;
 if(stale)for(const id of ['preview','add-project','import-draft'])$(id).disabled=true;
 $('office').setAttribute('aria-busy',String(!ready||busy));
 $('connection-status').textContent=publisher.connected()?'GitHub 已連接':'GitHub 未連接';$('connection-status').classList.toggle('connected',publisher.connected());
 if(!changed&&ready&&!busy&&storageOK)$('draft-status').textContent='內容與已提交版本一致';
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
 const mediaHead=node('div','section-title');mediaHead.append(node('h3','','影片、相片與設計圖'),button('新增素材',()=>openMedia()));editor.append(mediaHead,node('p','small','長按縮圖或勾選多個素材，再一批移動或移除。影片、相片、設計圖會保持分組。'));
 const mediaList=node('div','media-list');editor.append(mediaList);renderMedia(mediaList,p);
 const restore=node('div','section-title');restore.append(node('p','small','原有作品同素材檔案會保留。'),button('還原呢個作品',async()=>{if(await ask('還原呢個作品嘅所有草稿修改？其他作品唔受影響。'))mutate(()=>delete draft.overrides[p.id]);}));editor.append(restore);
 if(draft.additions.some(x=>x.id===p.id))editor.append(button('移除呢個新增作品',async()=>{if(await ask('從草稿移除呢個新增作品？可以用「復原」還原。'))mutate(()=>{draft.additions=draft.additions.filter(x=>x.id!==p.id);delete draft.overrides[p.id];draft.order=draft.order.filter(id=>id!==p.id);selected=currentEntries()[0]?.id||'';});},'text-action'));
}
function renderMedia(list,p){mountMediaManager(list,p,{state:mediaUI,site:SITE,getProject:()=>projectById(p.id),onChange:(items,options={})=>{if(options.uiOnly){renderEditor();return;}mutate(()=>patchProject(p.id,'media',items),{list:false,...options});},onRemove:items=>removeMedia(items,p.id),onNotice:notice});}
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
 if(!items.length||busy||stale||removalResolve)return;const snapshot=items.map(normalizeMedia),scope=await askMediaRemoval(snapshot,projectId,libraryOnly);if(!scope||busy||stale)return;
 mutate(()=>{if(scope==='library')removeLibraryMedia(draft,snapshot);else removeProjectMedia(draft,projectById(projectId),snapshot.map(item=>item.src));mediaUI.selected.clear();libraryUI.selected.clear();});
 notice('已將 '+selectionDescription(snapshot)+(scope==='library'?'移到素材庫回收區，原檔保留。':'從目前作品移除，素材庫及原檔保留。')+' 改動尚未發佈，可撳「復原」。');
}
function renderLibrary(){
 titleBlock('素材庫','作品移除嘅素材可重新加入；回收區素材唔會喺任何作品顯示。原檔保留。');
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
   card.append(node('p','library-label',item.label||item.src.split('/').at(-1)),node('p','small',item.removed?'回收區 · 原檔保留':item.projectIds.length?'由 '+item.projectIds.length+' 個作品使用':'暫時冇作品使用'));
   const gesture=createLongPress({onSelect:()=>{libraryUI.selected.add(item.src);refresh();}});card.addEventListener('pointerdown',event=>{if(event.target!==check)gesture.start(event);});card.addEventListener('pointermove',gesture.move);card.addEventListener('pointerup',gesture.cancel);card.addEventListener('pointercancel',gesture.cancel);card.addEventListener('click',event=>{if(event.target!==check&&!gesture.suppressClick())toggle();});card.addEventListener('keydown',event=>{if(event.target===card&&(event.key===' '||event.key==='Enter')){event.preventDefault();toggle();}});grid.append(card);
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
async function readPublished(){const responses=await Promise.all(['projects.v28.json','content.json'].map(name=>fetch(new URL(name,SITE),{cache:'no-store'})));if(responses.some(r=>!r.ok))throw Error('無法讀取網站內容，請稍後重新載入');const [catalogue,content]=await Promise.all(responses.map(r=>r.json()));const source=catalogue.entries.filter(p=>p.publicationStatus==='published');validateContent(content,source);return {entries:source,content};}
async function initialize(){
 try{const data=await readPublished();entries=data.entries;published=data.content;draft=clone(published);let saved=null;try{saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');}catch{notice('未能讀取舊草稿。舊資料未被覆寫；你可以先下載現有內容備份。',true);stale=true;}
  if(saved?.draft){validateContent(saved.draft,entries);draft=saved.draft;if(saved.baseline!==canonical(published)){stale=true;notice('呢份本機草稿係按較舊正式版本編輯。請先下載草稿備份，再撳「重新載入正式內容」，避免覆蓋較新更新。',true);}else if(canonical(draft)!==canonical(published))notice('已還原你上次喺呢個瀏覽器未發佈嘅草稿。');}
  ready=true;selected=currentEntries()[0]?.id||'';renderView();if(!stale&&canonical(draft)!==canonical(published))$('draft-status').textContent='已還原草稿 · 尚未發佈';let pending=null;try{pending=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');}catch{}if(pending?.sha)void monitorDeployment(pending);
 }catch(error){notice(error.message,true);$('draft-status').textContent='網站內容未能載入';$('editor').replaceChildren(node('p','error',error.message),button('重新載入',()=>location.reload()));}
}
function review(){try{assertDraft();if(!publisher.connected()){notice('首次發佈需要先連接 GitHub。你嘅草稿已保留。');$('connect-dialog').showModal();return;}const changes=changeSummary(published,draft,entries);if(!changes.length)throw Error('未有需要發佈嘅內容改動');$('review-list').replaceChildren(...changes.map(copy=>node('li','',copy)));$('publish-error').hidden=true;$('review-dialog').showModal();}catch(error){notice(error.message,true);}}
async function publish(){
 if(busy)return;try{assertDraft();const snapshot=clone(draft);snapshot.revision=crypto.randomUUID();snapshot.updatedAt=new Date().toISOString();busy=true;updateToolbar();$('publish-confirm').disabled=true;$('publish-error').hidden=true;
  const pending=await publisher.publish(snapshot,published);published=clone(snapshot);draft=clone(snapshot);undo=[];redo=[];save();try{localStorage.setItem(PENDING_KEY,JSON.stringify(pending));}catch{}$('review-dialog').close();notice('已提交 GitHub，正式網站正等待部署。呢段時間請保留分頁。');await monitorDeployment(pending);
 }catch(error){$('publish-error').textContent=error.message;$('publish-error').hidden=false;notice(error.message,true);}finally{busy=false;$('publish-confirm').disabled=false;updateToolbar();}
}
async function monitorDeployment(pending){
 const run=++monitorId,start=Date.now(),status=$('deployment');status.hidden=false;let lastUrl=pending.url;
 const show=(copy,url)=>{status.replaceChildren(document.createTextNode(copy+' '));if(url){const link=node('a','','查看 GitHub 發佈記錄');link.href=url;link.target='_blank';link.rel='noopener noreferrer';status.append(link);}};
 while(run===monitorId&&Date.now()-start<15*60*1000){
  try{const state=await publisher.deployment(pending.sha);if(state?.url)lastUrl=state.url;
   if(state?.status==='completed'&&state.conclusion!=='success'){show('部署未完成（'+state.conclusion+'）。GitHub 已保留提交，請查看記錄。',lastUrl);return;}
   if(state?.conclusion==='success'){const response=await fetch(new URL('content.json?revision='+encodeURIComponent(pending.revision),SITE),{cache:'no-store'});if(response.ok&&(await response.json()).revision===pending.revision){show('正式網站已更新。',lastUrl);const link=node('a','','開啟正式網站');link.href=new URL('?v='+encodeURIComponent(pending.revision),SITE).href;link.target='_blank';link.rel='noopener';status.append(document.createTextNode(' · '),link);try{localStorage.removeItem(PENDING_KEY);}catch{}notice('發佈完成，正式網站已更新。');return;}}
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
void initialize();
