import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RADIUS,SURFACE_AREA_KM2,LunarData,cubeDirection,direction,coordinates,frameAt,distanceOnMoon,offsetPosition,dot} from '../src/geography.js';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('six spherical faces cover the entire physical lunar surface exactly once',()=>{
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const area=(a,b,c)=>2*Math.atan2(Math.abs(dot(a,cross(b,c))),1+dot(a,b)+dot(b,c)+dot(c,a));
  let total=0;
  for(let face=0;face<6;face++){
    const a=cubeDirection(face,-1,-1),b=cubeDirection(face,1,-1),c=cubeDirection(face,1,1),d=cubeDirection(face,-1,1);
    total+=area(a,b,c)+area(a,c,d);
  }
  near(total,4*Math.PI,1e-12);near(total*RADIUS**2/1e6,SURFACE_AREA_KM2,1e-6);
  assert.ok(SURFACE_AREA_KM2>37_900_000&&SURFACE_AREA_KM2<38_000_000);
});
test('all twelve cube-face joins and eight corners share identical positions',()=>{
  const keys=new Map();
  for(let f=0;f<6;f++)for(let edge=0;edge<4;edge++)for(let i=1;i<16;i++){
    const t=-1+2*i/16,[u,v]=[[-1,t],[1,t],[t,-1],[t,1]][edge];
    const key=cubeDirection(f,u,v).map(v=>v.toFixed(10)).join(',');keys.set(key,(keys.get(key)||0)+1);
  }
  assert.equal(keys.size,12*15);for(const count of keys.values())assert.equal(count,2);
});
test('latitude, longitude, and floating origins round-trip at dateline and poles',()=>{
  for(const lat of [-90,-89.9,-43.3,0,28.5,89.9,90])for(const lon of [-180,-179.99,-17.5,0,90,179.99,180]){
    const p=direction(lat,lon).map(v=>v*RADIUS),f=frameAt(lat,lon,3500),local=f.toLocal(p),world=f.toWorld(local);
    world.forEach((v,i)=>near(v,p[i],1e-7));near(coordinates(p).lat,lat,1e-7);
    const moved=offsetPosition(lat,lon,100,50);near(distanceOnMoon({lat,lon},moved),Math.hypot(100,50),.02);
  }
});
test('actual NASA heights have physical ranges and no longitude-wrap discontinuity',()=>{
  const meta=JSON.parse(fs.readFileSync(new URL('../public/data/sources.json',import.meta.url)));
  const buffer=gunzipSync(fs.readFileSync(new URL('../public/data/moon-height.u16.gz',import.meta.url)));
  const samples=new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2),data=new LunarData(samples,meta.width,meta.height);
  assert.equal(samples.length,5760*2880);
  for(const lat of [-89,-43,0,28.5,89])near(data.elevation(lat,180),data.elevation(lat,-180),1e-9);
  // Mare Imbrium is a low basin; lunar far-side highlands are elevated.
  assert.ok(data.elevation(28.5,-17.5)<-1000);
  assert.ok(data.elevation(15,150)>0);
  const a=data.height(cubeDirection(0,1,.25)),b=data.height(cubeDirection(5,-1,.25));near(a,b,1e-8);
});
