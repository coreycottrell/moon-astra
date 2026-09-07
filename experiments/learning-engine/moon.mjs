import {observation} from './core.mjs';
const value=(o,id)=>o.facts.find(f=>f.id===id)?.value;
const fact=(id,value,unit)=>({id,value,...(unit?{unit}:{})});
export function moonObservation(context,previous){
  const c=context,m=c.capacity.mind;
  const facts=[
    fact('mind',m,'attention slots; nodes are counts'),
    fact('crew-cap',{maxActive:c.settlement.maxActive,total:c.crew.length,supervised:m.supervisedCrew}),
    fact('crew-status',c.crew.map(r=>({id:r.id,status:r.status,conditionPercent:r.conditionPercent,distanceMetres:r.distanceTravelledMetres,taskKind:r.task?.kind||null}))),
    fact('cooling',c.capacity.cooling,'supported balanced nodes'),
    fact('power',c.capacity.power),fact('freight',c.freightSummary,'packets'),
    fact('metal',c.metalFlow,'whole resource units; lifetime counters are not a complete ledger'),
    fact('machines',c.machines.map(m=>({id:m.id,type:m.type,state:m.state,enabled:m.enabled,inventory:m.inventory}))),
    fact('tunnels',c.corridors.map(t=>({id:t.id,complete:t.complete,status:t.status,remainingMetal:t.remainingMetal,robotsOnRoute:t.robotsOnRoute}))),
    fact('rules',{mindPerRobot:.25,mindPerBalancedNode:4,seedMind:1,federationMindBonus:2,localInputRequired:true,reservationsAreConsumption:false,unsupportedNodesSupplyMind:false,partsRecipe:{metal:2,parts:1,poweredSeconds:12},noAutomaticExecution:true}),
  ];
  if(previous){
    if(c.tick<=previous.tick||c.ruleset!==previous.ruleset||c.player.claimId!==previous.player.claimId)throw Error('Incomparable observations');
    facts.push(fact('sample-window',{startTick:previous.tick,endTick:c.tick,elapsedSeconds:c.tick-previous.tick,availableMetalChange:c.metalFlow.available-previous.metalFlow.available,lifetimeRefinedChange:c.metalFlow.lifetimeRefineryOutput-previous.metalFlow.lifetimeRefineryOutput,freightPacketsBefore:previous.freightSummary.packets,freightPacketsAfter:c.freightSummary.packets,crew:c.crew.map(r=>{const old=previous.crew.find(x=>x.id===r.id);return {id:r.id,statusBefore:old?.status||null,statusAfter:r.status,distanceDeltaMetres:old?r.distanceTravelledMetres-old.distanceTravelledMetres:null};}),caveat:'Only endpoint samples. Intermediate status, task completions, route waits, imports and spending are unknown. Distance is rounded; inventory delta is not throughput or causal attribution.'}));
  }
  return observation({domain:'moon',ruleset:`${c.ruleset}/economy-${c.economyVersion}`,tick:c.tick,facts,coverage:{source:'live server read-only observation',...c.coverage,board:'excluded',samples:previous?2:1,completeConsumptionLedger:false,perRouteWaitHistory:false}});
}
export const trafficSkill={id:'traffic-diagnosis',version:1,objective:'Identify a supported immediate transport constraint; request measurement before proposing spatial infrastructure.',candidates:o=>{
  const mind=value(o,'mind'),crew=value(o,'crew-cap'),rs=value(o,'crew-status');
  return [
    {id:'review-crew-cap',label:'Explain the active crew ceiling; consider a bounded increase after checking service and congestion.',eligible:crew.maxActive<crew.total&&rs.some(r=>r.status==='crew-limited')&&mind.free>=.25,requiresEvidence:['crew-cap','crew-status','mind']},
    {id:'review-mind-support',label:'Explain actual supervision shortage; inspect power/cooling before adding nodes.',eligible:rs.some(r=>r.status==='mind-limited')&&mind.free<.25,requiresEvidence:['crew-status','mind']},
    {id:'measure-route-waits',label:'Collect route wait and task completion measurements before designing a new tunnel.',eligible:true,requiresEvidence:['freight']},
  ];
}};
export const resourceSkill={id:'resource-accounting',version:1,objective:'Distinguish located stock, current local bottlenecks, reserved deliveries and measured consumption; never invent historical accounting.',candidates:o=>{
  const metal=value(o,'metal'),machines=value(o,'machines');
  return [
    {id:'review-local-deliveries',label:'Inspect outstanding deliveries to machines lacking local feedstock despite colony reserves.',eligible:metal.available>0&&machines.some(m=>m.state==='no-feedstock'),requiresEvidence:['metal','machines','freight']},
    {id:'review-measured-parts-spend',label:'Review a parts production program whose measured metal consumption exceeds measured refining.',eligible:(value(o,'consumption-ledger')?.partsMetalConsumed||0)>(value(o,'consumption-ledger')?.refineryMetalProduced??Infinity),requiresEvidence:['consumption-ledger']},
    {id:'collect-consumption-ledger',label:'Collect a resource flow ledger before assigning unexplained historical spending.',eligible:true,requiresEvidence:['metal']},
  ];
}};
