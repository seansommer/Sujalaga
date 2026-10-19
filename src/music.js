export const MUSIC={
 menu:{file:'menu.mp3',title:'Title Screen',artist:'Juhani Junkala'},
 'sector-1':{file:'sector-1.mp3',title:'Level 1',artist:'Juhani Junkala'},
 'sector-2':{file:'sector-2.mp3',title:'Level 2',artist:'Juhani Junkala'},
 'sector-3':{file:'sector-3.mp3',title:'Level 3',artist:'Juhani Junkala'},
 'sector-4':{file:'sector-4.mp3',title:'8-bit Epic Space Shooter',artist:'HydroGene'},
 boss:{file:'boss.mp3',title:'Space Boss Battle',artist:'MintoDog'}
};
export function musicFor(sim,menu=false){return menu?'menu':sim?.boss?'boss':`sector-${(sim?.sector||0)+1}`;}
// A late network response must never start a previous stage's music or unpause audio.
export class MusicDeck{
 constructor(ctx,output,load,onStatus=()=>{}){this.ctx=ctx;this.output=output;this.load=load;this.onStatus=onStatus;this.desired=null;this.current=null;this.generation=0;this.offsets=new Map();this.failed=false;this.rate=1;}
 stop(fade=.12){if(!this.current)return;const {source,gain,key,start,offset,buffer}=this.current,t=this.ctx.currentTime;this.offsets.set(key,(offset+(t-start)*this.current.rate)%buffer.duration);gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,fade/3);source.stop(t+fade+.04);this.current=null;}
 async select(key){
  if(this.desired===key)return;this.desired=key;const token=++this.generation;this.failed=false;
  if(!key){this.stop();return;}
  this.onStatus('Loading arcade soundtrack…');
  try{
   const buffer=await this.load(key);
   if(token!==this.generation||this.desired!==key)return;
   this.stop(.8);const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),t=this.ctx.currentTime,offset=this.offsets.get(key)||0;
   source.buffer=buffer;source.loop=true;source.playbackRate.value=this.rate;source.connect(gain);gain.connect(this.output);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.7,t+.9);source.start(t,offset%buffer.duration);
   source.onended=()=>{source.disconnect();gain.disconnect();};this.current={source,gain,key,start:t,offset,buffer,rate:this.rate};this.onStatus(`${MUSIC[key].title} · ${MUSIC[key].artist}`);
  }catch{if(token===this.generation){this.failed=true;this.onStatus('Music could not load. Resume or reopen sound settings to retry.');}}
 }
 setRate(rate){if(this.rate===rate)return;this.rate=rate;if(this.current){const c=this.current,t=this.ctx.currentTime;c.offset=(c.offset+(t-c.start)*c.rate)%c.buffer.duration;c.start=t;c.rate=rate;c.source.playbackRate.setValueAtTime(rate,t);}}
 retry(){if(this.failed){this.desired=null;this.failed=false;}}
}
