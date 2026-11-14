// Animate the accepted raster directly; preserve its source and silhouette edges.
import {SCENE_ZONES,scenePose} from './scene-motion.mjs?v=scene-19';
import {canvasSceneRenderer} from './scene-canvas.mjs?v=scene-19';
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
export function mountScene(initialCanvas,src,getMotion,options={}){
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
