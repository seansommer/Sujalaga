import test from'node:test';import assert from'node:assert/strict';import{AttractLoop}from'../src/attract.js';
function harness(){
 const attrs={},video={paused:true,loads:0,src:'',getAttribute(key){return this[key]||null;},removeAttribute(key){this[key]='';},load(){this.loads++;this.paused=true;},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}},button={setAttribute(key,value){attrs[key]=value;}},portrait={matches:false,addEventListener(name,fn){this.change=fn;}};
 return{video,button,portrait,attrs,loop:new AttractLoop(video,button,portrait)};
}
const flush=()=>new Promise(resolve=>queueMicrotask(resolve));
test('title video is silent, stops during play/backgrounding, and preserves a manual pause',async()=>{
 const{loop,video,button,attrs}=harness();loop.set({visible:true});await flush();
 assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(video.playsInline,true);assert.equal(video.paused,false);
 loop.set({visible:false});assert.equal(video.paused,true);loop.set({visible:true});await flush();assert.equal(video.paused,false);
 loop.set({hidden:true});assert.equal(video.paused,true);loop.set({hidden:false});await flush();assert.equal(video.paused,false);
 button.onclick();assert.equal(video.paused,true);loop.set({visible:false});loop.set({visible:true});assert.equal(video.paused,true);assert.equal(attrs['aria-label'],'Play background animation');
});
test('reduced motion uses a poster until requested, including after a device rotation',async()=>{
 const{loop,video,button,portrait}=harness();loop.set({reduced:true});assert.equal(video.src,'');assert.equal(video.loads,0);assert.equal(video.paused,true);
 button.onclick();await flush();assert.equal(video.paused,false);
 button.onclick();portrait.matches=true;portrait.change();assert.equal(video.src,'');assert.equal(video.poster,'./assets/attract-portrait.webp');assert.equal(video.paused,true);
 button.onclick();await flush();assert.equal(video.src,'./assets/attract-portrait.mp4');assert.equal(video.paused,false);
 loop.set({reduced:false});loop.set({reduced:true});assert.equal(video.paused,true);
});
test('autoplay can retry and a late playback promise cannot restart video during gameplay',async()=>{
 const{loop,video,button,attrs}=harness();video.play=()=>Promise.reject(new Error('Autoplay blocked'));loop.set({visible:true});await flush();await flush();
 assert.equal(loop.blocked,true);assert.equal(attrs['aria-label'],'Play background animation');
 let finish;video.play=()=>new Promise(resolve=>{finish=()=>{video.paused=false;resolve();};});button.onclick();loop.set({visible:false});finish();await flush();
 assert.equal(video.paused,true);assert.equal(attrs['aria-pressed'],'false');
 video.play=()=>{video.paused=false;return Promise.resolve();};loop.set({visible:true});await flush();assert.equal(loop.blocked,false);assert.equal(video.paused,false);
});
