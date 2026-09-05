import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const dir=mkdtempSync(join(tmpdir(),'moon-production-')),url='http://127.0.0.1:4177';
const server=spawn(process.execPath,['server/world-server.mjs','--production'],{stdio:['ignore','pipe','pipe'],env:{...process.env,MOON_PORT:'4177',MOON_HOST:'127.0.0.1',MOON_DB:join(dir,'world.sqlite')}});
let browser;
try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url+'/api/v1/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Production startup timed out');
  browser=await chromium.launch({headless:true,executablePath:process.env.MOON_CHROMIUM_PATH||'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.locator('#callsign').fill('Packaged build visitor');await page.locator('#join-submit').click();await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
  const access=join(dir,'agent.json'),agent=(...args)=>execFileSync(process.execPath,['scripts/agent.mjs','--url',url,'--access',access,...args],{encoding:'utf8'});
  agent('join','CLI collaborator');assert.equal(statSync(access).mode&0o777,0o600);
  agent('bootstrap');agent('bootstrap');agent('cooperate');
  const state=JSON.parse(agent('observe')),claimId=state.players.find(p=>p.id===state.actorId).homeClaimId;
  assert.equal([...state.jobs,...state.machines].filter(m=>m.claimId===claimId&&m.type!=='seed').length,5);
  await page.locator('#colony').click();await page.getByRole('button',{name:'Visit ↗',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('machines').textContent==='6',null,{timeout:25000});
  await page.screenshot({path:'artifacts/shared-production-surface.png'});
  await page.locator('[data-view="orbit"]').click();await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(()=>typeof window.__moon),'undefined');assert.deepEqual(errors,[]);
  const report={production:'PASS',humanAndCLIShareWorld:true,starterMachines:5,bootstrapRepeatDidNotDuplicate:true,privateAccessFileMode:'0600',webglCanvas:await page.locator('#scene canvas').count(),developmentDiagnosticsAbsent:true,errors};
  writeFileSync('artifacts/shared-production-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}rmSync(dir,{recursive:true,force:true});}
