import type { Model } from './schema'
export interface Parameter {key:string;label:string;min:number;max:number;step:number;initial:number;unit:string}
export type Values=Record<string,number>
export const parameters:Record<Model,Parameter[]>={
  capm_sml:[
    {key:'riskFreeRate',label:'无风险利率',min:0,max:10,step:0.5,initial:3,unit:'%'},
    {key:'marketRiskPremium',label:'市场风险溢价',min:0,max:15,step:0.5,initial:6,unit:'%'},
    {key:'beta',label:'资产 β',min:-1,max:3,step:0.1,initial:1.2,unit:''}],
  two_assets:[
    {key:'weight',label:'资产 A 权重',min:0,max:100,step:1,initial:50,unit:'%'},
    {key:'rho',label:'相关系数 ρ',min:-1,max:1,step:0.05,initial:0.2,unit:''}]
}
export function defaults(model:Model):Values{return Object.fromEntries(parameters[model].map(p=>[p.key,p.initial]))}
export function validValues(model:Model,v:Values){return parameters[model].every(p=>Number.isFinite(v[p.key])&&v[p.key]>=p.min&&v[p.key]<=p.max)&&Object.keys(v).length===parameters[model].length}
export function capm(rf:number,premium:number,beta:number){return rf+premium*beta}
export function portfolio(w:number,rho:number){
  const a=w*0.18,b=(1-w)*0.08
  const variance=Math.max(0,a*a+b*b+2*rho*a*b)
  return {expected:6+6*w,variance,risk:100*Math.sqrt(variance)}
}
