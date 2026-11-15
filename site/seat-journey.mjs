import {ROW_SIZES} from './catalogue.mjs';
import {projectMedia} from './project-media.mjs';
import {loadPortfolioImage} from './image-loader.mjs';
import {projectStoryFor} from './project-stories.mjs';

export const SEAT_JOURNEY_MS=2100;
export const SEAT_TURN_MS=980;
export function seatEntranceElapsed(start,now){return Math.min(SEAT_JOURNEY_MS,Math.max(0,now-start));}
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const blend=(a,b,t)=>a+(b-a)*t;
const ease=t=>{const x=clamp(t);return x*x*(3-2*x);};
export function headTurnFrame(progress,direction=1,motion=true){
  const p=motion?clamp(progress):1;
  return {yaw:(direction<0?-1:1)*.48*Math.sin(Math.PI*p)**2,screenOpacity:p<.5?1-ease((p-.28)/.22):ease((p-.5)/.24),swap:p>=.5,done:p===1};
}
export function adjacentScreening(index,delta,count){return count>0?((index+Math.sign(delta))%count+count)%count:0;}
// One camera path for every project: approach, sit, then lift the gaze to the screen.
const CAMERA_STOPS=Object.freeze([
  {at:0,y:-1400,z:2400,lookY:80,lookZ:800},
  {at:.42,y:-100,z:1750,lookY:230,lookZ:1150},
  {at:.67,y:105,z:1610,lookY:-40,lookZ:180},
  {at:1,y:90,z:1560,lookY:-330,lookZ:0}
]);
export function seatCameraFrame(progress,width,height,motion=true,reservedBottom=0){
  const p=motion?clamp(progress):1;
  const index=Math.min(CAMERA_STOPS.length-2,CAMERA_STOPS.findIndex((s,i)=>i<CAMERA_STOPS.length-1&&p<=CAMERA_STOPS[i+1].at));
  const a=CAMERA_STOPS[Math.max(0,index)],b=CAMERA_STOPS[Math.max(0,index)+1];
  let t=clamp((p-a.at)/(b.at-a.at));t=t*t*(3-2*t);
  const y=blend(a.y,b.y,t),z=blend(a.z,b.z,t),lookY=blend(a.lookY,b.lookY,t),lookZ=blend(a.lookZ,b.lookZ,t);
  const angle=Math.atan2(y-lookY,z-lookZ);
  const screenWidth=Math.min(Math.max(1,width)*.92,Math.max(1,height)*(height<520?.90:1.48));
  const focal=Math.min(screenWidth*Math.hypot(420,1560)/1000,Math.max(1,height*.53-reservedBottom)/.177);
  return {progress:p,y,z,angle,focal,opacity:clamp(p/.075),settled:p===1};
}
// Also used to cull seat backs before they pass through the camera's near plane.
export function projectCinemaPoint(point,frame,width,height){
  const dy=point.y-frame.y,dz=point.z-frame.z,s=Math.sin(frame.angle),c=Math.cos(frame.angle);
  const z=s*dy+c*dz,yaw=frame.yaw||0,depth=-Math.sin(yaw)*point.x+Math.cos(yaw)*z,scale=frame.focal/-depth;
  return {x:width/2+(Math.cos(yaw)*point.x+Math.sin(yaw)*z)*scale,y:height*.47+(c*dy-s*dz)*scale,depth,scale};
}

