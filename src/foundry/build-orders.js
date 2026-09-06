import {BUILDINGS,TECH,DESIGNS,UNIT,machineCost} from './catalog.js';
import {emit,fail} from './state.js';

export const BUILD_ORDER_LIMITS={steps:12,count:8,total:32};
export const BUILD_GROUPS={
  production:{name:'Production cell',steps:[{type:'solar',count:2},{type:'compute',count:1},{type:'miner',count:1},{type:'refinery',count:1}]},
  services:{name:'Service cell',steps:[{type:'solar',count:1},{type:'compute',count:1},{type:'workshop',count:1},{type:'depot',count:1}]},
  intelligence:{name:'Mind cluster',steps:[{type:'solar',count:2},{type:'radiator',count:1},{type:'compute',count:4}]},
};
export function validateBuildOrder(c,{steps,repeat=false,group}){
  if(typeof repeat!=='boolean')fail('INVALID_ORDER','Repeat must be true or false',400);
  if(group!==undefined){
    if(typeof group!=='string'||!Object.hasOwn(BUILD_GROUPS,group)||steps!==undefined)fail('INVALID_ORDER','Choose a group or a custom list, not both',400);
    steps=BUILD_GROUPS[group].steps;
  }
  if((repeat||group!==undefined)&&!c.unlocks.includes('coordinated-builds'))fail('TECH_LOCKED','Research Coordinated construction for groups and repeating cycles');
  if(!Array.isArray(steps)||!steps.length||steps.length>BUILD_ORDER_LIMITS.steps)fail('INVALID_ORDER','Use 1–12 build-order steps',400);
  let total=0;
  const checked=steps.map(s=>{
    if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['type','count'].includes(k))||!Object.hasOwn(BUILDINGS,s.type)||s.type==='seed')fail('INVALID_ORDER','Each step needs a catalog machine type and count',400);
    if(!Number.isSafeInteger(s.count)||s.count<1||s.count>BUILD_ORDER_LIMITS.count)fail('INVALID_ORDER','Each count must be a whole number from 1 to 8',400);
    const required=s.type==='replicator'?'reproduction':BUILDINGS[s.type].tech;
    if(required&&!c.unlocks.includes(required))fail('TECH_LOCKED',`Research ${TECH[required].name} before ordering ${BUILDINGS[s.type].name}`);
    total+=s.count;return {type:s.type,count:s.count};
  });
  if(total>BUILD_ORDER_LIMITS.total)fail('INVALID_ORDER','A cycle supports at most 32 buildings',400);
  return {steps:checked,repeat,group:group??null,index:0,completedInStep:0,completed:0,cycles:0,total,status:'running',waitingJobId:null};
}
// Keep legacy output off for ordered programs: rollback cannot turn a finite
// list into an unbounded single-output factory. Old programs remain unchanged.
export function replicatorOutput(m){
  const p=m.buildOrder;
  if(p)return p.status==='running'&&!p.waitingJobId?p.steps[p.index]?.type||'off':'off';
  return m.mode;
}
export function advanceBuildOrders(w){
  for(const m of w.machines){const p=m.buildOrder;if(!p?.waitingJobId)continue;
    if(w.jobs.some(j=>j.id===p.waitingJobId))continue;
    const built=w.machines.find(x=>x.id===p.waitingJobId&&x.claimId===m.claimId);
    p.waitingJobId=null;
    if(!built){if(p.status==='running'){p.status='cancelled';m.planCost=null;emit(w,'replicator.order-blocked','Build order stopped because its construction site was cancelled; review before restarting',{claimId:m.claimId,machineId:m.id});}continue;}
    p.completed++;
    if(p.status!=='running')continue;
    p.completedInStep++;
    if(p.completedInStep>=p.steps[p.index].count){p.completedInStep=0;p.index++;}
    if(p.index===p.steps.length){p.cycles++;if(p.repeat)p.index=0;else{p.status='complete';m.planCost=null;}}
    emit(w,p.status==='complete'?'replicator.order-completed':'replicator.order-advanced',p.status==='complete'?'Build order completed; all ordered buildings commissioned':'Build order advanced after commissioning',{claimId:m.claimId,machineId:m.id,builtId:built.id,completed:p.completed,cycles:p.cycles});
  }
}

// Advisory full-load budget, deliberately including idle enabled industry.
// This is not a reservation, terrain plan or promise that freight can keep up.
export function buildOrderEstimate(w,c,steps){
  const i=w.industry?.[c.id],connected=new Set(i?.grid.connected||[]);
  const live=w.machines.filter(m=>m.claimId===c.id&&m.enabled&&m.condition>0&&!m.upgrade&&connected.has(m.id));
  const crew=Math.min(c.maxActive,w.robots.filter(r=>r.workClaimId===c.id&&!r.reconditioning).length)*.25;
  let supply=0,demand=0,mind=crew,heat=0,cooling=i?.thermalNodes||4,nodes=0;
  for(const m of live){const b=BUILDINGS[m.type],d=DESIGNS[m.design||'balanced'];supply+=Math.max(0,b.power)*d.rate;demand+=Math.max(0,-b.power)*d.heat;mind+=b.mind;if(m.type==='compute'){heat+=d.heat;nodes++;}}
  const seedCapacity=c.paused?0:1+(w.projects.find(p=>p.id==='first-federation')?.complete?2:0);
  let metal=0,parts=0;const warnings=[];
  for(const [index,s] of steps.entries()){
    if(!BUILDINGS[s.type]||!Number.isSafeInteger(s.count)||s.count<1||s.count>8)continue;
    const b=BUILDINGS[s.type],cost=machineCost(s.type);metal+=cost.metal*s.count;parts+=cost.parts*s.count;
    supply+=Math.max(0,b.power)*s.count;demand+=Math.max(0,-b.power)*s.count;
    // Ordered daughters are commissioned off; their eventual 4 slots are still
    // shown in the planning budget so activating them is not a hidden expense.
    mind+=b.mind*s.count;if(s.type==='compute'){nodes+=s.count;heat+=s.count;}if(s.type==='radiator')cooling+=4*s.count;
    const issues=[];if(demand>supply)issues.push(`${Math.ceil(demand-supply)} more power`);if(heat>cooling)issues.push(`${Math.ceil(heat-cooling)} more node cooling`);if(mind>seedCapacity+nodes*4)issues.push(`${mind-seedCapacity-nodes*4} more mind`);
    if(issues.length)warnings.push(`After step ${index+1}: ${issues.join(', ')}`);
  }
  return {metal:metal/UNIT,parts:parts/UNIT,crew,mind,capacity:seedCapacity+nodes*4,powerSupply:supply,powerDemand:demand,heat,cooling,warnings};
}
