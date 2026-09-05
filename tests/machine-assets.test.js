import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const path=new URL('../public/models/industrial-01/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',path),'utf8'));
test('all six shipped Blender models have valid geometry, bounded footprints and real animation',async()=>{
 let total=0;
 for(const type of ['seed','solar','miner','refinery','replicator','compute']){
  const entry=manifest.models[type],bytes=readFileSync(new URL(entry.file,path));total+=bytes.length;
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assert.equal(model.animations.length,1);assert.equal(model.animations[0].name,'Work');assert.ok(Math.abs(model.animations[0].duration-entry.cycleSeconds)<.001);
  const mixer=new THREE.AnimationMixer(model.scene);mixer.clipAction(model.animations[0]).play();
  const snapshots=[];let meshes=0;
  model.scene.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.normal);assert.ok(o.geometry.index.count>=3);}});
  assert.ok(meshes<=26,`${type}: preserve the per-model draw-call budget`);
  for(const t of [0,1.7,4.3,7.8,11.9]){
   mixer.setTime(t);model.scene.updateMatrixWorld(true);
   // The auger's cutting stroke intentionally enters the regolith by 20 cm.
   const box=new THREE.Box3().setFromObject(model.scene);assert.ok(box.min.y>=(type==='miner'?-.25:-.03)&&box.max.y<7,`${type}: correctly grounded, meter-scaled geometry`);
   snapshots.push(entry.rigs.map(name=>{const rig=model.scene.getObjectByName(name);assert.ok(rig,`${type}: ${name} exported`);return rig.matrixWorld.elements.slice();}));
   model.scene.traverse(o=>{if(o.isMesh){const pos=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);assert.ok(Number.isFinite(v.lengthSq()));assert.ok(Math.hypot(v.x,v.z)<6.1,`${type}: animated geometry exceeds its placement footprint`);}}});
  }
  assert.notDeepEqual(snapshots[0],snapshots[2],`${type}: operating clip actually moves machinery`);
 }
 assert.ok(total<6*1024*1024,'The complete collection stays below 6 MiB');
});
