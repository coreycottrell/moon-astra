import {test,expect} from '@playwright/test';

test('in-game guide preserves drafts, polls private answers, escapes model text and stays separate from commands',async({page,request})=>{
 const joined=await(await request.post('/api/v1/join',{data:{name:'Guide browser '+Date.now()}})).json();
 await page.addInitScript(token=>localStorage.setItem('moon-foundry-access-v1',JSON.stringify({token})),joined.token);
 let asked=0,commands=0;page.on('request',r=>{if(r.url().endsWith('/commands'))commands++;});
 await page.route('**/api/v1/guide/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/status'))return route.fulfill({json:{enabled:true,model:'MiniMax test provider',remainingToday:30}});
  if(path.endsWith('/ask')){asked++;expect(route.request().postDataJSON().question).toBe('Where is all my metal going?');return route.fulfill({status:202,json:{id:'test-answer',status:'pending',tick:40}});}
  return route.fulfill({json:{id:'test-answer',status:'complete',tick:40,answer:'The workshop consumes metal to make parts. <img src=x onerror="window.guideXss=true">'}});
 });
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:180000});await page.locator('#colony').click();await page.locator('[data-tab="guide"]').click();await expect(page.getByRole('heading',{name:'Ask about your Moon'})).toBeVisible();
 await page.locator('[data-guide-question]').first().click();await page.getByRole('heading',{name:'Ask about your Moon'}).click();await page.waitForTimeout(1600);await expect(page.locator('#guide-form textarea')).toHaveValue('Where is all my metal going?');
 await page.getByRole('button',{name:'Ask guide',exact:true}).click();await page.locator('[data-tab="industry"]').click();await page.waitForTimeout(1500);await page.locator('[data-tab="guide"]').click();
 await expect(page.locator('.guide-message.assistant')).toContainText('The workshop consumes metal');await expect(page.locator('.guide-message.assistant small')).toContainText('T+40');expect(await page.evaluate(()=>window.guideXss)).toBeUndefined();expect(asked).toBe(1);expect(commands).toBe(0);
 await page.screenshot({path:'artifacts/foundry/guide-chat.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});const widths=await page.locator('#colony-dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.client+2);
 await page.getByRole('button',{name:'New conversation'}).click();await expect(page.locator('.guide-message')).toHaveCount(0);
});
