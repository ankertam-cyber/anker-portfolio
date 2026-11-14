const clamp=value=>Math.max(0,Math.min(1,value));
const ease=(start,end,value)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t);};

export function openingFrame(progress,motion=true){
  const p=clamp(Number.isFinite(progress)?progress:0);
  if(!motion)return {curtain:0,hero:1,heroLift:0,reveal:0,revealLift:0,stage:1,cinema:1,title:1,titleLift:0,screen:1,screenLift:0,screenScale:1,projection:0};
  const hero=1-ease(.02,.24,p),screen=ease(.62,1,p),title=ease(.60,.88,p);
  return {
    curtain:ease(.02,.50,p),hero,heroLift:-16*(1-hero),
    reveal:ease(.10,.30,p)*(1-ease(.54,.78,p)),
    revealLift:18*(1-ease(.10,.30,p))-64*ease(.54,.78,p),
    stage:1-ease(.76,1,p),cinema:ease(.50,.96,p),
    title,titleLift:28*(1-title),screen,screenLift:60*(1-screen),screenScale:.94+.06*screen,
    projection:Math.sin(screen*Math.PI)*.16
  };
}

export function seatRevealProgress(top,viewport,motion=true){
  return motion?ease(Math.max(1,viewport)*1.04,Math.max(1,viewport)*.80,top):1;
}

export function mountOpeningTransition(opening,work,getMotion){
  const stage=opening.querySelector('.opening-stage'),hero=opening.querySelector('.hero-content');
  const reveal=opening.querySelector('.opening-reveal'),title=work.querySelector('.cinema-title');
  const screen=work.querySelector('.screen-shell'),projection=work.querySelector('.screen-arrival-light');
  const panels=[...opening.querySelectorAll('.hero-curtain')],footnote=opening.querySelector('.opening-footnote');
  if(!stage||!hero||!reveal||!title||!screen)return {refresh(){}};
  const root=document.documentElement,rowLifts=new WeakMap();let queued=0,stageHeight=0;
  root.dataset.stageTransition='on';
  function paint(){
    queued=0;
    const height=stage.offsetHeight;
    if(height!==stageHeight){stageHeight=height;root.style.setProperty('--opening-stage-size',`${height}px`);}
    const motion=getMotion(),range=Math.max(1,opening.offsetHeight-stageHeight);
    const rows=[...work.querySelectorAll('.seat-row')];
    const rowFrames=rows.map(row=>seatRevealProgress(row.getBoundingClientRect().top-(rowLifts.get(row)||0),innerHeight,motion));
    const frame=openingFrame(-opening.getBoundingClientRect().top/range,motion);
    panels.forEach((panel,index)=>{panel.style.transform=`translateX(${(index?1:-1)*frame.curtain*110}%) scaleX(${1-frame.curtain*.1})`;});
    hero.style.opacity=String(frame.hero);hero.style.transform=`translate3d(0,${frame.heroLift}px,0)`;
    hero.style.visibility=frame.hero<.002?'hidden':'visible';hero.inert=frame.hero<.05;
    reveal.style.opacity=String(frame.reveal);reveal.style.transform=`translate3d(0,${frame.revealLift}px,0)`;
    stage.style.opacity=String(frame.stage);stage.style.visibility=frame.stage<.002?'hidden':'visible';
    if(footnote)footnote.style.opacity=String(frame.hero);
    work.style.opacity=String(frame.cinema);work.style.pointerEvents=frame.cinema<.35?'none':'';
    title.style.opacity=String(frame.title);title.style.transform=`translate3d(0,${frame.titleLift}px,0)`;
    screen.style.opacity=String(frame.screen);screen.style.transform=`translate3d(0,${frame.screenLift}px,0) scale(${frame.screenScale})`;
    if(projection)projection.style.opacity=String(frame.projection);
    rows.forEach((row,index)=>{const lift=24*(1-rowFrames[index]);rowLifts.set(row,lift);row.style.opacity=String(rowFrames[index]);row.style.transform=`translate3d(0,${lift}px,0)`;});
  }
  function refresh(){if(!queued)queued=requestAnimationFrame(paint);}
  addEventListener('scroll',refresh,{passive:true});addEventListener('resize',refresh);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{if(Math.abs(window.visualViewport.scale-1)<.01)refresh();});
  new ResizeObserver(refresh).observe(stage);
  // Paint immediately so a direct #work link and restored scroll position are correct.
  paint();
  return {refresh};
}
