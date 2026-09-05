import {BUILDINGS,MIND,DESIGNS,PRODUCTION} from './catalog.js';
import {stock} from './state.js';
import {distanceOnMoon} from '../geography.js';

export function gridFor(w,cid){
  const machines=w.machines.filter(m=>m.claimId===cid),connected=new Set(machines.filter(m=>m.type==='seed').map(m=>m.id)),edges=[];
  let added=true;while(added){added=false;for(const m of machines){if(connected.has(m.id)||m.condition<=0||!m.enabled)continue;
    const source=machines.find(s=>connected.has(s.id)&&s.condition>0&&s.enabled&&distanceOnMoon(s,m)<=(['seed','relay'].includes(s.type)?160:70));
    const corridor=w.corridors.find(t=>t.claimId===cid&&t.complete&&((connected.has(t.fromId)&&t.toId===m.id)||(connected.has(t.toId)&&t.fromId===m.id)));
    if(source||corridor){connected.add(m.id);edges.push({from:source?.id||(corridor.fromId===m.id?corridor.toId:corridor.fromId),to:m.id,underground:!source});added=true;}
  }}
  return {connected:[...connected],edges};
}
export function industryFor(w,cid){
  const c=w.claims.find(c=>c.id===cid),machines=w.machines.filter(m=>m.claimId===cid),grid=gridFor(w,cid),connected=new Set(grid.connected);
  const live=m=>connected.has(m.id)&&m.condition>0&&m.enabled&&!m.upgrade&&!c.paused;
  const supply=machines.filter(live).reduce((n,m)=>n+Math.max(0,BUILDINGS[m.type].power)*DESIGNS[m.design||'balanced'].rate,0);
  const thermalNodes=4+machines.filter(m=>m.type==='radiator'&&live(m)).length*4+(w.projects.find(p=>p.id==='thermal-commons')?.complete?2:0);
  const nodes=machines.filter(m=>m.type==='compute'),supported=[];let nodePower=0,nodeHeat=0;
  for(const m of nodes.filter(live)){const profile=DESIGNS[m.design||'balanced'];if(nodePower+4*profile.heat<=supply&&nodeHeat+profile.heat<=thermalNodes){supported.push(m);nodePower+=4*profile.heat;nodeHeat+=profile.heat;}}
  const supportedSet=new Set(supported.map(m=>m.id)),researchPerSecond=supported.reduce((n,m)=>n+Math.floor(1000*DESIGNS[m.design||'balanced'].rate),0);
  const shared=w.projects[0]?.complete?2:0,capacity=supported.length*4+(c.paused?0:1+shared);
  const crewCount=w.robots.filter(r=>r.workClaimId===cid&&!r.reconditioning).length,crewSlots=Math.min(crewCount,c.maxActive,Math.floor(capacity*4));
  let used=crewSlots*.25,requested=crewCount*.25,demand=nodePower;
  const activeIds=[],blockedIds=[],states={};
  for(const m of machines){
    if(c.paused)states[m.id]='paused';else if(!m.enabled)states[m.id]='off';else if(m.condition<=0)states[m.id]='needs-service';else if(m.upgrade)states[m.id]='retrofitting';else if(!connected.has(m.id))states[m.id]='disconnected';
    else if(m.type==='compute')states[m.id]=supportedSet.has(m.id)?'active':(nodeHeat+DESIGNS[m.design||'balanced'].heat>thermalNodes?'heat-limited':'power-limited');
    else if(!BUILDINGS[m.type].mind){states[m.id]='active';demand+=Math.max(0,-BUILDINGS[m.type].power)*DESIGNS[m.design||'balanced'].heat;}
  }
  for(const type of MIND.priority)for(const m of machines.filter(m=>m.type===type).sort((a,b)=>a.id-b.id)){
    if(states[m.id])continue;
    const noWork=(type==='workshop'&&m.mode==='off'&&!m.fabrication)||(type==='replicator'&&m.mode==='off'&&!m.fabrication)||(type==='robotfactory'&&!m.fabrication&&!m.queue?.length)||(type==='tunnel'&&!w.corridors.some(t=>t.fromId===m.id&&!t.complete));
    if(noWork){states[m.id]='off';continue;}
    if(type==='miner'&&c.deposit<=0){states[m.id]='deposit-empty';continue;}
    if(type==='miner'&&stock(m.inventory,'rock')>=40000){states[m.id]='output-full';continue;}
    if(type==='refinery'&&stock(m.inventory,'rock')<200){states[m.id]='no-feedstock';continue;}
    if(type==='refinery'&&stock(m.inventory,'metal')>=30000){states[m.id]='output-full';continue;}
    let required;
    if(type==='workshop'&&!m.fabrication)required=m.mode==='spares'?{metal:1000,parts:1000}:{metal:2000};
    if(type==='robotfactory'&&!m.fabrication)required=m.queue?.[0]?.cost;
    if(type==='replicator'&&!m.fabrication&&!m.pendingBuild)required=m.planCost;
    if(required&&Object.entries(required).some(([item,n])=>stock(m.inventory,item)<n)){states[m.id]='no-feedstock';continue;}
    const cost=BUILDINGS[type].mind;requested+=cost;
    if(used+cost<=capacity){used+=cost;activeIds.push(m.id);states[m.id]='active';demand-=BUILDINGS[type].power*DESIGNS[m.design||'balanced'].heat;}
    else{blockedIds.push(m.id);states[m.id]='mind-limited';}
  }
  // Essential mind electronics take their full budget first. Industrial loads
  // share the remainder, so a brownout cannot create unpowered supervision.
  const industrialDemand=Math.max(0,demand-nodePower),remaining=Math.max(0,supply-nodePower),factor=industrialDemand?Math.min(1,remaining/industrialDemand):1;
  const productive=m=>states[m.id]==='active'?factor*DESIGNS[m.design||'balanced'].rate:0;
  let harvestPerSecond=0,refinePerSecond=0;
  for(const m of machines){if(m.type==='miner')harvestPerSecond+=Math.floor(c.yieldPerSecond*productive(m));if(m.type==='refinery')refinePerSecond+=Math.min(Math.floor(stock(m.inventory,'rock')/2),Math.floor(PRODUCTION.refinery*productive(m)));}
  return {nodes:nodes.length,supportedNodes:supported.length,thermalNodes,thermalUsed:nodeHeat,researchPerSecond,capacity,used,requested,requiredNodes:Math.max(0,Math.ceil((requested-1-shared)/4)),crewSlots,crewReserved:crewSlots*.25,activeIds,blockedIds,states,harvestPerSecond,refinePerSecond,powerFactor:factor,power:{supply,demand,factor},grid};
}
export const mindFor=(w,cid)=>industryFor(w,cid);
export const powerFor=(w,cid)=>industryFor(w,cid).power;
