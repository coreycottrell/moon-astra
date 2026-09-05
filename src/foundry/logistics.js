import {BUILDINGS,ROBOTS,LIMITS,UNIT,machineCost} from './catalog.js';
import {stock,addStock,countStock,claim,machine,emit,fail} from './state.js';
import {localXY,lunarPosition,distance,moveRobot} from './navigation.js';

export function endpoint(w,kind,id){if(kind==='machine')return machine(w,id);if(kind==='job')return w.jobs.find(j=>j.id===id);if(kind==='project')return w.projects.find(p=>p.id===id);return null;}
export function incoming(w,kind,id,item){return w.freight.filter(f=>f.toKind===kind&&f.toId===id&&f.item===item).reduce((n,f)=>n+f.amount,0);}
export function available(w,cid,item){return w.machines.filter(m=>m.claimId===cid).reduce((n,m)=>n+stock(m.inventory,item),0);}
export function canFund(w,cid,cost){return Object.entries(cost).every(([item,n])=>available(w,cid,item)>=n);}
export function makeFreight(w,source,toKind,toId,item,amount,{purpose='supply',ownerId=source.ownerId,fromLocation}={}){
  if(amount<=0)return [];
  const chunks=Math.ceil(amount/6000);if(w.freight.length+chunks>LIMITS.freight)fail('FREIGHT_CAPACITY','Finish some deliveries before reserving more material');
  if(stock(source.inventory,item)<amount)fail('INSUFFICIENT_MATERIALS',`The source lacks ${item}`);
  source.inventory[item]-=amount;const ids=[];
  while(amount>0){const n=Math.min(6000,amount),f={id:w.nextId++,claimId:source.claimId,ownerId,fromId:source.id,fromLocation:fromLocation||{lat:source.lat,lon:source.lon,radius:BUILDINGS[source.type]?.radius||0},toKind,toId,item,amount:n,status:'waiting',robotId:null,purpose,createdAt:w.tick};w.freight.push(f);ids.push(f.id);amount-=n;}
  return ids;
}
export function reserve(w,cid,cost,toKind,toId,options={}){
  if(!canFund(w,cid,cost))fail('INSUFFICIENT_MATERIALS','The settlement lacks the complete material bill. Existing reservations are excluded.');
  const sources=w.machines.filter(m=>m.claimId===cid),ids=[];
  // Capacity is checked before any stock moves, even when called outside an API clone.
  const packetCount=Object.entries(cost).reduce((n,[item,total])=>{for(const s of sources){const take=Math.min(total,stock(s.inventory,item));n+=Math.ceil(take/6000);total-=take;}return n;},0);
  if(w.freight.length+packetCount>LIMITS.freight)fail('FREIGHT_CAPACITY','Finish some deliveries before reserving more material');
  for(const [item,total] of Object.entries(cost)){let remaining=total;for(const source of sources){const n=Math.min(remaining,stock(source.inventory,item));if(n)ids.push(...makeFreight(w,source,toKind,toId,item,n,options));remaining-=n;if(!remaining)break;}}
  return ids;
}
export function port(w,r,target,slot=0){
  const home=claim(w,r.claimId).home,p=target.x!==undefined&&target.claimId===r.claimId?target:localXY(home,target),radius=target.radius??BUILDINGS[target.type]?.radius??0;
  const key=(target.id??target.lat+':'+target.lon)+':'+slot;
  const obstacles=[...w.machines,...w.jobs,...w.projects].map(m=>({...localXY(home,m),radius:m.radius??BUILDINGS[m.type]?.radius??7}));
  const clear=point=>obstacles.every(o=>distance(o,point)>=o.radius+(r.radius||.8)+.12);
  if(r.berth?.key===key&&clear(r.berth.position))return r.berth.position;
  for(let n=0;n<16;n++){
    const angle=(slot*2+n)*Math.PI/8,point={x:p.x+Math.cos(angle)*(radius+2.5),y:p.y+Math.sin(angle)*(radius+2.5)};
    if(!clear(point))continue;
    const reserved=w.robots.some(o=>o.id!==r.id&&o.berth&&distance(localXY(home,lunarPosition(claim(w,o.claimId).home,o.berth.position)),point)<(r.radius||.8)+(o.radius||.8)+.15);
    if(reserved)continue;r.berth={key,position:point};return point;
  }
  // Keep a visible blocked assignment if the site has no accessible service face.
  return {x:p.x+Math.cos(slot*Math.PI/4)*(radius+2.5),y:p.y+Math.sin(slot*Math.PI/4)*(radius+2.5)};
}
function cancelTask(r){r.task=null;r.path=[];r.destination=null;r.berth=null;r.status='idle';}
export function cancelJob(w,j){
  const depot=w.machines.find(m=>m.claimId===j.claimId&&m.type==='seed');
  for(const f of [...w.freight])if(f.toKind==='job'&&f.toId===j.id){
    if(f.status==='waiting'){const source=machine(w,f.fromId)||depot;addStock(source.inventory,f.item,f.amount);w.freight=w.freight.filter(x=>x.id!==f.id);}
    else{f.toKind='machine';f.toId=depot.id;f.purpose='return';}
  }
  const returned={...j.inventory};
  // Once assembly starts, material is embodied in the site. Salvage is a
  // deliberate 75% recovery, never a second refund of its original reservation.
  if(j.embodied){const salvage=j.prefab&&j.stage<=1?j.embodied:j.prefab?machineCost(j.type,j.design):j.embodied,factor=j.prefab&&j.stage<=1?1:.75;for(const [item,n] of Object.entries(salvage))addStock(returned,item,Math.floor(n*factor));}
  const site={...j,inventory:returned};
  for(const [item,n] of Object.entries(returned))if(n)makeFreight(w,site,'machine',depot.id,item,n,{purpose:'salvage',fromLocation:{lat:j.lat,lon:j.lon,radius:0}});
  for(const r of w.robots)if(r.task?.kind==='build'&&r.task.id===j.id)cancelTask(r);
  w.jobs=w.jobs.filter(x=>x.id!==j.id);emit(w,'construction.cancelled','Construction cancelled; uncollected supplies released and site salvage awaits transport',{claimId:j.claimId,jobId:j.id});
}

