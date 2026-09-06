import {test,expect} from '@playwright/test';
test('one Hz driving rolls the Blender wheels, lays paired tracks and stops safely',async({page})=>{
 await page.setViewportSize({width:1000,height:700});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/browser/fixtures/rover.html');await expect.poll(()=>page.evaluate(()=>!!window.roverProbe?.ready),{timeout:90000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.roverProbe.stats.trackStrips),{timeout:20000}).toBeGreaterThan(60);
 await page.screenshot({path:'artifacts/foundry/rover-tracks.png'});
 const samples=await page.evaluate(()=>window.roverProbe.samples),moving=samples.filter(s=>s.time>2500&&s.time<10000&&s.speed!==undefined);
 expect(moving.length).toBeGreaterThan(15);
 expect(moving.filter(s=>s.speed>.6&&s.speed<2).length/moving.length).toBeGreaterThan(.9);
 const last=moving.at(-1);expect(Math.abs(last.wheelRoll.left*.23-last.travel)).toBeLessThan(.03);expect(last.detailed).toBe(true);
 await page.evaluate(()=>window.roverProbe.disconnect());await page.waitForTimeout(300);const before=await page.evaluate(()=>window.roverProbe.stats);await page.waitForTimeout(1300);const after=await page.evaluate(()=>window.roverProbe.stats);
 expect(after.trackStrips).toBe(before.trackStrips);expect(after.rovers[0].position).toEqual(before.rovers[0].position);
 await page.evaluate(()=>window.roverProbe.reconnect());await page.waitForTimeout(1800);expect(await page.evaluate(()=>window.roverProbe.stats.trackStrips)).toBeGreaterThanOrEqual(before.trackStrips);
 await page.evaluate(()=>window.roverProbe.setTime(20000));await page.waitForTimeout(1900);const stopped=await page.evaluate(()=>window.roverProbe.stats);await page.waitForTimeout(1000);expect(await page.evaluate(()=>window.roverProbe.stats.rovers[0].travel)).toBe(stopped.rovers[0].travel);
 await page.evaluate(()=>window.roverProbe.recenter());expect(await page.evaluate(()=>window.roverProbe.stats.trackStrips)).toBeGreaterThan(0);expect(errors).toEqual([]);
});
