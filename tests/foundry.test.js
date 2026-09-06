import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,observe,preview} from '../src/shared-world.js';
import {createMachine,createRobot,syncClaims} from '../src/foundry/state.js';
import {industryFor} from '../src/foundry/industry.js';
import {findPath,clearSegment,localXY,lunarPosition,distance} from '../src/foundry/navigation.js';
import {offsetPosition} from '../src/geography.js';
import {port} from '../src/foundry/logistics.js';
import {TECH,BUILDINGS} from '../src/foundry/catalog.js';
const setup=()=>{const w=freshSharedWorld();addPlayer(w,'p1','Ada');return {w,c:w.claims[0]};};
const loc=(c,x,y)=>offsetPosition(c.home.lat,c.home.lon,x,y);
const tick=(w,n)=>{for(let i=0;i<n;i++)stepWorld(w);};
const cmd=(w,c,action,rest={})=>applyCommand(w,c.ownerId,{action,claimId:c.id,...rest});
const build=(w,c,type,x,y)=>cmd(w,c,'build.place',{type,...loc(c,x,y)});
const seed=(w,c)=>w.machines.find(m=>m.type==='seed'&&m.claimId===c.id);
const stockAll=(w,item)=>w.machines.reduce((a,m)=>a+(m.inventory[item]||0),0)+w.jobs.reduce((a,j)=>a+(j.inventory[item]||0)+(j.embodied?.[item]||0),0)+w.freight.filter(f=>f.item===item).reduce((a,f)=>a+f.amount,0);
const infrastructure=(w,c)=>{for(const [type,x,y] of [['solar',-30,0],['solar',-60,0],['compute',0,30],['compute',0,60],['compute',30,60]])createMachine(w,c,type,loc(c,x,y));};

