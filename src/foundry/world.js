import {BUILDINGS,ROBOTS,TECH,DESIGNS,STAGES,UNIT,machineCost} from './catalog.js';
import {claim,stock,addStock,createMachine,createRobot,syncClaims,emit,player} from './state.js';
import {industryFor} from './industry.js';
import {autoLogistics,stepRobots} from './logistics.js';
import {placement,createJob} from './commands.js';
import {offsetPosition,distanceOnMoon} from '../geography.js';
import {lunarPosition,localXY} from './navigation.js';
import {replicatorOutput,advanceBuildOrders} from './build-orders.js';
const funded=(inventory,cost)=>Object.entries(cost).every(([k,n])=>stock(inventory,k)>=n);
function consume(inventory,cost){for(const [k,n] of Object.entries(cost))inventory[k]-=n;}
function startBatch(m,batch){consume(m.inventory,batch.cost);m.fabrication={...batch,progress:0};}
function nextFree(w,c,origin,type,terrain){
  for(let i=0;i<120;i++){const a=i*2.39996323,r=30+Math.sqrt(i)*18,loc=offsetPosition(origin.lat,origin.lon,Math.cos(a)*r,Math.sin(a)*r);try{placement(w,c,type,loc,terrain);return loc;}catch(e){if(!e.code)throw e;}}
  return null;
}
function robotBay(w,c,m,role){
  for(let i=0;i<16;i++){const a=i*Math.PI/8,loc=offsetPosition(m.lat,m.lon,Math.cos(a)*(BUILDINGS[m.type].radius+3),Math.sin(a)*(BUILDINGS[m.type].radius+3));
    if(w.robots.some(r=>distanceOnMoon(lunarPosition(claim(w,r.claimId).home,r),loc)<r.radius+ROBOTS[role].radius+.15))continue;
    if([...w.machines,...w.jobs].some(o=>distanceOnMoon(o,loc)<BUILDINGS[o.type].radius+1))continue;
    return localXY(c.home,loc);
  }return null;
}
function prepareJobs(w){
  for(const j of w.jobs){j.crew=[];const c=claim(w,j.claimId);if(c.paused)continue;
    if(j.phase==='supply'&&funded(j.inventory,j.cost)){
      consume(j.inventory,j.cost);j.embodied={...j.cost};j.stage=1;j.phase=STAGES[1];j.work=0;
      emit(w,'construction.supplied',`${BUILDINGS[j.type].name} supplies arrived. Crew can prepare the site.`,{claimId:j.claimId,jobId:j.id});
    }
  }
  for(const p of w.projects){p.crew=[];if(!p.complete&&p.phase==='supply'&&funded(p.delivered,p.needs)){p.phase='assemble';emit(w,'project.supplied',`${p.name}: all materials delivered. Assembly crew requested.`,{projectId:p.id,claimId:p.claimId});}}
}
function finishJobs(w,worked){
  for(const j of [...w.jobs]){
    if(j.phase==='supply'||claim(w,j.claimId).paused)continue;
    j.work+=worked.get('job:'+j.id)||0;
    if(j.work>=j.stageWork[j.stage]){
      j.work=0;j.stage++;
      if(j.stage>=STAGES.length){
        const c=claim(w,j.claimId),m=createMachine(w,c,j.type,{lat:j.lat,lon:j.lon},{id:j.id,rotation:j.rotation,generation:j.generation,design:j.design,inventory:{...j.inventory},mode:j.type==='workshop'?'parts':j.mode,embodied:j.embodied});
        w.jobs=w.jobs.filter(x=>x.id!==j.id);w.totals.machinesBuilt++;emit(w,'construction.completed',`${BUILDINGS[j.type].name} commissioned by its robot crew`,{claimId:c.id,machineId:m.id});continue;
      }
      j.phase=STAGES[j.stage];emit(w,'construction.stage',`${BUILDINGS[j.type].name}: ${j.phase}`,{claimId:j.claimId,jobId:j.id});
    }
    j.remaining=(j.stageWork.slice(j.stage).reduce((a,b)=>a+b,0)-j.work)/UNIT;
  }
  for(const p of w.projects)if(!p.complete&&p.phase==='assemble'){
    p.workDone=Math.min(p.work,p.workDone+(worked.get('project:'+p.id)||0));
    if(p.workDone>=p.work){p.complete=true;p.phase='online';p.completedAt=w.tick;emit(w,'project.completed',`${p.name} is online. ${p.benefit}`,{projectId:p.id});}
  }
}
function production(w,industries,{terrain}={}){
  for(const c of w.claims){if(c.paused)continue;const i=industries[c.id],machines=w.machines.filter(m=>m.claimId===c.id);
    for(const m of machines){
      const active=i.states[m.id]==='active',profile=DESIGNS[m.design||'balanced'],f=i.powerFactor*profile.rate;
      if(active&&m.type!=='seed'&&w.tick%(m.type==='solar'?12:m.type==='compute'?6:3)===0){m.wearDebt=(m.wearDebt||0)+Math.round(profile.wear*1000);const wear=Math.floor(m.wearDebt/1000);m.wearDebt%=1000;m.condition=Math.max(0,m.condition-wear);}
      if(!active||m.upgrade)continue;
      if(m.type==='miner'){const n=Math.min(c.deposit,Math.floor(c.yieldPerSecond*f),Math.max(0,40000-stock(m.inventory,'rock')));c.deposit-=n;addStock(m.inventory,'rock',n);w.totals.mined+=n;m.produced+=n;}
      if(m.type==='refinery'){const n=Math.min(Math.floor(stock(m.inventory,'rock')/2),Math.floor(100*f),Math.max(0,30000-stock(m.inventory,'metal')));m.inventory.rock-=n*2;addStock(m.inventory,'metal',n);w.totals.refined+=n;m.produced+=n;}
      if(m.type==='workshop'&&!m.fabrication&&m.mode!=='off'){
        const output=m.mode==='spares'?'spares':'parts',cost=output==='parts'?{metal:2000}:{metal:1000,parts:1000},seconds=output==='parts'?12:18;
        if(stock(m.inventory,output)<8000&&funded(m.inventory,cost))startBatch(m,{output,amount:output==='parts'?1000:2000,cost,seconds});
      }
      if(m.type==='robotfactory'&&!m.fabrication&&m.queue?.length&&funded(m.inventory,m.queue[0].cost))startBatch(m,m.queue.shift());
      if(m.type==='replicator'&&replicatorOutput(m)!=='off'&&!m.fabrication&&!m.pendingBuild){
        const output=replicatorOutput(m),cost=machineCost(output);m.planCost=cost;
        if(funded(m.inventory,cost)){startBatch(m,{output:'kit.'+output,amount:UNIT,cost,seconds:Math.max(60,BUILDINGS[output].work/2),machineType:output});m.planCost=null;}
      }
      if(m.fabrication){
        const b=m.fabrication;b.progress=Math.min(b.seconds*UNIT,b.progress+Math.floor(f*UNIT));m.progress=b.progress;
        if(b.progress>=b.seconds*UNIT){
          if(b.role){const bay=robotBay(w,c,m,b.role);if(!bay){m.productionStatus='bay-blocked';continue;}createRobot(w,c,b.role,{...bay,generation:m.generation+1});w.totals.robotsBuilt++;emit(w,'robot.manufactured',`A new ${ROBOTS[b.role].name} left the robot foundry`,{claimId:c.id,machineId:m.id});}
          else{addStock(m.inventory,b.output,b.amount);m.produced+=b.amount;if(['parts','spares'].includes(b.output))w.totals[b.output]+=b.amount;}
          if(b.machineType)m.pendingBuild={type:b.machineType,kit:'kit.'+b.machineType};m.fabrication=null;m.progress=0;m.productionStatus=null;
        }
      }
      if(m.type==='tunnel'){
        const t=w.corridors.find(t=>t.fromId===m.id&&!t.complete);
        if(t){t.progress+=Math.floor(f*UNIT);if(t.progress>=10*UNIT&&stock(m.inventory,'metal')>=500&&stock(m.inventory,'parts')>=100){m.inventory.metal-=500;m.inventory.parts-=100;t.progress-=10*UNIT;t.excavated++;addStock(m.inventory,'rock',1500);if(t.excavated>=t.length){t.complete=true;t.completedAt=w.tick;emit(w,'corridor.completed','An underground utility corridor connected two facilities',{claimId:c.id,corridorId:t.id});}}}
      }
    }
    const researchWork=i.researchPerSecond;c.thought+=researchWork;
    if(c.research){const tech=TECH[c.research];c.researchProgress+=researchWork;
      if(c.researchProgress>=tech.cost*UNIT){c.unlocks.push(c.research);emit(w,'research.unlocked',`${tech.name} is now available`,{claimId:c.id,techId:c.research});c.research=null;c.researchProgress=0;}
    }
    for(const m of machines)if(m.pendingBuild&&i.states[m.id]==='active'){
      const pending=m.pendingBuild,loc=nextFree(w,c,m,pending.type,terrain);if(!loc){m.productionStatus='no-free-site';continue;}
      try{const job=createJob(w,c,pending.type,loc,{generation:m.generation+1,mode:!m.buildOrder&&pending.type==='replicator'?'replicator':'off',forceKit:true});if(m.buildOrder)m.buildOrder.waitingJobId=job.id;m.pendingBuild=null;c.replications++;}
      catch(e){if(!e.code)throw e;m.productionStatus=e.code;}
    }
    c.revision++;
  }
}
export function stepWorld(w,options={}){
  w.tick++;prepareJobs(w);advanceBuildOrders(w);
  for(const m of w.machines)if(m.type==='replicator'&&!m.fabrication&&!m.pendingBuild){const output=replicatorOutput(m);if(output!=='off')m.planCost=machineCost(output);else if(m.buildOrder)m.planCost=null;}
  if(w.tick%3===0)autoLogistics(w);
  const industries=Object.fromEntries(w.claims.map(c=>[c.id,industryFor(w,c.id)]));
  const worked=stepRobots(w,industries,options);finishJobs(w,worked);production(w,industries,options);syncClaims(w);
  const p=w.projects[0];w.project={id:p.id,name:p.name,delivered:stock(p.delivered,'metal'),contributions:Object.fromEntries(Object.entries(p.contributions).map(([id,items])=>[id,stock(items,'metal')])),complete:p.complete};
}
export function observe(w,actor){
  player(w,actor);const copy=structuredClone(w);syncClaims(copy);
  const industries=Object.fromEntries(w.claims.map(c=>[c.id,industryFor(w,c.id)]));
  return {...copy,actorId:actor,robots:copy.robots.map(r=>({...r,...lunarPosition(claim(w,r.claimId).home,r),cargo:w.freight.filter(f=>f.robotId===r.id&&f.status==='carried').map(f=>({item:f.item,amount:f.amount}))})),powers:Object.fromEntries(Object.entries(industries).map(([id,i])=>[id,i.power])),industry:industries};
}
