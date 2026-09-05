import {test,expect} from '@playwright/test';
test('all Blender machines render, animate, pause and survive repeated gallery switching',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/machines.html');await page.waitForFunction(()=>window.__machineGallery?.ready);
 for(const type of ['seed','solar','miner','refinery','replicator','compute']){
  await page.locator(`[data-type="${type}"]`).click();
  expect(await page.evaluate(()=>!!window.__machineGallery.objects[0].userData.asset)).toBe(true);
  await page.locator('#operation').selectOption('working');
  const before=await page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.mixer.time);
  await expect.poll(()=>page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.mixer.time)).toBeGreaterThan(before+.15);
  await page.locator('#operation').selectOption('waiting');
  // Wait for an actual idle render frame, including first-use shader compilation.
  await expect.poll(()=>page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.lights.every(m=>m.emissiveIntensity<.2))).toBe(true);
  const paused=await page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.mixer.time);await page.waitForTimeout(180);
  expect(await page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.mixer.time)).toBe(paused);
  expect(await page.evaluate(()=>window.__machineGallery.objects[0].userData.asset.lights.every(m=>m.emissiveIntensity<.2))).toBe(true);
 }
 // Switching must dispose instance resources without breaking cached geometry.
 await page.locator('#operation').selectOption('working');
 const cycle=async()=>{for(const type of ['seed','solar','miner','refinery','replicator','compute']){await page.locator(`[data-type="${type}"]`).click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}};
 await cycle();const geometries=await page.evaluate(()=>window.__machineGallery.info.geometries);await cycle();expect(await page.evaluate(()=>window.__machineGallery.info.geometries)).toBe(geometries);
 const lod=await page.evaluate(()=>{const g=window.__machineGallery.objects[0],real=window.__machineGallery.camera,far=real.clone();far.position.set(0,400,0);far.updateMatrixWorld();g.updateMatrixWorld(true);g.userData.lod.update(far);const distant=g.userData.lod.getCurrentLevel();g.userData.lod.update(real);return [distant,g.userData.lod.getCurrentLevel()];});expect(lod).toEqual([1,0]);
 await page.locator('#lineup').click();expect(await page.locator('.model-label').count()).toBe(6);await page.screenshot({path:'artifacts/machines/collection-tested.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-type="compute"]').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#operation')).toBeVisible();
 await page.screenshot({path:'artifacts/machines/mobile-tested.png'});expect(errors).toEqual([]);
});
