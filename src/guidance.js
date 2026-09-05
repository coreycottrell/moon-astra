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
  if(c.paused)return {title:'Resume your settlement',body:'Your crew, production and research are paused. Your neighbors continue.'};
  const basics=[['compute','Bring the first mind online','Place a prefabricated mind node. Watch a robot collect the kit and assemble it.'],['miner','Harvest your claim','Place the harvester kit. Rock collects in its own hopper until a robot carries it onward.'],['refinery','Make the first local metal','Place the refinery kit within a short haul of the harvester. Crew deliver its rock.'],['solar','Support the growing load','Place a solar kit to give the machines more power.'],['workshop','Keep the colony repairable','Open Settlement → Build and place the workshop kit. Manufacture parts, then service spares.']];
  for(const [type,title,body] of basics)if(!machines.some(m=>m.type===type)){const j=jobs.find(j=>j.type===type);return j?{title:'A crew is building your '+(type==='compute'?'mind node':type),body:`Stage: ${j.phase}. ${j.crew.length} crew at the site. Open Settlement to inspect supplies, progress and routes.`}:{title,body};}
  const minds=mindFor(w,c.id);if(minds.blockedIds.length)return {title:'Give industry more attention',body:`${minds.blockedIds.length} machines need supervision. Add a powered mind node or reduce the active crew budget.`};
  if(!c.unlocks.includes('crew-production'))return {title:'Build the replacement loop',body:'Open Research. Factory planning → A repairable colony → Builders that build builders unlocks the robot foundry.'};
  if(!machines.some(m=>m.type==='robotfactory'))return {title:'Make your first new robot',body:'Build a robot foundry. In Industry, order a Mason or Atlas; crew deliver its metal, parts and service spare.'};
  if(!w.projects[0].complete)return {title:'Build something together',body:'Invite a neighbor. Deliver metal and parts to the first federation, then send crew to assemble it. Each settlement can supply at most 60%.'};
  if(!c.unlocks.includes('reproduction'))return {title:'Make intelligence change the design',body:'Research connected districts, modular designs and heat management. Certify better machines, then research supported reproduction.'};
  return {title:'A network that can reproduce',body:'Program a replicator to make replicators. Every daughter still needs a kit delivery, a construction crew, power, attention and maintenance.'};
}
