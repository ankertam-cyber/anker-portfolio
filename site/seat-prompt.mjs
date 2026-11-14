export function seatPromptPosition(rect,width,height,bubbleWidth=208,bubbleHeight=76){
  const x=Math.max(12,Math.min(width-bubbleWidth-12,rect.left+rect.width/2-bubbleWidth/2));
  const below=rect.top<bubbleHeight+20;
  const y=Math.max(12,Math.min(height-bubbleHeight-12,below?rect.bottom+12:rect.top-bubbleHeight-12));
  return {x,y,below,arrow:Math.max(20,Math.min(bubbleWidth-20,rect.left+rect.width/2-x))};
}

export function mountSeatPrompt(bubble,{onConfirm}={}){
  const confirm=bubble.querySelector('[data-seat-confirm]'),cancel=bubble.querySelector('[data-seat-cancel]'),label=bubble.querySelector('[data-seat-label]');
  let pending=null;
  function hide(restore=false){
    const prior=pending;pending=null;bubble.hidden=true;
    if(prior?.trigger){prior.trigger.setAttribute('aria-expanded','false');if(restore&&prior.trigger.isConnected)prior.trigger.focus({preventScroll:true});}
  }
  function position(){
    if(!pending)return;
    if(!pending.trigger.isConnected){hide();return;}
    const p=seatPromptPosition(pending.trigger.getBoundingClientRect(),window.innerWidth,window.innerHeight,bubble.offsetWidth||208,bubble.offsetHeight||76);
    bubble.style.left=`${p.x}px`;bubble.style.top=`${p.y}px`;bubble.style.setProperty('--seat-arrow',`${p.arrow}px`);bubble.dataset.below=String(p.below);
  }
  function takeSeat(){const choice=pending;if(!choice)return;hide();onConfirm?.(choice);}
  function offer(trigger,{id,label:seatLabel}={}){
    if(pending?.id===id&&pending.trigger===trigger){takeSeat();return;}
    hide();pending={id,trigger,label:seatLabel};label.textContent=seatLabel;
    trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-controls',bubble.id);
    bubble.hidden=false;position();confirm.focus({preventScroll:true});
  }
  confirm.addEventListener('click',takeSeat);cancel.addEventListener('click',()=>hide(true));
  document.addEventListener('pointerdown',event=>{if(pending&&!bubble.contains(event.target)&&!event.target.closest?.('.seat[data-project]'))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pending){event.preventDefault();hide(true);}});
  window.addEventListener('scroll',()=>hide(),{passive:true});window.addEventListener('resize',position);
  return {offer,hide,isOpen:()=>!bubble.hidden};
}