function requestInputs(w,m,wanted){
  for(const [item,target] of Object.entries(wanted)){
    let needed=target-stock(m.inventory,item)-incoming(w,'machine',m.id,item);if(needed<=0)continue;
    const sources=w.machines.filter(s=>s.claimId===m.claimId&&s.id!==m.id&&stock(s.inventory,item)>0&&!(s.type==='refinery'&&item==='rock')&&!(s.type==='workshop'&&item==='metal')).sort((a,b)=>a.id-b.id);
    for(const s of sources){const amount=Math.min(needed,stock(s.inventory,item),12000);if(amount>0){makeFreight(w,s,'machine',m.id,item,amount,{purpose:'industry'});needed-=amount;}if(needed<=0)break;}
  }
}
export function autoLogistics(w){
  if(w.freight.length>LIMITS.freight-100)return;
  try{
  for(const c of w.claims){if(c.paused||!c.autoLogistics)continue;
    const machines=w.machines.filter(m=>m.claimId===c.id),depot=machines.find(m=>m.type==='seed');
    for(const m of machines){
      if(!m.enabled||m.condition<=0)continue;
      if(m.type==='refinery')requestInputs(w,m,{rock:16000});
      if(m.type==='workshop')requestInputs(w,m,m.mode==='spares'?{metal:6000,parts:4000}:{metal:8000});
      if(m.queue?.length)requestInputs(w,m,m.queue[0].cost);
      if(m.type==='replicator'&&m.planCost)requestInputs(w,m,m.planCost);
      const corridor=w.corridors.find(t=>t.fromId===m.id&&!t.complete);if(corridor)requestInputs(w,m,{metal:8000,parts:2000});
      const outputs=m.type==='refinery'?['metal']:m.type==='workshop'?['parts','spares']:[];
      for(const item of outputs)if(stock(m.inventory,item)>=6000&&!m.fabrication?.cost?.[item])makeFreight(w,m,'machine',depot.id,item,stock(m.inventory,item)-2000,{purpose:'warehouse'});
    }
  }
  }catch(error){if(error.code!=='FREIGHT_CAPACITY')throw error;}
}

