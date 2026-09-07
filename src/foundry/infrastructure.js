import {UNIT,LIMITS} from './catalog.js';
import {fail,emit,machine} from './state.js';
import {available,reserve} from './logistics.js';
import {LIFT_COST,TUNNEL_TIERS,DEPOT_LIMITS,apronClear,depotBay,planLiftTerminals,activeRides} from './lift-network.js';

function affordable(w,c,cost){if(Object.entries(cost).some(([item,n])=>available(w,c.id,item)<n))fail('INSUFFICIENT_MATERIALS','The settlement needs the materials quoted for this infrastructure work');}
function job(w,c,loc,cost,work,infrastructure,label){
 if(w.jobs.length+w.machines.length>=LIMITS.machines)fail('WORLD_CAPACITY','No room for another infrastructure construction job');
 const stageWork=[0,8*UNIT,work*UNIT,8*UNIT,8*UNIT],j={id:w.nextId++,type:'depot',...loc,radius:2,rotation:0,generation:0,design:'balanced',mode:'off',claimId:c.id,ownerId:c.ownerId,inventory:{},cost,prefab:false,infrastructure,label,phase:'supply',stage:0,stageWork,work:0,crew:[],duration:stageWork.reduce((a,b)=>a+b,0)/UNIT,remaining:stageWork.reduce((a,b)=>a+b,0)/UNIT,createdAt:w.tick};
 reserve(w,c.id,cost,'job',j.id,{purpose:'construction'});w.jobs.push(j);emit(w,'infrastructure.queued',label+': materials reserved for robot delivery and installation',{claimId:c.id,jobId:j.id});return j;
}
export function queueLiftFitout(w,c,t){
 const missing=['from','to'].filter(side=>!t.terminals[side].installed&&!t.terminals[side].jobId);
 if(!missing.length)fail('WORK_ALREADY_QUEUED','Both lifts are installed or already have construction crews requested');
 if(w.jobs.length+w.machines.length+missing.length>LIMITS.machines)fail('WORLD_CAPACITY','Both terminus construction jobs need capacity');
 affordable(w,c,Object.fromEntries(Object.entries(LIFT_COST).map(([k,v])=>[k,v*missing.length])));
 for(const side of missing)t.terminals[side].jobId=job(w,c,t.terminals[side].loc,{...LIFT_COST},45,{kind:'lift',corridorId:t.id,side},`${side==='from'?'Start':'End'} elevator for tunnel #${t.id}`).id;
 return {jobIds:missing.map(side=>t.terminals[side].jobId),cost:Object.fromEntries(Object.entries(LIFT_COST).map(([k,v])=>[k,v*missing.length]))};
}
export function expandDepot(w,c,m){
 if(m.depotHub?.jobId)fail('WORK_ALREADY_QUEUED','Finish the current depot expansion first');
 const current=m.depotHub?.bays||0,next=current+2;
 if(next>6)fail('DEPOT_COMPLETE','All six elevator bays are installed');
 const tech=next===4?'tunnel-control':next===6?'tunnel-passing':'tunneling';
 if(!c.unlocks.includes(tech))fail('TECH_LOCKED',`Research ${tech} before this depot expansion`);
 if(!m.depotHub&&!apronClear(w,m))fail('APRON_BLOCKED','This older depot lacks room for a six-bay apron. Place a new depot on clear ground; existing buildings are preserved.');
 const cost={metal:16000,parts:4000};affordable(w,c,cost);
 m.depotHub??={bays:0,version:1};
 const j=job(w,c,depotBay(m,current),cost,120,{kind:'depot-bays',machineId:m.id,bays:next},`Depot #${m.id}: install bays ${current+1}–${next}`);m.depotHub.jobId=j.id;
 return {jobId:j.id,baysAfterCommissioning:next,cost};
}
export function upgradeTunnel(w,c,t,tier){
 if(t.upgradeJobId)fail('WORK_ALREADY_QUEUED','Finish the current tunnel upgrade first');
 if(activeRides(w,t).length||w.robots.some(r=>r.tunnelRide?.corridorId===t.id))fail('TUNNEL_OCCUPIED','Let all robots exit and clear the connection before upgrading');
 const def=TUNNEL_TIERS[tier];if(!def)fail('INVALID_TIER','Choose basic, convoy, passing, or twin');
 if(!c.unlocks.includes(def.tech))fail('TECH_LOCKED',`Research ${def.tech} first`);
 if(!t.liftVersion){
  if(tier!=='basic')fail('FIT_LIFTS_FIRST','Install the two basic elevators before expanding this older utility/freight route');
  const from=machine(w,t.fromId),to=machine(w,t.toId),plan=planLiftTerminals(w,from,to,{ignore:t.id});if(plan.error)fail(plan.error,plan.message);
  affordable(w,c,{metal:12000,parts:4000});Object.assign(t,plan,{liftVersion:1,tier:'basic',transport:true});
  return {...queueLiftFitout(w,c,t),tier:'basic',endpointsPreserved:true};
 }
 if(!t.complete||!t.terminals.from.installed||!t.terminals.to.installed)fail('FIT_LIFTS_FIRST','Finish excavation and both elevators before widening the line');
 const order=Object.keys(TUNNEL_TIERS);if(order.indexOf(tier)!==order.indexOf(t.tier||'basic')+1)fail('INVALID_TIER','Upgrade one stage at a time');
 const lengthCost=tier==='twin'?Math.ceil(t.length*.5)*UNIT:0,cost={metal:def.metal*UNIT+lengthCost,parts:def.parts*UNIT};affordable(w,c,cost);
 const j=job(w,c,t.terminals.from.loc,cost,def.work,{kind:'tunnel-tier',corridorId:t.id,tier},`Tunnel #${t.id}: ${def.name}`);t.upgradeJobId=j.id;
 return {jobId:j.id,tierAfterCommissioning:tier,cost};
}
export function finishInfrastructure(w,j){
 const op=j.infrastructure;
 if(op.kind==='depot-bays'){const m=machine(w,op.machineId);if(m){m.depotHub.bays=op.bays;delete m.depotHub.jobId;}}
 else{const t=w.corridors.find(t=>t.id===op.corridorId);if(t){if(op.kind==='lift'){t.terminals[op.side].installed=true;t.terminals[op.side].jobId=null;}else{t.tier=op.tier;delete t.upgradeJobId;}}}
 // Installed infrastructure keeps its embodied bill for conservation/recovery.
 const target=op.machineId?machine(w,op.machineId):w.corridors.find(t=>t.id===op.corridorId);
 if(target){target.infrastructureCost??={};for(const [k,n] of Object.entries(j.embodied||{}))target.infrastructureCost[k]=(target.infrastructureCost[k]||0)+n;}
 if(op.kind==='lift'){const t=w.corridors.find(t=>t.id===op.corridorId);if(t?.terminals.from.installed&&t.terminals.to.installed){const ends=[machine(w,t.fromId),machine(w,t.toId)],depot=ends.find(m=>m.type==='depot'),facility=ends.find(m=>m.type!=='depot');if(depot&&facility&&!facility.depotId&&!['seed','solar','compute','relay','radiator'].includes(facility.type))facility.depotId=depot.id;}}
 emit(w,'infrastructure.completed',j.label+' commissioned by robot crew',{claimId:j.claimId,jobId:j.id,...op});
}
