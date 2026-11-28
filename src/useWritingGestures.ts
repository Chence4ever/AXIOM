import {useEffect,type RefObject} from 'react'
import type {Brush} from './InkSurface'

// Native scrolling is decided before pointerdown; reserve single-contact input
// in drawing mode, then pan only for actual fingers. A pen always owns its stroke.
export function useWritingGestures(sheet:RefObject<HTMLDivElement|null>,brush:Brush){
  useEffect(()=>{
    const el=sheet.current
    const scroll=el?.closest<HTMLElement>('.reading-scroll')
    const horizontal=el?.closest<HTMLElement>('.viewport')
    if(!el||!scroll||!horizontal||brush.tool==='read')return
    const pens=new Set<number>(),fingers=new Set<number>()
    let pan:{id:number;x:number;y:number}|undefined
    function down(e:PointerEvent){
      if(e.pointerType==='pen'){
        pens.add(e.pointerId)
        pan=undefined
      }else if(e.pointerType==='touch'){
        fingers.add(e.pointerId)
        if(fingers.size===1&&!pens.size&&!brush.touchInk)
          pan={id:e.pointerId,x:e.clientX,y:e.clientY}
        else pan=undefined
      }
    }
    function move(e:PointerEvent){
      if(!pan||pan.id!==e.pointerId)return
      scroll!.scrollTop+=pan.y-e.clientY
      horizontal!.scrollLeft+=pan.x-e.clientX
      pan={id:e.pointerId,x:e.clientX,y:e.clientY}
    }
    function end(e:PointerEvent){
      pens.delete(e.pointerId)
      fingers.delete(e.pointerId)
      if(pan?.id===e.pointerId)pan=undefined
    }
    el.addEventListener('pointerdown',down,true)
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',end)
    window.addEventListener('pointercancel',end)
    return ()=>{
      el.removeEventListener('pointerdown',down,true)
      window.removeEventListener('pointermove',move)
      window.removeEventListener('pointerup',end)
      window.removeEventListener('pointercancel',end)
    }
  },[sheet,brush.tool,brush.touchInk])
}
