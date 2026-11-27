import {useState} from 'react'
import {BookOpen,Bookmark,Plus,ArrowUp,ArrowDown,Download,Search} from 'lucide-react'
import {db,type ChapterRow} from './storage'
import type {Course,Progress,Ink} from './records'
import {chapterNumber,type Write} from './Reader'
export type Page='reader'|'library'|'bookmarks'|'search'
type Props={page:Page;courses:Course[];chapters:ChapterRow[];progress:Progress[];recent:Ink[];open:(key:string)=>void;write:Write;backup:(id:string)=>void}
export function LibraryView({page,courses,chapters,progress,recent,open,write,backup}:Props){
  const [term,setTerm]=useState(''),[adding,setAdding]=useState(false),[title,setTitle]=useState('')
  const [hits,setHits]=useState<string[]>([])
  const [searchId]=useState(()=>({n:0}))
  async function search(q:string){setTerm(q);const request=++searchId.n
    const blocks=await db.contentBlocks.toArray();if(request===searchId.n)setHits(blocks.filter(b=>JSON.stringify(b.data).toLowerCase().includes(q.trim().toLowerCase())).map(b=>b.chapterKey))}
  const last=[...progress].sort((a,b)=>b.updatedAt-a.updatedAt)[0]
  async function move(c:ChapterRow,d:number){
    await write(()=>db.transaction('rw',db.chapters,async()=>{const group=await db.chapters.where('courseId').equals(c.courseId).sortBy('order'),index=group.findIndex(i=>i.key===c.key),next=group[index+d]
      if(!next)return;[group[index],group[index+d]]=[next,group[index]]
      await db.chapters.bulkPut(group.map((ch,order)=>({...ch,order})))
    }))
  }
  return <div className="library reading-scroll"><div className="library-inner"><div className="chapter-label"><span/>{page==='search'?'SEARCH':page==='bookmarks'?'BOOKMARKS':'LIBRARY'}</div><h1>{page==='search'?'搜索教材':page==='bookmarks'?'我的书签':'学习工作台'}</h1>
  {page==='search'&&<label className="search"><Search size={18}/><input autoFocus value={term} placeholder="搜索课程、章节或正文" onChange={e=>search(e.target.value)}/></label>}
  {page==='library'&&<><div className="library-tools"><button onClick={()=>setAdding(!adding)}><Plus size={16}/> 创建课程</button></div>{adding&&<form onSubmit={async e=>{e.preventDefault();if(!title.trim())return;if(await write(()=>db.courses.add({id:crypto.randomUUID(),title:title.trim()}))){setTitle('');setAdding(false)}}}><input autoFocus required placeholder="课程名称" value={title} onChange={e=>setTitle(e.target.value)}/><button>创建</button></form>}
  {last&&chapters.some(c=>c.key===last.key)&&<button className="recent" onClick={()=>open(last.key)}><BookOpen size={19}/> 继续阅读 · {chapters.find(c=>c.key===last.key)?.chapterTitle}</button>}</>}
  {courses.map(course=>{
    const all=chapters.filter(c=>c.courseId===course.id).sort((a,b)=>a.order-b.order)
    const list=all.filter(c=>page==='bookmarks'?progress.some(p=>p.key===c.key&&p.bookmark):page==='search'?(!term||hits.includes(c.key)||(course.title+c.chapterTitle).includes(term)):true)
    if(!list.length&&page!=='library')return null
    return <section className="course-card" key={course.id}><header><BookOpen size={19}/><h2>{course.title}</h2><small>{progress.filter(p=>p.courseId===course.id&&p.completed).length} / {all.length} 章已学完</small>{page==='library'&&<button title="导出课程" aria-label={'导出'+course.title} onClick={()=>backup(course.id)}><Download size={16}/></button>}</header>
    {!all.length&&<p>导入教材时使用课程 ID <code>{course.id}</code>。</p>}
    {list.map((c,i)=><div className="course-line" key={c.key}><button onClick={()=>open(c.key)}><span>{chapterNumber(c)}</span>{c.chapterTitle}</button>{page==='library'&&<><button title="上移" disabled={i===0} onClick={()=>move(c,-1)}><ArrowUp size={14}/></button><button title="下移" disabled={i===list.length-1} onClick={()=>move(c,1)}><ArrowDown size={14}/></button></>}</div>)}</section>
  })}
  {page==='bookmarks'&&!progress.some(p=>p.bookmark)&&<p className="empty"><Bookmark/> 点击章节标题旁的书签，即可在这里重读。</p>}
  {page==='search'&&term&&!chapters.some(c=>hits.includes(c.key)||(c.courseTitle+c.chapterTitle).includes(term))&&<p>没有匹配的章节。</p>}
  {page==='library'&&recent.length>0&&<section className="course-card"><h2>最近批注</h2>{recent.map(a=><button className="recent" key={a.id} onClick={()=>open(a.courseId+'/'+a.chapterId)}>{chapters.find(c=>c.key===a.courseId+'/'+a.chapterId)?.chapterTitle} · {a.tool==='pen'?'手写笔':'荧光笔'} · {new Date(a.createdAt).toLocaleDateString()}</button>)}</section>}</div></div>
}
