import {Hand,PenLine,Highlighter,Eraser,Undo2,Redo2,Minus,Plus} from 'lucide-react'
import type {Brush,Tool} from './InkSurface'
const tools=[['read','阅读',Hand],['pen','手写笔',PenLine],['marker','荧光笔',Highlighter],['eraser','橡皮擦',Eraser]] as const
export function Toolbar({brush,set,undo,redo,canUndo,canRedo,zoom,changeZoom}:{brush:Brush;set:(b:Brush)=>void;undo:()=>void;redo:()=>void;canUndo:boolean;canRedo:boolean;zoom:number;changeZoom:(n:number)=>void}){
  return <div className="toolbar" aria-label="批注工具">{tools.map(([id,name,Icon])=><button key={id} title={name} aria-label={name} aria-pressed={brush.tool===id} onClick={()=>set({...brush,tool:id as Tool})}><Icon size={17}/>{brush.tool===id&&<span>{name}</span>}</button>)}<i/>
  <input className="color" type="color" title="笔迹颜色" aria-label="笔迹颜色" value={brush.color} onChange={e=>set({...brush,color:e.target.value})}/>
  <select aria-label="笔迹粗细" value={brush.width} onChange={e=>set({...brush,width:+e.target.value})}>{[2,3,5,8].map(x=><option key={x} value={x}>{x} px</option>)}</select><i/>
  <button title="撤销" aria-label="撤销" disabled={!canUndo} onClick={undo}><Undo2 size={16}/></button><button title="重做" aria-label="重做" disabled={!canRedo} onClick={redo}><Redo2 size={16}/></button>
  {brush.tool!=='read'&&<button className="finger-ink" aria-pressed={!!brush.touchInk} title="触控笔被识别为手指时开启，默认用手指翻页" onClick={()=>set({...brush,touchInk:!brush.touchInk})}>手指书写</button>}<div className="zoom"><button aria-label="缩小" disabled={zoom<=1} onClick={()=>changeZoom(Math.max(1,zoom-.25))}><Minus size={14}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="放大" disabled={zoom>=2} onClick={()=>changeZoom(Math.min(2,zoom+.25))}><Plus size={14}/></button></div></div>
}
