import {mediaForEditor,mediaRank,safeMediaUrl,normalizeVimeoInput} from './content-model.mjs?v=bulk1';
import {moveMediaSelection,selectionDescription,createLongPress} from './media-actions.mjs';

const make=(tag,cls='',text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const action=(text,handler,cls='')=>{const button=make('button',cls,text);button.type='button';button.addEventListener('click',handler);return button;};
export function mountMediaManager(container,project,{state,site,getProject,onChange,onRemove,onNotice}={}){
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
