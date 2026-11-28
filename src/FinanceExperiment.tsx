import {Activity,Camera,RotateCcw} from 'lucide-react'
import {capm,controls,defaults,type Values} from './models'
import type {ModelProps} from './ModelView'
import type {Model} from './schema'
type Metric=[label:string,value:number,unit:string]
type Pair=[number,number]
type Chart={x:string;y:string;points:Pair[];selected?:Pair}
type Calculation={title:string;metrics:Metric[];formula:string;chart?:Chart}
const fmt=(n:number)=>Number(n.toFixed(2)).toString()
export function calculate(model:Model,v:Values,c:Values):Calculation{
  const rf=c.rf??2,premium=c.premium??5,sigma=c.marketVol??15
  const required=capm(rf,premium,v.beta)
  switch(model){
    case 'risk_pricing':
    case 'pricing_gap':{
      const gap=model==='pricing_gap'
      const metrics:Metric[]=[['必要收益率',required,'%']]
      if(gap)metrics.push(['预测 α',v.forecast-required,'%'])
      return {title:gap?'证券市场线与错误定价':'β 与必要收益率',metrics,
        formula:gap?'α = '+fmt(v.forecast)+'% − '+fmt(required)+'%':'E(r) = '+fmt(rf)+'% + '+fmt(v.beta)+' × '+fmt(premium)+'%',
        chart:{x:'市场风险暴露 β',y:'收益率（%）',points:[[-2,rf-2*premium],[3,rf+3*premium]],selected:[v.beta,gap?v.forecast:required]}}
    }
    case 'market_beta':return {title:'β 与相关性、波动率',metrics:[['资产 β',v.rho*v.vol/sigma,'']],formula:'β = '+fmt(v.rho)+' × '+fmt(v.vol)+'% / '+fmt(sigma)+'%'}
    case 'market_allocation':return {title:'风险组合与个人配置',metrics:[['期望收益',rf+v.weight*premium,'%'],['标准差',v.weight*sigma,'%'],['组合 β',v.weight,'']],formula:'E(r) = '+fmt(rf)+'% + '+fmt(v.weight)+' × '+fmt(premium)+'%'}
    case 'two_asset_curve':{
      const points:Pair[]=Array.from({length:101},(_,i)=>{const w=i/100,a=w*(c.volA??15),b=(1-w)*(c.volB??8)
        return [Math.sqrt(Math.max(0,a*a+b*b+2*v.rho*a*b)),w*(c.retA??10)+(1-w)*(c.retB??5)]})
      return {title:'双资产投资机会集',metrics:[['相关系数',v.rho,'']],formula:'资产 A 权重从 0% 变化至 100%',chart:{x:'组合标准差（%）',y:'组合收益率（%）',points}}
    }
    case 'discounted_project':{
      const cost=c.cost??100,npv=v.cash/(1+required/100)-cost,irr=(v.cash/cost-1)*100
      return {title:'项目资本预算',metrics:[['必要收益率',required,'%'],['IRR',irr,'%'],['净现值',npv,'万元']],
        formula:'NPV = '+fmt(v.cash)+' / (1 + '+fmt(required)+'%) − '+fmt(cost)+' = '+fmt(npv)+' 万元 · '+(Math.abs(npv)<1e-8?'盈亏平衡':npv>0?'接受项目':'拒绝项目')}
    }
    default:throw Error('未知模型')
  }
}
function Plot({chart}:{chart:Chart}){
  const pts=chart.selected?[...chart.points,chart.selected]:chart.points
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1])
  const xmin=Math.min(0,...xs),xmax=Math.max(1,...xs),ymin=Math.min(0,...ys),ymax=Math.max(1,...ys)
  const x=(v:number)=>48+350*(v-xmin)/(xmax-xmin),y=(v:number)=>170-134*(v-ymin)/(ymax-ymin)
  return <div className="plot"><div className="plot-caption">{chart.y}</div><svg viewBox="0 0 418 204" role="img" aria-label={chart.y+'与'+chart.x}>
    {[0,1,2,3,4].map(i=>{const a=xmin+(xmax-xmin)*i/4,b=ymin+(ymax-ymin)*i/4;return <g key={i}><path className="gridline" d={'M48 '+y(b)+'H398 M'+x(a)+' 36V170'}/><text x={41} y={y(b)+4} textAnchor="end">{fmt(b)}</text><text x={x(a)} y={191} textAnchor="middle">{fmt(a)}</text></g>})}
    <polyline fill="none" stroke="#25867f" strokeWidth="2.6" points={chart.points.map(p=>x(p[0])+','+y(p[1])).join(' ')}/>
    {chart.selected&&<circle cx={x(chart.selected[0])} cy={y(chart.selected[1])} r={5} fill="#b25b35"/>}</svg><div className="plot-bottom">{chart.x}</div></div>
}
export function FinanceExperiment({model,setup,values,snapshots,active,change,save,restore}:ModelProps){
  const result=calculate(model,values,setup?.constants??{})
  return <section className="model"><header className="model-title"><div className="model-icon"><Activity size={20}/></div><div><small>交互模型</small><h2>{result.title}</h2></div><button onClick={()=>change(defaults(model,setup))}><RotateCcw size={14}/>重置</button></header>
    <div className="experiment">{result.chart?<Plot chart={result.chart}/>:<div className="metrics">{result.metrics.map(([label,value,unit])=><div className="result" key={label}><span>{label}</span><strong>{fmt(value)}<small>{unit}</small></strong></div>)}</div>}
    <div className="controls">{controls(model,setup).map(p=><label key={p.key}><span>{p.label}<b>{values[p.key]}{p.unit}</b></span><input type="range" aria-label={p.label} {...{min:p.min,max:p.max,step:p.step}} value={values[p.key]} onChange={e=>change({...values,[p.key]:Number(e.target.value)})}/></label>)}
    {result.chart&&result.metrics.map(([name,n,unit])=><div className="result" key={name}><span>{name}</span><strong>{fmt(n)}<small>{unit}</small></strong></div>)}</div></div>
    <p className="intuition">{result.formula}</p><footer><button onClick={save}><Camera size={15}/>保存情景</button>{snapshots.length>0&&<select aria-label="恢复模型情景" value={active??''} onChange={e=>{const s=snapshots.find(s=>s.id===e.target.value);if(s)restore(s)}}><option value="">选择已存情景</option>{snapshots.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}</footer></section>
}