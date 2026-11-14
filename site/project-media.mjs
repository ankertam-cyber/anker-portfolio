export function projectMedia(project){
  const films=(project?.videos||[]).filter(v=>v.src).map(v=>({...v,type:v.type==='vimeo'?'vimeo':'video'}));
  const images=(project?.images||[]).map(src=>({type:'image',src,thumbnail:project.imageInfo?.[src]?.thumbnail}));
  return [...films,...images];
}
