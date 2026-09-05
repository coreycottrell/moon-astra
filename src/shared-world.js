import {TYPES} from './simulation.js';
import {distanceOnMoon,offsetPosition} from './geography.js';
import {cellAt,cellArea,cellCenter,startingCell,validLocation} from './claims.js';
import {ECONOMY_VERSION,PRODUCTION,mindFor} from './industry.js';

export const RULESET='moon-neighbors-1';
export const UNIT=1000;
export const LIMIT=1000;
export const BUILD_TIME={solar:5,miner:6,refinery:8,compute:10,replicator:12};
export const PLANNER_WORK=120*UNIT;
export const PROJECT_COST=120*UNIT;
export const BLUEPRINT=[{type:'solar',east:0,north:0},{type:'miner',east:24,north:0},{type:'refinery',east:0,north:24}];
export class GameError extends Error{constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
const fail=(code,message,status)=>{throw new GameError(code,message,status);};
const clone=value=>structuredClone(value);
export function freshSharedWorld(){return {version:2,ruleset:RULESET,economyVersion:ECONOMY_VERSION,tick:0,nextId:1,players:[],claims:[],machines:[],jobs:[],shipments:[],events:[],sequence:0,project:{id:'first-federation',name:'The first federation',delivered:0,contributions:{},complete:false}};}
export function migrateEconomy(w){
  const version=w.economyVersion??1;
  if(version===ECONOMY_VERSION)return false;
  if(version!==1)throw Error('Unsupported saved economy. Preserve the database and use its matching version.');
  for(const c of w.claims){c.yieldPerSecond=Math.floor(c.yieldPerSecond/10);bump(c);}
  w.economyVersion=ECONOMY_VERSION;
  emit(w,'economy.updated','Harvesting and refining now run at one-tenth speed. Mind nodes supervise active industry: harvester 1, refinery 2, replicator 4; each node supplies 4 capacity.');
  return true;
}
export function emit(w,type,message,details={}){
  w.events.push({sequence:++w.sequence,tick:w.tick,type,message,...details});
  if(w.events.length>160)w.events.splice(0,w.events.length-160);
}
export function player(w,id){const p=w.players.find(p=>p.id===id);if(!p)fail('UNAUTHORIZED','This player is not part of the world',401);return p;}
export function claim(w,id){const c=w.claims.find(c=>c.id===id);if(!c)fail('CLAIM_NOT_FOUND','Claim not found',404);return c;}
function own(w,actor,id,build=false){player(w,actor);const c=claim(w,id);if(c.ownerId!==actor&&!(build&&c.builders.includes(actor)))fail('FORBIDDEN','This settlement has not granted you this permission',403);return c;}
function bump(c){c.revision++;}
export function addPlayer(w,id,name){
  if(typeof name!=='string'||!/^[\p{L}\p{N} _.-]{2,32}$/u.test(name.trim()))fail('INVALID_NAME','Use 2–32 letters, numbers, spaces, dots, or dashes');
  name=name.trim();
  if(w.players.some(p=>p.id===id||p.name.toLowerCase()===name.toLowerCase()))fail('NAME_TAKEN','That callsign already has a settlement. Use its saved access token or choose another.',409);
  if(w.players.length>=24)fail('WORLD_FULL','This collaboration preview supports 24 settlements',409);
  const cid=startingCell(w.players.length),home=cellCenter(cid),index=w.players.length;
  const p={id,name,homeClaimId:cid,home,joinedAt:w.tick};
  const c={id:cid,ownerId:id,name:`${name}'s settlement`,home,areaKm2:cellArea(cid),builders:[],metal:240*UNIT,rock:0,thought:0,deposit:250000*UNIT,yieldPerSecond:index%2?PRODUCTION.bulkHarvester:PRODUCTION.standardHarvester,profile:index%2?'Loose regolith · bulk yield':'Dense regolith · standard yield',revision:1,paused:false,unlocks:[],replications:0};
  w.players.push(p);w.claims.push(c);w.machines.push({id:w.nextId++,type:'seed',...home,rotation:0,generation:0,progress:0,claimId:cid,ownerId:id,mode:'off'});
  emit(w,'player.joined',`${name} established a neighboring settlement`,{actor:id,claimId:cid});return p;
}
export function powerFor(w,cid,minds=mindFor(w,cid)){
  let supply=0,demand=0;
  for(const m of w.machines)if(m.claimId===cid){if(minds.states[m.id]&&minds.states[m.id]!=='active')continue;const p=TYPES[m.type].power;if(p>0)supply+=p;else demand-=p;}
  const factor=demand?Math.min(1,supply/demand):1;return {supply,demand,factor};
}
export function industryFor(w,cid){
  const c=claim(w,cid),minds=mindFor(w,cid),power=powerFor(w,cid,minds);
  const active=w.machines.filter(m=>m.claimId===cid&&minds.activeIds.includes(m.id));
  const count=type=>active.filter(m=>m.type===type).length,f=Math.floor(power.factor*UNIT);
  const mined=Math.min(c.deposit,Math.floor(count('miner')*c.yieldPerSecond*f/UNIT));
  const refined=Math.min(Math.floor((c.rock+mined)/PRODUCTION.rockPerMetal),Math.floor(count('refinery')*PRODUCTION.refinery*f/UNIT));
  return {...minds,harvestPerSecond:mined,refinePerSecond:refined,powerFactor:power.factor};
}
function placement(w,c,type,loc,terrain){
  if(!Object.hasOwn(BUILD_TIME,type))fail('INVALID_MACHINE','Choose a supported machine');
  if(!validLocation(loc))fail('INVALID_LOCATION','Choose valid lunar coordinates');
  if(cellAt(loc)!==c.id)fail('OUTSIDE_CLAIM','Build inside the selected settlement boundary');
  if(w.machines.length+w.jobs.length>=LIMIT)fail('WORLD_CAPACITY','This preview supports 1,000 machines and construction jobs',409);
  if([...w.machines,...w.jobs].some(m=>distanceOnMoon(m,loc)<12))fail('OCCUPIED','Leave at least 12 m between machines and construction sites',409);
  if(terrain){const h=terrain(loc);for(const [e,n] of [[8,0],[-8,0],[0,8],[0,-8]])if(Math.abs(terrain(offsetPosition(loc.lat,loc.lon,e,n))-h)>6)fail('STEEP_TERRAIN','This ground is too steep for a basic foundation');}
}
function job(w,c,type,loc,rotation=0,generation=0){
  const j={id:w.nextId++,type,...loc,rotation,generation,claimId:c.id,ownerId:c.ownerId,remaining:BUILD_TIME[type],duration:BUILD_TIME[type]};
  c.metal-=TYPES[type].cost*UNIT;w.jobs.push(j);bump(c);return j;
}
function amount(value){if(!Number.isSafeInteger(value)||value<1||value>10000)fail('INVALID_AMOUNT','Use a whole number from 1 to 10,000 metal');return value*UNIT;}
function budget(cmd,cost){if(cmd.maxMetal!==undefined&&(!Number.isFinite(cmd.maxMetal)||cmd.maxMetal<cost/UNIT))fail('BUDGET_EXCEEDED','This plan exceeds its declared metal budget',409);}
export function applyCommand(w,actor,cmd,{terrain}={}){
  player(w,actor);
  if(!cmd||typeof cmd!=='object'||Array.isArray(cmd))fail('INVALID_COMMAND','Send a JSON command object');
  if(typeof cmd.action!=='string')fail('INVALID_COMMAND','A command action is required');
  const known=['action','claimId','type','lat','lon','rotation','amount','toClaimId','machineId','mode','playerId','paused','maxMetal'];
  if(Object.keys(cmd).some(k=>!known.includes(k)))fail('INVALID_COMMAND','Unknown command field');
  const c=own(w,actor,cmd.claimId,cmd.action==='build.place'||cmd.action==='blueprint.deploy');
  let result={};
  if(cmd.action==='build.place'){
    const loc={lat:cmd.lat,lon:cmd.lon};placement(w,c,cmd.type,loc,terrain);
    const cost=TYPES[cmd.type].cost*UNIT;budget(cmd,cost);
    if(c.metal<cost)fail('INSUFFICIENT_METAL','The local depot needs more metal',409);
    const rotation=cmd.rotation??0;if(!Number.isFinite(rotation)||Math.abs(rotation)>Math.PI*100)fail('INVALID_ROTATION','Use a finite rotation in radians');
    const j=job(w,c,cmd.type,loc,rotation);result={jobId:j.id,constructionSeconds:j.duration};
    emit(w,'construction.queued',`${TYPES[cmd.type].name} construction supplied`,{actor,claimId:c.id,jobId:j.id});
  }else if(cmd.action==='blueprint.deploy'){
    if(!c.unlocks.includes('factory-plans'))fail('TECH_LOCKED','Produce 120 research work with powered mind nodes to unlock factory plans',409);
    const cost=BLUEPRINT.reduce((n,p)=>n+TYPES[p.type].cost*UNIT,0);budget(cmd,cost);
    if(c.metal<cost)fail('INSUFFICIENT_METAL','A balanced factory needs 52 metal in its local depot',409);
    if(!validLocation(cmd))fail('INVALID_LOCATION','Choose a valid blueprint origin');
    const plans=BLUEPRINT.map(p=>({...p,loc:offsetPosition(cmd.lat,cmd.lon,p.east,p.north)}));
    if(w.machines.length+w.jobs.length+plans.length>LIMIT)fail('WORLD_CAPACITY','Insufficient construction capacity',409);
    for(const p of plans)placement(w,c,p.type,p.loc,terrain);
    result={jobs:plans.map(p=>job(w,c,p.type,p.loc).id)};
    emit(w,'blueprint.deployed','A mind-designed balanced factory entered construction',{actor,claimId:c.id,...result});
  }else if(cmd.action==='replicator.configure'){
    if(!c.unlocks.includes('factory-plans'))fail('TECH_LOCKED','Factory planning research is required',409);
    const m=w.machines.find(m=>m.id===cmd.machineId&&m.claimId===c.id&&m.type==='replicator');
    if(!m)fail('MACHINE_NOT_FOUND','Select a replicator in this settlement',404);
    if(!['off',...Object.keys(BUILD_TIME)].includes(cmd.mode))fail('INVALID_MODE','Choose an output from the catalog');
    if(cmd.mode==='replicator'&&!w.project.complete)fail('TECH_LOCKED','Complete the first federation project to reproduce replicators',409);
    m.mode=cmd.mode;m.progress=0;bump(c);result={machineId:m.id,mode:m.mode};
    emit(w,'replicator.configured',`Replicator output set to ${cmd.mode}`,{actor,claimId:c.id,...result});
  }else if(cmd.action==='shipment.send'||cmd.action==='project.contribute'){
    const n=amount(cmd.amount);budget(cmd,n);
    if(c.metal<n)fail('INSUFFICIENT_METAL','The local depot cannot fund this shipment',409);
    let target;
    if(cmd.action==='shipment.send'){
      target=claim(w,cmd.toClaimId);if(target.id===c.id)fail('INVALID_TARGET','Choose another settlement');
    }else{
      if(w.project.complete)fail('PROJECT_COMPLETE','The federation is already online',409);
      const reserved=w.shipments.filter(s=>s.project&&s.ownerId===actor).reduce((a,s)=>a+s.metal,0);
      if((w.project.contributions[actor]||0)+reserved+n>PROJECT_COST/2)fail('CONTRIBUTION_LIMIT','Each player may supply at most 60 metal; a federation needs partners',409);
      target={id:'first-federation',home:w.claims[0].home};
    }
    const seconds=Math.max(5,Math.ceil(distanceOnMoon(c.home,target.home)/50));
    const s={id:w.nextId++,ownerId:actor,from:c.id,to:target.id,metal:n,departedAt:w.tick,arrivesAt:w.tick+seconds,project:cmd.action==='project.contribute'};
    c.metal-=n;bump(c);w.shipments.push(s);result={shipmentId:s.id,arrivalTick:s.arrivesAt};
    emit(w,'shipment.departed',`${cmd.amount} metal departed ${c.name}`,{actor,claimId:c.id,...result});
  }else if(cmd.action==='claim.pause'){
    if(typeof cmd.paused!=='boolean')fail('INVALID_PAUSE','paused must be true or false');c.paused=cmd.paused;bump(c);result={paused:c.paused};
  }else if(cmd.action==='claim.grant'){
    player(w,cmd.playerId);if(!c.builders.includes(cmd.playerId))c.builders.push(cmd.playerId);bump(c);result={builders:[...c.builders]};
    emit(w,'claim.granted','A neighbor was granted construction access',{actor,claimId:c.id,playerId:cmd.playerId});
  }else if(cmd.action==='claim.revoke'){
    c.builders=c.builders.filter(id=>id!==cmd.playerId);bump(c);result={builders:[...c.builders]};
  }else fail('UNKNOWN_ACTION','This action is not supported');
  return result;
}
export function stepWorld(w,{terrain}={}){
  w.tick++;
  for(const s of [...w.shipments])if(s.arrivesAt<=w.tick){
    if(s.project){w.project.delivered+=s.metal;w.project.contributions[s.ownerId]=(w.project.contributions[s.ownerId]||0)+s.metal;}
    else{const c=claim(w,s.to);c.metal+=s.metal;bump(c);}
    w.shipments=w.shipments.filter(x=>x.id!==s.id);emit(w,'shipment.arrived',`${s.metal/UNIT} metal delivered`,{shipmentId:s.id,actor:s.ownerId});
  }
  if(!w.project.complete&&w.project.delivered>=PROJECT_COST){w.project.complete=true;emit(w,'research.federation','The first federation is online. Recursive replicator designs are now available.');}
  for(const c of w.claims){
    if(c.paused)continue;
    for(const j of [...w.jobs])if(j.claimId===c.id&&--j.remaining<=0){
      w.jobs=w.jobs.filter(x=>x.id!==j.id);
      const {remaining,duration,...m}=j;w.machines.push({...m,progress:0,mode:m.mode||'off'});
      emit(w,'construction.completed',`${TYPES[j.type].name} commissioned`,{claimId:c.id,machineId:j.id});
    }
    const machines=w.machines.filter(m=>m.claimId===c.id),count=t=>machines.filter(m=>m.type===t).length;
    const industry=industryFor(w,c.id),f=Math.floor(industry.powerFactor*UNIT);
    const mined=industry.harvestPerSecond;
    c.deposit-=mined;c.rock+=mined;
    const refined=industry.refinePerSecond;c.rock-=refined*PRODUCTION.rockPerMetal;c.metal+=refined;
    c.thought+=count('compute')*f;
    if(c.thought>=PLANNER_WORK&&!c.unlocks.includes('factory-plans')){
      c.unlocks.push('factory-plans');emit(w,'research.unlocked','Factory plans unlocked: deploy a complete production layout and program replicators',{claimId:c.id,actor:c.ownerId});
    }
    for(const m of machines)if(m.type==='replicator'&&industry.activeIds.includes(m.id)){
      m.progress=Math.min(24*UNIT,m.progress+f);
      if(m.progress>=24*UNIT&&c.metal>=TYPES[m.mode].cost*UNIT){
        for(let i=0;i<100;i++){
          const a=i*2.399963229728653,r=24+Math.sqrt(i)*17,loc=offsetPosition(m.lat,m.lon,Math.cos(a)*r,Math.sin(a)*r);
          try{placement(w,c,m.mode,loc,terrain);}catch(e){if(e instanceof GameError)continue;throw e;}
          const j=job(w,c,m.mode,loc,m.rotation,m.generation+1);if(j.type==='replicator')j.mode=m.mode;m.progress=0;c.replications++;
          emit(w,'replication.queued',`Generation ${j.generation}: ${TYPES[j.type].name} supplied for construction`,{claimId:c.id,parentId:m.id,jobId:j.id});break;
        }
      }
    }
    bump(c);
  }
}
export function observe(w,actor){player(w,actor);return {...clone(w),actorId:actor,powers:Object.fromEntries(w.claims.map(c=>[c.id,powerFor(w,c.id)])),industry:Object.fromEntries(w.claims.map(c=>[c.id,industryFor(w,c.id)]))};}
export function preview(w,actor,cmd,options){const copy=clone(w);return {ok:true,result:applyCommand(copy,actor,cmd,options),atTick:w.tick};}
