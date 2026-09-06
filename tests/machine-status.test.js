import test from 'node:test';
import assert from 'node:assert/strict';
import {machineStatus} from '../src/foundry/machine-status.js';

test('idle, manually disabled and capacity-blocked factories have different actionable explanations',()=>{
  const m={id:996,type:'replicator',enabled:true,mode:'off',inventory:{}},i={states:{996:'off'},capacity:9,used:5,powerFactor:1};
  assert.match(machineStatus(m,i),/Idle.*no output selected.*Output/);
  assert.match(machineStatus({...m,type:'robotfactory'},i),/no robot orders.*choose a robot/);
  assert.match(machineStatus({...m,enabled:false},i),/Off.*switched off.*Enable/);
  i.states[996]='mind-limited';i.used=7;
  assert.match(machineStatus(m,i),/needs 4 slots; 2 free of 9/);
  i.states[996]='paused';assert.match(machineStatus(m,i),/resume this settlement/);
});

test('missing inputs describe local shortages in game units, including parts and spares',()=>{
  const m={id:966,type:'robotfactory',inventory:{metal:3000,parts:3000},queue:[{cost:{metal:8000,parts:3000,spares:1000}}]},i={states:{966:'no-feedstock'}};
  const before=JSON.stringify(m);assert.match(machineStatus(m,i),/needs 5 metal \+ 1 spares at this machine/);assert.equal(JSON.stringify(m),before);
  assert.match(machineStatus({...m,type:'refinery',inventory:{rock:100}},i),/needs 0.1 rock/);
});

test('non-operating states never fall through to an Online label',()=>{
  const m={id:1,type:'replicator',design:'balanced'};
  for(const state of ['disconnected','needs-service','retrofitting','deposit-empty','output-full','power-limited','heat-limited','new-blocker']){
    assert.doesNotMatch(machineStatus(m,{states:{1:state}}),/Online|Operating/);
  }
  assert.match(machineStatus(m,{states:{1:'active'},powerFactor:0}),/Waiting for power/);
  assert.match(machineStatus(m,{states:{1:'active'},powerFactor:.5}),/50%/);
});
