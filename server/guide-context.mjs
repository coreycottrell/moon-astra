import {BUILDINGS,ROBOTS,TECH,DESIGNS,MIND,STAGES,UNIT} from '../src/foundry/catalog.js';
import {machineStatus} from '../src/foundry/machine-status.js';
import {distanceOnMoon} from '../src/geography.js';
import {nextObjective} from '../src/guidance.js';

const units=o=>Object.fromEntries(Object.entries(o||{}).map(([k,n])=>[k,n/UNIT]));
const take=(o,keys)=>Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));

export const GUIDE_RULES={
  purpose:'Explain Moon Foundry as implemented. You cannot execute game commands. Recommendations are not actions or completed deliveries.',
  quantities:'Resource stocks and costs in this context are whole game units. Condition is percent. Time is seconds unless a field explicitly says ticks; one world tick is one second.',
  construction:'Placing a site reserves materials. Robots collect them, travel, unload, then prepare, assemble, connect and commission. Accepted commands and reserved cargo do not mean a building is finished. A balanced factory layout is solar + harvester + refinery, not a replicator.',
  resources:'Colony available resources are distributed among machines and depots, excluding reserved cargo and committed construction. Production consumes inventory at the specific machine, never distant colony totals. Auto logistics schedules physical deliveries; builders and service may be busy elsewhere. More harvesters cannot fix a blocked freight chain.',
  mind:'A supported mind node gives 4 slots; the seed gives 1; completed first-federation adds 2 per settlement. Each supervised robot reserves 0.25 slots, including idle robots in the active crew allowance. Industry priority and current used/free allocation are authoritative. An idle program or empty foundry queue reserves no industry slots. Starting both machines may exceed the currently free slots even if either fits alone.',
  power:'Seed supplies 8, solar 12. Mind nodes take their required power first. Industrial loads share remaining power; a brownout slows production. Nodes also need a live grid, condition and cooling. Initial cooling supports 4 balanced nodes; each connected radiator adds 4. Connected solar is necessary; total unconnected panels do not count.',
  programs:'Replicators start with output off; choose an Output under Settlement > Industry. Robot foundries start with no orders; choose a robot in Industry. Those idle labels do not mean failed power. Replicator reproduction specifically requires Supported reproduction research and the federation; ordinary unlocked machine outputs do not.',
  production:'Harvester output is local and pauses at 40 rock. Refinery uses 2 rock per metal, up to 6 metal/min, and pauses at 30 metal. Workshop parts: 2 metal => 1 part in 12 powered seconds. Spares: 1 metal + 1 part => 2 spares in 18 powered seconds. Workshop output waits at 8 units. Fabrication, freight, work and commissioning all take time.',
  maintenance:'Machines and moving/working robots wear. Service crew consume a physical spare and need an accessible route. Preventive service starts earlier after service-loop research. Emergency reconditioning is for a robot below 35% with no task, service assignment, or current reconditioning: it must return to the seed and spend 240 seconds there, restoring 50 percentage points. A busy robot cannot be reconditioned immediately.',
  cooperation:'Crew loans and shipments use ordinary rules. A help request or board proposal is not a permission grant. Per-player project contribution is capped at 60% including reserved shipments. Delivered project materials still require crew assembly. Separate claims have separate supplies, programs and permissions.',
  world:'The server runs when browsers close. Visual rover trails are session-local; the viewer is not an authoritative physics or delivery ledger. Proposed whitepaper planetary features are not automatically implemented.',
  ui:{build:'Settlement > Build: choose Place prefabricated kit or Place construction site, then click a valid location on the terrain. Kits are used automatically; they cannot be selected from inventory in Industry. Escape exits placement. Start by commissioning a mind node: the seed’s one slot is already reserved for four starting crew, leaving none for industrial machines.',industry:'Settlement > Industry: output programs, robot orders, on/off, local inventories and freight. This panel cannot place building kits.',crew:'Settlement > Crew: active crew, site allocation, condition and recovery.',research:'Settlement > Research: prerequisites and progress.',together:'Settlement > Together: projects, neighbors and threaded board.',help:'Settlement > AI & ops: directed help requests to actual neighbors.'},
  buildings:BUILDINGS,
  robots:Object.fromEntries(Object.entries(ROBOTS).map(([k,r])=>[k,{...r,cost:units(r.cost),capacity:r.capacity/UNIT,assembly:r.assembly/UNIT,service:r.service/UNIT}])),
  technologies:TECH,designs:DESIGNS,mindPriority:MIND.priority,constructionStages:STAGES,
};