export function mountSeatJourney(dialog,getMotion,{onGallery,onProject,onSelect,getReturnSeat,onFilm}={}){
  const $=name=>dialog.querySelector('[data-journey-'+name+']');
  const viewport=$('viewport'),world=$('world'),screen=$('screen'),image=$('image'),placeholder=$('placeholder');
  const mediaKind=$('media-kind'),previewVideo=document.createElement('video');previewVideo.className='pov-video-preview';previewVideo.playsInline=true;previewVideo.muted=true;previewVideo.preload='metadata';previewVideo.hidden=true;screen.append(previewVideo);
  const title=$('title'),seatLabel=$('seat'),status=$('status'),counter=$('counter');
  const closeButton=$('close'),previous=$('previous'),next=$('next'),gallery=$('gallery'),projectButton=$('project');
  const previousShow=$('previous-show'),nextShow=$('next-show'),programmeCounter=$('programme'),turnControls=$('turn-controls');
  const info=$('info');
  const synopsis=$('synopsis');
  const films=$('films');
  const seats=[];
  let frameId=0,elapsed=0,lastTime=0,entranceStart=0,entranceTimer=0,returnFocus=null,scrollY=0,openProject=null,images=[],imageIndex=0,loadToken=0;
  let savedBody=null;
  let imageInfo={},cancelImage=null;
  let programme=[],programmeIndex=0,seatLabelFor=null,turn=null,swipe=null,suppressClickUntil=0;

  ROW_SIZES.forEach((count,row)=>{
    for(let col=0;col<count;col++){
      const node=document.createElement('img');node.src='assets/media/navy-velvet-seat-256-v2.png';node.alt='';node.width=132;node.height=132;node.draggable=false;node.className='pov-seat';
      // A regular six-column scenic grid, without an aisle gap or added floor lights.
      const x=(col-(count-1)/2)*139,y=232-row*12,z=420+row*210;
      node.style.transform=`translate3d(${x-66}px,${y-66}px,${z}px)`;node.setAttribute('aria-hidden','true');
      world.append(node);seats.push({node,x,y,z});
    }
  });
  function paint(){
    if(!dialog.open)return;
    if(turn){
      const change=headTurnFrame(turn.elapsed/SEAT_TURN_MS,turn.direction,getMotion());
      if(change.swap&&!turn.swapped){turn.swapped=true;changeScreening(turn.index);}
      if(change.done){turn=null;dialog.dataset.phase='seated';status.textContent='Your screening';previousShow.disabled=nextShow.disabled=previous.disabled=next.disabled=gallery.disabled=projectButton.disabled=false;}
    }
    const width=viewport.clientWidth,height=viewport.clientHeight;
    const reserved=(info.offsetHeight||0)+(width<=760?68:20);
    const frame=seatCameraFrame(elapsed/SEAT_JOURNEY_MS,width,height,getMotion(),reserved);
    const endpoint=seatCameraFrame(1,width,height,true,reserved),screenBottom=projectCinemaPoint({x:0,y:-48.75,z:0},endpoint,width,height).y;
    dialog.style.setProperty('--pov-nav-top',`${screenBottom+14}px`);
    const change=turn?headTurnFrame(turn.elapsed/SEAT_TURN_MS,turn.direction,getMotion()):{yaw:0,screenOpacity:1};frame.yaw=change.yaw;
    viewport.style.perspective=`${frame.focal}px`;
    world.style.transform=`translateZ(${frame.focal}px) rotateY(${frame.yaw}rad) rotateX(${frame.angle}rad) translate3d(0,${-frame.y}px,${-frame.z}px)`;
    viewport.style.opacity=String(frame.opacity);
    screen.style.opacity=String(change.screenOpacity);
    for(const seat of seats)seat.node.style.visibility=projectCinemaPoint(seat,frame,width,height).depth < -100?'visible':'hidden';
    if(frame.settled&&!turn)settle();
  }
  function settle(){
    clearTimeout(entranceTimer);entranceTimer=0;
    dialog.dataset.phase='seated';viewport.style.opacity='1';status.textContent='Your screening';
  }
  function tick(now){
    frameId=0;if(!dialog.open)return;
    if(!document.hidden){if(dialog.dataset.phase==='entering')elapsed=seatEntranceElapsed(entranceStart,now);else if(lastTime&&turn)turn.elapsed+=Math.min(80,Math.max(0,now-lastTime));lastTime=now;paint();}
    else lastTime=0;
    if((turn||dialog.dataset.phase!=='seated')&&!document.hidden)frameId=requestAnimationFrame(tick);
  }
  function resume(){
    if(!dialog.open)return;
    if(!getMotion()){elapsed=SEAT_JOURNEY_MS;if(turn)turn.elapsed=SEAT_TURN_MS;}
    lastTime=0;paint();cancelAnimationFrame(frameId);frameId=0;
    if((turn||dialog.dataset.phase!=='seated')&&!document.hidden)frameId=requestAnimationFrame(tick);
  }
  function describeProgramme(){
    turnControls.hidden=programme.length<2;
    programmeCounter.textContent=`${String(programmeIndex+1).padStart(2,'0')} / ${String(Math.max(1,programme.length)).padStart(2,'0')}`;
  }
  function changeScreening(index){
    const project=programme[index];if(!project)return;
    programmeIndex=index;imageInfo=project.imageInfo||{};images=projectMedia(project);openProject=project.id;title.textContent=project.title;const story=projectStoryFor(project.id,project);if(synopsis){synopsis.hidden=!story;synopsis.textContent=story?`FEATURED STORY — ${story.intro}`:'';}if(films){films.hidden=!project.videos?.length;films.textContent=project.videos?.length>1?`WATCH ${project.videos.length} FILMS`:'WATCH FILM';}
    if(seatLabelFor)seatLabel.textContent=seatLabelFor(project);
    describeProgramme();showImage(0);onSelect?.(project.id);
  }
  function turnTo(direction){
    if(!dialog.open||turn||dialog.dataset.phase!=='seated'||programme.length<2)return false;
    const index=adjacentScreening(programmeIndex,direction,programme.length),first=projectMedia(programme[index])[0],src=first?.type==='image'?first.src:first?.poster;
    if(src){const preload=new Image();preload.src=src;}
    turn={direction,index,elapsed:0,swapped:false};dialog.dataset.phase='turning';status.textContent=direction<0?'Previous screening':'Next screening';
    previousShow.disabled=nextShow.disabled=previous.disabled=next.disabled=gallery.disabled=projectButton.disabled=true;resume();return true;
  }
  function showImage(index){
    imageIndex=(index+images.length)%images.length||0;
    const token=++loadToken;cancelImage?.();previewVideo.pause();previewVideo.removeAttribute('src');previewVideo.hidden=true;image.hidden=true;placeholder.hidden=false;
    const item=images[imageIndex],isFilm=item&&item.type!=='image';screen.disabled=!item;gallery.hidden=!item;
    previous.hidden=next.hidden=images.length<2;counter.textContent=images.length?`${String(imageIndex+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}`:'From the archive';
    if(mediaKind)mediaKind.textContent=isFilm?'FILM':['graphic','graphics','rendering','render','design'].includes(item?.mediaKind)?'DESIGN':'PHOTO';
    if(!item){placeholder.textContent='Project material is being prepared.';return;}
    if(item.type==='video'){
      previewVideo.hidden=false;previewVideo.src=item.src;previewVideo.poster=item.poster||'';previewVideo.onloadeddata=()=>{if(token!==loadToken||!dialog.open)return;placeholder.hidden=true;previewVideo.play().catch(()=>{});};previewVideo.onerror=()=>{if(token===loadToken){placeholder.textContent='Open film in full screen';placeholder.hidden=false;}};placeholder.textContent='Loading film…';return;
    }
    const src=isFilm?item.poster:item.src;
    if(!src){placeholder.textContent=isFilm?'WATCH FILM':'Image unavailable';return;}
    placeholder.textContent=isFilm?'Loading film preview…':'Loading image…';
    cancelImage=loadPortfolioImage(image,{src,fallback:item.thumbnail||imageInfo[src]?.thumbnail,alt:isFilm?`${title.textContent} — film preview`:title.textContent},state=>{
      if(token!==loadToken||!dialog.open)return;
      placeholder.hidden=state==='ready';
      if(state==='error'){placeholder.textContent=isFilm?'WATCH FILM':'Image unavailable. Open full screen to retry.';}
    });
  }
  function lockPage(){
    scrollY=window.scrollY;
    savedBody={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};
    document.body.style.position='fixed';document.body.style.top=`${-scrollY}px`;document.body.style.width='100%';
    document.body.classList.add('seat-journey-is-open');
  }
  function releasePage(){
    if(!savedBody)return;
    Object.assign(document.body.style,savedBody);savedBody=null;
    document.body.classList.remove('seat-journey-is-open');
    const root=document.documentElement,behavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';window.scrollTo({top:scrollY,behavior:'instant'});root.style.scrollBehavior=behavior;
  }
  function close(){if(dialog.open)dialog.close();}
  function open(project,{seat='',trigger=null,programme:entries=[],seatLabelFor:labelFor=null}={}){
    if(!project)return false;
    cancelAnimationFrame(frameId);clearTimeout(entranceTimer);loadToken++;elapsed=getMotion()?0:SEAT_JOURNEY_MS;lastTime=0;entranceStart=performance.now();
    turn=null;swipe=null;programme=entries.length?entries:[project];programmeIndex=Math.max(0,programme.findIndex(p=>p.id===project.id));seatLabelFor=labelFor;
    previousShow.disabled=nextShow.disabled=previous.disabled=next.disabled=gallery.disabled=projectButton.disabled=false;describeProgramme();
    imageInfo=project.imageInfo||{};images=projectMedia(project);openProject=project.id;title.textContent=project.title;seatLabel.textContent=seat;status.textContent='Take your seat';if(films){films.hidden=!project.videos?.length;films.textContent=project.videos?.length>1?`WATCH ${project.videos.length} FILMS`:'WATCH FILM';}
    dialog.dataset.phase='entering';
    if(!dialog.open){returnFocus=trigger||document.activeElement;lockPage();dialog.showModal();}
    closeButton.focus({preventScroll:true});showImage(0);resume();
    // Browsers can throttle animation frames while decoding the first film.
    // Navigation must become available after the entrance even if no frame arrives.
    if(dialog.dataset.phase==='entering')entranceTimer=setTimeout(()=>{if(dialog.open&&dialog.dataset.phase==='entering'){elapsed=SEAT_JOURNEY_MS;paint();}},SEAT_JOURNEY_MS+100);
    return true;
  }
  closeButton.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(frameId);clearTimeout(entranceTimer);entranceTimer=0;frameId=0;loadToken++;cancelImage?.();cancelImage=null;releasePage();
    const focus=getReturnSeat?.(openProject)||returnFocus;if(focus?.isConnected)focus.focus({preventScroll:true});returnFocus=null;
    previewVideo.pause();previewVideo.removeAttribute('src');previewVideo.hidden=true;image.removeAttribute('src');images=[];openProject=null;turn=null;swipe=null;dialog.dataset.phase='closed';
  });
  function showGallery(){if(performance.now()<suppressClickUntil||turn)return;if(images.length){previewVideo.pause();onGallery?.({media:images,index:imageIndex,title:title.textContent,id:openProject});}}
  screen.addEventListener('click',showGallery);gallery.addEventListener('click',showGallery);
  films?.addEventListener('click',()=>{if(!turn)onFilm?.(openProject);});
  previous.addEventListener('click',()=>showImage(imageIndex-1));next.addEventListener('click',()=>showImage(imageIndex+1));
  previousShow.addEventListener('click',()=>turnTo(-1));nextShow.addEventListener('click',()=>turnTo(1));
  viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'||dialog.dataset.phase!=='seated')return;swipe={x:event.clientX,y:event.clientY,image:screen.contains(event.target)};});
  viewport.addEventListener('pointerup',event=>{
    if(!swipe)return;const start=swipe;swipe=null;const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.4)return;
    if(event.cancelable)event.preventDefault();suppressClickUntil=performance.now()+400;
    if(start.image){if(images.length>1)showImage(imageIndex+(dx<0?1:-1));}else turnTo(dx<0?1:-1);
  });
  viewport.addEventListener('pointercancel',()=>{swipe=null;});
  projectButton.addEventListener('click',()=>{const id=openProject;close();onProject?.(id);});
  dialog.addEventListener('keydown',event=>{
    if(['PageUp','PageDown'].includes(event.key)){event.preventDefault();turnTo(event.key==='PageDown'?1:-1);return;}
    if(event.key==='ArrowLeft'&&images.length>1){event.preventDefault();showImage(imageIndex-1);}
    if(event.key==='ArrowRight'&&images.length>1){event.preventDefault();showImage(imageIndex+1);}
  });
  document.addEventListener('visibilitychange',resume);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(paint).observe(viewport);
  return {open,close,turnTo,isOpen:()=>dialog.open,setMotion:resume};
}
