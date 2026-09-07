import test from 'node:test';
import assert from 'node:assert/strict';
import {observation,analysisRequest,validateAnalysis,parseAnalysis,episode,recall} from './core.mjs';
const obs=observation({domain:'warehouse',ruleset:'fixture-1',tick:20,facts:[{id:'queue',value:12}],coverage:{synthetic:true}});
const skill={id:'queue-analysis',version:1,objective:'Reduce measured waits',candidates:()=>[{id:'inspect',eligible:true,requiresEvidence:['queue']},{id:'blocked',eligible:false}]};
const request=analysisRequest(obs,skill,'What next?');
const valid={schemaVersion:1,observationId:obs.id,skillId:skill.id,decision:'propose',candidateId:'inspect',evidenceIds:['queue'],explanation:'Inspect the measured queue.',unknowns:['Service rate is missing.'],measureNext:['Measure completed jobs over 60 seconds.']};
const outcome={kind:'observed',metric:'queue-seconds',before:120,after:80,better:'lower',startTick:21,endTick:81,confounders:['Demand also fell.']};
test('non-Moon domain uses the same contract and binds the exact observation',()=>{
  assert.ok(validateAnalysis(valid,request).ok);
  assert.equal(validateAnalysis({...valid,observationId:'old'},request).ok,false);
});
test('unknown/blocked candidates and unsupported evidence fail closed',()=>{
  for(const patch of [{candidateId:'invented'},{candidateId:'blocked'},{evidenceIds:['invented']},{evidenceIds:[]},{command:'build'}])assert.equal(validateAnalysis({...valid,...patch},request).ok,false);
});
test('malformed provider data never throws or enters the accepted path',()=>{
  for(const result of [null,[],false,'hello',{},...['x',{},null,5].map(evidenceIds=>({...valid,evidenceIds}))])assert.equal(validateAnalysis(result,request).ok,false);
  for(const text of ['not json','{}','null','[1]'])assert.equal(parseAnalysis(text,request).validation.ok,false);
});
test('abstention is accepted without pretending an action was chosen',()=>{
  assert.ok(validateAnalysis({...valid,decision:'abstain',candidateId:null},request).ok);
  assert.equal(validateAnalysis({...valid,decision:'abstain'},request).ok,false);
});
test('outcome accounting records improvement without upgrading correlation to cause',()=>{
  const e=episode(request,valid,outcome);
  assert.equal(e.outcome.improvement,40);assert.equal(e.causalEvidence,false);
  assert.equal(episode(request,valid,{...outcome,after:180}).outcome.improvement,-60);
  assert.equal(episode(request,valid,{...outcome,kind:'simulated',confounders:[]}).causalEvidence,false);
});
test('memory keeps failures, deduplicates and excludes different rulesets/skill versions',()=>{
  const e=episode(request,valid,{...outcome,after:180});
  const old={...e,id:'old',ruleset:'fixture-0'},changed={...e,id:'changed',skillVersion:2};
  assert.deepEqual(recall([e,e,old,changed],request),[e]);
});
test('malformed outcomes cannot create learning evidence',()=>{
  for(const patch of [{after:NaN},{before:Infinity},{endTick:20},{better:'maybe'},{confounders:null},{kind:'model-says-so'}])assert.throws(()=>episode(request,valid,{...outcome,...patch}));
});
