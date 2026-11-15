import {createDeskBell} from './bell-audio.mjs';
import {ROW_SIZES,CAPACITY,pageCount,pageEntries,seatCoordinates,filterEntries,CINEMAS,cinemaEntries,cinemaPageCount,cinemaPageEntries,projectLocation} from './catalogue.mjs';
import {projectStoryFor} from './project-stories.mjs';
import {mountScene} from './scene.mjs?v=stage-12';
import {mountTagline} from './tagline-motion.mjs?v=live-16';
import {mountOpeningTransition} from './opening-motion.mjs?v=stage-12';
import {mountMediaViewer} from './media-viewer.mjs?v=screen-11';
import {mountSeatJourney} from './seat-journey.mjs?v=seat-22';
import {mountSeatPrompt} from './seat-prompt.mjs?v=seat-23';
import {projectMedia} from './project-media.mjs?v=media-26';
import {loadPortfolioImage} from './image-loader.mjs';
const $=id=>document.getElementById(id);
const viewer=mountMediaViewer($('lightbox'));
const taglineArtwork=$('tagline-artwork');
const state={entries:[],redirects:{},cinema:'c1',page:0,selected:null,dialogId:null,manual:false,screenVersion:0,ticketNumber:0};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let savedMotion;try{savedMotion=sessionStorage.getItem('anker-motion-v30');}catch{}
let motion=savedMotion? savedMotion==='on':!reduced.matches;
let openingTransition=null;
let seatJourney=null;
let seatPrompt=null;
const getMotion=()=>motion;
const scene=mountScene($('scene-canvas'),'assets/media/character-master.png',getMotion,{still:true});
function renderOpeningPlayback(state){const button=$('opening-motion-enable'),status=$('opening-playback-state');button.textContent=motion?'PAUSE OPENING':'PLAY OPENING';button.setAttribute('aria-pressed',String(motion));status.dataset.state=state;status.textContent=state==='playing'?'PLAYING':state==='loading'?'LOADING':state==='starting'?'STARTING':'PAUSED';}
const headline=mountTagline($('tagline-lights'),taglineArtwork,getMotion,renderOpeningPlayback);
function setMotion(value){motion=value;document.documentElement.dataset.motion=motion?'on':'off';$('motion-toggle').setAttribute('aria-pressed',String(!motion));$('motion-toggle').textContent=motion?'Pause motion':'Enable motion';renderOpeningPlayback(motion?'starting':'off');scene.setMotion();headline.setMotion();openingTransition?.refresh();seatJourney?.setMotion();document.querySelectorAll('img[data-animation-source]').forEach(img=>{img.src=motion?img.dataset.animationSource:img.dataset.animationPoster;});}
setMotion(motion);
function rememberMotion(){savedMotion=motion?'on':'off';try{sessionStorage.setItem('anker-motion-v30',savedMotion);}catch{}}
$('motion-toggle').addEventListener('click',()=>{setMotion(!motion);rememberMotion();});
$('opening-motion-enable').addEventListener('click',()=>{setMotion(!motion);rememberMotion();});
reduced.addEventListener('change',()=>{if(!savedMotion)setMotion(!reduced.matches);});

const menu=$('site-menu');
function setMenu(open){menu.hidden=!open;$('menu-toggle').setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-is-open',open);if(open)menu.querySelector('a').focus();}
$('menu-toggle').addEventListener('click',()=>setMenu(menu.hidden));
menu.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
menu.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=[...menu.querySelectorAll('a')];if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();$('menu-toggle').focus();}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();$('menu-toggle').focus();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){setMenu(false);$('menu-toggle').focus();}});

const opening=document.querySelector('.opening');
openingTransition=mountOpeningTransition(opening,$('work'),getMotion);
$('begin-show').addEventListener('click',()=>{$('work').scrollIntoView({behavior:motion?'smooth':'instant'});});
$('replay-opening').addEventListener('click',()=>{window.scrollTo({top:0,behavior:motion?'smooth':'instant'});});

