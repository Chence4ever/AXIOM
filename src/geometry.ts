export type Point=[number,number,number]
export function localPoint(x:number,y:number,left:number,top:number,scale:number,pressure:number):Point{
  return [(x-left)/scale,(y-top)/scale,pressure>0?pressure:0.5]
}
export function touches(points:Point[],p:Point,radius:number){
  return points.some((b,i)=>{
    const a=points[Math.max(0,i-1)],dx=b[0]-a[0],dy=b[1]-a[1]
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)))
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=radius
  })
}
