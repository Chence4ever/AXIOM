import {memo,useEffect,useRef,useState,type PointerEvent as ReactPointer,type ReactNode} from 'react'
import {localPoint,touches,type Point} from './geometry'
import type {Ink} from './records'
export type Tool='read'|'pen'|'marker'|'eraser'
export type Brush={tool:Tool;color:string;width:number;touchInk?:boolean}
type Props={blockId:string;children:ReactNode;brush:Brush;ink:Ink[];add:(points:Point[],tool:'pen'|'marker')=>void;erase:(items:Ink[])=>void}
function outline(points:Point[],width:number){
  const sides=points.map((p,i)=>{
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)]
    const dx=next[0]-prev[0],dy=next[1]-prev[1],length=Math.hypot(dx,dy)||1,r=width*(0.3+0.7*p[2])
    return [[p[0]-dy/length*r,p[1]+dx/length*r],[p[0]+dy/length*r,p[1]-dx/length*r]]
  })
  return 'M'+[...sides.map(s=>s[0]),...sides.reverse().map(s=>s[1])].map(p=>p.join(',')).join(' L')+' Z'
}
const Stroke=memo(function Stroke({points,width,color,opacity}:{points:Point[];width:number;color:string;opacity:number}){
  if(points.length===1)return <circle cx={points[0][0]} cy={points[0][1]} r={width/2} fill={color} opacity={opacity}/>
  return <path d={outline(points,width)} fill={color} opacity={opacity}/>
})
export function InkSurface({blockId,children,brush,ink,add,erase}:Props){
  const box=useRef<HTMLDivElement>(null)
  const gesture=useRef<{
    pointer:number; mode:'pen'|'marker'|'eraser';points:Point[];removed:Set<string>
    left:number;top:number;scale:number
  }|null>(null)
  const frame=useRef(0)
  const [,refresh]=useState(0)
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[])
  function paint(){
    if(!frame.current)frame.current=requestAnimationFrame(()=>{
      frame.current=0
      refresh(n=>n+1)
    })
  }
  function append(event:PointerEvent){
    const g=gesture.current!
    const p=localPoint(event.clientX,event.clientY,g.left,g.top,g.scale,event.pressure)
    const last=g.points.at(-1)
    if(last&&last[0]===p[0]&&last[1]===p[1])return
    g.points.push(p)
    if(g.mode==='eraser')for(const a of ink)if(touches(a.points,p,8+a.width/2))g.removed.add(a.id)
  }
  function down(e:ReactPointer<HTMLDivElement>){
    if(gesture.current||e.button!==0||brush.tool==='read')return
    if(e.pointerType==='touch'&&(!brush.touchInk||!e.isPrimary))return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect=e.currentTarget.getBoundingClientRect()
    gesture.current={pointer:e.pointerId,points:[],mode:brush.tool,removed:new Set(),
      left:rect.left,top:rect.top,scale:rect.width/e.currentTarget.offsetWidth}
    append(e.nativeEvent)
    paint()
  }
  function move(e:ReactPointer<HTMLDivElement>){
    if(gesture.current?.pointer!==e.pointerId)return
    const samples=e.nativeEvent.getCoalescedEvents?.()??[]
    for(const sample of samples)append(sample)
    append(e.nativeEvent)
    paint()
  }
  function end(e:ReactPointer<HTMLDivElement>,commit:boolean){
    const g=gesture.current
    if(!g||g.pointer!==e.pointerId)return
    if(commit){
      append(e.nativeEvent)
      if(g.mode==='eraser'){
        const hits=ink.filter(a=>g.removed.has(a.id))
        if(hits.length)erase(hits)
      }else add(g.points,g.mode)
    }
    gesture.current=null
    paint()
  }
  const g=gesture.current
  return <div id={'anchor-'+blockId} className={'sheet-block tool-'+brush.tool} ref={box} onPointerDownCapture={down} onPointerMove={move} onPointerUp={e=>end(e,true)} onPointerCancel={e=>end(e,false)} onLostPointerCapture={e=>end(e,false)}>
    {children}<svg className="ink-layer" aria-hidden="true">{ink.filter(a=>!g?.removed.has(a.id)).map(a=><Stroke key={a.id} {...a}/>)}{g&&g.mode!=='eraser'&&<path d={g.points.length===1?'M'+g.points[0][0]+' '+g.points[0][1]+'h0.01':outline(g.points,g.mode==='marker'?brush.width*5:brush.width)} fill={g.mode==='marker'&&brush.color==='#254d66'?'#ebc340':brush.color} opacity={g.mode==='marker'?.4:1}/>}</svg></div>
}
