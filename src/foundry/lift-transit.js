import {distance,localXY,clearSegment,segmentsNear} from './navigation.js';
import {liftReady,routePaused,tierFor,activeRides,elevatorsFor,LIFT_SECONDS,LIFT_DEPTH} from './lift-network.js';

const sameDirection=(a,b)=>a.tunnelRide.reverse===b.reverse;
const rank=r=>[r.tunnelRide.requestedAt||0,r.id];
const earlier=(a,b)=>rank(a)[0]-rank(b)[0]||a.id-b.id;
const half=ride=>ride.progress<ride.length/2?0:1;
const movingHalf=r=>['boarding','lowering'].includes(r.stage)?(r.reverse?1:0):['exit-wait','calling-lift','raising','leaving'].includes(r.stage)?(r.reverse?0:1):r.stage==='transit'?(r.reverse?1-half(r):half(r)):null;

export function canBoard(w,r,t){
 const ride=r.tunnelRide,active=activeRides(w,t).filter(o=>o.id!==r.id),tier=tierFor(t);
 if(!liftReady(t)||routePaused(w,t)||active.length>=tier.capacity)return false;
 const lift=elevatorsFor(t)[ride.reverse?'to':'from'];if(lift.returning||lift.robotId)return false;
 const same=active.filter(o=>sameDirection(o,ride));
 if(same.length>=tier.perDirection)return false;
 // The one physical platform at each terminus is shared by both directions.
 if(active.some(o=>sameDirection(o,ride)?['boarding','lowering'].includes(o.tunnelRide.stage):['exit-wait','calling-lift','raising','leaving'].includes(o.tunnelRide.stage)||o.tunnelRide.progress>o.tunnelRide.length-16))return false;
 const waiters=w.robots.filter(o=>o.id!==r.id&&o.tunnelRide?.corridorId===t.id&&o.tunnelRide.stage==='approach');
 if(t.tier==='passing'){
  const entryHalf=ride.reverse?1:0;
  if(active.some(o=>movingHalf(o.tunnelRide)===entryHalf||o.tunnelRide.stage==='passing'&&!sameDirection(o,ride)))return false;
 }else if(t.tier!=='twin'){
  if(active.some(o=>!sameDirection(o,ride)))return false;
  // Drain an established convoy for an opposing request instead of starving it.
  if(active.length&&waiters.some(o=>!sameDirection(o,ride)&&w.tick-(o.tunnelRide.requestedAt||w.tick)>=15))return false;
 }
 if(waiters.some(o=>earlier(o,r)<0&&(t.tier==='twin'||t.tier==='passing'?sameDirection(o,ride):!active.length||sameDirection(o,ride))))return false;
 return !same.some(o=>o.tunnelRide.progress<r.radius+o.radius+3&&o.tunnelRide.stage!=='leaving');
}

