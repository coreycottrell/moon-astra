// Render acknowledged positions a little behind the server. Never predict game
// movement: a blocked, paused or disconnected rover must not drive into a building.
export const ROVER_DELAY_MS=1200;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function travelledRoute(a,b){
  const points=[{x:a.x,y:a.y}];let start=a;
  // Retain the server's corners when a poll spans more than one waypoint.
  for(const end of a.path||[]){
    const length=distance(start,end),toB=distance(start,b);
    if(Math.abs(toB+distance(b,end)-length)<.015){points.push({x:b.x,y:b.y});return points;}
    points.push({x:end.x,y:end.y});start=end;
    if(points.length>256)break;
  }
  return [{x:a.x,y:a.y},{x:b.x,y:b.y}];
}
export function routeSample(points,fraction){
  const lengths=points.slice(1).map((p,i)=>distance(p,points[i])),total=lengths.reduce((a,b)=>a+b,0);
  let remaining=total*Math.max(0,Math.min(1,fraction));
  for(let i=0;i<lengths.length;i++){
    const length=lengths[i];if(remaining<=length||i===lengths.length-1){
      const a=points[i],b=points[i+1],t=length?Math.min(1,remaining/length):0;
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:length>1e-6?Math.atan2(b.x-a.x,b.y-a.y):undefined,distance:total};
    }remaining-=length;
  }
  return {...points[0],distance:0};
}
export class RoverMotion{
  constructor(){this.samples=[];this.generation=0;}
  push(robot,tick,time){
    const last=this.samples.at(-1);
    if(last&&tick===last.tick)return; // Command refreshes must not change the clock.
    if(last&&tick<last.tick)return; // World resets explicitly replace the renderer.
    if(last&&(time-last.time>4000||distance(last.robot,robot)>200)){
      this.samples=[];this.generation++;
    }
    const previous=this.samples.at(-1),sample={robot:{...robot,path:robot.path?.map(p=>({...p}))},tick,time};
    sample.route=previous?travelledRoute(previous.robot,sample.robot):null;
    this.samples.push(sample);if(this.samples.length>12)this.samples.shift();
  }
  sample(time){
    const samples=this.samples;if(!samples.length)return null;
    const clock=time-ROVER_DELAY_MS;
    let a=samples[0],b;
    for(let i=1;i<samples.length;i++){b=samples[i];if(clock<=b.time)break;a=b;b=null;}
    if(clock<=a.time||!b)return {...a.robot,heading:a.robot.rotation,generation:this.generation};
    const p=routeSample(b.route,(clock-a.time)/(b.time-a.time));
    return {...a.robot,...p,undergroundDepth:(a.robot.undergroundDepth||0)+((b.robot.undergroundDepth||0)-(a.robot.undergroundDepth||0))*Math.max(0,Math.min(1,(clock-a.time)/(b.time-a.time))),heading:p.heading??a.robot.rotation,generation:this.generation};
  }
}
