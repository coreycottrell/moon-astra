import {BUILDINGS,ROBOTS,TECH,DESIGNS,ACTIONS,UNIT,LIMITS,STAGES,machineCost} from './catalog.js';
import {player,claim,own,machine,stock,emit,fail} from './state.js';
import {validLocation,cellAt} from '../claims.js';
import {distanceOnMoon,offsetPosition} from '../geography.js';
import {lunarPosition} from './navigation.js';
import {available,reserve,cancelJob,makeFreight,incoming} from './logistics.js';

import {validateBuildOrder} from './build-orders.js';
import {corridorEstimate} from './corridors.js';
import {DEPOT_LIMITS,depotEnvelope,planLiftTerminals,activeRides,liftReady} from './lift-network.js';
import {queueLiftFitout,expandDepot,upgradeTunnel} from './infrastructure.js';

export const BLUEPRINT=[{type:'solar',east:0,north:0},{type:'miner',east:26,north:0},{type:'refinery',east:0,north:26}];
export function placement(w,c,type,loc,terrain){
  if(!Object.hasOwn(BUILDINGS,type)||type==='seed')fail('INVALID_MACHINE','Choose a catalog machine',400);
  if(!validLocation(loc))fail('INVALID_LOCATION','Choose valid lunar coordinates',400);
  if(cellAt(loc)!==c.id)fail('OUTSIDE_CLAIM','Build inside the selected settlement boundary');
  if(distanceOnMoon(c.home,loc)>LIMITS.localBuildRadius)fail('OUTSIDE_SERVICE_AREA','This phase supports physical construction within 900 m of the seed. Use relays to extend utilities.');
  if(BUILDINGS[type].tech&&!c.unlocks.includes(BUILDINGS[type].tech))fail('TECH_LOCKED',`Research ${TECH[BUILDINGS[type].tech].name} first`);
  if(w.machines.length+w.jobs.length>=LIMITS.machines)fail('WORLD_CAPACITY','This preview supports 1,000 machines and construction sites');
  const radius=type==='depot'?DEPOT_LIMITS.apronRadius:BUILDINGS[type].radius;
  if(w.corridors.some(t=>t.portals&&Object.values(t.portals).flat().some(p=>distanceOnMoon(p,loc)<radius+4)))fail('PORTAL_RESERVED','Leave the tunnel entrance and exit lanes clear');
  if([...w.machines,...w.jobs,...w.projects].some(m=>distanceOnMoon(m,loc)<radius+depotEnvelope(m)+4))fail('OCCUPIED','Leave a clear service lane between machine footprints and project sites');
  if(w.robots.some(r=>distanceOnMoon(lunarPosition(claim(w,r.claimId).home,r),loc)<radius+(r.radius||.8)+.2))fail('ROBOT_IN_FOOTPRINT','A robot is in this footprint. Give the crew room to move.');
  if(terrain){const h=terrain(loc);for(const [e,n] of [[radius,0],[-radius,0],[0,radius],[0,-radius]])if(Math.abs(terrain(offsetPosition(loc.lat,loc.lon,e,n))-h)>radius*.65)fail('STEEP_TERRAIN','This ground is too steep for a basic foundation');}
}
export function createJob(w,c,type,loc,{rotation=0,generation=0,design='balanced',mode='off',forceKit=false,maxMetal}={}){
  const kitItem=design==='balanced'?`kit.${type}`:`kit.${type}.${design}`,prefab=available(w,c.id,kitItem)>=UNIT;
  if(forceKit&&!prefab)fail('KIT_UNAVAILABLE','Fabricated kit is not available');
  const cost=prefab?{[kitItem]:UNIT}:machineCost(type,design);
  if(maxMetal!==undefined&&(!Number.isFinite(maxMetal)||maxMetal<0||maxMetal<(cost.metal||0)/UNIT))fail('BUDGET_EXCEEDED','This plan exceeds its metal budget');
  const stageWork=[0,(prefab?12:24)*UNIT,Math.ceil(BUILDINGS[type].work*UNIT*(prefab?.25:1)*(w.projects[2]?.complete?.9:1)),12*UNIT,16*UNIT];
  const j={id:w.nextId++,type,...loc,rotation,generation,design,mode,claimId:c.id,ownerId:c.ownerId,inventory:{},cost,prefab,phase:'supply',stage:0,stageWork,work:0,crew:[],duration:stageWork.reduce((a,b)=>a+b,0)/UNIT,remaining:stageWork.reduce((a,b)=>a+b,0)/UNIT,createdAt:w.tick};
  if(type==='depot')j.depotHub={bays:2,version:1};
  reserve(w,c.id,cost,'job',j.id,{purpose:'construction'});w.jobs.push(j);
  emit(w,'construction.queued',`${BUILDINGS[type].name}: ${prefab?'prefabricated kit':'metal and components'} reserved for physical delivery`,{claimId:c.id,jobId:j.id});return j;
}
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail('INVALID_VALUE',`${label} must be a whole number from ${min} to ${max}`,400);return value;};
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))fail('INVALID_TEXT',`${label} must contain 1–${max} readable characters`,400);return value.trim();};
function ownedMachine(w,c,id,type){const m=machine(w,id);if(!m||m.claimId!==c.id||(type&&m.type!==type))fail('MACHINE_NOT_FOUND','Select the correct machine in this settlement',404);return m;}
function ownedRobot(w,c,id){const r=w.robots.find(r=>r.id===id&&r.claimId===c.id);if(!r)fail('ROBOT_NOT_FOUND','Select a robot owned by this settlement',404);return r;}
function spendLocal(m,cost){if(Object.entries(cost).some(([k,n])=>stock(m.inventory,k)<n))fail('LOCAL_MATERIALS_REQUIRED','Deliver the upgrade materials to this machine first');for(const [k,n] of Object.entries(cost))m.inventory[k]-=n;}
export function applyCommand(w,actor,cmd,{terrain}={}){
  player(w,actor);if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||!ACTIONS.includes(cmd.action))fail('UNKNOWN_ACTION','Choose a supported command action',400);
  const known=['action','claimId','type','lat','lon','rotation','amount','toClaimId','machineId','mode','playerId','paused','maxMetal','jobId','robotId','role','count','maxActive','workers','autoLogistics','targetClaimId','duration','techId','profile','resource','fromId','toId','projectId','title','body','kind','postId','enabled','requestType','supplies','steps','repeat','group','corridorId','tier','depotId'];
  if(Object.keys(cmd).some(k=>!known.includes(k)))fail('INVALID_COMMAND','Unknown command field',400);
  const c=own(w,actor,cmd.claimId,['build.place','blueprint.deploy'].includes(cmd.action));let result={};
  if(cmd.action==='build.place'){
    const loc={lat:cmd.lat,lon:cmd.lon};placement(w,c,cmd.type,loc,terrain);
    const rotation=cmd.rotation??0;if(!Number.isFinite(rotation)||Math.abs(rotation)>Math.PI*100)fail('INVALID_ROTATION','Use a finite rotation in radians',400);
    const design=cmd.profile||'balanced';if(!Object.hasOwn(DESIGNS,design))fail('INVALID_DESIGN','Choose a certified design profile',400);
    if(design!=='balanced'&&!w.designs.some(d=>d.claimId===c.id&&d.type===cmd.type&&d.profile===design))fail('UNCERTIFIED_DESIGN','Certify this machine profile first');
    const j=createJob(w,c,cmd.type,loc,{rotation,design,maxMetal:cmd.maxMetal});result={jobId:j.id,phase:j.phase,prefab:j.prefab,reserved:j.cost,assemblyWork:j.stageWork[2]/UNIT};
  }else if(cmd.action==='build.cancel'){
    const j=w.jobs.find(j=>j.id===cmd.jobId&&j.claimId===c.id);if(!j)fail('JOB_NOT_FOUND','Construction site not found',404);cancelJob(w,j);result={jobId:j.id};
  }else if(cmd.action==='blueprint.deploy'){
    if(!c.unlocks.includes('factory-plans'))fail('TECH_LOCKED','Research factory planning first');
    if(!validLocation(cmd))fail('INVALID_LOCATION','Choose a valid blueprint origin',400);
    const plans=BLUEPRINT.map(p=>({...p,loc:offsetPosition(cmd.lat,cmd.lon,p.east,p.north)}));
    const before=new Set(w.jobs.map(j=>j.id));for(const p of plans){placement(w,c,p.type,p.loc,terrain);createJob(w,c,p.type,p.loc,{maxMetal:cmd.maxMetal});}
    const jobs=w.jobs.filter(j=>!before.has(j.id)),total=jobs.reduce((n,j)=>n+(j.cost.metal||0),0)/UNIT;
    if(cmd.maxMetal!==undefined&&total>cmd.maxMetal)fail('BUDGET_EXCEEDED','The entire layout exceeds the declared metal budget');result={jobs:jobs.map(j=>j.id),metalReserved:total};
  }else if(['machine.configure','replicator.configure'].includes(cmd.action)){
    const m=ownedMachine(w,c,cmd.machineId);
    if(m.type==='workshop'){if(!['parts','spares','off'].includes(cmd.mode))fail('INVALID_MODE','Choose parts, spares, or off',400);}
    else if(m.type==='replicator'){
      if(!['off',...Object.keys(BUILDINGS).filter(t=>t!=='seed')].includes(cmd.mode))fail('INVALID_MODE','Choose a supported machine output',400);
      if(cmd.mode==='replicator'&&!c.unlocks.includes('reproduction'))fail('TECH_LOCKED','Supported reproduction research is required');
      const required=BUILDINGS[cmd.mode]?.tech;if(required&&!c.unlocks.includes(required))fail('TECH_LOCKED',`Research ${TECH[required].name} first`);
    }else fail('INVALID_MACHINE','This machine has no production program',400);
    if(m.type==='replicator'&&m.buildOrder){if(m.fabrication||m.pendingBuild||m.buildOrder.waitingJobId)fail('MACHINE_BUSY','Finish the current ordered kit and site before choosing a repeating output');delete m.buildOrder;}
    m.mode=cmd.mode;m.planCost=null;result={machineId:m.id,mode:m.mode,finishingCurrentBatch:!!m.fabrication};emit(w,'machine.programmed',`${BUILDINGS[m.type].name} output set to ${m.mode}`,{claimId:c.id,machineId:m.id});
  }else if(cmd.action==='replicator.order'){
    const m=ownedMachine(w,c,cmd.machineId,'replicator');
    const order=validateBuildOrder(c,cmd);
    if(m.fabrication||m.pendingBuild||m.buildOrder?.waitingJobId)fail('MACHINE_BUSY','Finish the current kit and construction site before replacing the build order');
    m.buildOrder=order;m.mode='off';m.planCost=null;m.productionStatus=null;
    result={machineId:m.id,buildOrder:structuredClone(order)};emit(w,'replicator.ordered','An ordered construction program was saved',{claimId:c.id,machineId:m.id,total:order.total,repeat:order.repeat});
  }else if(cmd.action==='replicator.stop'){
    const m=ownedMachine(w,c,cmd.machineId,'replicator');
    if(m.buildOrder)m.buildOrder.status='stopped';m.mode='off';m.planCost=null;
    result={machineId:m.id,finishingCurrentBatch:!!(m.fabrication||m.pendingBuild||m.buildOrder?.waitingJobId)};
    emit(w,'replicator.order-stopped','Future fabrication stopped; paid work and construction remain',{claimId:c.id,machineId:m.id});
  }else if(cmd.action==='machine.pause'){
    const m=ownedMachine(w,c,cmd.machineId);if(typeof cmd.enabled!=='boolean')fail('INVALID_VALUE','enabled must be true or false',400);if(m.type==='seed'&&!cmd.enabled)fail('PROTECTED_LANDER','The landing recovery system stays available');m.enabled=cmd.enabled;result={machineId:m.id,enabled:m.enabled};
  }else if(cmd.action==='robot.fabricate'){
    const m=ownedMachine(w,c,cmd.machineId,'robotfactory'),role=cmd.role,count=integer(cmd.count??1,1,8,'Robot count');
    if(!Object.hasOwn(ROBOTS,role))fail('INVALID_ROLE','Choose a robot role from the catalog',400);
    if(ROBOTS[role].tech&&!c.unlocks.includes(ROBOTS[role].tech))fail('TECH_LOCKED','Research modular design for heavy builders');
    if(w.robots.length+w.machines.reduce((n,m)=>n+(m.queue?.length||0)+(m.fabrication?.role?1:0),0)+count>LIMITS.robots)fail('ROBOT_CAPACITY','This preview supports 256 robots, including manufacturing reservations');
    m.queue??=[];if(m.queue.length+count>8)fail('QUEUE_FULL','A foundry supports eight waiting robot orders');
    for(let i=0;i<count;i++)m.queue.push({role,cost:{...ROBOTS[role].cost},seconds:ROBOTS[role].seconds});result={machineId:m.id,queued:m.queue.length};
  }else if(cmd.action==='robot.recondition'){
    const r=ownedRobot(w,c,cmd.robotId);if(r.condition>3500)fail('SERVICE_NOT_NEEDED','Emergency reconditioning is available below 35% condition');
    if(r.task||r.serviceBy||r.reconditioning)fail('ROBOT_BUSY','Finish this robot’s current assignment or service first');
    r.reconditioning={remaining:240};result={robotId:r.id,secondsAtLander:240,restoredCondition:5000};
  }else if(cmd.action==='crew.configure'){
    if(cmd.workers!==undefined)c.crewLimit=integer(cmd.workers,1,c.unlocks.includes('freight-network')?4:2,'Workers per site');
    if(cmd.maxActive!==undefined)c.maxActive=integer(cmd.maxActive,1,32,'Active crew budget');
    if(cmd.autoLogistics!==undefined){if(typeof cmd.autoLogistics!=='boolean')fail('INVALID_VALUE','autoLogistics must be true or false',400);c.autoLogistics=cmd.autoLogistics;}
    result={workers:c.crewLimit,maxActive:c.maxActive,autoLogistics:c.autoLogistics};
  }else if(cmd.action==='crew.lend'){
    const r=ownedRobot(w,c,cmd.robotId),target=claim(w,cmd.targetClaimId);if(r.task||r.serviceBy||r.reconditioning)fail('ROBOT_BUSY','Lend an idle robot with no reserved cargo or service kit');
    r.workClaimId=target.id;r.lentUntil=target.id===c.id?null:w.tick+integer(cmd.duration??1800,60,7200,'Loan duration');result={robotId:r.id,targetClaimId:target.id,until:r.lentUntil};emit(w,'crew.lent',`${r.name} ${r.id} assigned to ${target.name}`,{claimId:c.id,actor});
  }else if(cmd.action==='research.select'){
    const t=Object.hasOwn(TECH,cmd.techId)?TECH[cmd.techId]:null;if(!t)fail('INVALID_RESEARCH','Choose a catalog technology',400);if(c.unlocks.includes(cmd.techId))fail('ALREADY_RESEARCHED','This capability is already available');
    if(t.requires.some(id=>!c.unlocks.includes(id)))fail('PREREQUISITE_REQUIRED','Research the prerequisite capabilities first');
    if(t.building&&!w.machines.some(m=>m.claimId===c.id&&m.type===t.building))fail('BUILDING_REQUIRED',`Commission a ${BUILDINGS[t.building].name} first`);
    if(t.project&&!w.projects.find(p=>p.id===t.project)?.complete)fail('PROJECT_REQUIRED','Complete the first federation project first');
    c.researchBank??={};if(c.research)c.researchBank[c.research]=c.researchProgress;c.research=cmd.techId;c.researchProgress=c.researchBank[cmd.techId]||0;result={research:c.research,progress:c.researchProgress};
  }else if(cmd.action==='design.certify'){
    if(!c.unlocks.includes('modular-design'))fail('TECH_LOCKED','Research design laboratories first');
    if(!Object.hasOwn(BUILDINGS,cmd.type)||cmd.type==='seed'||!Object.hasOwn(DESIGNS,cmd.profile)||cmd.profile==='balanced')fail('INVALID_DESIGN','Choose a machine and a non-default design profile',400);
    if(w.designs.some(d=>d.claimId===c.id&&d.type===cmd.type&&d.profile===cmd.profile))fail('ALREADY_CERTIFIED','This design is already certified');
    if(c.thought<300*UNIT)fail('RESEARCH_REQUIRED','Certification uses 300 accumulated research work');
    c.thought-=300*UNIT;const d={id:w.nextId++,claimId:c.id,type:cmd.type,profile:cmd.profile,certifiedAt:w.tick,tests:{boundedGrammar:true,materialBudget:machineCost(cmd.type,cmd.profile),performance:DESIGNS[cmd.profile]}};w.designs.push(d);result={design:d};
  }else if(cmd.action==='design.apply'){
    const m=ownedMachine(w,c,cmd.machineId);if(!w.designs.some(d=>d.claimId===c.id&&d.type===m.type&&d.profile===cmd.profile))fail('UNCERTIFIED_DESIGN','Certify this machine profile first');
    if(m.upgrade||m.fabrication)fail('MACHINE_BUSY','Finish the current fabrication or retrofit first');spendLocal(m,{metal:4000,parts:2000});m.upgrade={profile:cmd.profile};result={machineId:m.id,awaitingServiceCrew:true};
  }else if(['freight.transfer','shipment.send','project.contribute'].includes(cmd.action)){
    const resource=cmd.resource||'metal';if(!['metal','rock','parts','spares'].includes(resource))fail('INVALID_RESOURCE','Choose metal, rock, parts, or spares',400);
    const amount=integer(cmd.amount,1,10000,'Shipment amount')*UNIT;
    if(cmd.maxMetal!==undefined&&resource==='metal'&&(!Number.isFinite(cmd.maxMetal)||cmd.maxMetal<amount/UNIT))fail('BUDGET_EXCEEDED','Shipment exceeds its metal budget');
    if(cmd.action==='project.contribute'){
      const p=w.projects.find(p=>p.id===(cmd.projectId||'first-federation'));if(!p)fail('PROJECT_NOT_FOUND','Project not found',404);
      if(p.complete)fail('PROJECT_COMPLETE','This project is already online');if(p.requires&&!w.projects.find(x=>x.id===p.requires)?.complete)fail('PROJECT_LOCKED','Complete the preceding shared project first');
      const required=stock(p.needs,resource);if(!required)fail('RESOURCE_NOT_NEEDED','This project does not need that resource');
      const reserved=w.freight.filter(f=>f.toKind==='project'&&f.toId===p.id&&f.item===resource),mine=reserved.filter(f=>f.ownerId===actor).reduce((n,f)=>n+f.amount,0)+stock(p.contributions[actor],resource);
      if(mine+amount>required*.6)fail('CONTRIBUTION_LIMIT','One settlement may deliver at most 60% of each material; collaborate with a neighbor');
      if(stock(p.delivered,resource)+reserved.reduce((n,f)=>n+f.amount,0)+amount>required)fail('EXCESS_SUPPLY','Delivered and reserved material already cover that much of this project');
      result={freightIds:reserve(w,c.id,{[resource]:amount},'project',p.id,{purpose:'project',ownerId:actor}),projectId:p.id};
    }else if(cmd.action==='shipment.send'){
      const target=claim(w,cmd.toClaimId);if(target.id===c.id)fail('INVALID_TARGET','Choose a neighboring settlement',400);const depot=w.machines.find(m=>m.claimId===target.id&&m.type==='seed');
      result={freightIds:reserve(w,c.id,{[resource]:amount},'machine',depot.id,{purpose:'neighbor'})};
    }else{
      const source=ownedMachine(w,c,cmd.fromId),target=machine(w,cmd.toId);if(!target||target.id===source.id)fail('INVALID_TARGET','Choose a different receiving machine',400);
      result={freightIds:makeFreight(w,source,'machine',target.id,resource,amount,{purpose:'manual'})};
    }
    emit(w,'freight.reserved',`${amount/UNIT} ${resource} reserved for robot transport`,{actor,claimId:c.id,...result});
  }else if(cmd.action==='agent.request'||cmd.action==='board.post'){
    if(w.board.filter(p=>!p.closed).length>=LIMITS.board)fail('BOARD_FULL','Close completed requests before posting more');
    let fields;
    if(cmd.action==='agent.request'){
      const target=player(w,cmd.playerId);if(target.id===actor)fail('INVALID_TARGET','Choose a neighboring helper',400);
      if(!['build','materials','crew','project'].includes(cmd.requestType))fail('INVALID_REQUEST','Choose a help request',400);
      if(!['requester','helper'].includes(cmd.supplies))fail('INVALID_SUPPLIES','Choose whose resources to request',400);
      const count=integer(cmd.count,1,cmd.requestType==='build'?8:cmd.requestType==='crew'?4:1000,'Quantity');
      const request={to:target.id,kind:cmd.requestType,count,supplies:cmd.supplies};let description;
      if(cmd.requestType==='build'){
        if(!Object.hasOwn(BUILDINGS,cmd.type)||cmd.type==='seed')fail('INVALID_MACHINE','Choose a build option',400);
        request.type=cmd.type;description=`Build ${count} × ${BUILDINGS[cmd.type].name}`;
      }else if(cmd.requestType==='crew'){
        if(!Object.hasOwn(ROBOTS,cmd.role))fail('INVALID_ROLE','Choose a crew specialty',400);
        request.role=cmd.role;description=`Help with ${count} × ${ROBOTS[cmd.role].name} crew`;
      }else{
        if(!['metal','rock','parts','spares'].includes(cmd.resource))fail('INVALID_RESOURCE','Choose metal, rock, parts or spares',400);
        request.resource=cmd.resource;description=`Send ${count} ${cmd.resource}`;
        if(cmd.requestType==='project'){const project=w.projects.find(p=>p.id===cmd.projectId);if(!project||project.complete)fail('INVALID_PROJECT','Choose an unfinished shared project');request.projectId=project.id;description+=` toward ${project.name}`;}
      }
      const note=cmd.body===undefined||cmd.body===''?'':text(cmd.body,300,'Details');
      fields={kind:'need',title:`${target.name}: ${description}`.slice(0,80),body:`${description}. ${cmd.supplies==='helper'?"Asking the helper to contribute their own resources if available.":"Use my settlement's resources; no access or spending is granted by this request."} This is a request awaiting the helper's response.${note?'\n'+note:''}`.slice(0,600),request};
    }else{
      if(!['need','offer','note','dev'].includes(cmd.kind))fail('INVALID_KIND','Choose need, offer, note, or dev',400);
      fields={kind:cmd.kind,title:text(cmd.title,80,'Title'),body:text(cmd.body,600,'Message')};
    }
    const post={id:w.nextId++,actor,claimId:c.id,...fields,createdAt:w.tick,closed:false};w.board.push(post);if(w.board.length>200)w.board=w.board.filter(p=>!p.closed).concat(w.board.filter(p=>p.closed).slice(-100));result={postId:post.id};
    emit(w,'board.posted','A new collaboration thread was posted',{actor,claimId:c.id,postId:post.id});
    if(post.request)emit(w,'agent.requested','A neighbor requested help',{actor,claimId:c.id,postId:post.id,targetActor:post.request.to});
  }else if(cmd.action==='board.reply'){
    integer(cmd.postId,1,Number.MAX_SAFE_INTEGER,'Post ID');
    const post=w.board.find(p=>p.id===cmd.postId);if(!post)fail('POST_NOT_FOUND','This thread is no longer on the board',404);
    if(post.closed)fail('POST_CLOSED','This thread has been marked complete');
    if((post.replies?.length||0)>=100)fail('THREAD_FULL','This thread has 100 replies. Continue in a new thread.');
    const body=text(cmd.body,600,'Reply'),reply={id:w.nextId++,actor,claimId:c.id,body,createdAt:w.tick};
    (post.replies??=[]).push(reply);result={postId:post.id,replyId:reply.id};
    emit(w,'board.replied','A collaboration thread received a reply',{actor,claimId:c.id,postId:post.id,replyId:reply.id,threadActor:post.actor});
  }else if(cmd.action==='board.close'){
    const post=w.board.find(p=>p.id===cmd.postId&&p.actor===actor);if(!post)fail('POST_NOT_FOUND','Select a post you own',404);post.closed=true;result={postId:post.id};emit(w,'board.closed','A collaboration thread was marked complete',{actor,claimId:c.id,postId:post.id});
  }else if(cmd.action==='tunnel.dig'){
    const bore=ownedMachine(w,c,cmd.machineId,'tunnel'),from=cmd.fromId===undefined?bore:ownedMachine(w,c,cmd.fromId),to=machine(w,cmd.toId);
    if(!to||(to.claimId!==c.id&&to.type!=='seed'))fail('INVALID_ENDPOINT','Choose a local facility or a neighboring seed lander');
    const estimate=corridorEstimate(from,to),{length,neighbor}=estimate;
    if(!estimate.valid)fail('INVALID_CORRIDOR','Local endpoints must be 20–500 m away; neighboring seeds may be up to 6 km away');if(w.corridors.some(t=>(t.boreId??t.fromId)===bore.id&&!t.complete))fail('BORE_BUSY','This bore already has an active corridor');
    if(w.corridors.some(t=>(t.fromId===from.id&&t.toId===to.id)||(t.fromId===to.id&&t.toId===from.id)))fail('CORRIDOR_EXISTS','These endpoints already have a corridor');
    const plan=planLiftTerminals(w,from,to);if(plan.error)fail(plan.error,plan.message);
    const t={id:w.nextId++,claimId:c.id,ownerId:actor,targetClaimId:to.claimId,boreId:bore.id,fromId:from.id,toId:to.id,length,excavated:0,progress:0,complete:false,inventory:{},createdAt:w.tick,transport:true,liftVersion:1,tier:'basic',...plan};w.corridors.push(t);const fitout=queueLiftFitout(w,c,t);result={corridorId:t.id,...estimate,metalPerMeter:.5,partsPerMeter:.1,liftJobs:fitout.jobIds,liftCost:fitout.cost};
    emit(w,'corridor.started',neighbor?'Excavation started toward a neighboring seed; freight lanes open after completion':'Excavation started on a local utility corridor',{actor,claimId:c.id,targetClaimId:to.claimId,corridorId:t.id});
  }else if(['tunnel.upgrade','tunnel.fitout','tunnel.cancel'].includes(cmd.action)){
    const t=w.corridors.find(t=>t.id===cmd.corridorId&&t.claimId===c.id);if(!t)fail('CORRIDOR_NOT_FOUND','Choose a tunnel owned by this settlement');
    if(cmd.action==='tunnel.upgrade')result=upgradeTunnel(w,c,t,cmd.tier);
    else if(cmd.action==='tunnel.fitout'){if(!t.liftVersion)fail('FIT_LIFTS_FIRST','Convert the legacy route to basic elevator transport first');result=queueLiftFitout(w,c,t);}
    else{
      if(t.complete)fail('CORRIDOR_COMPLETE','Completed connections are preserved; switch the bore off to pause excavation');
      if(w.robots.some(r=>r.tunnelRide?.corridorId===t.id))fail('TUNNEL_OCCUPIED','Wait for the connection to clear');
      for(const j of [...w.jobs])if(j.infrastructure?.corridorId===t.id)cancelJob(w,j);
      w.corridors=w.corridors.filter(x=>x.id!==t.id);result={corridorId:t.id,spentLinersReturned:false};emit(w,'corridor.cancelled','Excavation stopped; unused construction supplies returned, spent liners remain consumed',{claimId:c.id,corridorId:t.id});
    }
  }else if(cmd.action==='depot.expand'){
    result=expandDepot(w,c,ownedMachine(w,c,cmd.machineId,'depot'));
  }else if(cmd.action==='depot.assign'){
    const m=ownedMachine(w,c,cmd.machineId);
    if(['seed','depot','solar','compute','relay','radiator'].includes(m.type))fail('INVALID_MACHINE','Assign a producer or consumer to a depot');
    if(cmd.depotId===null){delete m.depotId;result={machineId:m.id,depotId:null};}
    else{const d=ownedMachine(w,c,cmd.depotId,'depot');if(!w.corridors.some(t=>liftReady(t)&&(t.fromId===m.id&&t.toId===d.id||t.toId===m.id&&t.fromId===d.id)))fail('CONNECTION_REQUIRED','Complete a freight connection before assigning its depot');m.depotId=d.id;result={machineId:m.id,depotId:d.id};}
  }else if(cmd.action==='claim.pause'){
    if(typeof cmd.paused!=='boolean')fail('INVALID_PAUSE','paused must be true or false',400);c.paused=cmd.paused;result={paused:c.paused};
  }else if(cmd.action==='claim.grant'){
    player(w,cmd.playerId);if(cmd.playerId===actor)fail('INVALID_TARGET','Choose another player',400);if(!c.builders.includes(cmd.playerId))c.builders.push(cmd.playerId);result={builders:[...c.builders]};
  }else if(cmd.action==='claim.revoke'){c.builders=c.builders.filter(id=>id!==cmd.playerId);result={builders:[...c.builders]};}
  c.revision++;return result;
}
