import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {appPath} from './urls.js';

export const MACHINE_TYPES=['seed','solar','miner','refinery','replicator','compute'];
export const FOUNDRY_TYPES=['mason','atlas','suture','titan','depot','workshop','robotfactory','relay','tunnel','radiator'];
const ALL_TYPES=[...MACHINE_TYPES,...FOUNDRY_TYPES];
const templates=new Map(),sharedGeometry=new WeakSet(),sharedMaterials=new WeakSet();
let loading;
export function loadMachineAssets(onProgress=()=>{}){
  if(loading)return loading;
  let done=0;const loader=new GLTFLoader();
  loading=Promise.allSettled(ALL_TYPES.map(async type=>{
    // Versioned folder makes the art release safe for cached and older open tabs.
    const gltf=await loader.loadAsync(appPath(`models/${FOUNDRY_TYPES.includes(type)?'foundry-01':'industrial-01'}/${type}.glb`));
    if(!gltf.scene||!gltf.animations.length)throw Error(`${type}: missing model or animation`);
    gltf.scene.traverse(o=>{if(o.isMesh){sharedGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])sharedMaterials.add(m);o.castShadow=true;o.receiveShadow=true;}});
    templates.set(type,gltf);onProgress(++done,ALL_TYPES.length);
  })).then(results=>({loaded:[...templates.keys()],failed:results.flatMap((r,i)=>r.status==='rejected'?[ALL_TYPES[i]]:[])}));
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
  const actions={};for(const clip of template.animations){const action=mixer.clipAction(clip);actions[clip.name]=action;action.play();}
  return {root,mixer,actions,lights:[...lights.values()],work:root.getObjectByName('Manufactured_part'),elapsed:0};
}
export function isSharedGeometry(g){return sharedGeometry.has(g);}
export function isSharedMaterial(m){return sharedMaterials.has(m);}
export function loadedMachineTypes(){return [...templates.keys()];}
