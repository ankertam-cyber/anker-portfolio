const HEX=/^[a-f0-9]{64}$/i;
export const isComparablePhoto=item=>item?.type==='image'&&!['graphic','graphics','rendering','render','design'].includes(String(item.mediaKind||'').toLowerCase())&&!item.animated&&!/\.(?:gif|svg)(?:[?#]|$)/i.test(item.src);
export function hashDistance(a,b){if(!/^[a-f0-9]{16}$/i.test(a||'')||!/^[a-f0-9]{16}$/i.test(b||''))return 64;let bits=BigInt('0x'+a)^BigInt('0x'+b),count=0;while(bits){bits&=bits-1n;count++;}return count;}
export function similarPhotos(a,b){
 if(!a||!b||!Number.isFinite(a.detail)||!Number.isFinite(b.detail)||a.detail<12||b.detail<12||!a.width||!a.height||!b.width||!b.height)return false;
 const ratio=(a.width/a.height)/(b.width/b.height);if(Math.abs(Math.log(ratio))>.025)return false;
 if(hashDistance(a.p,b.p)>6||hashDistance(a.d,b.d)>10)return false;
 if(a.color?.length!==27||b.color?.length!==27)return false;
 return a.color.reduce((sum,value,i)=>sum+Math.abs(value-b.color[i]),0)/27<=14;
}
const quality=item=>(item.fingerprint?.width||item.width||0)*(item.fingerprint?.height||item.height||0);
export function findPhotoDuplicates(input){
 const seen=new Set(),items=input.filter(item=>isComparablePhoto(item)&&item.fingerprint&&!seen.has(item.src)&&seen.add(item.src)).map((item,index)=>({...item,sourceIndex:index}));
 const parents=items.map((_,i)=>i),keys=new Map();const root=i=>parents[i]===i?i:(parents[i]=root(parents[i]));
 items.forEach((item,i)=>{for(const key of ['sha256','pixels']){const value=item.fingerprint[key];if(!HEX.test(value||''))continue;const identity=key+':'+value;if(keys.has(identity))parents[root(i)]=root(keys.get(identity));else keys.set(identity,i);}});
 const clusters=new Map();items.forEach((item,i)=>{const id=root(i);if(!clusters.has(id))clusters.set(id,[]);clusters.get(id).push(item);});
 const rank=(a,b)=>quality(b)-quality(a)||(b.fingerprint.bytes||0)-(a.fingerprint.bytes||0)||a.sourceIndex-b.sourceIndex;
 const nodes=[...clusters.values()].map(group=>{group.sort(rank);return{items:group,keep:group[0].src,fingerprint:group[0].fingerprint};}).sort((a,b)=>rank(a.items[0],b.items[0]));
 const exact=nodes.filter(node=>node.items.length>1).map(node=>({id:'exact:'+node.keep,kind:'exact',keep:node.keep,items:node.items}));
 const available=new Set(nodes),similar=[];
 for(const anchor of nodes){if(!available.delete(anchor))continue;const members=[anchor];
  for(const candidate of nodes){if(!available.has(candidate))continue;if(members.every(member=>similarPhotos(member.fingerprint,candidate.fingerprint))){members.push(candidate);available.delete(candidate);}}
  if(members.length>1)similar.push({id:'similar:'+anchor.keep,kind:'similar',keep:anchor.keep,items:members.flatMap(node=>node.items)});
 }
 return{exact,similar,compared:items.length};
}
export function duplicateRemovalItems(groups,keepers,selected){
 const protectedSources=new Set(groups.map(group=>keepers.get(group.id)||group.keep)),bySource=new Map(groups.flatMap(group=>group.items.map(item=>[item.src,item])));
 for(const src of selected){if(!bySource.has(src))throw Error('選取嘅相片已唔喺呢份比對結果');if(protectedSources.has(src))throw Error('每組最少需要保留一張相片');}
 return [...selected].map(src=>bySource.get(src));
}
export function recommendedDuplicateSources(groups,keepers=new Map()){
 return new Set(groups.filter(group=>group.kind==='exact').flatMap(group=>group.items.filter(item=>item.src!==(keepers.get(group.id)||group.keep)).map(item=>item.src)));
}
