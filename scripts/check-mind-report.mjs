import {chromium} from '/home/corey/projects/moon-foundry/node_modules/playwright-core/index.mjs';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root='/home/corey/projects/moon-learning-engine/docs/moon-mind-learning-engine',out='/home/corey/moon-deployments/mind-engine-20260907/report-qa';
await mkdir(out,{recursive:true,mode:0o700});
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain','.zip':'application/zip'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(path===root||path.startsWith(root+'/'));const file=path===root?root+'/index.html':path;res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const local='http://127.0.0.1:'+server.address().port+'/',base=process.argv[2]||local;
let browser;try{
 browser=await chromium.launch({headless:true,executablePath:'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'},args:['--no-sandbox','--disable-gpu','--disable-webgl','--disable-webgl2','--disable-accelerated-2d-canvas','--disable-gpu-compositing','--disable-software-rasterizer']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],bad=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url()+':'+r.status());});page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 await page.goto(base,{waitUntil:'networkidle'});
 const rendering=await page.evaluate(()=>{const c=document.createElement('canvas');return {webgl:c.getContext('webgl')===null,webgl2:c.getContext('webgl2')===null,canvasCount:document.querySelectorAll('canvas').length};});
 assert.deepEqual(rendering,{webgl:true,webgl2:true,canvasCount:0});
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getInfo');
 await page.locator('#clear-memory').click();await page.locator('#lab-form button[type=submit]').click();
 assert.match(await page.locator('#memory-choice').textContent(),/Grade a faster surface road/);
 assert.equal(await page.locator('.result-row').count(),4);assert.match(await page.locator('.result-row').nth(2).innerText(),/8 complete/);
 await page.reload({waitUntil:'networkidle'});assert.match(await page.locator('#memory-choice').textContent(),/Grade a faster surface road/);
 await page.locator('#distance').evaluate(e=>{e.value='40';e.dispatchEvent(new Event('input'));});assert.match(await page.locator('#memory-detail').textContent(),/No measured memory/);
 await page.locator('#domain').selectOption('warehouse-gym');await page.locator('#lab-form button[type=submit]').click();
 await page.locator('#fact-claim').fill('15');await page.locator('#fact-form button').click();assert.match(await page.locator('#fact-result').textContent(),/^VERIFIED/);
 await page.locator('#fact-claim').fill('0');await page.locator('#fact-form button').click();assert.match(await page.locator('#fact-result').textContent(),/^REJECTED/);
 await page.locator('#nodes').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input'));});assert.equal(await page.locator('.research-card.locked').count(),5);
 await page.locator('#step-0').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#step-1').getAttribute('aria-selected'),'true');
 await page.locator('#clear-memory').click();await page.locator('#domain').selectOption('moon-gym');await page.locator('#distance').evaluate(e=>{e.value='220';e.dispatchEvent(new Event('input'));});await page.locator('#lab-form button[type=submit]').click();
 await page.locator('#nodes').evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input'));});
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/desktop.png'});
 await page.locator('.lab-shell').screenshot({path:out+'/lab.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const file of ['mark.svg','engine/gym.mjs','engine/protocol.mjs','evidence.json','system-report.md','mind-engine-starter.zip']){const r=await context.request.get(new URL(file,base).href);assert.equal(r.status(),200);assert.ok((await r.body()).length>0);}
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.ok(requests.every(r=>r.method==='GET'));assert.ok(requests.every(r=>new URL(r.url).origin===new URL(base).origin));
 const result={ok:true,base,checks:['shared simulator controls and measured memory','persistent browser memory and scenario isolation','warehouse adapter','exact fact acceptance and rejection','node gate','keyboard tabs','desktop/mobile no horizontal overflow','all downloads','no provider/API calls','WebGL contexts unavailable'],rendering,gpuFeatureStatus:info.gpu.featureStatus,errors,bad,requests};
 await writeFile(out+'/'+(process.argv[2]?'hosted':'local')+'-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({ok:true,base,rendering,errors,bad,gpuFeatureStatus:info.gpu.featureStatus}));
}finally{await browser?.close();server.close();}

