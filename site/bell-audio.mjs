// Use a real media element for a direct tap, with resumed Web Audio as fallback.
export function createDeskBell({audio,contextFactory,onState=()=>{},schedule=globalThis.setTimeout}={}){
  let context;
  async function ring(){
    try{
      if(globalThis.navigator?.audioSession)globalThis.navigator.audioSession.type='playback';
    }catch{}
    if(audio){
      try{audio.pause();audio.currentTime=0;audio.muted=false;audio.volume=.85;await audio.play();onState('playing');return true;}catch{}
    }
    try{
      if(!context||context.state==='closed')context=contextFactory?.();
      if(!context)throw Error('Audio unavailable');
      if(context.state!=='running')await context.resume();
      if(context.state!=='running')throw Error('Audio is paused');
      const start=context.currentTime+.015,master=context.createGain();master.gain.setValueAtTime(.22,start);master.gain.exponentialRampToValueAtTime(.0001,start+1.65);master.connect(context.destination);
      for(const [pitch,volume,seconds] of [[1046.5,.64,1.5],[1318.5,.25,1.25],[1864.7,.16,1.02],[2637,.09,.8]]){
        const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(pitch,start);gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+seconds);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+seconds+.02);
      }
      schedule(()=>master.disconnect(),1900);onState('playing');return true;
    }catch{onState('blocked');return false;}
  }
  return {ring};
}
