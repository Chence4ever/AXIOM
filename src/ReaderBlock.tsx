import {useState} from 'react'
import type {ChapterRow,BlockRow} from './storage'
import type {Ink,Highlight,Snapshot} from './records'
import {defaults,type Values} from './models'
import {models,type Model} from './schema'
import {InkSurface,type Brush} from './InkSurface'
import {BlockView} from './BlockView'
import {ModelView} from './ModelView'
import type {Point} from './geometry'
export type Edit={added:Ink[];removed:Ink[];snapshot?:Snapshot}
type Props={chapter:ChapterRow;row:BlockRow;brush:Brush;ink:Ink[];marks:Highlight[];shots:Snapshot[];edit:(e:Edit)=>Promise<boolean>;saveShot:(s:Snapshot)=>Promise<boolean>;mark:(s:Highlight)=>Promise<boolean>}
export function ReaderBlock({chapter,row,brush,ink,marks,shots,edit,saveShot,mark}:Props){
  const b=row.data,model=b.type==='interactive_model'&&models.some(m=>m===b.model)?b.model as Model:undefined
  const [v,setV]=useState<Values>(()=>model?defaults(model):{}),[active,setActive]=useState<string>()
  const anchor=()=>({id:crypto.randomUUID(),courseId:chapter.courseId,chapterId:chapter.chapterId,blockId:b.id,signature:row.signature,createdAt:Date.now(),updatedAt:Date.now()})
  const makeShot=():Snapshot=>({...anchor(),model:model!,values:{...v},name:'情景 '+(shots.length+1)+' · '+Object.values(v).join(' / ')})
  async function add(points:Point[],tool:'pen'|'marker'){
    const snapshot=model&&!active?makeShot():undefined
    const id=snapshot?.id??active
    const stroke:Ink={...anchor(),points,tool,color:tool==='marker'&&brush.color==='#254d66'?'#ebc340':brush.color,width:brush.width*(tool==='marker'?5:1),opacity:tool==='marker'?.4:1,...(id?{snapshotId:id}:{})}
    if(await edit({added:[stroke],removed:[],snapshot})&&snapshot)setActive(snapshot.id)
  }
  return <InkSurface brush={brush} ink={ink.filter(i=>i.snapshotId===active)} add={add} erase={removed=>{void edit({added:[],removed})}}>
    {model?<ModelView model={model} values={v} active={active} snapshots={shots} change={vals=>{setV(vals);setActive(undefined)}} restore={s=>{setV(s.values);setActive(s.id)}} save={async()=>{const s=makeShot();if(await saveShot(s))setActive(s.id)}}/>:
    <BlockView block={b} marks={marks} mark={(start,end)=>{if('content' in b && typeof b.content==='string')void mark({...anchor(),start,end,quote:b.content.slice(start,end)})}}/>}
  </InkSurface>
}
