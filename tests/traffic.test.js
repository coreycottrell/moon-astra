import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,createMachine,createRobot} from '../src/foundry/state.js';
import {offsetPosition} from '../src/geography.js';
import {distance,moveRobot,clearSegment} from '../src/foundry/navigation.js';
import {parkingPoint,port,autoLogistics} from '../src/foundry/logistics.js';
import {stepWorld} from '../src/foundry/world.js';
const setup=()=>{const w=freshSharedWorld();addPlayer(w,'p1','Traffic');return {w,c:w.claims[0]};};
test('head-on and crossing traffic makes progress without crossing occupied footprints',()=>{
 const rs=[{x:-12,y:0,target:{x:18,y:0}},{x:12,y:0,target:{x:-18,y:0}},{x:0,y:-12,target:{x:0,y:18}},{x:0,y:12,target:{x:0,y:-18}}].map((r,id)=>({...r,id,radius:.8}));
 const done=new Set();
 for(let tick=0;tick<200&&done.size<rs.length;tick++){
  const accepted=[];
  for(const r of [...rs.slice(tick%4),...rs.slice(0,tick%4)]){
   if(done.has(r.id))continue;
   const old={...r},others=rs.filter(o=>o!==r).map(o=>({...o}));
   if(moveRobot(r,r.target,[],others,accepted,{speed:1.5}))done.add(r.id);
   assert.ok(clearSegment(old,r,others,.8+.08));
  }
 }assert.equal(done.size,4);
});
test('planner clearance matches movement near an existing safety margin',()=>{
 const r={id:1,x:0,y:0,radius:.8,blockedTicks:100},other={id:2,x:0,y:1.687,radius:.8};
 for(let i=0;i<30;i++)moveRobot(r,{x:10,y:0},[],[other],[],{speed:1});
 assert.ok(r.x>9);
});
test('parking remains local regardless of the global event or robot ID',()=>{
 const r={id:990000,x:10,y:10,radius:1.5};const p=parkingPoint(r,[],[{x:0,y:0,radius:8}],{index:20});
 assert.ok(distance(p,{x:0,y:0})<50);assert.deepEqual(parkingPoint(r,[],[{x:0,y:0,radius:8}],{index:20}),p);
});
test('occupied cached berths are reassigned; a full ring never delivers remotely',()=>{
 const {w,c}=setup(),seed=w.machines[0],r=w.robots[0];w.robots=[r];r.x=12;r.y=0;
 const p=port(w,r,seed);const other=createRobot(w,c,'hauler',p);
 const next=port(w,r,seed);assert.ok(distance(next,other)>r.radius+other.radius+.15);
 // Surround the loading circle with stationary chassis.
 w.robots=[r];for(let n=0;n<32;n++){const a=n*Math.PI/16;createRobot(w,c,'hauler',{x:Math.cos(a)*10.5,y:Math.sin(a)*10.5});}
 assert.equal(port(w,r,seed).waiting,true);
});
test('buffer replenishment batches continuous inputs, drains final scraps, and chooses a nearby depot',()=>{
 const {w,c}=setup();const loc=(x,y)=>offsetPosition(c.home.lat,c.home.lon,x,y);
 const miner=createMachine(w,c,'miner',loc(35,0),{inventory:{rock:200}}),refinery=createMachine(w,c,'refinery',loc(50,0),{inventory:{metal:7000,rock:15000}}),depot=createMachine(w,c,'depot',loc(70,0));
 autoLogistics(w);assert.equal(w.freight.filter(f=>f.item==='rock').length,0);assert.equal(w.freight.find(f=>f.purpose==='warehouse').toId,depot.id);
 refinery.inventory.rock=0;autoLogistics(w);assert.equal(w.freight.filter(f=>f.item==='rock').length,0);
 w.tick=15;miner.inventory.rock=1200;autoLogistics(w);assert.equal(w.freight.find(f=>f.item==='rock').amount,1200);
 miner.inventory.rock=200;w.tick=18;autoLogistics(w);assert.equal(w.freight.filter(f=>f.item==='rock').length,1);
 w.tick=49;autoLogistics(w);assert.equal(w.freight.filter(f=>f.item==='rock').length,2);
});
test('a player crew cap is distinguished from an actual shortage of mind',()=>{
 const {w,c}=setup();c.maxActive=2;stepWorld(w);assert.equal(w.robots.filter(r=>r.status==='crew-limited').length,2);assert.equal(w.robots.filter(r=>r.status==='mind-limited').length,0);
 c.maxActive=8;createRobot(w,c,'hauler',{x:30,y:30});stepWorld(w);assert.equal(w.robots.filter(r=>r.status==='mind-limited').length,1);
});
