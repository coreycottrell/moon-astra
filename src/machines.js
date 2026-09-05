import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {direction,coordinates,noise} from './geography.js';
import {instantiateMachine,isSharedGeometry,isSharedMaterial} from './machine-assets.js';
const mat=(color,metalness=.4,roughness=.6)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const white=mat(0xe5e1d7),dark=mat(0x252a30,.65),orange=mat(0xe3813d,.4),gold=mat(0x9b793b,.8),blue=mat(0x14364b,.75,.3),black=mat(0x101519),glass=new THREE.MeshStandardMaterial({color:0x85e4dc,emissive:0x46a99e,emissiveIntensity:.6,metalness:.4,roughness:.2});
const unitBox=new THREE.BoxGeometry(1,1,1);
function box(g,x,y,z,sx,sy,sz,m=white){const o=new THREE.Mesh(unitBox,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function cylinder(g,x,y,z,r1,r2,h,m=white,segments=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function beam(g,a,b,r=.12,m=dark){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),o=cylinder(g,0,0,0,r,r,aa.distanceTo(bb),m,6);o.position.copy(aa).add(bb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bb.sub(aa).normalize());return o;}
function solarPanel(g,x,z,scale=1){const pivot=new THREE.Group();pivot.position.set(x,1.9,z);pivot.rotation.z=-.22;g.add(pivot);box(pivot,0,0,0,4*scale,.15,5*scale,dark);for(let i=0;i<4;i++)for(let j=0;j<5;j++)box(pivot,(i-1.5)*.95*scale,.09,(j-2)*.95*scale,.89*scale,.05,.89*scale,blue);beam(g,[x,.2,z],[x,2,z]);return pivot;}
export function createMachine(type) {
  const asset=instantiateMachine(type);
  if(!asset)return createFallbackMachine(type);
  const g=new THREE.Group(),lod=new THREE.LOD();
  lod.addLevel(asset.root,0);lod.addLevel(createFallbackMachine(type),260);
  g.add(lod);g.userData.asset=asset;g.userData.lod=lod;g.userData.machineType=type;
  return g;
}
function createFallbackMachine(type) {
  const g=new THREE.Group();g.userData.spinners=[];
  const size=type==='replicator'?8:type==='seed'?7:5;
  box(g,0,.05,0,size,.24,size,dark);
  for(const x of [-1,1])for(const z of [-1,1]){box(g,x*(size/2-.3),.23,z*(size/2-.3),.6,.12,.6,orange);cylinder(g,x*(size/2-.6),-.5,z*(size/2-.6),.18,.25,1.2,dark,6);}
  if(type==='seed'){
    cylinder(g,0,1.8,0,2.3,2.6,2.8,gold,8);cylinder(g,0,3.4,0,2.3,2.3,.4,white,8);
    cylinder(g,0,4.2,0,1.3,2.3,1.2,white,8);box(g,0,2.5,2.45,2.2,.7,.15,black);
    for(const x of [-1,1]){solarPanel(g,x*5,0,.75);beam(g,[x*1.8,1.5,1.5],[x*3.3,-.3,3.3],.18,gold);beam(g,[x*1.8,1.5,-1.5],[x*3.3,-.3,-3.3],.18,gold);}
    cylinder(g,0,5.8,0,.08,.08,2,white,6);cylinder(g,0,6.8,0,.12,.12,.2,orange,6);
  }else if(type==='solar'){
    box(g,0,.8,0,1.8,1.2,2.5,white);solarPanel(g,-3,0);solarPanel(g,3,0);box(g,0,1.5,0,.6,.15,1,orange);
  }else if(type==='miner'){
    box(g,0,1.25,0,3.5,1.8,3.5,white);box(g,0,2.25,0,2.6,.4,2.6,orange);
    for(const x of [-1,1]){box(g,x*1.85,.7,0,.6,1,4,dark);for(let z=-1;z<=1;z++)cylinder(g,x*1.85,.5,z*1.3,.35,.35,.8,black,8).rotation.z=Math.PI/2;}
    beam(g,[.8,2.4,0],[3.8,4,0],.3,orange);beam(g,[3.8,4,0],[4.2,1.1,0],.2,dark);
    const drill=cylinder(g,4.2,.65,0,.4,.8,1.4,dark,8);g.userData.spinners.push(drill);box(g,-.8,2.6,0,.9,.3,.9,blue);
  }else if(type==='refinery'){
    box(g,0,1.5,0,4,2.5,4,white);box(g,0,2.85,0,4.1,.2,4.1,dark);
    for(const x of [-1,1])cylinder(g,x*1.15,3.8,0,.8,.8,1.9,gold,12);
    cylinder(g,-1.15,4.8,0,.6,.8,.3,dark,12);cylinder(g,1.15,4.8,0,.6,.8,.3,dark,12);
    box(g,0,1.6,2.06,2,.6,.1,orange);for(let y=0;y<4;y++)box(g,-2.05,.8+y*.45,0,.12,.17,2.5,dark);
    beam(g,[-1,3,1.6],[1,3,1.6],.17,orange);
  }else if(type==='replicator'){
    box(g,0,.5,0,7,.8,7,white);for(const x of [-1,1]){box(g,x*3,2.6,0,.55,4.5,6.5,dark);box(g,x*3,5,0,.85,.4,7,orange);}
    box(g,0,5.15,0,6.5,.5,.7,white);const arm=box(g,0,4.3,0,.8,1.5,.8,orange);g.userData.arm=arm;
    box(g,0,1,0,3,.25,3,blue);const work=box(g,0,1.7,0,1.8,1.1,1.8,gold);g.userData.work=work;
    box(g,-3.65,2,2,1,.8,1.1,white);box(g,-3.68,2.1,2.6,.7,.4,.08,glass);
  }else if(type==='compute'){
    cylinder(g,0,.55,0,2.7,3,.8,dark,8);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(g,Math.cos(a)*1.8,2,Math.sin(a)*1.8,.9,2.7,.9,white).rotation.y=-a;}
    const core=cylinder(g,0,2.1,0,.8,.8,2.8,glass,12);g.userData.spinners.push(core);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.1,.09,6,40),glass);ring.rotation.x=Math.PI/2;ring.position.y=3.5;g.add(ring);g.userData.ring=ring;
    cylinder(g,0,4.2,0,.05,.05,1.5,white,6);
  }
  // Batch the static parts by material. Keep the moving drill, arm, and core
  // independent, so a growing factory does not multiply dozens of draw calls.
  g.updateMatrixWorld(true);
  const moving=new Set([...g.userData.spinners,g.userData.arm,g.userData.work,g.userData.ring].filter(Boolean));
  const batches=new Map(),staticParts=[];
  g.traverse(o=>{if(o.isMesh&&!moving.has(o))staticParts.push(o);});
  for(const o of staticParts){
    const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
    if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geometry);
    if(o.geometry!==unitBox)o.geometry.dispose();o.removeFromParent();
  }
  for(const [material,parts] of batches){
    const merged=mergeGeometries(parts,false),mesh=new THREE.Mesh(merged,material);
    mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);parts.forEach(p=>p.dispose());
  }
  return g;
}
export function disposeMachine(g,ownMaterials=false){
  const geometries=new Set(),materials=new Set();
  g.traverse(o=>{
    if(o.userData.asset){const a=o.userData.asset;a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);a.lights.forEach(m=>materials.add(m));}
    if(o.isMesh){if(o.geometry!==unitBox&&!isSharedGeometry(o.geometry))geometries.add(o.geometry);if(ownMaterials)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!isSharedMaterial(m))materials.add(m);}
  });
  geometries.forEach(geo=>geo.dispose());materials.forEach(m=>m.dispose());g.removeFromParent();
}
export function positionMachine(object,m,data,frame) {
  const d=direction(m.lat,m.lon),p=data.point(d);
  object.position.fromArray(frame.toLocal(p));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...frame.vectorToLocal(d)));
  object.rotateY(m.rotation);object.userData.machine=m;
}
export function animateMachine(g,delta,{power=1,active=true,camera,progress}={}) {
  const asset=g.userData.asset;
  if(asset){
    if(camera)g.userData.lod.update(camera);
    const isNear=g.userData.lod.getCurrentLevel()===0;
    const rate=active?Math.max(0,power):0;
    asset.elapsed+=Math.min(Math.max(delta,0),.1)*rate;
    if(isNear){asset.mixer.setTime(asset.elapsed);
      if(asset.work&&progress!==undefined){asset.work.scale.y=Math.max(.08,Math.min(1,progress/24));asset.work.visible=progress>0;}
    }
    const glow=active?Math.max(.1,power):.035;
    if(asset.glow!==glow){for(const m of asset.lights)m.emissiveIntensity=m.userData.ratedEmission*glow;asset.glow=glow;}
    return;
  }
  if(!active)return;
  const t=g.userData.animationTime=(g.userData.animationTime||0)+Math.min(delta,.1)*power;
  for(const o of g.userData.spinners||[])o.rotation.y=t*.8;
  if(g.userData.arm){g.userData.arm.position.x=Math.sin(t*.8)*2;g.userData.arm.position.z=Math.cos(t*.55)*1.8;}
  if(g.userData.ring)g.userData.ring.position.y=3.2+Math.sin(t*1.5)*.3;
  if(g.userData.work)g.userData.work.scale.y=.4+(g.userData.machine?.progress||0)/24;
}
export function createRocks(data,frame) {
  const geometry=new THREE.IcosahedronGeometry(1,0),material=mat(0x777670,.05,1),rocks=new THREE.InstancedMesh(geometry,material,320);
  const o=new THREE.Object3D();
  for(let i=0;i<320;i++){
    const a=i*2.39996,r=20+Math.sqrt(i/320)*600,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const d=normalizeLocal(frame.toWorld([x,0,z])),p=data.point(d),s=.25+Math.abs(noise(i*12,8,4))**3*2.2;
    o.position.fromArray(frame.toLocal(p));o.position.y+=s*.15;o.rotation.set(i,2*i,.4*i);o.scale.set(s,s*.65,s*1.2);o.updateMatrix();rocks.setMatrixAt(i,o.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;return rocks;
}
function normalizeLocal(v){const l=Math.hypot(...v);return v.map(x=>x/l);}
