import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadMediaPurge} from './load-media-purge.mjs';

export async function deleteArchivedFilms(films,{request=globalThis.fetch,token,repository='ankertam-cyber/anker-portfolio'}={}){
 if(repository!=='ankertam-cyber/anker-portfolio')throw Error('Unexpected media repository');
 if(!films.length)return {deleted:[],bytes:0};if(!token)throw Error('永久刪除影片需要 GitHub 授權；尚未刪除儲存檔');
 const api=async(route,method='GET')=>{const response=await request('https://api.github.com/repos/'+repository+route,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+token}});if(response.status===404)return null;if(!response.ok)throw Error('GitHub media deletion failed ('+response.status+'); cleanup is incomplete');return response.status===204?true:response.json();};
 const release=await api('/releases/tags/portfolio-media-v1');if(!release)return {deleted:films.map(f=>f.archiveName),bytes:0};
 const names=new Set(films.map(f=>f.archiveName)),assets=[];let page=1;
 while(true){const batch=await api('/releases/'+release.id+'/assets?per_page=100&page='+page++);if(!Array.isArray(batch))throw Error('Invalid release asset list');assets.push(...batch.filter(a=>names.has(a.name)));if(batch.length<100)break;}
 for(const asset of assets){const source=films.find(f=>f.archiveName===asset.name);if(!Number.isSafeInteger(asset.id)||asset.size!==source.bytes||asset.digest&&asset.digest!=='sha256:'+source.sha256)throw Error('Release asset differs from the confirmed source');}
 let bytes=0;for(const asset of assets){await api('/releases/assets/'+asset.id,'DELETE');bytes+=asset.size;}
 return {deleted:films.map(f=>f.archiveName),bytes};
}
export async function removeObsoleteMediaCaches({request=globalThis.fetch,token,currentKey}={}){
 if(!currentKey||!currentKey.startsWith('Linux-portfolio-web-v1-'))return 0;
 const api='https://api.github.com/repos/ankertam-cyber/anker-portfolio/actions/caches',headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
 const caches=[];let page=1;while(true){const response=await request(api+'?per_page=100&page='+page++,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Media cache cleanup could not be verified');const items=(await response.json()).actions_caches;if(!Array.isArray(items))throw Error('Invalid media cache list');caches.push(...items);if(items.length<100)break;}
 let bytes=0;for(const cache of caches){if(cache.key===currentKey||!cache.key.startsWith('Linux-portfolio-web-v1-')||cache.ref!=='refs/heads/main')continue;if(!Number.isSafeInteger(cache.id))throw Error('Invalid media cache');const deleted=await request(api+'/'+cache.id,{method:'DELETE',headers,redirect:'error',signal:AbortSignal.timeout(30000)});if(!deleted.ok&&deleted.status!==404)throw Error('Media cache cleanup is incomplete');bytes+=cache.size_in_bytes||0;}return bytes;
}
async function main(){
 const purge=await loadMediaPurge(),content=JSON.parse(await fs.readFile('site/content.json','utf8'));
 const archive=await deleteArchivedFilms(purge.films,{token:process.env.GH_TOKEN});
 const cacheBytes=purge.sources.length?await removeObsoleteMediaCaches({token:process.env.GH_TOKEN,currentKey:process.env.MEDIA_CACHE_KEY}):0;
 const receipt={revision:content.revision||'baseline',completed:true,purged:purge.sources,websiteFilesRemoved:purge.files.length,archivedFilmsRemoved:archive.deleted,archivedBytesRemoved:archive.bytes,oldCacheBytesRemoved:cacheBytes,completedAt:new Date().toISOString()};
 await fs.writeFile('_site/storage-cleanup.json',JSON.stringify(receipt,null,2));console.log('Permanent media cleanup verified: '+purge.sources.length+' sources; '+archive.deleted.length+' archived films.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
