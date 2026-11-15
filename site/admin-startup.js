// Loaded before the editor so a failed script never leaves an endless spinner.
(()=>{
 const office=document.getElementById('office'),status=document.getElementById('draft-status');
 const failed=message=>{
  if(office.dataset.loadState==='ready')return;
  office.dataset.loadState='error';office.setAttribute('aria-busy','false');status.textContent='網站內容未能載入';
  for(const control of document.querySelectorAll('#office button,#office input,#office select,#connect-open'))control.disabled=true;
  const box=document.createElement('div');box.className='empty-state';
  const copy=document.createElement('p');copy.className='error';copy.textContent=message;
  const retry=document.createElement('button');retry.textContent='重新載入後台';retry.addEventListener('click',()=>location.reload());box.append(copy,retry);
  const backup=document.createElement('button');backup.textContent='下載原有草稿備份';backup.addEventListener('click',()=>{
   try{const raw=localStorage.getItem('anker-portfolio-owner-draft-v1');if(!raw){copy.textContent='呢個瀏覽器未有已儲存草稿。';return;}const saved=JSON.parse(raw),url=URL.createObjectURL(new Blob([JSON.stringify({format:'anker-portfolio-draft-v1',...saved},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='anker-portfolio-draft-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{copy.textContent='暫時未能下載草稿；原有瀏覽器資料仍保留。';}
  });box.append(backup);document.getElementById('editor').replaceChildren(box);
 };
 const timer=setTimeout(()=>failed('讀取時間較長，請檢查網絡後重試。原有草稿仍保留。'),40000);
 addEventListener('anker-admin-ready',()=>clearTimeout(timer),{once:true});
 addEventListener('anker-admin-error',event=>{clearTimeout(timer);failed(event.detail||'後台程式未能載入，請重新載入。');});
 addEventListener('error',event=>{if(event.target?.id==='admin-entry'){clearTimeout(timer);failed('後台程式未能下載，請檢查網絡後重試。');}},true);
})();
