const notes=[48,55,60,64,67,72,76,79],hz=n=>440*Math.pow(2,(n-69)/12);
export class Soundtrack{
 constructor(){this.ctx=null;this.active=false;this.menu=false;this.sector=0;this.next=0;this.beat=0;this.lastHit=0;this.settings={music:.42,sfx:.65};try{Object.assign(this.settings,JSON.parse(localStorage.getItem('sujalagaAudio')||'{}'));}catch{}}
 async unlock(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.75;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=4;this.master.connect(this.compressor);this.compressor.connect(this.ctx.destination);this.music=this.ctx.createGain();this.fx=this.ctx.createGain();this.music.connect(this.master);this.fx.connect(this.master);this.set('music',this.settings.music);this.set('sfx',this.settings.sfx);this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const a=this.noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);}
 if(this.ctx.state==='suspended')await this.ctx.resume();this.next=Math.max(this.next,this.ctx.currentTime+.02);}
 set(type,value){this.settings[type]=Math.max(0,Math.min(1,Number(value)||0));const bus=type==='sfx'?this.fx:this.music;if(bus)bus.gain.setTargetAtTime(this.settings[type],this.ctx.currentTime,.05);try{localStorage.setItem('sujalagaAudio',JSON.stringify(this.settings));}catch{}}
 tone(freq,duration=.15,volume=.12,type='sine',delay=0,end=null,bus='fx',pan=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=Math.max(-.8,Math.min(.8,pan));o.connect(g);g.connect(p);p.connect(this[bus]);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}
 noise(duration,volume=.1,cutoff=1200,delay=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);f.frequency.exponentialRampToValueAtTime(100,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.fx);s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
 play(type,data={}){
  if(!this.ctx||this.settings.sfx<=0)return;const pan=(data.x||0)/10;
  if(type==='fire'){this.tone(620,.095,.035,'triangle',0,220,'fx',pan);this.tone(1300,.05,.012,'sine',0,750,'fx',pan);}
  if(type==='hit'&&this.ctx.currentTime-this.lastHit>.06){this.lastHit=this.ctx.currentTime;this.tone(380+(data.fill||0)*620,.1,.045,'sine',0,650,'fx',pan);}
  if(type==='fill'){const f=660+Math.min(600,(data.combo||0)*19);this.tone(f,.12,.09,'sine',0,null,'fx',pan);this.tone(f*1.5,.23,.065,'triangle',.07,null,'fx',pan);this.noise(.06,.03,1800,.025);if(data.boss)this.fanfare();}
  if(type==='dive')this.tone(360,.38,.035,'sine',0,120,'fx',pan);
  if(type==='bossReady')this.tone(220,.32,.04,'sine',0,440);
  if(type==='bossFire')this.tone(120,.3,.06,'sawtooth',0,70,'fx',pan);
  if(type==='power'){[72,76,79,84].forEach((n,i)=>this.tone(hz(n),.18,.08,'triangle',i*.07));}
  if(type==='surge'){this.noise(.9,.19,5000);this.tone(70,.8,.18,'sawtooth',0,780);[60,67,72,79,84].forEach((n,i)=>this.tone(hz(n),.5,.075,'sine',i*.055));}
  if(type==='hurt'){this.noise(.3,.18,1300);this.tone(120,.35,.16,'triangle',0,35);}
  if(type==='shieldBreak'){this.tone(1100,.3,.1,'sine',0,180);this.noise(.18,.08,4000);}
  if(type==='tick')this.tone(550,.13,.12,'triangle');
  if(type==='launch'){[60,67,72,79].forEach((n,i)=>this.tone(hz(n),.35,.09,'triangle',i*.065));this.noise(.4,.08,1600);}
  if(type==='clear')this.fanfare();
  if(type==='click')this.tone(480,.06,.04,'sine',0,740);
  if(type==='end'&&!data.result?.won){[64,60,55,48].forEach((n,i)=>this.tone(hz(n),.4,.1,'triangle',i*.16));}
 }
 fanfare(){[60,64,67,72,79,76,84].forEach((n,i)=>this.tone(hz(n),.36,.075,'triangle',i*.09));}
 step(){if(!this.ctx||!this.active){if(this.ctx)this.next=this.ctx.currentTime+.06;return;}const now=this.ctx.currentTime;if(this.next<now-.1)this.next=now+.02;while(this.next<now+.12){const at=this.next-now,b=this.beat++,root=[0,5,7,3][Math.floor(b/32)%4]+[0,2,0,3][this.sector],index=[0,2,4,5,3,4,2,1][b%8];
   // A mellow but driving original synth groove: bass, soft percussion, and glassy arpeggios.
   this.tone(hz(notes[index]+root),.31,.032,'sine',at,null,'music',Math.sin(b*.6)*.45);
   if(!this.menu&&b%2===0)this.tone(hz(36+root+(b%8===6?7:0)),.22,.1,'triangle',at,undefined,'music');
   if(b%4===0){if(!this.menu)this.tone(130,.16,.13,'sine',at,42,'music');for(const n of [48,52,55,59])this.tone(hz(n+root),1.35,.014,'triangle',at,null,'music');}
   if(!this.menu&&b%4===2)this.tone(190,.045,.022,'square',at,95,'music');
   if(!this.menu&&b%2===1)this.tone(5000,.022,.009,'square',at,3100,'music',.3);
   this.next+=60/(this.menu?80:108)/2;
  }}
}
