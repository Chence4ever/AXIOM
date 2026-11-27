import { z } from 'zod'

export const id = z.string().regex(/^[A-Za-z0-9_-]{1,96}$/, 'ID 只能使用字母、数字、下划线和连字符')
const text = z.string().min(1).max(100000)
const base = z.object({id})
const simple = <T extends string>(type:T) => base.extend({type:z.literal(type),content:text})
export const models = ['capm_sml', 'two_assets'] as const
export type Model = typeof models[number]
export const blockTypes = ['heading','paragraph','markdown','equation','table','image','callout','derivation','interactive_model','question','answer','blank_space'] as const
const known = z.discriminatedUnion('type', [
  base.extend({type:z.literal('heading'),level:z.number().int().min(2).max(4).default(2),content:text}),
  simple('paragraph'),simple('markdown'),simple('callout'),simple('question'),simple('answer'),
  base.extend({type:z.literal('equation'),latex:text}),
  base.extend({type:z.literal('table'),headers:z.array(text).min(1),rows:z.array(z.array(z.string()))}),
  base.extend({type:z.literal('image'),src:z.string().max(6000000).regex(/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/),alt:text,width:z.number().positive().max(3000),height:z.number().positive().max(3000)}),
  base.extend({type:z.literal('derivation'),steps:z.array(text).min(1)}),
  base.extend({type:z.literal('interactive_model'),model:z.enum(models)}),
  base.extend({type:z.literal('blank_space'),height:z.number().int().min(80).max(800).default(160)})
])
export type KnownBlock = z.infer<typeof known>
const unknown = base.extend({type:id}).passthrough().refine(b=>!blockTypes.some(t=>t===b.type),'已知组件字段不完整')
export const blockSchema=z.union([known,unknown])
export const chapterSchema=z.object({
  schemaVersion:z.literal('1.0'),contentVersion:text,courseId:id,courseTitle:text,
  chapterId:id,chapterTitle:text,subtitle:z.string().default(''),number:z.number().int().positive().optional(),
  blocks:z.array(blockSchema).min(1).max(2000)
}).superRefine((doc,ctx)=>{
  const seen=new Set<string>()
  doc.blocks.forEach((b,i)=>{
    if(seen.has(b.id))ctx.addIssue({code:'custom',path:['blocks',i,'id'],message:'章节内的块 ID 必须唯一'})
    seen.add(b.id)
  })
})
export type Chapter=z.infer<typeof chapterSchema>
export type Block=z.infer<typeof blockSchema>
export const chapterKey=(c:string,h:string)=>c+'/'+h
export const blockKey=(c:string,h:string,b:string)=>chapterKey(c,h)+'/'+b
export function parseChapter(input:unknown){return chapterSchema.parse(input)}
export async function fingerprint(block:Block){
  const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):
    value && typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):value
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(block))))
  return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')
}
