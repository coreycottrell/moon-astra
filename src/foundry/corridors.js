import {distanceOnMoon,offsetPosition} from '../geography.js';
import {BUILDINGS} from './catalog.js';
import {localXY,distance,clearSegment,segmentsNear} from './navigation.js';

export const CORRIDOR_LIMITS={local:500,neighbor:6000,minimum:20,metalPerMeter:.5,partsPerMeter:.1,secondsPerMeter:10,travelMultiplier:1.5};
export function corridorEstimate(from,to){
  const length=Math.ceil(distanceOnMoon(from,to)),neighbor=from.claimId!==to.claimId;
  return {length,neighbor,valid:length>=20&&length<=(neighbor?6000:500)&&(!neighbor||to.type==='seed'),metal:length*.5,parts:length*.1,poweredSeconds:length*10};
}
export function corridorPortals(w,from,to){
  const obstacles=[...w.machines,...w.jobs,...w.projects,...w.corridors.flatMap(t=>t.portals?Object.values(t.portals).flat().map(p=>({...p,radius:2.5})):[])],pair=[];
  for(const [site,other] of [[from,to],[to,from]]){
    const toward=localXY(site,other),angle=Math.atan2(toward.y,toward.x),points=[];
    for(const side of [-1,1]){
      let chosen;
      for(const turn of [.4,.8,1.2,1.6,2,2.4,2.8]){
        const a=angle+side*turn,r=BUILDINGS[site.type].radius+6,p=offsetPosition(site.lat,site.lon,Math.cos(a)*r,Math.sin(a)*r);
        if(obstacles.every(m=>distanceOnMoon(m,p)>(m.radius??BUILDINGS[m.type]?.radius??7)+2)&&points.every(q=>distanceOnMoon(p,q)>5)){chosen=p;break;}
      }
      if(!chosen)return null;points.push(chosen);
    }pair.push(points);
  }
  return {from:pair[0],to:pair[1]};
}
export const belowSurface=r=>!!r.tunnelRide&&r.tunnelRide.stage!=='approach';
export function selectTunnel(w,r,target,home){
  if(r.reconditioning||!r.task||distance(r,target)<30)return null;
  let best=null,cost=distance(r,target)*.9;
  for(const t of w.corridors){if(!t.complete||!t.transport||!t.portals)continue;
    for(const reverse of [false,true]){
      const entry=(reverse?t.portals.to:t.portals.from)[0],exit=(reverse?t.portals.from:t.portals.to)[1];
      const a=localXY(home,entry),b=localXY(home,exit),length=distance(a,b),candidate=distance(r,a)+length/CORRIDOR_LIMITS.travelMultiplier+distance(b,target);
      if(candidate>=cost)continue;cost=candidate;best={corridorId:t.id,reverse,entry,exit,length,progress:0,stage:'approach',target:{...target}};
    }
  }return best;
}
// Cargo stays aboard. Following distance includes a paused leader; a blocked
// surface exit holds the lane below it. Opposing traffic uses the other tube.
export function stepTunnel(w,r,target,{home,speed,surfaceMove,obstacles,others,accepted}){
  let ride=r.tunnelRide;
  if(ride?.stage==='approach'&&distance(ride.target,target)>60){r.tunnelRide=null;r.path=[];ride=null;}
  if(!ride){ride=selectTunnel(w,r,target,home);if(!ride)return null;r.tunnelRide=ride;r.path=[];r.routeRetry=0;}
  const entry=localXY(home,ride.entry),exit=localXY(home,ride.exit);
  if(ride.stage==='approach'){
    r.status='approaching-tunnel';
    if(surfaceMove(entry)){
      const crowded=w.robots.some(o=>o.id!==r.id&&belowSurface(o)&&o.tunnelRide.corridorId===ride.corridorId&&o.tunnelRide.reverse===ride.reverse&&o.tunnelRide.progress<r.radius+o.radius+2);
      if(crowded){r.status='waiting-for-tunnel';return false;}
      ride.stage='transit';r.path=[exit];r.blockedTicks=0;r.routeRetry=0;r.undergroundDepth=0;
    }return false;
  }
  if(ride.stage==='transit'){
    let next=Math.min(ride.length,ride.progress+speed*CORRIDOR_LIMITS.travelMultiplier);
    for(const o of w.robots){const t=o.tunnelRide;if(o===r||!belowSurface(o)||t.corridorId!==ride.corridorId||t.reverse!==ride.reverse||t.progress<ride.progress)continue;next=Math.min(next,Math.max(ride.progress,t.progress-r.radius-o.radius-2));}
    const travelled=next-ride.progress;ride.progress=next;
    const f=next/ride.length;r.x=entry.x+(exit.x-entry.x)*f;r.y=entry.y+(exit.y-entry.y)*f;r.rotation=Math.atan2(exit.x-entry.x,exit.y-entry.y);
    r.distanceTravelled=(r.distanceTravelled||0)+travelled;r.undergroundDepth=-Math.min(8,next/2);r.status=travelled?'in-tunnel':'tunnel-queue';r.blockedTicks=0;
    if(next>=ride.length)ride.stage='exit';return false;
  }
  r.status='waiting-for-tunnel-exit';
  if(!clearSegment(exit,exit,obstacles,r.radius)||!clearSegment(exit,exit,others,r.radius+.08)||accepted.some(s=>segmentsNear(exit,exit,s.a,s.b,r.radius+s.radius+.08)))return false;
  r.undergroundDepth=0;r.tunnelRide=null;r.path=[];r.destination=null;r.routeRetry=0;r.status='leaving-tunnel';return false;
}
