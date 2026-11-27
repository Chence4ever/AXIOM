import {z} from 'zod'
import {id,models,chapterSchema} from './schema'
import {validValues} from './models'
const finite=z.number().finite()
const anchor=z.object({id,courseId:id,chapterId:id,blockId:id,signature:z.string().regex(/^[a-f0-9]{64}$/),createdAt:finite,updatedAt:finite})
export const inkSchema=anchor.extend({
  tool:z.enum(['pen','marker']),color:z.string().regex(/^#[0-9a-f]{6}$/i),width:finite.positive().max(80),opacity:finite.min(0).max(1),
  points:z.array(z.tuple([finite,finite,finite.min(0).max(1)])).min(1),snapshotId:id.optional()
})
export const highlightSchema=anchor.extend({start:z.number().int().nonnegative(),end:z.number().int().positive(),quote:z.string().min(1)})
export const snapshotSchema=anchor.extend({name:z.string().min(1),model:z.enum(models),values:z.record(finite)}).refine(s=>validValues(s.model,s.values),'模型参数超出范围')
export const progressSchema=z.object({key:z.string(),courseId:id,chapterId:id,scroll:finite.nonnegative(),completed:z.boolean(),bookmark:z.boolean(),updatedAt:finite})
export const courseSchema=z.object({id,title:z.string().min(1)})
export const backupSchema=z.object({
  format:z.literal('axiom-backup'),version:z.literal(1),courses:z.array(courseSchema),chapters:z.array(chapterSchema),
  annotations:z.array(inkSchema),textHighlights:z.array(highlightSchema),modelSnapshots:z.array(snapshotSchema),readingProgress:z.array(progressSchema),
  settings:z.array(z.object({key:z.enum(['theme','lastChapter']),value:z.string()}))
})
export type Ink=z.infer<typeof inkSchema>
export type Highlight=z.infer<typeof highlightSchema>
export type Snapshot=z.infer<typeof snapshotSchema>
export type Progress=z.infer<typeof progressSchema>
export type Course=z.infer<typeof courseSchema>
export type Backup=z.infer<typeof backupSchema>
