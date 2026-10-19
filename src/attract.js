// The title-screen movie is independent of game audio and stops decoding in a patrol.
export class AttractLoop{
 constructor(video,button,portrait){
  this.video=video;this.button=button;this.portrait=portrait;this.visible=true;this.hidden=false;this.reduced=false;this.userPaused=null;this.generation=0;this.blocked=false;
  video.muted=true;video.loop=true;video.playsInline=true;
  button.onclick=()=>{this.userPaused=this.wanted&&!video.paused;this.blocked=false;this.refresh();};
  portrait.addEventListener('change',()=>this.refresh());
 }
 get wanted(){return this.visible&&!this.hidden&&!(this.userPaused??this.reduced);}
 set(state){if(state.reduced!==undefined&&state.reduced!==this.reduced)this.userPaused=null;Object.assign(this,state);this.refresh();}
 paint(playing){this.button.textContent=playing?'Ⅱ':'▶';this.button.setAttribute('aria-pressed',String(playing));this.button.setAttribute('aria-label',playing?'Pause background animation':'Play background animation');}
 refresh(){
  const token=++this.generation,variant=this.portrait.matches?'portrait':'wide';
  this.video.poster=`./assets/attract-${variant}.webp`;
  const src=`./assets/attract-${variant}.mp4`;
  // A paused movie must show the right poster after rotating the device, too.
  if(this.video.getAttribute('src')&&this.video.getAttribute('src')!==src){this.video.removeAttribute('src');this.video.load();}
  if(!this.wanted){this.video.pause();this.paint(false);return;}
  if(this.video.getAttribute('src')!==src){this.video.src=src;this.video.load();}
  this.paint(true);
  Promise.resolve(this.video.play()).then(()=>{
   if(token!==this.generation){if(!this.wanted)this.video.pause();return;}
   this.blocked=false;this.paint(true);
  }).catch(()=>{if(token===this.generation){this.blocked=true;this.paint(false);}});
 }
}
