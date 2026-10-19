import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Announcer} from '../src/announcer.js';
import {Soundtrack} from '../src/audio.js';
import {Patrol,FIELD,segmentDistance} from '../src/simulation.js';
import {bossVolley} from '../src/choreography.js';
import {BOSS_WEAPONS,moveHazard,hazardSweep} from '../src/weapons.js';
import {flightView,frameCamera} from '../src/flight-view.js';
function voiceHarness(){let time=0;const started=[],stopped=[],ducks=[];const announcer=new Announcer({now:()=>time,random:()=>0,duck:v=>ducks.push(v),start:(key,done)=>{started.push({key,done});return()=>stopped.push(key);}});return{announcer,started,stopped,ducks,advance:t=>time+=t};}
test('surge and streak calls serialize, coalesce bursts, and never overlap',()=>{
 const h=voiceHarness(),a=h.announcer;a.event('surge');for(let combo=1;combo<=55;combo++)a.event('fill',{combo});a.step();assert.equal(h.started.length,1);assert.equal(h.started[0].key,'go-go-go');a.step();assert.equal(h.started.length,1);
 h.started[0].done();h.advance(.3);a.step();assert.equal(h.started.length,2);assert.equal(h.started[1].key,'congratulations');h.started[1].done();h.advance(.3);a.step();assert.equal(h.started.length,2);assert.deepEqual(h.ducks,[true,false,true,false]);
});
test('last-hull warning interrupts a reward, alternates lines, and ignores practice',()=>{
 const h=voiceHarness(),a=h.announcer;a.event('fill',{combo:10});a.step();a.event('hurt',{lives:1,mode:'arcade'});a.step();assert.deepEqual(h.stopped,['combo']);assert.equal(h.started.at(-1).key,'look-out');
 // A cancelled source cannot unduck or complete the newer warning.
 h.started[0].done();assert.equal(a.current.key,'look-out');h.started.at(-1).done();h.advance(.3);a.event('hurt',{lives:1,mode:'arcade'});a.step();assert.equal(h.started.at(-1).key,'get-down');a.clear();a.event('hurt',{lives:1,mode:'practice'});a.step();assert.equal(h.started.length,3);
});
test('pause cancels speech and queued rewards; stale calls expire',()=>{
 const h=voiceHarness(),audio=new Soundtrack();audio.announcer=h.announcer;h.announcer.event('surge');h.announcer.step();h.announcer.event('fill',{combo:10});audio.active=false;h.advance(1);h.announcer.step();assert.equal(h.started.length,1);assert.equal(h.stopped.length,1);
 h.announcer.event('fill',{combo:50});h.advance(4);h.announcer.step();assert.equal(h.started.length,1);
});
test('boss projectiles have separate identities and rockets sweep their full nose',()=>{
 const keys=new Set();for(let sector=0;sector<4;sector++){const volley=bossVolley(sector,0,1,0,8,0);keys.add(volley.shots[0].weapon);for(const h of volley.shots)assert.equal(h.weapon,BOSS_WEAPONS[sector].key);}assert.equal(keys.size,4);
 const rocket={...bossVolley(2,0,1,0,8,0).shots[0],x:0,y:0,life:9},ax=rocket.x,ay=rocket.y;moveHazard(rocket,1/60);assert.ok(rocket.vy<-6);assert.ok(segmentDistance(0,rocket.y-.36,...hazardSweep(rocket,ax,ay))<.01);
 for(let i=0;i<1000;i++)moveHazard(rocket,1/60);assert.ok(Math.hypot(rocket.vx,rocket.vy)<=8.2+1e-10);
 const comet={x:0,y:0,vx:0,vy:-4.5,curve:.32,life:9};moveHazard(comet,.5);assert.ok(comet.vx>0);assert.ok(Math.abs(Math.hypot(comet.vx,comet.vy)-4.5)<1e-10);
});
test('full-height view keeps ship above the thumb area in portrait and landscape',()=>{
 for(const [w,h,inset]of [[320,568,76],[390,780,94],[430,870,100],[844,320,58],[1363,858,80]]){
  const camera=new THREE.PerspectiveCamera(43,1,.1,160);frameCamera(camera,w,h,inset);camera.updateMatrixWorld();
  const project=y=>(1-new THREE.Vector3(0,y,.5).project(camera).y)*h/2;
  assert.ok(project(FIELD.playerMinY-2.1)<h-inset,`ship clears thumb area at ${w}×${h}`);assert.ok(project(FIELD.playerMaxY+1.7)>0);
  const v=flightView(w,h,inset);assert.ok(v.originY-(FIELD.playerMinY-1.8)*v.scale<h-inset);
  // The rendered scene extends past the playable framing instead of shrinking the canvas.
  assert.equal(camera.view.height,h);assert.equal(camera.view.fullHeight,h-inset);
 }
});
test('missed ammo and diving bottles continue beyond the ship; critical health is explicit',()=>{
 const events=[],s=new Patrol({onEvent:e=>events.push(e)});s.state='playing';s.fireTimer=999;s.shotTimer=999;s.invulnerable=0;s.lives=2;s.hurt();assert.equal(events.at(-1).lives,1);assert.equal(events.at(-1).mode,'arcade');
 s.hazards=[{id:999,x:5,y:-12.7,vx:0,vy:-5,r:.2,life:5}];s.step(.05);assert.equal(s.hazards.length,1);assert.ok(s.hazards[0].y<-12.8);
 const e=s.enemies[0];Object.assign(e,{state:'dive',startX:5,startY:7,aim:5,side:1,diveType:0,diveAge:4.2});s.step(.05);assert.equal(e.state,'dive');assert.ok(e.y<-13);
});
