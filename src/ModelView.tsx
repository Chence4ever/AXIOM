import { Camera,RotateCcw,Activity } from 'lucide-react'
import {capm,portfolio,parameters,defaults,type Values} from './models'
import type {Model} from './schema'
import type {Snapshot} from './records'
type Props={model:Model;values:Values;snapshots:Snapshot[];active?:string;change:(v:Values)=>void;save:()=>void;restore:(s:Snapshot)=>void}
export function ModelView({model,values:v,snapshots,active,change,save,restore}:Props){
  const sml=model==='capm_sml',w=v.weight/100, mix=portfolio(w,v.rho)
  const expected=sml?capm(v.riskFreeRate,v.marketRiskPremium,v.beta):mix.expected
  const xs=sml?[-1,0,1,2,3]:[0,5,10,15,20], xmin=xs[0],xmax=xs.at(-1)!
  const ymin=sml?Math.min(0,Math.floor(capm(v.riskFreeRate,v.marketRiskPremium,-1)/5)*5):4
  const ymax=sml?Math.max(15,Math.ceil(capm(v.riskFreeRate,v.marketRiskPremium,3)/5)*5):14
  const x=(n:number)=>52+334*(n-xmin)/(xmax-xmin),y=(n:number)=>186-153*(n-ymin)/(ymax-ymin)
  const ys=Array.from({length:5},(_,i)=>ymin+(ymax-ymin)*i/4)
  const path=sml?[[xmin,capm(v.riskFreeRate,v.marketRiskPremium,xmin)],[xmax,capm(v.riskFreeRate,v.marketRiskPremium,xmax)]]:
    Array.from({length:151},(_,i)=>{const p=portfolio(i/150,v.rho);return [p.risk,p.expected]})
  const cx=x(sml?v.beta:mix.risk),cy=y(expected)
  return <section className="model">
    <header className="model-title"><div className="model-icon"><Activity size={20}/></div><div><small>交互模型</small><h2>{sml?'证券市场线':'投资组合机会集'} <em>{sml?'SML':''}</em></h2></div><button onClick={()=>change(defaults(model))} title="恢复默认参数"><RotateCcw size={14}/> 重置</button></header>
    <div className="experiment"><div className="plot"><div className="plot-caption">预期收益率（%）</div>
    <svg viewBox="0 0 410 220" role="img" aria-label={sml?'证券市场线与当前资产点':'机会集与当前组合点'}>
    {ys.map(n=><g key={n}><path d={'M52 '+y(n)+' H386'} className="gridline"/><text x="42" y={y(n)+4} textAnchor="end">{Number(n.toFixed(1))}</text></g>)}
    {xs.map(n=><g key={n}><path d={'M'+x(n)+' 33 V186'} className="gridline"/><text x={x(n)} y="207" textAnchor="middle">{n}</text></g>)}
    <polyline points={path.map(([a,b])=>x(a)+','+y(b)).join(' ')} fill="none" stroke="#25867f" strokeWidth="2.6"/>
    <path d={'M52 '+cy+' H'+cx+' V186'} fill="none" stroke="#73a9a5" strokeDasharray="4 4"/>
    <circle cx={cx} cy={cy} r="9" fill="#28847e" opacity=".14"/><circle cx={cx} cy={cy} r="5" fill="#177a72" stroke="white" strokeWidth="2"/>
    </svg><div className="plot-bottom"><span><i/>{sml?'证券市场线':'组合机会集'}</span><span>{sml?'系统性风险 β':'标准差（%）'}</span></div></div>
    <div className="controls">{parameters[model].map(p=><label key={p.key}><span>{p.label}<b>{v[p.key]}{p.unit}</b></span><input type="range" aria-label={p.label} min={p.min} max={p.max} step={p.step} value={v[p.key]} onChange={e=>change({...v,[p.key]:Number(e.target.value)})}/></label>)}
    <div className="result"><span>{sml?'必要收益率':'组合预期收益率'}</span><strong data-testid="result">{expected.toFixed(2)}<small>%</small></strong></div></div></div>
    <p className="intuition">{sml?'在当前风险溢价下，β 每增加 1，必要收益率增加 '+v.marketRiskPremium+' 个百分点。':'组合标准差为 '+mix.risk.toFixed(2)+'%，方差为 '+mix.variance.toFixed(6)+'。两项资产均有持仓时，相关系数越低，分散效果越强。'}</p>
    <footer><button onClick={save}><Camera size={15}/> 保存情景</button>{snapshots.length>0&&<select aria-label="恢复模型情景" value={active??''} onChange={e=>{const s=snapshots.find(i=>i.id===e.target.value);if(s)restore(s)}}><option value="">选择已存情景</option>{snapshots.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}</footer>
  </section>
}
