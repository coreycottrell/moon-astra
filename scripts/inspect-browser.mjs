import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE ERROR',m.text());}});
page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url(),r.failure()));
await page.goto('http://127.0.0.1:4173/');
try{await page.waitForFunction(()=>window.__moon,null,{timeout:60000});}catch(e){console.log('LOADING',await page.locator('#loading-detail').textContent());await page.screenshot({path:'artifacts/error.png'});await browser.close();throw e;}
await page.waitForTimeout(1500);
console.log(JSON.stringify({stats:await page.evaluate(()=>window.__moon.stats),errors},null,2));
await page.screenshot({path:'artifacts/surface.png'});
await page.getByRole('button',{name:'Orbit',exact:false}).first().click();
await page.waitForTimeout(2500);
await page.screenshot({path:'artifacts/orbit.png'});
console.log(JSON.stringify({orbit:await page.evaluate(()=>window.__moon.stats),errors},null,2));
await browser.close();