export function guideContext(w,actor,{machineId,robotId}={}){
  const player=w.players.find(p=>p.id===actor),claim=w.claims.find(c=>c.id===player?.homeClaimId);
  if(!claim)throw Error('Guide player missing');
  const i=w.industry[claim.id],own=w.machines.filter(m=>m.claimId===claim.id);
  const selected=w.machines.find(m=>m.id===machineId),robot=w.robots.find(r=>r.id===robotId);
  const machine=m=>({
    ...take(m,['id','type','claimId','ownerId','enabled','mode','design','generation','productionStatus','pendingBuild','serviceBy']),
    name:BUILDINGS[m.type].name,conditionPercent:m.condition/100,inventory:units(m.inventory),produced:m.produced/UNIT,
    gridConnected:w.industry[m.claimId]?.grid.connected.includes(m.id),state:w.industry[m.claimId]?.states[m.id],explanation:machineStatus(m,w.industry[m.claimId]),
    distanceFromSeedMetres:Math.round(distanceOnMoon(m,w.claims.find(c=>c.id===m.claimId).home)),
    queue:(m.queue||[]).map(q=>({...take(q,['role','seconds']),cost:units(q.cost)})),
    fabrication:m.fabrication?{...take(m.fabrication,['role','output','machineType','seconds']),cost:units(m.fabrication.cost),progressSeconds:m.fabrication.progress/UNIT}:null,
    upgrade:m.upgrade||null,
  });
  const crew=r=>({...take(r,['id','name','role','claimId','workClaimId','status','task','serviceBy','reconditioning','loanUntil']),conditionPercent:r.condition/100,distanceTravelledMetres:Math.round(r.distanceTravelled),cargo:(r.cargo||[]).map(p=>({...p,amount:p.amount/UNIT})),routeWaypointsRemaining:r.path?.length||0});
  const machines=own.slice().sort((a,b)=>(i.states[a.id]==='active')-(i.states[b.id]==='active')||a.id-b.id).slice(0,220);
  const freight=w.freight.filter(f=>f.claimId===claim.id||f.toKind==='machine'&&own.some(m=>m.id===f.toId));
  const crewAll=w.robots.filter(r=>r.claimId===claim.id||r.workClaimId===claim.id);
  return {
    observedAt:new Date().toISOString(),tick:w.tick,ruleset:w.ruleset,economyVersion:w.economyVersion,
    player:{id:player.id,name:player.name,claimId:claim.id},
    gameSuggestedObjective:nextObjective(w,claim),
    settlement:{...take(claim,['id','name','paused','home','unlocks','research','maxActive','crewLimit','autoLogistics','kits','builders']),resourcesAvailable:units(take(claim,['metal','rock','parts','spares'])),depositRemaining:claim.deposit/UNIT,researchWorkAccumulated:claim.thought/UNIT,researchProgress:claim.researchProgress/UNIT,harvestYieldPerSecond:claim.yieldPerSecond/UNIT},
    capacity:{mind:{total:i.capacity,used:i.used,free:Math.max(0,i.capacity-i.used),requested:i.requested,crewReserved:i.crewReserved,supervisedCrew:i.crewSlots,nodes:i.nodes,supportedNodes:i.supportedNodes,blockedMachines:i.blockedIds},power:i.power,cooling:{used:i.thermalUsed,supported:i.thermalNodes},researchPerSecond:i.researchPerSecond/UNIT,harvestPerSecond:i.harvestPerSecond/UNIT,refinePerSecond:i.refinePerSecond/UNIT},
    focus:selected?{kind:'machine',...machine(selected)}:robot?{kind:'robot',...crew(robot)}:null,
    machines:machines.map(machine),crew:crewAll.map(crew),
    construction:w.jobs.filter(j=>j.claimId===claim.id).slice(0,100).map(j=>({...take(j,['id','type','phase','stage','crew','duration','remaining','prefab']),inventory:units(j.inventory),cost:units(j.cost),work:j.work/UNIT,stageWork:j.stageWork.map(n=>n/UNIT)})),
    freight:freight.slice(0,180).map(f=>({...take(f,['id','item','status','fromId','toKind','toId','robotId','ownerId']),amount:f.amount/UNIT})),
    freightSummary:{packets:freight.length,waiting:freight.filter(f=>f.status==='waiting').length,carried:freight.filter(f=>f.status==='carried').length},
    metalFlow:{
      available:claim.metal/UNIT,
      locations:own.filter(m=>m.inventory?.metal).map(m=>({machineId:m.id,type:m.type,metal:m.inventory.metal/UNIT})),
      reservedFreight:freight.filter(f=>f.item==='metal').reduce((n,f)=>n+f.amount,0)/UNIT,
      cargoDestinations:Object.values(freight.filter(f=>f.item==='metal').reduce((o,f)=>{const k=f.toKind+':'+f.toId;o[k]??={toKind:f.toKind,toId:f.toId,metal:0};o[k].metal+=f.amount/UNIT;return o;},{})),
      lifetimeRefineryOutput:own.filter(m=>m.type==='refinery').reduce((n,m)=>n+m.produced,0)/UNIT,
      metalInInstalledBuildings:own.reduce((n,m)=>n+(m.embodied?.metal||0),0)/UNIT,
      deliveredToProjects:w.projects.reduce((n,p)=>n+(p.contributions[actor]?.metal||0),0)/UNIT,
      refineryMetalPerMinuteNow:i.refinePerSecond/UNIT*60,
      workshops:own.filter(m=>m.type==='workshop').map(m=>({id:m.id,mode:m.mode,active:i.states[m.id]==='active',lifetimeOutput:m.produced/UNIT,lifetimeOutputCaveat:'Combined parts/spares output across past modes; do not assume all were parts without supporting history.',currentRecipe:m.mode==='parts'?{metalPerBatch:2,partsProduced:1,poweredSeconds:12,maxMetalPerMinute:10}:m.mode==='spares'?{metalPerBatch:1,partsPerBatch:1,sparesProduced:2,poweredSeconds:18,maxMetalPerMinute:60/18}:null,batchAlreadyPaid:m.fabrication?units(m.fabrication.cost):null})),
      caveat:'This is the current located inventory and known counters, not a complete historical accounting of exports, imports, past recipes or cancellations. Do not fabricate missing history or interpret cargo reservations as resource consumption.',
    },
    research:Object.entries(TECH).map(([id,t])=>({id,name:t.name,completed:claim.unlocks.includes(id),selected:claim.research===id,cost:t.cost,missingTechnologies:t.requires.filter(k=>!claim.unlocks.includes(k)),missingBuilding:t.building&&!own.some(m=>m.type===t.building)?t.building:null,missingProject:t.project&&!w.projects.find(p=>p.id===t.project)?.complete?t.project:null})),
    projects:w.projects.map(p=>({...take(p,['id','name','phase','complete','benefit','requires']),needs:units(p.needs),delivered:units(p.delivered),myContributions:units(p.contributions[actor]),work:p.work/UNIT,workDone:p.workDone/UNIT,myCargoReserved:units(w.freight.filter(f=>f.toKind==='project'&&f.toId===p.id&&f.ownerId===actor).reduce((o,f)=>(o[f.item]=(o[f.item]||0)+f.amount,o),{})),allPlayersCargoReserved:units(w.freight.filter(f=>f.toKind==='project'&&f.toId===p.id).reduce((o,f)=>(o[f.item]=(o[f.item]||0)+f.amount,o),{})),cargoOwnershipNote:'Only myCargoReserved belongs to this player. allPlayersCargoReserved includes neighbors and must never be counted as this player’s spending.'})),
    neighbors:w.players.filter(p=>p.id!==actor).map(p=>({name:p.name,claimId:p.homeClaimId,distanceMetres:Math.round(distanceOnMoon(claim.home,p.home)),mind:w.industry[p.homeClaimId]?.capacity,robots:w.robots.filter(r=>r.claimId===p.homeClaimId).length})),
    recentEvents:w.events.filter(e=>!e.claimId||e.claimId===claim.id).slice(-15),
    board:w.board.filter(p=>!p.closed).slice(-8).map(p=>({...take(p,['id','actor','title','body','request']),replies:p.replies?.slice(-3)||[]})),
    coverage:{machinesShown:machines.length,machinesTotal:own.length,freightShown:Math.min(180,freight.length),freightTotal:freight.length,constructionLimit:100,board:'Last 8 open threads with last 3 replies each. Full focused machine included separately. Other settlements are summaries; do not invent their inventories.'},
  };
}
