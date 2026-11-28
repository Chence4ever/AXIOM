import {useEffect,useState,type ReactNode} from 'react'
import {RichText,MathText} from './RichText'
import {Lightbulb,Highlighter} from 'lucide-react'
import {blockTypes,type KnownBlock,type Block} from './schema'
import type {Highlight} from './records'
type Renderers={ [T in KnownBlock['type']]:(block:Extract<KnownBlock,{type:T}>)=>ReactNode }
const renderers:Renderers={
  heading:b=>{const H=b.level===4?'h4':b.level===3?'h3':'h2';return <H>{b.content}</H>},paragraph:b=><p>{b.content}</p>,
  markdown:b=><RichText text={b.content}/>,
  equation:b=><div className="equation"><MathText latex={b.latex} display/></div>,
  callout:b=><aside className="callout"><Lightbulb size={18}/><p>{b.content}</p></aside>,
  derivation:b=><ol>{b.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>,
  question:b=><section className="question"><small>练习题</small><p>{b.content}</p></section>,
  answer:b=><details><summary>查看参考答案</summary><p>{b.content}</p></details>,
  image:b=><img className="figure" src={b.src} alt={b.alt} width={b.width} height={b.height}/>,
  table:b=><table><thead><tr>{b.headers.map((c,i)=><th key={i}><RichText text={c} compact/></th>)}</tr></thead><tbody>{b.rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}><RichText text={c} compact/></td>)}</tr>)}</tbody></table>,
  blank_space:b=><div className="blank" style={{height:b.height}}><small>演算区</small></div>,
  interactive_model:()=>null
}
function TextParagraph({text,marks,mark}:{text:string;marks:Highlight[];mark:(start:number,end:number)=>void}){
  const [selected,setSelected]=useState<[number,number]|null>(null)
  useEffect(()=>{const update=()=>{if(window.getSelection()?.isCollapsed)setSelected(null)};document.addEventListener('selectionchange',update);return()=>document.removeEventListener('selectionchange',update)},[])
  const bounds=[...new Set([0,text.length,...marks.flatMap(m=>[m.start,m.end])])].sort((a,b)=>a-b)
  return <div className="paragraph"><p onPointerUp={e=>{
    const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return
    const range=sel.getRangeAt(0)
    if(!e.currentTarget.contains(range.commonAncestorContainer))return
    const prefix=range.cloneRange();prefix.selectNodeContents(e.currentTarget);prefix.setEnd(range.startContainer,range.startOffset)
    const start=prefix.toString().length;setSelected([start,start+range.toString().length])
  }}>{bounds.slice(1).map((b,i)=>marks.some(m=>m.start<=bounds[i]&&m.end>=b)?<mark key={b}>{text.slice(bounds[i],b)}</mark>:<span key={b}>{text.slice(bounds[i],b)}</span>)}</p>
  {selected&&<button className="mark-action" onPointerDown={e=>e.preventDefault()} onClick={()=>{mark(...selected);setSelected(null);window.getSelection()?.removeAllRanges()}}><Highlighter size={14}/> 高亮选文</button>}</div>
}
export function BlockView({block,marks,mark}:{block:Block;marks:Highlight[];mark:(start:number,end:number)=>void}){
  if(!blockTypes.some(t=>t===block.type))return <p className="callout">此版本暂不支持组件「{block.type}」。原始内容已保留。</p>
  const b=block as KnownBlock
  if(b.type==='paragraph')return <TextParagraph text={b.content} marks={marks} mark={mark}/>
  return renderers[b.type](b as never)
}
