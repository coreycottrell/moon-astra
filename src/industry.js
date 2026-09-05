// Rates are milli-units per simulation second; 1,000 milli-units = 1 resource.
export const ECONOMY_VERSION=2;
export const PRODUCTION={standardHarvester:300,bulkHarvester:400,refinery:100,rockPerMetal:2};
export const MIND={capacityPerNode:4,costs:{miner:1,refinery:2,replicator:4},priority:['miner','refinery','replicator']};

// Whole machines receive attention. Shortages never create fractional workers.
// Nodes and solar can always be built manually, so an idle colony can recover.
export function mindFor(w,claimId){
  const c=w.claims.find(c=>c.id===claimId),machines=w.machines.filter(m=>m.claimId===claimId);
  const nodes=machines.filter(m=>m.type==='compute').length,capacity=nodes*MIND.capacityPerNode;
  const activeIds=[],blockedIds=[],states={};let used=0,requested=0;
  for(const type of MIND.priority)for(const m of machines.filter(m=>m.type===type).sort((a,b)=>a.id-b.id)){
    if(c.paused){states[m.id]='paused';continue;}
    if(type==='replicator'&&m.mode==='off'){states[m.id]='off';continue;}
    if(type==='miner'&&c.deposit<=0){states[m.id]='deposit-empty';continue;}
    if(type==='refinery'&&c.rock<PRODUCTION.rockPerMetal&&!machines.some(m=>m.type==='miner'&&activeIds.includes(m.id))){states[m.id]='no-feedstock';continue;}
    const cost=MIND.costs[type];requested+=cost;
    if(used+cost<=capacity){used+=cost;activeIds.push(m.id);states[m.id]='active';}
    else{blockedIds.push(m.id);states[m.id]='mind-limited';}
  }
  return {nodes,capacity,used,requested,requiredNodes:Math.ceil(requested/MIND.capacityPerNode),activeIds,blockedIds,states};
}
