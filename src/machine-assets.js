import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {appPath} from './urls.js';

export const MACHINE_TYPES=['seed','solar','miner','refinery','replicator','compute'];
const templates=new Map(),sharedGeometry=new WeakSet(),sharedMaterials=new WeakSet();
let loading;
export function loadMachineAssets(onProgress=()=>{}){
  if(loading)return loading;
  let done=0;const loader=new GLTFLoader();
  loading=Promise.allSettled(MACHINE_TYPES.map(async type=>{
    // Versioned folder makes the art release safe for cached and older open tabs.
    const gltf=await loader.loadAsync(appPath(`models/industrial-01/${type}.glb`));
    if(!gltf.scene||!gltf.animations.length)throw Error(`${type}: missing model or animation`);
    gltf.scene.traverse(o=>{if(o.isMesh){sharedGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])sharedMaterials.add(m);o.castShadow=true;o.receiveShadow=true;}});
    templates.set(type,gltf);onProgress(++done,MACHINE_TYPES.length);
  })).then(results=>({loaded:[...templates.keys()],failed:results.flatMap((r,i)=>r.status==='rejected'?[MACHINE_TYPES[i]]:[])}));
  return loading;
}
export function instantiateMachine(type){
  const template=templates.get(type);if(!template)return null;
  const root=template.scene.clone(true),lights=new Map();
  root.traverse(o=>{if(o.isMesh){
    const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{
      if(!['status_light','process_glow'].includes(m.name))return m;
      if(!lights.has(m)){const copy=m.clone();copy.userData.ratedEmission=m.emissiveIntensity;lights.set(m,copy);}return lights.get(m);
    });o.material=Array.isArray(o.material)?materials:materials[0];
  }});
  const mixer=new THREE.AnimationMixer(root);
  for(const clip of template.animations)mixer.clipAction(clip).play();
  return {root,mixer,lights:[...lights.values()],work:root.getObjectByName('Manufactured_part'),elapsed:0};
}
export function isSharedGeometry(g){return sharedGeometry.has(g);}
export function isSharedMaterial(m){return sharedMaterials.has(m);}
export function loadedMachineTypes(){return [...templates.keys()];}
