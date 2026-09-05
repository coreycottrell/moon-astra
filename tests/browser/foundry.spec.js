import {test,expect} from '@playwright/test';
import {offsetPosition} from '../../src/geography.js';

test('a real terrain colony has animated crew, staged construction and usable management panels',async({page,request})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const joined=await (await request.post('/api/v1/join',{data:{name:'Browser crew '+Date.now()}})).json();const c=joined.observation.claims.find(c=>c.ownerId===joined.player.id),token=joined.token;
  await page.addInitScript(token=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token})),token);
  await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:180000});await expect(page.locator('#crew-hud-text')).toContainText('4');
  await expect.poll(()=>page.evaluate(()=>window.__moon.stats.robots)).toBe(4);
  await page.getByRole('button',{name:'Build Solar array',exact:true}).click();
  let screen=await page.evaluate(()=>window.__moon.screenLocation(-30,25));await page.mouse.click(screen.x,screen.y);
  await expect.poll(()=>page.evaluate(()=>[...window.__moon.state.jobs,...window.__moon.state.machines].filter(m=>m.type==='solar').length)).toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Escape');
  const states=[];
  for(const [type,x,y] of [['compute',30,25],['miner',60,25],['refinery',60,-5]]){
    let built=false;
    for(let shift=0;shift<10&&!built;shift++){
      const command={action:'build.place',claimId:c.id,type,...offsetPosition(c.home.lat,c.home.lon,x+shift*2,y+shift*2)},preview=await request.post('/api/v1/preview',{headers:{Authorization:'Bearer '+token},data:command});
      if(!preview.ok())continue;
      const result=await request.post('/api/v1/commands',{headers:{Authorization:'Bearer '+token,'Idempotency-Key':'browser-'+type+'-'+Date.now()},data:command});expect(result.ok()).toBeTruthy();built=true;
    }expect(built).toBeTruthy();
  }
  await page.getByRole('button',{name:'Settlement ↗',exact:true}).click();
  await page.getByRole('button',{name:'Build',exact:true}).click();await page.locator('[data-action="build"][data-type="workshop"]').click();
  screen=await page.evaluate(()=>window.__moon.screenLocation(-30,-25));await page.mouse.click(screen.x,screen.y);
  await expect.poll(()=>page.evaluate(()=>[...window.__moon.state.jobs,...window.__moon.state.machines].filter(m=>m.type==='workshop').length)).toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Escape');await page.locator('#colony').click();await page.getByRole('button',{name:'Overview',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Construction ·/})).toBeVisible();
  await expect(page.locator('.stage-strip').first()).toBeVisible();
  await page.screenshot({path:'artifacts/foundry/browser-construction.png',fullPage:true});
  for(const name of ['Build','Crew','Industry','Research','Together','AI & ops']){await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('.foundry-content')).toBeVisible();states.push(await page.locator('.foundry-content').getAttribute('data-current-tab'));}
  expect(states).toEqual(['build','crew','industry','research','neighbors','agents']);
  await page.getByRole('button',{name:'Together',exact:true}).click();await page.locator('#board-form input[name=title]').fill('A shared construction experiment');await page.locator('#board-form textarea').fill('Physical crew, real supplies, and a working collaboration board.');await page.getByRole('button',{name:'Post to the shared board'}).click();await expect(page.getByRole('heading',{name:'A shared construction experiment'})).toBeVisible();
  await page.getByRole('button',{name:'Crew',exact:true}).click();await page.screenshot({path:'artifacts/foundry/browser-crew.png',fullPage:true});
  await page.getByRole('button',{name:'Close settlement',exact:true}).click();
  await expect.poll(async()=>{const s=await(await request.get('/api/v1/observe',{headers:{Authorization:'Bearer '+token}})).json();return s.machines.filter(m=>m.claimId===c.id).length;},{timeout:180000,intervals:[1500,2500]}).toBeGreaterThanOrEqual(6);
  await page.getByRole('button',{name:'Power & data overlay'}).click();await page.screenshot({path:'artifacts/foundry/browser-colony.png',fullPage:true});
  await page.getByRole('button',{name:'Orbit',exact:false}).click();await page.waitForTimeout(1600);await page.screenshot({path:'artifacts/foundry/browser-orbit.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('foundry gallery shows the four crew and new physical industry without errors',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/machines.html?model=mason');await expect(page.locator('#model-name')).toHaveText('Mason',{timeout:90000});await expect.poll(()=>page.evaluate(()=>window.__machineGallery.ready)).toBe(true);
  await page.getByRole('button',{name:'Auto orbit'}).click();await page.waitForTimeout(500);await page.screenshot({path:'artifacts/foundry/browser-mason.png',fullPage:true});
  for(const type of ['atlas','suture','titan','robotfactory','tunnel','radiator']){await page.locator(`[data-type="${type}"]`).click();await expect.poll(()=>page.evaluate(()=>window.__machineGallery.info.type)).toBe(type);}
  await page.screenshot({path:'artifacts/foundry/browser-radiator.png',fullPage:true});expect(errors).toEqual([]);
});
test('mobile management is readable without horizontal overflow',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});const j=await(await request.post('/api/v1/join',{data:{name:'Mobile '+Date.now()}})).json();await page.addInitScript(token=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token})),j.token);
  await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:180000});await page.locator('#colony').click();await page.getByRole('button',{name:'Crew',exact:true}).click();await expect(page.getByRole('heading',{name:'Give the crew room and attention'})).toBeVisible();
  const widths=await page.locator('#colony-dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.client+2);await page.screenshot({path:'artifacts/foundry/browser-mobile.png',fullPage:true});
});

test('a foreign backend is rejected before opening an account or sending saved credentials',async({page})=>{
  const requests=[];
  await page.addInitScript(()=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token:'a'.repeat(64)})));
  await page.route('**/api/v1/**',route=>{
    requests.push({path:new URL(route.request().url()).pathname,authorization:route.request().headers().authorization});
    return route.fulfill({json:{ruleset:'moon-neighbors-1'}});
  });
  await page.goto('/');await expect(page.locator('#loading-detail')).toContainText('different Moon world');
  await expect(page.locator('#join-dialog')).not.toBeVisible();
  expect(requests).toEqual([{path:'/api/v1/catalog',authorization:undefined}]);
});
