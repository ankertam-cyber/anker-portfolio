// Keep loading, invalid images and network failures visible without an empty frame.
export function loadPortfolioImage(image,{src,fallback='',alt=''}={},onStatus=()=>{}){
  const sources=[...new Set([src,fallback].filter(Boolean))];
  let cancelled=false,index=0,settled=false;
  const clear=()=>{image.onload=null;image.onerror=null;};
  function fail(){
    if(cancelled||settled)return;
    if(++index<sources.length){image.removeAttribute('srcset');image.src=sources[index];return;}
    settled=true;clear();image.removeAttribute('data-loading');image.hidden=true;onStatus('error');
  }
  function ready(){
    if(cancelled||settled)return;
    // A decoded tracking pixel or invalid derivative is not a usable project photo.
    if(image.naturalWidth<2||image.naturalHeight<2){fail();return;}
    settled=true;clear();image.removeAttribute('data-loading');image.hidden=false;onStatus('ready');
  }
  // Keep lazy images in layout; display:none prevents native lazy loading.
  image.hidden=false;image.setAttribute('data-loading','true');image.alt=alt;image.decoding='async';
  image.onload=ready;image.onerror=fail;onStatus('loading');
  if(sources.length){image.src=sources[0];if(image.complete&&image.naturalWidth)queueMicrotask(ready);}
  else fail();
  return ()=>{cancelled=true;clear();};
}
