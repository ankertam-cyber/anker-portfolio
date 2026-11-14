export function projectMedia(project){
  const films=(project?.videos||[]).filter(v=>v.src).map(v=>({...v,type:'video'}));
  const images=(project?.images||[]).map(src=>({type:'image',src}));
  return [...films,...images];
}
