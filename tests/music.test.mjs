import test from'node:test';import assert from'node:assert/strict';import{MusicDeck,musicFor}from'../src/music.js';
import{Soundtrack}from'../src/audio.js';
function harness(){const started=[],stopped=[],param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}}),ctx={currentTime:0,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBufferSource:()=>({playbackRate:param(),connect(){},disconnect(){},start(t,offset){started.push({buffer:this.buffer,offset});},stop(){stopped.push(this.buffer);}})};return{ctx,started,stopped};}
test('music follows all juice sectors, menu, and boss encounters',()=>{for(let sector=0;sector<4;sector++){assert.equal(musicFor({sector,boss:false}),`sector-${sector+1}`);assert.equal(musicFor({sector,boss:true}),'boss');}assert.equal(musicFor({sector:3,boss:true},true),'menu');});
test('a paused or superseded download cannot start stale music',async()=>{
 const {ctx,started}=harness(),pending=new Map(),deck=new MusicDeck(ctx,{},key=>new Promise(resolve=>pending.set(key,resolve)));
 const first=deck.select('sector-1');await deck.select(null);pending.get('sector-1')({duration:70});await first;assert.equal(started.length,0);
 const second=deck.select('sector-2'),boss=deck.select('boss');pending.get('boss')({duration:100,id:'boss'});await boss;pending.get('sector-2')({duration:70,id:'old'});await second;assert.equal(started.length,1);assert.equal(started[0].buffer.id,'boss');
});
test('pausing stops the loop and resumes from its offset; failures can retry',async()=>{
 const {ctx,started,stopped}=harness(),buffer={duration:70};let fails=false;const deck=new MusicDeck(ctx,{},async()=>{if(fails)throw Error('offline');return buffer;});
 await deck.select('sector-1');ctx.currentTime=13;await deck.select(null);assert.equal(stopped.length,1);await deck.select('sector-1');assert.equal(started[1].offset,13);
 fails=true;await deck.select('boss');assert.equal(deck.failed,true);deck.retry();fails=false;await deck.select('boss');assert.equal(deck.failed,false);assert.equal(deck.current.key,'boss');
});

test('rising musical pace preserves the correct pause offset',async()=>{const {ctx}=harness(),deck=new MusicDeck(ctx,{},async()=>({duration:100}));await deck.select('sector-1');ctx.currentTime=10;deck.setRate(1.05);ctx.currentTime=30;await deck.select(null);assert.equal(deck.offsets.get('sector-1'),31);});

test('backgrounding stops music immediately without waiting for an animation frame',async()=>{
 const {ctx,stopped}=harness(),audio=new Soundtrack();audio.deck=new MusicDeck(ctx,{},async()=>({duration:100}));
 audio.active=true;await audio.deck.select('sector-1');audio.active=false;
 assert.equal(stopped.length,1);assert.equal(audio.deck.desired,null);assert.equal(audio.deck.current,null);
});
