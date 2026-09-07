import {snapshot} from './snapshot.mjs';
const fact=(label,value,unit)=>({label,value,...(unit?{unit}:{})});
export function fromGuide(c,{ownerId=c.player.id,unlockedLevel=2}={}){
  const byItem={};for(const f of c.freight){byItem[f.item]??={packets:0,waiting:0,carried:0,units:0};const item=byItem[f.item];item.packets++;if(f.status==='waiting')item.waiting++;if(f.status==='carried')item.carried++;item.units+=f.amount;}
  const machines=c.machines,crew=c.crew,mind=c.capacity.mind;
  const fullFreight=c.coverage.freightShown===c.coverage.freightTotal;
  const fullMachines=c.coverage.machinesShown===c.coverage.machinesTotal;
  const facts={
    'mind.free':fact('Unused attention',mind.free,'mind'),
    'mind.supportedNodes':fact('Supported mind nodes',mind.supportedNodes,'nodes'),
    'mind.builtNodes':fact('Built mind nodes',mind.nodes,'nodes'),
    'crew.cap':fact('Maximum active crew',c.settlement.maxActive,'robots'),
    'crew.total':fact('Robots in this observation',crew.length,'robots'),
    'crew.capLimitedIds':fact('Robots limited by the crew ceiling',crew.filter(r=>r.status==='crew-limited').map(r=>r.id).sort((a,b)=>a-b)),
    'crew.mindLimitedIds':fact('Robots limited by supervision',crew.filter(r=>r.status==='mind-limited').map(r=>r.id).sort((a,b)=>a-b)),
    'crew.mindPerRobot':fact('Mind per supervised robot',.25,'mind'),
    'freight.coverageComplete':fact('All freight packets included',fullFreight),
    'freight.byItemShown':fact('Freight packets by resource in this observation',byItem),
    'freight.rockPacketsShown':fact('Rock packets included',byItem.rock?.packets||0,'packets'),
    'freight.waitingTotal':fact('Waiting freight packets',c.freightSummary.waiting,'packets'),
    'metal.available':fact('Colony metal available',c.metalFlow.available,'metal'),
    'metal.reservedFreight':fact('Metal reserved in freight',c.metalFlow.reservedFreight,'metal'),
    'machines.coverageComplete':fact('All owned machines included',fullMachines),
    'machines.localShortageIds':fact('Machines with a local feedstock shortage',machines.filter(m=>m.state==='no-feedstock').map(m=>m.id).sort((a,b)=>a-b)),
    'recipe.refinery':fact('Refinery material conversion',{rock:2,metalProduced:1,metalConsumed:0}),
    'history.completeConsumption':fact('Complete historical consumption ledger available',false),
    'traffic.jamEstablished':fact('A physical jam is established by this snapshot',false),
  };
  return snapshot({domain:'moon',ownerId,ruleset:`${c.ruleset}/economy-${c.economyVersion}`,tick:c.tick,observedAt:c.observedAt,
    support:{nodes:mind.supportedNodes,freeMind:mind.free,unlockedLevel},facts,
    unknowns:['Per-route waiting history','Completed-trip time series','Exact lifetime recipe consumption'],
    coverage:{source:'Authenticated game observation',freightPacketsIncluded:c.freight.length,freightPacketsTotal:c.coverage.freightTotal,machinesIncluded:machines.length,machinesTotal:c.coverage.machinesTotal,commandsEnabled:false,researchGate:'Standalone engine configuration; game research integration is not installed'}});
}
const v=(s,id)=>s.facts[id]?.value;
export const traffic={id:'moon.traffic',version:1,level:2,objective:'Distinguish crew ceiling, actual mind shortage and missing route evidence.',candidates:s=>[
  {id:'review-crew-cap',label:'Review the active crew ceiling before adding infrastructure',eligible:v(s,'crew.capLimitedIds')?.length>0&&v(s,'mind.free')>=.25,requiredFacts:['crew.cap','crew.capLimitedIds','mind.free','traffic.jamEstablished']},
  {id:'review-mind-support',label:'Restore supported mind capacity for the waiting crew',eligible:v(s,'crew.mindLimitedIds')?.length>0&&v(s,'mind.free')<.25,requiredFacts:['crew.mindLimitedIds','mind.free','mind.supportedNodes']},
  {id:'measure-route-waits',label:'Measure route waiting before choosing new infrastructure',eligible:true,requiredFacts:['freight.waitingTotal','traffic.jamEstablished']},
]};
export const resources={id:'moon.resources',version:1,level:2,objective:'Explain resource locations and current delivery constraints without inventing recipe inputs or history.',candidates:s=>[
  {id:'review-deliveries',label:'Review delivery progress to machines with local input shortages',eligible:v(s,'machines.localShortageIds')?.length>0&&v(s,'metal.available')>0,requiredFacts:['machines.localShortageIds','freight.rockPacketsShown','freight.coverageComplete','recipe.refinery','metal.reservedFreight']},
  {id:'collect-ledger',label:'Collect a consumption ledger before assigning historical spending',eligible:true,requiredFacts:['history.completeConsumption','metal.available']},
]};