export function selectLiftTunnel(w,r,target,home,speed){
 if(r.reconditioning||!r.task||distance(r,target)<8)return null;
 const routes=w.corridors.filter(t=>t.liftVersion&&liftReady(t)&&!routePaused(w,t));if(!routes.length)return null;
 // Construct a graph of actual terminus positions. Surface transfers between
 // ports on one depot let a journey use more than one completed connection.
 const nodes=[],edges=[];
 for(const t of routes){const start=nodes.length;
  for(const side of ['from','to'])nodes.push({t,side,point:localXY(home,t.terminals[side].loc),loc:t.terminals[side].loc,machineId:t[side+'Id']});
  const length=distance(nodes[start].point,nodes[start+1].point),queue=activeRides(w,t).length;
  for(const reverse of [false,true])edges.push({a:start+(reverse?1:0),b:start+(reverse?0:1),cost:length/1.5+2*LIFT_SECONDS*speed+queue*LIFT_SECONDS*speed,reverse,length,t});
 }
 for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)if(nodes[a].machineId===nodes[b].machineId){const cost=distance(nodes[a].point,nodes[b].point);edges.push({a,b,cost},{a:b,b:a,cost});}
 const costs=nodes.map(n=>distance(r,n.point)),first=nodes.map(()=>null),used=new Set();
 for(let i=0;i<nodes.length;i++){
  let a=-1;for(let n=0;n<nodes.length;n++)if(!used.has(n)&&(a<0||costs[n]<costs[a]))a=n;if(a<0)break;used.add(a);
  for(const edge of edges.filter(e=>e.a===a)){const cost=costs[a]+edge.cost;if(cost<costs[edge.b]){costs[edge.b]=cost;first[edge.b]=first[a]||(edge.t?edge:null);}}
 }
 let best=null,cost=distance(r,target)*.95;
 for(let i=0;i<nodes.length;i++){const candidate=costs[i]+distance(nodes[i].point,target);if(first[i]&&candidate<cost){cost=candidate;best=first[i];}}
 // An explicitly assigned depot connection is the freight route, even when
 // a short lift journey is slower than a walk. Other travel remains optional.
 if(r.task.kind==='haul'&&r.task.stage==='delivery'){
  const packet=w.freight.find(f=>r.task.ids?.includes(f.id));
  const direct=packet&&routes.find(t=>t.fromId===packet.fromId&&t.toId===packet.toId||t.toId===packet.fromId&&t.fromId===packet.toId);
  const source=packet&&w.machines.find(m=>m.id===packet.fromId),dest=packet&&w.machines.find(m=>m.id===packet.toId);
  if(direct&&(source?.depotId===dest?.id||dest?.depotId===source?.id)){const edge=edges.find(e=>e.t===direct&&e.reverse===(direct.toId===packet.fromId));if(distance(r,nodes[edge.a].point)<distance(r,nodes[edge.b].point))best=edge;}
 }
 if(!best)return null;
 return {corridorId:best.t.id,liftVersion:1,reverse:best.reverse,entry:nodes[best.a].loc,exit:nodes[best.b].loc,length:best.length,progress:0,stage:'approach',requestedAt:w.tick,target:{...target}};
}

