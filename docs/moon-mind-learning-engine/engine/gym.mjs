// Deterministic discrete-event queue gym. An abstract transport laboratory,
// not Moon's terrain/robot physics. Same implementation runs on the report page.
import {canonical} from './protocol.mjs';
export const EVALUATOR_VERSION=1;
export const DEFAULT_SCENARIO=Object.freeze({domain:'moon-gym',workers:4,distance:220,arrivalSeconds:10,horizon:600,budget:60,seed:7});
export const OPTIONS=Object.freeze([
  {id:'keep-layout',label:'Keep the current layout',cost:0},
  {id:'extra-crew',label:'Assign two additional crew',cost:20},
  {id:'graded-road',label:'Grade a faster surface road',cost:40},
  {id:'single-lift',label:'Use one exclusive lift line',cost:55},
]);
export function checkScenario(s){
  if(!s||!['moon-gym','warehouse-gym'].includes(s.domain))throw Error('Unknown gym domain');
  for(const [key,min,max] of [['workers',1,20],['distance',40,500],['arrivalSeconds',3,60],['horizon',60,3600],['budget',0,100],['seed',1,2147483646]])if(!Number.isInteger(s[key])||s[key]<min||s[key]>max)throw Error('Invalid scenario '+key);
  return s;
}
export function scenarioKey(s){checkScenario(s);const {seed,...conditions}=s;return canonical({conditions,evaluator:EVALUATOR_VERSION});}
function arrivals(s){let seed=s.seed;const out=[];for(let t=0;t<s.horizon;){seed=(Math.imul(seed,1664525)+1013904223)>>>0;t+=s.arrivalSeconds*(.8+(seed/4294967296)*.4);if(t<s.horizon)out.push(t);}return out;}
export function simulate(s,choice='keep-layout'){
  checkScenario(s);const option=OPTIONS.find(o=>o.id===choice);if(!option||option.cost>s.budget)throw Error('Unavailable gym intervention');
  const workers=s.workers+(choice==='extra-crew'?2:0),free=Array(workers).fill(0),deliveries=[],waiting=[];
  const speed=choice==='graded-road'?2.1:1.5;
  const service=choice==='single-lift'?24+2*s.distance/(1.5*1.5)+8:2*s.distance/speed+8;
  let liftFree=0;
  for(const arrival of arrivals(s)){
    let index=0;for(let n=1;n<free.length;n++)if(free[n]<free[index])index=n;
    const begin=Math.max(arrival,free[index],choice==='single-lift'?liftFree:0),finish=begin+service;
    free[index]=finish;if(choice==='single-lift')liftFree=finish;
    if(finish<=s.horizon){deliveries.push({arrival,begin,finish,worker:index});waiting.push(begin-arrival);}
  }
  const requested=arrivals(s).length,complete=deliveries.length,mean=waiting.length?waiting.reduce((a,b)=>a+b,0)/waiting.length:0;
  const sorted=waiting.slice().sort((a,b)=>a-b),p95=sorted.length?sorted[Math.ceil(.95*sorted.length)-1]:null;
  const throughput=complete*60/s.horizon;
  // Fixed explicit objective: useful deliveries/minute minus intervention cost.
  // Queue tail is reported separately to avoid masking censored unfinished work.
  return {choice,cost:option.cost,requested,completed:complete,unfinished:requested-complete,throughputPerMinute:throughput,
    meanWaitCompleted:mean,p95WaitCompleted:p95,serviceSeconds:service,score:throughput-option.cost*.002,deliveries};
}
export function evaluate(s,choice){
  const baseline=simulate(s),trial=simulate(s,choice);
  return {kind:'simulated',evaluatorVersion:EVALUATOR_VERSION,scenarioKey:scenarioKey(s),seed:s.seed,baseline,trial,
    improvement:trial.score-baseline.score,confounders:[],note:'Matched synthetic arrivals. Simulator evidence only; no live colony intervention or physical layout prediction.'};
}
export function compare(s){return OPTIONS.filter(o=>o.cost<=s.budget).map(o=>evaluate(s,o.id)).sort((a,b)=>b.improvement-a.improvement||a.trial.cost-b.trial.cost);}
export function chooseWithMemory(s,episodes){
  const key=scenarioKey(s),eligible=OPTIONS.filter(o=>o.cost<=s.budget),scored=eligible.map(o=>{
    const samples=episodes.filter(e=>e.scenarioKey===key&&e.choice===o.id&&e.evaluatorVersion===EVALUATOR_VERSION);
    return {...o,trials:samples.length,meanImprovement:samples.length?samples.reduce((n,e)=>n+e.improvement,0)/samples.length:null};
  });
  const tested=scored.filter(x=>x.trials>0&&x.meanImprovement>0).sort((a,b)=>b.meanImprovement-a.meanImprovement||a.cost-b.cost);
  return {choice:tested[0]?.id||'keep-layout',reason:tested.length?'Best positive measured outcome in matching conditions':'No demonstrated improvement in matching conditions',candidates:scored};
}
