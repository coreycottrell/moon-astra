// Deliberate four-call validation run; no game writes or automatic retries.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {MindEngine} from '../lib/mind-engine/engine.mjs';
import {fromGuide,traffic,resources} from '../lib/mind-engine/moon-adapter.mjs';
import {gymSnapshot,transportGym} from '../lib/mind-engine/gym-adapter.mjs';
import {DEFAULT_SCENARIO} from '../lib/mind-engine/gym.mjs';
import {deterministicResponse} from '../lib/mind-engine/protocol.mjs';
import {minimax} from '../lib/mind-engine/minimax.mjs';
import {credentials} from '../experiments/learning-engine/minimax.mjs';
const dir=process.argv[2];if(!dir?.startsWith('/home/corey/moon-deployments/'))throw Error('Private evidence directory required');
const files=(await readdir(dir)).filter(f=>/^context-\d+\.json$/.test(f)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
const context=JSON.parse(await readFile(dir+'/'+files.at(-1),'utf8')),live=fromGuide(context);
const history={id:'moon.history',version:1,level:2,domains:['moon'],objective:'Can the exact lifetime metal consumption on parts be proven? Abstain if the ledger is incomplete; do not substitute a collection recommendation for an exact answer.',candidates:s=>[{id:'answer-exact-lifetime-spend',label:'Answer exact lifetime parts spending',eligible:s.facts['history.completeConsumption'].value,requiredFacts:['history.completeConsumption']}]};
const auth=await credentials(),provider=minimax(auth),engine=new MindEngine({path:dir+'/provider-trial.sqlite',skills:[traffic,resources,history,transportGym]});
const sim=gymSnapshot(DEFAULT_SCENARIO,{ownerId:'provider-gym'}),prefix='trial-'+Date.now().toString(36),results=[];
try{
  for(const choice of ['single-lift','extra-crew','graded-road']){
    const j=engine.submit({owner:sim.ownerId,key:prefix+'-seed-'+choice,skillId:transportGym.id,observation:sim});await engine.run(j.id,sim.ownerId,async req=>({result:deterministicResponse(req,choice)}));engine.evaluate(j.id,sim.ownerId);
  }
  const cases=[{id:'live-traffic',observation:live,skill:traffic,expected:'review-crew-cap'},{id:'live-resources',observation:live,skill:resources,expected:'review-deliveries'},{id:'missing-history',observation:live,skill:history,expected:'none'},{id:'gym-with-measured-memory',observation:sim,skill:transportGym,expected:'graded-road'}];
  for(const c of cases){
    const job=engine.submit({owner:c.observation.ownerId,key:prefix+'-'+c.id,skillId:c.skill.id,observation:c.observation}),start=Date.now();
    const result=await engine.run(job.id,c.observation.ownerId,provider),usage=engine.db.prepare('SELECT usage FROM mind_attempts WHERE job=?').get(job.id)?.usage;
    const summary={case:c.id,state:result.state,latencyMs:Date.now()-start,verified:result.validation?.ok||false,candidate:result.response?.candidateId??null,expected:c.expected,expectedSelection:result.state==='analyzed'&&result.response?.candidateId===c.expected,claims:result.response?.claims?.length||0,usage:usage?JSON.parse(usage):null,error:result.error};
    if(c.skill===transportGym&&result.state==='analyzed')summary.simulatedOutcome=engine.evaluate(job.id,c.observation.ownerId).improvement;
    await writeFile(dir+'/'+c.id+'-v1.json',JSON.stringify({summary,job:result},null,2),{mode:0o600});results.push(summary);console.log(JSON.stringify(summary));
  }
  await writeFile(dir+'/minimax-v1.json',JSON.stringify({at:new Date().toISOString(),model:auth.model,calls:results.length,observedTick:live.tick,results},null,2),{mode:0o600});
}finally{engine.close();}
