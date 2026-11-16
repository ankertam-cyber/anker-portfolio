import {findPhotoDuplicates,duplicateRemovalItems,isComparablePhoto,recommendedDuplicateSources} from './photo-duplicates.mjs';
import {createPhotoFingerprintReader} from './photo-fingerprints.mjs';
import {uploadedImageSource} from './upload-store.mjs';

const make=(tag,cls='',text)=>{const element=document.createElement(tag);element.className=cls;if(text!==undefined)element.textContent=text;return element;};
const action=(text,handler,cls='')=>{const element=make('button',cls,text);element.type='button';element.addEventListener('click',handler);return element;};
const filename=src=>{try{return decodeURIComponent(new URL(src,'https://example.test/').pathname.split('/').at(-1));}catch{return src;}};
export function mountPhotoDuplicateManager(dialog,{site,getProject,getItems,onRemove}={}){
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
 function paintPhoto(){const item=viewing[viewIndex];if(!item)return;photo.src=uploadedImageSource(new URL(item.src,site).href);photo.alt=item.label||filename(item.src);document.getElementById('duplicate-photo-caption').textContent=(viewIndex+1)+' / '+viewing.length+' · '+(keepers.get(item.groupId)===item.src?'保留':'待核對')+' · '+filename(item.src);document.getElementById('duplicate-photo-previous').disabled=viewIndex===0;document.getElementById('duplicate-photo-next').disabled=viewIndex===viewing.length-1;}
 function enlarge(group,item){viewing=group.items.map(value=>({...value,groupId:group.id}));viewIndex=viewing.findIndex(value=>value.src===item.src);paintPhoto();viewer.showModal();}
 function render(){
  exactTab.setAttribute('aria-pressed',String(mode==='exact'));similarTab.setAttribute('aria-pressed',String(mode==='similar'));exactTab.textContent='完全相同 · '+data.exact.length+' 組';similarTab.textContent='疑似重複 · '+data.similar.length+' 組';results.replaceChildren();
  if(!groups().length){results.append(make('p','help-box',mode==='exact'?'未發現可確定完全相同嘅相片。可以再睇「疑似重複」。':'未發現符合比對條件嘅相似相片。呢個比對唔涵蓋大幅裁切、翻轉或大角度變化。'));refresh();return;}
  groups().forEach((group,index)=>{
   const section=make('section','duplicate-group'),head=make('div','duplicate-group-heading');head.append(make('h3','',String(index+1).padStart(2,'0')+' · '+(mode==='exact'?'內容完全相同':'畫面相似')+' · '+group.items.length+' 張'),make('p','small',mode==='exact'?'已建議保留解像度較高嘅一張；你可以改選。':'角度相近亦可能有用，請放大核對後自行勾選。'));section.append(head);
   const grid=make('div','duplicate-grid');section.append(grid);
   for(const item of group.items){
    const card=make('article','duplicate-card');card.dataset.group=group.id;card.dataset.src=item.src;const preview=action('',()=>enlarge(group,item),'duplicate-image-button');preview.setAttribute('aria-label','放大相片 '+filename(item.src));const image=make('img');image.src=uploadedImageSource(new URL(item.thumbnail||item.src,site).href);image.alt=item.label||filename(item.src);image.loading='lazy';preview.append(image,make('span','','放大比對'));card.append(preview);
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
