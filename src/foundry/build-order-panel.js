import {BUILDINGS,TECH} from './catalog.js';
import {BUILD_GROUPS,BUILD_ORDER_LIMITS,buildOrderEstimate} from './build-orders.js';

const drafts=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(actor,id)=>`${actor}:${id}`;
export function saveOrderDrafts(el,actor){
  for(const form of el.querySelectorAll('[data-order-form]')){
    const steps=[...form.querySelectorAll('[data-order-step]')].map(row=>({type:row.querySelector('select').value,count:Number(row.querySelector('input').value)}));
    drafts.set(key(actor,form.dataset.orderForm),{steps,repeat:form.querySelector('[name=repeat]').checked});
  }
}
function estimateHTML(estimate){return `<p class="order-estimate">Per cycle: <strong>${estimate.metal} metal + ${estimate.parts} parts</strong>. Full-load plan: ${estimate.mind} / ${estimate.capacity} mind, including ${estimate.crew} for the current crew; ${Math.round(estimate.powerDemand)} / ${Math.round(estimate.powerSupply)} power; ${estimate.heat} / ${estimate.cooling} node cooling.</p>${estimate.warnings.length?`<p class="accent">${esc(estimate.warnings.slice(0,2).join('. '))}${estimate.warnings.length>2?` · ${estimate.warnings.length-2} later steps also need support`:''}.</p>`:''}<p><small>Estimate assumes new buildings are connected and enabled industry runs at full load. Cooling or power shortages can reduce usable mind further. These fixed templates do not add support automatically. Freight, crew access and future construction can change the result.</small></p>`;}
export function buildOrderHTML(w,c,m,own,actor,expanded){
  const p=m.buildOrder,unlocked=c.unlocks.includes('coordinated-builds');
  const draft=drafts.get(key(actor,m.id))||{steps:structuredClone(p?.steps||[{type:'solar',count:1}]),repeat:p?.repeat||false};
  const estimate=buildOrderEstimate(w,c,draft.steps),busy=!!(m.fabrication||m.pendingBuild||p?.waitingJobId);
  const step=p?.steps[p.index];
  const status=p?`${p.completed} commissioned · ${p.cycles} cycles complete · ${p.status==='running'?p.waitingJobId?`waiting for site #${p.waitingJobId}`:`step ${p.index+1}/${p.steps.length}: ${BUILDINGS[step.type].name} ${p.completedInStep+1}/${step.count}`:p.status}${p.repeat?' · repeat enabled':''}`:'No ordered program';
  return `<section class="build-order" data-order-machine="${m.id}"><strong>Build order</strong><p class="order-status">${esc(status)}</p>${p?.status==='running'||m.mode!=='off'?`<button type="button" data-order-action="stop" data-order-id="${m.id}" ${own?'':'disabled'}>Stop future builds</button>`:''}<details data-thread="order-${m.id}" ${expanded.has(`order-${m.id}`)?'open':''}><summary>${p?'Edit / restart build order':'Create build order'}</summary><form data-order-form="${m.id}"><fieldset ${own?'':'disabled'}><label>Group template<select data-order-template><option value="">Custom sequence</option>${Object.entries(BUILD_GROUPS).map(([id,g])=>`<option value="${id}" ${unlocked?'':'disabled'}>${g.name}${unlocked?'':' · research required'}</option>`).join('')}</select></label><div class="order-steps">${draft.steps.map((s,n)=>`<div class="order-step" data-order-step><label>Step ${n+1}<select aria-label="Step ${n+1} building">${Object.entries(BUILDINGS).filter(([type])=>type!=='seed').map(([type,b])=>{const tech=type==='replicator'?'reproduction':b.tech;return `<option value="${type}" ${s.type===type?'selected':''} ${tech&&!c.unlocks.includes(tech)?'disabled':''}>${esc(b.name)}${tech&&!c.unlocks.includes(tech)?' · locked':''}</option>`;}).join('')}</select></label><label>Count<input aria-label="Step ${n+1} count" type="number" min="1" max="8" required value="${Number.isFinite(s.count)?s.count:1}"/></label><div class="order-moves"><button type="button" aria-label="Move step ${n+1} up" data-order-action="up" data-index="${n}" ${n?'':'disabled'}>↑</button><button type="button" aria-label="Move step ${n+1} down" data-order-action="down" data-index="${n}" ${n<draft.steps.length-1?'':'disabled'}>↓</button><button type="button" aria-label="Remove step ${n+1}" data-order-action="remove" data-index="${n}" ${draft.steps.length>1?'':'disabled'}>×</button></div></div>`).join('')}</div><button type="button" data-order-action="add" ${draft.steps.length<BUILD_ORDER_LIMITS.steps?'':'disabled'}>Add step</button><label class="order-repeat"><input name="repeat" type="checkbox" ${draft.repeat?'checked':''} ${unlocked?'':'disabled'}/> Repeat the cycle${unlocked?'':' · research Coordinated construction'}</label><div class="order-budget">${estimateHTML(estimate)}</div><button type="submit" ${busy?'disabled':''}>${p?'Start new build order':'Start build order'}</button>${busy?'<p>Finish the current kit and site before replacing this order.</p>':''}</fieldset></form><p>Each building is fabricated, delivered and commissioned before the next begins. Waiting releases the replicator’s 4 mind slots. Stop future builds keeps paid work; Switch off pauses fabrication. Ordered daughter replicators start off.</p>${unlocked?'':`<p>${esc(TECH['coordinated-builds'].name)} unlocks groups and repeating cycles. One-time custom lists work now.</p>`}</details></section>`;
}
export async function orderClick(t,el,actor,send,refresh){
  if(!t?.dataset.orderAction)return false;
  if(t.dataset.orderAction==='stop'){await send('replicator.stop',{machineId:Number(t.dataset.orderId)});refresh();return true;}
  saveOrderDrafts(el,actor);const form=t.closest('[data-order-form]'),d=drafts.get(key(actor,form.dataset.orderForm)),n=Number(t.dataset.index);
  if(t.dataset.orderAction==='add'&&d.steps.length<12)d.steps.push({type:'solar',count:1});
  if(t.dataset.orderAction==='remove'&&d.steps.length>1)d.steps.splice(n,1);
  if(t.dataset.orderAction==='up'&&n>0)[d.steps[n-1],d.steps[n]]=[d.steps[n],d.steps[n-1]];
  if(t.dataset.orderAction==='down'&&n<d.steps.length-1)[d.steps[n+1],d.steps[n]]=[d.steps[n],d.steps[n+1]];
  // Remove the old form before refresh's draft capture can overwrite the edit.
  form.remove();refresh();return true;
}
export function orderChange(t,el,actor,refresh,w,c){
  const form=t.closest('[data-order-form]');if(!form)return false;
  saveOrderDrafts(el,actor);
  const d=drafts.get(key(actor,form.dataset.orderForm));
  if(t.hasAttribute('data-order-template')&&BUILD_GROUPS[t.value]){d.steps=structuredClone(BUILD_GROUPS[t.value].steps);form.remove();refresh();}
  else form.querySelector('.order-budget').innerHTML=estimateHTML(buildOrderEstimate(w,c,d.steps));
  return true;
}
export async function orderSubmit(form,el,actor,send,refresh){
  if(!form.hasAttribute('data-order-form'))return false;
  saveOrderDrafts(el,actor);const d=drafts.get(key(actor,form.dataset.orderForm));
  await send('replicator.order',{machineId:Number(form.dataset.orderForm),...structuredClone(d)});refresh();return true;
}
