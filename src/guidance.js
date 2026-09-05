import {BLUEPRINT,PLANNER_WORK,PROJECT_COST,UNIT} from './shared-world.js';
import {offsetPosition,distanceOnMoon,direction,coordinates} from './geography.js';
import {mindFor} from './industry.js';

// Recognize the authored layout from its actual pieces, even after its event
// ages out of the recent log. This adds presentation, not new economic state.
export function factoryLayouts(w,claimId){
  const pieces=[...w.machines,...w.jobs].filter(m=>m.claimId===claimId);
  const complete=new Set(w.machines.map(m=>m.id));
  return pieces.filter(m=>m.type==='solar').flatMap(solar=>{
    const parts=BLUEPRINT.map(p=>{
      const target=offsetPosition(solar.lat,solar.lon,p.east,p.north);
      return pieces.find(m=>m.type===p.type&&distanceOnMoon(m,target)<.6);
    });
    if(parts.some(p=>!p))return [];
    const center=coordinates(parts.reduce((v,p)=>{const d=direction(p.lat,p.lon);return v.map((n,i)=>n+d[i]);},[0,0,0]));
    return [{id:solar.id,parts,center,completed:parts.filter(p=>complete.has(p.id)).length}];
  });
}
export function nextObjective(w,c){
  const machines=w.machines.filter(m=>m.claimId===c.id),jobs=w.jobs.filter(j=>j.claimId===c.id);
  if(c.paused)return {title:'Resume your settlement',body:'Use the pause button to resume production and finish construction. Your neighbors continue while you are paused.'};
  const basics=[['compute','Bring your first mind online','Place a mind node · 35 metal. Its 4 capacity supervises harvesters (1 each), refineries (2), and replicators (4). It also researches new plans.'],['miner','Harvest your claim','Place a harvester to collect rock from your local deposit.'],['refinery','Give rock a purpose','Place a refinery to turn local rock into construction metal.'],['solar','Catch the sunlight','Place a solar array to power this settlement.']];
  for(const [type,title,body] of basics)if(!machines.some(m=>m.type===type)){
    const job=jobs.find(j=>j.type===type);return job?{title:'Construction is underway',body:`Your ${type==='compute'?'mind node':type==='miner'?'harvester':type} will finish in ${job.remaining} seconds. Its materials are already supplied.`}:{title,body};
  }
  const minds=mindFor(w,c.id);
  if(minds.blockedIds.length){const pending=jobs.filter(j=>j.type==='compute');return {title:pending.length?'Mind capacity is being built':'Add mind capacity',body:`${minds.blockedIds.length} machine${minds.blockedIds.length===1?' is':'s are'} waiting for supervision. ${minds.nodes} / ${minds.requiredNodes} mind nodes needed for the current workload. ${pending.length?`${pending.length} node(s) under construction.`:'Build a mind node · 35 metal, or switch a replicator Off.'} Harvesting and refining get priority.`};}
  if(!c.unlocks.includes('factory-plans'))return {title:'Teach your factories',body:`${Math.floor(c.thought/UNIT)} / ${PLANNER_WORK/UNIT} research work. Keep the mind nodes powered to unlock layouts and replication programs.`};
  const replicas=machines.filter(m=>m.type==='replicator');
  if(!replicas.length){const job=jobs.find(j=>j.type==='replicator');return job?{title:'Your replicator is being built',body:`${job.remaining} seconds remain. Then open Settlement and choose what it should manufacture.`}:{title:'Build your first replicator',body:'Choose Replicator below · 65 metal. A balanced factory is three production machines; a replicator adds automated construction.'};}
  if(replicas.every(m=>m.mode==='off'))return {title:'Give your replicator a program',body:'Open Settlement → Tell a factory what to make. Choose an output such as Solar array; Off means it will wait.'};
  if(!w.project.complete){
    const delivered=w.project.contributions[c.ownerId]||0,reserved=w.shipments.filter(s=>s.project&&s.ownerId===c.ownerId).reduce((n,s)=>n+s.metal,0),remaining=Math.max(0,(PROJECT_COST/2-delivered-reserved)/UNIT);
    if(remaining)return {title:'Complete your federation share',body:`Ship ${remaining} more metal from Settlement. Each player supplies at most 60; the federation needs 120 delivered to unlock replicators that copy themselves.`};
    return {title:'Bring the federation online',body:`${w.project.delivered/UNIT} / 120 metal delivered. Your share is supplied; wait for shipments and your partners’ contributions.`};
  }
  if(!replicas.some(m=>m.mode==='replicator'))return {title:'Let a factory build factories',body:'The federation is online. Open Settlement and set a replicator’s output to Replicator. Its daughters inherit that program.'};
  return {title:'Feed the growing factory network',body:'Daughter replicators need mind capacity, metal, power, and space. Add mind nodes, production layouts, and solar as the network grows.'};
}
