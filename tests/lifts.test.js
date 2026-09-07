import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,createMachine,createRobot} from '../src/foundry/state.js';
import {applyCommand,placement} from '../src/foundry/commands.js';
import {stepWorld,observe} from '../src/foundry/world.js';
import {preview} from '../src/shared-world.js';
import {TECH} from '../src/foundry/catalog.js';
import {offsetPosition} from '../src/geography.js';
import {localXY,distance} from '../src/foundry/navigation.js';
import {planLiftTerminals,occupiedPorts,liftReady,tunnelStatus,DEPOT_LIMITS} from '../src/foundry/lift-network.js';
import {canBoard,stepLift,selectLiftTunnel} from '../src/foundry/lift-transit.js';
import {autoLogistics,makeFreight} from '../src/foundry/logistics.js';
function setup(){
 const w=freshSharedWorld();addPlayer(w,'p','Lifts');const c=w.claims[0];c.unlocks=Object.keys(TECH);c.autoLogistics=false;c.maxActive=16;
 const loc=(x,y)=>offsetPosition(c.home.lat,c.home.lon,x,y),bore=createMachine(w,c,'tunnel',loc(-40,0));
 const depot=createMachine(w,c,'depot',loc(90,0)),miner=createMachine(w,c,'miner',loc(0,90));
 const cmd=(action,rest)=>applyCommand(w,'p',{action,claimId:c.id,...rest});
 return {w,c,loc,bore,depot,miner,cmd};
}
function completed(s,from=s.miner,to=s.depot){
 s.cmd('tunnel.dig',{machineId:s.bore.id,fromId:from.id,toId:to.id});const t=s.w.corridors.at(-1);t.complete=true;t.excavated=t.length;t.terminals.from.installed=t.terminals.to.installed=true;
 s.w.jobs=[];s.w.freight=[];return t;
}
function ride(s,t,r,reverse=false,stage='approach',progress=0){
 const entry=t.terminals[reverse?'to':'from'].loc,exit=t.terminals[reverse?'from':'to'].loc,len=distance(localXY(s.c.home,entry),localXY(s.c.home,exit));
 r.tunnelRide={corridorId:t.id,liftVersion:1,entry,exit,length:len,reverse,progress,stage,requestedAt:s.w.tick,target:{x:200,y:200}};
 return r.tunnelRide;
}
test('a new depot reserves six-bay expansion clearance but starts with two connections',()=>{
 const s=setup();assert.equal(s.depot.depotHub.bays,2);
 assert.throws(()=>placement(s.w,s.c,'solar',s.loc(110,0)),e=>e.code==='OCCUPIED');
 const a=completed(s),b=completed(s,s.w.machines[0]);assert.equal(occupiedPorts(s.w,s.depot).length,2);
 assert.equal(planLiftTerminals(s.w,s.bore,s.depot).error,'PORTS_FULL');assert.notEqual(a.terminals.to.slot,b.terminals.to.slot);
 const old=createMachine(s.w,s.c,'depot',s.loc(150,0));delete old.depotHub;createMachine(s.w,s.c,'solar',s.loc(165,0));
 assert.throws(()=>s.cmd('depot.expand',{machineId:old.id}),e=>e.code==='APRON_BLOCKED');assert.equal(old.depotHub,undefined);
});
test('research and paid crew construction gate depot expansion; cancelling releases the pending work',()=>{
 const s=setup();s.c.unlocks=s.c.unlocks.filter(t=>t!=='tunnel-control');const before=structuredClone(s.w);
 assert.throws(()=>preview(s.w,'p',{action:'depot.expand',claimId:s.c.id,machineId:s.depot.id}),e=>e.code==='TECH_LOCKED');assert.deepEqual(s.w,before);
 s.c.unlocks.push('tunnel-control');const result=s.cmd('depot.expand',{machineId:s.depot.id});assert.equal(s.depot.depotHub.bays,2);assert.ok(s.w.jobs.some(j=>j.id===result.jobId&&j.infrastructure.kind==='depot-bays'));
 s.cmd('build.cancel',{jobId:result.jobId});assert.equal(s.depot.depotHub.bays,2);assert.equal(s.depot.depotHub.jobId,undefined);
});
test('old routes keep their endpoints and become transport only after two paid lift installations',()=>{
 const s=setup(),t={id:s.w.nextId++,claimId:s.c.id,fromId:s.bore.id,toId:s.miner.id,length:100,excavated:100,complete:true};s.w.corridors.push(t);
 const result=s.cmd('tunnel.upgrade',{corridorId:t.id,tier:'basic'});assert.equal(t.fromId,s.bore.id);assert.equal(t.toId,s.miner.id);assert.equal(result.jobIds.length,2);assert.equal(liftReady(t),false);
 s.cmd('build.cancel',{jobId:result.jobIds[0]});assert.equal(t.terminals.from.jobId,null);assert.equal(liftReady(t),false);
 assert.equal(s.cmd('tunnel.fitout',{corridorId:t.id}).jobIds.length,1);
});
test('basic occupancy reserves the whole line until the robot drives clear; convoys drain for an opposing waiter',()=>{
 const s=setup(),t=completed(s),[a,b,c]=s.w.robots;s.w.robots=[a,b,c];
 ride(s,t,a,false,'transit',30);ride(s,t,b,true);ride(s,t,c,false);
 assert.equal(canBoard(s.w,b,t),false);assert.equal(canBoard(s.w,c,t),false);assert.equal(tunnelStatus(s.w,t).label,'OCCUPIED');
 a.tunnelRide.stage='leaving';assert.equal(canBoard(s.w,b,t),false);
 t.tier='convoy';a.tunnelRide.stage='transit';s.w.tick=20;b.tunnelRide.requestedAt=1;c.tunnelRide.requestedAt=19;
 assert.equal(canBoard(s.w,c,t),false);delete a.tunnelRide;assert.equal(canBoard(s.w,b,t),true);assert.equal(canBoard(s.w,c,t),false);
});
test('passing bays reserve exclusive half-sections and give an opposing robot at the midpoint priority',()=>{
 const s=setup(),t=completed(s),[a,b,c]=s.w.robots;t.tier='passing';s.w.robots=[a,b,c];
 ride(s,t,a,false,'transit',20);ride(s,t,b,true);ride(s,t,c,false);
 assert.equal(canBoard(s.w,b,t),true);assert.equal(canBoard(s.w,c,t),false);
 a.tunnelRide.stage='passing';a.tunnelRide.progress=a.tunnelRide.length/2;
 assert.equal(canBoard(s.w,b,t),false);
});
test('lowering and raising take real ticks, paused leaders retain spacing, and twin lanes admit opposing robots',()=>{
 const s=setup(),t=completed(s),[a,b]=s.w.robots;s.w.robots=[a,b];const q=ride(s,t,a,false,'lowering');q.liftRemaining=4;
 const opt={home:s.c.home,speed:2,surfaceMove:()=>true,obstacles:[],others:[],accepted:[]};
 stepLift(s.w,a,q.target,opt);assert.equal(q.stage,'lowering');assert.equal(a.undergroundDepth,-2);
 for(let n=0;n<3;n++)stepLift(s.w,a,q.target,opt);assert.equal(q.stage,'transit');assert.equal(a.undergroundDepth,-8);
 q.progress=30;ride(s,t,b,false,'transit',28);t.tier='convoy';stepLift(s.w,b,b.tunnelRide.target,opt);assert.equal(b.tunnelRide.progress,28);
 t.tier='twin';ride(s,t,b,true);assert.equal(canBoard(s.w,b,t),true);
 q.progress=q.length;q.stage='exit-wait';const exit=localXY(s.c.home,q.exit);stepLift(s.w,a,q.target,{...opt,others:[{...exit,radius:2}]});assert.equal(q.stage,'exit-wait');
 stepLift(s.w,a,q.target,opt);assert.equal(q.stage,'calling-lift');for(let n=0;n<4;n++)stepLift(s.w,a,q.target,opt);assert.equal(q.stage,'raising');for(let n=0;n<4;n++)stepLift(s.w,a,q.target,opt);assert.equal(q.stage,'leaving');assert.equal(a.undergroundDepth,0);
});
test('connected producers fill their depot in bounded batches and new depot storage counts reservations',()=>{
 const s=setup(),t=completed(s);s.cmd('depot.assign',{machineId:s.miner.id,depotId:s.depot.id});s.c.autoLogistics=true;s.miner.inventory.rock=40000;
 autoLogistics(s.w);assert.ok(s.w.freight.some(f=>f.fromId===s.miner.id&&f.toId===s.depot.id&&f.item==='rock'));
 s.depot.inventory={metal:DEPOT_LIMITS.storage};assert.throws(()=>makeFreight(s.w,s.w.machines[0],'machine',s.depot.id,'parts',1000),e=>e.code==='DEPOT_FULL');
});
test('tunnel selection can chain depot ports through a completed network',()=>{
 const s=setup(),a=s.miner,d=s.depot;Object.assign(a,s.loc(0,200));Object.assign(d,s.loc(400,200));const end=createMachine(s.w,s.c,'depot',s.loc(800,200));
 const first=completed(s,a,d),second=completed(s,d,end),r=s.w.robots[0];Object.assign(r,{...localXY(s.c.home,first.terminals.from.loc),task:{kind:'build'}});
 const selected=selectLiftTunnel(s.w,r,localXY(s.c.home,end),s.c.home,1.2);assert.equal(selected?.corridorId,first.id);
});