test('fresh fork has four physical crew, seven kits, and isolated version',()=>{const {w,c}=setup();assert.equal(w.version,3);assert.equal(w.ruleset,'moon-foundry-1');assert.equal(w.robots.length,4);assert.equal(Object.values(c.kits).reduce((a,b)=>a+b,0),7);assert.equal(c.metal,240000);});
test('prefab is reserved, carried, assembled, connected and commissioned',()=>{const {w,c}=setup(),metal=stockAll(w,'metal');const j=build(w,c,'compute',26,20);assert.equal(j.prefab,true);assert.equal(w.machines.length,1);assert.equal(w.jobs[0].phase,'supply');tick(w,5);assert.equal(w.machines.length,1);tick(w,400);assert.equal(w.jobs.length,0);assert.equal(w.machines.filter(m=>m.type==='compute').length,1);assert.equal(stockAll(w,'metal'),metal);for(const phase of ['assemble','connect','commission'])assert.ok(w.events.some(e=>e.message.includes(phase)));});
test('normal sites require complete costs and do not double reserve',()=>{const {w,c}=setup();seed(w,c).inventory['kit.solar']=0;const before=stockAll(w,'metal');build(w,c,'solar',35,0);assert.equal(seed(w,c).inventory.metal,225000);assert.equal(stockAll(w,'metal'),before);assert.throws(()=>build(w,c,'solar',35,0),e=>e.code==='OCCUPIED');assert.equal(stockAll(w,'metal'),before);});
test('preview leaves world byte-identical; an insufficient plan has no resource side effects',()=>{const {w,c}=setup();const before=JSON.stringify(w);preview(w,'p1',{action:'build.place',claimId:c.id,type:'solar',...loc(c,30,0)});assert.equal(JSON.stringify(w),before);seed(w,c).inventory.metal=0;seed(w,c).inventory['kit.solar']=0;const stock=JSON.stringify(w.machines);assert.throws(()=>build(w,c,'solar',30,0),e=>e.code==='INSUFFICIENT_MATERIALS');assert.equal(JSON.stringify(w.machines),stock);});
test('cancel before pickup refunds once and removes the reservation',()=>{const {w,c}=setup();seed(w,c).inventory['kit.solar']=0;const before=stockAll(w,'metal');const {jobId}=build(w,c,'solar',40,0);cmd(w,c,'build.cancel',{jobId});assert.equal(w.freight.length,0);assert.equal(seed(w,c).inventory.metal,before);assert.throws(()=>cmd(w,c,'build.cancel',{jobId}),e=>e.code==='JOB_NOT_FOUND');});
test('cancel carried cargo sends it back and conserves stock',()=>{const {w,c}=setup();seed(w,c).inventory['kit.solar']=0;const before=stockAll(w,'metal');const {jobId}=build(w,c,'solar',70,0);for(let i=0;i<150&&!w.freight.some(f=>f.status==='carried');i++)tick(w,1);assert.ok(w.freight.some(f=>f.status==='carried'));cmd(w,c,'build.cancel',{jobId});tick(w,600);assert.equal(w.jobs.length,0);assert.equal(stockAll(w,'metal'),before);assert.equal(w.freight.length,0);});
test('robots have swept paths around foundations and do not overlap',()=>{const obstacles=[{x:0,y:0,radius:6}],a={x:-15,y:0},b={x:15,y:0},path=findPath(a,b,obstacles);assert.ok(path?.length>1);let last=a;for(const p of path){assert.ok(clearSegment(last,p,obstacles));last=p;}const {w,c}=setup();build(w,c,'compute',26,20);build(w,c,'solar',-30,20);for(let t=0;t<500;t++){tick(w,1);for(let i=0;i<w.robots.length;i++)for(let j=i+1;j<w.robots.length;j++)assert.ok(distance(w.robots[i],w.robots[j])>=w.robots[i].radius+w.robots[j].radius+.075,`crew overlap at ${t}`);}});
test('coordinate charts preserve lunar positions',()=>{const {c}=setup();for(const [x,y] of [[1,1],[800,-700],[3000,3000]]){const p=loc(c,x,y),q=localXY(c.home,p),back=lunarPosition(c.home,q);assert.ok(Math.abs(p.lat-back.lat)<.000001);assert.ok(Math.abs(p.lon-back.lon)<.000001);}});
test('machine footprints reject a robot inside the proposed building',()=>{const {w,c}=setup();const r=w.robots[0];r.x=40;r.y=0;assert.throws(()=>build(w,c,'solar',40,0),e=>e.code==='ROBOT_IN_FOOTPRINT');});
test('local inputs matter: a refinery cannot consume rock stored at the lander',()=>{const {w,c}=setup();infrastructure(w,c);c.autoLogistics=false;seed(w,c).inventory.rock=20000;const refinery=createMachine(w,c,'refinery',loc(c,45,0));tick(w,30);assert.equal(refinery.inventory.metal||0,0);assert.equal(seed(w,c).inventory.rock,20000);cmd(w,c,'freight.transfer',{fromId:seed(w,c).id,toId:refinery.id,resource:'rock',amount:10});tick(w,400);assert.ok(refinery.produced>0);assert.ok(w.totals.freightDelivered>=10000);});
test('slower extraction and real transport close a working metal loop',()=>{const {w,c}=setup();for(const [t,x,y] of [['compute',25,25],['miner',55,25],['refinery',55,-5],['solar',-25,25]])build(w,c,t,x,y);tick(w,1800);assert.equal(w.jobs.length,0);assert.ok(w.totals.mined>10000);assert.ok(w.totals.refined>10000);assert.ok(w.totals.refined<w.totals.mined/2);assert.ok(w.robots.some(r=>r.distanceTravelled>100));});
test('unsupported and unpowered mind nodes do not grant attention',()=>{const {w,c}=setup();for(let n=0;n<4;n++)createMachine(w,c,'compute',loc(c,20+n*15,30));const i=industryFor(w,c.id);assert.equal(i.supportedNodes,2);assert.equal(i.capacity,9);assert.equal(i.states[w.machines.at(-1).id],'power-limited');});
test('replicator has highest per-machine attention cost',()=>{assert.equal(BUILDINGS.replicator.mind,4);assert.ok(Object.values(BUILDINGS).filter(b=>b!==BUILDINGS.replicator).every(b=>b.mind<4));});
test('wear calls for physical service and consumes one spare per repair',()=>{const {w,c}=setup();const target=createMachine(w,c,'solar',loc(c,30,0));target.condition=1500;const before=stockAll(w,'spares');tick(w,600);assert.ok(target.condition>9000);assert.ok(w.totals.repairs>=1);assert.equal(stockAll(w,'spares'),before-1000);});
test('an exhausted idle robot can recover at the seed without a new mind or resource grant',()=>{const {w,c}=setup();const r=w.robots[0];r.condition=0;seed(w,c).inventory.spares=0;cmd(w,c,'robot.recondition',{robotId:r.id});tick(w,320);assert.equal(r.reconditioning,null);assert.ok(r.condition>=4900);assert.equal(seed(w,c).inventory.metal,240000);});
test('robot production consumes local components and needs actual power, mind and time',()=>{const {w,c}=setup();infrastructure(w,c);c.unlocks=Object.keys(TECH);c.autoLogistics=false;const f=createMachine(w,c,'robotfactory',loc(c,40,-30));f.inventory={metal:8000,parts:3000,spares:1000};cmd(w,c,'robot.fabricate',{machineId:f.id,role:'builder'});tick(w,1);assert.equal(w.robots.length,4);assert.equal(f.inventory.metal,0);tick(w,200);assert.equal(w.robots.length,5);assert.equal(w.totals.robotsBuilt,1);assert.equal(w.robots.at(-1).generation,1);});
test('research prerequisites and shared federation gate reproduction',()=>{const {w,c}=setup();assert.throws(()=>cmd(w,c,'research.select',{techId:'reproduction'}),e=>e.code==='PREREQUISITE_REQUIRED');c.unlocks=['modular-design','thermal-design'];assert.throws(()=>cmd(w,c,'research.select',{techId:'reproduction'}),e=>e.code==='PROJECT_REQUIRED');w.projects[0].complete=true;cmd(w,c,'research.select',{techId:'reproduction'});assert.equal(c.research,'reproduction');});
test('a federation cannot be supplied by one account, and promises are not deliveries',()=>{const {w,c}=setup();cmd(w,c,'project.contribute',{resource:'metal',amount:60});assert.deepEqual(w.projects[0].delivered,{});assert.throws(()=>cmd(w,c,'project.contribute',{resource:'metal',amount:20}),e=>e.code==='CONTRIBUTION_LIMIT');assert.equal(w.projects[0].complete,false);});
test('all shared material delivered still needs construction crew',()=>{const {w,c}=setup();const p=w.projects[0];p.delivered={...p.needs};tick(w,1);assert.equal(p.phase,'assemble');assert.equal(p.complete,false);tick(w,1400);assert.equal(p.complete,true);assert.equal(industryFor(w,c.id).capacity,3);});
test('claim access is scoped to construction, not factory programs or resources',()=>{const {w,c}=setup();addPlayer(w,'p2','Babbage');cmd(w,c,'claim.grant',{playerId:'p2'});applyCommand(w,'p2',{action:'build.place',claimId:c.id,type:'solar',...loc(c,30,0)});assert.throws(()=>applyCommand(w,'p2',{action:'shipment.send',claimId:c.id,toClaimId:w.claims[1].id,amount:1}),e=>e.code==='FORBIDDEN');});
test('pause freezes a settlement without stopping its neighbor',()=>{const {w,c}=setup();addPlayer(w,'p2','Babbage');build(w,c,'solar',30,0);cmd(w,c,'claim.pause',{paused:true});const robots=JSON.stringify(w.robots.filter(r=>r.claimId===c.id));tick(w,200);assert.equal(w.jobs[0].phase,'supply');assert.equal(w.freight[0].status,'waiting');assert.equal(JSON.stringify(w.robots.filter(r=>r.claimId===c.id).map(r=>({...r,status:'idle'}))),robots);assert.equal(w.tick,200);});
test('serialized restart preserves paths, cargo and construction exactly',()=>{const {w,c}=setup();build(w,c,'compute',40,20);tick(w,35);const restored=JSON.parse(JSON.stringify(w));tick(w,400);tick(restored,400);assert.deepEqual(restored,w);});
test('located utility corridor consumes liner material and produces spoil',()=>{const {w,c}=setup();infrastructure(w,c);c.unlocks=Object.keys(TECH);c.autoLogistics=false;const a=createMachine(w,c,'tunnel',loc(c,-30,45)),b=createMachine(w,c,'relay',loc(c,-65,45));a.inventory={metal:30000,parts:10000};cmd(w,c,'tunnel.dig',{machineId:a.id,toId:b.id});tick(w,600);const t=w.corridors[0];assert.equal(t.complete,true);assert.equal(a.inventory.metal,30000-t.length*500);assert.equal(a.inventory.parts,10000-t.length*100);assert.equal(a.inventory.rock,t.length*1500);});
test('public observations expose no tokens and show real cargo and capacity',()=>{const {w}=setup(),o=observe(w,'p1');assert.equal(o.actorId,'p1');assert.equal(o.robots.length,4);assert.ok(o.robots.every(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)));assert.ok(!JSON.stringify(o).includes('token'));});

