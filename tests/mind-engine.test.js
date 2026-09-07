import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MindEngine} from '../lib/mind-engine/engine.mjs';
import {snapshot} from '../lib/mind-engine/snapshot.mjs';
import {capability,requestFor,validateResponse,deterministicResponse} from '../lib/mind-engine/protocol.mjs';
import {gymSnapshot,transportGym} from '../lib/mind-engine/gym-adapter.mjs';
import {DEFAULT_SCENARIO,evaluate,compare,chooseWithMemory} from '../lib/mind-engine/gym.mjs';
import {fromGuide,traffic,resources} from '../lib/mind-engine/moon-adapter.mjs';
import {minimax} from '../lib/mind-engine/minimax.mjs';
const s=()=>gymSnapshot();
const create=opts=>new MindEngine({skills:[transportGym],...opts});
const provider=choice=>async request=>({result:deterministicResponse(request,choice)});
const submit=(e,key='example-0001',obs=s())=>e.submit({owner:obs.ownerId,key,skillId:transportGym.id,observation:obs});
test('snapshot identity is canonical and detached from caller mutation',()=>{
  const a=s(),input=structuredClone(a);delete input.id;delete input.protocol;
  const b=snapshot(input);assert.equal(a.id,b.id);input.facts['queue.workers'].value=999;assert.equal(b.facts['queue.workers'].value,4);
  assert.throws(()=>snapshot({...input,tick:NaN}));
  assert.equal(snapshot({...b,id:'forged',protocol:'forged'}).id,b.id);
});
test('provider enforces M3 and sends only a bounded structured analysis request',async()=>{
  let sent;const request=requestFor(s(),transportGym),result=deterministicResponse(request,'graded-road');
  assert.throws(()=>minimax({apiKey:'test-only',model:'MiniMax-M2.7'}),/M3 only/);
  const encoded={...result,claims:result.claims.map(c=>({factId:c.factId,valueJson:JSON.stringify(c.value)}))};
  const p=minimax({apiKey:'test-only',fetchImpl:async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>({choices:[{finish_reason:'tool_calls',message:{tool_calls:[{function:{name:'submit_analysis',arguments:JSON.stringify(encoded)}}]}}],usage:{prompt_tokens:10,completion_tokens:20}})};}});
  const actual=await p(request,{maxOutputTokens:123});const body=JSON.parse(sent.body);
  assert.equal(body.model,'MiniMax-M3');assert.equal(body.max_completion_tokens,123);assert.equal(sent.redirect,'error');assert.equal(body.tools.length,1);assert.deepEqual(actual.result,result);
  encoded.claims[0].valueJson=JSON.stringify(String(result.claims[0].value));assert.equal(validateResponse((await p(request)).result,request).ok,false);
  encoded.claims[0].valueJson='';await assert.rejects(p(request));
});
test('typed facts reject plausible but false numbers, IDs, claims and instructions',()=>{
  const request=requestFor(s(),transportGym),good=deterministicResponse(request,'graded-road');assert.ok(validateResponse(good,request).ok);
  for(const edit of [r=>r.claims[0].value=16,r=>r.claims[0].factId='invented',r=>r.command='build',r=>r.claims.push(r.claims[0]),r=>r.observationId='old',r=>r.unknowns=['Invented history']]){const r=structuredClone(good);edit(r);assert.equal(validateResponse(r,request).ok,false);}
  for(const claims of [null,{},42,[null],[{factId:'__proto__',value:0}]])assert.equal(validateResponse({...good,claims},request).ok,false);
});
test('online nodes, research and available mind are independent gates',()=>{
  assert.equal(capability(3,{nodes:3,freeMind:50,unlockedLevel:5}).ok,false);
  assert.equal(capability(3,{nodes:20,freeMind:1,unlockedLevel:5}).ok,false);
  assert.equal(capability(3,{nodes:20,freeMind:50,unlockedLevel:2}).ok,false);
  assert.equal(capability(3,{nodes:4,freeMind:3,unlockedLevel:3},2).ok,false);
  assert.equal(capability(3,{nodes:4,freeMind:2,unlockedLevel:3}).ok,true);
});
test('idempotent submissions reject conflicting data and other owners cannot read jobs',()=>{
  const e=create(),obs=s(),a=submit(e,'same-key-0001',obs);assert.equal(submit(e,'same-key-0001',obs).id,a.id);
  assert.throws(()=>submit(e,'same-key-0001',gymSnapshot({...DEFAULT_SCENARIO,workers:5})),/different request/);
  assert.throws(()=>e.get(a.id,'other'),/not found/);assert.deepEqual(e.list('other'),[]);e.close();
});
test('stale observations fail before a provider is called',async()=>{
  let now=Date.now();const e=create({clock:()=>now,maxSnapshotAgeMs:100}),job=submit(e);now+=200;
  await assert.rejects(()=>e.run(job.id,'lab',provider('graded-road')),/fresh observation/);assert.equal(e.get(job.id,'lab').state,'queued');e.close();
});
test('mind reservation and concurrent worker limits hold across SQLite connections',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'mind-engine-')),path=join(dir,'state.sqlite');const a=create({path,ownerConcurrent:2}),b=create({path,ownerConcurrent:2});
  try{
    const j1=submit(a,'concurrent-0001'),j2=submit(b,'concurrent-0002');let done;
    const run=a.run(j1.id,'lab',request=>new Promise(resolve=>{done=()=>resolve({result:deterministicResponse(request,'graded-road')});}),{currentSupport:{nodes:4,freeMind:2,unlockedLevel:3}});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(b.get(j1.id,'lab').reservedMind,2);
    await assert.rejects(()=>b.run(j2.id,'lab',provider('graded-road'),{currentSupport:{nodes:4,freeMind:2,unlockedLevel:3}}),/available to learning/);
    done();await run;assert.equal(b.get(j1.id,'lab').reservedMind,0);
    assert.equal((await b.run(j2.id,'lab',provider('graded-road'))).state,'analyzed');
  }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});
