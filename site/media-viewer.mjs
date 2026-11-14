import {loadPortfolioImage} from './image-loader.mjs';
import {mountVimeoPlayer} from './vimeo-player.mjs';
export function mountMediaViewer(dialog,{createVimeoPlayer}={}){
  const surface=dialog.querySelector('.lightbox-surface');
  const image=dialog.querySelector('#lightbox-image');
  const video=dialog.querySelector('#lightbox-video');
  const title=dialog.querySelector('#lightbox-title');
  const counter=dialog.querySelector('#lightbox-counter');
  const previous=dialog.querySelector('#lightbox-previous');
  const next=dialog.querySelector('#lightbox-next');
  const closeButton=dialog.querySelector('#lightbox-close');
  const fullscreenButton=dialog.querySelector('#lightbox-fullscreen');
  const projectButton=dialog.querySelector('#lightbox-project');
  const status=dialog.querySelector('#lightbox-status'),retry=dialog.querySelector('#lightbox-retry');
  const vimeoSlot=dialog.querySelector('#lightbox-vimeo'),vimeoLink=dialog.querySelector('#lightbox-vimeo-link');
  const request=surface.requestFullscreen||surface.webkitRequestFullscreen;
  const nativeElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
  let items=[],index=0,returnFocus=null,openProject=null,closing=false,cancelImage=null;
  const vimeo=vimeoSlot?mountVimeoPlayer(vimeoSlot,{...(createVimeoPlayer?{createPlayer:createVimeoPlayer}:{}),onStatus:state=>{if(vimeoLink)vimeoLink.hidden=state.status!=='error';},onPlay:()=>document.querySelectorAll('video').forEach(v=>v.pause())}):null;
  function showStatus(state){if(status){status.hidden=state==='ready';status.textContent=state==='error'?'This item could not load. Please retry or choose another.':'Loading image…';}if(retry)retry.hidden=state!=='error';}

  function paint(){
    const item=items[index];if(!item)return;
    cancelImage?.();cancelImage=null;showStatus('ready');
    void vimeo?.close();if(vimeoSlot)vimeoSlot.hidden=true;if(vimeoLink)vimeoLink.hidden=true;
    if(video){video.pause();video.removeAttribute('src');video.load();video.hidden=true;}
    image.hidden=item.type!=='image';
    if(item.type==='vimeo'){image.removeAttribute('src');if(!vimeo){showStatus('error');}else{vimeoSlot.hidden=false;if(vimeoLink){const page=new URL(item.sourcePage||'https://vimeo.com/'+item.providerId);vimeoLink.href=page.origin==='https://vimeo.com'?page.href:'https://vimeo.com/'+item.providerId;}void vimeo.open({src:item.src,title:item.alt,sourcePage:item.sourcePage}).catch(()=>showStatus('error'));}}
    else if(item.type==='video'&&video){image.removeAttribute('src');video.poster=item.poster||'';video.src=item.src;video.hidden=false;video.setAttribute('aria-label',item.alt);}
    else{cancelImage=loadPortfolioImage(image,{src:item.src,fallback:item.thumbnail||item.fallback,alt:item.alt},showStatus);}
    counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    previous.hidden=next.hidden=items.length<2;
  }
  function step(delta){if(!dialog.open||items.length<2)return;index=(index+delta+items.length)%items.length;paint();}
  function syncFullscreen(){const on=nativeElement()===surface;fullscreenButton.setAttribute('aria-pressed',String(on));fullscreenButton.textContent=on?'EXIT FULL SCREEN':'FULL SCREEN';}
  async function exitNative(){
    if(nativeElement()!==surface)return;
    try{const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);}catch{}
  }
  async function toggleFullscreen(){
    if(nativeElement()===surface){await exitNative();return;}
    try{if(request)await request.call(surface,{navigationUI:'hide'});}catch{/* The viewport-filling viewer remains available. */}
  }
  async function close(){
    if(!dialog.open||closing)return;
    video?.pause();
    closing=true;await exitNative();dialog.close();closing=false;
  }
  function open({images,media,imageInfo={},index:initial=0,title:label='',onProject=null},{fullscreen=false}={}){
    const sources=media||images?.map(src=>({src,type:'image',thumbnail:imageInfo[src]?.thumbnail}));if(!sources?.length)return false;
    items=sources.filter(item=>item.src&&['image','video','vimeo'].includes(item.type)).map((item,i)=>({...item,alt:item.alt||item.label||`${label} — ${item.type==='image'?'image':'film'} ${i+1}`}));
    if(!items.length)return false;
    index=Math.max(0,Math.min(items.length-1,initial));
    title.textContent=label;openProject=onProject;projectButton.hidden=typeof onProject!=='function';
    if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
    document.body.classList.add('viewer-is-open');paint();closeButton.focus({preventScroll:true});
    // Request synchronously in the click gesture; unsupported devices keep the full viewport dialog.
    if(fullscreen)void toggleFullscreen();
    return true;
  }
  closeButton.addEventListener('click',close);
  previous.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
  fullscreenButton.hidden=!request;
  fullscreenButton.addEventListener('click',toggleFullscreen);
  retry?.addEventListener('click',paint);
  video?.addEventListener('error',()=>{if(dialog.open&&items[index]?.type==='video')showStatus('error');});
  projectButton.addEventListener('click',async()=>{const action=openProject;await close();action?.();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
  dialog.addEventListener('close',()=>{
    cancelImage?.();cancelImage=null;void vimeo?.close();if(vimeoSlot)vimeoSlot.hidden=true;if(vimeoLink)vimeoLink.hidden=true;showStatus('ready');document.body.classList.remove('viewer-is-open');void exitNative();image.removeAttribute('src');if(video){video.pause();video.removeAttribute('src');video.load();video.hidden=true;}items=[];openProject=null;
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  });
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();step(1);}
    if(event.key==='Tab'){
      const buttons=[...surface.querySelectorAll('button')].filter(button=>!button.hidden&&!button.disabled);
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  let swipeStart=null;
  image.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')swipeStart={x:event.clientX,y:event.clientY};});
  image.addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);});
  image.addEventListener('pointercancel',()=>{swipeStart=null;});
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('webkitfullscreenchange',syncFullscreen);
  document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')void vimeo?.pause();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)void vimeo?.pause();});
  return {open,close,isOpen:()=>dialog.open};
}
