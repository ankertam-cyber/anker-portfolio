const array=value=>Array.isArray(value)?value:[];
const source=item=>typeof item==='string'?item:item?.src;
const unique=(items,key)=>{const seen=new Set();return items.filter(v=>{const k=key(v);if(!k||seen.has(k))return false;seen.add(k);return true;});};
export function mergeProjectMedia(project,addition={}){
  const imageInfo={...project.imageInfo,...addition.imageInfo};
  for(const item of [...array(addition.images),...array(addition.graphics)]){if(typeof item==='object'&&item?.src)imageInfo[item.src]={...imageInfo[item.src],...item};}
  for(const item of array(addition.graphics)){const src=source(item);if(src)imageInfo[src]={...imageInfo[src],mediaKind:imageInfo[src]?.mediaKind||'graphic'};}
  return {...project,...addition,images:unique([...array(addition.images),...array(project.images)],source).map(source),videos:unique([...array(addition.videos),...array(project.videos)],v=>v?.src),graphics:unique([...array(project.graphics),...array(addition.graphics)],source),imageInfo,mediaOrder:'films-photos-graphics'};
}
export function curateCatalogue(catalogue,curation,additions={}){
  const existing=new Map(array(catalogue.entries).map(p=>[p.id.toLowerCase(),p]));
  const projects=curation.projects.map(item=>{const source=item.githubProjectId?existing.get(item.githubProjectId.toLowerCase()):null;const base=source?structuredClone(source):{id:item.editorId,images:[],videos:[],graphics:[],imageInfo:{},year:'',category:item.cinema==='c2'?'Concept / Design':'Event',description:'',mediaStatus:'awaiting-material'};
    const merged=mergeProjectMedia(base,additions.projects?.[item.editorId]);
    return {...merged,title:item.title,editorId:item.editorId,cinema:item.cinema,cinemaOrder:item.cinemaOrder,curationStatus:item.decision,publicationStatus:item.decision==='keep'&&['c1','c2'].includes(item.cinema)?'published':'withheld',executionStatus:item.cinema==='c2'?'concept-design':base.executionStatus||'executed',mediaOrder:'films-photos-graphics'};
  });
  const entries=projects.filter(p=>p.publicationStatus==='published').sort((a,b)=>a.cinema.localeCompare(b.cinema)||a.cinemaOrder-b.cinemaOrder);
  return {...catalogue,previewOnly:true,draftOnly:true,mediaCountLimit:null,mediaSequence:['video','photo','graphic'],entries,curationArchive:projects.map(p=>({editorId:p.editorId,title:p.title,cinema:p.cinema,cinemaOrder:p.cinemaOrder,curationStatus:p.curationStatus,executionStatus:p.executionStatus})),projectRedirects:catalogue.projectRedirects||{}};
}
