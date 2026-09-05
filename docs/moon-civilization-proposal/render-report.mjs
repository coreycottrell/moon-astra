// Render and inspect the proposal using the project's existing Playwright install.
import {chromium} from '@playwright/test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import {writeFile, mkdir} from 'node:fs/promises';

const base = dirname(fileURLToPath(import.meta.url));
const evidence = join(base, 'verification');
await mkdir(evidence, {recursive:true});
const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.MOON_CHROMIUM_PATH || '/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  args:['--no-sandbox'],
});
try {
  const page = await browser.newPage({viewport:{width:1512,height:1100}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(join(base, 'report.html')).href, {waitUntil:'load'});
  await page.evaluate(() => document.fonts.ready);
  const desktop = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    return {
      missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>!document.getElementById(id)),
      duplicateIds:ids.filter((id,index)=>ids.indexOf(id)!==index),
      images:[...document.images].map(img=>({alt:img.alt,loaded:img.complete&&img.naturalWidth>0})),
      sections:document.querySelectorAll('main > h2').length,
      bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,
    };
  });
  if (desktop.missingAnchors.length || desktop.duplicateIds.length || desktop.images.some(image=>!image.loaded) || desktop.bodyOverflow) {
    throw Error(JSON.stringify(desktop));
  }
  await page.screenshot({path:join(evidence,'desktop.png')});
  await page.locator('[id="10-the-campaign-arc-and-the-exponential-finish"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:join(evidence,'campaign.png')});
  await page.pdf({
    path:join(base,'report.pdf'),format:'A4',printBackground:true,
    preferCSSPageSize:true,displayHeaderFooter:true,
    headerTemplate:'<div></div>',
    footerTemplate:'<div style="font:8px Arial;color:#526174;width:100%;margin:0 14mm;display:flex;justify-content:space-between"><span>MOON · Civilization proposal · September 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    tagged:true,
    outline:true,
  });
  const mobilePage = await browser.newPage({viewport:{width:390,height:844}});
  await mobilePage.goto(pathToFileURL(join(base,'report.html')).href,{waitUntil:'load'});
  await mobilePage.screenshot({path:join(evidence,'mobile.png')});
  const mobile = await mobilePage.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,scrollY}));
  if (mobile.documentWidth > mobile.width+1) throw Error(`Mobile body overflow: ${JSON.stringify(mobile)}`);
  const toggle = mobilePage.locator('.nav-title');
  await toggle.click();
  if (await toggle.getAttribute('aria-expanded') !== 'true') throw Error('Mobile contents toggle failed');
  if (errors.length || requests.length) throw Error(JSON.stringify({errors,unexpectedNetworkRequests:requests}));
  const result={status:'PASS',desktop,mobile,errors,unexpectedNetworkRequests:requests,pdf:'report.pdf'};
  await writeFile(join(evidence,'report-checks.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {
  await browser.close();
}
