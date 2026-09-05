// A deterministic, isolated rules exercise. No live server, credentials, or model calls.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,UNIT,industryFor} from '../src/shared-world.js';
import {TYPES} from '../src/simulation.js';
import {offsetPosition} from '../src/geography.js';
const w=freshSharedWorld(),timeline=[];
for(const [id,name] of [['gardener','Gardener'],['architect','Architect']])addPlayer(w,id,name);
const command=(p,action,rest={})=>applyCommand(w,p.id,{action,claimId:p.homeClaimId,...rest});
function sample(){timeline.push({tick:w.tick,machines:w.machines.length,construction:w.jobs.length,replicators:w.machines.filter(m=>m.type==='replicator').length,highestGeneration:Math.max(...w.machines.map(m=>m.generation)),metal:w.claims.reduce((n,c)=>n+c.metal/UNIT,0),research:w.claims.map(c=>c.thought/UNIT),industry:w.claims.map(c=>{const i=industryFor(w,c.id);return {capacity:i.capacity,used:i.used,waiting:i.blockedIds.length,metalPerMinute:i.refinePerSecond*60/UNIT};}),federation:w.project.complete});}
function advance(n){for(let i=0;i<n;i++){stepWorld(w);if(w.tick%60===0)sample();}}
function until(condition){while(!condition()){assert.ok(w.tick<20000,'Starter economy must reach recursive construction without free resources');advance(1);}}
const local=p=>w.claims.find(c=>c.id===p.homeClaimId);
function buy(p,type,east,north=0){until(()=>local(p).metal>=TYPES[type].cost*UNIT);command(p,'build.place',{type,...offsetPosition(p.home.lat,p.home.lon,east,north)});advance(12);}
for(const p of w.players){
  for(const [i,type] of ['solar','miner','refinery','compute','replicator'].entries())command(p,'build.place',{type,...offsetPosition(p.home.lat,p.home.lon,30+i*30,0)});
  command(p,'project.contribute',{amount:60});
}
sample();advance(150);
assert.ok(w.project.complete);assert.ok(w.claims.every(c=>c.unlocks.includes('factory-plans')));
for(const p of w.players){
  buy(p,'compute',180);buy(p,'solar',210);
  until(()=>local(p).metal>=52*UNIT);
  command(p,'blueprint.deploy',offsetPosition(p.home.lat,p.home.lon,240,100));
  advance(8);buy(p,'compute',240);
  const m=w.machines.find(m=>m.claimId===p.homeClaimId&&m.type==='replicator');command(p,'replicator.configure',{machineId:m.id,mode:'replicator'});
  until(()=>w.machines.some(m=>m.claimId===p.homeClaimId&&m.generation===1));
  const daughter=w.machines.find(m=>m.claimId===p.homeClaimId&&m.type==='replicator'&&m.generation===1);
  assert.equal(daughter.mode,'replicator');assert.equal(industryFor(w,p.homeClaimId).states[daughter.id],'mind-limited');
  // Hand the available supervision to the daughter; its inherited program runs.
  command(p,'replicator.configure',{machineId:m.id,mode:'off'});
  until(()=>w.machines.some(m=>m.claimId===p.homeClaimId&&m.generation===2));
  command(p,'replicator.configure',{machineId:daughter.id,mode:'off'});
}
sample();
assert.ok(w.machines.filter(m=>m.type==='replicator').length>4);
assert.ok(w.machines.some(m=>m.generation>=2));assert.ok(w.claims.every(c=>c.metal>=0&&c.deposit>=0));
const report={ruleset:w.ruleset,economyVersion:w.economyVersion,scope:'Isolated deterministic rules exercise on flat placement terrain; no live players or model inference. All construction uses earned or starter metal.',simulatedSeconds:w.tick,timeline,final:{players:w.players.length,machines:w.machines.length,replicators:w.machines.filter(m=>m.type==='replicator').length,highestGeneration:Math.max(...w.machines.map(m=>m.generation)),federation:w.project.complete,metal:w.claims.map(c=>c.metal/UNIT)},conclusion:'The slower starter economy funds extra mind nodes, solar and production layouts. Both partners reach generation-two replication by handing supervision from parent to daughter. Further concurrent growth requires more nodes, power and earned metal.'};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/collaboration-lab.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,timeline:undefined},null,2));
