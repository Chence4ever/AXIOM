import {test,expect,type Page} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import capm from '../../public/examples/capm.json' with { type: 'json' }
async function start(p:Page){await p.goto('./');await expect(p.getByRole('heading',{name:'资本资产定价模型',exact:true})).toBeVisible()}
async function draw(p:Page){
  await p.getByRole('button',{name:'手写笔',exact:true}).click()
  const el=p.locator('.sheet-block').first(),box=(await el.boundingBox())!
  await p.mouse.move(box.x+18,box.y+12);await p.mouse.down();await p.mouse.move(box.x+88,box.y+23,{steps:8});await p.mouse.up()
  await expect(el.locator('.ink-layer path')).toHaveCount(1)
}
test('model changes and parameter snapshots restore the plotted result',async({page:p})=>{await start(p)
  const value=p.getByTestId('result');await expect(value).toHaveText('10.20%')
  const initial=await p.locator('.plot polyline').getAttribute('points')
  await p.getByLabel('市场风险溢价',{exact:true}).focus();await p.keyboard.press('ArrowRight')
  await expect(value).toHaveText('10.80%');expect(await p.locator('.plot polyline').getAttribute('points')).not.toBe(initial)
  await p.getByRole('button',{name:'保存情景'}).click();await p.getByRole('button',{name:'重置'}).click();await expect(value).toHaveText('10.20%')
  await p.getByLabel('恢复模型情景').selectOption({index:1});await expect(value).toHaveText('10.80%')
  await p.getByRole('button',{name:/10.*双风险资产组合/}).click();await expect(value).toHaveText('9.00%')
})
test('ink survives resize, reload, erase, undo, redo and chapter switches',async({page:p})=>{await start(p);await draw(p)
  const ink=p.locator('.sheet-block').first().locator('.ink-layer path')
  const d=await ink.getAttribute('d')
  await p.getByRole('button',{name:'撤销',exact:true}).click();await expect(ink).toHaveCount(0)
  await p.getByRole('button',{name:'重做',exact:true}).click();await expect(ink).toHaveCount(1)
  await p.setViewportSize({width:1024,height:768});await p.getByRole('button',{name:'放大',exact:true}).click()
  await expect(ink).toHaveAttribute('d',d!)
  await p.locator('.reading-scroll').evaluate(el=>{el.scrollTop=400});await p.locator('.reading-scroll').evaluate(el=>{el.scrollTop=0})
  await p.reload();await expect(ink).toHaveAttribute('d',d!)
  await p.getByRole('button',{name:/10.*双风险资产组合/}).click();await expect(ink).toHaveCount(0)
  await p.getByRole('button',{name:/09.*资本资产定价模型/}).click();await expect(ink).toHaveCount(1)
  const box=(await ink.boundingBox())!;await p.getByRole('button',{name:'橡皮擦',exact:true}).click()
  await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(ink).toHaveCount(0)
})
test('JSON import is validated, duplicate confirmation preserves notes, exported backup restores into new browser',async({page:p,browser})=>{await start(p);await draw(p)
  const input=p.locator('input[type=file]')
  await input.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"broken":true}')})
  await expect(p.getByText(/文件校验失败/)).toBeVisible()
  p.once('dialog',dialog=>dialog.dismiss())
  await input.setInputFiles({name:'chapter.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(capm))})
  await expect(p.locator('.ink-layer path')).toHaveCount(1)
  const extra={...capm,courseId:'second',chapterTitle:'导入测试'}
  await input.setInputFiles({name:'extra.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(extra))})
  await expect(p.getByRole('heading',{name:'导入测试',exact:true})).toBeVisible();await expect(p.locator('.ink-layer path')).toHaveCount(0)
  await p.getByRole('button',{name:'备份与恢复'}).click();const download=p.waitForEvent('download')
  await p.getByRole('button',{name:'导出完整备份'}).click();const path=await (await download).path();const buffer=await readFile(path!)
  const ctx=await browser.newContext();try{const q=await ctx.newPage();await q.goto(p.url());await expect(q.locator('h1')).toBeVisible()
  q.on('dialog',dialog=>dialog.accept());await q.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer})
  await expect(q.getByRole('heading',{name:'学习工作台'})).toBeVisible()
  await q.locator('.chapter-nav').filter({hasText:'资本资产定价模型'}).click();await expect(q.locator('.ink-layer path')).toHaveCount(1)
  }finally{await ctx.close()}
})
test('storage write failure is visible and never reported as saved',async({page:p})=>{await start(p)
  await p.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('测试写入失败','QuotaExceededError')}})
  await p.getByRole('button',{name:'收藏章节',exact:true}).click();await expect(p.getByRole('alert')).toContainText('保存失败')
})
test('cached project subpath opens offline',async({page:p,context})=>{await start(p);await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await p.reload();await context.setOffline(true);await p.reload();await expect(p.getByTestId('result')).toHaveText('10.20%')})

test('pen input draws without panning and touch can pan or write',async({page:p})=>{
  await start(p)
  await p.getByRole('button',{name:'手写笔',exact:true}).click()
  const block=p.locator('.sheet-block').first(),box=(await block.boundingBox())!
  const x=box.x+30,y=box.y+15
  const session=await p.context().newCDPSession(p)
  const scroll=()=>p.locator('.reading-scroll').evaluate(el=>el.scrollTop)
  const top=await scroll()
  await session.send('Input.dispatchMouseEvent',{type:'mousePressed',pointerType:'pen',x,y,button:'left',buttons:1,force:.5})
  for(let i=1;i<=18;i++)await session.send('Input.dispatchMouseEvent',{type:'mouseMoved',pointerType:'pen',x:x+i*4,y:y+i*2,buttons:1,force:.65})
  await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',pointerType:'pen',x:x+72,y:y+36,button:'left'})
  await expect(block.locator('.ink-layer path')).toHaveCount(1)
  expect(await scroll()).toBe(top)
  async function swipe(){
    const b=(await block.boundingBox())!,xx=b.x+25,yy=b.y+12
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:xx,y:yy}]})
    for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:xx+2*i,y:yy-6*i}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  }
  await swipe();expect(await scroll()).toBeGreaterThan(top)
  await expect(block.locator('.ink-layer path')).toHaveCount(1)
  await p.getByRole('button',{name:'手指书写'}).click()
  const before=await scroll()
  await swipe();await expect(block.locator('.ink-layer path')).toHaveCount(2)
  expect(await scroll()).toBe(before)
})
