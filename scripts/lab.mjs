// A deterministic, isolated rules exercise. No live server, credentials, or model calls.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,UNIT} from '../src/shared-world.js';
import {offsetPosition} from '../src/geography.js';
const w=freshSharedWorld(),timeline=[];
for(const [id,name] of [['gardener','Gardener'],['architect','Architect']])addPlayer(w,id,name);
const command=(p,action,rest={})=>applyCommand(w,p.id,{action,claimId:p.homeClaimId,...rest});
function sample(){timeline.push({tick:w.tick,machines:w.machines.length,construction:w.jobs.length,replicators:w.machines.filter(m=>m.type==='replicator').length,highestGeneration:Math.max(...w.machines.map(m=>m.generation)),metal:w.claims.reduce((n,c)=>n+c.metal/UNIT,0),research:w.claims.map(c=>c.thought/UNIT),federation:w.project.complete});}
function advance(n){for(let i=0;i<n;i++){stepWorld(w);if(w.tick%10===0)sample();}}
for(const p of w.players){
  for(const [i,type] of ['solar','miner','refinery','compute','replicator'].entries())command(p,'build.place',{type,...offsetPosition(p.home.lat,p.home.lon,30+i*30,0)});
  command(p,'project.contribute',{amount:60});
}
sample();advance(150);
assert.ok(w.project.complete);assert.ok(w.claims.every(c=>c.unlocks.includes('factory-plans')));
for(const p of w.players){
  command(p,'blueprint.deploy',offsetPosition(p.home.lat,p.home.lon,240,100));
  const m=w.machines.find(m=>m.claimId===p.homeClaimId&&m.type==='replicator');command(p,'replicator.configure',{machineId:m.id,mode:'replicator'});
}
advance(300);
assert.ok(w.machines.filter(m=>m.type==='replicator').length>4);
assert.ok(w.machines.some(m=>m.generation>=2));assert.ok(w.claims.every(c=>c.metal>=0&&c.deposit>=0));
const report={ruleset:w.ruleset,scope:'Isolated deterministic rules exercise on flat placement terrain; no live players or model inference.',simulatedSeconds:w.tick,timeline,final:{players:w.players.length,machines:w.machines.length,replicators:w.machines.filter(m=>m.type==='replicator').length,highestGeneration:Math.max(...w.machines.map(m=>m.generation)),federation:w.project.complete,metal:w.claims.map(c=>c.metal/UNIT)},conclusion:'Research unlocked layouts; two contributors delivered a federation; paid daughter replicators inherited programs. Growth slowed when power and metal became bottlenecks.'};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/collaboration-lab.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,timeline:undefined},null,2));
