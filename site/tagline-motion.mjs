import {FAIRY_POINTS} from './fairy-points.mjs?v=fairy-15';

export function fairyOpacity(seconds,point){
  const wave=(1-Math.cos((seconds-point.delay*.62)*Math.PI*2/(point.period*.62)))/2;
  return .004+.996*wave*wave*wave;
}
// One live animation clock updates the fixed bulbs; status follows actual frames.
export function mountTagline(layer,image,getMotion,onPlayback=()=>{}){
  if(!layer||!image)return {setMotion(){}};
  let active=true,frame=0,last=null,elapsed=0,painted=-1,reported='';
  const bulbs=FAIRY_POINTS.map(point=>{
    const bulb=document.createElement('span');bulb.className='fairy-light';
    bulb.style.left=(point.x*100)+'%';bulb.style.top=(point.y*100)+'%';bulb.style.opacity='0';
    bulb.style.setProperty('--fairy-period',(point.period*.62)+'s');
    bulb.style.setProperty('--fairy-delay',(point.delay*.62)+'s');
    return bulb;
  });
  layer.replaceChildren(...bulbs);
  layer.addEventListener('animationstart',()=>{if(getMotion()&&active&&!document.hidden)report('playing');});
  function report(state){layer.dataset.playback=state;if(reported!==state){reported=state;onPlayback(state);}}
  function ready(){return image.complete&&image.naturalWidth>0;}
  function draw(now){
    frame=0;
    if(!getMotion()||!ready()||!active||document.hidden){sync();return;}
    const advancing=last!==null&&now>last;
    if(advancing)elapsed+=Math.min(100,now-last)/1000;last=now;
    if(painted<0||now-painted>=32){
      let changed=false;bulbs.forEach((bulb,index)=>{const value=fairyOpacity(elapsed,FAIRY_POINTS[index]).toFixed(3);if(value!==bulb.style.opacity)changed=true;bulb.style.opacity=value;});
      painted=now;
      if(advancing&&changed)report('playing');
    }
    frame=requestAnimationFrame(draw);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=null;painted=-1;
    layer.hidden=!getMotion()||!ready();
    layer.style.setProperty('--fairy-state',getMotion()&&active&&!document.hidden?'running':'paused');
    if(!ready()){report('loading');return;}
    if(!getMotion()){report('off');return;}
    if(!active||document.hidden){report('paused');return;}
    report('starting');frame=requestAnimationFrame(draw);
  }
  image.addEventListener('load',sync);image.addEventListener('error',sync);
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;sync();},{rootMargin:'100px'}).observe(layer.parentElement);
  document.addEventListener('visibilitychange',sync);sync();
  return {setMotion:sync};
}
