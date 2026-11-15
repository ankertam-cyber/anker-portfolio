import {clone,canonical,validateContent,orderedMedia} from './content-model.mjs?v=bulk1';

// A remotely confirmed library cleanup may arrive while this device has text
// or ordering edits. Merge only additive removals, never unrelated remote edits.
export function rebaseLibraryCleanup(baseline,published,local,entries){
 try{
  const before=typeof baseline==='string'?JSON.parse(baseline):baseline;
  validateContent(before,entries);validateContent(published,entries);validateContent(local,entries);
  const core=doc=>Object.fromEntries(Object.entries(doc).filter(([key])=>!['library','revision','updatedAt'].includes(key)));
  if(canonical(core(before))!==canonical(core(published)))return null;
  const old=before.library||{items:[],removed:[]},remote=published.library||{items:[],removed:[]},draft=local.library||{items:[],removed:[]};
  const prior=new Set(old.removed),now=new Set(remote.removed);if([...prior].some(src=>!now.has(src)))return null;
  const added=remote.removed.filter(src=>!prior.has(src));if(!added.length)return null;
  const changes=new Set(added),previousItems=new Map(old.items.map(item=>[item.src,item])),remoteItems=new Map(remote.items.map(item=>[item.src,item]));
  for(const [src,item]of previousItems)if(canonical(remoteItems.get(src))!==canonical(item))return null;
  for(const item of remote.items)if(!previousItems.has(item.src)&&!changes.has(item.src))return null;
  const result=clone(local),items=new Map([...remote.items,...draft.items].map(item=>[item.src,item]));
  result.library={items:orderedMedia([...items.values()]),removed:[...new Set([...draft.removed,...added])]};
  for(const key of ['revision','updatedAt']){if(published[key]===undefined)delete result[key];else result[key]=published[key];}
  validateContent(result,entries);return result;
 }catch{return null;}
}
