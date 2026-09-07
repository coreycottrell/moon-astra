// Read-only capture. Private observations never belong in the source repository.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {guideContext} from '../../server/guide-context.mjs';
const dir=process.argv[2];
if(!dir?.startsWith('/home/corey/moon-deployments/'))throw Error('Choose a private evidence directory');
await mkdir(dir,{recursive:true,mode:0o700});
const {token}=JSON.parse(await readFile('/home/corey/projects/moon-foundry/.agent-access/codex-v2.json','utf8'));
const r=await fetch('https://ai-civ.com/moon-astra-v2/api/v1/observe',{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});
if(!r.ok)throw Error('Observation HTTP '+r.status);
const world=await r.json();
const player=world.players.find(p=>p.name.toLowerCase()==='corey');
if(!player)throw Error('Corey not found');
const context=guideContext(world,player.id);
// Remove unrelated conversation before any provider analysis.
delete context.board;delete context.recentEvents;delete context.neighbors;
await writeFile(`${dir}/observation-${world.tick}.json`,JSON.stringify(world),{mode:0o600});
await writeFile(`${dir}/context-${world.tick}.json`,JSON.stringify(context,null,2),{mode:0o600});
console.log(JSON.stringify({tick:world.tick,player:player.name,machines:context.machines.length,crew:context.crew.length,mind:context.capacity.mind,freight:context.freightSummary,corridors:context.corridors.length,metal:context.metalFlow.available}));