const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const later=ms=>new Promise(resolve=>setTimeout(resolve,motion?ms:0));
function playMicroAnimation(element,name){if(!motion||!element)return;element.classList.remove(name);void element.offsetWidth;element.classList.add(name);const expected=name==='ringing'?'bell-wave':'seat-response';const clear=event=>{if(event.animationName!==expected)return;element.classList.remove(name);element.removeEventListener('animationend',clear);element.removeEventListener('animationcancel',clear);};element.addEventListener('animationend',clear);element.addEventListener('animationcancel',clear);}
const seatIndexFor=id=>state.entries.findIndex(p=>p.id===id);
const selected=()=>state.entries.find(p=>p.id===state.selected);
function buildSeats(){
  seatPrompt?.hide();
  const entries=cinemaPageEntries(state.entries,state.cinema,state.page);const frag=document.createDocumentFragment();let cursor=0;
  ROW_SIZES.forEach((count,row)=>{
    const rowEl=make('div','seat-row');rowEl.append(make('span','row-letter',String.fromCharCode(65+row)));
    for(let col=0;col<count;col++,cursor++){
      const project=entries[cursor],coords=seatCoordinates(cursor);const btn=make('button','seat');btn.type='button';btn.dataset.index=String(cursor);btn.dataset.seat=coords.label;
      const visual=make('span','seat-visual');visual.setAttribute('aria-hidden','true');
      const upholstery=make('img','seat-upholstery');upholstery.src='assets/media/navy-velvet-seat-256-v2.png';upholstery.alt='';upholstery.width=256;upholstery.height=256;upholstery.decoding='async';upholstery.draggable=false;
      visual.append(upholstery,make('span','seat-number',String(col+1).padStart(2,'0')));btn.append(visual);
      if(project){btn.dataset.project=project.id;btn.setAttribute('aria-label',`${coords.label}: ${project.title}`);btn.setAttribute('aria-pressed',String(project.id===state.selected));btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded','false');btn.tabIndex=project.id===state.selected?0:-1;btn.title=project.title;}
      else{btn.disabled=true;btn.setAttribute('aria-label',`${coords.label}: no project assigned`);}
      rowEl.append(btn);
    }frag.append(rowEl);
  });
  $('cinema-map').replaceChildren(frag);const cinema=CINEMAS.find(c=>c.id===state.cinema);$('cinema-map').setAttribute('aria-label',`Cinema ${cinema.number}, page ${state.page+1} project seats`);
  document.querySelectorAll('[data-cinema-count]').forEach(label=>{label.textContent=cinemaEntries(state.entries,label.dataset.cinemaCount).length+' PROJECTS';});$('cinema-number').textContent='CINEMA '+cinema.number;$('cinema-heading').textContent=cinema.title;document.querySelectorAll('[data-cinema-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cinemaCategory===state.cinema)));
  $('cinema-page').textContent=String(state.page+1).padStart(2,'0')+' / '+String(cinemaPageCount(state.entries,state.cinema)).padStart(2,'0');
  $('cinema-prev').disabled=state.page===0;$('cinema-next').disabled=state.page>=cinemaPageCount(state.entries,state.cinema)-1;
  openingTransition.refresh();
}
async function paintScreen(project){
  const token=++state.screenVersion;const img=$('screen-image');img.classList.remove('is-changing');
  let readyImage=null;
  const first=projectMedia(project)[0];const cover=first?.type==='image'?first.src:first?.poster||project.images[0];
  if(cover){const preload=new Image();preload.src=cover;try{await preload.decode();readyImage=preload;}catch{}}
  if(token!==state.screenVersion)return;
  img.classList.add('is-changing');
  await later(160);if(token!==state.screenVersion)return;
  $('screen-project-title').textContent=project.title;$('screen-project-year').textContent=project.year||'';
  const filmFirst=first&&first.type!=='image';
  $('screen-open').setAttribute('aria-label',filmFirst?`Watch ${project.title}`:first?`View ${project.title} full screen`:`Open ${project.title}`);
  $('screen-open-label').textContent=filmFirst?'WATCH FILM':first?'FULL SCREEN':'VIEW PROJECT';
  if(readyImage){
    img.src=readyImage.src;img.alt=project.title;img.hidden=false;$('screen-placeholder').hidden=true;
  }else{img.hidden=true;$('screen-placeholder').hidden=false;$('screen-placeholder-title').textContent=project.title;}
  img.classList.remove('is-changing');
}
function selectProject(id,{manual=true,issue=false}={}){
  const project=state.entries.find(p=>p.id===id);if(!project)return;
  const location=projectLocation(state.entries,id);if(location.cinema!==state.cinema||location.page!==state.page){state.cinema=location.cinema;state.page=location.page;state.selected=id;buildSeats();}
  state.selected=id;if(manual)state.manual=true;
  document.querySelector('.selection-bar').setAttribute('aria-live',manual?'polite':'off');
  const locationNow=projectLocation(state.entries,id);
  $('selected-seat').textContent=`CINEMA ${CINEMAS.find(c=>c.id===locationNow.cinema).number} / PAGE ${locationNow.page+1} / SEAT ${locationNow.seat}`;
  $('selected-title').textContent=project.title;
  document.querySelectorAll('.seat[data-project]').forEach(button=>{const on=button.dataset.project===id;button.setAttribute('aria-pressed',String(on));button.tabIndex=on?0:-1;if(on&&manual)playMicroAnimation(button,'just-selected');});
  paintScreen(project);if(issue)issueTicket(false);
}
async function changeCinema(delta){
  seatPrompt?.hide();
  const target=Math.max(0,Math.min(cinemaPageCount(state.entries,state.cinema)-1,state.page+delta));if(target===state.page)return;
  state.manual=true;const map=$('cinema-map');map.style.setProperty('--slide-direction',delta>0?'-20px':'20px');map.classList.add('changing');
  await later(180);state.page=target;const entry=cinemaPageEntries(state.entries,state.cinema,state.page)[0];state.selected=entry?.id||null;buildSeats();if(entry)selectProject(entry.id);map.classList.remove('changing');
}
$('cinema-prev').addEventListener('click',()=>changeCinema(-1));$('cinema-next').addEventListener('click',()=>changeCinema(1));
document.querySelectorAll('[data-cinema-category]').forEach(button=>button.addEventListener('click',()=>{const cinema=button.dataset.cinemaCategory;if(cinema===state.cinema)return;seatPrompt?.hide();state.cinema=cinema;state.page=0;state.manual=true;const project=cinemaEntries(state.entries,cinema)[0];state.selected=project?.id||null;buildSeats();if(project)selectProject(project.id);}));
seatJourney=mountSeatJourney($('seat-journey'),getMotion,{
  onGallery:({media,index,title,id})=>viewer.open({media,index,title,onProject:()=>{seatJourney.close();openProject(id);}},{fullscreen:true}),
  onProject:id=>openProject(id),
  onFilm:id=>{const p=state.entries.find(p=>p.id===id);if(p?.videos?.length){const media=projectMedia(p);viewer.open({media,index:media.findIndex(item=>item.type!=='image'),title:p.title,onProject:()=>{seatJourney.close();openProject(id);}},{fullscreen:true});}},
  onSelect:id=>selectProject(id),
  getReturnSeat:id=>[...document.querySelectorAll('.seat[data-project]')].find(button=>button.dataset.project===id)
});
const programmeSeat=project=>{const location=projectLocation(state.entries,project.id);return `CINEMA ${CINEMAS.find(c=>c.id===location.cinema).number} / PAGE ${location.page+1} / SEAT ${location.seat}`;};
seatPrompt=mountSeatPrompt($('seat-prompt'),{onConfirm:({id,trigger})=>{selectProject(id,{issue:true});seatJourney.open(selected(),{seat:$('selected-seat').textContent,trigger,programme:cinemaEntries(state.entries,state.cinema),seatLabelFor:programmeSeat});}});
$('cinema-map').addEventListener('click',event=>{const btn=event.target.closest('.seat[data-project]');if(!btn)return;selectProject(btn.dataset.project);seatPrompt.offer(btn,{id:btn.dataset.project,label:btn.dataset.seat});});
$('cinema-map').addEventListener('keydown',event=>{
  const btn=event.target.closest('.seat[data-project]');if(!btn)return;
  const index=Number(btn.dataset.index),coords=seatCoordinates(index);let next=index;
  if(event.key==='ArrowRight')next=index+1;else if(event.key==='ArrowLeft')next=index-1;
  else if(event.key==='ArrowUp'||event.key==='ArrowDown'){
    const row=coords.row+(event.key==='ArrowUp'?-1:1);if(row<0||row>=ROW_SIZES.length)return;
    next=ROW_SIZES.slice(0,row).reduce((a,b)=>a+b,0)+Math.min(coords.column,ROW_SIZES[row]-1);
  }else if(event.key==='Home')next=0;else if(event.key==='End')next=cinemaPageEntries(state.entries,state.cinema,state.page).length-1;else return;
  const nextBtn=$('cinema-map').querySelector(`[data-index="${next}"][data-project]`);if(nextBtn){event.preventDefault();seatPrompt.hide();nextBtn.focus();selectProject(nextBtn.dataset.project);}
});
let swipeStart;
$('cinema-map').addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')swipeStart={x:event.clientX,y:event.clientY};});
$('cinema-map').addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)changeCinema(dx<0?1:-1);});
$('cinema-map').addEventListener('pointercancel',()=>{swipeStart=null;});

