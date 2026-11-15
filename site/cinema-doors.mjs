export const DEFAULT_CINEMA='c1';
export function mountCinemaDoors(buttons,{onEnter,getMotion=()=>true,afterEnter=()=>{},schedule=globalThis.setTimeout,cancel=globalThis.clearTimeout}={}){
 let busy=false,timer;
 function finish(button){
  try{onEnter(button.dataset.cinemaCategory);afterEnter();}
  finally{button.classList.remove('is-opening');button.removeAttribute('aria-busy');busy=false;}
 }
 for(const button of buttons)button.addEventListener('click',()=>{
  if(busy)return;busy=true;button.classList.add('is-opening');button.setAttribute('aria-busy','true');
  if(!getMotion()){finish(button);return;}
  timer=schedule(()=>finish(button),680);
 });
 return {cancel(){cancel(timer);busy=false;for(const b of buttons){b.classList.remove('is-opening');b.removeAttribute('aria-busy');}}};
}
