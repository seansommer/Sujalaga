// Seeded routes keep each patrol fresh while leaving every attack readable.
export const BOSS_NAMES=['THE GREEN GUARDIAN','CITRUS CYCLONE','CARROT CRUSHER','BERRY ECLIPSE'];
export const BOSS_HINTS=['Watch the sweeping fans.','Slip between the spinning spokes.','Leave the glowing lanes before the volley.','Thread the petals. Keep moving.'];
export const FORMATIONS=['chevron','diamond','wings','orbit','staircase','lattice'];
export function formationPoints(name,count){
 return Array.from({length:count},(_,i)=>{
  const row=Math.floor(i/6),col=i%6,x=(col-2.5)*2.25;
  if(name==='chevron')return{x,y:9.8-Math.abs(x)*.43-row*2.1};
  if(name==='diamond'){const ring=i<6?0:i<12?1:2,n=ring===2?count-12:6,j=i-ring*6,a=j/n*Math.PI*2+ring*.3;return{x:Math.cos(a)*(3.1+ring*1.7),y:6.5+Math.sin(a)*(1.7+ring*.9)};}
  if(name==='wings')return{x:x+(col<3?-.5:.5),y:9.5-row*2.25-(col%3)*.5};
  if(name==='orbit'){const a=i/count*Math.PI*2;return{x:Math.cos(a)*6.5,y:6.7+Math.sin(a)*3.6};}
  if(name==='staircase')return{x,y:9.7-row*2.2-(col%3)*.65};
  return{x:x+(row%2?.5:-.5),y:9.7-row*2.4};
 });
}
export function bossPose(sector,t,phase=1){
 const k=phase===2?1.15:1;
 if(sector===0)return{x:Math.sin(t*.58*k)*5.3,y:8+Math.cos(t*.85)*.6,angle:-Math.sin(t*.58*k)*.15};
 if(sector===1)return{x:Math.sin(t*.8*k)*5.4,y:7.2+Math.sin(t*1.6*k)*1.5,angle:Math.sin(t*.8*k)*.25};
 if(sector===2){const x=Math.tanh(Math.sin(t*.7*k)*3)*5.2;return{x,y:8-Math.pow(Math.max(0,Math.sin(t*1.4*k)),6)*2,angle:-Math.cos(t*.7*k)*.12};}
 return{x:Math.cos(t*.65*k)*4.5,y:7.5+Math.sin(t*.65*k)*1.8,angle:Math.sin(t*.9)*.22};
}
export function bossVolley(sector,beat,phase,x,y,aim){
 const shots=[],speed=5.3+(phase-1)*.65,add=(a,v=speed,extra={})=>shots.push({x,y:y-1.5,vx:Math.sin(a)*v,vy:-Math.cos(a)*v,...extra});
 let kind='fan',lanes=[];
 if(sector===0){
  // Alternate a wide fan with two staggered side fans; never a solid wall.
  const n=phase===2?7:5,shift=beat%2?.14:-.14;
  for(let i=0;i<n;i++)add(aim+shift+(i-(n-1)/2)*.21);
  if(phase===2&&beat%3===2){add(aim-.8,4.3);add(aim+.8,4.3);}
 }else if(sector===1){
  kind='spiral';const n=phase===2?10:8,spin=beat*.39;
  for(let i=0;i<n;i++)add(spin+i*Math.PI*2/n,4.4+(beat%2)*.55);
  if(phase===2){add(aim-.12,6.3);add(aim+.12,6.3);}
 }else if(sector===2){
  if(beat%2===0){kind='lanes';const gap=(beat/2+phase)%4;lanes=[-6,-2,2,6].filter((_,i)=>i!==gap);for(const lx of lanes)for(const off of [-.46,.46])shots.push({x:lx+off,y:10.5,vx:0,vy:-(phase===2?7:6),r:.23});}
  else{kind='crossfire';for(const side of [-1,1])for(let i=0;i<(phase===2?3:2);i++)shots.push({x:side*6.6,y:8-i*.7,vx:-side*(2.1+i*.3),vy:-5.5});}
 }else{
  kind='petals';const n=phase===2?9:7;
  for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.26+(beat%2?.13:0);add(a,4.5,{curve:(beat%2?1:-1)*.32});}
  if(beat%3===2){add(aim-.17,6.8);add(aim+.17,6.8);}
 }
 return{kind,lanes,shots};
}
export function bossInterval(sector,phase){return [1.8,1.5,2.05,1.65][sector]-(phase===2?.23:0);}
