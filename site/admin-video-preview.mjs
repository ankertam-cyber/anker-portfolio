import {safeMediaUrl} from './content-model.mjs?v=bulk1';
import {mountVimeoPlayer,createVimeoPlayer,normalizeVimeoEmbedUrl} from './vimeo-player.mjs';

export function mountAdminVideoPreview(dialog,{site,document:doc=dialog.ownerDocument,createVimeo=mountVimeoPlayer,createPlayer=createVimeoPlayer}={}){
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
   video.hidden=false;video.controls=true;video.playsInline=true;video.preload='metadata';video.src=new URL(film.src,site).href;
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
