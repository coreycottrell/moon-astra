import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);server.stdout.on('data',chunk=>{if(chunk.toString().includes('4174')){clearTimeout(timer);resolve();}});server.once('exit',code=>{clearTimeout(timer);reject(Error(`Preview exited ${code}`));});});
  browser=await chromium.launch({headless:true,executablePath:process.env.MOON_CHROMIUM_PATH||'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4174/');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
  await page.screenshot({path:'artifacts/production-surface.png'});
  await page.locator('[data-view="orbit"]').click();await page.waitForTimeout(1700);
  if(await page.evaluate(()=>typeof window.__moon)!=='undefined')throw Error('Development diagnostics leaked into production');
  if(errors.length)throw Error(errors.join('\n'));
  console.log(JSON.stringify({production:'PASS',webglCanvas:await page.locator('#scene canvas').count(),orbitControl:await page.locator('[data-view="orbit"]').getAttribute('class'),errors},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
