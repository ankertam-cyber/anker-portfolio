const GRAPHIC_KINDS=new Set(['graphic','graphics','rendering','render','design']);
const source=item=>typeof item==='string'?item:item?.src;
function unique(items,key){const seen=new Set();return items.filter(item=>{const value=key(item);if(!value||seen.has(value))return false;seen.add(value);return true;});}
export function projectMedia(project){
  const films=unique((project?.videos||[]).filter(v=>v?.src).map(v=>({...v,type:v.type==='vimeo'?'vimeo':'video',mediaKind:'video'})),v=>v.src);
  const photos=[],graphics=[];
  for(const item of project?.images||[]){const src=source(item);if(!src)continue;const info={...(project.imageInfo?.[src]||{}),...(typeof item==='object'?item:{})};const mediaKind=String(info.mediaKind||'photo').toLowerCase();const image={...info,type:'image',src,mediaKind};(GRAPHIC_KINDS.has(mediaKind)?graphics:photos).push(image);}
  for(const item of project?.graphics||[]){const src=source(item);if(!src)continue;const info={...(project.imageInfo?.[src]||{}),...(typeof item==='object'?item:{})};graphics.push({...info,type:'image',src,mediaKind:info.mediaKind||'graphic'});}
  // One shared sequence for the cinema, project dialog and fullscreen viewer.
  // Neither a legacy images-first flag nor an array length can change this order.
  return [...films,...unique([...photos,...graphics],v=>v.src)];
}

export function projectImages(project){return projectMedia(project).filter(item=>item.type==='image');}