export function stepLift(w,r,target,{home,speed,surfaceMove,obstacles,others,accepted}){
 const ride=r.tunnelRide,t=w.corridors.find(t=>t.id===ride.corridorId);
 if(!t)return false; // Removal is rejected while any ride exists.
 if(routePaused(w,t)){r.status='tunnel-paused';return false;}
 const entry=localXY(home,ride.entry),exit=localXY(home,ride.exit),tier=tierFor(t);
 const lifts=elevatorsFor(t),entryLift=lifts[ride.reverse?'to':'from'],exitLift=lifts[ride.reverse?'from':'to'];
 const setPosition=()=>{
  const f=ride.progress/ride.length,dx=exit.x-entry.x,dy=exit.y-entry.y;
  const lane=t.tier==='twin'?2.2*Math.min(1,ride.progress/8,(ride.length-ride.progress)/8):ride.stage==='passing'?3:0;
  r.x=entry.x+dx*f-dy/ride.length*lane;r.y=entry.y+dy*f+dx/ride.length*lane;
  r.rotation=Math.atan2(dx,dy);
 };
 if(ride.stage==='approach'){
  if(!liftReady(t)){r.tunnelRide=null;r.path=[];return false;}
  if(!canBoard(w,r,t)){
   // Queue outside the lift footprint, with each robot on a separate holding point.
   const a=Math.atan2(r.y-entry.y,r.x-entry.x)+(r.id%3-1)*.65,rad=7+(r.id%3)*3;
   ride.holding??={x:entry.x+Math.cos(a)*rad,y:entry.y+Math.sin(a)*rad};surfaceMove(ride.holding);r.status='waiting-for-lift';return false;
  }
  ride.stage='boarding';ride.boardingAt=w.tick;ride.holding=null;entryLift.robotId=r.id;
 }
 if(ride.stage==='boarding'){
  r.status='boarding-lift';if(surfaceMove(entry)){ride.stage='lowering';ride.liftRemaining=LIFT_SECONDS;r.path=[];r.undergroundDepth=0;}
  else if(w.tick-(ride.boardingAt||w.tick)>90){entryLift.robotId=null;r.tunnelRide=null;r.path=[];}return false;
 }
 if(ride.stage==='lowering'){
  r.status='lift-descending';ride.liftRemaining=Math.max(0,ride.liftRemaining-1);r.undergroundDepth=-LIFT_DEPTH*(1-ride.liftRemaining/LIFT_SECONDS);
  entryLift.depth=r.undergroundDepth;
  if(!ride.liftRemaining){ride.stage='transit';r.path=[exit];entryLift.robotId=null;entryLift.returning=LIFT_SECONDS;}return false;
 }
 if(ride.stage==='passing'){
  r.status='waiting-at-passing-bay';setPosition();
  const desiredHalf=ride.reverse?0:1;
  if(!activeRides(w,t).some(o=>o.id!==r.id&&movingHalf(o.tunnelRide)===desiredHalf)){ride.stage='transit';ride.passedMidpoint=true;}return false;
 }
 if(ride.stage==='transit'){
  let next=Math.min(ride.length,ride.progress+speed*1.5);
  const peers=activeRides(w,t).filter(o=>o.id!==r.id);
  // Opposing tubes merge at one shaft. Hold incoming traffic outside that
  // merge while a robot boards or clears the bottom of the same elevator.
  if(peers.some(o=>!sameDirection(o,ride)&&(['boarding','lowering'].includes(o.tunnelRide.stage)||o.tunnelRide.progress<12)))next=Math.min(next,Math.max(ride.progress,ride.length-12));
  for(const o of peers){const q=o.tunnelRide;if(sameDirection(o,ride)&&q.stage!=='passing'&&q.progress>=ride.progress)next=Math.min(next,Math.max(ride.progress,q.progress-r.radius-o.radius-3));}
  if(t.tier==='passing'&&!ride.passedMidpoint){
   const mid=ride.length/2,occupied=peers.some(o=>sameDirection(o,ride)&&o.tunnelRide.stage==='passing');
   next=Math.min(next,occupied?Math.max(ride.progress,mid-r.radius-4):mid);
  }
  const travelled=Math.max(0,next-ride.progress);ride.progress=next;r.distanceTravelled=(r.distanceTravelled||0)+travelled;r.undergroundDepth=-LIFT_DEPTH;r.status=travelled?'in-tunnel':'tunnel-queue';r.blockedTicks=0;setPosition();
  if(t.tier==='passing'&&!ride.passedMidpoint&&next>=ride.length/2){ride.stage='passing';setPosition();}
  else if(next>=ride.length)ride.stage='exit-wait';return false;
 }
 if(ride.stage==='exit-wait'){
  r.status='waiting-for-lift-exit';
  const peer=activeRides(w,t).some(o=>o.id!==r.id&&(sameDirection(o,ride)?['raising','leaving'].includes(o.tunnelRide.stage):['boarding','lowering'].includes(o.tunnelRide.stage)));
  if(peer||exitLift.robotId||exitLift.returning||!clearSegment(exit,exit,obstacles,r.radius)||!clearSegment(exit,exit,others,r.radius+.08)||accepted.some(s=>segmentsNear(exit,exit,s.a,s.b,r.radius+s.radius+.08)))return false;
  exitLift.robotId=r.id;ride.stage='calling-lift';ride.liftRemaining=LIFT_SECONDS;return false;
 }
 if(ride.stage==='calling-lift'){
  r.status='waiting-for-lift-exit';ride.liftRemaining=Math.max(0,ride.liftRemaining-1);exitLift.depth=-LIFT_DEPTH*(1-ride.liftRemaining/LIFT_SECONDS);
  if(!ride.liftRemaining){ride.stage='raising';ride.liftRemaining=LIFT_SECONDS;}return false;
 }
 if(ride.stage==='raising'){
  r.status='lift-ascending';ride.liftRemaining=Math.max(0,ride.liftRemaining-1);r.undergroundDepth=-LIFT_DEPTH*ride.liftRemaining/LIFT_SECONDS||0;exitLift.depth=r.undergroundDepth;
  if(!ride.liftRemaining){ride.stage='leaving';r.path=[];r.destination=null;}return false;
 }
 r.status='leaving-lift';r.undergroundDepth=0;
 if(!ride.clearance){
  const a=Math.atan2(target.y-exit.y,target.x-exit.x),choices=Array.from({length:24},(_,i)=>({x:exit.x+Math.cos(a+i*Math.PI/12)*7,y:exit.y+Math.sin(a+i*Math.PI/12)*7}));
  ride.clearance=choices.filter(p=>clearSegment(exit,p,obstacles,r.radius+.1)&&clearSegment(p,p,others,r.radius+.1)).sort((a,b)=>distance(a,target)-distance(b,target))[0];
  if(!ride.clearance){r.status='waiting-for-lift-exit';return false;}
 }
 if(surfaceMove(ride.clearance)||distance(r,exit)>5){exitLift.robotId=null;r.tunnelRide=null;r.path=[];r.destination=null;r.routeRetry=0;}return false;
}
