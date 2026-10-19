import test from 'node:test';import assert from 'node:assert/strict';
import{Patrol,FIELD}from'../src/simulation.js';import{FORMATIONS,formationPoints,bossPose,bossVolley}from'../src/choreography.js';import{dragTarget}from'../src/controls.js';
const advance=(s,time)=>{for(let i=0;i<time*60;i++)s.step(1/60);};
test('relative thumb control keeps the starting position and moves in both axes',()=>{
 const start={x:3,y:-8};assert.deepEqual(dragTarget(start,0,0,20),start);const moved=dragTarget(start,-40,-30,20);assert.deepEqual(moved,{x:1,y:-6.5});
 const s=new Patrol();s.state='playing';s.moveTo(moved.x,moved.y);advance(s,.5);assert.equal(s.player.x,1);assert.equal(s.player.y,-6.5);
 s.moveTo(999,999);assert.equal(s.target,FIELD.right);assert.equal(s.targetY,FIELD.playerMaxY);s.moveTo(-999,-999);assert.equal(s.target,FIELD.left);assert.equal(s.targetY,FIELD.playerMinY);
 s.moveTo(NaN,Infinity);assert.equal(s.targetY,FIELD.playerMinY);assert.equal(s.target,FIELD.left);
 // A new drag starts where the last one ended. A tap cannot teleport the ship.
 s.moveTo(0,-8);assert.deepEqual(dragTarget({x:s.target,y:s.targetY},0,0,20),{x:0,y:-8});
});
test('formations stay on the field and consecutive waves use different layouts',()=>{
 const signatures=new Set(FORMATIONS.map(name=>JSON.stringify(formationPoints(name,18))));assert.equal(signatures.size,6);
 for(const name of FORMATIONS)for(const n of [12,14,18,20])for(const p of formationPoints(name,n)){assert.ok(Math.abs(p.x)<8);assert.ok(p.y>0&&p.y<12);}
 for(let seed=1;seed<15;seed++){const s=new Patrol({seed});let last=s.formation;for(let wave=2;wave<=16;wave++){s.wave=wave;s.createWave();if(s.boss)continue;assert.notEqual(s.formation,last);last=s.formation;}}
});
test('four bosses have distinct movement and attacks, with a clear lane gap',()=>{
 const routes=new Set(),attacks=new Set();
 for(let sector=0;sector<4;sector++){
  routes.add(JSON.stringify([1,2,3,4].map(t=>bossPose(sector,t))));attacks.add(JSON.stringify(bossVolley(sector,0,1,0,8,0)));
  for(let beat=0;beat<8;beat++)for(const phase of [1,2]){const volley=bossVolley(sector,beat,phase,0,8,0);assert.ok(volley.shots.length>=4&&volley.shots.length<=12);for(const h of volley.shots){assert.ok(Number.isFinite(h.vx)&&Number.isFinite(h.vy));assert.ok(Math.hypot(h.vx,h.vy)<8);}if(volley.kind==='lanes')assert.equal(volley.lanes.length,3);}
 }
 assert.equal(routes.size,4);assert.equal(attacks.size,4);
});
test('boss volleys are warned first and hazards stay bounded during a long fight',()=>{
 for(let sector=0;sector<4;sector++){
  const events=[],s=new Patrol({mode:'practice',onEvent:e=>events.push(e.type)});s.wave=4+sector*4;s.createWave();s.state='playing';s.fireTimer=1000;const boss=s.enemies[0];boss.hp=boss.maxHp=100000;
  let max=0,old={x:boss.x,y:boss.y};for(let i=0;i<90*60;i++){s.moveTo(Math.sin(i/90)*7,-8+Math.sin(i/140));if(i===600)boss.fill=.6;s.step(1/60);max=Math.max(max,s.hazards.length);if(boss.state!=='entry'){assert.ok(Math.hypot(boss.x-old.x,boss.y-old.y)<.6,'no sudden boss teleport');}old={x:boss.x,y:boss.y};}
  assert.ok(events.includes('bossFire'));assert.ok(max<150);let warnings=0;for(const e of events){if(e==='bossReady')warnings++;if(e==='bossFire'){assert.ok(warnings>0);warnings--;}}
 }
});
