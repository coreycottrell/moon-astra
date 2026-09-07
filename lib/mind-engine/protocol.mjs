// Shared by Node and the explainer lab. No provider or application credentials.
export const PROTOCOL = 'moon-mind/1';
export const LEVELS = Object.freeze([
  {level:0,name:'Landing tools',nodes:0,mind:0,work:0},
  {level:1,name:'Colony observatory',nodes:1,mind:.5,work:300},
  {level:2,name:'Applied analysis',nodes:2,mind:1,work:900},
  {level:3,name:'Comparative planning',nodes:4,mind:2,work:2400},
  {level:4,name:'Experimental engineering',nodes:8,mind:4,work:6000},
  {level:5,name:'Cooperative intelligence',nodes:16,mind:8,work:15000},
]);
export function canonical(value){
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  throw Error('Only finite JSON data is supported');
}
export function capability(level,support,reserved=0){
  const spec=LEVELS[level];
  if(!spec||!support||!['nodes','freeMind','unlockedLevel'].every(k=>Number.isFinite(support[k]))||!Number.isFinite(reserved)||reserved<0||support.nodes<0||support.freeMind<0)return {ok:false,reason:'Invalid capacity'};
  if(support.unlockedLevel<level)return {ok:false,reason:`Requires ${spec.name} research`};
  if(support.nodes<spec.nodes)return {ok:false,reason:`Requires ${spec.nodes} supported nodes; ${support.nodes} online`};
  if(support.freeMind-reserved<spec.mind)return {ok:false,reason:`Needs ${spec.mind} mind; ${Math.max(0,support.freeMind-reserved)} available to learning`};
  return {ok:true,reason:'Ready',mind:spec.mind,nodes:spec.nodes};
}
export const RESPONSE_SCHEMA={type:'object',additionalProperties:false,required:['protocol','observationId','skillId','decision','candidateId','claims','unknowns'],properties:{
  protocol:{type:'string',enum:[PROTOCOL]},observationId:{type:'string'},skillId:{type:'string'},decision:{type:'string',enum:['propose','abstain']},candidateId:{type:'string',description:'For propose, choose one supplied eligible candidate ID. For abstain, use the literal string none.'},
  claims:{type:'array',maxItems:16,items:{type:'object',additionalProperties:false,required:['factId','value'],properties:{factId:{type:'string'},value:{description:'Copy the exact typed value from this fact, never an invented value.'}}}},
  unknowns:{type:'array',maxItems:12,items:{type:'string'}},
}};
export function requestFor(snapshot,skill,memory=[]){
  const candidates=skill.candidates(snapshot);
  const responseSchema=structuredClone(RESPONSE_SCHEMA);responseSchema.properties.candidateId.enum=[...candidates.filter(c=>c.eligible).map(c=>c.id),'none'];
  responseSchema.properties.observationId.enum=[snapshot.id];responseSchema.properties.skillId.enum=[skill.id];
  // Tool schemas must carry the fact types, not leave an unconstrained value slot.
  const typed=value=>({type:value===null?'null':Array.isArray(value)?'array':typeof value,...(Array.isArray(value)?{items:value.length?typed(value[0]):{}}:{}),enum:[structuredClone(value)]});
  responseSchema.properties.claims.items={oneOf:Object.entries(snapshot.facts).map(([factId,fact])=>({type:'object',additionalProperties:false,required:['factId','value'],properties:{factId:{type:'string',enum:[factId]},value:typed(fact.value)}}))};
  return {protocol:PROTOCOL,observation:snapshot,skill:{id:skill.id,version:skill.version,objective:skill.objective,candidates},memory,responseSchema,
    instruction:'Select an eligible recommendation and put its exact ID in candidateId, or abstain with candidateId=none. Never return null. Copy every required candidate fact into claims with its exact factId and typed value. Claims are checked by code. Choose unknowns only from observation.unknowns. No prose or commands. A successful response is an analysis, never an executed change.'};
}
export function validateResponse(result,request){
  const errors=[];
  if(!result||typeof result!=='object'||Array.isArray(result))return {ok:false,errors:['Response must be an object']};
  const keys=RESPONSE_SCHEMA.required;
  if(keys.some(k=>!(k in result))||Object.keys(result).some(k=>!keys.includes(k)))errors.push('Unexpected or missing fields');
  if(result.protocol!==PROTOCOL||result.observationId!==request.observation.id||result.skillId!==request.skill.id)errors.push('Wrong protocol, observation or skill');
  const claims=Array.isArray(result.claims)?result.claims:[];
  if(!Array.isArray(result.claims)||claims.length>16)errors.push('Invalid claims');
  const seen=new Set();
  for(const c of claims){
    if(!c||typeof c!=='object'||Object.keys(c).length!==2||!('factId' in c)||!('value' in c)||typeof c.factId!=='string'){errors.push('Malformed claim');continue;}
    if(seen.has(c.factId))errors.push('Duplicate claim');seen.add(c.factId);
    const fact=request.observation.facts[c.factId];
    try{if(!fact||canonical(fact.value)!==canonical(c.value))errors.push('Unsupported claim: '+c.factId);}catch{errors.push('Invalid claim value');}
  }
  if(!Array.isArray(result.unknowns)||result.unknowns.length>12||new Set(result.unknowns).size!==result.unknowns.length||result.unknowns.some(k=>!request.observation.unknowns.includes(k)))errors.push('Unknown evidence was invented');
  if(result.decision==='propose'){
    const c=request.skill.candidates.find(c=>c.id===result.candidateId);
    if(!c||!c.eligible)errors.push('Candidate is unavailable');
    if(c?.requiredFacts.some(id=>!seen.has(id)))errors.push('Required factual claims missing');
  }else if(result.decision!=='abstain'||result.candidateId!=='none')errors.push('Invalid decision');
  return {ok:errors.length===0,errors};
}
export function deterministicResponse(request,candidateId){
  const candidate=request.skill.candidates.find(c=>c.id===candidateId&&c.eligible);
  return {protocol:PROTOCOL,observationId:request.observation.id,skillId:request.skill.id,decision:candidate?'propose':'abstain',candidateId:candidate?.id||'none',
    claims:(candidate?.requiredFacts||[]).map(factId=>({factId,value:structuredClone(request.observation.facts[factId].value)})),unknowns:request.observation.unknowns.slice(0,12)};
}
export function verifiedSummary(result,request){
  if(!validateResponse(result,request).ok)throw Error('Cannot present unverified claims');
  const candidate=request.skill.candidates.find(c=>c.id===result.candidateId);
  return {title:candidate?.label||'More evidence is needed',observedTick:request.observation.tick,
    facts:result.claims.map(c=>({label:request.observation.facts[c.factId].label,value:c.value,unit:request.observation.facts[c.factId].unit||''})),
    unknowns:result.unknowns,scope:'Recommendation only; factual values checked against this observation.'};
}
