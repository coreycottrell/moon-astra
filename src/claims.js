import {RADIUS, direction, coordinates, cubeDirection} from './geography.js';
export const CLAIM_LEVEL=10;
const N=2**CLAIM_LEVEL;
export function validLocation(p){return !!p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;}
export function cellId(face,x,y){return `c10:${face}:${x}:${y}`;}
export function parseCell(id){
  const m=/^c10:([0-5]):(\d{1,4}):(\d{1,4})$/.exec(id||'');
  if(!m||+m[2]>=N||+m[3]>=N)throw Error('Invalid claim address');
  return {face:+m[1],x:+m[2],y:+m[3]};
}
export function cellAt(loc){
  if(!validLocation(loc))throw Error('Invalid lunar coordinates');
  const [x,y,z]=direction(loc.lat,loc.lon),ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);
  let face,u,v;
  if(ax>=ay&&ax>=az){face=x>=0?0:1;u=x>=0?-z/ax:z/ax;v=y/ax;}
  else if(ay>=az){face=y>=0?2:3;u=x/ay;v=y>=0?-z/ay:z/ay;}
  else{face=z>=0?4:5;u=z>=0?x/az:-x/az;v=y/az;}
  const index=a=>Math.max(0,Math.min(N-1,Math.floor((a+1)*N/2)));
  return cellId(face,index(u),index(v));
}
export function cellCenter(id){const {face,x,y}=parseCell(id);return coordinates(cubeDirection(face,-1+(x+.5)*2/N,-1+(y+.5)*2/N));}
export function cellArea(id){
  const {x,y}=parseCell(id),u=-1+2*x/N,v=-1+2*y/N,s=2/N;
  const f=(a,b)=>Math.atan2(a*b,Math.sqrt(1+a*a+b*b));
  return RADIUS**2/1e6*(f(u+s,v+s)-f(u,v+s)-f(u+s,v)+f(u,v));
}
export function cellBoundary(id,segments=24){
  const {face,x,y}=parseCell(id),u=-1+2*x/N,v=-1+2*y/N,s=2/N,points=[];
  for(let edge=0;edge<4;edge++)for(let i=0;i<segments;i++){
    const t=i/segments,uv=[[u+t*s,v],[u+s,v+t*s],[u+s-t*s,v+s],[u,v+s-t*s]][edge];
    points.push(coordinates(cubeDirection(face,...uv)));
  }
  points.push(points[0]);return points;
}
export function startingCell(index){
  const {face,x,y}=parseCell(cellAt({lat:28.5,lon:-17.5}));
  const offsets=[[0,0]];
  for(let r=1;offsets.length<=index;r++)for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++)if(Math.max(Math.abs(xx),Math.abs(yy))===r)offsets.push([xx,yy]);
  const [dx,dy]=offsets[index];return cellId(face,x+dx,y+dy);
}
