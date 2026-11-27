import Dexie,{type Table} from 'dexie'
import {chapterKey,blockKey,parseChapter,fingerprint,type Block,type Chapter} from './schema'
import {backupSchema,type Backup,type Course,type Ink,type Highlight,type Snapshot,type Progress} from './records'

export type ChapterRow=Omit<Chapter,'blocks'>&{key:string;order:number}
export type BlockRow={key:string;chapterKey:string;order:number;signature:string;data:Block}
type Setting={key:'lastChapter'|'theme';value:string}
export class Library extends Dexie {
  courses!:Table<Course,string>
  chapters!:Table<ChapterRow,string>
  contentBlocks!:Table<BlockRow,string>
  annotations!:Table<Ink,string>
  textHighlights!:Table<Highlight,string>
  modelSnapshots!:Table<Snapshot,string>
  readingProgress!:Table<Progress,string>
  userSettings!:Table<Setting,string>
  constructor(name='axiom-library'){
    super(name)
    this.version(1).stores({courses:'id',chapters:'key,courseId',contentBlocks:'key,chapterKey',annotations:'id,[courseId+chapterId]',textHighlights:'id,[courseId+chapterId]',modelSnapshots:'id,[courseId+chapterId]',readingProgress:'key,courseId',userSettings:'key'})
  }
}
export const db=new Library()
async function prepare(doc:Chapter){
  const {blocks,...meta}=doc
  const key=chapterKey(doc.courseId,doc.chapterId)
  return {meta:{...meta,key},blocks:await Promise.all(blocks.map(async(data,order)=>({key:blockKey(doc.courseId,doc.chapterId,data.id),chapterKey:key,order,signature:await fingerprint(data),data})))}
}
async function putChapter(storage:Library,p:Awaited<ReturnType<typeof prepare>>,order:number){
  await storage.chapters.put({...p.meta,order})
  await storage.contentBlocks.where('chapterKey').equals(p.meta.key).delete()
  await storage.contentBlocks.bulkAdd(p.blocks)
}
export class Conflict extends Error {}
export async function importChapter(raw:unknown,replace=false,storage=db){
  const doc=parseChapter(raw), p=await prepare(doc)
  await storage.transaction('rw',[storage.courses,storage.chapters,storage.contentBlocks],async()=>{
    const old=await storage.chapters.get(p.meta.key)
    if(old&&!replace)throw new Conflict('同一章节已存在。更新教材并保留已有批注？')
    if(!await storage.courses.get(doc.courseId))await storage.courses.add({id:doc.courseId,title:doc.courseTitle})
    await putChapter(storage,p,old?.order??await storage.chapters.where('courseId').equals(doc.courseId).count())
  })
  return p.meta.key
}
export async function seed(docs:unknown[],storage=db){
  const parsed=await Promise.all(docs.map(async d=>prepare(parseChapter(d))))
  await storage.transaction('rw',[storage.courses,storage.chapters,storage.contentBlocks],async()=>{
    if(await storage.courses.count())return
    for(const [order,p] of parsed.entries()){
      await storage.courses.put({id:p.meta.courseId,title:p.meta.courseTitle})
      await putChapter(storage,p,order)
    }
  })
}
export async function exportBackup(courseId?:string,storage=db):Promise<Backup>{
  return storage.transaction('r',storage.tables,async()=>{
    const rows=(await storage.chapters.toArray()).filter(c=>!courseId||c.courseId===courseId).sort((a,b)=>a.order-b.order)
    const chapters=await Promise.all(rows.map(async meta=>parseChapter({...meta,blocks:(await storage.contentBlocks.where('chapterKey').equals(meta.key).sortBy('order')).map(r=>r.data)})))
    const subset=<T extends {courseId:string}>(items:T[])=>items.filter(r=>!courseId||r.courseId===courseId)
    return {format:'axiom-backup',version:1,courses:(await storage.courses.toArray()).filter(c=>!courseId||c.id===courseId),chapters,annotations:subset(await storage.annotations.toArray()),textHighlights:subset(await storage.textHighlights.toArray()),modelSnapshots:subset(await storage.modelSnapshots.toArray()),readingProgress:subset(await storage.readingProgress.toArray()),settings:courseId?[]:await storage.userSettings.toArray()}
  })
}
function unique(ids:string[]){if(new Set(ids).size!==ids.length)throw new Error('备份包含重复 ID')}
export async function restoreBackup(raw:unknown,confirmed=false,storage=db){
  const b=backupSchema.parse(raw), courseIds=b.courses.map(c=>c.id), keys=b.chapters.map(c=>chapterKey(c.courseId,c.chapterId))
  unique(courseIds);unique(keys);unique(b.settings.map(s=>s.key))
  const snapshots=new Map(b.modelSnapshots.map(s=>[s.id,s]))
  for(const c of b.chapters)if(!courseIds.includes(c.courseId))throw new Error('缺少章节所属课程')
  for(const rows of [b.annotations,b.textHighlights,b.modelSnapshots,b.readingProgress]){
    unique(rows.map(r=>'id' in r?r.id:r.key))
    for(const row of rows)if(!keys.includes(chapterKey(row.courseId,row.chapterId)))throw new Error('备份缺少记录所属章节')
  }
  for(const p of b.readingProgress)if(p.key!==chapterKey(p.courseId,p.chapterId))throw new Error('阅读进度索引无效')
  for(const a of b.annotations)if(a.snapshotId){
    const s=snapshots.get(a.snapshotId)
    if(!s||s.courseId!==a.courseId||s.chapterId!==a.chapterId||s.blockId!==a.blockId||s.signature!==a.signature)throw new Error('情景批注缺少匹配快照')
  }
  const prepared=await Promise.all(b.chapters.map(prepare))
  await storage.transaction('rw',storage.tables,async()=>{
    const rows=[ [storage.annotations,b.annotations],[storage.modelSnapshots,b.modelSnapshots],[storage.textHighlights,b.textHighlights] ] as const
    for(const [table,items] of rows)for(const item of items){
      const old=await table.get(item.id)
      if(old&&(old.courseId!==item.courseId||old.chapterId!==item.chapterId||old.blockId!==item.blockId))throw new Error('批注或快照 ID 与其他内容冲突')
    }
    if(!confirmed&&(await storage.courses.bulkGet(courseIds)).some(Boolean))throw new Conflict('备份包含已有课程。合并备份并以备份版本更新同 ID 记录？')
    await storage.courses.bulkPut(b.courses)
    for(const [order,p] of prepared.entries())await putChapter(storage,p,order)
    await storage.annotations.bulkPut(b.annotations);await storage.textHighlights.bulkPut(b.textHighlights)
    await storage.modelSnapshots.bulkPut(b.modelSnapshots);await storage.readingProgress.bulkPut(b.readingProgress);await storage.userSettings.bulkPut(b.settings)
  })
}
export function updateProgress(chapter:ChapterRow,patch:Partial<Pick<Progress,'scroll'|'completed'|'bookmark'>>){
  return db.transaction('rw',db.readingProgress,async()=>{
    const old=await db.readingProgress.get(chapter.key)
    await db.readingProgress.put({scroll:0,completed:false,bookmark:false,...old,key:chapter.key,courseId:chapter.courseId,chapterId:chapter.chapterId,...patch,updatedAt:Date.now()})
  })
}
