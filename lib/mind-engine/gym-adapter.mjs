import {snapshot} from './snapshot.mjs';
import {OPTIONS,DEFAULT_SCENARIO,checkScenario,scenarioKey,evaluate} from './gym.mjs';
export function gymSnapshot(scenario=DEFAULT_SCENARIO,{ownerId='lab',observedAt=new Date().toISOString(),nodes=8,freeMind=12,unlockedLevel=4}={}){
  checkScenario(scenario);
  return snapshot({domain:scenario.domain,ownerId,ruleset:'queue-gym-1',tick:0,observedAt,support:{nodes,freeMind,unlockedLevel},
    facts:{'scenario':{label:'Synthetic queue scenario',value:scenario},'queue.workers':{label:'Active transport crew',value:scenario.workers,unit:'workers'},'queue.distance':{label:'One-way distance',value:scenario.distance,unit:'metres'},'queue.arrivalSeconds':{label:'Mean interval between jobs',value:scenario.arrivalSeconds,unit:'seconds'},'queue.budget':{label:'Intervention budget',value:scenario.budget,unit:'cost units'}},
    unknowns:[],coverage:{source:'Synthetic seeded discrete-event simulator',physicalMoonSimulation:false,liveCommands:false}});
}
export const transportGym={id:'gym.transport',version:1,level:3,domains:['moon-gym','warehouse-gym'],objective:'Improve completed deliveries per minute less 0.002 times intervention cost; retain unfinished work as a separate metric.',
  candidates:s=>OPTIONS.map(o=>({...o,eligible:o.cost<=s.facts.scenario.value.budget,requiredFacts:['queue.workers','queue.distance','queue.arrivalSeconds','queue.budget']})),
  contextKey:s=>scenarioKey(s.facts.scenario.value),evaluate:(s,choice)=>evaluate(s.facts.scenario.value,choice)};