function assignHaul(w,r){
  const candidates=w.freight.filter(f=>f.status==='waiting'&&!f.robotId&&f.claimId===r.workClaimId&&endpoint(w,f.toKind,f.toId));
  // Construction and shared commitments precede speculative inventory filling.
  candidates.sort((a,b)=>(a.purpose==='construction'?-2:a.purpose==='project'?-1:0)-(b.purpose==='construction'?-2:b.purpose==='project'?-1:0)||a.createdAt-b.createdAt||a.id-b.id);
  const first=candidates[0];if(!first)return false;
  let room=ROBOTS[r.role].capacity;const ids=[];
  for(const f of candidates)if(f.fromId===first.fromId&&f.toKind===first.toKind&&f.toId===first.toId&&f.amount<=room){f.robotId=r.id;ids.push(f.id);room-=f.amount;}
  if(!ids.length)return false;r.task={kind:'haul',ids,stage:'pickup',slot:r.id%8};r.status='collecting';return true;
}
function assignService(w,r){
  const c=claim(w,r.workClaimId),threshold=c.unlocks.includes('service-loop')?7000:3500;
  const others=w.robots.filter(x=>x.workClaimId===c.id&&!x.reconditioning&&!x.serviceBy&&x.task?.kind!=='service'),machines=w.machines.filter(m=>m.claimId===c.id&&m.type!=='seed'&&!m.serviceBy);
  const targets=[...others.map(o=>({kind:'robot',o})),...machines.map(o=>({kind:'machine',o}))].filter(t=>t.o.condition<threshold||t.o.upgrade).sort((a,b)=>a.o.condition-b.o.condition||a.o.id-b.o.id);
  if(!targets.length)return false;
  const source=w.machines.find(m=>m.claimId===r.claimId&&stock(m.inventory,'spares')>=1000);if(!source)return false;
  const target=targets[0];source.inventory.spares-=1000;target.o.serviceBy=r.id;
  r.task={kind:'service',targetKind:target.kind,id:target.o.id,stage:'supply',sourceId:source.id,kit:1000,work:0};r.status='collecting-service-kit';return true;
}
function assignBuild(w,r){
  const c=claim(w,r.workClaimId);if(c.paused)return false;
  const sites=[...w.jobs.filter(j=>j.claimId===c.id&&j.phase!=='supply').map(j=>({kind:'job',j})),...w.projects.filter(j=>j.claimId===c.id&&!j.complete&&j.phase==='assemble').map(j=>({kind:'project',j}))];
  for(const {kind,j} of sites){const crew=w.robots.filter(x=>x.task?.kind==='build'&&x.task.id===j.id&&x.task.targetKind===kind),max=kind==='job'&&['connect','commission'].includes(j.phase)?1:c.crewLimit;if(crew.length>=max)continue;
    const used=new Set(crew.map(x=>x.task.slot));let slot=0;while(used.has(slot))slot+=2;
    r.task={kind:'build',targetKind:kind,id:j.id,slot};r.status='approaching-site';return true;
  }return false;
}

function assign(w,r){
  if(r.condition<=0){r.status='needs-service';return;}
  if(r.role==='service'&&assignService(w,r))return;
  if(r.role!=='hauler'&&assignBuild(w,r))return;
  if(assignHaul(w,r))return;
  if(assignBuild(w,r))return;
  if(assignService(w,r))return;
  r.status='idle';
}
function serviceTarget(w,task){return task.targetKind==='robot'?w.robots.find(r=>r.id===task.id):machine(w,task.id);}

