import {BUILDINGS,ROBOTS} from './catalog.js';
import {distanceOnMoon,offsetPosition} from '../geography.js';
import {localXY,distance} from './navigation.js';

export const DEPOT_LIMITS={bays:6,initialBays:2,apronRadius:19,bayRadius:13,liftRadius:2.5,storage:240000,loadingBays:2,handlingSeconds:3};
export const TUNNEL_TIERS={
 basic:{name:'Single occupied line',capacity:1,perDirection:1,tech:'tunneling',metal:0,parts:0,work:0},
 convoy:{name:'Scheduled convoys',capacity:3,perDirection:3,tech:'tunnel-control',metal:12,parts:4,work:120},
 passing:{name:'Passing bay',capacity:4,perDirection:2,tech:'tunnel-passing',metal:24,parts:8,work:180},
 twin:{name:'Twin tunnels',capacity:8,perDirection:4,tech:'tunnel-twins',metal:40,parts:12,work:240},
};
export const LIFT_SECONDS=4,LIFT_DEPTH=8,LIFT_COST={metal:6000,parts:2000};
export const liftReady=t=>!!(t.complete&&t.transport&&(!t.liftVersion||t.terminals?.from.installed&&t.terminals?.to.installed)&&!t.upgradeJobId);
export const routePaused=(w,t)=>!!w.claims.find(c=>c.id===t.claimId)?.paused;
export const tierFor=t=>TUNNEL_TIERS[t.tier]||TUNNEL_TIERS.basic;
export const depotEnvelope=m=>m.type==='depot'&&m.depotHub?DEPOT_LIMITS.apronRadius:(m.radius??BUILDINGS[m.type]?.radius??7);
export function depotBay(m,slot){const a=(m.rotation||0)+slot*Math.PI/3;return {...offsetPosition(m.lat,m.lon,Math.cos(a)*DEPOT_LIMITS.bayRadius,Math.sin(a)*DEPOT_LIMITS.bayRadius),rotation:Math.PI/2-a};}
export function endpointCapacity(m){return m.type==='depot'?(m.depotHub?.bays||0):m.type==='seed'?6:2;}
export function occupiedPorts(w,m,ignore){return w.corridors.filter(t=>t.id!==ignore&&t.liftVersion).flatMap(t=>t.fromId===m.id?[t.terminals.from.slot]:t.toId===m.id?[t.terminals.to.slot]:[]);}
export function apronClear(w,m){
 return [...w.machines,...w.jobs.filter(j=>!j.infrastructure),...w.projects].every(o=>o.id===m.id||distanceOnMoon(m,o)>=DEPOT_LIMITS.apronRadius+depotEnvelope(o)+4)
 &&w.corridors.every(t=>!t.portals||t.fromId===m.id||t.toId===m.id||Object.values(t.portals).flat().every(p=>distanceOnMoon(m,p)>DEPOT_LIMITS.apronRadius+4));
}
export function planLiftTerminals(w,from,to,{ignore}={}){
 const obstacles=[...w.machines,...w.jobs.filter(j=>!j.infrastructure),...w.projects,...w.corridors.filter(t=>t.id!==ignore).flatMap(t=>t.portals?Object.values(t.portals).flat().map(p=>({...p,radius:2.5})):[])];
 const terminals={};
 for(const [side,m,other] of [['from',from,to],['to',to,from]]){
  const used=occupiedPorts(w,m,ignore),capacity=endpointCapacity(m),slots=Array.from({length:capacity},(_,i)=>i).filter(i=>!used.includes(i));
  if(!slots.length)return {error:m.type==='depot'&&!m.depotHub?'DEPOT_APRON_REQUIRED':'PORTS_FULL',message:m.type==='depot'&&!m.depotHub?`Depot #${m.id} needs a clear six-bay apron retrofit first`:`${BUILDINGS[m.type].name} #${m.id} has all ${capacity} lift connections reserved`};
  const toward=localXY(m,other),angle=Math.atan2(toward.y,toward.x),candidates=m.type==='depot'?slots.map(slot=>({slot,loc:depotBay(m,slot)})):Array.from({length:16},(_,n)=>{const a=angle+n*Math.PI/8;return {slot:slots[0],loc:{...offsetPosition(m.lat,m.lon,Math.cos(a)*(BUILDINGS[m.type].radius+6),Math.sin(a)*(BUILDINGS[m.type].radius+6)),rotation:Math.PI/2-a}};});
  const available=candidates.filter(({loc})=>obstacles.every(o=>distanceOnMoon(o,loc)>(o.radius??BUILDINGS[o.type]?.radius??7)+3)&&Object.values(terminals).every(t=>distanceOnMoon(t.loc,loc)>6)).sort((a,b)=>distanceOnMoon(a.loc,other)-distanceOnMoon(b.loc,other));
  if(!available.length)return {error:'PORTAL_BLOCKED',message:`Leave clear ground for a lift beside ${BUILDINGS[m.type].name} #${m.id}`};
  terminals[side]={...available[0],installed:false,jobId:null};
 }
 return {terminals,portals:{from:[terminals.from.loc,terminals.from.loc],to:[terminals.to.loc,terminals.to.loc]}};
}
export const activeRides=(w,t)=>w.robots.filter(r=>r.tunnelRide?.corridorId===t.id&&r.tunnelRide.stage!=='approach');
export function elevatorsFor(t){return t.elevators??={from:{depth:0},to:{depth:0}};}
export function stepEmptyElevators(w){
 for(const t of w.corridors){if(!t.liftVersion||w.claims.find(c=>c.id===t.claimId)?.paused)continue;
  for(const lift of Object.values(elevatorsFor(t)))if(lift.returning){lift.returning--;lift.depth=-LIFT_DEPTH*lift.returning/LIFT_SECONDS||0;}
 }
}
export function tunnelStatus(w,t){
 const rides=activeRides(w,t),tier=tierFor(t);
 if(!t.complete)return {label:'EXCAVATING',occupied:0,capacity:tier.capacity};
 if(!t.transport)return {label:'UTILITY ONLY',occupied:0,capacity:0};
 if(!liftReady(t))return {label:t.upgradeJobId?'UPGRADING':'INSTALLING LIFTS',occupied:rides.length,capacity:tier.capacity};
 if(t.liftVersion&&routePaused(w,t))return {label:'PAUSED',occupied:rides.length,capacity:tier.capacity,eta:null};
 if(!t.liftVersion)return {label:'LEGACY FREIGHT',occupied:rides.length,capacity:null};
 const lead=rides[0],ride=lead?.tunnelRide,speed=lead?ROBOTS[lead.role].speed*(.5+.5*Math.max(.2,lead.condition/10000))*1.5:1;
 const pending=ride?['approach','boarding'].includes(ride.stage)?3*LIFT_SECONDS:ride.stage==='lowering'?(ride.liftRemaining||0)+2*LIFT_SECONDS:['transit','passing','exit-wait'].includes(ride.stage)?2*LIFT_SECONDS:ride.stage==='calling-lift'?(ride.liftRemaining||0)+LIFT_SECONDS:ride.liftRemaining||0:0;
 const eta=lead?Math.ceil(Math.max(0,ride.length-ride.progress)/speed+pending):null;
 return {label:rides.length?'OCCUPIED':'CLEAR',occupied:rides.length,capacity:tier.capacity,robotId:lead?.id,robotName:lead?.name,robotStatus:lead?.status,eta,waiting:w.robots.filter(r=>r.tunnelRide?.corridorId===t.id&&r.tunnelRide.stage==='approach').length};
}
export function liftSurfaceReservations(w,home,exclude){
 const points=[];
 for(const r of w.robots){const ride=r.tunnelRide;if(r.id===exclude||!ride?.liftVersion)continue;
  const loc=['boarding','lowering'].includes(ride.stage)?ride.entry:['calling-lift','raising','leaving'].includes(ride.stage)?ride.exit:null;
  if(loc)points.push({...localXY(home,loc),radius:2.5});
 }return points;
}
export function connectedDepot(w,m){
 if(!m.depotId)return null;const depot=w.machines.find(d=>d.id===m.depotId&&d.type==='depot'&&d.claimId===m.claimId&&d.enabled&&d.condition>0);
 return depot&&w.corridors.some(t=>liftReady(t)&&(t.fromId===m.id&&t.toId===depot.id||t.toId===m.id&&t.fromId===depot.id))?depot:null;
}
export function depotFree(w,m,item){
 if(m.type!=='depot'||!m.depotHub)return Infinity;
 const stored=Object.values(m.inventory).reduce((a,b)=>a+b,0),inbound=w.freight.filter(f=>f.toKind==='machine'&&f.toId===m.id).reduce((n,f)=>n+f.amount,0);
 return Math.max(0,DEPOT_LIMITS.storage-stored-inbound);
}
export function suggestedLinks(w,depot){
 return w.machines.filter(m=>m.claimId===depot.claimId&&m.id!==depot.id&&['miner','refinery','workshop','robotfactory','replicator','depot','seed','tunnel'].includes(m.type)).map(m=>{
  const length=Math.ceil(distanceOnMoon(m,depot)),existing=w.corridors.find(t=>t.fromId===m.id&&t.toId===depot.id||t.toId===m.id&&t.fromId===depot.id),flow=w.freight.filter(f=>f.fromId===m.id||f.toId===m.id).reduce((n,f)=>n+f.amount/1000,0);
  const plan=existing?null:planLiftTerminals(w,m,depot);
  return {machineId:m.id,name:BUILDINGS[m.type].name,length,metal:length*.5+12,parts:length*.1+4,flow,existingId:existing?.id,reason:existing?'Already connected':length<20?'Too close; use a surface lane':length>500?'Beyond 500 m':plan?.message||null,score:flow/(length+20)};
 }).sort((a,b)=>!!a.reason-!!b.reason||b.score-a.score||a.length-b.length);
}