function issueTicket(scroll,animate=true){
  const p=selected();if(!p)return;state.ticketNumber++;
  const card=make('article','admission-ticket invitation-ticket');if(motion&&animate)card.classList.add('issuing');const settle=event=>{if(event.type==='animationcancel'||event.animationName==='ticket-stub-nod'){card.classList.remove('issuing');card.removeEventListener('animationend',settle);card.removeEventListener('animationcancel',settle);}};card.addEventListener('animationend',settle);card.addEventListener('animationcancel',settle);card.style.setProperty('--ticket-color','#e4e9ec');
  const details=make('div','invitation-details');details.append(make('span','invitation-kicker','AN OPEN INVITATION'),make('h3','','Your next idea.'),make('p','','Let’s give it a stage.'));
  const link=make('a','invitation-link','MEET AT THE BOX OFFICE');link.href='#contact';details.append(link);
  const stub=make('div','invitation-stub');stub.append(make('span','','ADMIT ONE'),make('span','invitation-barcode'),make('span','','LET’S TALK'));stub.children[1].setAttribute('aria-hidden','true');
  card.append(details,stub);
  $('ticket-output').replaceChildren(card);if(scroll)$('ticket-machine').scrollIntoView({behavior:motion?'smooth':'instant',block:'center'});
}
$('issue-ticket').addEventListener('click',()=>issueTicket(true));
$('screen-open').addEventListener('click',()=>{const p=selected();if(!p)return;state.manual=true;const media=projectMedia(p);if(media.length)viewer.open({media,title:p.title,onProject:()=>openProject(p.id)},{fullscreen:true});else openProject(p.id);});