export function stepRobots(w,industries,{terrain}={}){
  const accepted=[],worked=new Map(),perClaim=new Map();
  const obstacleCache=new Map();
  const obstaclesFor=cid=>{if(obstacleCache.has(cid))return obstacleCache.get(cid);const home=claim(w,cid).home,obs=[...w.machines,...w.jobs,...w.projects.filter(p=>p.phase!=='supply'||countStock(p.delivered)>0)].map(m=>({...localXY(home,m),radius:m.radius??BUILDINGS[m.type]?.radius??7}));obstacleCache.set(cid,obs);return obs;};
  // Rotating deterministic right-of-way avoids permanently favoring low IDs.
  const robots=[...w.robots].sort((a,b)=>a.id-b.id);
  if(robots.length)robots.push(...robots.splice(0,w.tick%robots.length));
  for(const r of robots){
    const c=claim(w,r.claimId),workClaim=claim(w,r.workClaimId),home=c.home;
    if(r.lentUntil&&r.lentUntil<=w.tick&&r.task?.kind!=='haul'&&r.task?.kind!=='service'){cancelTask(r);r.workClaimId=r.claimId;r.lentUntil=null;}
    if(c.paused||workClaim.paused){r.status='paused';continue;}
    const inUse=perClaim.get(r.workClaimId)||0,slots=industries[r.workClaimId].crewSlots;
    if(inUse>=slots&&!r.reconditioning){r.status='mind-limited';continue;}perClaim.set(r.workClaimId,inUse+1);
    const others=w.robots.filter(o=>o.id!==r.id).map(o=>{const p=lunarPosition(claim(w,o.claimId).home,o);return {...o,...localXY(home,p)};});
    const ownAccepted=accepted.map(s=>({...s,a:localXY(home,s.a),b:localXY(home,s.b)}));
    const moves=[],obstacles=obstaclesFor(r.claimId);
    const walkable=terrain?(a,b)=>{const d=distance(a,b),steps=Math.max(1,Math.ceil(d/8));let h=terrain(lunarPosition(home,a));for(let i=1;i<=steps;i++){const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},next=terrain(lunarPosition(home,p));if(Math.abs(next-h)>Math.max(1,d/steps*.6))return false;h=next;}return true;}:undefined;
    const go=target=>{
      const old={x:r.x,y:r.y},condition=Math.max(.2,r.condition/10000),speed=ROBOTS[r.role].speed*(.5+.5*condition);
      const arrived=moveRobot(r,target,obstacles,others,ownAccepted,{speed,walkable});
      if(distance(old,r)>.001){r.rotation=Math.atan2(r.x-old.x,r.y-old.y);r.condition=Math.max(0,r.condition-1);moves.push({a:lunarPosition(home,old),b:lunarPosition(home,r),radius:r.radius||.8});}
      return arrived;
    };
    if(r.reconditioning){
      const lander=w.machines.find(m=>m.claimId===c.id&&m.type==='seed');r.status='reconditioning';
      if(go(port(w,r,lander,r.id%8))&&--r.reconditioning.remaining<=0){r.condition=5000;r.reconditioning=null;cancelTask(r);emit(w,'robot.reconditioned',`${r.name} ${r.id} returned to half condition at the lander`,{claimId:c.id,robotId:r.id});}
    }else if(r.serviceBy&&r.serviceBy!==r.id){r.status='awaiting-service';}
    else{
      if(!r.task)assign(w,r);
      const task=r.task;
      if(!task&&r.condition>0){
        // Idle robots vacate work and freight berths. Parking is physical too.
        let parking;
        for(let slot=0;slot<32;slot++){
          const a=((r.id+slot)%32)*Math.PI/16,rad=23+Math.floor(r.id/32)*3,p={x:Math.cos(a)*rad,y:Math.sin(a)*rad};
          if(obstacles.every(o=>distance(o,p)>o.radius+r.radius+.5)&&others.every(o=>distance(o,p)>o.radius+r.radius+.3)){parking=p;break;}
        }
        if(parking){r.status='parking';if(go(parking))r.status='idle';}
      }
      if(task?.kind==='haul'){
        const packets=w.freight.filter(f=>task.ids.includes(f.id));
        if(!packets.length)cancelTask(r);
        else{const first=packets[0],target=task.stage==='pickup'?first.fromLocation:endpoint(w,first.toKind,first.toId);
          if(!target){for(const f of packets){f.toKind='machine';f.toId=w.machines.find(m=>m.claimId===f.claimId&&m.type==='seed').id;}r.path=[];}
          else{
            r.status=task.stage==='pickup'?'collecting':'delivering';
            if(go(port(w,r,target,task.slot))){
              if(task.stage==='pickup'){for(const f of packets)f.status='carried';task.stage='delivery';r.path=[];}
              else{
                for(const f of packets){const destination=endpoint(w,f.toKind,f.toId);if(f.toKind==='project'){addStock(destination.delivered,f.item,f.amount);destination.contributions[f.ownerId]??={};addStock(destination.contributions[f.ownerId],f.item,f.amount);}else addStock(destination.inventory,f.item,f.amount);w.totals.freightDelivered+=f.amount;}
                w.freight=w.freight.filter(f=>!task.ids.includes(f.id));cancelTask(r);
              }
            }
          }
        }
      }else if(task?.kind==='build'){
        const j=endpoint(w,task.targetKind,task.id);
        if(!j||j.complete||j.phase==='supply')cancelTask(r);
        else{
          const crew=w.robots.filter(x=>x.task?.kind==='build'&&x.task.id===j.id&&x.task.targetKind===task.targetKind),max=['connect','commission'].includes(j.phase)?1:workClaim.crewLimit;
          if(crew.indexOf(r)>=max)cancelTask(r);
          else{r.status='approaching-site';if(go(port(w,r,{...j,radius:BUILDINGS[j.type]?.radius||7},task.slot))){
            const power=industries[workClaim.id].powerFactor,rate=Math.floor(ROBOTS[r.role].assembly*Math.max(.2,r.condition/10000)*(.35+.65*power)/(1+.1*(crew.length-1)));
            r.status='building';r.condition=Math.max(0,r.condition-1);r.workDone+=rate;j.crew??=[];j.crew.push(r.id);
            const key=task.targetKind+':'+j.id;worked.set(key,(worked.get(key)||0)+rate);
          }}
        }
      }else if(task?.kind==='service'){
        const target=serviceTarget(w,task),source=machine(w,task.sourceId);
        if(!target||!source){if(target)target.serviceBy=null;if(source)addStock(source.inventory,'spares',task.kit);cancelTask(r);}
        else if(task.stage==='supply'){r.status='collecting-service-kit';if(go(port(w,r,source,r.id%8))){task.stage='service';r.path=[];}}
        else{
          const dest=task.targetKind==='robot'?{...lunarPosition(claim(w,target.claimId).home,target),radius:target.radius||.8}:target;
          const atTarget=target.id===r.id||go(port(w,r,dest,0));r.status='servicing';
          if(atTarget){task.work+=Math.floor(ROBOTS[r.role].service*Math.max(.2,r.condition/10000));if(task.work>=(target.upgrade?60000:30000)){
            target.condition=10000;target.serviceBy=null;if(target.upgrade){target.design=target.upgrade.profile;target.upgrade=null;}
            w.totals.repairs++;emit(w,'service.completed',`Crew restored ${task.targetKind} ${target.id}`,{claimId:c.id,targetId:target.id});cancelTask(r);
          }}
        }
      }
    }
    accepted.push(...moves);
  }
  return worked;
}
