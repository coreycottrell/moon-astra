// Synthetic capacity probe, explicitly separate from the no-extra-resources gym.
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {freshSharedWorld,addPlayer,stepWorld} from '../src/shared-world.js';
import {createMachine,createRobot} from '../src/foundry/state.js';
import {offsetPosition} from '../src/geography.js';
const w=freshSharedWorld(),durations=[];
for(let n=0;n<4;n++){addPlayer(w,'load-'+n,'Load settlement '+n);const c=w.claims.at(-1);c.maxActive=8;
  for(let k=0;k<47;k++){const type=['solar','compute','miner','refinery','workshop','radiator'][k%6],loc=offsetPosition(c.home.lat,c.home.lon,40+(k%8)*25,-75+Math.floor(k/8)*25);const m=createMachine(w,c,type,loc);m.inventory={metal:10000,rock:10000,parts:3000,spares:2000};}
  for(let k=0;k<4;k++)createRobot(w,c,k%2?'service':'hauler',{x:-25,y:-20+k*5});
}
for(let t=0;t<120;t++){const a=performance.now();stepWorld(w);durations.push(performance.now()-a);}
const sorted=[...durations].sort((a,b)=>a-b),memory=process.memoryUsage();const report={scope:'Synthetic flat-terrain load, directly seeded equipment and buffers; not a gameplay progression or production capacity guarantee.',settlements:w.players.length,machines:w.machines.length,robots:w.robots.length,freight:w.freight.length,ticks:w.tick,tickMs:{p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)},rssMB:memory.rss/1048576,worldBytes:Buffer.byteLength(JSON.stringify(w)),runtime:process.version};mkdirSync('artifacts/foundry',{recursive:true});writeFileSync('artifacts/foundry/benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
