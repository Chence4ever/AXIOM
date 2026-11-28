import type { Model, ModelSetup } from './schema'
export interface Parameter {key:string;label:string;min:number;max:number;step:number;initial:number;unit:string}
export type Values=Record<string,number>
function slider(key:string,label:string,min:number,max:number,initial:number,unit='',step=0.1):Parameter{return {key,label,min,max,initial,unit,step}}
export const parameters:Record<Model,Parameter[]>={
  capm_sml:[
    {key:'riskFreeRate',label:'无风险利率',min:0,max:10,step:0.5,initial:3,unit:'%'},
    {key:'marketRiskPremium',label:'市场风险溢价',min:0,max:15,step:0.5,initial:6,unit:'%'},
    {key:'beta',label:'资产 β',min:-1,max:3,step:0.1,initial:1.2,unit:''}],
  two_assets:[
    {key:'weight',label:'资产 A 权重',min:0,max:100,step:1,initial:50,unit:'%'},
    {key:'rho',label:'相关系数 ρ',min:-1,max:1,step:0.05,initial:0.2,unit:''}],
  risk_pricing:[slider('beta','市场风险暴露 β',-10,10,1)],
  market_beta:[slider('vol','资产标准差',0,200,20,'%'),slider('rho','与市场的相关系数',-1,1,0.5)],
  two_asset_curve:[slider('rho','相关系数 ρ',-1,1,0)],
  market_allocation:[slider('weight','市场组合配置比例',0,5,1)],
  pricing_gap:[slider('beta','资产 β',-10,10,1),slider('forecast','预测收益率',-100,200,10,'%')],
  discounted_project:[slider('beta','项目 β',-10,10,1),slider('cash','期末现金流',0,1000000,100,'万元',1)]
}
export function controls(model:Model,setup?:ModelSetup):Parameter[]{
  return parameters[model].map(p=>{
    const range=setup?.ranges[p.key]
    return range&&range.min>=p.min&&range.max<=p.max?{...p,...range}:p
  })
}
export function defaults(model:Model,setup?:ModelSetup):Values{return Object.fromEntries(controls(model,setup).map(p=>[p.key,p.initial]))}
export function validValues(model:Model,v:Values){return parameters[model].every(p=>Number.isFinite(v[p.key])&&v[p.key]>=p.min&&v[p.key]<=p.max)&&Object.keys(v).length===parameters[model].length}
export function capm(rf:number,premium:number,beta:number){return rf+premium*beta}
export function portfolio(w:number,rho:number){
  const a=w*0.18,b=(1-w)*0.08
  const variance=Math.max(0,a*a+b*b+2*rho*a*b)
  return {expected:6+6*w,variance,risk:100*Math.sqrt(variance)}
}
