// Generated from the local module graph; no external runtime dependencies.
(()=>{
"use strict";
const m1=(()=>{
const ROW_SIZES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const CAPACITY = ROW_SIZES.reduce((a, b) => a + b, 0);
function pageCount(entries) { return Math.max(1, Math.ceil(entries.length / CAPACITY)); }
function pageEntries(entries, page) {
  const safe = Math.max(0, Math.min(pageCount(entries) - 1, Math.trunc(page) || 0));
  return entries.slice(safe * CAPACITY, (safe + 1) * CAPACITY);
}
function seatCoordinates(index) {
  if (!Number.isInteger(index) || index < 0 || index >= CAPACITY) throw new RangeError('Seat outside cinema');
  let offset = index;
  for (let row = 0; row < ROW_SIZES.length; row++) {
    if (offset < ROW_SIZES[row]) return { row, column: offset, label: String.fromCharCode(65 + row) + String(offset + 1).padStart(2, '0') };
    offset -= ROW_SIZES[row];
  }
}
function filterEntries(entries, query) {
  const q = query.trim().toLocaleLowerCase();
  return q ? entries.filter(p => [p.title, p.sourceTitle, p.year, p.sourceYear, p.category, p.location].filter(Boolean).join(' ').toLocaleLowerCase().includes(q)) : entries;
}

return {ROW_SIZES,CAPACITY,pageCount,pageEntries,seatCoordinates,filterEntries};
})();
const m4=(()=>{
const MOTION_LOOP_SECONDS=8;
function headSway(seconds){const phase=seconds*Math.PI*2/MOTION_LOOP_SECONDS;return Math.sin(phase)*.054+Math.sin(phase*2)*.008;}

return {MOTION_LOOP_SECONDS,headSway};
})();
const m3=(()=>{
const {headSway,MOTION_LOOP_SECONDS}=m4;

const SCENE_LOOP_SECONDS=MOTION_LOOP_SECONDS;
const SCENE_SIZE={width:1448,height:1086};
const SCENE_ZONES={
  head:{center:[350,370],radius:[235,240],pivot:[435,540],inner:.72},
  pen:{center:[457,377],radius:[145,50],pivot:[498,375],inner:.45},
  dog:{center:[791,568],radius:[140,145],pivot:[795,675],inner:.65}
};
const SCENE_PATCHES=[{x:60,y:60,width:590,height:600,columns:12,rows:12},{x:640,y:410,width:310,height:320,columns:8,rows:8}];
function scenePose(seconds){
  const t=Number.isFinite(seconds)?seconds:0;
  const phase=t*Math.PI*2/SCENE_LOOP_SECONDS;
  return {head:headSway(t),pen:Math.sin(phase*3)*.052+Math.sin(phase*6)*.012,dog:Math.sin(phase*2)*.07+Math.sin(phase*4)*.012,dogY:-5*(1-Math.cos(phase*2))};
}
function weight(x,y,{center,radius,inner}){
  const r=((x-center[0])/radius[0])**2+((y-center[1])/radius[1])**2;
  const t=Math.max(0,Math.min(1,(r-inner)/(1-inner)));return 1-t*t*(3-2*t);
}
function sampleScenePoint(x,y,pose){
  let sx=x,sy=y;
  for(const [name,zone] of Object.entries(SCENE_ZONES)){
    const w=weight(x,y,zone);if(!w)continue;
    const a=pose[name],dx=x-zone.pivot[0],dy=y-zone.pivot[1],c=Math.cos(a),s=Math.sin(a);
    sx+=(c*dx-s*dy-dx)*w;sy+=(s*dx+c*dy-dy)*w;
    if(name==='dog')sy+=(pose.dogY||0)*w;
  }
  return {x:sx,y:sy};
}
function forwardScenePoint(x,y,pose){
  let dx=x,dy=y;
  for(let i=0;i<5;i++){const sample=sampleScenePoint(dx,dy,pose);dx+=x-sample.x;dy+=y-sample.y;}
  return {x:dx,y:dy};
}
function triangleTransform(source,target){
  const [p,q,r]=source,[a,b,c]=target,ux=q.x-p.x,uy=q.y-p.y,vx=r.x-p.x,vy=r.y-p.y,det=ux*vy-uy*vx;
  if(Math.abs(det)<1e-8)throw new RangeError('Non-degenerate texture triangle required');
  const A=((b.x-a.x)*vy-(c.x-a.x)*uy)/det,C=((c.x-a.x)*ux-(b.x-a.x)*vx)/det;
  const B=((b.y-a.y)*vy-(c.y-a.y)*uy)/det,D=((c.y-a.y)*ux-(b.y-a.y)*vx)/det;
  return [A,B,C,D,a.x-A*p.x-C*p.y,a.y-B*p.x-D*p.y];
}

return {SCENE_LOOP_SECONDS,SCENE_SIZE,SCENE_ZONES,SCENE_PATCHES,scenePose,sampleScenePoint,forwardScenePoint,triangleTransform};
})();
const m5=(()=>{
const {SCENE_SIZE,SCENE_PATCHES,forwardScenePoint,triangleTransform}=m3;

function canvasSceneRenderer(canvas,image){
  const context=canvas.getContext('2d',{alpha:false});if(!context)return null;
  const meshes=SCENE_PATCHES.map(patch=>{
    const points=[],triangles=[];
    for(let row=0;row<=patch.rows;row++)for(let col=0;col<=patch.columns;col++)points.push({x:patch.x+col*patch.width/patch.columns,y:patch.y+row*patch.height/patch.rows});
    for(let row=0;row<patch.rows;row++)for(let col=0;col<patch.columns;col++){
      const a=row*(patch.columns+1)+col,b=a+1,c=a+patch.columns+1,d=c+1;
      triangles.push([a,b,d],[a,d,c]);
    }
    return {points,triangles};
  });
  return {mode:'canvas-2d',frameInterval:50,paint(pose){
    const sx=canvas.width/SCENE_SIZE.width,sy=canvas.height/SCENE_SIZE.height;
    context.setTransform(1,0,0,1,0,0);context.drawImage(image,0,0,canvas.width,canvas.height);
    if(!pose.head&&!pose.pen&&!pose.dog&&!pose.dogY)return;
    for(const mesh of meshes){
      const destinations=mesh.points.map(p=>forwardScenePoint(p.x,p.y,pose));
      for(const ids of mesh.triangles){
        const source=ids.map(i=>mesh.points[i]),target=ids.map(i=>destinations[i]);
        if(source.every((p,i)=>Math.abs(p.x-target[i].x)+Math.abs(p.y-target[i].y)<.01))continue;
        const [a,b,c,d,e,f]=triangleTransform(source,target);
        const cx=target.reduce((n,p)=>n+p.x*sx,0)/3,cy=target.reduce((n,p)=>n+p.y*sy,0)/3;
        context.save();context.setTransform(1,0,0,1,0,0);context.beginPath();
        target.forEach((p,i)=>{
          const x=p.x*sx,y=p.y*sy,dist=Math.hypot(x-cx,y-cy)||1;
          const dx=x+(x-cx)*.45/dist,dy=y+(y-cy)*.45/dist;
          if(i)context.lineTo(dx,dy);else context.moveTo(dx,dy);
        });
        context.closePath();context.clip();context.setTransform(a*sx,b*sy,c*sx,d*sy,e*sx,f*sy);
        const x=Math.max(0,Math.min(...source.map(p=>p.x))-2),y=Math.max(0,Math.min(...source.map(p=>p.y))-2);
        const w=Math.min(SCENE_SIZE.width,Math.max(...source.map(p=>p.x))+2)-x,h=Math.min(SCENE_SIZE.height,Math.max(...source.map(p=>p.y))+2)-y;
        context.drawImage(image,x,y,w,h,x,y,w,h);context.restore();
      }
    }
  }};
}

return {canvasSceneRenderer};
})();
const m2=(()=>{
// Animate the accepted raster directly; preserve its source and silhouette edges.
const {SCENE_ZONES,scenePose}=m3;

const {canvasSceneRenderer}=m5;

const vertex='attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}';
const vector=values=>'vec2('+values.map(v=>v.toFixed(1)).join(',')+')';
function webglSceneRenderer(canvas,image,onLost){
  let gl;try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});}catch{}
  if(!gl)return null;
  const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
  const fields=Object.entries(SCENE_ZONES).map(([name,z])=>{const w='zone(p,'+vector(z.center)+','+vector(z.radius)+','+z.inner+')';return 'q+=(turn(p,'+vector(z.pivot)+',u'+name+')-p)*'+w+';'+(name==='dog'?'q.y+=udogY*'+w+';':'');}).join('\n');
  const fragment=[
    'precision '+precision+' float;',
    'uniform sampler2D uImage;uniform float uhead;uniform float upen;uniform float udog;uniform float udogY;varying vec2 vUv;',
    'float zone(vec2 p,vec2 c,vec2 r,float inner){vec2 q=(p-c)/r;return 1.-smoothstep(inner,1.,dot(q,q));}',
    'vec2 turn(vec2 p,vec2 pivot,float a){float s=sin(a),c=cos(a);vec2 d=p-pivot;return pivot+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}',
    'void main(){vec2 size=vec2(1448.,1086.);vec2 p=vec2(vUv.x,1.-vUv.y)*size;vec2 q=p;',
    fields,
    'gl_FragColor=texture2D(uImage,clamp(vec2(q.x/size.x,1.-q.y/size.y),vec2(.001),vec2(.999)));}'
  ].join('\n');
  try{
    const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Scene shader unavailable');return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);
    const uniforms=Object.fromEntries([...Object.keys(SCENE_ZONES),'dogY'].map(name=>[name,gl.getUniformLocation(program,'u'+name)]));
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onLost();},{once:true});
    return {mode:'webgl',frameInterval:32,paint(pose){if(gl.isContextLost())return false;gl.viewport(0,0,canvas.width,canvas.height);for(const [name,location] of Object.entries(uniforms))gl.uniform1f(location,pose[name]);gl.drawArrays(gl.TRIANGLES,0,6);return true;}};
  }catch{return null;}
}
function mountScene(initialCanvas,src,getMotion,options={}){
  const host=initialCanvas.parentElement;
  if(options.still){host.dataset.ready='false';host.dataset.sceneMode='still';return {setMotion(){}};}
  const image=new Image();
  let canvas=initialCanvas,renderer=null,frame=0,active=true,elapsed=0,last=0,painted=-1;
  function fallback(){
    host.dataset.ready='false';
    const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;
    renderer=canvasSceneRenderer(canvas,image);host.dataset.sceneMode=renderer?.mode||'static';refresh();
  }
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,renderer?.mode==='webgl'?2:1.5,image.naturalWidth/Math.max(1,host.clientWidth));
    const w=Math.max(1,Math.round(host.clientWidth*dpr)),h=Math.max(1,Math.round(host.clientHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;painted=-1;}
  }
  function draw(now){
    frame=0;if(!renderer)return;
    if(last&&getMotion()&&active&&!document.hidden)elapsed+=Math.min(100,now-last)/1000;last=now;
    resize();
    if(painted<0||now-painted>=renderer.frameInterval){
      const result=renderer.paint(scenePose(elapsed));
      if(result===false){fallback();return;}
      host.dataset.ready='true';painted=now;
    }
    if(getMotion()&&active&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  function refresh(){cancelAnimationFrame(frame);last=0;painted=-1;if(renderer)frame=requestAnimationFrame(draw);}
  image.onload=()=>{renderer=webglSceneRenderer(canvas,image,fallback);if(!renderer)fallback();else{host.dataset.sceneMode=renderer.mode;refresh();}};
  image.onerror=()=>{host.dataset.sceneMode='static';host.dataset.ready='false';};image.src=src;
  new ResizeObserver(refresh).observe(host);
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;refresh();},{rootMargin:'100px'}).observe(host);
  document.addEventListener('visibilitychange',refresh);
  return {setMotion:refresh};
}

