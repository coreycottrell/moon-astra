import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryLayouts,nextObjective} from '../src/guidance.js';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld} from '../src/shared-world.js';
import {offsetPosition} from '../src/geography.js';
const advance=(w,n)=>{for(let i=0;i<n;i++)stepWorld(w);};
function researched(){const w=freshSharedWorld(),p=addPlayer(w,'player','Playtester'),c=w.claims[0];for(const [i,type]of ['solar','miner','refinery','compute'].entries())applyCommand(w,p.id,{action:'build.place',claimId:c.id,type,...offsetPosition(p.home.lat,p.home.lon,30+i*30,0)});advance(w,129);return {w,p,c};}
test('a completed factory layout remains locatable after its construction event expires',()=>{
  const {w,p,c}=researched();applyCommand(w,p.id,{action:'blueprint.deploy',claimId:c.id,...offsetPosition(p.home.lat,p.home.lon,200,100)});
  let layouts=factoryLayouts(w,c.id);assert.equal(layouts.length,1);assert.equal(layouts[0].completed,0);const id=layouts[0].id;
  advance(w,8);w.events=[];layouts=factoryLayouts(w,c.id);assert.equal(layouts.length,1);assert.equal(layouts[0].id,id);assert.equal(layouts[0].completed,3);assert.deepEqual(layouts[0].parts.map(p=>p.type),['solar','miner','refinery']);
  assert.equal(nextObjective(w,c).title,'Add mind capacity');
});
test('layout recognition does not combine another settlement’s machines',()=>{
  const {w,p,c}=researched();addPlayer(w,'neighbor','Neighbor');applyCommand(w,p.id,{action:'blueprint.deploy',claimId:c.id,...offsetPosition(p.home.lat,p.home.lon,200,100)});w.jobs.find(j=>j.type==='refinery').claimId=w.claims[1].id;assert.equal(factoryLayouts(w,c.id).length,0);
});
test('guidance distinguishes missing, under-construction, and unprogrammed replicators',()=>{
  const {w,p,c}=researched();assert.equal(nextObjective(w,c).title,'Build your first replicator');
  applyCommand(w,p.id,{action:'build.place',claimId:c.id,type:'replicator',...offsetPosition(p.home.lat,p.home.lon,160,0)});assert.equal(nextObjective(w,c).title,'Your replicator is being built');advance(w,12);assert.equal(nextObjective(w,c).title,'Give your replicator a program');
});
test('federation guidance counts pending shipments before asking for more metal',()=>{
  const {w,p,c}=researched();applyCommand(w,p.id,{action:'build.place',claimId:c.id,type:'replicator',...offsetPosition(p.home.lat,p.home.lon,160,0)});advance(w,12);const replica=w.machines.find(m=>m.type==='replicator');applyCommand(w,p.id,{action:'replicator.configure',claimId:c.id,machineId:replica.id,mode:'solar'});
  assert.equal(nextObjective(w,c).title,'Add mind capacity');
  applyCommand(w,p.id,{action:'build.place',claimId:c.id,type:'compute',...offsetPosition(p.home.lat,p.home.lon,190,0)});assert.equal(nextObjective(w,c).title,'Mind capacity is being built');advance(w,10);
  applyCommand(w,p.id,{action:'project.contribute',claimId:c.id,amount:20});assert.match(nextObjective(w,c).body,/40 more metal/);
  applyCommand(w,p.id,{action:'project.contribute',claimId:c.id,amount:40});assert.equal(nextObjective(w,c).title,'Bring the federation online');
  c.paused=true;assert.equal(nextObjective(w,c).title,'Resume your settlement');
});