test('crews excavate, deliver lift materials, commission both ends and deliver cargo exactly once',()=>{
 const s=setup();s.c.autoLogistics=true;s.miner.enabled=false;
 createMachine(s.w,s.c,'solar',s.loc(-30,-40));createMachine(s.w,s.c,'solar',s.loc(0,-50));createMachine(s.w,s.c,'compute',s.loc(30,-30));
 s.cmd('tunnel.dig',{machineId:s.bore.id,fromId:s.miner.id,toId:s.depot.id});const t=s.w.corridors[0];
 let n=0;while(!liftReady(t)&&n++<4000)stepWorld(s.w);
 assert.ok(liftReady(t),JSON.stringify({tick:s.w.tick,t,jobs:s.w.jobs,robots:s.w.robots}));
 assert.deepEqual(t.infrastructureCost,{metal:12000,parts:4000});assert.equal(s.miner.depotId,s.depot.id);
 s.c.autoLogistics=false;s.miner.inventory.rock=12000;
 const ids=makeFreight(s.w,s.miner,'machine',s.depot.id,'rock',12000);const stages=new Set();n=0;
 while(s.w.freight.some(f=>ids.includes(f.id))&&n++<1500){stepWorld(s.w);for(const r of s.w.robots)if(r.tunnelRide?.corridorId===t.id)stages.add(r.tunnelRide.stage);}
 assert.equal(s.w.freight.filter(f=>ids.includes(f.id)).length,0,JSON.stringify(s.w.robots));assert.equal(s.depot.inventory.rock,12000);
 for(const stage of ['lowering','transit','calling-lift','raising','leaving'])assert.ok(stages.has(stage),stage);
});

