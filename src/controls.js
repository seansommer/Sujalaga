// Relative motion works on the clear thumb area and never snaps to a touch point.
export function dragTarget(target,dx,dy,pixelsPerUnit){
 const scale=Math.max(1,pixelsPerUnit);
 return{x:target.x+dx/scale,y:target.y-dy/scale};
}
