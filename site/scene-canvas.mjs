import {SCENE_SIZE,SCENE_PATCHES,forwardScenePoint,triangleTransform} from './scene-motion.mjs?v=scene-19';

export function canvasSceneRenderer(canvas,image){
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
