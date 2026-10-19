import * as THREE from 'three';
const mat=(color,metalness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.32});
const glow=(color)=>new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.25)});
const box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;};
const ring=(r,t,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,80),m);o.position.set(x,y,z);return o;};
export class EnvironmentDetail{
 constructor(scene){
  this.groups=[];this.animated=[];const steel=mat(0x1b3a3e),pale=mat(0x59726b),dark=mat(0x071c26),green=glow(0x3ba56c),amber=glow(0xaf7926),purple=glow(0x713db3);
  for(let i=0;i<4;i++){const g=new THREE.Group();g.visible=false;scene.add(g);this.groups.push(g);}
  // Sector 1: orbital greenhouse, segmented habitation rings and service pods.
  const habitat=new THREE.Group();habitat.position.set(-10,9,-20);habitat.rotation.set(.45,.2,-.3);
  habitat.add(ring(7,.34,steel,0,0,0),ring(6.45,.1,green,0,0,0),ring(7.55,.11,pale,0,0,0));
  for(let i=0;i<36;i++){const a=i/36*Math.PI*2,p=box(.62,1.2,.33,i%3===0?green:dark,Math.cos(a)*7,Math.sin(a)*7,0);p.rotation.z=a-Math.PI/2;habitat.add(p);if(i%6===0){const spoke=box(.12,5.2,.12,pale,Math.cos(a)*3.8,Math.sin(a)*3.8,0);spoke.rotation.z=a-Math.PI/2;habitat.add(spoke);}}
  habitat.add(new THREE.Mesh(new THREE.SphereGeometry(1.5,24,16),mat(0x204d39)));this.groups[0].add(habitat);this.animated.push({object:habitat,axis:'z',speed:.025,base:-.3});
  // Sector 2: three slow gyroscopic reactor rings encircle a warm miniature star.
  const reactor=new THREE.Group();reactor.position.set(11,8,-23);for(let i=0;i<3;i++){const r=ring(5+i*.8,.16,i===1?amber:pale,0,0,0);r.rotation.x=i*.65;r.rotation.y=i*.42;reactor.add(r);this.animated.push({object:r,axis:'y',speed:(i%2?-1:1)*.08,base:i*.42});}
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(2.1,3),new THREE.MeshStandardMaterial({color:0xffb844,emissive:0xff8d2a,emissiveIntensity:1.1,roughness:.65}));reactor.add(core);this.groups[1].add(reactor);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,p=box(.4,1.05,.4,steel,Math.cos(a)*8,Math.sin(a)*8,0);p.rotation.z=a;reactor.add(p);}
  // Sector 3: a distant orbital pack-out station with moving cargo and turbine machinery.
  const factory=new THREE.Group();factory.position.set(-9,5,-18);factory.rotation.z=-.25;this.groups[2].add(factory);this.cargo=[];
  for(const y of [-5,0,5]){factory.add(box(14,.45,1.5,steel,0,y,0),box(14,.05,.1,amber,0,y+.31,.8));for(let j=0;j<7;j++){const crate=box(1.05,1.05,1.05,mat(j%2?0x4e6a41:0x886333),j*2-6,y+.8,.2);factory.add(crate);this.cargo.push({object:crate,start:j*2-6});}}
  for(let i=0;i<4;i++){const gear=ring(1.6,.2,pale,i*4-6,-8,-.5);factory.add(gear);for(let j=0;j<10;j++){const tooth=box(.4,.5,.4,steel,Math.cos(j/10*Math.PI*2)*1.7,Math.sin(j/10*Math.PI*2)*1.7,0);tooth.rotation.z=j/10*Math.PI*2;gear.add(tooth);}this.animated.push({object:gear,axis:'z',speed:i%2?.18:-.18,base:0});}
  // Sector 4: a crystal belt around a rotating violet jump gate.
  const gate=new THREE.Group();gate.position.set(0,12,-28);gate.rotation.x=.2;gate.add(ring(8,.33,dark,0,0,0),ring(7.6,.07,purple,0,0,0),ring(8.6,.06,purple,0,0,0));
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.65,0),new THREE.MeshPhysicalMaterial({color:i%2?0x5d287f:0x325c61,metalness:.35,roughness:.2,clearcoat:1,emissive:0x4c1973,emissiveIntensity:.25}));crystal.position.set(Math.cos(a)*(11+i%3),Math.sin(a)*(10+i%4),Math.sin(i)*3);crystal.scale.y=1.5+i%3;crystal.rotation.set(i*.7,i*.3,i*.8);gate.add(crystal);this.animated.push({object:crystal,axis:'y',speed:(i%2?1:-1)*.12,base:i*.3});}
  this.groups[3].add(gate);this.animated.push({object:gate,axis:'z',speed:.02,base:0});
  // Tiny service craft and running lights make the hangar feel occupied.
  this.service=[];const lane=new THREE.Group();scene.add(lane);
  for(let i=0;i<6;i++){const craft=new THREE.Group();craft.add(box(.75,.3,1.1,pale),box(.2,.15,.2,green,0,-.2,.5),box(1.4,.08,.4,steel));craft.position.set(-17+i*6,-2+i%3*5,-15-i%2*6);lane.add(craft);this.service.push({object:craft,offset:i*8,baseY:craft.position.y});}
  this.beacons=[];for(let i=0;i<12;i++){const b=box(.08,.12,.06,i%2?purple:green,i%2?9.8:-9.8,-15+Math.floor(i/2)*6,-1.4);scene.add(b);this.beacons.push(b);}
 }
 update(sector,t,reduced){this.groups.forEach((g,i)=>g.visible=i===sector);const time=reduced?0:t;for(const a of this.animated)a.object.rotation[a.axis]=a.base+time*a.speed;for(const c of this.cargo)c.object.position.x=((c.start+7+time*.35)%14)-7;for(const s of this.service){s.object.position.x=((s.offset+time*.45)%42)-21;s.object.position.y=s.baseY+Math.sin(time*.3+s.offset)*.15;}this.beacons.forEach((b,i)=>b.scale.y=1+.3*Math.sin(time*1.7+i*.7));}
}