return {mountScene};
})();
const m7=(()=>{
// Fixed points sampled at least four source pixels inside the accepted blue strokes.
const FAIRY_ARTWORK_SHA256="522a321dbd3287695710a297274b57745e10b2fcc88b1d360b5a4faeb7c5f05b";
const FAIRY_POINTS=[
  {
    "x": 0.407919,
    "y": 0.260359,
    "period": 5.422,
    "delay": -3.202,
    "peak": 0.7
  },
  {
    "x": 0.590239,
    "y": 0.31837,
    "period": 4.979,
    "delay": -1.831,
    "peak": 0.74
  },
  {
    "x": 0.576427,
    "y": 0.252072,
    "period": 4.658,
    "delay": -2.709,
    "peak": 0.78
  },
  {
    "x": 0.523941,
    "y": 0.088398,
    "period": 5.511,
    "delay": -3.4,
    "peak": 0.82
  },
  {
    "x": 0.855433,
    "y": 0.287293,
    "period": 5.137,
    "delay": -0.782,
    "peak": 0.7
  },
  {
    "x": 0.369245,
    "y": 0.310083,
    "period": 4.982,
    "delay": -2.706,
    "peak": 0.74
  },
  {
    "x": 0.479742,
    "y": 0.287293,
    "period": 4.761,
    "delay": -0.324,
    "peak": 0.78
  },
  {
    "x": 0.26151,
    "y": 0.115331,
    "period": 5.25,
    "delay": -0.93,
    "peak": 0.82
  },
  {
    "x": 0.311234,
    "y": 0.347376,
    "period": 4.565,
    "delay": -0.34,
    "peak": 0.7
  },
  {
    "x": 0.220074,
    "y": 0.643646,
    "period": 5.374,
    "delay": -5.203,
    "peak": 0.74
  },
  {
    "x": 0.316759,
    "y": 0.496547,
    "period": 4.846,
    "delay": -2.858,
    "peak": 0.78
  },
  {
    "x": 0.416206,
    "y": 0.504834,
    "period": 5.212,
    "delay": -3.182,
    "peak": 0.82
  },
  {
    "x": 0.358195,
    "y": 0.643646,
    "period": 5.42,
    "delay": -4.67,
    "peak": 0.7
  },
  {
    "x": 0.703499,
    "y": 0.612569,
    "period": 4.747,
    "delay": -3.15,
    "peak": 0.74
  },
  {
    "x": 0.45488,
    "y": 0.641575,
    "period": 4.674,
    "delay": -0.814,
    "peak": 0.78
  },
  {
    "x": 0.725599,
    "y": 0.405387,
    "period": 4.975,
    "delay": -4.776,
    "peak": 0.82
  },
  {
    "x": 0.645488,
    "y": 0.714088,
    "period": 4.58,
    "delay": -2.492,
    "peak": 0.7
  },
  {
    "x": 0.565378,
    "y": 0.709945,
    "period": 5.56,
    "delay": -3.23,
    "peak": 0.74
  },
  {
    "x": 0.278085,
    "y": 0.685083,
    "period": 4.633,
    "delay": -3.317,
    "peak": 0.78
  },
  {
    "x": 0.615101,
    "y": 0.759669,
    "period": 5.002,
    "delay": -3.82,
    "peak": 0.82
  },
  {
    "x": 0.55709,
    "y": 0.809392,
    "period": 4.958,
    "delay": -3.166,
    "peak": 0.7
  },
  {
    "x": 0.501842,
    "y": 0.852901,
    "period": 5.385,
    "delay": -1.089,
    "peak": 0.74
  },
  {
    "x": 0.402394,
    "y": 0.71616,
    "period": 5.286,
    "delay": -0.395,
    "peak": 0.78
  },
  {
    "x": 0.78361,
    "y": 0.828039,
    "period": 5.236,
    "delay": -2.89,
    "peak": 0.82
  }
];

return {FAIRY_ARTWORK_SHA256,FAIRY_POINTS};
})();
const m6=(()=>{
const {FAIRY_POINTS}=m7;

function fairyOpacity(seconds,point){
  const wave=(1-Math.cos((seconds-point.delay*.62)*Math.PI*2/(point.period*.62)))/2;
  return .004+.996*wave*wave*wave;
}
// One live animation clock updates the fixed bulbs; status follows actual frames.
function mountTagline(layer,image,getMotion,onPlayback=()=>{}){
  if(!layer||!image)return {setMotion(){}};
  let active=true,frame=0,last=null,elapsed=0,painted=-1,reported='';
  const bulbs=FAIRY_POINTS.map(point=>{
    const bulb=document.createElement('span');bulb.className='fairy-light';
    bulb.style.left=(point.x*100)+'%';bulb.style.top=(point.y*100)+'%';bulb.style.opacity='0';
    return bulb;
  });
  layer.replaceChildren(...bulbs);
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

return {fairyOpacity,mountTagline};
})();
const m8=(()=>{
const clamp=value=>Math.max(0,Math.min(1,value));
const ease=(start,end,value)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t);};

function openingFrame(progress,motion=true){
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

function seatRevealProgress(top,viewport,motion=true){
  return motion?ease(Math.max(1,viewport)*1.04,Math.max(1,viewport)*.80,top):1;
}

function mountOpeningTransition(opening,work,getMotion){
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

return {openingFrame,seatRevealProgress,mountOpeningTransition};
})();
const m10=(()=>{
// Keep loading, invalid images and network failures visible without an empty frame.
function loadPortfolioImage(image,{src,fallback='',alt=''}={},onStatus=()=>{}){
  const sources=[...new Set([src,fallback].filter(Boolean))];
  let cancelled=false,index=0,settled=false;
  const clear=()=>{image.onload=null;image.onerror=null;};
  function fail(){
    if(cancelled||settled)return;
    if(++index<sources.length){image.removeAttribute('srcset');image.src=sources[index];return;}
    settled=true;clear();image.removeAttribute('data-loading');image.hidden=true;onStatus('error');
  }
  function ready(){
    if(cancelled||settled)return;
    // A decoded tracking pixel or invalid derivative is not a usable project photo.
    if(image.naturalWidth<2||image.naturalHeight<2){fail();return;}
    settled=true;clear();image.removeAttribute('data-loading');image.hidden=false;onStatus('ready');
  }
  // Keep lazy images in layout; display:none prevents native lazy loading.
  image.hidden=false;image.setAttribute('data-loading','true');image.alt=alt;image.decoding='async';
  image.onload=ready;image.onerror=fail;onStatus('loading');
  if(sources.length){image.src=sources[0];if(image.complete&&image.naturalWidth)queueMicrotask(ready);}
  else fail();
  return ()=>{cancelled=true;clear();};
}

return {loadPortfolioImage};
})();
const m11=(()=>{
// The official SDK is loaded separately; this controller creates players on demand.
// Official APIs: https://github.com/vimeo/player.js#readme
// Parameters: https://help.vimeo.com/hc/en-us/articles/12426260232977-About-Player-Parameters

function normalizeVimeoEmbedUrl(src) {
  let url;
  try {
    if (typeof src !== 'string') throw new TypeError();
    url = new URL(src);
  } catch {
    throw new TypeError('Expected an absolute Vimeo player URL.');
  }
  if (url.origin !== 'https://player.vimeo.com' || url.username || url.password ||
      !/^\/video\/[1-9][0-9]*\/?$/.test(url.pathname)) {
    throw new TypeError('Only https://player.vimeo.com/video/<numeric ID> is supported.');
  }
  // Preserve observed hashes, privacy h tokens and other query parameters.
  // These explicit overrides enforce manual playback and retain native controls.
  const policy = {
    dnt: '1', title: '0', byline: '0', portrait: '0',
    autoplay: '0', playsinline: '1', controls: '1', background: '0'
  };
  for (const [name, value] of Object.entries(policy)) url.searchParams.set(name, value);
  return url.href;
}

function createVimeoPlayer(iframe) {
  const Player = globalThis.Vimeo?.Player;
  if (typeof Player !== 'function') {
    const error = new Error('The Vimeo player library is unavailable. Please try again.');
    error.name = 'VimeoUnavailableError';
    throw error;
  }
  return new Player(iframe);
}

function ignoreFailure(call) {
  try { return Promise.resolve(call()).catch(() => {}); }
  catch { return Promise.resolve(); }
}

function observe(callback, detail) {
  // Host callbacks must not interrupt player teardown or create unhandled rejections.
  ignoreFailure(() => callback(detail));
}

function errorMessage(error, reason) {
  if (reason === 'timeout') return 'Vimeo took too long to load. Check your connection and try again.';
  if (error?.name === 'PrivacyError') return 'Vimeo restricts access to this film. Please choose another film or try again.';
  if (error?.name === 'PasswordError') return 'This Vimeo film is password protected. Please choose another film or try again.';
  const detail = typeof error?.message === 'string' ? error.message.slice(0, 240) : '';
  return detail ? `This Vimeo film could not load: ${detail}` : 'This Vimeo film could not load. Please try again.';
}

/**
 * open(media) -> Promise<{status: 'ready'|'error'|'closed', ...media}>.
 * Invalid URLs reject before touching an active film. A later SDK error is
 * reported through onStatus even after open() has resolved ready.
 * onStatus receives {status, message, reason?, src, sourcePage, title}.
 * onPlay receives media; the host should pause its native videos there.
 * Call pause() before opening other media, and close() when leaving the viewer.
 * close() detaches synchronously; its Promise only awaits best-effort SDK cleanup.
 */
function mountVimeoPlayer(slot, {
  document: doc = slot?.ownerDocument ?? globalThis.document,
  createPlayer = createVimeoPlayer,
  onStatus = () => {},
  onPlay = () => {},
  timeoutMs = 15000,
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout
} = {}) {
  if (!slot?.appendChild || !doc?.createElement) throw new TypeError('A DOM slot and document are required.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be positive.');
  let current = null;

  const live = session => current === session && !session.disposed;
  const notify = (session, status, message, reason) => observe(onStatus, {
    ...session.media, status, message, ...(reason ? {reason} : {})
  });
  function settle(session, status, message = '') {
    if (session.settled) return;
    session.settled = true;
    session.resolve({...session.media, status, message});
  }
  function stop(session, keepRoot = false) {
    if (session.timer !== null) { cancel(session.timer); session.timer = null; }
    if (!session.disposed) {
      session.disposed = true;
      const player = session.player;
      if (player) {
        ignoreFailure(() => player.off('play', session.handlePlay));
        ignoreFailure(() => player.off('error', session.handleError));
        ignoreFailure(() => player.pause());
        session.cleanup = ignoreFailure(() => player.destroy());
      }
      // Do not wait for a blocked provider, a rejected pause, or destroy Promise.
      // Detaching and navigating this particular frame releases its browsing context.
      session.iframe.remove();
      session.iframe.src = 'about:blank';
      session.player = null;
    }
    if (!keepRoot) {
      if (session.retry) session.retry.removeEventListener('click', session.handleRetry);
      session.root.remove();
    }
    return session.cleanup;
  }
  function fail(session, error, reason = 'sdk-error') {
    if (!live(session)) return;
    session.phase = 'error';
    const message = errorMessage(error, reason);
    stop(session, true);
    session.root.setAttribute('aria-busy', 'false');
    session.message.hidden = false;
    session.message.setAttribute('role', 'alert');
    session.message.textContent = message;
    session.retry = doc.createElement('button');
    session.retry.type = 'button';
    session.retry.textContent = 'Retry film';
    session.handleRetry = () => {
      if (current === session && session.phase === 'error') void open(session.media);
    };
    session.retry.addEventListener('click', session.handleRetry);
    session.root.appendChild(session.retry);
    settle(session, 'error', message);
    notify(session, 'error', message, reason);
  }
  function close() {
    const session = current;
    if (!session) return Promise.resolve();
    current = null; // Invalidate callbacks before any SDK cleanup can run.
    session.phase = 'closed';
    const cleanup = stop(session);
    settle(session, 'closed');
    notify(session, 'closed', 'Film closed.');
    return cleanup;
  }
  function open(media = {}) {
    let normalized;
    try { normalized = normalizeVimeoEmbedUrl(media.src); }
    catch (error) { return Promise.reject(error); }
    if (current) {
      const previous = current;
      current = null;
      previous.phase = 'closed';
      stop(previous);
      settle(previous, 'closed');
    }
    const root = doc.createElement('div');
    root.className = 'vimeo-player';
    root.style.width = '100%';
    root.style.height = '100%';
    root.setAttribute('aria-busy', 'true');
    const message = doc.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = 'Loading Vimeo film…';
    const iframe = doc.createElement('iframe');
    iframe.src = normalized;
    iframe.title = typeof media.title === 'string' && media.title.trim() ? media.title : 'Vimeo film';
    iframe.hidden = true;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('frameborder', '0');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    root.appendChild(message);
    root.appendChild(iframe);
    slot.appendChild(root);
    const session = {
      media: {src: normalized, sourcePage: typeof media.sourcePage === 'string' ? media.sourcePage : '', title: iframe.title},
      root, message, iframe, phase: 'loading', disposed: false, settled: false,
      timer: null, player: null, cleanup: Promise.resolve(), resolve: null, retry: null
    };
    const result = new Promise(resolve => { session.resolve = resolve; });
    current = session;
    session.handlePlay = () => { if (live(session)) observe(onPlay, session.media); };
    session.handleError = error => fail(session, error);
    try {
      session.player = createPlayer(iframe);
      session.player.on('play', session.handlePlay);
      session.player.on('error', session.handleError);
      if (live(session)) {
        session.timer = schedule(() => fail(session, null, 'timeout'), timeoutMs);
        Promise.resolve(session.player.ready()).then(() => {
          if (!live(session) || session.phase !== 'loading') return;
          session.phase = 'ready';
          cancel(session.timer);
          session.timer = null;
          iframe.hidden = false;
          message.hidden = true;
          root.setAttribute('aria-busy', 'false');
          settle(session, 'ready');
          notify(session, 'ready', 'Ready. Press play to start the film.');
        }, error => fail(session, error));
      }
    } catch (error) { fail(session, error); }
    if (live(session)) notify(session, 'loading', message.textContent);
    return result;
  }
  async function pause() {
    const session = current;
    if (!session || !live(session) || !session.player) return false;
    try { await session.player.pause(); return live(session); }
    catch (error) { if (live(session)) fail(session, error, 'pause-error'); return false; }
  }
  return {open, pause, close};
}

return {normalizeVimeoEmbedUrl,createVimeoPlayer,mountVimeoPlayer};
})();
const m9=(()=>{
const {loadPortfolioImage}=m10;

const {mountVimeoPlayer}=m11;

function mountMediaViewer(dialog,{createVimeoPlayer}={}){
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

return {mountMediaViewer};
})();
const m12=(()=>{
const {ROW_SIZES}=m1;

const {loadPortfolioImage}=m10;

const SEAT_JOURNEY_MS=2100;
const SEAT_TURN_MS=980;
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const blend=(a,b,t)=>a+(b-a)*t;
const ease=t=>{const x=clamp(t);return x*x*(3-2*x);};
function headTurnFrame(progress,direction=1,motion=true){
  const p=motion?clamp(progress):1;
  return {yaw:(direction<0?-1:1)*.48*Math.sin(Math.PI*p)**2,screenOpacity:p<.5?1-ease((p-.28)/.22):ease((p-.5)/.24),swap:p>=.5,done:p===1};
}
function adjacentScreening(index,delta,count){return count>0?((index+Math.sign(delta))%count+count)%count:0;}
// One camera path for every project: approach, sit, then lift the gaze to the screen.
const CAMERA_STOPS=Object.freeze([
  {at:0,y:-1400,z:2400,lookY:80,lookZ:800},
  {at:.42,y:-100,z:1750,lookY:230,lookZ:1150},
  {at:.67,y:105,z:1610,lookY:-40,lookZ:180},
  {at:1,y:90,z:1560,lookY:-330,lookZ:0}
]);
function seatCameraFrame(progress,width,height,motion=true,reservedBottom=0){
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
function projectCinemaPoint(point,frame,width,height){
  const dy=point.y-frame.y,dz=point.z-frame.z,s=Math.sin(frame.angle),c=Math.cos(frame.angle);
  const z=s*dy+c*dz,yaw=frame.yaw||0,depth=-Math.sin(yaw)*point.x+Math.cos(yaw)*z,scale=frame.focal/-depth;
  return {x:width/2+(Math.cos(yaw)*point.x+Math.sin(yaw)*z)*scale,y:height*.47+(c*dy-s*dz)*scale,depth,scale};
}

function mountSeatJourney(dialog,getMotion,{onGallery,onProject,onSelect,getReturnSeat,onFilm}={}){
  const $=name=>dialog.querySelector('[data-journey-'+name+']');
  const viewport=$('viewport'),world=$('world'),screen=$('screen'),image=$('image'),placeholder=$('placeholder');
  const title=$('title'),seatLabel=$('seat'),status=$('status'),counter=$('counter');
  const closeButton=$('close'),previous=$('previous'),next=$('next'),gallery=$('gallery'),projectButton=$('project');
  const previousShow=$('previous-show'),nextShow=$('next-show'),programmeCounter=$('programme'),turnControls=$('turn-controls');
  const info=$('info');
  const films=$('films');
  const seats=[];
  let frameId=0,elapsed=0,lastTime=0,returnFocus=null,scrollY=0,openProject=null,images=[],imageIndex=0,loadToken=0;
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
    dialog.dataset.phase='seated';viewport.style.opacity='1';status.textContent='Your screening';
  }
  function tick(now){
    frameId=0;if(!dialog.open)return;
    if(!document.hidden){if(lastTime){const delta=Math.min(80,Math.max(0,now-lastTime));if(turn)turn.elapsed+=delta;else elapsed+=delta;}lastTime=now;paint();}
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
    programmeIndex=index;imageInfo=project.imageInfo||{};images=project.images?.length?project.images:project.videos?.[0]?.poster?[project.videos[0].poster]:[];openProject=project.id;title.textContent=project.title;if(films){films.hidden=!project.videos?.length;films.textContent=project.videos?.length>1?`WATCH ${project.videos.length} FILMS`:'WATCH FILM';}
    if(seatLabelFor)seatLabel.textContent=seatLabelFor(project);
    describeProgramme();showImage(0);onSelect?.(project.id);
  }
  function turnTo(direction){
    if(!dialog.open||turn||dialog.dataset.phase!=='seated'||programme.length<2)return false;
    const index=adjacentScreening(programmeIndex,direction,programme.length),src=programme[index].images?.[0];
    if(src){const preload=new Image();preload.src=src;}
    turn={direction,index,elapsed:0,swapped:false};dialog.dataset.phase='turning';status.textContent=direction<0?'Previous screening':'Next screening';
    previousShow.disabled=nextShow.disabled=previous.disabled=next.disabled=gallery.disabled=projectButton.disabled=true;resume();return true;
  }
  function showImage(index){
    imageIndex=(index+images.length)%images.length||0;
    const token=++loadToken;cancelImage?.();placeholder.hidden=false;
    const src=images[imageIndex];screen.disabled=!src;gallery.hidden=!src;
    previous.hidden=next.hidden=images.length<2;counter.textContent=images.length?`${String(imageIndex+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}`:'From the archive';
    if(!src){placeholder.textContent='Project material is being curated.';return;}
    placeholder.textContent='Loading screening…';
    cancelImage=loadPortfolioImage(image,{src,fallback:imageInfo[src]?.thumbnail,alt:title.textContent},state=>{
      if(token!==loadToken||!dialog.open)return;
      placeholder.hidden=state==='ready';
      if(state==='error'){placeholder.textContent='This image could not load. Choose another image or open the project.';screen.disabled=true;}
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
    cancelAnimationFrame(frameId);loadToken++;elapsed=getMotion()?0:SEAT_JOURNEY_MS;lastTime=0;
    turn=null;swipe=null;programme=entries.length?entries:[project];programmeIndex=Math.max(0,programme.findIndex(p=>p.id===project.id));seatLabelFor=labelFor;
    previousShow.disabled=nextShow.disabled=previous.disabled=next.disabled=gallery.disabled=projectButton.disabled=false;describeProgramme();
    imageInfo=project.imageInfo||{};images=project.images?.length?project.images:project.videos?.[0]?.poster?[project.videos[0].poster]:[];openProject=project.id;title.textContent=project.title;seatLabel.textContent=seat;status.textContent='Take your seat';if(films){films.hidden=!project.videos?.length;films.textContent=project.videos?.length>1?`WATCH ${project.videos.length} FILMS`:'WATCH FILM';}
    dialog.dataset.phase='entering';
    if(!dialog.open){returnFocus=trigger||document.activeElement;lockPage();dialog.showModal();}
    closeButton.focus({preventScroll:true});showImage(0);resume();return true;
  }
  closeButton.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(frameId);frameId=0;loadToken++;cancelImage?.();cancelImage=null;releasePage();
    const focus=getReturnSeat?.(openProject)||returnFocus;if(focus?.isConnected)focus.focus({preventScroll:true});returnFocus=null;
    image.removeAttribute('src');images=[];openProject=null;turn=null;swipe=null;dialog.dataset.phase='closed';
  });
  function showGallery(){if(performance.now()<suppressClickUntil||turn)return;if(images.length)onGallery?.({images,imageInfo,index:imageIndex,title:title.textContent,id:openProject});}
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

return {SEAT_JOURNEY_MS,SEAT_TURN_MS,headTurnFrame,adjacentScreening,seatCameraFrame,projectCinemaPoint,mountSeatJourney};
})();
const m13=(()=>{
function seatPromptPosition(rect,width,height,bubbleWidth=208,bubbleHeight=76){
  const x=Math.max(12,Math.min(width-bubbleWidth-12,rect.left+rect.width/2-bubbleWidth/2));
  const below=rect.top<bubbleHeight+20;
  const y=Math.max(12,Math.min(height-bubbleHeight-12,below?rect.bottom+12:rect.top-bubbleHeight-12));
  return {x,y,below,arrow:Math.max(20,Math.min(bubbleWidth-20,rect.left+rect.width/2-x))};
}

function mountSeatPrompt(bubble,{onConfirm}={}){
  const confirm=bubble.querySelector('[data-seat-confirm]'),cancel=bubble.querySelector('[data-seat-cancel]'),label=bubble.querySelector('[data-seat-label]');
  let pending=null;
  function hide(restore=false){
    const prior=pending;pending=null;bubble.hidden=true;
    if(prior?.trigger){prior.trigger.setAttribute('aria-expanded','false');if(restore&&prior.trigger.isConnected)prior.trigger.focus({preventScroll:true});}
  }
  function position(){
    if(!pending)return;
    if(!pending.trigger.isConnected){hide();return;}
    const p=seatPromptPosition(pending.trigger.getBoundingClientRect(),window.innerWidth,window.innerHeight,bubble.offsetWidth||208,bubble.offsetHeight||76);
    bubble.style.left=`${p.x}px`;bubble.style.top=`${p.y}px`;bubble.style.setProperty('--seat-arrow',`${p.arrow}px`);bubble.dataset.below=String(p.below);
  }
  function takeSeat(){const choice=pending;if(!choice)return;hide();onConfirm?.(choice);}
  function offer(trigger,{id,label:seatLabel}={}){
    if(pending?.id===id&&pending.trigger===trigger){takeSeat();return;}
    hide();pending={id,trigger,label:seatLabel};label.textContent=seatLabel;
    trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-controls',bubble.id);
    bubble.hidden=false;position();confirm.focus({preventScroll:true});
  }
  confirm.addEventListener('click',takeSeat);cancel.addEventListener('click',()=>hide(true));
  document.addEventListener('pointerdown',event=>{if(pending&&!bubble.contains(event.target)&&!event.target.closest?.('.seat[data-project]'))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pending){event.preventDefault();hide(true);}});
  window.addEventListener('scroll',()=>hide(),{passive:true});window.addEventListener('resize',position);
  return {offer,hide,isOpen:()=>!bubble.hidden};
}

return {seatPromptPosition,mountSeatPrompt};
})();
const m14=(()=>{
function projectMedia(project){
  const films=(project?.videos||[]).filter(v=>v.src).map(v=>({...v,type:v.type==='vimeo'?'vimeo':'video'}));
  const images=(project?.images||[]).map(src=>({type:'image',src,thumbnail:project.imageInfo?.[src]?.thumbnail}));
  return [...films,...images];
}

return {projectMedia};
})();
(async()=>{
const {ROW_SIZES,CAPACITY,pageCount,pageEntries,seatCoordinates,filterEntries}=m1;

const {mountScene}=m2;

const {mountTagline}=m6;

const {mountOpeningTransition}=m8;

const {mountMediaViewer}=m9;

const {mountSeatJourney}=m12;

const {mountSeatPrompt}=m13;

const {projectMedia}=m14;

const {loadPortfolioImage}=m10;

const $=id=>document.getElementById(id);
const viewer=mountMediaViewer($('lightbox'));
const taglineArtwork=$('tagline-artwork');
const state={entries:[],page:0,selected:null,dialogId:null,manual:false,screenVersion:0,ticketNumber:0};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let savedMotion;try{savedMotion=localStorage.getItem('anker-motion');}catch{}
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
function rememberMotion(){savedMotion=motion?'on':'off';try{localStorage.setItem('anker-motion',savedMotion);}catch{}}
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
  const entries=pageEntries(state.entries,state.page);const frag=document.createDocumentFragment();let cursor=0;
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
  $('cinema-map').replaceChildren(frag);$('cinema-map').setAttribute('aria-label',`Cinema ${state.page+1} project seats`);
  $('cinema-number').textContent='CINEMA '+String(state.page+1).padStart(2,'0');
  $('cinema-page').textContent=String(state.page+1).padStart(2,'0')+' / '+String(pageCount(state.entries)).padStart(2,'0');
  $('cinema-prev').disabled=state.page===0;$('cinema-next').disabled=state.page>=pageCount(state.entries)-1;
  openingTransition.refresh();
}
async function paintScreen(project){
  const token=++state.screenVersion;const img=$('screen-image');img.classList.remove('is-changing');
  let readyImage=null;
  const cover=project.images[0]||project.videos?.[0]?.poster;
  if(cover){const preload=new Image();preload.src=cover;try{await preload.decode();readyImage=preload;}catch{}}
  if(token!==state.screenVersion)return;
  img.classList.add('is-changing');
  await later(160);if(token!==state.screenVersion)return;
  $('screen-project-title').textContent=project.title;$('screen-project-year').textContent=project.year||'';
  $('screen-open').setAttribute('aria-label',project.videos?.length?`Watch ${project.title}`:project.images.length?`View ${project.title} full screen`:`Open ${project.title}`);
  $('screen-open-label').textContent=project.videos?.length?'WATCH FILM':project.images.length?'FULL SCREEN':'VIEW PROJECT';
  if(readyImage){
    img.src=readyImage.src;img.alt=project.title;img.hidden=false;$('screen-placeholder').hidden=true;
  }else{img.hidden=true;$('screen-placeholder').hidden=false;$('screen-placeholder-title').textContent=project.title;}
  img.classList.remove('is-changing');
}
function selectProject(id,{manual=true,issue=false}={}){
  const project=state.entries.find(p=>p.id===id);if(!project)return;
  state.selected=id;if(manual)state.manual=true;
  document.querySelector('.selection-bar').setAttribute('aria-live',manual?'polite':'off');
  const index=seatIndexFor(id),coords=seatCoordinates(index%CAPACITY);
  $('selected-seat').textContent=`CINEMA ${String(state.page+1).padStart(2,'0')} / SEAT ${coords.label}`;
  $('selected-title').textContent=project.title;
  document.querySelectorAll('.seat[data-project]').forEach(button=>{const on=button.dataset.project===id;button.setAttribute('aria-pressed',String(on));button.tabIndex=on?0:-1;if(on&&manual)playMicroAnimation(button,'just-selected');});
  paintScreen(project);if(issue)issueTicket(false);
}
async function changeCinema(delta){
  seatPrompt?.hide();
  const target=Math.max(0,Math.min(pageCount(state.entries)-1,state.page+delta));if(target===state.page)return;
  state.manual=true;const map=$('cinema-map');map.style.setProperty('--slide-direction',delta>0?'-20px':'20px');map.classList.add('changing');
  await later(180);state.page=target;const entry=pageEntries(state.entries,state.page)[0];state.selected=entry?.id||null;buildSeats();if(entry)selectProject(entry.id);map.classList.remove('changing');
}
$('cinema-prev').addEventListener('click',()=>changeCinema(-1));$('cinema-next').addEventListener('click',()=>changeCinema(1));
seatJourney=mountSeatJourney($('seat-journey'),getMotion,{
  onGallery:({images,imageInfo,index,title,id})=>viewer.open({images,imageInfo,index,title,onProject:()=>{seatJourney.close();openProject(id);}},{fullscreen:true}),
  onProject:id=>openProject(id),
  onFilm:id=>{const p=state.entries.find(p=>p.id===id);if(p?.videos?.length)viewer.open({media:projectMedia(p),title:p.title,onProject:()=>{seatJourney.close();openProject(id);}},{fullscreen:true});},
  onSelect:id=>{const page=Math.floor(seatIndexFor(id)/CAPACITY);if(page!==state.page){state.page=page;state.selected=id;buildSeats();}selectProject(id);},
  getReturnSeat:id=>[...document.querySelectorAll('.seat[data-project]')].find(button=>button.dataset.project===id)
});
const programmeSeat=project=>{const index=seatIndexFor(project.id);return `CINEMA ${String(Math.floor(index/CAPACITY)+1).padStart(2,'0')} / SEAT ${seatCoordinates(index%CAPACITY).label}`;};
seatPrompt=mountSeatPrompt($('seat-prompt'),{onConfirm:({id,trigger})=>{selectProject(id,{issue:true});seatJourney.open(selected(),{seat:$('selected-seat').textContent,trigger,programme:state.entries,seatLabelFor:programmeSeat});}});
$('cinema-map').addEventListener('click',event=>{const btn=event.target.closest('.seat[data-project]');if(!btn)return;selectProject(btn.dataset.project);seatPrompt.offer(btn,{id:btn.dataset.project,label:btn.dataset.seat});});
$('cinema-map').addEventListener('keydown',event=>{
  const btn=event.target.closest('.seat[data-project]');if(!btn)return;
  const index=Number(btn.dataset.index),coords=seatCoordinates(index);let next=index;
  if(event.key==='ArrowRight')next=index+1;else if(event.key==='ArrowLeft')next=index-1;
  else if(event.key==='ArrowUp'||event.key==='ArrowDown'){
    const row=coords.row+(event.key==='ArrowUp'?-1:1);if(row<0||row>=ROW_SIZES.length)return;
    next=ROW_SIZES.slice(0,row).reduce((a,b)=>a+b,0)+Math.min(coords.column,ROW_SIZES[row]-1);
  }else if(event.key==='Home')next=0;else if(event.key==='End')next=pageEntries(state.entries,state.page).length-1;else return;
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
  const frag=document.createDocumentFragment();entries.forEach(project=>{const button=make('button','archive-entry');button.append(make('span','',project.title),make('span','',project.year||project.projectDate?.year||project.sourceYear||'—'));button.addEventListener('click',async()=>{const index=seatIndexFor(project.id);state.page=Math.floor(index/CAPACITY);state.selected=project.id;buildSeats();selectProject(project.id,{issue:true});openProject(project.id);});frag.append(button);});
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
  const frag=document.createDocumentFragment();
  (p.videos||[]).forEach((film,index)=>{
    const figure=make('figure','project-film-card');
    if(film.type==='vimeo'){
      const button=make('button','project-film-poster'),poster=make('img');button.setAttribute('aria-label',`Watch ${film.label||p.title}`);poster.src=film.poster||p.images[0]||'';poster.alt='';poster.width=film.width||1280;poster.height=film.height||720;poster.loading='lazy';
      const play=make('span','film-play-badge');play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor"/></svg>';button.append(poster,play,make('span','film-play-label','PLAY FILM'));
      button.addEventListener('click',()=>viewer.open({media:projectMedia(p),index,title:p.title},{fullscreen:true}));figure.append(button);
    }else{const video=make('video','project-film');video.src=film.src;video.controls=true;video.playsInline=true;video.preload='none';video.poster=film.poster||p.images[0]||'';video.setAttribute('aria-label',`${p.title} — film ${index+1}`);figure.append(video);}
    figure.append(make('figcaption','project-film-caption',[film.label||`Film ${String(index+1).padStart(2,'0')}`,film.contribution].filter(Boolean).join(' · ')));frag.append(figure);
  });
  p.images.forEach((src,index)=>{
    const button=make('button','portfolio-image-button'),img=make('img'),info=p.imageInfo?.[src]||{};
    button.setAttribute('aria-label',`View ${p.title}, image ${index+1} fullscreen`);button.setAttribute('aria-busy','true');
    img.width=info.width||1920;img.height=info.height||1280;img.loading=index?'lazy':'eager';button.style.aspectRatio=`${img.width} / ${img.height}`;
    const source=info.animated&&!motion?info.thumbnail:src;
    if(info.animated){img.dataset.animationSource=src;img.dataset.animationPoster=info.thumbnail;button.append(make('span','media-motion-label','MOTION'));}
    else if(info.thumbnail&&info.width){const thumbnailWidth=Math.round(info.width*Math.min(1,480/Math.max(info.width,info.height)));if(thumbnailWidth<info.width){img.srcset=`${info.thumbnail} ${thumbnailWidth}w, ${src} ${info.width}w`;img.sizes='(max-width:760px) 100vw, 1100px';}}
    const status=make('span','media-load-status','Loading image…');status.setAttribute('role','status');button.append(img,status);
    projectImageRequests.push(loadPortfolioImage(img,{src:source,fallback:info.thumbnail,alt:`${p.title} — image ${index+1}`},state=>{status.hidden=state==='ready';status.textContent=state==='error'?'Photo unavailable. Open to retry.':'Loading image…';button.setAttribute('aria-busy',String(state==='loading'));}));
    button.addEventListener('click',()=>viewer.open({images:p.images,imageInfo:p.imageInfo,index,title:p.title},{fullscreen:true}));frag.append(button);
  });
  if(!p.images.length&&!p.videos?.length)frag.append(make('div','dialog-placeholder','A story waiting to be told.'));
  $('dialog-media').replaceChildren(frag);$('dialog-description').replaceChildren();
  if(p.images.length||p.videos?.length){$('dialog-description').append(make('p','','Selected project visuals.'));}
  else{$('dialog-description').append(make('p','','This entry is part of the project archive. Images, project details and credits are awaiting curation.'));}
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
function syncRoute(){const match=location.hash.match(/^#project=(.+)$/);if(match){const id=decodeURIComponent(match[1]);if(state.entries.some(p=>p.id===id))openProject(id,{push:false});}else if(dialog.open)closeProject({route:false});}
addEventListener('popstate',syncRoute);

$('desk-bell').addEventListener('click',()=>{playMicroAnimation($('desk-bell'),'ringing');$('bell-message').textContent='Hello! Drop me a line — let’s talk ideas.';});
$('copyright-year').textContent=String(new Date().getFullYear());
document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(video=>video.pause());});
let screenVisible=false;new IntersectionObserver(entries=>{screenVisible=entries[0].isIntersecting;}).observe($('screen-open'));
setInterval(()=>{if(!motion||document.hidden||!screenVisible||state.manual||dialog.open||viewer.isOpen()||!state.entries.length)return;const featured=state.entries.filter(p=>p.images.length);if(featured.length<2)return;const next=featured[(featured.findIndex(p=>p.id===state.selected)+1)%featured.length];selectProject(next.id,{manual:false});},8500);

try{
  const response=await fetch('projects.json?v=media-10');if(!response.ok)throw new Error('Catalogue unavailable');const data=await response.json();
  state.entries=data.previewOnly?data.entries:data.entries.filter(project=>project.publicationStatus==='published');if(!state.entries.length)throw new Error('No entries');state.selected=state.entries[0].id;buildSeats();selectProject(state.selected,{manual:false});issueTicket(false,false);renderIndex();syncRoute();
}catch(error){$('catalogue-error').hidden=false;$('issue-ticket').disabled=true;$('cinema-next').disabled=true;$('cinema-prev').disabled=true;}

})().catch(error=>{console.error("Portfolio initialization failed",error);document.documentElement.dataset.bootError=error.name;const s=document.getElementById("opening-playback-state");if(s)s.textContent="RELOAD";});
})();