test('all tunnel tiers drain opposing traffic without overlapping underground robots or losing cargo',()=>{
 for(const tier of ['basic','convoy','passing','twin']){
  const s=setup(),t=completed(s);t.tier=tier;s.c.autoLogistics=false;s.miner.enabled=false;s.w.robots=[];
  createMachine(s.w,s.c,'solar',s.loc(-30,-40));createMachine(s.w,s.c,'compute',s.loc(30,-30));createMachine(s.w,s.c,'compute',s.loc(60,-30));
  s.miner.depotId=s.depot.id;s.miner.inventory={rock:24000};s.depot.inventory={metal:24000};
  const ids=[...makeFreight(s.w,s.miner,'machine',s.depot.id,'rock',24000),...makeFreight(s.w,s.depot,'machine',s.miner.id,'metal',24000)];
  for(let i=0;i<8;i++){const reverse=i>=4,source=reverse?s.depot:s.miner,loc=localXY(s.c.home,source),r=createRobot(s.w,s.c,'hauler',{x:loc.x-18+(i%4)*5,y:loc.y-18});r.task={kind:'haul',stage:'delivery',ids:[ids[i]],slot:i};const f=s.w.freight.find(f=>f.id===ids[i]);f.robotId=r.id;f.status='carried';}
  let n=0,max=0;
  while(s.w.freight.length&&n++<2500){
   stepWorld(s.w);const active=s.w.robots.filter(r=>r.tunnelRide&&r.tunnelRide.stage!=='approach');max=Math.max(max,active.length);assert.ok(active.length<={basic:1,convoy:3,passing:4,twin:8}[tier],tier);
   const underground=active.filter(r=>['transit','passing','exit-wait','calling-lift'].includes(r.tunnelRide.stage));for(let i=0;i<underground.length;i++)for(let j=i+1;j<underground.length;j++){const a=underground[i],b=underground[j];assert.ok(distance(a,b)>=a.radius+b.radius-.05,JSON.stringify({tier,tick:s.w.tick,a,b}));}
   if(n===60||n===120){const copy=JSON.parse(JSON.stringify(s.w));stepWorld(copy);const comparison=structuredClone(s.w);stepWorld(comparison);assert.deepEqual(copy,comparison);}
  }
  assert.equal(s.w.freight.length,0,JSON.stringify({tier,robots:s.w.robots}));assert.equal(s.depot.inventory.rock,24000);assert.equal(s.miner.inventory.metal,24000);assert.ok(max>0,tier);
 }
});

test('pausing the tunnel owner preserves occupied lifts and prevents neighbor admission',()=>{const s=setup(),t=completed(s),[a,b]=s.w.robots;ride(s,t,a,false,'lowering').liftRemaining=4;ride(s,t,b,true);s.c.paused=true;assert.equal(canBoard(s.w,b,t),false);const before=structuredClone(a.tunnelRide);stepLift(s.w,a,a.tunnelRide.target,{home:s.c.home,speed:2,surfaceMove:()=>true,obstacles:[],others:[],accepted:[]});assert.deepEqual(a.tunnelRide,before);assert.equal(a.status,'tunnel-paused');assert.equal(tunnelStatus(s.w,t).label,'PAUSED');});
