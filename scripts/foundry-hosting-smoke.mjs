// A disposable proxy verifies the compiled subpath package; no persistent world.
import http from 'node:http';
import {createReadStream,existsSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createWorldServer} from '../server/world-server.mjs';
const base=process.env.MOON_BASE_PATH||'/moon-foundry/',root=resolve(process.env.MOON_BUILD_DIR||'dist-aiciv'),output=resolve(process.env.MOON_TEST_ARTIFACTS||'artifacts/foundry');
assert.ok(base.startsWith('/')&&base.endsWith('/')&&!base.includes('..'),'Use an absolute mount ending in /');mkdirSync(output,{recursive:true});
assert.ok(existsSync(resolve(root,'index.html')),'Run npm run build:aiciv first');
const app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const front=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith(base+'api/')){const proxy=http.request({hostname:'127.0.0.1',port:app.server.address().port,path:url.pathname.slice(base.length-1)+url.search,method:req.method,headers:req.headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});proxy.on('error',()=>{res.writeHead(502);res.end();});req.pipe(proxy);return;}
  if(!url.pathname.startsWith(base)){res.writeHead(404);res.end();return;}
  let path=decodeURIComponent(url.pathname.slice(base.length))||'index.html';if(!extname(path)&&existsSync(resolve(root,path+'.html')))path+='.html';
  const file=resolve(root,path);if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.gz':'application/gzip'};res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});createReadStream(file).pipe(res);
});await new Promise(r=>front.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+front.address().port+base;let browser;
try{
  const j=await(await fetch(url+'api/v1/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Hosted verification'})})).json();assert.ok(j.token);
  browser=await chromium.launch({executablePath:process.env.MOON_CHROMIUM_PATH||'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});
  await page.addInitScript(token=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token})),j.token);await page.goto(url);await page.locator('#loading').waitFor({state:'hidden',timeout:150000});assert.equal(await page.locator('#scene canvas').count(),1);
  await page.goto(url+'machines.html?model=titan');await page.getByRole('heading',{name:'Titan',exact:true}).waitFor({timeout:90000});await page.screenshot({path:resolve(output,'browser-hosted-prefix.png')});
  for(const name of ['phase.html','agent-manual.html','phase','agent-manual']){await page.goto(url+name);await page.locator('h1').waitFor();assert.ok((await page.locator('h1').textContent()).length>10);}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const report={ok:true,mount:base,checks:['compiled game and proxied identity','16-model gallery and Titan','whitepaper cross-reference page','agent manual','extensionless document paths'],errors,badResponses:bad};writeFileSync(resolve(output,'hosting-smoke.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>front.close(r));await app.close();}
