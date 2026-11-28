import {useState,useRef,useLayoutEffect,useEffect} from 'react'
import {Bookmark,Check,BookOpen,Layers} from 'lucide-react'
import {db,updateProgress,type ChapterRow} from './storage'
import {useQuery} from './useQuery'
import {useWritingGestures} from './useWritingGestures'
import {ReaderBlock,type Edit} from './ReaderBlock'
import {Toolbar} from './Toolbar'
import type {Brush} from './InkSurface'
export type Write=(op:()=>Promise<unknown>)=>Promise<boolean>
export const chapterNumber=(c:ChapterRow)=>String(c.number??c.order+1).padStart(2,'0')
function ScaledPage({children,zoom,brush}:{children:React.ReactNode;zoom:number;brush:Brush}){
  const wrap=useRef<HTMLDivElement>(null),sheet=useRef<HTMLDivElement>(null)
  const [size,setSize]=useState({width:780,height:1000})
  useLayoutEffect(()=>{const observer=new ResizeObserver(()=>{setSize({width:wrap.current!.clientWidth,height:sheet.current!.offsetHeight})});observer.observe(wrap.current!);observer.observe(sheet.current!);return()=>observer.disconnect()},[])
  useWritingGestures(sheet,brush)
  const scale=size.width/780*zoom
  return <div className="viewport" ref={wrap}><div style={{width:780*scale,height:size.height*scale}}><div ref={sheet} className="logical-sheet" data-writing={brush.tool!=='read'} style={{transform:'scale('+scale+')'}}>{children}</div></div></div>
}
export function Reader({chapter,write,fail}:{chapter:ChapterRow;write:Write;fail:(err:unknown)=>void}){
  const [brush,setBrush]=useState<Brush>({tool:'read',color:'#254d66',width:3}),[zoom,setZoom]=useState(1)
  const [undo,setUndo]=useState<Edit[]>([]),[redo,setRedo]=useState<Edit[]>([])
  const blocks=useQuery(()=>db.contentBlocks.where('chapterKey').equals(chapter.key).sortBy('order'),[chapter.key],fail)
  const data=useQuery(async()=>{
    const scope=[chapter.courseId,chapter.chapterId]
    const [ink,marks,shots,progress]=await Promise.all([db.annotations.where('[courseId+chapterId]').equals(scope).toArray(),db.textHighlights.where('[courseId+chapterId]').equals(scope).toArray(),db.modelSnapshots.where('[courseId+chapterId]').equals(scope).sortBy('createdAt'),db.readingProgress.get(chapter.key)])
    return {ink,marks,shots,progress}
  },[chapter.key],fail)
  const scrollRef=useRef<HTMLDivElement>(null),restored=useRef(false)
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),pending=useRef<number|null>(null)
  function flush(){clearTimeout(timer.current);if(pending.current!==null){const v=pending.current;pending.current=null;void write(()=>updateProgress(chapter,{scroll:v}))}}
  useEffect(()=>{window.addEventListener('pagehide',flush);return()=>{window.removeEventListener('pagehide',flush);flush()}},[chapter.key])
  useLayoutEffect(()=>{if(data&&blocks&&!restored.current){const frame=requestAnimationFrame(()=>{if(scrollRef.current)scrollRef.current.scrollTop=data.progress?.scroll??0;restored.current=true});return()=>cancelAnimationFrame(frame)}},[!!data,!!blocks])
  const transact=(e:Edit,inverse=false)=>write(()=>db.transaction('rw',[db.annotations,db.modelSnapshots],async()=>{
    const put=inverse?e.removed:e.added,remove=inverse?e.added:e.removed
    if(!inverse&&e.snapshot)await db.modelSnapshots.put(e.snapshot)
    await db.annotations.bulkPut(put);await db.annotations.bulkDelete(remove.map(i=>i.id))
  }))
  async function edit(e:Edit){const ok=await transact(e);if(ok){setUndo(h=>[...h,e]);setRedo([])}return ok}
  const busy=useRef(false)
  async function history(back:boolean){const e=(back?undo:redo).at(-1);if(!e||busy.current)return;busy.current=true
    try{if(await transact(e,back)){(back?setUndo:setRedo)(h=>h.slice(0,-1));(back?setRedo:setUndo)(h=>[...h,e])}}finally{busy.current=false}}
  if(!data||!blocks)return <p className="loading">正在打开章节…</p>
  const {ink,marks,shots,progress}=data
  const headings=blocks.filter(r=>r.data.type==='heading'&&r.data.level===2)
  const orphan=[...ink,...marks,...shots].filter(a=>!blocks.some(b=>b.data.id===a.blockId&&b.signature===a.signature))
  return <div className="reading-scroll" ref={scrollRef} onScroll={e=>{if(restored.current){pending.current=e.currentTarget.scrollTop;clearTimeout(timer.current);timer.current=setTimeout(flush,180)}}}>
  <article className="reader"><div className="chapter-head">
  <div className="chapter-label"><span/>CHAPTER {chapterNumber(chapter)}</div>
  <div className="title-row"><h1>{chapter.chapterTitle}</h1><button aria-label="收藏章节" aria-pressed={!!progress?.bookmark} title="收藏章节" onClick={()=>write(()=>updateProgress(chapter,{bookmark:!progress?.bookmark}))}><Bookmark size={19} fill={progress?.bookmark?'currentColor':'none'}/></button></div>
  <p className="subtitle">{chapter.subtitle}</p><div className="chapter-meta"><span><BookOpen size={14}/>{chapter.courseTitle}</span><span><Layers size={14}/>{blocks.filter(b=>b.data.type==='interactive_model').length} 个交互模型</span></div></div>
  {headings.length>3&&<label className="chapter-jump">本章目录 <select aria-label="跳转到小节" defaultValue="" onChange={e=>{document.getElementById('anchor-'+e.target.value)?.scrollIntoView({block:'start'});e.target.value=''}}><option value="">选择小节</option>{headings.map(h=><option key={h.key} value={h.data.id}>{String('content' in h.data?h.data.content:'')}</option>)}</select></label>}
  <Toolbar brush={brush} set={setBrush} zoom={zoom} changeZoom={setZoom} canUndo={!!undo.length} canRedo={!!redo.length} undo={()=>history(true)} redo={()=>history(false)}/>
  {orphan.length>0&&<details className="notice"><summary>{orphan.length} 条批注或情景需要复核</summary>{orphan.map(a=><p key={a.id}>{a.blockId} · {'quote' in a?a.quote:'name' in a?a.name:'旧版笔迹'} · {new Date(a.createdAt).toLocaleDateString()}</p>)}<p>原记录保留在备份中。</p></details>}
  <ScaledPage zoom={zoom} brush={brush}>{blocks.map(row=><ReaderBlock key={row.key+row.signature} row={row} chapter={chapter} brush={brush} edit={edit} ink={ink.filter(i=>i.blockId===row.data.id&&i.signature===row.signature)} marks={marks.filter(i=>i.blockId===row.data.id&&i.signature===row.signature)} shots={shots.filter(i=>i.blockId===row.data.id&&i.signature===row.signature)} saveShot={s=>write(()=>db.modelSnapshots.put(s))} mark={s=>write(()=>db.textHighlights.put(s))}/>)}</ScaledPage>
  <button className="complete" onClick={()=>write(()=>updateProgress(chapter,{completed:!progress?.completed}))}><Check size={18}/>{progress?.completed?'已学完本章':'标记本章已学完'}</button>
  </article></div>
}
