import {useRef,useState,type PointerEvent as ReactPointer,type ReactNode} from 'react'
import {localPoint,touches,type Point} from './geometry'
import type {Ink} from './records'
export type Tool='read'|'pen'|'marker'|'eraser'
export type Brush={tool:Tool;color:string;width:number}
type Props={children:ReactNode;brush:Brush;ink:Ink[];add:(points:Point[],tool:'pen'|'marker')=>void;erase:(items:Ink[])=>void}
function outline(points:Point[],width:number){
  const sides=points.map((p,i)=>{
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)]
    const dx=next[0]-prev[0],dy=next[1]-prev[1],length=Math.hypot(dx,dy)||1,r=width*(0.3+0.7*p[2])
    return [[p[0]-dy/length*r,p[1]+dx/length*r],[p[0]+dy/length*r,p[1]-dx/length*r]]
  })
  return 'M'+[...sides.map(s=>s[0]),...sides.reverse().map(s=>s[1])].map(p=>p.join(',')).join(' L')+' Z'
}
function Stroke({points,width,color,opacity}:{points:Point[];width:number;color:string;opacity:number}){
  if(points.length===1)return <circle cx={points[0][0]} cy={points[0][1]} r={width/2} fill={color} opacity={opacity}/>
  return <path d={outline(points,width)} fill={color} opacity={opacity}/>
}
export function InkSurface({children,brush,ink,add,erase}:Props){
  const box=useRef<HTMLDivElement>(null), gesture=useRef<{pointer:number;mode:Exclude<Tool,'read'>;points:Point[];removed:Set<string>}|null>(null)
  const [,refresh]=useState(0)
  const point=(e:PointerEvent)=>{const el=box.current!,rect=el.getBoundingClientRect();return localPoint(e.clientX,e.clientY,rect.left,rect.top,rect.width/el.offsetWidth,e.pressure)}
  const append=(event:PointerEvent)=>{
    const g=gesture.current!,p=point(event);g.points.push(p)
    if(g.mode==='eraser')for(const a of ink)if(touches(a.points,p,8+a.width/2))g.removed.add(a.id)
  }
  function down(e:ReactPointer<HTMLDivElement>){
    if(gesture.current||e.button!==0||e.pointerType==='touch')return
    const mode=brush.tool==='read'&&e.pointerType==='pen'&&!(e.target as Element).closest('input,select,button,summary')?'pen':brush.tool
    if(mode==='read')return
    e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current={pointer:e.pointerId,points:[],mode,removed:new Set()};append(e.nativeEvent);refresh(n=>n+1)
  }
  function move(e:ReactPointer<HTMLDivElement>){
    if(gesture.current?.pointer!==e.pointerId)return
    const points=e.nativeEvent.getCoalescedEvents?.()
    for(const event of points?.length?points:[e.nativeEvent])append(event)
    refresh(n=>n+1)
  }
  function end(e:ReactPointer<HTMLDivElement>,commit:boolean){
    const g=gesture.current;if(!g||g.pointer!==e.pointerId)return
    if(commit){
      if(g.mode==='eraser'){const hits=ink.filter(a=>g.removed.has(a.id));if(hits.length)erase(hits)}
      else add(g.points,g.mode)
    }
    gesture.current=null;refresh(n=>n+1)
  }
  const g=gesture.current
  return <div className={'sheet-block tool-'+brush.tool} ref={box} onPointerDownCapture={down} onPointerMove={move} onPointerUp={e=>end(e,true)} onPointerCancel={e=>end(e,false)} onLostPointerCapture={e=>end(e,false)}>
    {children}<svg className="ink-layer" aria-hidden="true">{ink.filter(a=>!g?.removed.has(a.id)).map(a=><Stroke key={a.id} {...a}/>)}{g&&g.mode!=='eraser'&&<Stroke points={g.points} color={g.mode==='marker'?'#ebc340':brush.color} width={g.mode==='marker'?brush.width*5:brush.width} opacity={g.mode==='marker'?.4:1}/>}</svg></div>
}
