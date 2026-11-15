import {validateContent} from './content-model.mjs';

// Bound the entire transfer, including a response body that never finishes.
export async function readSiteJson(url,{request=globalThis.fetch,timeoutMs=15000,attempts=2,cache='no-store',onRetry=()=>{}}={}){
 for(let attempt=1;attempt<=attempts;attempt++){
  const controller=new AbortController();let timer,retryable=true;
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('讀取逾時，請檢查網絡後重試'));},timeoutMs);});
   return await Promise.race([deadline,(async()=>{
    const response=await request(url,{cache,signal:controller.signal});
    if(!response.ok){retryable=response.status===408||response.status===429||response.status>=500;throw Error('網站內容未能讀取（'+response.status+'）');}
    try{return await response.json();}catch(error){if(error.name==='SyntaxError'){retryable=false;throw Error('網站內容格式有誤，請稍後重試');}throw error;}
   })()]);
  }catch(error){if(attempt===attempts||!retryable)throw error;onRetry(attempt);}
  finally{clearTimeout(timer);controller.abort();}
 }
}

export async function readPublishedContent(site,{onStatus=()=>{},...options}={}){
 onStatus('正在讀取作品清單及正式內容…');
 const names=['projects.v28.json','content.json'];let completed=0;
 const [catalogue,content]=await Promise.all(names.map(name=>readSiteJson(new URL(name,site),{...options,cache:name==='content.json'?'no-store':'no-cache',onRetry:()=>onStatus('網絡較慢，正在重試讀取'+(name==='content.json'?'正式內容':'作品清單')+'…')}).then(data=>{completed++;onStatus('已讀取 '+completed+' / 2 份網站資料…');return data;})));
 if(!Array.isArray(catalogue?.entries))throw Error('作品清單格式有誤，請稍後重試');
 const entries=catalogue.entries.filter(p=>p.publicationStatus==='published');validateContent(content,entries);
 return {entries,content};
}
