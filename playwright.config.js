import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testIgnore:'**/legacy/**',timeout:240000,workers:1,fullyParallel:false,expect:{timeout:20000},
  webServer:{command:'node scripts/test-server.mjs',url:'http://127.0.0.1:4215/api/v1/health',reuseExistingServer:false,timeout:30000},
  use:{baseURL:'http://127.0.0.1:4215',viewport:{width:1440,height:1000},headless:true,
    launchOptions:{executablePath:process.env.MOON_CHROMIUM_PATH||'/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},
    screenshot:'only-on-failure',trace:'retain-on-failure'},
  reporter:[['list'],['json',{outputFile:'artifacts/browser-results.json'}]],
});
