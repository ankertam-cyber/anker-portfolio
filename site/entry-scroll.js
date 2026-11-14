// Run before body layout so fresh entries never restore a later scene after load.
if(!location.hash && performance.getEntriesByType('navigation')[0]?.type!=='back_forward'){
  history.scrollRestoration='manual';
  window.scrollTo(0,0);
  addEventListener('pagehide',()=>{history.scrollRestoration='auto';},{once:true});
}
