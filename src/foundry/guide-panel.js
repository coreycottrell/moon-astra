import {request} from '../network.js';
const sessions=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatted=s=>esc(s).replace(/\*\*([^*]{1,300})\*\*/g,'<strong>$1</strong>').replace(/`([^`]{1,200})`/g,'<code>$1</code>');
export function guideSession(actor){if(!sessions.has(actor))sessions.set(actor,{messages:[],draft:'',status:null,busy:false,focus:{},error:''});return sessions.get(actor);}

export function guideHTML(sim,refresh){
 const s=guideSession(sim.actor.id);
 if(s.status===null){s.status={loading:true};request('guide/status',{token:sim.token}).then(status=>{s.status=status;refresh();}).catch(()=>{s.status={enabled:false};s.error='The guide connection is unavailable. You can keep playing.';refresh();});}
 const focus=s.focus.machineId?`Machine #${s.focus.machineId}`:s.focus.robotId?`Robot #${s.focus.robotId}`:'Your settlement';
 return `<section class="colony-box moon-guide"><span class="eyebrow accent">MINIMAX / COLONY GUIDE</span><h3>Ask about your Moon</h3><p>I can read your colony’s supplies, machines, crew, deliveries, research, and shared projects to explain what is happening and suggest next steps.</p><p class="guide-scope">${esc(focus)} · Advice only · Each answer uses a fresh world snapshot</p><div class="guide-suggestions">${['Where is all my metal going?','Why are my machines waiting?','What should I do next?'].map(q=>`<button type="button" data-guide-question="${esc(q)}" ${s.busy?'disabled':''}>${esc(q)}</button>`).join('')}</div><div class="guide-messages" role="log" aria-label="Conversation with the Moon Guide">${s.messages.map(m=>`<article class="guide-message ${m.role}"><strong>${m.role==='user'?'You':'Moon Guide'}</strong><p>${formatted(m.content)}</p>${m.tick!==undefined?`<small>World snapshot T+${m.tick}${m.truncated?' · Answer reached its length limit; ask a follow-up.':''}</small>${m.facts?`<small class="guide-facts">${Number(m.facts.metalAvailable).toFixed(1)} metal available · ${Number(m.facts.metalInCargo).toFixed(1)} in cargo · ${m.facts.mindFree} mind free · refinery ${Number(m.facts.refineryMetalPerMinute).toFixed(1)}/min</small>`:''}`:''}</article>`).join('')||'<p>Try a question above, or ask about a machine you are inspecting.</p>'}${s.busy?'<p role="status">Reading colony state and preparing an answer…</p>':''}</div>${s.error?`<p class="foundry-warning" role="status">${esc(s.error)}</p>`:''}<form id="guide-form"><label>Your question<textarea name="question" rows="3" maxlength="1200" required placeholder="Where is my metal going?">${esc(s.draft)}</textarea></label><div class="foundry-button-row"><button type="submit" ${s.busy||!s.status.enabled?'disabled':''}>${s.busy?'Thinking…':'Ask guide'}</button><button type="button" data-guide-clear ${s.busy?'disabled':''}>New conversation</button></div></form><small>${s.status.enabled?`${s.status.remainingToday} questions left today · Powered by ${esc(s.status.model)}. Your question and relevant game state are sent to MiniMax.`:s.status.loading?'Checking guide connection…':'The guide is waiting for its provider connection.'}</small></section>`;
}

export async function askGuide(sim,refresh){
 const s=guideSession(sim.actor.id),question=s.draft.trim();if(s.busy||!question||!s.status?.enabled)return;
 const history=s.messages.slice(-6).map(m=>({role:m.role,content:m.content.slice(0,2000)}));
 s.messages.push({role:'user',content:question});s.messages=s.messages.slice(-16);s.draft='';s.busy=true;s.error='';refresh();
 try{
  let answer=await request('guide/ask',{token:sim.token,key:crypto.randomUUID(),body:{question,history,...s.focus}});
  const started=Date.now();
  while(answer.status==='pending'){
   if(Date.now()-started>100000)throw Error('The answer is taking longer than expected. Please check back shortly.');
   await new Promise(r=>setTimeout(r,1200));answer=await request('guide/answers/'+encodeURIComponent(answer.id),{token:sim.token});
  }
  if(answer.status!=='complete')throw Error(answer.message||'The guide could not finish this answer.');
  s.messages.push({role:'assistant',content:answer.answer,tick:answer.tick,truncated:answer.truncated,facts:answer.facts});
 }catch(e){s.error=e.message;}
 finally{s.busy=false;try{s.status=await request('guide/status',{token:sim.token});}catch{}refresh();}
}
