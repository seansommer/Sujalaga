// Frame the playable area, then extend that same world down behind the thumb area.
export function flightView(width,height,inset=0){const playHeight=Math.max(120,height-inset);return{playHeight,scale:Math.min(width/19.2,playHeight/28),originY:playHeight/2};}
export function steeringInset(){return document.body.classList.contains('flying')?document.getElementById('steering-pad')?.getBoundingClientRect().height||0:0;}
export function frameCamera(camera,width,height,inset=0){
 const view=flightView(width,height,inset),t=Math.tan(camera.fov*Math.PI/360);camera.aspect=width/view.playHeight;
 const distance=Math.max(14/t,9.6/(t*camera.aspect));camera.position.set(0,-2.2,distance);camera.lookAt(0,.5,0);
 camera.setViewOffset(width,view.playHeight,0,0,width,height);camera.updateProjectionMatrix();return{...view,distance};
}
