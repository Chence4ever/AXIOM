import http from 'node:http'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
const root=path.resolve('dist'),prefix='/AXIOM/'
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost')
if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return}
const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html')
if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes)
}catch{res.writeHead(404).end()}}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173/AXIOM/'))
