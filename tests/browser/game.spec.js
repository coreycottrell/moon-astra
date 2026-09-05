import {test,expect} from '@playwright/test';

async function openGame(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await page.waitForFunction(()=>window.__moon,null,{timeout:60000});await expect(page.locator('#loading')).toBeHidden();return errors;
}
async function build(page,name,east,north){
  await page.getByRole('button',{name:`Build ${name}`,exact:true}).click();
  const before=await page.evaluate(()=>window.__moon.state.machines.length);
  const p=await page.evaluate(([e,n])=>window.__moon.screenLocation(e,n),[east,north]);
  await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.machines.length)).toBe(before+1);
  await page.keyboard.press('Escape');
}
test('build, produce, replicate, persist, and return to the same lunar base',async({page})=>{
  const errors=await openGame(page);
  await page.getByRole('button',{name:'Pause simulation'}).click();
  await build(page,'Harvester',-24,5);
  await build(page,'Solar array',-12,30);
  await build(page,'Refinery',18,27);
  await build(page,'Replicator',29,-7);
  await build(page,'Mind node',-5,-26);
  expect(await page.evaluate(()=>window.__moon.state.metal)).toBe(23);
  await expect(page.locator('#objective-title')).toHaveText('A world building itself');
  await page.screenshot({path:'artifacts/first-factory.png'});
  await page.getByRole('button',{name:'Resume simulation'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.state.replications),{timeout:45000,intervals:[1000]}).toBeGreaterThanOrEqual(1);
  await page.getByRole('button',{name:'Pause simulation'}).click();
  const state=await page.evaluate(()=>window.__moon.state);
  expect(state.machines.length).toBeGreaterThanOrEqual(7);expect(state.rock).toBeGreaterThan(0);expect(state.thought).toBeGreaterThan(0);
  await page.screenshot({path:'artifacts/replicating-factory.png'});
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('moon-astra-world-v1')).machines.length)).toBe(state.machines.length);
  await page.reload();await page.waitForFunction(()=>window.__moon);await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(()=>window.__moon.state.machines)).toEqual(state.machines);
  await page.getByRole('button',{name:'Explore the Moon',exact:false}).click();
  await page.getByRole('button',{name:'The far side',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lon)).toBe(180);
  expect(await page.evaluate(()=>window.__moon.state.machines.length)).toBe(state.machines.length);
  await page.getByRole('button',{name:'Seed base',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(28.5);
  expect(await page.evaluate(()=>window.__moon.state.machines.map(m=>m.id))).toEqual(state.machines.map(m=>m.id));
  expect(errors).toEqual([]);
});
test('globe, regional terrain, arbitrary landing, and pole navigation remain connected',async({page})=>{
  const errors=await openGame(page);
  await page.locator('[data-view="orbit"]').click();await page.waitForTimeout(1700);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  await page.screenshot({path:'artifacts/orbit.png'});
  await page.mouse.click(800,410);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.mode)).toBe('surface');
  const landing=await page.evaluate(()=>window.__moon.stats.frameLocation);expect(Math.abs(landing.lat-28.5)+Math.abs(landing.lon+17.5)).toBeGreaterThan(1);
  await page.getByRole('button',{name:'Explore the Moon',exact:false}).click();await page.getByRole('button',{name:'Tycho crater',exact:false}).click();
  await page.locator('[data-view="region"]').click();await page.waitForTimeout(2500);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  await page.screenshot({path:'artifacts/tycho-region.png'});
  await page.getByRole('button',{name:'REGION EDGES',exact:false}).click();await expect(page.locator('#borders')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'artifacts/stitched-regions.png'});
  await page.getByRole('button',{name:'Explore the Moon',exact:false}).click();await page.getByRole('button',{name:'South pole',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(-89.9);
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.pending)).toBe(0);
  await page.screenshot({path:'artifacts/south-pole.png'});
  expect(await page.evaluate(()=>window.__moon.stats.tiles)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test('phone layout supports building, atlas travel, and local save',async({page})=>{
  await page.setViewportSize({width:390,height:844});const errors=await openGame(page);
  await page.screenshot({path:'artifacts/mobile.png'});
  await build(page,'Harvester',-22,4);
  await page.getByRole('button',{name:'Explore the Moon',exact:false}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'artifacts/mobile-atlas.png'});
  await page.getByRole('button',{name:'Copernicus crater',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.frameLocation.lat)).toBe(9.62);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
