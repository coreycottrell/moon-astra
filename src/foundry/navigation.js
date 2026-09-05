import {direction,offsetPosition,RADIUS} from '../geography.js';

export function localXY(home,loc){
  const d=direction(loc.lat,loc.lon),a=home.lat*Math.PI/180,b=home.lon*Math.PI/180;
  return {x:RADIUS*(-Math.sin(b)*d[0]+Math.cos(b)*d[2]),y:RADIUS*(-Math.sin(a)*Math.cos(b)*d[0]+Math.cos(a)*d[1]-Math.sin(a)*Math.sin(b)*d[2])};
}
// geography.js uses +X at longitude zero and +Z toward east.
export const lunarPosition=(home,p)=>offsetPosition(home.lat,home.lon,p.x,p.y);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function pointSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export function segmentsNear(a,b,c,d,r){
  const cross=(p,q,s)=>(q.x-p.x)*(s.y-p.y)-(q.y-p.y)*(s.x-p.x);
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b))<r;
}
export function clearSegment(a,b,obstacles,radius=.65){return obstacles.every(o=>pointSegment(o,a,b)>=o.radius+radius);}

class Heap{
  constructor(){this.a=[];}
  push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.a,out=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=v.f)break;a[i]=a[c];i=c;}a[i]=v;}return out;}
}

// Meter-scale, bounded A*. Static obstacles use swept circular clearances;
// diagonal moves are checked as segments rather than hopping through corners.
// Far travel uses a coarser 4m lattice, with the same continuous clearance test.
export function findPath(start,end,obstacles,{radius=.65,maxVisited=5000,walkable=()=>true}={}){
  const usable=obstacles.filter(o=>pointSegment(o,start,end)<o.radius+80);
  const clear=(a,b)=>clearSegment(a,b,usable,radius)&&walkable(a,b);
  if(clear(start,end))return [{...end}];
  const size=2,margin=60;
  const heuristic=p=>{const x=Math.abs(p.x-end.x),y=Math.abs(p.y-end.y);return Math.max(x,y)+(Math.SQRT2-1)*Math.min(x,y);};
  const minX=Math.min(start.x,end.x)-margin,maxX=Math.max(start.x,end.x)+margin,minY=Math.min(start.y,end.y)-margin,maxY=Math.max(start.y,end.y)+margin;
  const key=(x,y)=>`${x},${y}`,nodes=new Map(),heap=new Heap(),origin={x:0,y:0,p:{...start},g:0,parent:null};origin.f=heuristic(start)*1.08;nodes.set('0,0',origin);heap.push(origin);
  let visited=0,found;
  while(heap.a.length&&visited++<maxVisited){
    const n=heap.pop();if(n.closed)continue;n.closed=true;
    if(distance(n.p,end)<size*2&&clear(n.p,end)){found=n;break;}
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;const x=n.x+dx,y=n.y+dy,p={x:start.x+x*size,y:start.y+y*size};
      if(p.x<minX||p.x>maxX||p.y<minY||p.y>maxY||!clear(n.p,p))continue;
      const k=key(x,y),g=n.g+Math.hypot(dx,dy)*size,old=nodes.get(k);if(old&&old.g<=g)continue;
      const next={x,y,p,g,f:g+heuristic(p)*1.08,parent:n};nodes.set(k,next);heap.push(next);
    }
  }
  if(!found)return null;
  const path=[{...end}];for(let n=found;n?.parent;n=n.parent)path.push(n.p);path.reverse();
  const smooth=[];let previous=start;
  for(let i=0;i<path.length;){let next=i;while(next+1<path.length&&clear(previous,path[next+1]))next++;smooth.push(path[next]);previous=path[next];i=next+1;}
  return smooth;
}

export function moveRobot(robot,target,obstacles,others,accepted,{speed,walkable}={}){
  const radius=robot.radius||.8;
  if(distance(robot,target)<.1){robot.path=[];robot.blockedTicks=0;return true;}
  const destination=robot.destination;
  if(robot.routeRetry>0&&destination&&distance(destination,target)<.2){robot.routeRetry--;robot.status='route-blocked';return false;}
  if(!destination||distance(destination,target)>.2||!robot.path?.length||robot.blockedTicks>=12){
    const dynamic=robot.blockedTicks>=12?others.filter(o=>o.id!==robot.id&&distance(o,robot)<12).map(o=>({...o,radius:(o.radius||.8)+.08})):[];
    robot.path=findPath(robot,target,[...obstacles,...dynamic],{radius,walkable})||[];robot.destination={...target};
    if(!robot.path.length){robot.blockedTicks=(robot.blockedTicks||0)+1;robot.status='route-blocked';robot.routeRetry=20;return false;}
    robot.blockedTicks=0;
  }
  const waypoint=robot.path[0],d=distance(robot,waypoint),fraction=Math.min(1,(speed||1)/Math.max(d,.00001)),next={x:robot.x+(waypoint.x-robot.x)*fraction,y:robot.y+(waypoint.y-robot.y)*fraction};
  const conflict=others.some(o=>o.id!==robot.id&&pointSegment(o,robot,next)<radius+(o.radius||.8)+.08)||accepted.some(s=>segmentsNear(robot,next,s.a,s.b,radius+s.radius+.08));
  if(conflict||!clearSegment(robot,next,obstacles,radius)){
    robot.blockedTicks=(robot.blockedTicks||0)+1;robot.status='yielding';return false;
  }
  accepted.push({a:{x:robot.x,y:robot.y},b:next,radius});robot.x=next.x;robot.y=next.y;robot.blockedTicks=0;robot.distanceTravelled=(robot.distanceTravelled||0)+d*fraction;
  if(fraction>=1)robot.path.shift();return distance(robot,target)<.1;
}
