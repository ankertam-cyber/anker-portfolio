import {mediaRank,orderedMedia,normalizeMedia,mediaForEditor} from './content-model.mjs?v=bulk1';

// Move each selected set within its category; keep the owner's video/photo/design order.
export function moveMediaSelection(items,selected,action,position=1){
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
export function rememberLibrary(doc,items){
 doc.library??={items:[],removed:[]};
 const records=new Map(doc.library.items.map(item=>[item.src,item]));for(const item of items)records.set(item.src,normalizeMedia(item));
 doc.library.items=orderedMedia([...records.values()]);
}
export function removeProjectMedia(doc,project,selected){
 const chosen=new Set(selected),items=mediaForEditor(project);rememberLibrary(doc,items.filter(item=>chosen.has(item.src)));
 doc.overrides[project.id]??={};doc.overrides[project.id].media=items.filter(item=>!chosen.has(item.src)).map(item=>{for(const key of ['poster','thumbnail'])if(chosen.has(item[key]))delete item[key];return item;});
}
export function removeLibraryMedia(doc,items){rememberLibrary(doc,items);doc.library.removed=[...new Set([...doc.library.removed,...items.map(item=>item.src)])];}
export function restoreLibraryMedia(doc,sources){const chosen=new Set(sources);if(doc.library)doc.library.removed=doc.library.removed.filter(src=>!chosen.has(src));}
export function selectionDescription(items){const counts=[items.filter(m=>m.type!=='image').length,items.filter(m=>m.type==='image'&&m.mediaKind!=='graphic').length,items.filter(m=>m.type==='image'&&m.mediaKind==='graphic').length];return counts.map((count,i)=>count?count+[' 條影片',' 張相片',' 張設計圖'][i]:'').filter(Boolean).join('、');}
export function createLongPress({onSelect,schedule=globalThis.setTimeout,cancel=globalThis.clearTimeout,now=()=>Date.now(),delay=480}={}){
 let timer=null,start=null,suppressUntil=0;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;start=null;};
 return {start(event){clear();if(event.button!==undefined&&event.button!==0)return;start={x:event.clientX,y:event.clientY};timer=schedule(()=>{timer=null;start=null;suppressUntil=now()+800;onSelect();},delay);},move(event){if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)clear();},cancel:clear,suppressClick(){return now()<suppressUntil;}};
}
