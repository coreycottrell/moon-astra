import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,preview,powerFor,UNIT,PLANNER_WORK} from '../src/shared-world.js';
import {cellAt,cellCenter,cellArea,cellId,cellBoundary,startingCell} from '../src/claims.js';
import {offsetPosition} from '../src/geography.js';
import {TYPES} from '../src/simulation.js';

const setup=()=>{const w=freshSharedWorld();addPlayer(w,'alice','Alice');addPlayer(w,'bob','Bob');return w;};
const cmd=(w,actor,action,rest={})=>applyCommand(w,actor,{action,claimId:w.players.find(p=>p.id===actor).homeClaimId,...rest});
const build=(w,actor,type,east,north=0)=>{const p=w.players.find(p=>p.id===actor);return cmd(w,actor,'build.place',{type,...offsetPosition(p.home.lat,p.home.lon,east,north)});};
const steps=(w,n)=>{for(let i=0;i<n;i++)stepWorld(w);};

test('claim addresses round-trip across all six faces and the poles',()=>{
  for(let face=0;face<6;face++)for(const [x,y] of [[0,0],[1023,1023],[0,1023],[511,512],[700,300]]){
    const id=cellId(face,x,y);assert.equal(cellAt(cellCenter(id)),id);assert.ok(cellArea(id)>2&&cellArea(id)<12);assert.equal(cellBoundary(id).length,97);
  }
  for(const loc of [{lat:90,lon:0},{lat:-90,lon:180},{lat:0,lon:-180},{lat:45,lon:45}])assert.equal(cellAt(cellCenter(cellAt(loc))),cellAt(loc));
  assert.equal(new Set(Array.from({length:24},(_,i)=>startingCell(i))).size,24);
});
test('construction is paid up front, delayed, and cannot spend a neighbor’s depot',()=>{
  const w=setup(),before=structuredClone(w),p=w.players[0];
  assert.throws(()=>applyCommand(w,'bob',{action:'build.place',claimId:p.homeClaimId,type:'miner',...offsetPosition(p.home.lat,p.home.lon,30,0)}),{code:'FORBIDDEN'});
  assert.deepEqual(w,before);
  build(w,'alice','miner',30);assert.equal(w.claims[0].metal,228*UNIT);assert.equal(w.machines.length,2);
  assert.throws(()=>build(w,'alice','solar',31),{code:'OCCUPIED'});
  steps(w,5);assert.equal(w.machines.length,2);steps(w,1);assert.equal(w.machines.length,3);assert.equal(w.claims[0].rock,3*UNIT);assert.equal(w.claims[1].rock,0);
});
test('local power, deposits, and pause determine real production',()=>{
  const w=setup();build(w,'alice','miner',30);build(w,'alice','refinery',60);build(w,'alice','compute',90);build(w,'bob','solar',30);steps(w,10);
  assert.equal(powerFor(w,w.claims[0].id).factor,8/9);assert.equal(powerFor(w,w.claims[1].id).supply,20);
  w.claims[0].deposit=100;const rock=w.claims[0].rock,metal=w.claims[0].metal;steps(w,1);assert.equal(w.claims[0].deposit,0);assert.equal(w.claims[0].rock+2*(w.claims[0].metal-metal),rock+100);
  cmd(w,'alice','claim.pause',{paused:true});const frozen=structuredClone(w.claims[0]);steps(w,3);assert.deepEqual(w.claims[0],frozen);
});
test('construction delegation spends the owner’s stock but never grants shipping or factory control',()=>{
  const w=setup(),c=w.claims[0];cmd(w,'alice','claim.grant',{playerId:'bob'});
  applyCommand(w,'bob',{action:'build.place',claimId:c.id,type:'solar',...offsetPosition(c.home.lat,c.home.lon,30,0)});
  assert.equal(c.metal,225*UNIT);assert.equal(w.claims[1].metal,240*UNIT);
  assert.throws(()=>applyCommand(w,'bob',{action:'shipment.send',claimId:c.id,toClaimId:w.claims[1].id,amount:20}),{code:'FORBIDDEN'});
  cmd(w,'alice','claim.revoke',{playerId:'bob'});
  assert.throws(()=>applyCommand(w,'bob',{action:'build.place',claimId:c.id,type:'solar',...offsetPosition(c.home.lat,c.home.lon,60,0)}),{code:'FORBIDDEN'});
});
test('mind research unlocks an atomic layout and previews do not mutate the world',()=>{
  const w=setup(),c=w.claims[0],loc=offsetPosition(c.home.lat,c.home.lon,100,100),plan={action:'blueprint.deploy',claimId:c.id,...loc};
  assert.throws(()=>applyCommand(w,'alice',plan),{code:'TECH_LOCKED'});
  build(w,'alice','compute',30);steps(w,129);assert.equal(c.thought,PLANNER_WORK);assert.ok(c.unlocks.includes('factory-plans'));
  const before=structuredClone(w);assert.equal(preview(w,'alice',plan).result.jobs.length,3);assert.deepEqual(w,before);
  build(w,'alice','solar',124,100);const occupied=structuredClone(w);
  assert.throws(()=>applyCommand(w,'alice',plan),{code:'OCCUPIED'});assert.deepEqual(w,occupied);
  const metal=c.metal;applyCommand(w,'alice',{...plan,...offsetPosition(c.home.lat,c.home.lon,200,100)});assert.equal(c.metal,metal-52*UNIT);assert.equal(w.jobs.length,4);
});
test('shipments conserve stock and arrive after travel, even through a local pause',()=>{
  const w=setup(),total=w.claims.reduce((n,c)=>n+c.metal,0);
  const result=cmd(w,'alice','shipment.send',{toClaimId:w.claims[1].id,amount:20});assert.ok(result.arrivalTick>5);assert.equal(w.claims[1].metal,240*UNIT);
  cmd(w,'alice','claim.pause',{paused:true});steps(w,result.arrivalTick-1);assert.equal(w.claims[1].metal,240*UNIT);
  steps(w,1);assert.equal(w.claims[1].metal,260*UNIT);assert.equal(w.claims.reduce((n,c)=>n+c.metal,0),total);assert.equal(w.shipments.length,0);
});
test('the federation needs multiple contributors and enables paid, inherited self-replication',()=>{
  const w=setup(),c=w.claims[0];build(w,'alice','compute',30);build(w,'alice','replicator',60);build(w,'alice','solar',90);steps(w,129);
  const m=w.machines.find(m=>m.type==='replicator');assert.throws(()=>cmd(w,'alice','replicator.configure',{machineId:m.id,mode:'replicator'}),{code:'TECH_LOCKED'});
  cmd(w,'alice','project.contribute',{amount:60});assert.throws(()=>cmd(w,'alice','project.contribute',{amount:1}),{code:'CONTRIBUTION_LIMIT'});steps(w,5);assert.equal(w.project.complete,false);
  const receipt=cmd(w,'bob','project.contribute',{amount:60});steps(w,receipt.arrivalTick-w.tick);assert.equal(w.project.complete,true);
  cmd(w,'alice','replicator.configure',{machineId:m.id,mode:'replicator'});const before=c.metal;steps(w,24);assert.equal(c.metal,before-TYPES.replicator.cost*UNIT);assert.equal(w.jobs.length,1);assert.equal(w.jobs[0].generation,1);
  steps(w,12);const daughters=w.machines.filter(m=>m.type==='replicator'&&m.generation===1);assert.equal(daughters.length,1);assert.equal(daughters[0].mode,'replicator');
  const count=w.machines.length;steps(w,100);assert.equal(w.machines.length,count);assert.ok(c.metal>=0,'No free daughter machines when the depot is empty');
});
test('invalid coordinates, budgets, and terrain cannot enqueue construction',()=>{
  const w=setup(),c=w.claims[0],before=structuredClone(w),base={action:'build.place',claimId:c.id,type:'solar',...offsetPosition(c.home.lat,c.home.lon,30,0)};
  assert.throws(()=>applyCommand(w,'alice',{...base,lat:NaN}),{code:'INVALID_LOCATION'});
  assert.throws(()=>applyCommand(w,'alice',{...base,maxMetal:14}),{code:'BUDGET_EXCEEDED'});
  assert.throws(()=>applyCommand(w,'alice',base,{terrain:p=>p.lon*1e8}),{code:'STEEP_TERRAIN'});assert.deepEqual(w,before);
});
test('identical command histories produce identical simulations',()=>{
  const run=()=>{const w=setup();build(w,'alice','solar',30);build(w,'alice','miner',60);build(w,'alice','refinery',90);steps(w,200);return w;};assert.deepEqual(run(),run());
});