test('a multi-kilometer route exits a foundation cluster within bounded search',()=>{const a={x:10.5,y:0},b={x:-2600,y:2190},obstacles=[{x:0,y:0,radius:8},{x:30,y:20,radius:5},{x:-2600,y:2180,radius:7}];const path=findPath(a,b,obstacles,{radius:.8});assert.ok(path?.length);let previous=a;for(const p of path){assert.ok(clearSegment(previous,p,obstacles,.8));previous=p;}});
test('service and freight choose an accessible face rather than a berth inside a neighbor',()=>{const {w,c}=setup();const m=createMachine(w,c,'compute',loc(c,30,0));createMachine(w,c,'solar',loc(c,44,0));const r=w.robots[0],point=port(w,r,m,0),blocked=localXY(c.home,w.machines.at(-1));assert.ok(distance(point,blocked)>=6+r.radius);});

test('design tradeoffs affect operating output and preserve fractional wear savings',()=>{const {w,c}=setup();const solar=createMachine(w,c,'solar',loc(c,30,0),{design:'frugal'});assert.ok(Math.abs(industryFor(w,c.id).power.supply-18.2)<.001);const enduring=createMachine(w,c,'solar',loc(c,-30,0),{design:'enduring'});tick(w,1200);assert.ok(enduring.condition>solar.condition);});
test('a small crew budget rotates fairly instead of permanently starving high IDs',()=>{const {w,c}=setup();cmd(w,c,'crew.configure',{maxActive:1});tick(w,100);assert.ok(w.robots.every(r=>r.distanceTravelled>0));});

