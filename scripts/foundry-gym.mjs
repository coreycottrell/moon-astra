// Deterministic agents use the exact player command surface. No live DB or tokens.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,observe,preview} from '../src/shared-world.js';
import {TECH} from '../src/foundry/catalog.js';
import {offsetPosition} from '../src/geography.js';
const started=performance.now(),w=freshSharedWorld(),timeline=[],decisions=[],errors=new Map(),milestones={};
for(const [id,name] of [['architect','Architect'],['gardener','Gardener']])addPlayer(w,id,name);
const dispatch=(actor,action,args={})=>{const c=w.claims.find(c=>c.ownerId===actor);const command={action,claimId:c.id,...args};try{preview(w,actor,command);const result=applyCommand(w,actor,command);decisions.push({tick:w.tick,actor,action,...result});return true;}catch(e){if(!e.code)throw e;errors.set(e.code,(errors.get(e.code)||0)+1);return false;}};
const present=(c,type)=>[...w.machines,...w.jobs].filter(m=>m.claimId===c.id&&m.type===type).length;
function place(c,type){for(let n=0;n<70;n++){const a=n*2.3999632297,r=28+Math.sqrt(n)*14,loc=offsetPosition(c.home.lat,c.home.lon,Math.cos(a)*r,Math.sin(a)*r),command={action:'build.place',claimId:c.id,type,...loc};try{preview(w,c.ownerId,command);}catch(e){if(['OCCUPIED','ROBOT_IN_FOOTPRINT','STEEP_TERRAIN'].includes(e.code))continue;return false;}return dispatch(c.ownerId,'build.place',{type,...loc});}return false;}
const researchOrder=['factory-plans','service-loop','crew-production','freight-network','modular-design','thermal-design','reproduction','tunneling'];
function policy(actor){
  const c=w.claims.find(c=>c.ownerId===actor),machines=w.machines.filter(m=>m.claimId===c.id),robots=w.robots.filter(r=>r.claimId===c.id),jobs=w.jobs.filter(j=>j.claimId===c.id);
  const workshop=machines.find(m=>m.type==='workshop');
  if(workshop){const wanted=c.spares<8000&&c.parts>3000?'spares':c.parts<22000?'parts':'off';if(workshop.mode!==wanted)dispatch(actor,'machine.configure',{machineId:workshop.id,mode:wanted});}
  for(const r of robots)if(r.condition<=0&&!r.task&&!r.serviceBy&&!r.reconditioning)dispatch(actor,'robot.recondition',{robotId:r.id});
  if(!c.research){for(const id of researchOrder){const t=TECH[id];if(!c.unlocks.includes(id)&&t.requires.every(p=>c.unlocks.includes(p))&&(!t.building||machines.some(m=>m.type===t.building))&&(!t.project||w.projects.find(p=>p.id===t.project).complete)){dispatch(actor,'research.select',{techId:id});break;}}}
  for(const [type,count] of [['compute',2],['solar',2],['miner',1],['refinery',1],['workshop',1]])if(present(c,type)<count){if(jobs.length<4)place(c,type);return;}
  if(!c.unlocks.includes('crew-production'))return;
  for(const [type,count] of [['robotfactory',1],['compute',3],['solar',3],['replicator',1]])if(present(c,type)<count){if(jobs.length<2)place(c,type);return;}
  const foundry=machines.find(m=>m.type==='robotfactory');
  if(foundry&&robots.length<5&&!foundry.queue?.length&&!foundry.fabrication)dispatch(actor,'robot.fabricate',{machineId:foundry.id,role:'hauler'});
  if(robots.length>=5&&c.maxActive!==5)dispatch(actor,'crew.configure',{maxActive:5});
  const project=w.projects[0];
  for(const [resource,share] of [['metal',60000],['parts',6000]]){
    const mine=project.contributions[actor]?.[resource]||0,reserved=w.freight.filter(f=>f.toKind==='project'&&f.toId===project.id&&f.ownerId===actor&&f.item===resource).reduce((n,f)=>n+f.amount,0),needed=share-mine-reserved;
    const amount=Math.floor(Math.min(needed,c[resource])/1000);if(amount>0&&!project.complete)dispatch(actor,'project.contribute',{projectId:project.id,resource,amount});
  }
  if(!project.complete)return;
  if(!milestones.federation)milestones.federation=w.tick;
  if(present(c,'compute')<4){place(c,'compute');return;}
  const replicas=machines.filter(m=>m.type==='replicator').sort((a,b)=>b.generation-a.generation);
  if(c.unlocks.includes('reproduction')&&replicas.length){
    // Only one replication front per settlement until there is support for more.
    for(const m of replicas){const wanted=m.id===replicas[0].id&&m.generation<2?'replicator':'off';if(m.mode!==wanted)dispatch(actor,'replicator.configure',{machineId:m.id,mode:wanted});}
  }
}
function sample(){const state=observe(w,'architect');timeline.push({tick:w.tick,machines:w.machines.length,robots:w.robots.length,jobs:w.jobs.length,freight:w.freight.length,federation:w.projects[0].complete,highestGeneration:Math.max(...w.machines.map(m=>m.generation)),metal:w.claims.map(c=>c.metal/1000),parts:w.claims.map(c=>c.parts/1000),spares:w.claims.map(c=>c.spares/1000),industry:w.claims.map(c=>({used:state.industry[c.id].used,capacity:state.industry[c.id].capacity,power:state.industry[c.id].powerFactor})),blocked:w.robots.filter(r=>['route-blocked','yielding'].includes(r.status)).length});}
let success=false;
for(let t=0;t<40000;t++){
  if(w.tick%20===0)for(const p of w.players)policy(p.id);
  stepWorld(w);
  if(w.tick%300===0)sample();
  if(w.tick%3000===0){console.log(JSON.stringify(timeline.at(-1)));mkdirSync('artifacts/foundry',{recursive:true});writeFileSync('artifacts/foundry/gym-checkpoint.json',JSON.stringify(w));}
  if(w.claims.every(c=>w.machines.some(m=>m.claimId===c.id&&m.type==='replicator'&&m.generation>=2))){success=true;break;}
}
sample();
const report={ruleset:w.ruleset,scenario:'Two deterministic agents, flat terrain, normal one-second rules. No extra resources, fabricated entities, unlocked technologies, or live-world writes.',success,simulatedSeconds:w.tick,wallSeconds:(performance.now()-started)/1000,milestones,totals:w.totals,decisions:decisions.length,expectedRejections:Object.fromEntries(errors),final:timeline.at(-1),timeline};
mkdirSync('artifacts/foundry',{recursive:true});writeFileSync('artifacts/foundry/gym-report.json',JSON.stringify(report,null,2)+'\n');writeFileSync('artifacts/foundry/gym-final-world.json',JSON.stringify(w));
console.log(JSON.stringify({...report,timeline:undefined},null,2));
assert.ok(success,'The autonomous collaboration scenario must reach generation-two construction for both settlements');
