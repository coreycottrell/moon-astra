import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,preview} from '../src/shared-world.js';
import {createMachine,createRobot} from '../src/foundry/state.js';
import {TECH} from '../src/foundry/catalog.js';
import {corridorPortals,stepTunnel,belowSurface} from '../src/foundry/corridors.js';
import {offsetPosition} from '../src/geography.js';
import {localXY,distance} from '../src/foundry/navigation.js';
function setup(){
 const w=freshSharedWorld();addPlayer(w,'p1','Ada');addPlayer(w,'p2','Babbage');const c=w.claims[0],other=w.claims[1];
 c.unlocks=Object.keys(TECH);c.autoLogistics=false;other.autoLogistics=false;
 const from=createMachine(w,c,'tunnel',offsetPosition(c.home.lat,c.home.lon,-40,0)),to=w.machines.find(m=>m.claimId===other.id&&m.type==='seed');
 const cmd=(action,rest={})=>applyCommand(w,'p1',{action,claimId:c.id,...rest});
 return {w,c,other,from,to,cmd};
}
test('owners preview and excavate toward neighboring seeds without resource or permission grants',()=>{
 const {w,c,from,to,cmd}=setup();const before=structuredClone(w);
 preview(w,'p1',{action:'tunnel.dig',claimId:c.id,machineId:from.id,toId:to.id});assert.deepEqual(w,before);
 const result=cmd('tunnel.dig',{machineId:from.id,toId:to.id});assert.ok(result.length>500&&result.length<6000);assert.equal(w.corridors[0].transport,true);assert.equal(w.corridors[0].complete,false);
 assert.deepEqual(w.machines.slice(1).map(m=>m.inventory),before.machines.slice(1).map(m=>m.inventory));assert.equal(w.machines[0].inventory.metal,before.machines[0].inventory.metal-12000);assert.equal(w.machines[0].inventory.parts,before.machines[0].inventory.parts-4000);assert.equal(w.jobs.filter(j=>j.infrastructure?.kind==='lift').length,2);assert.deepEqual(w.claims.map(c=>c.builders),before.claims.map(c=>c.builders));
 assert.throws(()=>applyCommand(w,'p2',{action:'tunnel.dig',claimId:c.id,machineId:from.id,toId:to.id}),e=>e.code==='FORBIDDEN');
 assert.throws(()=>cmd('tunnel.dig',{machineId:from.id,toId:to.id}),e=>e.code==='BORE_BUSY');
});
test('foreign facilities, excessive distance and occupied portals cannot create a tunnel',()=>{
 const {w,c,other,from,to,cmd}=setup(),foreign=createMachine(w,other,'relay',offsetPosition(other.home.lat,other.home.lon,30,0));
 assert.throws(()=>cmd('tunnel.dig',{machineId:from.id,toId:foreign.id}),e=>e.code==='INVALID_ENDPOINT');
 to.lon+=1;assert.throws(()=>cmd('tunnel.dig',{machineId:from.id,toId:to.id}),e=>e.code==='INVALID_CORRIDOR');
 assert.equal(w.corridors.length,0);
});
test('the working bore and route endpoints are independent, and only the bore pays excavation costs',()=>{
 const {w,c,from:bore,cmd}=setup(),seed=w.machines[0],end=createMachine(w,c,'relay',offsetPosition(c.home.lat,c.home.lon,45,0));
 for(const [type,x,y] of [['solar',0,-30],['solar',0,-60],['compute',0,30]])createMachine(w,c,type,offsetPosition(c.home.lat,c.home.lon,x,y));
 bore.inventory={metal:100000,parts:20000};const before=structuredClone(seed.inventory);
 cmd('tunnel.dig',{machineId:bore.id,fromId:seed.id,toId:end.id});const route=w.corridors[0];assert.equal(route.boreId,bore.id);assert.equal(route.fromId,seed.id);
 for(let n=0;n<800&&!route.complete;n++)stepWorld(w);assert.ok(route.complete);assert.equal(bore.inventory.metal,100000-route.length*500);assert.deepEqual(seed.inventory,{...before,metal:before.metal-12000,parts:before.parts-4000});
});
test('a tunnel convoy respects stopped leaders and a blocked exit; opposing traffic has its own lane',()=>{
 const {w,c,from,to}=setup(),portals=corridorPortals(w,from,to),entry=portals.from[0],exit=portals.to[1],length=distance(localXY(c.home,entry),localXY(c.home,exit));
 const ride=progress=>({corridorId:99,reverse:false,entry,exit,length,progress,stage:'transit'});
 const rear=w.robots[0],front=w.robots[1],opposite=w.robots[2];rear.tunnelRide=ride(100);front.tunnelRide=ride(103);opposite.tunnelRide={...ride(100),reverse:true};
 const options={home:c.home,speed:2,surfaceMove:()=>{throw Error('No surface motion inside tunnel');},obstacles:[],others:[],accepted:[]};
 stepTunnel(w,rear,{},options);assert.equal(rear.tunnelRide.progress,100);
 front.tunnelRide.progress=120;stepTunnel(w,rear,{},options);assert.equal(rear.tunnelRide.progress,103);
 rear.tunnelRide.progress=length;rear.tunnelRide.stage='exit';const p=localXY(c.home,exit);Object.assign(rear,p);
 stepTunnel(w,rear,{}, {...options,others:[{...p,radius:1}]});assert.ok(belowSurface(rear));assert.equal(rear.status,'waiting-for-tunnel-exit');
 stepTunnel(w,rear,{},options);assert.equal(rear.tunnelRide,null);assert.equal(rear.undergroundDepth,0);
});
test('completed routes transport real cargo, survive restart, and deliver only after emerging',()=>{
 const {w,c,other,from,to,cmd}=setup();
 cmd('tunnel.dig',{machineId:from.id,toId:to.id});const tunnel=w.corridors[0];tunnel.excavated=tunnel.length;tunnel.complete=true;tunnel.terminals.from.installed=true;tunnel.terminals.to.installed=true;w.jobs=[];w.freight=[];tunnel.infrastructureCost={metal:12000,parts:4000};
 // This test starts with constructed infrastructure; excavation cost is tested
 // independently. There is no gameplay shortcut to this fixture state.
 w.robots=w.robots.filter(r=>r.claimId===c.id&&r.role==='hauler');const rover=w.robots[0];
 cmd('shipment.send',{toClaimId:other.id,amount:6});const before=to.inventory.metal;let entered=false,delivered=false,restored;
 for(let n=0;n<5000;n++){
  stepWorld(w);if(restored)stepWorld(restored);
  if(belowSurface(rover)){entered=true;assert.equal(to.inventory.metal,before);assert.ok(w.freight.some(f=>f.robotId===rover.id&&f.status==='carried'));if(!restored)restored=JSON.parse(JSON.stringify(w));}
  if(to.inventory.metal===before+6000){delivered=true;break;}
 }
 assert.ok(entered);assert.ok(delivered);assert.deepEqual(restored,w);assert.ok(!belowSurface(rover));assert.equal(w.freight.length,0);
});