test('maintenance cannot chain-freeze a robot that is already servicing another',()=>{const {w}=setup();for(const r of w.robots)r.condition=2000;for(let t=0;t<1200;t++){tick(w,1);for(const r of w.robots)if(r.task?.kind==='service')assert.ok(!r.serviceBy||r.serviceBy===r.id,'active service crew must not be immobilized by another service assignment');}assert.ok(w.robots.every(r=>r.condition>5000));});

test('cancelled assembled prefab salvages materials instead of producing unusable fractional kits',()=>{const {w,c}=setup();const {jobId}=build(w,c,'solar',35,0);for(let t=0;t<400&&w.jobs[0]?.stage<2;t++)tick(w,1);const j=w.jobs.find(j=>j.id===jobId);assert.ok(j&&j.stage>=2);cmd(w,c,'build.cancel',{jobId});assert.ok(w.freight.every(f=>!f.item.startsWith('kit.')||f.amount%1000===0));assert.ok(w.freight.some(f=>f.item==='metal'));tick(w,500);assert.equal(w.freight.length,0);});

test('landings count queued chassis and landers against the shared admission limits',()=>{
  const {w,c}=setup();for(let i=0;i<248;i++)createRobot(w,c,'builder');
  const foundry=createMachine(w,c,'robotfactory',loc(c,45,45),{queue:[{role:'builder'}]});const before=structuredClone(w);
  assert.throws(()=>addPlayer(w,'p2','Babbage'),e=>e.code==='ROBOT_CAPACITY');assert.deepEqual(w,before);
  foundry.queue=[];addPlayer(w,'p2','Babbage');assert.equal(w.robots.length,256);
  const full=setup();for(let i=0;i<999;i++)createMachine(full.w,full.c,'solar',loc(full.c,30+i,30));const nextId=full.w.nextId;
  assert.throws(()=>addPlayer(full.w,'p2','Babbage'),e=>e.code==='WORLD_CAPACITY');assert.equal(full.w.players.length,1);assert.equal(full.w.nextId,nextId);
});
test('automatic freight applies backpressure at capacity without losing stock or stopping the world',async()=>{
  const {autoLogistics}=await import('../src/foundry/logistics.js');const {w,c}=setup();
  for(let i=0;i<900;i++)createMachine(w,c,'refinery',loc(c,30+(i%30)*25,30+Math.floor(i/30)*25),{inventory:{metal:30000}});
  const total=()=>w.machines.reduce((n,m)=>n+(m.inventory.metal||0),0)+w.freight.filter(f=>f.item==='metal').reduce((n,f)=>n+f.amount,0),before=total();
  assert.doesNotThrow(()=>autoLogistics(w));assert.ok(w.freight.length>=4000&&w.freight.length<=4096);assert.equal(total(),before);
  assert.doesNotThrow(()=>autoLogistics(w));assert.equal(total(),before);
});

