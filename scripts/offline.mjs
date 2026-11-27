import {readdir,readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const paths=(await readdir('dist',{recursive:true,withFileTypes:true})).filter(d=>d.isFile()&&d.name!=='sw.js').map(d=>(d.parentPath+'/'+d.name).replaceAll('\\','/').replace(/^.*?dist\//,'')).sort()
const hash=createHash('sha256')
for(const path of paths)hash.update(await readFile('dist/'+path))
await writeFile('dist/sw.js',`const prefix='axiom:'+self.registration.scope+':';
const cacheName=prefix+'${hash.digest('hex').slice(0,16)}';
const urls=${JSON.stringify(paths)};
self.addEventListener('install',e=>e.waitUntil(caches.open(cacheName).then(c=>c.addAll(urls))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(caches.open(cacheName).then(async c=>(await c.match(e.request.mode==='navigate'?new URL('index.html',self.registration.scope).href:e.request))||fetch(e.request)))});`)
