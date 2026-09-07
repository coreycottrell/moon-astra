import {BUILDINGS,TECH} from './catalog.js';
import {corridorEstimate} from './corridors.js';
import {TUNNEL_TIERS,occupiedPorts,planLiftTerminals,liftReady,tunnelStatus,suggestedLinks,apronClear} from './lift-network.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n||0);
const name=m=>m?`${esc(BUILDINGS[m.type]?.name||'Facility')} #${m.id}`:'Missing endpoint';
const button=(label,action,id,extra='',disabled=false)=>`<button data-action="${action}" data-id="${id}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
export function corridorPlanner(w,c,own,draft={}){
 const locals=w.machines.filter(m=>m.claimId===c.id),bores=locals.filter(m=>m.type==='tunnel');
 const working=m=>w.corridors.find(t=>(t.boreId??t.fromId)===m.id&&!t.complete);
 const bore=bores.find(m=>String(m.id)===draft.machineId)||bores.find(m=>!working(m))||bores[0],from=locals.find(m=>String(m.id)===draft.fromId);
 const choices=from?w.machines.filter(t=>t.id!==from.id&&corridorEstimate(from,t).valid):[],target=choices.find(t=>String(t.id)===draft.toId),estimate=target&&corridorEstimate(from,target),busy=bore&&working(bore),plan=target&&planLiftTerminals(w,from,target);
 return `<section class="colony-box" id="tunnel-planner"><h3>Plan a tunnel</h3><p>Choose both endpoints. The bore does the excavation; robots install a small elevator at each end.</p>${bores.length?`
 <form id="tunnel-plan" data-bore-form>
 <div class="foundry-form-row"><label>Start<select name="fromId" ${own?'':'disabled'}><option value="">Choose the start facility</option>${locals.map(m=>`<option value="${m.id}" ${m===from?'selected':''}>${name(m)}</option>`).join('')}</select></label>
 <label>End<select name="toId" ${own&&from?'':'disabled'}><option value="">Choose a facility or neighbor’s seed</option>${choices.map(t=>`<option value="${t.id}" ${t===target?'selected':''}>${name(t)}${t.claimId!==c.id?' · '+esc(w.players.find(p=>p.id===t.ownerId)?.name):''} · ${num(corridorEstimate(from,t).length)} m</option>`).join('')}</select></label></div>
 <label>Bore assigned to excavate<select name="machineId" ${own?'':'disabled'}>${bores.map(m=>`<option value="${m.id}" ${m===bore?'selected':''}>${name(m)}${working(m)?' · busy':''}</option>`).join('')}</select></label>
 ${estimate?`<div class="corridor-estimate"><strong>${name(from)} → ${name(target)}</strong><p>${num(estimate.metal+12)} metal + ${num(estimate.parts+4)} parts total: tunnel liners plus both elevators.</p><small>${num(estimate.length)} m · at least ${num(estimate.poweredSeconds/60)} powered minutes digging, then crew installation. Elevator materials (12 metal + 4 parts) are reserved now; supply liners to the bore as it works.</small></div>`:''}
 ${plan?.error?`<p class="foundry-warning">${esc(plan.message)}</p>`:''}
 ${busy?`<p class="foundry-warning">This bore is still excavating ${name(w.machines.find(m=>m.id===busy.fromId))} → ${name(w.machines.find(m=>m.id===busy.toId))}. Choose an idle bore, wait, or stop that unfinished route below.</p>`:''}
 <p><small>Basic line: one robot, both directions. Four seconds to lower, timed travel, then the destination lift comes down to collect it and rises. A depot has six possible connections; two bays are initially installed. A completed producer/depot connection assigns that depot when the producer has none.</small></p>
 <button type="submit" ${own&&!busy&&target&&!plan?.error?'':'disabled'}>${busy?'Bore is excavating':'Start excavation'}</button></form>`:'<p>Build a bore after researching Below the surface, then plan its route here.</p>'}</section>`;
}
export function corridorLedger(w,c){
 const own=w.actorId===c.ownerId,routes=w.corridors.filter(t=>t.claimId===c.id||t.targetClaimId===c.id);
 return `<section class="colony-box"><h3>Tunnel network · ${routes.length}</h3>${routes.map(t=>{
  const from=w.machines.find(m=>m.id===t.fromId),to=w.machines.find(m=>m.id===t.toId),remaining=Math.max(0,t.length-t.excavated),s=tunnelStatus(w,t),owned=own&&t.claimId===c.id;
  const order=Object.keys(TUNNEL_TIERS),next=order[order.indexOf(t.tier||'basic')+1],def=TUNNEL_TIERS[next],missing=t.liftVersion?Object.values(t.terminals).filter(p=>!p.installed&&!p.jobId).length:0;
  let controls=button('Locate start ↗','focus',t.fromId)+button('Locate end ↗','focus',t.toId);
  if(!t.liftVersion)controls+=button('Fit 2 elevators · 12 metal + 4 parts','tunnel-upgrade',t.id,'data-tier="basic"',!owned||s.occupied>0);
  else if(missing)controls+=button(`Resume ${missing} elevator installation${missing>1?'s':''} · ${missing*6} metal + ${missing*2} parts`,'tunnel-fitout',t.id,'',!owned);
  else if(def&&t.complete&&t.terminals.from.installed&&t.terminals.to.installed){
   const metal=def.metal+(next==='twin'?Math.ceil(t.length*.5):0),locked=!c.unlocks.includes(def.tech);
   controls+=button(locked?`Research ${TECH[def.tech].name}`:`Upgrade: ${def.name} · ${metal} metal + ${def.parts} parts`,'tunnel-upgrade',t.id,`data-tier="${next}"`,!owned||locked||s.occupied>0||!!t.upgradeJobId);
  }
  if(!t.complete)controls+=button('Stop this excavation','tunnel-cancel',t.id,'',!owned);
  return `<article class="foundry-row tunnel-route" data-corridor-id="${t.id}"><div><strong>${name(from)} → ${name(to)}</strong><p class="tunnel-status ${s.occupied?'occupied':''}">${esc(s.label)}${s.capacity?` · ${s.occupied}/${s.capacity} transit slots`:''}</p>
  ${s.robotId?`<p>${esc(s.robotName)} #${s.robotId} · ${esc(s.robotStatus?.replaceAll('-',' '))} · ${s.eta===null?'':`about ${s.eta}s travel/lift time + any queue`}${s.waiting?` · ${s.waiting} waiting`:''}</p>`:''}
  <p>${t.liftVersion?esc(TUNNEL_TIERS[t.tier||'basic'].name):'Existing route; endpoints are unchanged. Fit elevators to carry robots.'}</p>
  ${remaining?`<progress value="${t.excavated}" max="${t.length}"></progress><small>Excavating ${num(t.excavated)} / ${num(t.length)} m · ${num(remaining*.5)} metal + ${num(remaining*.1)} parts of liners remaining. Stopping preserves spent excavation costs.</small>`:''}
  ${t.liftVersion?`<p>Start lift: ${t.terminals.from.installed?'installed':t.terminals.from.jobId?'crew work queued':'installation canceled'} · End lift: ${t.terminals.to.installed?'installed':t.terminals.to.jobId?'crew work queued':'installation canceled'}</p>`:''}
  </div><div class="machine-controls">${controls}</div></article>`;
 }).join('')||'<p>Choose Start and End in the planner above, or use a depot’s suggested connections below.</p>'}</section>`;
}
export function depotPanel(w,c,own){
 const depots=w.machines.filter(m=>m.type==='depot'&&m.claimId===c.id);
 return `<section class="colony-box"><h3>Depot connections</h3>${depots.map(m=>{
  const bays=m.depotHub?.bays||0,used=occupiedPorts(w,m),next=bays+2,tech=next===4?'tunnel-control':next===6?'tunnel-passing':'tunneling',clear=!!m.depotHub||apronClear(w,m),locked=!c.unlocks.includes(tech),stored=Object.values(m.inventory).reduce((a,b)=>a+b,0)/1000;
  const links=suggestedLinks(w,m),connected=w.machines.filter(s=>s.depotId===m.id);
  return `<article class="depot-card" data-depot-id="${m.id}"><h4>${name(m)}</h4><p>${used.length}/${bays} installed connections used · ${num(stored)}${m.depotHub?'/240':''} stored units${m.depotHub?' · 2 loading positions':''}</p>
  <div class="depot-bays">${Array.from({length:6},(_,n)=>{const route=w.corridors.find(t=>t.liftVersion&&(t.fromId===m.id&&t.terminals.from.slot===n||t.toId===m.id&&t.terminals.to.slot===n));return `<span class="depot-bay ${n>=bays?'unbuilt':route?'connected':'free'}"><b>${n+1}</b>${route?`Tunnel #${route.id}`:n<bays?'Available':'Future bay'}</span>`;}).join('')}</div>
  ${next<=6?`<p>${button(!clear?'Six-bay apron needs more clear ground':locked?`Research ${TECH[tech].name}`:m.depotHub?.jobId?'Crew installing expansion':`Install ${bays?'next 2 bays':'six-bay apron + 2 bays'} · 16 metal + 4 parts`,'depot-expand',m.id,'',!own||!clear||locked||!!m.depotHub?.jobId)}</p>`:''}
  <p><small>Connected producers send surplus here and prefer this depot for inputs. Robots carry every delivery. Rock target 120, metal 80, parts 24, spares 16; storage and incoming reservations share a 240-unit limit.</small></p>
  ${connected.length?`<p>Serving: ${connected.map(name).join(', ')}</p>`:''}
  <details data-thread="depot-${m.id}"><summary>Suggested connections · ${links.filter(x=>!x.reason).length} available</summary><div class="depot-suggestions">${links.map(x=>`<div><span><b>${esc(x.name)} #${x.machineId}</b> · ${x.length} m<br/><small>${x.reason?esc(x.reason):`${num(x.flow)} units in current freight · ${num(x.metal)} metal + ${num(x.parts)} parts`}</small></span>${!x.existingId?button('Plan link','depot-connect',m.id,`data-from="${x.machineId}"`,!own||!!x.reason):liftReady(w.corridors.find(t=>t.id===x.existingId))&&w.machines.find(s=>s.id===x.machineId)?.depotId!==m.id&&!['depot','seed'].includes(w.machines.find(s=>s.id===x.machineId)?.type)?button('Use this depot','depot-assign',x.machineId,`data-depot="${m.id}"`,!own):''}</div>`).join('')}</div></details></article>`;
 }).join('')||'<p>Place a freight depot with room for its six-bay apron. It starts with two lift connections.</p>'}</section>`;
}
