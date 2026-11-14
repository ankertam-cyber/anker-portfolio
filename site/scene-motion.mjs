import {headSway,MOTION_LOOP_SECONDS} from './motion-values.mjs?v=scene-19';
export const SCENE_LOOP_SECONDS=MOTION_LOOP_SECONDS;
export const SCENE_SIZE={width:1448,height:1086};
export const SCENE_ZONES={
  head:{center:[350,370],radius:[235,240],pivot:[435,540],inner:.72},
  pen:{center:[457,377],radius:[145,50],pivot:[498,375],inner:.45},
  dog:{center:[791,568],radius:[140,145],pivot:[795,675],inner:.65}
};
export const SCENE_PATCHES=[{x:60,y:60,width:590,height:600,columns:12,rows:12},{x:640,y:410,width:310,height:320,columns:8,rows:8}];
export function scenePose(seconds){
  const t=Number.isFinite(seconds)?seconds:0;
  const phase=t*Math.PI*2/SCENE_LOOP_SECONDS;
  return {head:headSway(t),pen:Math.sin(phase*3)*.052+Math.sin(phase*6)*.012,dog:Math.sin(phase*2)*.07+Math.sin(phase*4)*.012,dogY:-5*(1-Math.cos(phase*2))};
}
function weight(x,y,{center,radius,inner}){
  const r=((x-center[0])/radius[0])**2+((y-center[1])/radius[1])**2;
  const t=Math.max(0,Math.min(1,(r-inner)/(1-inner)));return 1-t*t*(3-2*t);
}
export function sampleScenePoint(x,y,pose){
  let sx=x,sy=y;
  for(const [name,zone] of Object.entries(SCENE_ZONES)){
    const w=weight(x,y,zone);if(!w)continue;
    const a=pose[name],dx=x-zone.pivot[0],dy=y-zone.pivot[1],c=Math.cos(a),s=Math.sin(a);
    sx+=(c*dx-s*dy-dx)*w;sy+=(s*dx+c*dy-dy)*w;
    if(name==='dog')sy+=(pose.dogY||0)*w;
  }
  return {x:sx,y:sy};
}
export function forwardScenePoint(x,y,pose){
  let dx=x,dy=y;
  for(let i=0;i<5;i++){const sample=sampleScenePoint(dx,dy,pose);dx+=x-sample.x;dy+=y-sample.y;}
  return {x:dx,y:dy};
}
export function triangleTransform(source,target){
  const [p,q,r]=source,[a,b,c]=target,ux=q.x-p.x,uy=q.y-p.y,vx=r.x-p.x,vy=r.y-p.y,det=ux*vy-uy*vx;
  if(Math.abs(det)<1e-8)throw new RangeError('Non-degenerate texture triangle required');
  const A=((b.x-a.x)*vy-(c.x-a.x)*uy)/det,C=((c.x-a.x)*ux-(b.x-a.x)*vx)/det;
  const B=((b.y-a.y)*vy-(c.y-a.y)*uy)/det,D=((c.y-a.y)*ux-(b.y-a.y)*vx)/det;
  return [A,B,C,D,a.x-A*p.x-C*p.y,a.y-B*p.x-D*p.y];
}
