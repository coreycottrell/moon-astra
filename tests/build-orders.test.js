import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,observe} from '../src/shared-world.js';
import {createMachine,createRobot} from '../src/foundry/state.js';
import {industryFor} from '../src/foundry/industry.js';
import {machineStatus} from '../src/foundry/machine-status.js';
import {buildOrderEstimate} from '../src/foundry/build-orders.js';
import {offsetPosition} from '../src/geography.js';
import {TECH} from '../src/foundry/catalog.js';
function setup(){
 const w=freshSharedWorld();addPlayer(w,'p1','Ada');const c=w.claims[0];c.unlocks=Object.keys(TECH);c.autoLogistics=false;
 for(const [type,x,y] of [['solar',-30,0],['solar',-60,0],['compute',0,30],['compute',0,60]])createMachine(w,c,type,offsetPosition(c.home.lat,c.home.lon,x,y));
 const m=createMachine(w,c,'replicator',offsetPosition(c.home.lat,c.home.lon,40,0),{inventory:{metal:500000,parts:80000}});
 const cmd=(action,rest={})=>applyCommand(w,'p1',{action,claimId:c.id,machineId:m.id,...rest});
 return {w,c,m,cmd};
}
function until(w,check,max=5000){for(let n=0;n<max;n++){if(check())return;stepWorld(w,{terrain:()=>0});}assert.ok(check(),'simulation did not reach the expected state');}
test('a counted order waits for every commissioned site, charges each kit and stops',()=>{
 const {w,m,cmd}=setup();cmd('replicator.order',{steps:[{type:'solar',count:2},{type:'compute',count:1}]});
 until(w,()=>!!m.buildOrder.waitingJobId);const first=m.buildOrder.waitingJobId;
 assert.equal(m.buildOrder.completed,0);assert.equal(m.fabrication,null);assert.equal(m.inventory.metal,485000);
 stepWorld(w);assert.equal(industryFor(w,m.claimId).states[m.id],'off');assert.match(machineStatus(m,industryFor(w,m.claimId)),/construction.*fabrication mind is released/);
 const restored=JSON.parse(JSON.stringify(w));
 until(w,()=>m.buildOrder.status==='complete');until(restored,()=>restored.machines.find(x=>x.id===m.id).buildOrder.status==='complete');
 assert.deepEqual(restored,w);assert.ok(w.machines.some(x=>x.id===first));assert.equal(m.buildOrder.completed,3);assert.equal(m.buildOrder.cycles,1);
 assert.equal(m.inventory.metal,435000);assert.equal(m.inventory.parts,74000);assert.equal(m.mode,'off');
 const count=w.machines.length;for(let n=0;n<200;n++)stepWorld(w);assert.equal(w.machines.length,count);assert.equal(m.fabrication,null);
});
test('stopping a paid batch finishes that one site and preserves future resources',()=>{
 const {w,m,cmd}=setup();cmd('replicator.order',{steps:[{type:'solar',count:3}]});stepWorld(w);
 assert.ok(m.fabrication);const before=m.inventory.metal;cmd('replicator.stop');
 until(w,()=>m.buildOrder.completed===1);for(let n=0;n<100;n++)stepWorld(w);
 assert.equal(m.inventory.metal,before);assert.equal(m.buildOrder.status,'stopped');assert.equal(m.pendingBuild,null);assert.equal(m.fabrication,null);
});
test('a cancelled construction site stops its order without buying a replacement',()=>{
 const {w,m,cmd}=setup();cmd('replicator.order',{steps:[{type:'solar',count:2}]});until(w,()=>!!m.buildOrder.waitingJobId);
 const stock=m.inventory.metal;cmd('build.cancel',{jobId:m.buildOrder.waitingJobId});stepWorld(w);
 assert.equal(m.buildOrder.status,'cancelled');assert.equal(m.buildOrder.completed,0);for(let n=0;n<100;n++)stepWorld(w);assert.equal(m.inventory.metal,stock);
 assert.match(machineStatus(m,industryFor(w,m.claimId)),/site was cancelled/);
});
test('repeat requires research, advances complete cycles, and stop prevents another',()=>{
 const {w,c,m,cmd}=setup();c.unlocks=c.unlocks.filter(t=>t!=='coordinated-builds');const before=structuredClone(w);
 assert.throws(()=>cmd('replicator.order',{steps:[{type:'solar',count:1}],repeat:true}),e=>e.code==='TECH_LOCKED');assert.deepEqual(w,before);
 assert.throws(()=>cmd('replicator.order',{group:'production'}),e=>e.code==='TECH_LOCKED');
 cmd('replicator.order',{steps:[{type:'solar',count:1}]});c.unlocks.push('coordinated-builds');cmd('replicator.order',{steps:[{type:'solar',count:1}],repeat:true});
 until(w,()=>m.buildOrder.cycles===2);cmd('replicator.stop');const paid=m.inventory.metal;for(let n=0;n<800;n++)stepWorld(w);assert.equal(m.inventory.metal,paid);
});
test('order validation is atomic, owner-only and checks every late step before spending',()=>{
 const {w,c,m,cmd}=setup();addPlayer(w,'p2','Neighbor');c.builders.push('p2');
 assert.throws(()=>applyCommand(w,'p2',{action:'replicator.order',claimId:c.id,machineId:m.id,steps:[{type:'solar',count:1}]}),e=>e.code==='FORBIDDEN');
 for(const args of [{steps:[]},{steps:[{type:'solar',count:1.5}]},{steps:[{type:'solar',count:9}]},{steps:Array(5).fill({type:'solar',count:8})},{steps:[{type:'solar',count:1,hack:true}]},{steps:[{type:'seed',count:1}]},{group:'__proto__'},{steps:[{type:'solar',count:1}],repeat:'yes'}]){const before=structuredClone(w);assert.throws(()=>cmd('replicator.order',args));assert.deepEqual(w,before);}
 c.unlocks=c.unlocks.filter(t=>t!=='reproduction');const before=structuredClone(w);
 assert.throws(()=>cmd('replicator.order',{steps:[{type:'solar',count:1},{type:'replicator',count:1}]}),e=>e.code==='TECH_LOCKED');assert.deepEqual(w,before);
 cmd('replicator.order',{steps:[{type:'solar',count:1}]});stepWorld(w);
 assert.throws(()=>cmd('replicator.order',{steps:[{type:'compute',count:1}]}),e=>e.code==='MACHINE_BUSY');
 assert.throws(()=>cmd('machine.configure',{mode:'solar'}),e=>e.code==='MACHINE_BUSY');
});
test('ordered daughters start off; legacy repeating programs retain their behavior',()=>{
 const {w,m,cmd}=setup();cmd('replicator.order',{steps:[{type:'replicator',count:1}]});until(w,()=>m.buildOrder.status==='complete');
 const daughter=w.machines.find(x=>x.type==='replicator'&&x.id!==m.id);assert.equal(daughter.mode,'off');assert.equal(daughter.buildOrder,undefined);
 cmd('machine.configure',{mode:'solar'});assert.equal(m.buildOrder,undefined);stepWorld(w);assert.equal(m.fabrication.machineType,'solar');
 const old=setup();old.cmd('replicator.configure',{mode:'solar'});until(old.w,()=>old.c.replications>=2);assert.equal(old.m.buildOrder,undefined);assert.equal(old.m.mode,'solar');
});
test('supervised crew cost includes idle robots and respects the active allowance in planning',()=>{
 const {w,c,m}=setup();createRobot(w,c,'hauler');c.maxActive=5;const i=industryFor(w,c.id);assert.equal(i.crewReserved,1.25);
 let estimate=buildOrderEstimate(observe(w,'p1'),c,[{type:'miner',count:8}]);assert.equal(estimate.crew,1.25);assert.ok(estimate.warnings.some(x=>x.includes('mind')));
 c.maxActive=4;estimate=buildOrderEstimate(observe(w,'p1'),c,[{type:'solar',count:1}]);assert.equal(estimate.crew,1);
});
