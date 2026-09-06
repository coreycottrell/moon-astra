import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RoverMotion,travelledRoute,routeSample,ROVER_DELAY_MS} from '../src/foundry/rover-motion.js';
import {MoonTerrain} from '../src/terrain.js';
import {coordinates,cubeDirection,frameAt,RADIUS} from '../src/geography.js';
const robot=(x,y=0,extra={})=>({x,y,rotation:Math.PI/2,status:'hauling',...extra});

test('one-second snapshots produce constant travel at render frequency, including packet boundaries',()=>{
 const m=new RoverMotion();for(let i=0;i<7;i++)m.push(robot(i*2),i,i*1000);
 let previous=m.sample(ROVER_DELAY_MS+500);
 for(let t=ROVER_DELAY_MS+500+1000/60;t<ROVER_DELAY_MS+5500;t+=1000/60){const current=m.sample(t);assert.ok(Math.abs(current.x-previous.x-2/60)<1e-10);previous=current;}
});
test('command refreshes and out of order snapshots cannot rewind or disturb pacing',()=>{
 const m=new RoverMotion();m.push(robot(0),0,0);m.push(robot(2),1,1000);m.push(robot(2),1,1350);m.push(robot(-20),0,1500);m.push(robot(4),2,2000);
 assert.equal(m.samples.length,3);assert.equal(m.sample(2700).x,3);
});
test('rendering holds the last acknowledged point after loss, and reseeds after a long disconnect',()=>{
 const m=new RoverMotion();m.push(robot(0),0,0);m.push(robot(2),1,1000);assert.equal(m.sample(10000).x,2);
 m.push(robot(50),10,10000);assert.equal(m.sample(10001).x,50);assert.equal(m.sample(10001).generation,1);
});
test('late packets change pacing without overshoot or reversal',()=>{
 const m=new RoverMotion();for(const [tick,time] of [[0,0],[1,1060],[2,1970],[3,3110],[4,4000]])m.push(robot(tick),tick,time);
 let x=0;for(let time=1200;time<6000;time+=16){const p=m.sample(time);assert.ok(p.x>=x&&p.x<=4);x=p.x;}
});
test('snapshot gaps follow known path corners without cutting across the inside of an obstacle',()=>{
 const a=robot(0,0,{path:[{x:4,y:0},{x:4,y:6}]}),b=robot(4,4),route=travelledRoute(a,b);
 assert.deepEqual(route,[{x:0,y:0},{x:4,y:0},{x:4,y:4}]);
 for(let t=0;t<=1;t+=.025){const p=routeSample(route,t);assert.ok(p.y===0||p.x===4);}
 assert.deepEqual(routeSample(route,.5),{x:4,y:0,heading:Math.PI/2,distance:8});
});
test('stopped rovers hold their position and buffer memory remains bounded',()=>{
 const m=new RoverMotion();for(let i=0;i<500;i++)m.push(robot(9),i,i*1000);
 assert.equal(m.samples.length,12);assert.equal(m.sample(499800).x,9);assert.equal(m.sample(500000).x,9);
});
test('surface sampling selects the displayed cube-face triangle and follows LOD changes',()=>{
 for(let face=0;face<6;face++){
  const home=coordinates(cubeDirection(face,.2,.3)),frame=frameAt(home.lat,home.lon),data={height:()=>0,point:d=>d.map(v=>v*RADIUS)};
  const terrain=new MoonTerrain(new THREE.Scene(),data,frame,null),tile=terrain.cache.get(`${face}/0/0/0`),positions=tile.mesh.geometry.attributes.position;
  // A known point inside the grid triangle (i=9,j=10), weights .5,.2,.3.
  const u=-1+(9+.2)*2/16,v=-1+(10+.3)*2/16,loc=coordinates(cubeDirection(face,u,v)),a=10*17+9;
  const expected=new THREE.Vector3();for(const [i,w] of [[a,.5],[a+1,.2],[a+17,.3]])expected.addScaledVector(new THREE.Vector3().fromBufferAttribute(positions,i),w);
  assert.ok(terrain.surfacePoint(loc).distanceTo(expected)<1e-6,`face ${face}`);
  terrain.desired=[terrain.node(face,0,0,0)];terrain.commit();const revision=terrain.revision;terrain.desired=[terrain.node(face,0,0,0)];terrain.commit();assert.equal(terrain.revision,revision);terrain.dispose();
 }
});

test('the Blender chassis stays upright on slopes and its +Z front points along travel',async()=>{
 const {RoverVisual}=await import('../src/foundry/rover-visual.js'),{offsetPosition,direction}=await import('../src/geography.js');
 const home={lat:0,lon:0},frame=frameAt(0,0),g=new THREE.Group();g.userData.fallback={visible:false};
 const visual=new RoverVisual(g,'builder',{add(){}}),terrain={surfacePoint(loc,target){const p=frame.toLocal(direction(loc.lat,loc.lon).map(v=>v*RADIUS));return target.set(p[0],.2*p[0]-.1*p[2],p[2]);}};
 visual.sync(robot(0),0,0,home);visual.sync(robot(2),1,1000,home);visual.animate(1/60,1700,true,terrain,frame,null);
 const up=new THREE.Vector3(0,1,0).applyQuaternion(g.quaternion),forward=new THREE.Vector3(0,0,1).applyQuaternion(g.quaternion),expected=new THREE.Vector3(-.2,1,.1).normalize();
 assert.ok(up.dot(expected)>.999);assert.ok(forward.x>.95);assert.ok(g.position.y>.15);
});
