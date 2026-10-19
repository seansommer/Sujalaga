export const BOSS_WEAPONS=[
 {key:'plasma',name:'plasma orbs',color:0x4dffd0,hex:'#4dffd0',r:.27,sound:'boss-plasma'},
 {key:'disc',name:'citrus discs',color:0xffd34d,hex:'#ffd34d',r:.32,sound:'boss-disc'},
 {key:'rocket',name:'carrot rockets',color:0xff8050,hex:'#ff8050',r:.19,halfLength:.4,acceleration:.7,sound:'boss-rocket'},
 {key:'comet',name:'berry comets',color:0xea8bff,hex:'#ea8bff',r:.25,sound:'boss-comet'}
];
export function moveHazard(h,dt){
 if(h.curve){const a=h.curve*dt,c=Math.cos(a),s=Math.sin(a),vx=h.vx;h.vx=vx*c-h.vy*s;h.vy=vx*s+h.vy*c;}
 if(h.acceleration){const speed=Math.hypot(h.vx,h.vy)||1,ratio=Math.min(8.2,speed+h.acceleration*dt)/speed;h.vx*=ratio;h.vy*=ratio;}
 h.x+=h.vx*dt;h.y+=h.vy*dt;h.life-=dt;
}
// Sweeping the whole rocket capsule includes its nose and tail, not just its center.
export function hazardSweep(h,ax,ay){const length=h.halfLength||0,speed=Math.hypot(h.vx,h.vy)||1,dx=h.vx/speed*length,dy=h.vy/speed*length;return[ax-dx,ay-dy,h.x+dx,h.y+dy];}
