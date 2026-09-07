import {test,expect} from '@playwright/test';
test('tunnel editor retains its endpoint, quotes full cost before digging and fits mobile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/browser/fixtures/corridors.html');await expect(page.locator('[data-tab=industry]')).toBeVisible();await page.locator('[data-tab=industry]').click();
 const ids=await page.evaluate(()=>({bore:window.corridorProbe.boreId,seed:window.corridorProbe.neighborSeed})),form=page.locator('[data-bore-form]');
 await expect(form.getByRole('button')).toBeDisabled();await form.locator('[name=toId]').selectOption(String(ids.seed));
 await expect(form.locator('.corridor-estimate')).toContainText('powered minutes');expect(await page.evaluate(()=>window.corridorProbe.commands)).toEqual([]);
 await page.evaluate(()=>window.corridorProbe.refresh());await expect(form.locator('[name=toId]')).toHaveValue(String(ids.seed));
 await page.setViewportSize({width:390,height:844});await form.scrollIntoViewIfNeeded();
 expect(await page.locator('#colony-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
 await page.screenshot({path:'artifacts/foundry/tunnel-cost-mobile.png',fullPage:true});await form.getByRole('button',{name:'Start excavation'}).click();
 await expect(form.getByRole('button')).toHaveText('Bore is excavating');await expect(page.getByText('Excavating 0 /',{exact:false})).toBeVisible();
 const commands=await page.evaluate(()=>window.corridorProbe.commands);expect(commands).toHaveLength(1);expect(commands[0]).toMatchObject({action:'tunnel.dig',machineId:ids.bore,toId:ids.seed});
 await page.locator('[data-tab=neighbors]').click();await expect(page.locator('#board-form option[value=dev]')).toHaveText('Dev note');expect(errors).toEqual([]);
});
