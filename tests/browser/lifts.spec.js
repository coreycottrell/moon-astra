import {test,expect} from '@playwright/test';
test('Blender elevator and rover descend together, return, and deliver physical cargo',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});await page.goto('/tests/browser/fixtures/lifts.html');await expect.poll(()=>page.evaluate(()=>!!window.liftProbe?.ready)).toBe(true);
 expect(await page.evaluate(()=>window.liftProbe.loaded.failed)).toEqual([]);
 await page.screenshot({path:'artifacts/logistics/depot-in-game.png'});
 const phases=await page.evaluate(()=>window.liftProbe.phases),lower=phases.find(p=>p.phase==='lowering').tick,raise=phases.find(p=>p.phase==='raising').tick;
 await page.evaluate(n=>{window.liftProbe.seek(n);window.liftProbe.focus('from');},lower);await page.waitForTimeout(4600);
 await page.screenshot({path:'artifacts/logistics/lift-descending.png'});
 const samples=await page.evaluate(()=>window.liftProbe.samples),moving=samples.filter(s=>s.tick>=lower&&s.tick<=lower+4&&s.lifts?.[0]?.depth<-.5&&s.lifts?.[0]?.depth>-7.5);
 expect(moving.length).toBeGreaterThan(8);for(const s of moving)expect(Math.abs(s.rovers[0].position[1]-s.lifts[0].depth)).toBeLessThan(.3);
 await page.evaluate(n=>{window.liftProbe.seek(n);window.liftProbe.focus('to');},raise);await page.waitForTimeout(4600);await page.screenshot({path:'artifacts/logistics/lift-ascending.png'});
 const raised=await page.evaluate(()=>window.liftProbe.stats);expect(raised.lifts.find(l=>l.id.endsWith(':to')).depth).toBeGreaterThan(-3);
 await page.evaluate(()=>window.liftProbe.seek(140));await page.waitForTimeout(1400);expect((await page.evaluate(()=>window.liftProbe.depot)).inventory.rock).toBe(6000);expect(errors).toEqual([]);
});
