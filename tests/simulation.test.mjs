import test from 'node:test';
import assert from 'node:assert/strict';
import {Patrol,segmentDistance,rankRuns,FIELD} from '../src/simulation.js';
const advance=(s,seconds)=>{for(let n=0;n<Math.ceil(seconds*60);n++)s.step(1/60);};
const flying=options=>{const s=new Patrol(options);advance(s,3.3);return s;};
test('same seed and controls produce identical flight, pickups, and results',()=>{
 const a=flying({seed:809,mode:'practice'}),b=flying({seed:809,mode:'practice'});
 for(let n=0;n<7200;n++){const x=Math.sin(n/130)*7;a.moveTo(x);b.moveTo(x);a.step(1/60);b.step(1/60);if(n%600===0){a.surge();b.surge();}}
 assert.deepEqual(a.result(),b.result());assert.deepEqual(a.enemies,b.enemies);assert.ok(a.filled>5);
});
test('pausing freezes countdown, hazards, power duration, and score',()=>{
 for(const s of [new Patrol(),flying()]){s.power.twin=5;s.paused=true;const before=JSON.stringify(s);advance(s,10);assert.equal(JSON.stringify(s),before);assert.equal(s.surge(),false);}
});
test('swept collision catches projectiles between frames and awards a fill once',()=>{
 assert.equal(segmentDistance(0,0,0,-5,0,5),0);
 const s=flying(),e=s.enemies[0];e.hp=1;e.age=10;e.delay=0;e.state='formation';e.sx=0;e.sy=2;s.enemies=[e];s.bullets=[{x:0,y:1.1,vx:0,vy:50,life:1}];s.fireTimer=10;s.step(.05);
 assert.equal(s.filled,1);assert.equal(s.hits,1);const score=s.score;s.fill(e,100);assert.equal(s.score,score);assert.equal(s.state,'cleared');
});
test('diving bottles pay more, and shield absorbs exactly one hit',()=>{
 const a=flying(),b=flying();a.enemies[0].state='dive';a.fill(a.enemies[0],99);b.fill(b.enemies[0],99);assert.equal(a.score,Math.round(b.score*1.5));
 a.invulnerable=0;a.shield=1;assert.ok(a.hurt());assert.equal(a.lives,3);assert.equal(a.shield,0);assert.equal(a.hurt(),false);a.invulnerable=0;a.hurt();assert.equal(a.lives,2);
});
test('charged Surge clears hazards, fills normal bottles, and cannot run while paused',()=>{
 const s=flying();s.energy=100;s.hazards=[{x:1,y:2}];s.paused=true;assert.equal(s.surge(),false);s.paused=false;assert.ok(s.surge());assert.equal(s.hazards.length,0);assert.equal(s.enemies.length,0);assert.equal(s.filled,12);assert.equal(s.surges,1);assert.equal(s.surge(),false);
});
test('arcade completes 16 waves and four bosses exactly once; endless continues',()=>{
 for(const mode of ['arcade','endless']){let ended=0;const s=flying({mode,onEvent:e=>{if(e.type==='end')ended++;}});for(let w=1;w<=16;w++){assert.equal(s.wave,w);for(const e of [...s.enemies])s.fill(e,10000);s.step(1/60);advance(s,3.3);}assert.equal(s.sectors,4);if(mode==='arcade'){assert.equal(s.state,'won');assert.equal(ended,1);advance(s,10);assert.equal(ended,1);}else{assert.equal(s.wave,17);assert.equal(s.state,'playing');assert.equal(ended,0);}}
});
test('practice cannot die; movement clamps; missed shots remain bounded',()=>{
 const s=flying({mode:'practice'});for(let n=0;n<10;n++){s.invulnerable=0;s.hurt();}assert.equal(s.lives,3);s.moveTo(999);assert.equal(s.target,FIELD.right);s.moveTo(NaN);assert.equal(s.target,FIELD.right);advance(s,180);assert.ok(s.bullets.length<50);assert.ok(s.hazards.length<100);assert.ok(s.pickups.length<20);
});
test('rankings separate modes, exclude moderation and orphan profiles, and use stable ties',()=>{
 const r={game:'sujalaga',version:'1.0.0',mode:'arcade',score:100,wave:2,duration:20};const directory={a:{displayName:'A'},b:{displayName:'B'}};
 const runs={a:{run1:r,hidden:{...r,score:9999},practice:{...r,mode:'practice',score:9000},endless:{...r,mode:'endless',score:8000}},b:{run2:{...r,wave:3}},missing:{run3:r}};
 assert.deepEqual(rankRuns(directory,runs,{a:{hidden:true}}).map(r=>r.id),['run2','run1']);assert.deepEqual(rankRuns(directory,runs,{},'endless').map(r=>r.id),['endless']);
});
