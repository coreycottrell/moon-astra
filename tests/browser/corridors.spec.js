import {test,expect} from '@playwright/test';
test('tunnel editor retains its endpoint, quotes full cost before digging and fits mobile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/browser/fixtures/corridors.html');await expect(page.locator('[data-tab=industry]')).toBeVisible();await page.locator('[data-tab=industry]').click();
 const ids=await page.evaluate(()=>({start:window.corridorProbe.startId,bore:window.corridorProbe.boreId,seed:window.corridorProbe.neighborSeed})),form=page.locator('[data-bore-form]');
 await expect(form.getByRole('button')).toBeDisabled();await form.locator('[name=fromId]').selectOption(String(ids.start));await form.locator('[name=toId]').selectOption(String(ids.seed));
 await expect(form.locator('.corridor-estimate')).toContainText('powered minutes');expect(await page.evaluate(()=>window.corridorProbe.commands)).toEqual([]);
 await page.evaluate(()=>window.corridorProbe.refresh());await expect(form.locator('[name=toId]')).toHaveValue(String(ids.seed));
 await page.setViewportSize({width:390,height:844});await form.scrollIntoViewIfNeeded();
 expect(await page.locator('#colony-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
 await page.screenshot({path:'artifacts/foundry/tunnel-cost-mobile.png',fullPage:true});await form.getByRole('button',{name:'Start excavation'}).click();
 await expect(form.getByRole('button')).toHaveText('Bore is excavating');await expect(page.getByText('Excavating 0 /',{exact:false})).toBeVisible();
 const commands=await page.evaluate(()=>window.corridorProbe.commands);expect(commands).toHaveLength(1);expect(commands[0]).toMatchObject({action:'tunnel.dig',machineId:ids.bore,fromId:ids.start,toId:ids.seed});
 await page.locator('[data-tab=neighbors]').click();await expect(page.locator('#board-form option[value=dev]')).toHaveText('Dev note');expect(errors).toEqual([]);
});

test('depot suggestions keep independent endpoints and paid expansion and legacy fitout stay visible',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/browser/fixtures/corridors.html');await page.locator('[data-tab=industry]').click();
 const ids=await page.evaluate(()=>({depot:window.corridorProbe.depotId,miner:window.corridorProbe.minerId,legacy:window.corridorProbe.legacyId}));const depot=page.locator(`[data-depot-id="${ids.depot}"]`);
 await expect(depot.locator('.depot-bay')).toHaveCount(6);await expect(depot).toContainText('0/2 installed');await depot.locator('summary').click();
 await depot.locator(`[data-action=depot-connect][data-from="${ids.miner}"]`).click();const form=page.locator('[data-bore-form]');
 await expect(form.locator('[name=fromId]')).toHaveValue(String(ids.miner));await expect(form.locator('[name=toId]')).toHaveValue(String(ids.depot));expect(await page.evaluate(()=>window.corridorProbe.commands)).toEqual([]);
 await depot.locator('[data-action=depot-expand]').click();await expect(depot).toContainText('Crew installing expansion');await expect(depot).toContainText('0/2 installed');
 const route=page.locator(`[data-corridor-id="${ids.legacy}"]`);await route.getByRole('button',{name:'Fit 2 elevators',exact:false}).click();await expect(route).toContainText('INSTALLING LIFTS');await expect(route).toContainText('crew work queued');
 const state=await page.evaluate(()=>window.corridorProbe.state);expect(state.corridors.find(t=>t.id===ids.legacy).toId).toBe(ids.miner);expect(state.jobs.filter(j=>j.infrastructure)).toHaveLength(3);
 await page.setViewportSize({width:390,height:844});expect(await page.locator('#colony-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);await page.screenshot({path:'artifacts/logistics/depot-controls-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
