import{clamp}from'./simulation.js';
// A lightweight compatibility renderer keeps the same game playable without WebGL.
export class CompatibilityScene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.effects=[];this.t=0;this.reduced=false;this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.canvas.width=r.width*Math.min(devicePixelRatio||1,1.5);this.canvas.height=r.height*Math.min(devicePixelRatio||1,1.5);this.scale=Math.min(this.canvas.width/19.2,this.canvas.height/28);}
 controlScale(){return Math.min(this.width/19.2,this.height/28);}
 pointerX(clientX){const r=this.canvas.getBoundingClientRect();return(clientX-r.left-r.width/2)/(this.scale*this.width/this.canvas.width);}
 setQuality(q,reduced){this.reduced=reduced;}
 project(x,y){return{x:this.width/2+x*this.scale*this.width/this.canvas.width,y:this.height/2-y*this.scale*this.height/this.canvas.height};}
 clear(){this.effects=[];}
 event(e){if(['fill','surge','power','hurt'].includes(e.type))for(let i=0;i<(this.reduced?5:30);i++)this.effects.push({x:e.x||0,y:e.y||0,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:1,color:e.type==='hurt'?'#ff6b84':'#c8ff81'});}
 render(s,dt,{menu=false}={}){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height,k=this.scale;this.t+=s.paused?0:dt;c.setTransform(1,0,0,1,0,0);const bg=c.createRadialGradient(w*.6,h*.3,0,w*.5,h*.5,h);bg.addColorStop(0,['#0b3e31','#42351b','#3c2019','#2d1645'][s.sector]);bg.addColorStop(1,'#020d16');c.fillStyle=bg;c.fillRect(0,0,w,h);
  for(let i=0;i<160;i++){const x=(Math.sin(i*78.23)*.5+.5)*w,y=((Math.sin(i*8.3)*.5+.5)*h+this.t*(i%3+1)*3)%h;c.fillStyle=i%5?'#91d4ba66':'#c3a1ff99';c.fillRect(x,y,i%3+1,i%3+1);}
  const planet=c.createRadialGradient(w*.75,h*.17,8,w*.8,h*.2,w*.26);planet.addColorStop(0,s.juice.hex+'44');planet.addColorStop(.8,'#062522');planet.addColorStop(1,'#0b3e33');c.fillStyle=planet;c.beginPath();c.arc(w*.85,h*.15,w*.24,0,Math.PI*2);c.fill();
  c.translate(w/2,h/2);c.scale(k,-k);
  for(const side of [-1,1]){c.fillStyle='#203d40';c.fillRect(side*10-.25,-18,.5,36);c.fillStyle='#7fe9ac';c.fillRect(side*9.55,-17,.04,34);for(let j=-16;j<18;j+=4){c.fillStyle='#557877';c.fillRect(side*10-1,j,2,.18);c.fillStyle='#b680ff';c.fillRect(side*10.2,j+.3,.07,1);}}
  if(s.warning?.lanes.length){c.fillStyle='#ff987333';c.strokeStyle='#ff9873';c.lineWidth=.04;for(const x of s.warning.lanes){c.fillRect(x-.83,-11,1.66,22);c.strokeRect(x-.83,-11,1.66,22);}}
  for(const e of s.enemies){if(e.y>16)continue;c.save();c.translate(e.x,e.y);c.rotate(e.angle);const size=e.boss?2.25:1;c.scale(size,size);
   if(e.boss){c.save();if(!this.reduced)c.rotate(this.t*[.15,.8,0,-.45][s.sector]);c.strokeStyle=s.juice.hex;c.lineWidth=s.warning?.06:.03;c.beginPath();c.arc(0,.23,.85,0,Math.PI*2);c.stroke();for(let i=0,n=[6,4,2,8][s.sector];i<n;i++){const a=i/n*Math.PI*2;c.save();c.translate(Math.cos(a),Math.sin(a)+.23);c.rotate(a);c.fillStyle=s.juice.hex;c.fillRect(-.08,-.15,s.sector===2?.4:.25,.3);c.restore();}c.restore();}
   c.fillStyle='#a3c8b63a';c.strokeStyle='#c8efe099';c.lineWidth=.035;c.beginPath();c.roundRect(-.45,-.9,.9,1.68,.19);c.fill();c.stroke();c.fillStyle=s.juice.hex;c.fillRect(-.38,-.8,.76,1.35*Math.max(.06,e.fill));const shine=c.createLinearGradient(-.45,0,.45,0);shine.addColorStop(0,'#ffffff22');shine.addColorStop(.22,'#ffffff88');shine.addColorStop(.45,'#ffffff00');shine.addColorStop(1,'#12222677');c.fillStyle=shine;c.fillRect(-.43,-.85,.86,1.5);
   c.fillStyle='#175c38';c.fillRect(-.46,-.45,.92,.55);c.save();c.scale(1,-1);c.fillStyle='#f6ffdd';c.textAlign='center';c.font='bold .35px Arial';c.fillText('suja',0,.3);c.restore();c.fillStyle='#d2e1d7';c.fillRect(-.26,.78,.52,.12);for(const side of [-1,1]){c.fillStyle='#bdc9c7';c.fillRect(side*.55-.15,-.65,.3,.24);c.fillStyle='#b479ff';c.beginPath();c.moveTo(side*.55-.1,-.9);c.lineTo(side*.55,-1.3-Math.sin(this.t*22)*.12);c.lineTo(side*.55+.1,-.9);c.fill();}c.restore();}
  for(const b of s.bullets){c.fillStyle=s.juice.hex;c.shadowColor=s.juice.hex;c.shadowBlur=10;c.fillRect(b.x-.06,b.y-.2,.12,.6);}c.shadowBlur=0;
  for(const b of s.hazards){c.fillStyle='#ff7489';c.beginPath();c.arc(b.x,b.y,.24,0,7);c.fill();}
  for(const p of s.pickups){c.save();c.translate(p.x,p.y);c.rotate(this.t);c.fillStyle='#c995ff';c.fillRect(-.35,-.35,.7,.7);c.strokeStyle='#e1ffd2';c.lineWidth=.04;c.strokeRect(-.5,-.5,1,1);c.restore();}
  if(menu||s.invulnerable<=0||s.state==='countdown'||Math.floor(this.t*11)%2===0){c.save();c.translate(s.player.x,s.player.y);c.rotate(clamp((s.player.x-s.target)*.05,-.3,.3));c.fillStyle='#b3d3c9';c.beginPath();c.moveTo(0,1.25);c.lineTo(1.45,-1.05);c.lineTo(.45,-.8);c.lineTo(0,-1.15);c.lineTo(-.45,-.8);c.lineTo(-1.45,-1.05);c.closePath();c.fill();const paint=c.createLinearGradient(-.4,0,.4,0);paint.addColorStop(0,'#063729');paint.addColorStop(.55,'#23a264');paint.addColorStop(1,'#12442f');c.fillStyle=paint;c.beginPath();c.ellipse(0,0,.46,1,0,0,7);c.fill();c.fillStyle='#d6e6db';for(const side of [-1,1]){c.fillRect(side*.7-.12,-.7,.24,1.6);c.fillStyle=s.juice.hex;c.fillRect(side*.7-.1,.85,.2,.2);c.fillStyle='#bd94ff';c.beginPath();c.moveTo(side*.7-.15,-.8);c.lineTo(side*.7,-1.6);c.lineTo(side*.7+.15,-.8);c.fill();c.fillStyle='#d6e6db';}if(s.shield){c.strokeStyle='#a4d4ff';c.lineWidth=.05;c.beginPath();c.arc(0,0,1.65,0,7);c.stroke();}c.restore();}
  for(const p of this.effects){if(!s.paused){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,.1,.1);}c.globalAlpha=1;this.effects=this.effects.filter(p=>p.life>0);
 }
}
