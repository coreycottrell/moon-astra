// A domain-independent, read-only analysis boundary. No command executor exists here.
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unique=a=>new Set(a).size===a.length;
export function observation({domain,ruleset,tick,facts,coverage}){
  if(!domain||!ruleset||!Number.isSafeInteger(tick)||!Array.isArray(facts)||!unique(facts.map(f=>f.id)))throw Error('Invalid observation');
  for(const f of facts)if(typeof f.id!=='string'||!f.id||f.value===undefined)throw Error('Invalid fact');
  const data={domain,ruleset,tick,facts,coverage};
  return Object.freeze({schemaVersion:1,id:hash(data),...data});
}
export const RESPONSE_FIELDS=['schemaVersion','observationId','skillId','decision','candidateId','evidenceIds','explanation','unknowns','measureNext'];
export function analysisRequest(obs,skill,question){
  const candidates=skill.candidates(obs);
  if(!unique(candidates.map(c=>c.id)))throw Error('Duplicate candidate');
  return {schemaVersion:1,observation:obs,skill:{id:skill.id,version:skill.version,objective:skill.objective,candidates},question,
    responseContract:{schemaVersion:1,observationId:obs.id,skillId:skill.id,decision:'propose | abstain',candidateId:'One supplied eligible candidate ID, or null when abstaining',evidenceIds:'Array of supporting observation fact IDs',explanation:'Plain text, at most 1800 characters; no invented measured history or causal certainty',unknowns:'Array of missing facts',measureNext:'Array of measurable follow-up checks'}};
}
export function validateAnalysis(result,request){
  const errors=[];
  if(!result||typeof result!=='object'||Array.isArray(result))return {ok:false,errors:['Expected object']};
  if(Object.keys(result).some(k=>!RESPONSE_FIELDS.includes(k))||RESPONSE_FIELDS.some(k=>!(k in result)))errors.push('Unexpected or missing fields');
  if(result.schemaVersion!==1||result.observationId!==request.observation.id||result.skillId!==request.skill.id)errors.push('Wrong version, observation or skill');
  const strings=(a,max,n)=>Array.isArray(a)&&a.length<=n&&unique(a)&&a.every(s=>typeof s==='string'&&s.length>0&&s.length<=max);
  const cited=Array.isArray(result.evidenceIds)?result.evidenceIds:[];
  if(!strings(result.evidenceIds,100,30)||result.evidenceIds.some(id=>!request.observation.facts.some(f=>f.id===id)))errors.push('Invalid evidence IDs');
  if(typeof result.explanation!=='string'||!result.explanation.trim()||result.explanation.length>1800)errors.push('Invalid explanation');
  if(!strings(result.unknowns,400,10)||!strings(result.measureNext,400,10))errors.push('Invalid follow-up fields');
  if(result.decision==='propose'){
    const candidate=request.skill.candidates.find(c=>c.id===result.candidateId);
    if(!candidate||!candidate.eligible)errors.push('Unavailable candidate');
    if(!cited.length)errors.push('Proposal requires evidence');
    if(candidate?.requiresEvidence?.some(id=>!cited.includes(id)))errors.push('Missing candidate evidence');
  }else if(result.decision!=='abstain'||result.candidateId!==null)errors.push('Invalid decision');
  return {ok:errors.length===0,errors};
}
export function parseAnalysis(text,request){
  try{
    const result=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    return {result,validation:validateAnalysis(result,request)};
  }catch{return {result:null,validation:{ok:false,errors:['Invalid JSON']}};}
}
// An outcome is supplied by an independent evaluator, never by the proposing model.
// This records comparable episodes; it does not train model weights or prove causality.
export function episode(request,result,outcome){
  if(!validateAnalysis(result,request).ok)throw Error('Rejected analysis');
  if(!['simulated','observed','controlled'].includes(outcome?.kind)||typeof outcome.metric!=='string'||!outcome.metric||
    !Number.isFinite(outcome.before)||!Number.isFinite(outcome.after)||!['lower','higher'].includes(outcome.better)||
    !Number.isSafeInteger(outcome.startTick)||!Number.isSafeInteger(outcome.endTick)||outcome.endTick<=outcome.startTick||
    !Array.isArray(outcome.confounders)||!outcome.confounders.every(s=>typeof s==='string'))throw Error('Invalid measured outcome');
  const delta=outcome.after-outcome.before;
  const record={schemaVersion:1,domain:request.observation.domain,ruleset:request.observation.ruleset,skillId:request.skill.id,skillVersion:request.skill.version,observationId:request.observation.id,candidateId:result.candidateId,outcome:{...outcome,improvement:delta*(outcome.better==='lower'?-1:1)},causalEvidence:outcome.kind==='controlled'&&outcome.confounders.length===0};
  return {id:hash(record),...record};
}
export function recall(episodes,request){
  // Keep failures and confounded outcomes; never promote a policy from raw success counts.
  const seen=new Set();
  return episodes.filter(e=>e.domain===request.observation.domain&&e.ruleset===request.observation.ruleset&&e.skillId===request.skill.id&&e.skillVersion===request.skill.version&&!seen.has(e.id)&&(seen.add(e.id),true)).slice(-12);
}
