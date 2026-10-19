import{FORMATIONS,formationPoints,bossPose,bossVolley,bossInterval}from'./choreography.js';
import{moveHazard,hazardSweep}from'./weapons.js';
export const JUICES=[
 {name:'Mighty Dozen',color:0x9be63e,hex:'#b8f25d',label:'GREEN SQUADRON'},
 {name:'Citrus Immunity',color:0xffc238,hex:'#ffd370',label:'CITRUS CIRCUIT'},
 {name:'Carrot Power',color:0xff7733,hex:'#ff9d65',label:'SOLAR ORCHARD'},
 {name:'Berry Brigade',color:0xd54fff,hex:'#df9aff',label:'BERRY NEBULA'}
];
export const FIELD={left:-7.8,right:7.8,bottom:-10.4,top:13,playerY:-8.5,playerMinY:-10.4,playerMaxY:-4.4};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export class Patrol{
 constructor({seed=1,mode='arcade',onEvent=()=>{}}={}){
  this.seed=seed>>>0;this.rng=random(this.seed);this.mode=mode;this.onEvent=onEvent;this.state='countdown';this.paused=false;this.countdown=3;this.time=0;this.clock=0;this.wave=1;this.sectors=0;this.score=0;this.filled=0;this.combo=0;this.maxCombo=0;this.shots=0;this.hits=0;this.surges=0;this.energy=0;this.lives=3;this.invulnerable=3;this.shield=0;this.power={twin:0,rapid:0,spread:0};this.player={x:0,y:FIELD.playerY};this.target=0;this.targetY=FIELD.playerY;this.formationIndex=-1;this.bullets=[];this.hazards=[];this.pickups=[];this.enemies=[];this.id=1;this.fireTimer=0;this.diveTimer=4;this.shotTimer=3;this.nextWave=0;this.sectorStart=0;this.waveTime=0;this.createWave();
 }
 get sector(){return Math.floor((this.wave-1)/4)%4;}
 get juice(){return JUICES[this.sector];}
 get boss(){return this.wave%4===0;}
 get multiplier(){return Math.min(4,1+Math.floor(this.combo/8));}
 get active(){return !this.paused&&this.state==='playing';}
 emit(type,data={}){this.onEvent({type,...data});}
 moveTo(x,y=this.targetY){if(Number.isFinite(x))this.target=clamp(x,FIELD.left,FIELD.right);if(Number.isFinite(y))this.targetY=clamp(y,FIELD.playerMinY,FIELD.playerMaxY);}
 createWave(){
  this.enemies=[];this.bullets=[];this.hazards=[];this.pickups=[];this.warning=null;this.attackBeat=0;this.waveTime=0;this.diveTimer=3.8;this.shotTimer=3.1;
  if(this.boss){const pose=bossPose(this.sector,0);const hp=65+this.sector*18+Math.floor((this.wave-1)/16)*22;this.enemies.push({id:this.id++,boss:true,x:pose.x,y:17,sx:pose.x,sy:pose.y,motionAge:0,z:0,hp,maxHp:hp,r:1.7,state:'entry',age:0,delay:0,fill:0,angle:0,kind:2,phase:1});}
  else {
   const previous=this.formationIndex;this.formationIndex=(this.sector*2+this.wave-1+Math.floor(this.rng()*FORMATIONS.length))%FORMATIONS.length;
   if(this.formationIndex===previous)this.formationIndex=(previous+1)%FORMATIONS.length;
   this.formation=FORMATIONS[this.formationIndex];const count=(this.wave%4===1?12:18)+(this.sector>1?2:0);
   formationPoints(this.formation,count).forEach(({x:sx,y:sy},i)=>{
    const kind=i<6?2:i<12?1:0,hp=kind===2?4:kind===1?3:2;
    this.enemies.push({id:this.id++,boss:false,x:sx,y:18,sx,sy,z:0,hp,maxHp:hp,r:.59,state:'entry',age:0,delay:i*.105,fill:0,angle:0,kind,side:i%2?1:-1,route:(i+this.sector)%3,diveType:(i+this.formationIndex)%4});
   });
  }
 }

 fire(){
  const rapid=this.power.rapid>0;this.fireTimer=rapid?.115:.23;
  const offsets=this.power.twin>0?[-.5,.5]:[0];
  for(const x of offsets){this.bullets.push({id:this.id++,x:this.player.x+x,y:this.player.y+1.1,vx:0,vy:25,life:1.4});this.shots++;}
  if(this.power.spread>0)for(const dir of [-1,1]){this.bullets.push({id:this.id++,x:this.player.x,y:this.player.y+1,vx:dir*5.2,vy:24,life:1.4});this.shots++;}
  this.emit('fire',{x:this.player.x,y:this.player.y,sector:this.sector,twin:offsets.length===2});
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
  this.lives--;this.emit('hurt',{x:this.player.x,y:this.player.y,lives:this.lives,mode:this.mode});
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
  this.player.x+=clamp(this.target-this.player.x,-dt*14,dt*14);this.player.y+=clamp(this.targetY-this.player.y,-dt*8,dt*8);
  this.fireTimer-=dt;if(this.fireTimer<=0)this.fire();
  const speed=1+Math.min(1.4,(this.wave-1)*.035);
  for(const e of this.enemies){
   e.age+=dt;
   if(e.state==='entry'){
    const t=clamp((e.age-e.delay)/1.7,0,1),ease=1-Math.pow(1-t,3);
    e.x=e.sx+(1-ease)*(e.route===1?(e.side||1)*13:e.route===2?Math.cos(t*Math.PI*2)*(e.side||1)*9:Math.sin(t*Math.PI*2)*(e.side||1)*7);e.y=(e.route===1?11:17)+(e.sy-(e.route===1?11:17))*ease;e.z=Math.sin(t*Math.PI)*2;e.angle=(1-t)*e.side*.65||0;
    if(t===1){e.state='formation';e.z=0;}
   }else if(e.boss){e.phase=e.fill>=.5?2:1;e.motionAge+=dt*(e.phase===2?1.15:1);const pose=bossPose(this.sector,e.motionAge);Object.assign(e,pose);}
   else if(e.state==='formation'){e.x=e.sx+Math.sin(this.waveTime*.82)*.48;e.y=e.sy+Math.sin(this.waveTime*.9+e.sx*.3)*.18;e.angle=Math.sin(this.waveTime*1.5+e.sx)*.07;}
   else if(e.state==='dive'){
    e.diveAge+=dt*(e.y<-13?1.65:1);const t=e.diveAge/(4.2/speed);
    const route=e.diveType||0;
    const bend=route===0?Math.sin(t*Math.PI*2)*2.2:route===1?Math.sin(t*Math.PI)*4:route===2?Math.sin(t*Math.PI*4)*1.35:Math.sin(t*Math.PI*2)*Math.cos(t*Math.PI)*3.5;
    e.x=clamp(e.startX+(e.aim-e.startX)*Math.min(1,t*1.1)+bend*e.side,-8.3,8.3);e.y=e.startY-(e.startY+13)*t;e.z=Math.sin(t*Math.PI)*1.1;e.angle=-Math.sin(t*Math.PI*(route===2?4:2))*.65;
    if(e.y<-30){e.state='entry';e.age=0;e.delay=0;}
   }
  }
  this.diveTimer-=dt;
  if(!this.boss&&this.diveTimer<=0){const pool=this.enemies.filter(e=>e.state==='formation');const count=this.wave>11?3:this.wave>5?2:1;for(let i=0;i<count&&pool.length;i++){const e=pool.splice(Math.floor(this.rng()*pool.length),1)[0];e.state='dive';e.diveAge=0;e.startX=e.x;e.startY=e.y;e.aim=clamp(this.player.x+(this.rng()-.5)*3,-7,7);this.emit('dive',{x:e.x,y:e.y});}this.diveTimer=Math.max(1.35,3.3-this.wave*.1);}
  const boss=this.enemies.find(e=>e.boss&&e.state!=='entry');
  if(boss&&this.shotTimer>.7&&this.shotTimer-dt<=.7){
   const aim=Math.atan2(this.player.x-boss.x,boss.y-this.player.y);
   const volley=bossVolley(this.sector,this.attackBeat,boss.phase,boss.x,boss.y,aim);
   this.warning={...volley,remaining:.7,x:boss.x,y:boss.y,sector:this.sector};this.emit('bossReady',{x:boss.x,y:boss.y,sector:this.sector,kind:volley.kind});
  }
  if(this.warning)this.warning.remaining=Math.max(0,this.warning.remaining-dt);
  this.shotTimer-=dt;
  if(this.shotTimer<=0){
   if(boss){
    const volley=this.warning||bossVolley(this.sector,this.attackBeat,boss.phase,boss.x,boss.y,Math.atan2(this.player.x-boss.x,boss.y-this.player.y));
    for(const shot of volley.shots){const translated=this.warning&&!['lanes','crossfire'].includes(volley.kind)?{x:shot.x+boss.x-this.warning.x,y:shot.y+boss.y-this.warning.y}:{};this.hazards.push({id:this.id++,r:.22,life:9,...shot,...translated});}
    this.emit('bossFire',{x:boss.x,y:boss.y,sector:this.sector,kind:volley.kind});this.warning=null;this.attackBeat++;this.shotTimer=bossInterval(this.sector,boss.phase);
   }else{
    const candidates=this.enemies.filter(e=>!e.boss&&e.state!=='entry'&&e.y>this.player.y+4);
    const count=this.sector>1?2:1;
    for(let i=0;i<count&&candidates.length;i++){
     const e=candidates.splice(Math.floor(this.rng()*candidates.length),1)[0],aim=Math.atan2(this.player.x-e.x,e.y-this.player.y),spread=this.sector===3&&this.attackBeat%3===2?[-.15,.15]:[0];
     for(const a of spread){const v=4.8*Math.min(1.45,speed);this.hazards.push({id:this.id++,x:e.x,y:e.y-1,vx:Math.sin(aim+a)*v,vy:-Math.cos(aim+a)*v,r:.19,life:9});}
    }
    this.attackBeat++;this.shotTimer=Math.max(1.05,2.4-this.wave*.065);
   }
  }

  for(const b of this.bullets){
   const ax=b.x,ay=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
   for(const e of this.enemies){if(e.y>14||e.age<e.delay||e.hp<=0)continue;if(segmentDistance(e.x,e.y,ax,ay,b.x,b.y)<e.r+.14){b.life=0;this.hits++;this.fill(e);break;}}
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&b.y<15&&Math.abs(b.x)<12);
  for(const h of this.hazards){const ax=h.x,ay=h.y;moveHazard(h,dt);if(segmentDistance(this.player.x,this.player.y,...hazardSweep(h,ax,ay))<.43+h.r){h.life=0;this.hurt();if(this.state==='lost')return;}}
  this.hazards=this.hazards.filter(h=>h.life>0&&h.y>-32&&Math.abs(h.x)<12);
  for(const e of this.enemies)if(e.state==='dive'&&Math.hypot(e.x-this.player.x,e.y-this.player.y)<e.r+.48){this.hurt();e.state='entry';e.age=0;e.delay=0;if(this.state==='lost')return;}
  for(const p of this.pickups){p.age+=dt;p.y-=3.4*dt;p.x+=Math.sin(p.age*2)*dt*.3;if(Math.hypot(p.x-this.player.x,p.y-this.player.y)<1.15){this.collect(p);p.y=-100;}}
  this.pickups=this.pickups.filter(p=>p.y>-32);
  if(!this.enemies.length){
   const bonus=Math.max(100,Math.round(650-this.waveTime*8))*(this.boss?3:1);this.score+=bonus;if(this.boss){this.sectors++;this.lives=Math.min(3,this.lives+1);}
   this.state='cleared';this.warning=null;this.nextWave=this.boss?3.2:2.2;this.hazards=[];this.bullets=[];this.emit('clear',{boss:this.boss,bonus,wave:this.wave});
  }
  if(this.time>=7200)this.end(false);
 }
 result(){return{version:'1.0.0',game:'sujalaga',mode:this.mode,seed:this.seed,score:Math.round(this.score),filled:this.filled,maxCombo:this.maxCombo,wave:this.wave,sectors:this.sectors,shots:this.shots,hits:this.hits,surges:this.surges,duration:Math.round(this.time*100)/100,won:this.state==='won'};}
}
export function rankRuns(directory={},runs={},hidden={},mode='arcade'){
 const rows=[];for(const [uid,entries]of Object.entries(runs||{})){if(!directory?.[uid])continue;for(const [id,r]of Object.entries(entries||{})){if(hidden?.[uid]?.[id]||r.game!=='sujalaga'||r.version!=='1.0.0'||r.mode!==mode||!Number.isFinite(r.score)||r.score<0)continue;rows.push({...r,id,uid,displayName:directory[uid].displayName});}}
 return rows.sort((a,b)=>b.score-a.score||b.wave-a.wave||a.duration-b.duration||a.id.localeCompare(b.id)).slice(0,10);
}
