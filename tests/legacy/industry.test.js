import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,industryFor,migrateEconomy,powerFor} from '../src/shared-world.js';
import {mindFor} from '../src/industry.js';
import {offsetPosition} from '../src/geography.js';
function setup(){const w=freshSharedWorld(),p=addPlayer(w,'alice','Alice'),c=w.claims[0];let site=0;const build=type=>applyCommand(w,p.id,{action:'build.place',claimId:c.id,type,...offsetPosition(c.home.lat,c.home.lon,30*(++site),0)});return {w,p,c,build};}
const advance=(w,n)=>{for(let i=0;i<n;i++)stepWorld(w);};

test('one supervised, fully powered line extracts 18 rock and refines 6 metal in a minute',()=>{
  const {w,c,build}=setup();for(const t of ['compute','miner','solar','refinery'])build(t);advance(w,10);
  const before=structuredClone(c);advance(w,60);
  assert.equal(before.deposit-c.deposit,18000);assert.equal(c.metal-before.metal,6000);assert.equal(c.rock-before.rock,6000);
  assert.equal(before.deposit-c.deposit,c.rock-before.rock+2*(c.metal-before.metal));
  assert.equal(industryFor(w,c.id).refinePerSecond,100);
});
test('industry waits without a local node; neighbors cannot supply its supervision',()=>{
  const {w,c,build}=setup();const bob=addPlayer(w,'bob','Bob');build('miner');build('refinery');
  applyCommand(w,bob.id,{action:'build.place',claimId:bob.homeClaimId,type:'compute',...offsetPosition(bob.home.lat,bob.home.lon,30,0)});
  advance(w,100);assert.equal(c.rock,0);assert.equal(c.deposit,250000000);assert.equal(c.metal,203000);
  assert.equal(mindFor(w,c.id).blockedIds.length,1);assert.equal(powerFor(w,c.id).demand,0,'Idle industrial machines do not draw operating power');
  build('compute');advance(w,10);assert.ok(c.rock>0);assert.equal(mindFor(w,c.id).used,3);
});
test('replicators need a whole node of spare attention and retain progress while waiting',()=>{
  const {w,c,build}=setup();for(const t of ['solar','compute','miner','refinery','replicator'])build(t);advance(w,129);
  const r=w.machines.find(m=>m.type==='replicator');
  applyCommand(w,'alice',{action:'replicator.configure',claimId:c.id,machineId:r.id,mode:'solar'});
  const before=c.metal;advance(w,30);
  assert.equal(mindFor(w,c.id).states[r.id],'mind-limited');assert.equal(mindFor(w,c.id).requiredNodes,2);assert.equal(r.progress,0);assert.equal(w.jobs.length,0);assert.equal(c.metal-before,3000,'Resource supply keeps operating');
  build('compute');advance(w,20);assert.ok(r.progress>0);assert.equal(mindFor(w,c.id).used,7);
  build('refinery');advance(w,8);assert.equal(mindFor(w,c.id).states[r.id],'mind-limited');const progress=r.progress,metal=c.metal;
  advance(w,30);assert.equal(r.progress,progress);assert.ok(c.metal>metal);
  const copy=structuredClone(w);copy.machines.reverse();assert.deepEqual(mindFor(copy,c.id),mindFor(w,c.id),'Storage order does not change scheduling');
  applyCommand(w,'alice',{action:'replicator.configure',claimId:c.id,machineId:r.id,mode:'off'});assert.equal(mindFor(w,c.id).requested,5);assert.equal(mindFor(w,c.id).blockedIds.length,0);
});
test('pause, exhausted deposits and empty feedstock produce no phantom work',()=>{
  const {w,c,build}=setup();for(const t of ['solar','compute','miner','refinery'])build(t);advance(w,10);c.deposit=75;c.rock=0;
  const before=c.metal;advance(w,1);assert.equal(c.deposit,0);assert.equal(c.metal-before,37);assert.equal(c.rock,1);
  advance(w,60);assert.equal(c.metal-before,37);assert.equal(mindFor(w,c.id).used,0);
  c.paused=true;const saved=structuredClone(c);advance(w,60);assert.deepEqual(c,saved);assert.equal(industryFor(w,c.id).harvestPerSecond,0);
});
test('economy migration preserves accumulated work and rejects unknown future versions',()=>{
  const {w,c,build}=setup();build('compute');advance(w,40);delete w.economyVersion;c.yieldPerSecond=3000;const before=structuredClone(w);
  assert.equal(migrateEconomy(w),true);assert.equal(c.yieldPerSecond,300);for(const field of ['metal','rock','deposit','thought','unlocks','paused','replications'])assert.deepEqual(c[field],before.claims[0][field]);
  assert.deepEqual(w.machines,before.machines);assert.equal(migrateEconomy(w),false);
  w.economyVersion=99;assert.throws(()=>migrateEconomy(w),/Unsupported saved economy/);
});
