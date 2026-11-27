import {zodToJsonSchema} from 'zod-to-json-schema'
import {writeFileSync} from 'node:fs'
import {chapterSchema,blockTypes} from '../src/schema'
const schema=zodToJsonSchema(chapterSchema,{name:'AxiomChapter',$refStrategy:'none'})
const variants=schema.definitions!.AxiomChapter as unknown as {properties:{blocks:{items:{anyOf:Record<string,unknown>[]}}}}
const fallback=variants.properties.blocks.items.anyOf.at(-1)!
fallback.not={properties:{type:{enum:blockTypes}}}
writeFileSync('public/chapter.schema.json',JSON.stringify(schema,null,2)+'\n')