function renderIndex(query=''){
  const entries=filterEntries(state.entries,query);$('search-count').textContent=`${entries.length} archive ${entries.length===1?'entry':'entries'}`;
  const frag=document.createDocumentFragment();entries.forEach(project=>{const button=make('button','archive-entry');const story=projectStoryFor(project.id);if(story?.spotlight){button.classList.add('has-case-study');button.setAttribute('aria-label',`${project.title} — featured case study`);}const name=make('span','',project.title);if(story?.spotlight)name.append(make('em','archive-case-study-mark','CASE STUDY'));button.append(name,make('span','',project.year||project.projectDate?.year||project.sourceYear||'—'));button.addEventListener('click',async()=>{selectProject(project.id,{issue:true});openProject(project.id);});frag.append(button);});
  if(!entries.length)frag.append(make('p','','No matching projects. Try another name or year.'));
  $('archive-list').replaceChildren(frag);
}
$('archive-toggle').addEventListener('click',()=>{const open=$('archive-panel').hidden;$('archive-panel').hidden=!open;$('archive-toggle').setAttribute('aria-expanded',String(open));if(open){renderIndex($('project-search').value);$('project-search').focus();}});
$('project-search').addEventListener('input',event=>renderIndex(event.target.value));

const dialog=$('project-dialog');let focusReturn=null;let projectImageRequests=[];
function fillProject(id){
  projectImageRequests.forEach(cancel=>cancel());projectImageRequests=[];
  dialog.querySelectorAll('video').forEach(video=>video.pause());
  const p=state.entries.find(entry=>entry.id===id);if(!p)return;
  state.dialogId=id;$('project-dialog-title').textContent=p.title;$('dialog-meta').textContent=[p.category,p.year,p.location].filter(Boolean).join(' / ');
  const story=projectStoryFor(id),storyContainer=$('dialog-story');
  storyContainer.replaceChildren();
  storyContainer.hidden=!story;
  if(story){
    const label=make('p','case-study-eyebrow',story.eyebrow||'CREATIVE CASE STUDY');
    const lead=make('p','case-study-lead',story.intro);
    const tag=make('span','case-study-stage',story.stage==='pitch-concept-only'?'PITCH CONCEPT':story.stage?.startsWith('executed')?'PROJECT STORY':'CREATIVE STORY');
    const header=make('div','case-study-header');header.append(label,tag,lead);
    storyContainer.append(header);
    const sections=make('div','case-study-sections');
    for(const [heading,copy] of [['THE CHALLENGE',story.challenge],['THE IDEA',story.approach],['MY ROLE',story.role],['THE RESULT',story.outcome]]){
      if(!copy)continue;
      const section=make('section','case-study-section');
      section.append(make('h3','',heading),make('p','',copy));sections.append(section);
    }
    storyContainer.append(sections);
    if(story.highlights?.length){
      const ribbon=make('ul','case-study-highlights');
      story.highlights.forEach(item=>ribbon.append(make('li','',item)));
      storyContainer.append(ribbon);
    }
  }
  const frag=document.createDocumentFragment();
  const media=projectMedia(p);
  media.forEach((item,index)=>{
    if(item.type!=='image'){
      const figure=make('figure','project-film-card');
      if(item.type==='vimeo'){
        const button=make('button','project-film-poster'),poster=make('img');button.setAttribute('aria-label',`Watch ${item.label||p.title}`);poster.src=item.poster||p.images[0]||'';poster.alt='';poster.width=item.width||1280;poster.height=item.height||720;poster.loading='lazy';button.append(poster,make('span','film-play-label','PLAY FILM'));
        button.addEventListener('click',()=>viewer.open({media,index,title:p.title},{fullscreen:true}));figure.append(button);
      }else{const video=make('video','project-film');video.src=item.src;video.controls=true;video.playsInline=true;video.preload='none';video.poster=item.poster||p.images[0]||'';video.setAttribute('aria-label',item.label||`${p.title} — film ${index+1}`);figure.append(video);}
      figure.append(make('figcaption','project-film-caption',[item.label||`Film ${index+1}`,item.contribution].filter(Boolean).join(' · ')));frag.append(figure);return;
    }
    const src=item.src,info={...p.imageInfo?.[src],...item},button=make('button','portfolio-image-button'),img=make('img');
    const kind=['graphic','graphics','rendering','render','design'].includes(info.mediaKind)?'design':'photo';button.setAttribute('aria-label',`View ${p.title}, ${kind} ${index+1} fullscreen`);button.dataset.mediaKind=info.mediaKind||'photo';button.setAttribute('aria-busy','true');
    img.width=info.width||1920;img.height=info.height||1280;img.loading='lazy';button.style.aspectRatio=`${img.width} / ${img.height}`;
    const source=info.animated&&!motion?info.thumbnail:src;if(info.animated){img.dataset.animationSource=src;img.dataset.animationPoster=info.thumbnail;button.append(make('span','media-motion-label','MOTION'));}
    const status=make('span','media-load-status','Loading image…');status.setAttribute('role','status');button.append(img,status);
    projectImageRequests.push(loadPortfolioImage(img,{src:source,fallback:info.thumbnail,alt:`${p.title} — ${kind} ${index+1}`},state=>{status.hidden=state==='ready';status.textContent=state==='error'?'Image unavailable. Open to retry.':'Loading image…';button.setAttribute('aria-busy',String(state==='loading'));}));
    button.addEventListener('click',()=>viewer.open({media,index,title:p.title},{fullscreen:true}));frag.append(button);
  });
  if(!media.length)frag.append(make('div','dialog-placeholder','Project material is being prepared.'));
  $('dialog-media').replaceChildren(frag);$('dialog-description').replaceChildren();
  if(!story&&(p.images.length||p.videos?.length)){$('dialog-description').append(make('p','','Selected project visuals.'));}
  else if(!story){$('dialog-description').append(make('p','','This entry is part of the project archive. Images, project details and credits are awaiting curation.'));}
  $('project-previous').disabled=seatIndexFor(id)===0;$('project-next').disabled=seatIndexFor(id)===state.entries.length-1;dialog.scrollTop=0;
}
function openProject(id,{push=true}={}){
  fillProject(id);if(!state.dialogId)return;
  if(!dialog.open){focusReturn=document.activeElement;dialog.showModal();document.body.classList.add('dialog-is-open');}
  if(push)history.pushState({project:id},'',`#project=${encodeURIComponent(id)}`);
  $('project-close').focus();
}
function closeProject({route=true}={}){
  projectImageRequests.forEach(cancel=>cancel());projectImageRequests=[];
  dialog.querySelectorAll('video').forEach(video=>video.pause());
  if(viewer.isOpen())void viewer.close();
  if(dialog.open)dialog.close();document.body.classList.remove('dialog-is-open');state.dialogId=null;
  if(route){if(history.state?.project){history.back();}else history.replaceState(null,'','#work');}
  if(focusReturn?.isConnected)focusReturn.focus({preventScroll:true});
}
$('project-close').addEventListener('click',()=>closeProject());dialog.addEventListener('cancel',event=>{event.preventDefault();closeProject();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeProject();}});
function adjacentProject(delta){const p=state.entries[seatIndexFor(state.dialogId)+delta];if(!p)return;fillProject(p.id);history.replaceState({project:p.id},'',`#project=${encodeURIComponent(p.id)}`);}
$('project-previous').addEventListener('click',()=>adjacentProject(-1));$('project-next').addEventListener('click',()=>adjacentProject(1));
function syncRoute(){const match=location.hash.match(/^#project=(.+)$/);if(match){const requested=decodeURIComponent(match[1]),id=state.redirects[requested]||requested;if(state.entries.some(p=>p.id===id)){if(id!==requested)history.replaceState({project:id},'',`#project=${encodeURIComponent(id)}`);openProject(id,{push:false});}else history.replaceState(null,'','#work');}else if(dialog.open)closeProject({route:false});}
addEventListener('popstate',syncRoute);

// A real bell clip starts only after a direct tap. Web Audio is a recovery path.
const bellSound=createDeskBell({audio:$('desk-bell-audio'),contextFactory:()=>{const Type=window.AudioContext||window.webkitAudioContext;return Type?new Type():null;},onState:value=>{$('desk-bell').dataset.sound=value;}});
$('desk-bell').addEventListener('click',()=>{playMicroAnimation($('desk-bell'),'ringing');void bellSound.ring().then(playing=>{$('bell-message').textContent=playing?'Hello! Drop me a line — let’s talk ideas.':'Tap again to enable sound. Check your device volume.';});});
$('copyright-year').textContent=String(new Date().getFullYear());
document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(video=>video.pause());});
let screenVisible=false;new IntersectionObserver(entries=>{screenVisible=entries[0].isIntersecting;}).observe($('screen-open'));
setInterval(()=>{if(!motion||document.hidden||!screenVisible||state.manual||dialog.open||viewer.isOpen()||!state.entries.length)return;const featured=cinemaEntries(state.entries,state.cinema).filter(p=>projectMedia(p).length);if(featured.length<2)return;const next=featured[(featured.findIndex(p=>p.id===state.selected)+1)%featured.length];selectProject(next.id,{manual:false});},8500);

try{
  const response=await fetch('projects.v28.json',{cache:'no-store'});if(!response.ok)throw new Error('Catalogue unavailable');const data=await response.json();
  state.redirects=data.projectRedirects||{};state.entries=data.previewOnly?data.entries:data.entries.filter(project=>project.publicationStatus==='published');if(!state.entries.length)throw new Error('No entries');state.selected=state.entries[0].id;buildSeats();selectProject(state.selected,{manual:false});issueTicket(false,false);renderIndex();syncRoute();
}catch(error){$('catalogue-error').hidden=false;$('issue-ticket').disabled=true;$('cinema-next').disabled=true;$('cinema-prev').disabled=true;}