test('timeouts release mind and failed attempts still spend the call allowance',async()=>{
  const e=create({timeoutMs:20,ownerDailyCalls:1}),a=submit(e,'timeout-0001');
  const keepAlive=setTimeout(()=>{},100);const failed=await e.run(a.id,'lab',()=>new Promise(()=>{}));clearTimeout(keepAlive);
  assert.equal(failed.state,'interrupted');assert.equal(failed.reservedMind,0);
  const b=submit(e,'timeout-0002');await assert.rejects(()=>e.run(b.id,'lab',provider('graded-road')),/allowance/);e.close();
});
test('cancellation prevents late provider results from committing',async()=>{
  const e=create(),job=submit(e);let resolve;
  const running=e.run(job.id,'lab',request=>new Promise(r=>{resolve=()=>r({result:deterministicResponse(request,'graded-road')});}));await new Promise(r=>setImmediate(r));
  e.cancel(job.id,'lab');resolve();const result=await running;assert.equal(result.state,'cancelled');assert.equal(result.reservedMind,0);assert.equal(result.response,null);e.close();
});
test('expired worker leases are recovered without retrying the provider',()=>{
  const e=create(),job=submit(e);e.db.prepare("UPDATE mind_jobs SET state='analyzing',mind=2,lease_token='dead',lease_until=0 WHERE id=?").run(job.id);e.recover();assert.equal(e.get(job.id,'lab').state,'interrupted');assert.equal(e.get(job.id,'lab').reservedMind,0);e.close();
});
test('invalid semantic response is rejected and no evaluator can learn from it',async()=>{
  const e=create(),job=submit(e);const result=await e.run(job.id,'lab',async request=>{const r=deterministicResponse(request,'graded-road');r.claims[0].value=900;return {result:r};});
  assert.equal(result.state,'rejected');assert.equal(result.summary,null);assert.throws(()=>e.evaluate(job.id,'lab'),/no registered evaluator/);e.close();
});
test('real simulated outcomes persist across restart, deduplicate and change the next choice',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'mind-memory-')),path=join(dir,'state.sqlite');let e=create({path});
  try{
    assert.equal(chooseWithMemory(DEFAULT_SCENARIO,[]).choice,'keep-layout');
    for(const choice of ['single-lift','extra-crew','graded-road']){
      const job=submit(e,'trial-'+choice);await e.run(job.id,'lab',provider(choice));const record=e.evaluate(job.id,'lab');assert.deepEqual(e.evaluate(job.id,'lab'),record);
    }
    e.close();e=create({path});const next=submit(e,'next-decision');const memory=next.request.memory;
    assert.equal(memory.length,3);assert.ok(memory.some(x=>x.improvement<0));assert.equal(chooseWithMemory(DEFAULT_SCENARIO,memory).choice,'graded-road');
    await e.run(next.id,'lab',provider('graded-road'));e.evaluate(next.id,'lab');assert.equal(e.memories('lab',s(),transportGym).length,3,'same deterministic experiment is not new evidence');
    const other=submit(e,'other-context',gymSnapshot({...DEFAULT_SCENARIO,distance:60}));assert.equal(other.request.memory.length,0);
    assert.equal(e.memories('another-owner',s(),transportGym).length,0);
  }finally{e.close();rmSync(dir,{recursive:true,force:true});}
});
test('support loss interrupts an in-flight job while keeping previous knowledge',async()=>{
  const e=create(),job=submit(e);let resolve;
  const run=e.run(job.id,'lab',request=>new Promise(r=>{resolve=()=>r({result:deterministicResponse(request,'graded-road')});}));await new Promise(r=>setImmediate(r));
  const result=e.updateSupport('lab',{nodes:1,freeMind:20,unlockedLevel:3});assert.deepEqual(result.interrupted,[job.id]);resolve();assert.equal((await run).error,'CAPACITY_LOST');assert.equal(e.get(job.id,'lab').reservedMind,0);e.close();
});
test('observation windows are isolated by owner, domain and ruleset',()=>{
  const e=create(),a=s();e.observe(a);e.observe(a);assert.equal(e.observationWindow('lab','moon-gym','queue-gym-1').length,1);assert.equal(e.observationWindow('other','moon-gym','queue-gym-1').length,0);assert.equal(e.observationWindow('lab','warehouse-gym','queue-gym-1').length,0);e.close();
});
test('matched simulator is repeatable, conserves jobs and records failed interventions',()=>{
  const r=evaluate(DEFAULT_SCENARIO,'single-lift');assert.deepEqual(r,evaluate(DEFAULT_SCENARIO,'single-lift'));assert.ok(r.improvement<0);
  assert.equal(r.trial.completed+r.trial.unfinished,r.trial.requested);assert.equal(compare(DEFAULT_SCENARIO)[0].trial.choice,'graded-road');
  const holdout={...DEFAULT_SCENARIO,seed:19};assert.equal(compare(holdout)[0].trial.choice,'graded-road');
  const warehouse={...DEFAULT_SCENARIO,domain:'warehouse-gym'};assert.equal(compare(warehouse)[0].trial.choice,'graded-road');
});
test('Moon adapter includes rock freight and preserves incomplete coverage explicitly',()=>{
  const c={player:{id:'player'},ruleset:'moon',economyVersion:3,tick:1,observedAt:new Date().toISOString(),capacity:{mind:{free:10,nodes:9,supportedNodes:4}},settlement:{maxActive:10},crew:[{id:4,status:'crew-limited'}],machines:[{id:42,state:'no-feedstock'}],freight:[{item:'rock',status:'carried',amount:4}],freightSummary:{waiting:2},metalFlow:{available:100,reservedFreight:5},coverage:{freightShown:1,freightTotal:3,machinesShown:1,machinesTotal:1}};
  const obs=fromGuide(c);assert.equal(obs.facts['freight.rockPacketsShown'].value,1);assert.equal(obs.facts['freight.coverageComplete'].value,false);assert.equal(obs.facts['recipe.refinery'].value.metalConsumed,0);
  assert.equal(traffic.candidates(obs)[0].eligible,true);assert.equal(resources.candidates(obs)[0].eligible,true);
});
