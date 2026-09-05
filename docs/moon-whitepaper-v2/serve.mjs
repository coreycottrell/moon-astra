import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const base=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary','.pdf':'application/pdf','.mp4':'video/mp4','.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8'};
export function publicationServer(){const root=resolve(base,'site');return createServer(async(req,res)=>{
 try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  if(path==='/moon-astra-whitepaper'){res.writeHead(301,{Location:'/moon-astra-whitepaper/'});res.end();return;}
  if(path.startsWith('/moon-astra-whitepaper/'))path=path.slice('/moon-astra-whitepaper'.length);
  if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}const info=await stat(file);if(!info.isFile())throw Error('Not a file');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Publication file not found');}
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=publicationServer(),port=Number(process.env.MOON_PAPER_PORT||4190);server.listen(port,'0.0.0.0',()=>console.log(`MOON whitepaper: http://localhost:${port}/moon-astra-whitepaper/`));}
