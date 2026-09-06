import {BUILDINGS,DESIGNS,UNIT,machineCost} from './catalog.js';

const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const readable=s=>String(s||'unknown').replaceAll('-',' ');

// Explain the server's allocation state without changing production or reserves.
// Old schema-3 observations already contain everything this view needs.
export function machineStatus(m,industry){
  const state=industry?.states?.[m.id],free=Math.max(0,(industry?.capacity||0)-(industry?.used||0));
  if(state==='paused')return 'Paused · resume this settlement to operate';
  if(state==='off'){
    if(!m.enabled)return 'Off · switched off; select Enable in Industry';
    if(m.type==='replicator'&&m.buildOrder){const p=m.buildOrder;if(p.waitingJobId)return `Waiting for construction #${p.waitingJobId} · crew must deliver, assemble and commission; fabrication mind is released`;if(p.status==='complete')return `Build order complete · ${p.completed} buildings commissioned`;if(p.status==='cancelled')return 'Build order stopped · its construction site was cancelled; review and submit a new order';if(p.status==='stopped')return 'Build order stopped · choose a new order or repeating output';}
    if(['replicator','workshop'].includes(m.type))return 'Idle · no output selected; choose Output in Industry';
    if(m.type==='robotfactory')return 'Idle · no robot orders; choose a robot to build in Industry';
    if(m.type==='tunnel')return 'Idle · no corridor queued; choose an endpoint in Industry';
    return 'Idle · no work queued';
  }
  if(state==='mind-limited')return `Waiting for mind · needs ${BUILDINGS[m.type].mind} slots; ${number(free)} free of ${number(industry.capacity)}. Add a powered mind node or release other work`;
  if(state==='power-limited')return `Waiting for power · this mind node needs ${number(4*DESIGNS[m.design||'balanced'].heat)} power; add connected solar capacity`;
  if(state==='heat-limited')return 'Waiting for cooling · add a connected radiator for more mind nodes';
  if(state==='disconnected')return 'Disconnected · connect to the seed grid with a relay or completed corridor';
  if(state==='needs-service')return 'Stopped · condition is depleted; service crew need a spare and a clear route';
  if(state==='retrofitting')return 'Retrofitting · waiting for the upgrade materials and service crew to finish';
  if(state==='deposit-empty')return 'Stopped · this claim’s regolith deposit is exhausted';
  if(state==='output-full')return 'Waiting for pickup · output storage is full; transport material out';
  if(state==='no-feedstock'){
    const required=m.type==='refinery'?{rock:200}:m.type==='workshop'?(m.mode==='spares'?{metal:1000,parts:1000}:{metal:2000}):m.type==='robotfactory'?m.queue?.[0]?.cost:m.type==='replicator'?(m.planCost||(BUILDINGS[m.mode]?machineCost(m.mode):null)):null;
    const missing=Object.entries(required||{}).filter(([item,n])=>(m.inventory?.[item]||0)<n).map(([item,n])=>`${number((n-(m.inventory?.[item]||0))/UNIT)} ${item}`);
    return `Waiting for delivery · ${missing.length?'needs '+missing.join(' + '):'inputs missing'} at this machine; colony stock must travel here`;
  }
  if(state==='active'){
    if(m.productionStatus==='bay-blocked')return 'Waiting to release robot · clear space around the foundry exit';
    if(m.pendingBuild&&m.productionStatus)return `Waiting to place completed kit · ${m.productionStatus==='no-free-site'?'no clear construction site nearby':readable(m.productionStatus)}`;
    if(BUILDINGS[m.type].mind&&m.type!=='compute'&&industry.powerFactor<1)return industry.powerFactor>0?`Reduced power · operating at ${Math.round(industry.powerFactor*100)}%; add connected solar capacity`:'Waiting for power · mind nodes use the available supply; add connected solar capacity';
    if(m.type==='workshop'&&!m.fabrication&&(m.inventory?.[m.mode]||0)>=8000)return 'Waiting for pickup · output storage is full; transport material out';
    return 'Operating';
  }
  return state?`Waiting · ${readable(state)}`:'Status unavailable · waiting for a world update';
}
