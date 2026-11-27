import {useEffect,useRef,useState} from 'react'
import {BookOpen,LibraryBig,Bookmark,Search,Upload,DatabaseBackup,PanelLeftClose,PanelLeftOpen,ChevronDown,ChevronRight,Check,HardDrive,Sun,Moon,Maximize2,Minimize2,X,Download,FolderOpen,TriangleAlert} from 'lucide-react'
import {ZodError} from 'zod'
import {db,seed,importChapter,restoreBackup,exportBackup,Conflict} from './storage'
import {useQuery} from './useQuery'
import {Reader,chapterNumber,type Write} from './Reader'
import {LibraryView,type Page} from './LibraryView'
function message(err:unknown){return err instanceof ZodError?'文件校验失败 · '+err.issues.slice(0,2).map(i=>i.path.join('.')+' '+i.message).join('；'):err instanceof Error?err.message:String(err)}
function download(data:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
export default function App(){
  const [page,setPage]=useState<Page>('reader'),[key,setKey]=useState(''),[ready,setReady]=useState(false),[fatal,setFatal]=useState('')
  const [saving,setSaving]=useState(0),[writeError,setWriteError]=useState(''),[info,setInfo]=useState(''),[modal,setModal]=useState<'import'|'backup'|null>(null)
  const [side,setSide]=useState(()=>window.innerWidth>820),[focus,setFocus]=useState(false),[folded,setFolded]=useState<string[]>([])
  const input=useRef<HTMLInputElement>(null),op=useRef<'import'|'backup'>('import')
  const fail=(e:unknown)=>setWriteError(message(e))
  const write:Write=async fn=>{setSaving(n=>n+1);try{await fn();return true}catch(e){fail(e);return false}finally{setSaving(n=>n-1)}}
  useEffect(()=>{(async()=>{
    if(!await db.courses.count()){
      const docs=await Promise.all(['capm','portfolio'].map(async name=>{const r=await fetch('./examples/'+name+'.json');if(!r.ok)throw Error('示例教材读取失败');return r.json()}))
      await seed(docs)
    }
    const last=await db.userSettings.get('lastChapter');const first=(await db.chapters.toArray()).sort((a,b)=>a.order-b.order)[0]
    setKey(last?.value&&await db.chapters.get(last.value)?last.value:first?.key??'');setReady(true)
  })().catch(e=>setFatal(message(e)))},[])
  const state=useQuery(async()=>({courses:await db.courses.toArray(),chapters:(await db.chapters.toArray()).sort((a,b)=>a.order-b.order),progress:await db.readingProgress.toArray(),theme:(await db.userSettings.get('theme'))?.value??'light'}),[],fail)
  const recent=useQuery(()=>page==='library'?db.annotations.toArray().then(a=>a.sort((a,b)=>b.createdAt-a.createdAt).slice(0,5)):Promise.resolve([]),[page],fail)
  useEffect(()=>{if(!info)return;const t=setTimeout(()=>setInfo(''),4500);return()=>clearTimeout(t)},[info])
  useEffect(()=>{function escape(e:KeyboardEvent){if(e.key==='Escape'){setModal(null);setFocus(false);if(window.innerWidth<=820)setSide(false)}}window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[])
  function go(p:Page){setPage(p);if(window.innerWidth<=820)setSide(false)}
  function open(k:string){setKey(k);go('reader');void write(()=>db.userSettings.put({key:'lastChapter',value:k}))}
  function pick(kind:'import'|'backup'){op.current=kind;input.current?.click()}
  async function read(file:File){try{
    if(file.size>64*1024*1024)throw Error('文件超过单次导入上限 64 MiB')
    const raw=JSON.parse(await file.text())
    if(op.current==='backup'&&raw?.format!=='axiom-backup')throw Error('请选择 Axiom 备份文件')
    const restore=raw?.format==='axiom-backup'
    const apply=async(force:boolean)=>{if(restore){await restoreBackup(raw,force);go('library')}else open(await importChapter(raw,force))}
    setSaving(n=>n+1)
    try{try{await apply(false)}catch(e){if(!(e instanceof Conflict))throw e;if(!window.confirm(e.message))return;await apply(true)}}finally{setSaving(n=>n-1)}
    setModal(null);setInfo(restore?'已恢复备份':'教材已导入')
  }catch(e){setInfo(message(e))}}
  async function backup(id?:string){try{download(await exportBackup(id),'axiom-'+(id??'全部')+'-'+new Date().toISOString().slice(0,10)+'.json');setInfo('备份文件已生成')}catch(e){fail(e)}}
  if(fatal)return <main className="fatal"><h1>学习工作台打开失败</h1><p>{fatal}</p><button onClick={()=>location.reload()}>重试</button></main>
  if(!ready||!state)return <main className="loading">正在打开本地教材库…</main>
  const chapter=state.chapters.find(c=>c.key===key),reader=page==='reader'&&chapter
  const navs=[['library','学习工作台',LibraryBig],['bookmarks','我的书签',Bookmark],['search','搜索教材',Search]] as const
  return <div className={'app '+(state.theme==='dark'?'dark ':'')+(focus?'focus ':'')+(side?'with-side':'')}>
  {side&&!focus&&<><button className="side-shade" aria-label="关闭目录" onClick={()=>setSide(false)}/><aside className="sidebar"><header><div className="brand-mark">Λ</div><strong>Axiom<span>.</span></strong><button aria-label="收起目录" title="收起目录" onClick={()=>setSide(false)}><PanelLeftClose size={17}/></button></header>
  <div className="side-section"><h3>学习空间</h3>{navs.map(([p,t,Icon])=><button className={'nav '+(page===p?'selected':'')} key={p} onClick={()=>go(p)}><Icon size={17}/>{t}</button>)}</div>
  <div className="side-section catalog"><h3>我的课程 <small>{state.courses.length}</small></h3>{state.courses.map(c=><div key={c.id}><button className="course-toggle" onClick={()=>setFolded(x=>x.includes(c.id)?x.filter(y=>y!==c.id):[...x,c.id])}><BookOpen size={18}/>{c.title}{folded.includes(c.id)?<ChevronRight size={15}/>:<ChevronDown size={15}/>}</button>{!folded.includes(c.id)&&state.chapters.filter(h=>h.courseId===c.id).map(h=><button className={'chapter-nav '+(reader&&h.key===key?'active':'')} key={h.key} onClick={()=>open(h.key)}><small>{chapterNumber(h)}</small>{h.chapterTitle}</button>)}</div>)}</div>
  <footer className="side-section"><button className="nav" onClick={()=>setModal('import')}><Upload size={17}/>导入教材</button><button className="nav" onClick={()=>setModal('backup')}><DatabaseBackup size={17}/>备份与恢复</button><div className="local"><HardDrive size={15}/>本地工作空间</div></footer></aside></>}
  <main className="main"><header className="topbar">{(!side||focus)&&<button aria-label="打开目录" onClick={()=>{setFocus(false);setSide(true)}}><PanelLeftOpen size={18}/></button>}
  <div className="crumb"><BookOpen size={15}/><span>我的课程</span>{reader&&<><ChevronRight size={13}/><span>{chapter.courseTitle}</span><ChevronRight size={13}/><b>第 {chapterNumber(chapter)} 章</b></>}</div>
  <div className="save" role="status">{writeError?<TriangleAlert size={14}/>:<Check size={14}/>} {writeError?'保存失败':saving?'保存中…':'本地已保存'}</div>
  <button aria-label="切换阅读主题" title="切换阅读主题" onClick={()=>write(()=>db.userSettings.put({key:'theme',value:state.theme==='dark'?'light':'dark'}))}>{state.theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button>
  <button title="专注阅读" aria-label="专注阅读" onClick={()=>setFocus(!focus)}>{focus?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button></header>
  {writeError&&<div className="error" role="alert">保存失败，请重新执行上一次操作。{writeError}<button onClick={()=>setWriteError('')} aria-label="关闭错误"><X size={15}/></button></div>}
  {reader?<Reader key={chapter.key} chapter={chapter} write={write} fail={fail}/>:<LibraryView page={page==='reader'?'library':page} {...state} recent={recent??[]} open={open} write={write} backup={backup}/>}</main>
  {info&&<div role="status" className="toast">{info}</div>}
  <input type="file" accept=".json,application/json" ref={input} hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void read(file)}}/>
  {modal&&<div className="overlay" onClick={()=>setModal(null)}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogtitle" onClick={e=>e.stopPropagation()}><button className="close" aria-label="关闭" onClick={()=>setModal(null)}><X size={18}/></button><div className="model-icon">{modal==='import'?<Upload/>:<DatabaseBackup/>}</div><h2 id="dialogtitle">{modal==='import'?'导入教材':'备份与恢复'}</h2>
  {modal==='import'?<><p>选择符合 Axiom 1.0 规范的章节 JSON。课程与章节会按 ID 归档。</p><button className="primary" onClick={()=>pick('import')}><FolderOpen size={17}/>选择教材文件</button><a href="./examples/capm.json" download>下载示例教材</a></>:<><p>教材和笔迹保存在此浏览器。清理网站数据或更换设备前，请将独立备份保存到文件中。</p><button className="primary" onClick={()=>backup()}><Download size={17}/>导出完整备份</button><button onClick={()=>pick('backup')}><FolderOpen size={17}/>从备份恢复</button></>}</section></div>}</div>
}