test('neighbors reply in durable bounded threads, while only the author can close a thread',()=>{
 const {w,c}=setup();addPlayer(w,'p2','Babbage');const other=w.claims[1];
 const {postId}=cmd(w,c,'board.post',{kind:'need',title:'Bring parts',body:'Six at the seed'});
 const {replyId}=cmd(w,other,'board.reply',{postId,body:'On my way.'});
 assert.equal(w.board.length,1);assert.equal(w.board[0].replies[0].actor,'p2');assert.equal(w.board[0].replies[0].id,replyId);
 assert.equal(observe(JSON.parse(JSON.stringify(w)),'p1').board[0].replies[0].body,'On my way.');
 assert.ok(w.events.some(e=>e.type==='board.replied'&&e.threadActor==='p1'&&e.replyId===replyId));
 assert.throws(()=>cmd(w,other,'board.close',{postId}),e=>e.code==='POST_NOT_FOUND');
 assert.throws(()=>cmd(w,other,'board.reply',{postId,body:' '.repeat(20)}),e=>e.code==='INVALID_TEXT');
 assert.throws(()=>cmd(w,other,'board.reply',{postId,body:'x'.repeat(601)}),e=>e.code==='INVALID_TEXT');
 for(let i=1;i<100;i++)cmd(w,other,'board.reply',{postId,body:'Reply '+i});
 assert.throws(()=>cmd(w,other,'board.reply',{postId,body:'One too many'}),e=>e.code==='THREAD_FULL');
 cmd(w,c,'board.close',{postId});assert.throws(()=>cmd(w,other,'board.reply',{postId,body:'Late reply'}),e=>e.code==='POST_CLOSED');
 assert.equal(w.board[0].replies.length,100);
});

test('simple help requests are directed and durable without spending supplies or granting access',()=>{
 const {w,c}=setup();addPlayer(w,'p2','Codex');const stock=JSON.stringify(w.machines.map(m=>m.inventory)),robots=structuredClone(w.robots);
 const {postId}=cmd(w,c,'agent.request',{playerId:'p2',requestType:'build',type:'solar',count:2,supplies:'helper',body:'Near the east depot, please.'});
 const post=w.board.find(p=>p.id===postId);assert.equal(post.request.to,'p2');assert.equal(post.request.count,2);assert.equal(post.request.supplies,'helper');assert.match(post.title,/Codex: Build 2/);assert.ok(w.events.some(e=>e.type==='agent.requested'&&e.targetActor==='p2'));
 assert.equal(JSON.stringify(w.machines.map(m=>m.inventory)),stock);assert.deepEqual(w.robots,robots);assert.deepEqual(c.builders,[]);assert.equal(w.jobs.length,0);
 assert.throws(()=>cmd(w,c,'agent.request',{playerId:'p2',requestType:'build',type:'solar',count:9,supplies:'helper'}),e=>e.code==='INVALID_VALUE');
 assert.throws(()=>cmd(w,c,'agent.request',{playerId:'p1',requestType:'build',type:'solar',count:1,supplies:'requester'}),e=>e.code==='INVALID_TARGET');
 cmd(w,c,'agent.request',{playerId:'p2',requestType:'materials',resource:'parts',count:6,supplies:'helper'});assert.equal(w.board.at(-1).request.resource,'parts');
});
