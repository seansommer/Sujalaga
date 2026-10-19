export const JUICES=[
 {name:'Mighty Dozen',color:0x9be63e,hex:'#b8f25d',label:'GREEN SQUADRON'},
 {name:'Citrus Immunity',color:0xffc238,hex:'#ffd370',label:'CITRUS CIRCUIT'},
 {name:'Carrot Power',color:0xff7733,hex:'#ff9d65',label:'SOLAR ORCHARD'},
 {name:'Berry Brigade',color:0xd54fff,hex:'#df9aff',label:'BERRY NEBULA'}
];
export const FIELD={left:-7.8,right:7.8,bottom:-10.4,top:13,playerY:-9};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export class Patrol{
 constructor({seed=1,mode='arcade',onEvent=()=>{}}={}){
  this.seed=seed>>>0;this.rng=random(this.seed);this.mode=mode;this.onEvent=onEvent;this.state='countdown';this.paused=false;this.countdown=3.2;this.time=0;this.clock=0;this.wave=1;this.sectors=0;this.score=0;this.filled=0;this.combo=0;this.maxCombo=0;this.shots=0;this.hits=0;this.surges=0;this.energy=0;this.lives=3;this.invulnerable=3;this.shield=0;this.power={twin:0,rapid:0,spread:0};this.player={x:0,y:FIELD.playerY};this.target=0;this.bullets=[];this.hazards=[];this.pickups=[];this.enemies=[];this.id=1;this.fireTimer=0;this.diveTimer=4;this.shotTimer=3;this.nextWave=0;this.sectorStart=0;this.waveTime=0;this.createWave();
 }
 get sector(){return Math.floor((this.wave-1)/4)%4;}
 get juice(){return JUICES[this.sector];}
 get boss(){return this.wave%4===0;}
 get multiplier(){return Math.min(4,1+Math.floor(this.combo/8));}
 get active(){return !this.paused&&this.state==='playing';}
 emit(type,data={}){this.onEvent({type,...data});}
 moveTo(x){if(!Number.isFinite(x))return;this.target=clamp(x,FIELD.left,FIELD.right);}
 createWave(){
  this.enemies=[];this.bullets=[];this.hazards=[];this.pickups=[];this.waveTime=0;this.diveTimer=3.5;this.shotTimer=3.1;
  if(this.boss){const hp=65+this.sector*18+Math.floor((this.wave-1)/16)*22;this.enemies.push({id:this.id++,boss:true,x:0,y:9,sx:0,sy:8,z:0,hp,maxHp:hp,r:1.7,state:'entry',age:0,delay:0,fill:0,angle:0,kind:2});}
  else {const rows=this.wave%4===1?2:3,cols=6;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const kind=r===0?2:r===1?1:0,hp=kind===2?4:kind===1?3:2,sx=(c-2.5)*2.38,sy=9.3-r*2.5;
   this.enemies.push({id:this.id++,boss:false,x:sx,y:18+r*2,sx,sy,z:0,hp,maxHp:hp,r:.59,state:'entry',age:0,delay:(r*cols+c)*.095,fill:0,angle:0,kind,side:c%2?1:-1});
  }}
 }
 fire(){
  const rapid=this.power.rapid>0;this.fireTimer=rapid?.115:.23;
  const offsets=this.power.twin>0?[-.5,.5]:[0];
  for(const x of offsets){this.bullets.push({id:this.id++,x:this.player.x+x,y:this.player.y+1.1,vx:0,vy:25,life:1.4});this.shots++;}
  if(this.power.spread>0)for(const dir of [-1,1]){this.bullets.push({id:this.id++,x:this.player.x,y:this.player.y+1,vx:dir*5.2,vy:24,life:1.4});this.shots++;}
  this.emit('fire',{x:this.player.x,twin:offsets.length===2});
 }
 fill(enemy,amount=1,fromSurge=false){
  if(enemy.hp<=0||!this.enemies.includes(enemy))return;
  enemy.hp=Math.max(0,enemy.hp-amount);enemy.fill=1-enemy.hp/enemy.maxHp;
  this.emit('hit',{x:enemy.x,y:enemy.y,fill:enemy.fill,boss:enemy.boss});
  if(enemy.hp>0)return;
  this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);this.filled++;this.energy=clamp(this.energy+(enemy.boss?22:7),0,100);
  const points=Math.round((enemy.boss?2200+this.sector*500:100+enemy.kind*45)*this.multiplier*(enemy.state==='dive'?1.5:1));this.score+=points;
  this.emit('fill',{id:enemy.id,x:enemy.x,y:enemy.y,points,boss:enemy.boss,combo:this.combo});
  this.enemies=this.enemies.filter(e=>e!==enemy);
  if(this.filled%7===0&&!enemy.boss){const kinds=['twin','rapid','shield','spread'];this.pickups.push({id:this.id++,kind:kinds[Math.floor(this.rng()*kinds.length)],x:enemy.x,y:enemy.y,age:0});}
 }
 surge(){
  if(!this.active||this.energy<100)return false;
  this.energy=0;this.surges++;this.hazards=[];this.invulnerable=Math.max(this.invulnerable,1.4);this.emit('surge',{x:this.player.x,y:this.player.y});
  for(const enemy of [...this.enemies])this.fill(enemy,enemy.boss?18:4,true);
  return true;
 }
 hurt(){
  if(!this.active||this.invulnerable>0)return false;
  this.invulnerable=2.2;this.combo=0;
  if(this.shield){this.shield=0;this.emit('shieldBreak',{x:this.player.x,y:this.player.y});return true;}
  this.lives--;this.emit('hurt',{x:this.player.x,y:this.player.y});
  if(this.mode==='practice')this.lives=3;
  else if(this.lives<=0)this.end(false);
  return true;
 }
 collect(pickup){
  if(pickup.kind==='shield')this.shield=1;else this.power[pickup.kind]=16;
  this.emit('power',{kind:pickup.kind,x:pickup.x,y:pickup.y});
 }
 end(won){if(['won','lost'].includes(this.state))return;this.state=won?'won':'lost';this.emit('end',{result:this.result()});}
 step(dt){
  if(this.paused||['won','lost'].includes(this.state))return;
  dt=clamp(dt,0,.05);this.clock+=dt;
  if(this.state==='countdown'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown===0){this.state='playing';this.emit('wave',{wave:this.wave,juice:this.juice.name,boss:this.boss});}return;}
  if(this.state==='cleared'){
   this.nextWave-=dt;if(this.nextWave<=0){if(this.mode!=='endless'&&this.wave>=16){this.end(true);return;}this.wave++;if(this.wave%4===1)this.sectorStart=this.time;this.state='playing';this.createWave();this.invulnerable=2;this.emit('wave',{wave:this.wave,juice:this.juice.name,boss:this.boss});}return;
  }
  this.time+=dt;this.waveTime+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);for(const k of Object.keys(this.power))this.power[k]=Math.max(0,this.power[k]-dt);
  this.player.x+=clamp(this.target-this.player.x,-dt*14,dt*14);
  this.fireTimer-=dt;if(this.fireTimer<=0)this.fire();
  const speed=1+Math.min(1.4,(this.wave-1)*.035);
  for(const e of this.enemies){
   e.age+=dt;
   if(e.state==='entry'){
    const t=clamp((e.age-e.delay)/1.7,0,1),ease=1-Math.pow(1-t,3);
    e.x=e.sx+(1-ease)*Math.sin(t*Math.PI*2)*(e.side||1)*7;e.y=17+(e.sy-17)*ease;e.z=Math.sin(t*Math.PI)*2;e.angle=(1-t)*e.side*.65||0;
    if(t===1){e.state='formation';e.z=0;}
   }else if(e.boss){e.x=Math.sin(this.waveTime*.65)*4.8;e.y=7.7+Math.sin(this.waveTime*1.2)*.45;e.angle=-Math.sin(this.waveTime*.65)*.1;}
   else if(e.state==='formation'){e.x=e.sx+Math.sin(this.waveTime*.82)*.48;e.y=e.sy+Math.sin(this.waveTime*.9+e.sx*.3)*.18;e.angle=Math.sin(this.waveTime*1.5+e.sx)*.07;}
   else if(e.state==='dive'){
    e.diveAge+=dt;const t=e.diveAge/(4.2/speed);
    e.x=e.startX+(e.aim-e.startX)*Math.min(1,t*1.1)+Math.sin(t*Math.PI*2)*e.side*2.2;e.y=e.startY-(e.startY+13)*t;e.z=Math.sin(t*Math.PI)*1.1;e.angle=-Math.sin(t*Math.PI*2)*.65;
    if(e.y<-12.5){e.state='entry';e.age=0;e.delay=0;}
   }
  }
  this.diveTimer-=dt;
  if(!this.boss&&this.diveTimer<=0){const pool=this.enemies.filter(e=>e.state==='formation');const count=this.wave>7?2:1;for(let i=0;i<count&&pool.length;i++){const e=pool.splice(Math.floor(this.rng()*pool.length),1)[0];e.state='dive';e.diveAge=0;e.startX=e.x;e.startY=e.y;e.aim=clamp(this.player.x+(this.rng()-.5)*3,-7,7);this.emit('dive',{x:e.x,y:e.y});}this.diveTimer=Math.max(1.35,3.3-this.wave*.1);}
  if(this.boss&&this.shotTimer>.45&&this.shotTimer-dt<=.45)this.emit('bossReady');
  this.shotTimer-=dt;
  if(this.shotTimer<=0){
   const candidates=this.enemies.filter(e=>e.state!=='entry'&&e.y>this.player.y+4);
   if(candidates.length){const e=candidates[Math.floor(this.rng()*candidates.length)],aim=Math.atan2(this.player.x-e.x,e.y-this.player.y),spread=e.boss?[-.48,-.24,0,.24,.48]:[0];for(const a of spread){const v=(e.boss?5.8:4.8)*speed;this.hazards.push({id:this.id++,x:e.x,y:e.y-1,vx:Math.sin(aim+a)*v,vy:-Math.cos(aim+a)*v,r:e.boss?.22:.19,life:7});}if(e.boss)this.emit('bossFire',{x:e.x,y:e.y});}
   this.shotTimer=this.boss?Math.max(.7,1.5-this.sector*.13):Math.max(.85,2.25-this.wave*.08);
  }
  for(const b of this.bullets){
   const ax=b.x,ay=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
   for(const e of this.enemies){if(e.y>14||e.age<e.delay||e.hp<=0)continue;if(segmentDistance(e.x,e.y,ax,ay,b.x,b.y)<e.r+.14){b.life=0;this.hits++;this.fill(e);break;}}
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&b.y<15&&Math.abs(b.x)<12);
  for(const h of this.hazards){const ax=h.x,ay=h.y;h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;if(segmentDistance(this.player.x,this.player.y,ax,ay,h.x,h.y)<.43+h.r){h.life=0;this.hurt();if(this.state==='lost')return;}}
  this.hazards=this.hazards.filter(h=>h.life>0&&h.y>-12.8&&Math.abs(h.x)<12);
  for(const e of this.enemies)if(e.state==='dive'&&Math.hypot(e.x-this.player.x,e.y-this.player.y)<e.r+.48){this.hurt();e.state='entry';e.age=0;e.delay=0;if(this.state==='lost')return;}
  for(const p of this.pickups){p.age+=dt;p.y-=3.4*dt;p.x+=Math.sin(p.age*2)*dt*.3;if(Math.hypot(p.x-this.player.x,p.y-this.player.y)<1.15){this.collect(p);p.y=-20;}}
  this.pickups=this.pickups.filter(p=>p.y>-12);
  if(!this.enemies.length){
   const bonus=Math.max(100,Math.round(650-this.waveTime*8))*(this.boss?3:1);this.score+=bonus;if(this.boss){this.sectors++;this.lives=Math.min(3,this.lives+1);}
   this.state='cleared';this.nextWave=this.boss?3.2:2.2;this.hazards=[];this.bullets=[];this.emit('clear',{boss:this.boss,bonus,wave:this.wave});
  }
  if(this.time>=7200)this.end(false);
 }
 result(){return{version:'1.0.0',game:'sujalaga',mode:this.mode,seed:this.seed,score:Math.round(this.score),filled:this.filled,maxCombo:this.maxCombo,wave:this.wave,sectors:this.sectors,shots:this.shots,hits:this.hits,surges:this.surges,duration:Math.round(this.time*100)/100,won:this.state==='won'};}
}
export function rankRuns(directory={},runs={},hidden={},mode='arcade'){
 const rows=[];for(const [uid,entries]of Object.entries(runs||{})){if(!directory?.[uid])continue;for(const [id,r]of Object.entries(entries||{})){if(hidden?.[uid]?.[id]||r.game!=='sujalaga'||r.version!=='1.0.0'||r.mode!==mode||!Number.isFinite(r.score)||r.score<0)continue;rows.push({...r,id,uid,displayName:directory[uid].displayName});}}
 return rows.sort((a,b)=>b.score-a.score||b.wave-a.wave||a.duration-b.duration||a.id.localeCompare(b.id)).slice(0,10);
}
