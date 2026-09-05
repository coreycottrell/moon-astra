import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,validateWorld,freshWorld,TYPES} from '../src/simulation.js';
import {offsetPosition} from '../src/geography.js';
const advance=(s,seconds)=>{for(let i=0;i<seconds*10;i++)s.tick(.1);};
test('a player can close the production loop and manufacture machines automatically',()=>{
  const s=new Simulation(),home=s.world.machines[0];
  ['miner','solar','refinery','replicator','compute'].forEach((type,i)=>assert.equal(s.build(type,offsetPosition(home.lat,home.lon,(i+1)*25,0)).ok,true));
  assert.equal(s.world.metal,23);
  advance(s,30);
  assert.equal(s.world.replications,1);assert.equal(s.world.machines.length,7);
  assert.equal(s.world.machines.at(-1).type,'solar');assert.equal(s.world.machines.at(-1).generation,1);
  assert.ok(s.world.rock>0&&s.world.metal>=0&&s.world.thought>0);
  // Fifth output is a replicator: the network can manufacture its own builders.
  advance(s,160);
  assert.ok(s.world.machines.filter(m=>m.type==='replicator').length>=2);
  assert.ok(s.world.metal>=0&&s.world.rock>=0);
});
test('power shortages slow production; pause freezes resources and construction',()=>{
  const s=new Simulation(),home=s.world.machines[0];
  for(let i=0;i<5;i++)s.build('miner',offsetPosition(home.lat,home.lon,(i+1)*20,0));
  assert.equal(s.power.factor,.8);advance(s,1);assert.ok(Math.abs(s.world.rock-12)<1e-9);
  s.paused=true;const before=s.serialize();advance(s,40);assert.equal(s.serialize(),before);
});
test('duplicate placement and insufficient metal do not mutate the world',()=>{
  const s=new Simulation(),home=s.world.machines[0],before=s.serialize();
  assert.equal(s.build('miner',home).ok,false);assert.equal(s.serialize(),before);
  s.world.metal=0;const empty=s.serialize();assert.equal(s.build('refinery',offsetPosition(home.lat,home.lon,50,0)).ok,false);assert.equal(s.serialize(),empty);
});
test('geographic identities and production survive save/reload, including far-side bases',()=>{
  const s=new Simulation();assert.equal(s.build('miner',{lat:-85,lon:179.999}).ok,true);advance(s,10);
  const reload=new Simulation(JSON.parse(s.serialize()));assert.deepEqual(reload.world,s.world);advance(s,5);advance(reload,5);assert.deepEqual(reload.world,s.world);
  for(const corrupt of [null,{...freshWorld(),metal:-1},{...freshWorld(),machines:[]},{...freshWorld(),nextId:1}])assert.throws(()=>validateWorld(corrupt));
});
