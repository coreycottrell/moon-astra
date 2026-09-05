// All terrain, machines, and navigation use one Moon-centered coordinate system.
import {appPath} from './urls.js';
export const RADIUS = 1_737_400;
export const SURFACE_AREA_KM2 = 4 * Math.PI * RADIUS ** 2 / 1e6;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
export const normalize = a => { const l = Math.hypot(...a); return a.map(v => v/l); };
export function direction(lat, lon) {
  const c = Math.cos(lat * DEG);
  return [c*Math.cos(lon*DEG), Math.sin(lat*DEG), c*Math.sin(lon*DEG)];
}
export function coordinates(p) {
  const d = normalize(p);
  return {lat: Math.asin(clamp(d[1],-1,1))/DEG, lon: Math.atan2(d[2],d[0])/DEG};
}
// Six faces exactly partition a sphere; neighboring cube edges normalize identically.
export function cubeDirection(face, u, v) {
  return normalize([
    [1,v,-u], [-1,v,u], [u,1,-v], [u,-1,v], [u,v,1], [-u,v,-1],
  ][face]);
}
export function frameAt(lat, lon, elevation = 0) {
  const up = direction(lat, lon);
  const east = [-Math.sin(lon*DEG), 0, Math.cos(lon*DEG)];
  const north = [-Math.sin(lat*DEG)*Math.cos(lon*DEG), Math.cos(lat*DEG), -Math.sin(lat*DEG)*Math.sin(lon*DEG)];
  const origin = up.map(v => v*(RADIUS+elevation));
  return {
    origin, up, east, north,
    toLocal(p) { const d=p.map((v,i)=>v-origin[i]); return [dot(d,east),dot(d,up),-dot(d,north)]; },
    toWorld(p) { return origin.map((v,i)=>v+east[i]*p[0]+up[i]*p[1]-north[i]*p[2]); },
    vectorToLocal(p) { return [dot(p,east),dot(p,up),-dot(p,north)]; },
  };
}
export function distanceOnMoon(a,b) {
  return Math.acos(clamp(dot(direction(a.lat,a.lon),direction(b.lat,b.lon)),-1,1))*RADIUS;
}
export function offsetPosition(lat, lon, eastM, northM) {
  const frame=frameAt(lat,lon);
  return coordinates(frame.toWorld([eastM,0,-northM]));
}
function hash(x,y,z) {
  let h = Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,2147483647);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967295;
}
export function noise(x,y,z) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const smooth=t=>t*t*(3-2*t), mix=(a,b,t)=>a+(b-a)*t;
  const u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),u),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w)*2-1;
}
// Small impact craters below the measured DEM resolution. Each feature is
// addressed globally, with a periodic longitude grid, so tile borders cannot
// reset the detail pattern. Features have compact support inside their cells.
function smallCraters(lat,lon) {
  const rows=32768,step=180/rows,row=Math.floor((lat+90)/step);
  let height=0;
  for(let ry=Math.max(0,row-1);ry<=Math.min(rows-1,row+1);ry++){
    const centerLat=-90+(ry+.5)*step,cos=Math.cos(centerLat*DEG);
    const cols=Math.max(1,Math.round(2*Math.PI*RADIUS*cos/166.6));
    const column=Math.floor((lon+180)/360*cols);
    for(let cx=column-1;cx<=column+1;cx++){
      const x=((cx%cols)+cols)%cols,seed=hash(x,ry,531);
      if(seed>.44)continue;
      const clat=centerLat+(hash(x,ry,219)-.5)*step*.55;
      const clon=-180+(x+.5+(hash(x,ry,341)-.5)*.55)*360/cols;
      const dlon=((lon-clon+540)%360)-180;
      const dx=dlon*DEG*RADIUS*cos,dy=(lat-clat)*DEG*RADIUS;
      const radius=7+seed/.44*20,q=Math.hypot(dx,dy)/radius;
      if(q>1.5)continue;
      const bowl=q<1?-radius*.2*(1-q*q)**2:0;
      const rim=radius*.065*Math.exp(-Math.pow((q-1.02)/.16,2));
      height+=bowl+rim;
    }
  }
  return height;
}
export class LunarData {
  constructor(samples,width,height) { this.samples=samples; this.width=width; this.rows=height; }
  elevation(lat,lon) {
    const {width:w,rows:h,samples:s}=this;
    const x=(((lon+180)/360*w-.5)%w+w)%w;
    const y=clamp((90-lat)/180*h-.5,0,h-1);
    const x0=Math.floor(x), y0=Math.floor(y), x1=(x0+1)%w,y1=Math.min(h-1,y0+1);
    const a=x-x0,b=y-y0;
    return ((s[y0*w+x0]*(1-a)+s[y0*w+x1]*a)*(1-b)+(s[y1*w+x0]*(1-a)+s[y1*w+x1]*a)*b)*.5-10000;
  }
  height(d, detail=true) {
    const {lat,lon}=coordinates(d);
    let h=this.elevation(lat,lon);
    if(detail) {
      const [x,y,z]=d.map(v=>v*RADIUS);
      h+=noise(x/160,y/160,z/160)*7+noise(x/28,y/28,z/28)*1.5+noise(x/5,y/5,z/5)*.24+smallCraters(lat,lon);
    }
    return h;
  }
  point(d,detail=true) { const r=RADIUS+this.height(d,detail); return d.map(v=>v*r); }
  static async load(progress=()=>{}) {
    progress('Reading the lunar elevation map');
    const [meta,response] = await Promise.all([fetch(appPath('data/sources.json')).then(r=>{if(!r.ok)throw Error('Lunar source metadata is missing');return r.json();}),fetch(appPath('data/moon-height.u16.gz'))]);
    if(!response.ok) throw Error('Lunar elevation map could not be loaded');
    // Some static servers attach Content-Encoding: gzip to .gz files. Browsers
    // then decode them automatically. Inspect the payload rather than decode twice.
    const payload=await response.arrayBuffer(),magic=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
    const buffer=magic[0]===31&&magic[1]===139
      ?await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      :payload;
    if(buffer.byteLength!==meta.width*meta.height*2)throw Error('Lunar elevation map has an unexpected size');
    const samples=new Uint16Array(buffer);
    return new LunarData(samples,meta.width,meta.height);
  }
}
