import {createHash} from 'node:crypto';
import {canonical,PROTOCOL} from './protocol.mjs';
export const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
export function snapshot(input){
  const s=structuredClone(input);
  if(s&&typeof s==='object'){delete s.id;delete s.protocol;}
  if(!s||!['domain','ownerId','ruleset'].every(k=>typeof s[k]==='string'&&s[k].length>0&&s[k].length<160)||!Number.isSafeInteger(s.tick)||s.tick<0||!Number.isFinite(Date.parse(s.observedAt)))throw Error('Invalid snapshot identity');
  if(!s.facts||Array.isArray(s.facts)||typeof s.facts!=='object'||Object.keys(s.facts).length>1000)throw Error('Invalid facts');
  for(const [id,f] of Object.entries(s.facts))if(!/^[a-zA-Z0-9_.:-]{1,120}$/.test(id)||!f||typeof f.label!=='string'||f.label.length>200||!('value'in f))throw Error('Invalid fact');
  if(!Array.isArray(s.unknowns)||s.unknowns.length>12||s.unknowns.some(x=>typeof x!=='string'||x.length>200)||new Set(s.unknowns).size!==s.unknowns.length)throw Error('Invalid coverage');
  const json=canonical(s);if(json.length>64000)throw Error('Snapshot too large');
  return {protocol:PROTOCOL,id:digest(s),...s};
}
