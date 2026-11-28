import {memo} from 'react'
import Markdown from 'react-markdown'
import katex from 'katex'

export const MathText=memo(function MathText({latex,display=false}:{latex:string;display?:boolean}){
  const html=katex.renderToString(latex,{displayMode:display,throwOnError:false,trust:false,maxSize:25,maxExpand:300,strict:'ignore'})
  return <span dangerouslySetInnerHTML={{__html:html}}/>
})

// Preserve LaTeX escapes while Markdown parses the surrounding emphasis and lists.
export const RichText=memo(function RichText({text,compact=false}:{text:string;compact?:boolean}){
  const formulas:string[]=[]
  const token='axiom-inline-math-'
  const input=text.replace(/\\\(([\s\S]*?)\\\)/g,(_,latex:string)=>{
    formulas.push(latex)
    return '`'+token+formulas.length+'`'
  })
  return <Markdown skipHtml components={{
    img:()=>null,a:({children})=><span>{children}</span>,
    p:({children})=>compact?<span>{children}</span>:<p>{children}</p>,
    code:({children})=>{
      const match=/^axiom-inline-math-(\d+)$/.exec(String(children))
      const latex=match&&formulas[Number(match[1])-1]
      return latex?<MathText latex={latex}/>:<code>{children}</code>
    }
  }}>{input}</Markdown>
})
