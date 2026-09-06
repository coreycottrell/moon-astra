import {test,expect} from '@playwright/test';
import {offsetPosition} from '../../src/geography.js';

test('ordered construction editor persists drafts, submits real commands, stops and fits mobile',async({page,request})=>{
 page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const j=await(await request.post('/api/v1/join',{data:{name:'Queue browser '+Date.now()}})).json(),c=j.observation.claims.find(c=>c.ownerId===j.player.id),headers={Authorization:'Bearer '+j.token};let id=0;
 const observe=async()=>await(await request.get('/api/v1/observe',{headers})).json();
 const command=async data=>{const r=await request.post('/api/v1/commands',{headers:{...headers,'Idempotency-Key':'order-browser-'+(++id)},data:{claimId:c.id,...data}});expect(r.ok(),await r.text()).toBeTruthy();};
 for(const [type,x,y] of [['solar',-30,0],['solar',-60,0],['compute',0,30],['compute',0,60]]){
  let placed=false;
  for(let shift=0;shift<12&&!placed;shift++){
   const data={action:'build.place',claimId:c.id,type,...offsetPosition(c.home.lat,c.home.lon,x+shift*2,y+shift*2)};
   if(!(await request.post('/api/v1/preview',{headers,data})).ok())continue;await command(data);placed=true;
  }expect(placed).toBe(true);
 }
 await expect.poll(async()=>((await observe()).machines.filter(m=>m.claimId===c.id).length),{timeout:90000,intervals:[1000]}).toBe(5);
 await expect.poll(async()=>(await observe()).claims.find(x=>x.id===c.id).unlocks.includes('factory-plans'),{timeout:15000}).toBe(true);
 let placed=false;
 for(let shift=0;shift<15&&!placed;shift++){
  const data={action:'build.place',type:'replicator',claimId:c.id,...offsetPosition(c.home.lat,c.home.lon,45+shift*2,-20)};
  if(!(await request.post('/api/v1/preview',{headers,data})).ok())continue;await command(data);placed=true;
 }expect(placed).toBe(true);
 await expect.poll(async()=>(await observe()).machines.some(m=>m.claimId===c.id&&m.type==='replicator'),{timeout:100000,intervals:[1000]}).toBe(true);
 const m=(await observe()).machines.find(m=>m.claimId===c.id&&m.type==='replicator');
 await page.addInitScript(token=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token})),j.token);
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:180000});await page.locator('#colony').click();await page.locator('[data-tab=industry]').click();
 const order=page.locator(`[data-order-machine="${m.id}"]`);await order.locator('summary').click();
 await order.getByLabel('Step 1 count',{exact:true}).fill('2');await order.getByRole('button',{name:'Add step',exact:true}).click();
 await order.getByLabel('Step 2 building',{exact:true}).selectOption('compute');
 await order.getByRole('button',{name:'Move step 2 up',exact:true}).click();
 await expect(order.getByLabel('Step 1 building',{exact:true})).toHaveValue('compute');
 await order.getByRole('button',{name:'Move step 1 down',exact:true}).click();
 await expect(order.locator('[name=repeat]')).toBeDisabled();
 await page.locator('[data-tab=crew]').click();await expect(page.locator('.foundry-content')).toContainText('0.25 mind');await page.locator('[data-tab=industry]').click();
 await order.locator('summary').click();await expect(order.getByLabel('Step 1 count',{exact:true})).toHaveValue('2');await expect(order.getByLabel('Step 2 building',{exact:true})).toHaveValue('compute');
 await expect(order.locator('.order-estimate')).toContainText('65 metal + 6 parts');
 await order.getByRole('button',{name:'Start build order',exact:true}).click();
 await expect(order.locator('.order-status')).toContainText('step 1/2');
 await expect.poll(async()=>(await observe()).machines.find(x=>x.id===m.id).buildOrder.steps).toEqual([{type:'solar',count:2},{type:'compute',count:1}]);
 await page.screenshot({path:'artifacts/foundry/build-order-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await order.evaluate(el=>el.scrollIntoView({block:'start'}));
 const width=await page.locator('#colony-dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));expect(width.scroll).toBeLessThanOrEqual(width.client+2);
 await page.screenshot({path:'artifacts/foundry/build-order-mobile.png',fullPage:true});
 await order.getByRole('button',{name:'Stop future builds',exact:true}).click();await expect(order.locator('.order-status')).toContainText('stopped');expect(errors).toEqual([]);
});
