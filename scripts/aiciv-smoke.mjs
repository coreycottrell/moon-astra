// Local Netlify-shaped routing exercise: static subpath + separate API origin.
// This does not deploy or contact ai-civ.com.
import http from 'node:http';
import {once} from 'node:events';
import {mkdtempSync,readFileSync,createReadStream,statSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createWorldServer} from '../server/world-server.mjs';

const prefix='/moon-astra/',dist=resolve('dist-aiciv'),temp=mkdtempSync(join(tmpdir(),'moon-aiciv-'));
assert.ok(readFileSync(join(dist,'index.html'),'utf8').includes('/moon-astra/assets/'),'Run npm run build:aiciv first');
let app,browser;
const front=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.end('Existing website stays here');return;}
  if(url.pathname==='/moon-astra'){res.writeHead(301,{Location:prefix});res.end();return;}
  if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
  if(url.pathname.startsWith(prefix+'api/')){
    const upstream=http.request({hostname:'127.0.0.1',port:app.server.address().port,path:req.url.slice(prefix.length-1),method:req.method,headers:{...req.headers,host:`127.0.0.1:${app.server.address().port}`}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);return;
  }
  const file=resolve(dist,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');
  if(!file.startsWith(dist+sep)){res.writeHead(404);res.end();return;}
  try{if(!statSync(file).isFile())throw Error();}catch{res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.gz':'application/gzip'};
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});createReadStream(file).pipe(res);
});
try{
  front.listen(0,'127.0.0.1');await once(front,'listening');const origin=`http://127.0.0.1:${front.address().port}`,game=origin+prefix;
  app=createWorldServer({database:join(temp,'world.sqlite'),publicOrigin:origin});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  assert.equal((await fetch(origin+'/moon-astra',{redirect:'manual'})).status,301);
  assert.equal(await (await fetch(origin)).text(),'Existing website stays here');
  browser=await chromium.launch({headless:true,executablePath:process.env.MOON_CHROMIUM_PATH||'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],paths=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{const u=new URL(r.url());if(u.origin===origin)paths.push(u.pathname);});
  await page.goto(game);await page.locator('#callsign').fill('Subpath visitor');await page.locator('#join-submit').click();await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
  await page.locator('#pause').click();await page.waitForFunction(()=>document.getElementById('pause').getAttribute('aria-label')==='Resume settlement');assert.equal(app.state.claims[0].paused,true);
  assert.equal(await page.locator('.brand').getAttribute('href'),prefix);
  await page.locator('#colony').click();const downloadPromise=page.waitForEvent('download');await page.locator('#access-export').click();const download=await downloadPromise;const exported=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(exported.game,game);
  await page.getByRole('button',{name:'Close settlement',exact:true}).click();
  const access=join(temp,'agent.json');
  // Use async child processes: this test's API lives in the current event loop.
  const {execFile}=await import('node:child_process');
  const cli=(...args)=>new Promise((resolve,reject)=>execFile(process.execPath,['scripts/agent.mjs','--url',game,'--access',access,...args],{encoding:'utf8'},(err,out)=>err?reject(err):resolve(out)));
  await cli('join','Subpath agent');await cli('bootstrap');
  const state=JSON.parse(await cli('observe'));assert.equal(state.players.length,2);assert.equal(state.jobs.length,5);
  const blocked=await fetch(game+'api/v1/commands',{method:'POST',headers:{Origin:'https://unrelated.invalid','Content-Type':'application/json',Authorization:'Bearer '+exported.token,'Idempotency-Key':'origin-check-001'},body:JSON.stringify({action:'claim.pause',claimId:state.claims[0].id,paused:false})});assert.equal(blocked.status,403);
  assert.equal(app.state.claims[0].paused,true);assert.ok(paths.every(p=>p.startsWith(prefix)),paths.join('\n'));
  for(const p of ['data/sources.json','data/moon-height.u16.gz','data/moon-color.webp','data/moon-map.webp','api/v1/join','api/v1/commands'])assert.ok(paths.includes(prefix+p),`Missing prefixed request: ${p}`);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>typeof window.__moon),'undefined');
  mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/aiciv-subpath.png'});
  const report={status:'PASS',scope:'Local subpath and reverse-proxy simulation; live Netlify routing still needs ACG staging verification.',mount:prefix,allBrowserRequestsStayedUnderMount:true,terrainAndWebGL:true,browserJoinAndCommandThroughProxy:true,agentJoinAndBootstrapThroughProxy:true,exportIncludesMount:true,foreignOriginRejected:true,existingRootUnaffected:true,errors};writeFileSync('artifacts/aiciv-hosting-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();front.closeAllConnections();await new Promise(r=>front.close(r));if(app)await app.close();rmSync(temp,{recursive:true,force:true});}
