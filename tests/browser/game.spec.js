import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
async function openGame(page,name){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await page.locator('#callsign').fill(name);await page.locator('#join-submit').click();
  await page.waitForFunction(()=>window.__moon,null,{timeout:60000});await expect(page.locator('#loading')).toBeHidden();return errors;
}
async function build(page,name,east,north){
  await page.getByRole('button',{name:`Build ${name}`,exact:true}).click();
  const before=await page.evaluate(()=>window.__moon.state.jobs.length);
  const p=await page.evaluate(([e,n])=>window.__moon.screenLocation(e,n),[east,north]);
  await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.jobs.length),{timeout:10000}).toBe(before+1);
  await page.keyboard.press('Escape');
}
test('browser construction, research, a partner delivery, factory programs, and saved identity',async({page,request})=>{
  const errors=await openGame(page,'Surface builder');
  await page.getByRole('button',{name:'Pause settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.claims[0].paused)).toBe(true);
  await build(page,'Harvester',-24,5);await build(page,'Solar array',-12,30);await build(page,'Refinery',18,27);await build(page,'Replicator',29,-7);await build(page,'Mind node',-5,-26);
  expect(await page.evaluate(()=>window.__moon.state.claims[0].metal)).toBe(88000);
  await page.screenshot({path:'artifacts/shared-construction.png'});
  await page.getByRole('button',{name:'Resume settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.jobs.length),{timeout:20000}).toBe(0);
  const bob=await (await request.post('/api/v1/join',{data:{name:'Neighbor agent'}})).json();
  const donated=await request.post('/api/v1/commands',{data:{action:'project.contribute',claimId:bob.player.homeClaimId,amount:60},headers:{Authorization:'Bearer '+bob.token,'Idempotency-Key':randomUUID()}});expect(donated.ok()).toBeTruthy();
  // The neighbor supplies its remaining real starter metal; no free test inventory.
  const target=await page.evaluate(()=>window.__moon.state.claims[0].id);
  const freight=await request.post('/api/v1/commands',{data:{action:'shipment.send',claimId:bob.player.homeClaimId,toClaimId:target,amount:180},headers:{Authorization:'Bearer '+bob.token,'Idempotency-Key':randomUUID()}});expect(freight.ok()).toBeTruthy();
  await page.locator('#colony').click();
  await expect(page.locator('#colony-content')).toContainText('Neighbor agent');
  await expect(page.locator('#deploy-factory')).toBeDisabled();
  for(let i=0;i<3;i++){await page.locator('#contribute').click();await expect(page.locator('#colony-notice')).toHaveText('Instructions accepted by the world.');await expect.poll(()=>page.evaluate(()=>window.__moon.state.shipments.filter(s=>s.ownerId===window.__moon.state.actorId).reduce((n,s)=>n+s.metal,0)+(window.__moon.state.project.contributions[window.__moon.state.actorId]||0))).toBe((i+1)*20000);}
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.project.complete),{timeout:100000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.claims[0].unlocks.includes('factory-plans')),{timeout:150000,intervals:[1000]}).toBe(true);
  await expect(page.locator('#deploy-factory')).toBeEnabled();
  await expect(page.locator('#production-rates')).toContainText('6.0 metal/min');
  await page.locator('#deploy-factory').click();
  const factory=await page.evaluate(()=>window.__moon.screenLocation(-50,-28));
  await page.mouse.move(factory.x,factory.y);await page.mouse.click(factory.x,factory.y);
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.jobs.length)).toBe(3);
  await page.keyboard.press('Escape');await page.locator('#colony').click();
  await page.locator('[data-replicator]').selectOption('replicator');await expect(page.locator('#colony-notice')).toHaveText('Instructions accepted by the world.');
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.machines.find(m=>m.type==='replicator').mode)).toBe('replicator');
  await expect(page.locator('#mind-capacity')).toContainText('Waiting for mind capacity');
  await expect(page.locator('#objective-title')).toHaveText('Add mind capacity');
  await page.getByRole('button',{name:'Close settlement',exact:true}).click();
  await page.getByRole('button',{name:'Pause settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.claims[0].paused)).toBe(true);
  await build(page,'Mind node',54,32);await build(page,'Mind node',57,4);await build(page,'Solar array',50,-29);
  await page.getByRole('button',{name:'Resume settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.jobs.length),{timeout:20000}).toBe(0);
  await page.locator('#colony').click();
  await expect(page.locator('#mind-capacity')).toContainText('10 / 12 in use');
  await page.screenshot({path:'artifacts/federation-online.png'});
  await page.getByRole('button',{name:'Close settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.machines.some(m=>m.type==='replicator'&&m.generation===1)),{timeout:45000,intervals:[1000]}).toBe(true);
  await page.getByRole('button',{name:'Pause settlement',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.claims[0].paused)).toBe(true);
  const saved=await page.evaluate(()=>window.__moon.state);
  await page.reload();await page.waitForFunction(()=>window.__moon);await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(()=>window.__moon.state.actorId)).toBe(saved.actorId);
  expect(await page.evaluate(()=>window.__moon.state.machines)).toEqual(saved.machines);
  expect(await page.evaluate(()=>localStorage.getItem('moon-astra-world-v1'))).toBeNull();
  await page.locator('#colony').click();await page.getByRole('button',{name:'Visit ↗',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(bob.player.home.lat);
  await expect(page.locator('#pause')).toBeDisabled();
  await page.locator('#home').click();await expect(page.locator('#pause')).toBeEnabled();
  expect(errors).toEqual([]);
});
test('four zoom scales, orbit landing, atlas, and poles stay connected',async({page})=>{
  const errors=await openGame(page,'Lunar cartographer');
  await page.locator('[data-view="district"]').click();await page.waitForTimeout(1700);await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  await page.screenshot({path:'artifacts/shared-district.png'});
  await page.locator('[data-view="orbit"]').click();await page.waitForTimeout(1700);await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  await page.screenshot({path:'artifacts/shared-orbit.png'});await page.mouse.click(800,410);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.mode)).toBe('surface');
  await page.locator('#atlas').click();await page.getByRole('button',{name:'Tycho crater',exact:false}).click();await page.locator('[data-view="region"]').click();await page.waitForTimeout(2500);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);await page.screenshot({path:'artifacts/shared-tycho-region.png'});
  await page.locator('#borders').click();await expect(page.locator('#borders')).toHaveAttribute('aria-pressed','true');
  await page.locator('#atlas').click();await page.getByRole('button',{name:'South pole',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(-89.9);await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  expect(await page.evaluate(()=>window.__moon.stats.tiles)).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('phone layout supports joining, settlement controls, building, and atlas travel',async({page})=>{
  await page.setViewportSize({width:390,height:844});const errors=await openGame(page,'Pocket settlement');
  await page.screenshot({path:'artifacts/shared-mobile.png'});
  await page.locator('#colony').click();await expect(page.locator('#colony-dialog')).toBeVisible();await page.screenshot({path:'artifacts/shared-mobile-board.png'});
  await page.getByRole('button',{name:'Close settlement',exact:true}).click();await page.locator('#pause').click();await build(page,'Harvester',-22,4);
  await page.locator('#atlas').click();await page.getByRole('button',{name:'Copernicus crater',exact:false}).click();await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(9.62);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
