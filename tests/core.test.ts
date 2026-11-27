import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'
import {Library,seed,importChapter,exportBackup,restoreBackup,Conflict} from '../src/storage'
import {fingerprint,parseChapter} from '../src/schema'
import {capm,portfolio} from '../src/models'
import {localPoint,touches} from '../src/geometry'
import chapter from '../public/examples/capm.json'
import other from '../public/examples/portfolio.json'
const fresh=()=>new Library(crypto.randomUUID())
test('CAPM intercept, beta and premium',()=>{assert.equal(capm(3,6,0),3);assert.equal(capm(3,6,-1),-3);assert.equal(capm(3,6,1.2),10.2)})
for(const rho of [-1,0,1])test('two assets ρ='+rho,()=>{const p=portfolio(.5,rho);assert.equal(p.expected,9);assert.ok(Math.abs(p.variance-(.0081+.0016+.0072*rho))<1e-12);assert.ok(Math.abs(p.risk-100*Math.sqrt(p.variance))<1e-12);assert.equal(portfolio(0,rho).risk,8);assert.equal(portfolio(1,rho).risk,18)})
test('perfect negative correlation hedges at the correct weight',()=>assert.ok(portfolio(8/26,-1).risk<1e-6))
test('scrolling and uniform zoom retain logical coordinates',()=>{for(const s of [.4,.75,1,2])assert.deepEqual(localPoint(60+20*s,3+80*s,60,3,s,.8),[20,80,.8]);assert.ok(touches([[0,0,.5],[150,150,.5]],[100,101,.5],3))})
test('known components reject malformed fields and unknown components retain data',()=>{assert.throws(()=>parseChapter({...chapter,blocks:[{id:'a',type:'equation',latex:4}]}));const b={id:'a',type:'future',custom:{v:2}};assert.deepEqual(parseChapter({...chapter,blocks:[b]}).blocks,[b]);assert.throws(()=>parseChapter({...chapter,blocks:[b,b]}))})
test('stable signatures ignore JSON property order',async()=>assert.equal(await fingerprint({id:'a',type:'paragraph',content:'文'}),await fingerprint({content:'文',type:'paragraph',id:'a'})))
test('atomic restore, reimport, chapter isolation and full round trip',async()=>{
  const src=fresh(),dst=fresh()
  try{
    await seed([chapter,other],src);await seed([chapter],src)
    const block=await src.contentBlocks.get('investments/capm/intro')
    const a={id:'stroke',courseId:chapter.courseId,chapterId:chapter.chapterId,blockId:'intro',signature:block!.signature,createdAt:1,updatedAt:1}
    await src.annotations.put({...a,tool:'pen',width:3,color:'#112233',opacity:1,points:[[10,50,.7]]})
    assert.equal(await src.annotations.where('[courseId+chapterId]').equals(['investments','portfolio']).count(),0)
    const before=await exportBackup(undefined,src)
    await assert.rejects(importChapter(chapter,false,src),Conflict)
    await assert.rejects(importChapter({...chapter,blocks:[{type:'equation'}]},true,src))
    assert.deepEqual(await exportBackup(undefined,src),before)
    await restoreBackup(before,false,dst);assert.deepEqual(await exportBackup(undefined,dst),before)
    await assert.rejects(restoreBackup({...before,chapters:[],courses:[]},true,dst));assert.deepEqual(await exportBackup(undefined,dst),before)
    await importChapter({...chapter,blocks:[{id:'intro',type:'paragraph',content:'新版本'}]},true,dst)
    assert.equal(await dst.annotations.count(),1);assert.notEqual((await dst.contentBlocks.get(block!.key))!.signature,a.signature)
    await assert.rejects(dst.transaction('rw',dst.annotations,async()=>{await dst.annotations.clear();throw Error('rollback')}));assert.equal(await dst.annotations.count(),1)
  }finally{await src.delete();await dst.delete()}
})
