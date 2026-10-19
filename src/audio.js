import{MUSIC,MusicDeck,musicFor}from'./music.js';
import{Announcer,VOICE_FILES}from'./announcer.js';
import{BOSS_WEAPONS}from'./weapons.js';
const hz=n=>440*Math.pow(2,(n-69)/12);
export class Soundtrack{
 constructor(){this.ctx=null;this.active=false;this.menu=false;this.sector=0;this.buffers=new Map();this.samples=new Map();this.voices=0;this.onStatus=()=>{};this.lastHit=0;this.settings={music:.2,sfx:.75,voice:.9,mixVersion:2};try{const saved=JSON.parse(localStorage.getItem('sujalagaAudio')||'{}');if(!saved.mixVersion){if(saved.music===.42)delete saved.music;if(saved.sfx===.65)delete saved.sfx;}for(const key of ['music','sfx','voice'])if(Number.isFinite(saved[key]))this.settings[key]=Math.max(0,Math.min(1,saved[key]));}catch{}}
 get active(){return this._active;}
 set active(value){this._active=!!value;if(!this._active){this.deck?.select(null);this.announcer?.clear();}}
 async unlock(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.75;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=4;this.master.connect(this.compressor);this.compressor.connect(this.ctx.destination);this.music=this.ctx.createGain();this.fx=this.ctx.createGain();this.voiceGain=this.ctx.createGain();this.voiceGain.connect(this.master);this.announcer=new Announcer({now:()=>this.ctx.currentTime,start:(key,done)=>this.speak(key,done),duck:value=>{this.ducked=value;this.music.gain.setTargetAtTime(this.settings.music*(value?.38:1),this.ctx.currentTime,.09);}});this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=14000;this.music.connect(this.filter);this.filter.connect(this.master);this.fx.connect(this.master);this.deck=new MusicDeck(this.ctx,this.music,key=>this.loadMusic(key),message=>this.onStatus(message));this.set('music',this.settings.music);this.set('sfx',this.settings.sfx);this.set('voice',this.settings.voice);this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const a=this.noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);}
 if(this.ctx.state==='suspended')await this.ctx.resume();this.deck.retry();if(!this.samplesStarted){this.samplesStarted=true;this.loadSamples();}}
 set(type,value){this.settings[type]=Math.max(0,Math.min(1,Number(value)||0));const bus=type==='sfx'?this.fx:type==='voice'?this.voiceGain:this.music;if(bus)bus.gain.setTargetAtTime(this.settings[type]*(type==='music'&&this.ducked?.38:1),this.ctx.currentTime,.05);if(type==='voice'&&this.settings.voice===0)this.announcer?.clear();try{localStorage.setItem('sujalagaAudio',JSON.stringify(this.settings));}catch{}}
 tone(freq,duration=.15,volume=.12,type='sine',delay=0,end=null,bus='fx',pan=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=Math.max(-.8,Math.min(.8,pan));o.connect(g);g.connect(p);p.connect(this[bus]);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}
 noise(duration,volume=.1,cutoff=1200,delay=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);f.frequency.exponentialRampToValueAtTime(100,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.fx);s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
 play(type,data={}){
  if(!this.ctx)return;if(this.settings.voice>0)this.announcer?.event(type,data);if(this.settings.sfx<=0)return;const pan=(data.x||0)/10;
  if(type==='fire'){const key=['laser-green','laser-citrus','laser-carrot','laser-berry'][data.sector??this.sector];if(!this.sample(key,.18,pan,data.twin?.92:1))this.tone(820,.11,.06,'sawtooth',0,180,'fx',pan);this.tone(85,.055,.06,'sine',0,42,'fx',pan);}
  if(type==='hit'&&this.ctx.currentTime-this.lastHit>.06){this.lastHit=this.ctx.currentTime;this.tone(380+(data.fill||0)*620,.1,.045,'sine',0,650,'fx',pan);}
  if(type==='fill'){this.sample(data.boss?'impact':'fill',data.boss?.8:.2,pan,1+Math.min(.25,(data.combo||0)*.006));const f=660+Math.min(600,(data.combo||0)*19);this.tone(f,.12,.09,'sine',0,null,'fx',pan);this.tone(f*1.5,.23,.065,'triangle',.07,null,'fx',pan);this.noise(.06,.03,1800,.025);if(data.boss)this.fanfare();}
  if(type==='dive')this.tone(360,.38,.035,'sine',0,120,'fx',pan);
  if(type==='bossReady'){this.tone(180+this.sector*50,.6,.07,'sawtooth',0,600+this.sector*150);this.tone(80,.65,.06,'sine',0,160);}
  if(type==='bossFire'){this.sample(BOSS_WEAPONS[data.sector??this.sector].sound,.48,pan);this.tone(100,.25,.1,'triangle',0,35,'fx',pan);}
  if(type==='power'){[72,76,79,84].forEach((n,i)=>this.tone(hz(n),.18,.08,'triangle',i*.07));}
  if(type==='surge'){this.sample('surge',.85,pan);this.noise(.9,.13,5000);this.tone(70,.8,.18,'sawtooth',0,780);[60,67,72,79,84].forEach((n,i)=>this.tone(hz(n),.5,.075,'sine',i*.055));}
  if(type==='hurt'){this.sample('impact',.6,pan,.85);this.noise(.3,.12,1300);this.tone(120,.35,.16,'triangle',0,35);}
  if(type==='shieldBreak'){this.sample('shield',.5,pan);this.tone(1100,.3,.1,'sine',0,180);this.noise(.18,.08,4000);}
  if(type==='ready'){this.sample('shield',.3,0,1.5);[72,79,84,91].forEach((n,i)=>this.tone(hz(n),.3,.08,'triangle',i*.09));}
  if(type==='tick'){this.tone(660,.18,.12,'square');this.tone(1320,.12,.035,'sine');}
  if(type==='launch'){this.tone(1320,.58,.13,'square');this.tone(1980,.48,.05,'triangle');this.tone(2640,.3,.025,'sine');this.noise(.12,.035,2800);}
  if(type==='clear')this.fanfare();
  if(type==='click')this.tone(480,.06,.04,'sine',0,740);
  if(type==='end'&&!data.result?.won){[64,60,55,48].forEach((n,i)=>this.tone(hz(n),.4,.1,'triangle',i*.16));}
 }
 fanfare(){[60,64,67,72,79,76,84].forEach((n,i)=>this.tone(hz(n),.36,.075,'triangle',i*.09));}
 async decode(file){const response=await fetch(new URL(`./assets/audio/${file}`,import.meta.url));if(!response.ok)throw Error('Audio unavailable');return this.ctx.decodeAudioData(await response.arrayBuffer());}
 async loadMusic(key){
  if(this.buffers.has(key)){const cached=this.buffers.get(key);this.buffers.delete(key);this.buffers.set(key,cached);return cached;}
  const pending=this.decode(MUSIC[key].file);this.buffers.set(key,pending);
  try{const buffer=await pending;while(this.buffers.size>2){const oldest=[...this.buffers.keys()].find(k=>k!==key&&k!==this.deck.current?.key);if(!oldest)break;this.buffers.delete(oldest);}return buffer;}catch(e){this.buffers.delete(key);throw e;}
 }
 async loadSamples(){await Promise.allSettled(['laser-green','laser-citrus','laser-carrot','laser-berry','impact','surge','shield','boss-shot','fill',...BOSS_WEAPONS.map(w=>w.sound),...VOICE_FILES.map(v=>'voice-'+v)].map(async key=>{const buffer=await this.decode(key+'.mp3');this.samples.set(key,buffer);}));}
 sample(key,volume=1,pan=0,rate=1){
  const buffer=this.samples.get(key);if(!buffer||this.voices>=24)return false;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),p=this.ctx.createStereoPanner();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;p.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(gain);gain.connect(p);p.connect(this.fx);source.start();this.voices++;source.onended=()=>{this.voices--;source.disconnect();gain.disconnect();p.disconnect();};return true;
 }
 speak(key,done){
  const buffer=this.samples.get('voice-'+key);if(!buffer||this.settings.voice<=0)return null;
  const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.voiceGain);source.onended=()=>{source.disconnect();done();};source.start();return()=>{source.onended=null;source.stop();source.disconnect();};
 }
 step(sim){
  if(!this.ctx)return;this.announcer?.step();this.deck.setRate(this.menu?1:sim?.boss?(sim.enemies?.[0]?.phase===2?1.035:1):1+(((sim?.wave||1)-1)%4)*.025);this.deck.select(this.active?musicFor(sim,this.menu):null);
  const openness=this.menu?6000:sim?.boss?18000:6500+((sim?.wave||1)-1)%4*3000;
  if(openness!==this.openness){this.openness=openness;this.filter.frequency.setTargetAtTime(openness,this.ctx.currentTime,.8);}
 }
}
