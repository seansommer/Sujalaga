import * as THREE from 'three';
import {EnvironmentDetail} from './environment.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {JUICES,clamp} from './simulation.js';
const TAU=Math.PI*2;
const basic=(color,intensity=1)=>new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)});
const pbr=(color,metalness=0,roughness=.3)=>new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:1,clearcoatRoughness:.15});
function mesh(g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);return o;}
function box(w,h,d,m,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function cylinder(r1,r2,h,m,x=0,y=0,z=0,segments=20){return mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m,x,y,z);}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.15,'#ffffffee');g.addColorStop(.5,'#ffffff22');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function labelTexture(color,text='suja'){
 const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,512,256);
 x.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<14;i++){x.beginPath();x.arc(i*48,260,60,0,TAU);x.fill();}
 x.fillStyle='#fcfff0';x.textAlign='center';x.font='bold 112px Arial';x.fillText(text,256,164);x.font='bold 19px Arial';x.fillText('ORGANIC  •  JUICE SQUADRON',256,213);
 x.save();x.translate(256,48);x.beginPath();x.moveTo(0,-26);x.bezierCurveTo(-40,4,-12,30,0,20);x.bezierCurveTo(26,8,22,-10,0,-26);x.fill();x.restore();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function makeShip(materials){
 const {green,chrome,white,purple,dark}=materials,g=new THREE.Group();
 const core=mesh(new THREE.SphereGeometry(.63,28,20),green,0,0,.2);core.scale.set(1,1.65,.54);g.add(core);
 const canopy=mesh(new THREE.SphereGeometry(.39,24,16),pbr(0x182d25,.5,.1),0,.55,.47);canopy.scale.set(1,1.55,.65);g.add(canopy);
 g.add(box(.13,1.2,.08,white,0,-.35,.58));
 const wingShape=new THREE.Shape();wingShape.moveTo(.35,.3);wingShape.lineTo(1.45,-.75);wingShape.lineTo(1.38,-1.16);wingShape.lineTo(.3,-.65);wingShape.closePath();
 const wg=new THREE.ExtrudeGeometry(wingShape,{depth:.13,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1});
 for(const side of [-1,1]){
  const w=mesh(wg,chrome);w.scale.x=side;g.add(w);
  const pod=cylinder(.24,.29,1.62,chrome,side*.72,-.07,.15);g.add(pod,cylinder(.16,.2,.5,green,side*.72,.67,.16));
  g.add(cylinder(.14,.14,.09,dark,side*.72,.96,.16));const nozzle=cylinder(.105,.105,.1,basic(0xffbc35,2.4),side*.72,1.02,.16);nozzle.name='nozzle-light';g.add(nozzle);
  const flash=mesh(new THREE.SphereGeometry(.19,12,8),basic(0xdfff8c,3),side*.72,1.15,.16);flash.name='muzzle';flash.visible=false;g.add(flash);
  g.add(cylinder(.2,.22,.22,dark,side*.72,-.95,.15));
  const engine=cylinder(.04,.18,.85,basic(0xb76bff,3.5),side*.72,-1.45,.15);engine.name='engine';g.add(engine);
  const wingLight=box(.06,.35,.05,purple,side*1.24,-.88,.22);g.add(wingLight);
 }
 const badge=mesh(new THREE.PlaneGeometry(.56,.28),new THREE.MeshBasicMaterial({map:labelTexture('#086438'),transparent:false}),0,-.1,.63);g.add(badge);
 const shield=mesh(new THREE.SphereGeometry(1.65,32,20),new THREE.MeshBasicMaterial({color:0x9bcfff,transparent:true,opacity:.12,wireframe:true,depthWrite:false}));shield.name='shield';shield.visible=false;g.add(shield);
 return g;
}
export class ArcadeScene{
 constructor(canvas,{onMove,onContextLost}={}){
  this.canvas=canvas;this.onMove=onMove;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x020e16);this.scene.fog=new THREE.FogExp2(0x031420,.009);
  this.camera=new THREE.PerspectiveCamera(43,1,.1,160);this.camera.position.set(0,-3,36);
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.04).texture;this.scene.environment=this.env;room.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xd9fff3,0x1b0d30,2.5));
  const key=new THREE.DirectionalLight(0xf3ffe4,4);key.position.set(-9,8,12);this.scene.add(key);
  const rim=new THREE.DirectionalLight(0xa675ff,3.2);rim.position.set(10,-1,2);this.scene.add(rim);
  this.materials={green:pbr(0x07673a,.55,.24),chrome:pbr(0xcbdeda,.9,.18),white:pbr(0xe5eee6,.2,.3),purple:basic(0xb075ff,2),dark:pbr(0x091a22,.7,.26)};
  this.ship=makeShip(this.materials);this.scene.add(this.ship);
  this.shipGlow=new THREE.PointLight(0xb876ff,9,7,2);this.scene.add(this.shipGlow);
  this.bottles=new Map();this.exits=[];this.pickups=new Map();this.sparkTex=glowTexture();this.effects=[];this.pulse=0;this.shake=0;this.reduced=false;this.quality='auto';this.elapsed=0;this.sector=-1;this.disposed=false;
  this.makeBottleAssets();this.makeBackground();this.makePools();this.detail=new EnvironmentDetail(this.scene);this.recoil=0;
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
  this.bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.62,.52,1.03);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.hit=new THREE.Vector3();
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onContextLost?.();});
 }
 makeBottleAssets(){
  const pts=[[0,-.9],[.36,-.9],[.45,-.82],[.46,-.55],[.46,.48],[.43,.64],[.3,.82],[.25,.88],[.25,1.02],[0,1.02]].map(([x,y])=>new THREE.Vector2(x,y));
  this.bottleGeo=new THREE.LatheGeometry(pts,24);this.fluidGeo=new THREE.CylinderGeometry(.405,.405,1.34,20);this.capGeo=new THREE.CylinderGeometry(.285,.285,.21,24);this.neckGeo=new THREE.CylinderGeometry(.25,.25,.13,20);
  this.glass=new THREE.MeshPhysicalMaterial({color:0xddfff2,metalness:0,roughness:.08,transparent:true,opacity:.22,clearcoat:1,side:THREE.FrontSide,depthWrite:false});
  this.labelGeo=new THREE.CylinderGeometry(.467,.467,.58,24,1,true);this.labelMats=['#086438','#bd8313','#ce4f16','#74267f'].map(c=>new THREE.MeshStandardMaterial({map:labelTexture(c),roughness:.42,metalness:.12}));
  this.fluidMats=JUICES.map(j=>new THREE.MeshPhysicalMaterial({color:j.color,roughness:.19,metalness:.04,clearcoat:1,emissive:j.color,emissiveIntensity:.2}));
  const bubblePos=new Float32Array(33);for(let i=0;i<11;i++){bubblePos[i*3]=Math.sin(i*23)*.28;bubblePos[i*3+1]=((i*13)%11)/11*1.2-.7;bubblePos[i*3+2]=Math.cos(i*14)*.3;}
  this.wingGeo=new THREE.BoxGeometry(.39,.12,.32);this.engineGeo=new THREE.CylinderGeometry(.12,.1,.37,12);this.flameGeo=new THREE.CylinderGeometry(.025,.09,.45,10);this.bossHaloGeo=new THREE.TorusGeometry(.72,.035,8,40);this.bossHaloMaterials=JUICES.map(j=>basic(j.color,2));this.bossFinGeo=new THREE.OctahedronGeometry(.2);this.bossPlateGeo=new THREE.BoxGeometry(.28,1.15,.2);this.bottleRim=new THREE.TorusGeometry(.275,.027,8,24);this.powerGeo=new THREE.OctahedronGeometry(.44);this.powerRingGeo=new THREE.TorusGeometry(.65,.035,6,24);this.powerMats={shield:basic(0x8ecbff,1.8),rapid:basic(0xffbc52,1.8),twin:basic(0xba86ff,1.8),spread:basic(0x97edb1,1.8)};
  this.powerIcons={};for(const [kind,symbol]of Object.entries({twin:'Ⅱ',rapid:'»',shield:'◇',spread:'⋔'})){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#071724';x.beginPath();x.arc(64,64,51,0,TAU);x.fill();x.strokeStyle='#e9ffdb';x.lineWidth=4;x.stroke();x.fillStyle='#fff';x.font='bold 75px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(symbol,64,64);this.powerIcons[kind]=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});}
  this.bubbleGeo=new THREE.BufferGeometry();this.bubbleGeo.setAttribute('position',new THREE.BufferAttribute(bubblePos,3));this.bubbleMat=new THREE.PointsMaterial({color:0xeaffc7,size:.06,transparent:true,opacity:.75,depthWrite:false});
 }
 bottle(e,sector){
  const g=new THREE.Group();g.add(mesh(this.bottleGeo,this.glass));
  const fluid=mesh(this.fluidGeo,this.fluidMats[sector]);fluid.name='fluid';fluid.scale.y=.08;fluid.position.y=-.84+1.34*.08/2;g.add(fluid);
  const label=mesh(this.labelGeo,this.labelMats[sector],0,-.2,0);label.rotation.y=Math.PI;g.add(label);
  const cap=mesh(this.capGeo,this.materials.white,0,1.12,0);cap.name='cap';cap.visible=false;g.add(cap,mesh(this.neckGeo,this.materials.white,0,.96,0));
  const rim=mesh(this.bottleRim,this.materials.chrome,0,1.03,0);rim.rotation.x=Math.PI/2;g.add(rim);
  const bubbles=new THREE.Points(this.bubbleGeo,this.bubbleMat);bubbles.name='bubbles';g.add(bubbles);
  for(const side of [-1,1]){
   const f=mesh(this.wingGeo,this.materials.chrome,side*.57,-.52,-.08);f.rotation.z=side*.25;g.add(f);
   g.add(mesh(this.engineGeo,this.materials.dark,side*.59,-.63,-.08));
   const glow=mesh(this.flameGeo,this.materials.purple,side*.59,-1.03,-.08);glow.name='engine';g.add(glow);
  }
  if(e.boss){
   const rig=new THREE.Group();rig.name='boss-rig';rig.position.set(0,.23,-.23);const glow=this.bossHaloMaterials[sector];
   const halo=mesh(this.bossHaloGeo,glow);halo.name='boss-halo';rig.add(halo);
   const fins=[6,4,2,8][sector];
   for(let i=0;i<fins;i++){
    const a=i*TAU/fins,fin=new THREE.Group();fin.position.set(Math.cos(a)*.9,Math.sin(a)*.9,0);fin.rotation.z=a-Math.PI/2;
    if(sector===2){const plate=mesh(this.bossPlateGeo,this.materials.chrome);fin.add(plate,mesh(this.engineGeo,glow,0,.62,0));}
    else{const blade=mesh(this.bossFinGeo,this.materials.chrome);blade.scale.set(sector===3?.9:.65,sector===0?2.5:1.8,.7);fin.add(blade);const tip=mesh(this.bossFinGeo,glow,0,.3,.08);tip.scale.setScalar(.35);fin.add(tip);}
    rig.add(fin);
   }
   if(sector===1||sector===3){const second=mesh(this.bossHaloGeo,glow);second.scale.setScalar(1.35);second.rotation.x=.6;second.name='orbit-ring';rig.add(second);}
   g.add(rig);
  }

  g.userData.fluid=fluid;g.userData.bubbles=bubbles;g.userData.scale=e.boss?2.25:1;g.scale.setScalar(g.userData.scale);return g;
 }
 makeBackground(){
  const shader=new THREE.ShaderMaterial({depthWrite:false,uniforms:{time:{value:0},accent:{value:new THREE.Color(0x135446)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 accent;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=vUv*5.;float n=noise(p+time*.006)*.5+noise(p*2.7)*.3+noise(p*7.1)*.2;float band=exp(-pow((vUv.x-vUv.y*.4-.28)*3.,2.));vec3 col=mix(vec3(.002,.009,.022),accent,n*n*band*.58);col+=vec3(.09,.015,.17)*pow(noise(p*1.5+2.),3.)*.7;gl_FragColor=vec4(col,1.);}`});
  this.nebula=mesh(new THREE.PlaneGeometry(150,110),shader,0,5,-55);this.scene.add(this.nebula);
  const n=1200,positions=new Float32Array(n*3),colors=new Float32Array(n*3);for(let i=0;i<n;i++){positions[i*3]=(Math.random()-.5)*90;positions[i*3+1]=(Math.random()-.5)*80;positions[i*3+2]=-5-Math.random()*55;const c=new THREE.Color(i%5===0?0x9b70ce:0xbce7db);colors.set([c.r,c.g,c.b],i*3);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));this.stars=new THREE.Points(geo,new THREE.PointsMaterial({map:this.sparkTex,size:.17,sizeAttenuation:true,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.scene.add(this.stars);
  const planetMat=new THREE.ShaderMaterial({uniforms:{accent:{value:new THREE.Color(0x347551)}},vertexShader:'varying vec3 vN;varying vec3 vP;void main(){vN=normal;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vN;varying vec3 vP;uniform vec3 accent;void main(){float land=sin(vP.x*1.7+sin(vP.y*2.1))*sin(vP.z*1.9+cos(vP.x*2.4));float light=max(0.,dot(normalize(vN),normalize(vec3(-.8,.7,1.))));float rim=pow(1.-max(0.,vN.z),2.5);vec3 c=mix(vec3(.006,.04,.055),accent*.5,smoothstep(-.05,.25,land));c*=light*.8+.08;c+=vec3(.15,.65,.49)*rim*.42;gl_FragColor=vec4(c,1.);}`});
  this.planet=mesh(new THREE.SphereGeometry(12,48,32),planetMat,13,14,-34);this.planet.rotation.z=.4;this.scene.add(this.planet);
  this.station=new THREE.Group();const m=this.materials;
  // A recessed flight deck and repeating mechanical ribs create real depth behind play.
  for(const side of [-1,1]){
   this.station.add(box(.55,36,.75,m.dark,side*10,0,-2),box(.12,34,.15,basic(0x73edb6,1.3),side*9.62,0,-1.56));
   for(let i=0;i<9;i++){const y=-16+i*4;this.station.add(box(1.8,.22,1.5,m.chrome,side*10.7,y,-2.3));const brace=box(.19,2.9,.28,m.dark,side*11.3,y+1.1,-1.8);brace.rotation.z=side*.37;this.station.add(brace);this.station.add(box(.08,1.2,.08,m.purple,side*10.7,y+.5,-1.4));}
  }
  const deck=box(23,5,.3,pbr(0x0b272d,.8,.36),0,-14,-2);this.station.add(deck);
  for(let x=-10;x<=10;x+=2.5)this.station.add(box(.03,5,.04,basic(0x2d7a65),x,-14,-1.8));
  this.scene.add(this.station);
  const ring=mesh(new THREE.TorusGeometry(17,.07,8,120),basic(0x6ab085,.8),0,10,-32);ring.rotation.x=.4;this.scene.add(ring);
  this.surgeRing=mesh(new THREE.TorusGeometry(1,.04,8,80),basic(0xb4ff9a,3),0,-9,1);this.surgeRing.visible=false;this.scene.add(this.surgeRing);
 }
 makePools(){
  this.dummy=new THREE.Object3D();
  this.laserGeometries=[new THREE.CapsuleGeometry(.075,.52,4,6),new THREE.CapsuleGeometry(.09,.78,4,6),new THREE.CylinderGeometry(.045,.13,.78,6),new THREE.OctahedronGeometry(.19)];this.shots=new THREE.InstancedMesh(this.laserGeometries[0],basic(0xc7ff78,2.6),160);this.shots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.shots.frustumCulled=false;this.scene.add(this.shots);
  this.threats=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,10,8),basic(0xff6579,2),160);this.threats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.threats.frustumCulled=false;this.scene.add(this.threats);
  this.warningLanes=[];const warningMat=new THREE.MeshBasicMaterial({color:0xff8a69,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
  for(const x of [-6,-2,2,6]){const g=new THREE.Group();g.position.set(x,0,.04);g.add(mesh(new THREE.PlaneGeometry(1.65,22),warningMat));for(const side of [-1,1])g.add(mesh(new THREE.PlaneGeometry(.035,22),basic(0xff8b66,1.3),side*.83,0,.02));g.visible=false;this.scene.add(g);this.warningLanes.push(g);}this.warningMaterial=warningMat;
  this.sparkPositions=new Float32Array(2400*3);this.sparkColors=new Float32Array(2400*3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.sparkPositions,3));geo.setAttribute('color',new THREE.BufferAttribute(this.sparkColors,3));this.sparks=new THREE.Points(geo,new THREE.PointsMaterial({size:.23,map:this.sparkTex,transparent:true,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.sparks.frustumCulled=false;this.scene.add(this.sparks);
 }
 burst(x,y,color,count=25,speed=4){
  if(this.reduced)count=Math.ceil(count/4);const c=new THREE.Color(color);
  for(let i=0;i<count&&this.effects.length<2300;i++){const a=Math.random()*TAU,v=speed*(.2+Math.random());this.effects.push({x,y,z:.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:(Math.random()-.5)*4,life:.4+Math.random()*.7,max:1,color:c});}
 }
 event(e){
  if(e.type==='fire')this.recoil=1;
  if(e.type==='fill'){
   const model=this.bottles.get(e.id);if(model){model.getObjectByName('cap').visible=true;model.getObjectByName('cap').position.y=1.8;model.userData.fluid.scale.y=1;model.userData.fluid.position.y=-.17;this.exits.push({model,age:0});this.bottles.delete(e.id);}
   this.burst(e.x,e.y,JUICES[Math.max(0,this.sector)].color,e.boss?140:32,e.boss?10:4);if(e.boss&&!this.reduced)this.shake=.24;
  }
  if(e.type==='hit')this.burst(e.x,e.y,JUICES[Math.max(0,this.sector)].color,e.boss?4:3,1.6);
  if(e.type==='bossFire')this.burst(e.x,e.y,0xff807e,15,3);
  if(e.type==='surge'){this.pulse=1;this.surgeRing.position.set(e.x,e.y,.8);this.burst(e.x,e.y,0xbaff8d,120,13);}
  if(e.type==='hurt'||e.type==='shieldBreak'){this.shake=this.reduced?0:.3;this.burst(e.x,e.y,e.type==='hurt'?0xff6c70:0x9bcfff,75,7);}
  if(e.type==='power')this.burst(e.x,e.y,0xb180ff,45,4);
 }
 setQuality(value,reduced=false){this.quality=value;this.reduced=reduced;this.resize();}
 resize(){
  const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
  const mobile=this.width<700,ratio=this.quality==='performance'?1:Math.min(devicePixelRatio||1,this.quality==='ultra'?2:mobile?1.4:1.7);
  this.renderer.setPixelRatio(ratio);this.renderer.setSize(this.width,this.height,false);this.composer.setPixelRatio(ratio);this.composer.setSize(this.width,this.height);
  this.camera.aspect=this.width/this.height;const t=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));this.distance=Math.max(14/t,9.6/(t*this.camera.aspect));this.camera.position.set(0,-2.2,this.distance);this.camera.lookAt(0,.5,0);this.camera.updateProjectionMatrix();
 }
 controlScale(){return Math.min(this.width/19.2,this.height/28);}
 pointerX(clientX,clientY){const r=this.canvas.getBoundingClientRect();this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);this.ray.ray.intersectPlane(this.plane,this.hit);return this.hit.x;}
 render(sim,dt,{menu=false}={}){
  if(this.disposed)return;const live=sim.paused?0:dt;this.elapsed+=live;
  if(this.sector!==sim.sector){this.sector=sim.sector;this.nebula.material.uniforms.accent.value.set(sim.juice.color).multiplyScalar(.35);this.planet.material.uniforms.accent.value.set(sim.juice.color).multiplyScalar(.5);this.shots.material.color.set(sim.juice.color).multiplyScalar(2.6);this.shots.geometry=this.laserGeometries[this.sector];this.ship.traverse(o=>{if(o.name==='muzzle'||o.name==='nozzle-light')o.material.color.set(sim.juice.color).multiplyScalar(2.8);});}
  this.detail.update(sim.sector,this.elapsed,this.reduced);this.recoil=Math.max(0,this.recoil-live*14);
  this.nebula.material.uniforms.time.value=this.elapsed;this.planet.rotation.y=this.elapsed*.006;
  if(!this.reduced){this.stars.rotation.z=Math.sin(this.elapsed*.04)*.02;this.stars.position.y=-(this.elapsed*.18)%3;}
  const desiredX=menu?Math.sin(this.elapsed*.3)*1.6:sim.player.x;this.ship.position.set(desiredX,sim.player.y-this.recoil*.07,.5);
  this.ship.rotation.z=menu?Math.sin(this.elapsed*.6)*.08:clamp((sim.player.x-sim.target)*.065,-.32,.32);this.ship.rotation.y=Math.sin(this.elapsed*1.5)*.025;this.ship.rotation.x=this.reduced?0:clamp((sim.targetY-sim.player.y)*.06,-.12,.12);
  this.ship.visible=menu||sim.invulnerable<=0||sim.state==='countdown'||Math.floor(this.elapsed*11)%2===0;
  this.ship.getObjectByName('shield').visible=sim.shield>0;this.ship.getObjectByName('shield').rotation.y=this.elapsed*.7;
  this.ship.traverse(o=>{if(o.name==='engine')o.scale.y=.9+Math.sin(this.elapsed*28)*.12;if(o.name==='muzzle'){o.visible=!menu&&this.recoil>.1;o.scale.setScalar(.6+this.recoil*.7);}});this.shipGlow.position.set(desiredX,sim.player.y-1.5,2);
  const ids=new Set(sim.enemies.map(e=>e.id));
  for(const [id,g]of this.bottles)if(!ids.has(id)){this.scene.remove(g);this.bottles.delete(id);}
  for(const e of sim.enemies){
   let g=this.bottles.get(e.id);if(!g){g=this.bottle(e,sim.sector);this.bottles.set(e.id,g);this.scene.add(g);}
   g.position.set(e.x,e.y,e.z+.2);g.rotation.z=e.angle;g.rotation.y=Math.sin(this.elapsed*.7+e.id)*.15;g.visible=e.age>=e.delay;
   const f=clamp(e.fill,.06,1);g.userData.fluid.scale.y=f;g.userData.fluid.position.y=-.84+1.34*f/2;g.userData.fluid.rotation.z=this.reduced?0:Math.sin(this.elapsed*4+e.id)*.025*f;
   g.userData.bubbles.visible=e.fill>.1;g.userData.bubbles.scale.y=f;g.userData.bubbles.position.y=-.8+f*.8+Math.sin(this.elapsed*3+e.id)*.025;
   const halo=g.getObjectByName('boss-halo');if(halo){const charge=sim.warning?clamp(1-sim.warning.remaining/.7,0,1):0;halo.scale.setScalar(1+charge*.24);halo.material.color.set(sim.juice.color).multiplyScalar(2+charge*4);const rig=g.getObjectByName('boss-rig');rig.rotation.z=this.reduced?0:sim.sector===2?0:this.elapsed*[.15,.8,0,-.45][sim.sector];const ring=g.getObjectByName('orbit-ring');if(ring)ring.rotation.y=this.reduced?0:this.elapsed;}
   for(const child of g.children)if(child.name==='engine')child.scale.y=.8+Math.sin(this.elapsed*20+e.id)*.25;
  }
  for(const exit of this.exits){exit.age+=live;exit.model.getObjectByName('cap').position.y=1.12+Math.max(0,.68-exit.age*3.4);exit.model.position.y+=live*(exit.age<.22?.4:5+exit.age*11);exit.model.position.z-=live*5;exit.model.rotation.z+=live*1.4;exit.model.scale.multiplyScalar(Math.exp(-live*.3));if(exit.age>1.3)this.scene.remove(exit.model);}
  this.exits=this.exits.filter(e=>e.age<=1.3);
  const drawPool=(pool,items,scale=1)=>{pool.count=Math.min(pool.instanceMatrix.count,items.length);for(let i=0;i<pool.count;i++){const b=items[i];this.dummy.position.set(b.x,b.y,.75);this.dummy.rotation.set(0,0,-Math.atan2(b.vx,b.vy));this.dummy.scale.setScalar(scale);this.dummy.updateMatrix();pool.setMatrixAt(i,this.dummy.matrix);}pool.instanceMatrix.needsUpdate=true;};
  for(const lane of this.warningLanes)lane.visible=!!sim.warning?.lanes.includes(lane.position.x);this.warningMaterial.opacity=this.reduced?.16:.08+(1-(sim.warning?.remaining||0)/.7)*.15;
  drawPool(this.shots,sim.bullets);drawPool(this.threats,sim.hazards,1+Math.sin(this.elapsed*12)*.08);
  const pickIds=new Set(sim.pickups.map(p=>p.id));for(const [id,g]of this.pickups)if(!pickIds.has(id)){this.scene.remove(g);this.pickups.delete(id);}
  for(const p of sim.pickups){let g=this.pickups.get(p.id);if(!g){g=new THREE.Group();const m=this.powerMats[p.kind];g.add(mesh(this.powerGeo,m),mesh(this.powerRingGeo,this.materials.white));const icon=new THREE.Sprite(this.powerIcons[p.kind]);icon.name='power-icon';icon.scale.set(.66,.66,1);icon.position.z=.52;g.add(icon);this.pickups.set(p.id,g);this.scene.add(g);}g.position.set(p.x,p.y,.6);g.children[0].rotation.set(this.elapsed*.6,this.elapsed*1.8,this.elapsed*.3);g.children[1].rotation.set(.4,Math.sin(this.elapsed)*.3,this.elapsed*.7);}
  for(const p of this.effects){p.life-=live;p.x+=p.vx*live;p.y+=p.vy*live;p.z+=p.vz*live;p.vy-=live*.8;}
  this.effects=this.effects.filter(p=>p.life>0);for(let i=0;i<this.effects.length;i++){const p=this.effects[i];this.sparkPositions.set([p.x,p.y,p.z],i*3);const a=Math.min(1,p.life*2);this.sparkColors.set([p.color.r*a*2,p.color.g*a*2,p.color.b*a*2],i*3);}
  this.sparks.geometry.setDrawRange(0,this.effects.length);this.sparks.geometry.attributes.position.needsUpdate=true;this.sparks.geometry.attributes.color.needsUpdate=true;
  this.pulse=Math.max(0,this.pulse-live*1.1);this.surgeRing.visible=this.pulse>0;this.surgeRing.scale.setScalar(1+(1-this.pulse)*28);
  this.shake=Math.max(0,this.shake-live);const shake=this.shake*(this.reduced?0:1);const intro=sim.state==='countdown'&&!menu?sim.countdown/3.2:0;
  this.camera.position.set(Math.sin(this.elapsed*70)*shake+(!this.reduced?Math.sin(intro*Math.PI)*2.5:0),-2.2+Math.cos(this.elapsed*61)*shake,this.distance+(!this.reduced?intro*3:0));this.camera.lookAt(0,.5,0);
  if(this.quality==='performance')this.renderer.render(this.scene,this.camera);else this.composer.render();
 }
 project(x,y){const p=new THREE.Vector3(x,y,0).project(this.camera);return{x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2};}
 clear(){for(const g of this.bottles.values())this.scene.remove(g);for(const e of this.exits)this.scene.remove(e.model);for(const g of this.pickups.values())this.scene.remove(g);this.bottles.clear();this.pickups.clear();this.exits=[];this.effects=[];this.pulse=0;for(const lane of this.warningLanes)lane.visible=false;}
}
