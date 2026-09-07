import * as THREE from 'three';
import {instantiateMachine} from '../machine-assets.js';
import {positionMachine,disposeMachine} from '../machines.js';
import {distanceOnMoon} from '../geography.js';
import {ROVER_DELAY_MS} from './rover-motion.js';
import {tunnelStatus} from './lift-network.js';

function model(type){
 const g=new THREE.Group(),asset=instantiateMachine(type);
 if(asset){g.add(asset.root);g.userData.asset=asset;asset.mixer.stopAllAction();}
 return g;
}
function fallback(){
 const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xbcc5c5,metalness:.7,roughness:.45});
 const plate=new THREE.Mesh(new THREE.BoxGeometry(3.8,.1,3.8),mat);plate.name='Lift_platform';g.add(plate);
 for(const x of [-2,2])for(const z of [-2,2]){const guide=new THREE.Mesh(new THREE.BoxGeometry(.12,1,.12),mat);guide.position.set(x,.5,z);g.add(guide);}return g;
}
function caption(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.scale.set(6.4,1.2,1);sprite.position.y=2.8;return {canvas,texture,sprite,last:''};
}
function updateCaption(label,text,occupied){
 if(label.last===text)return;label.last=text;const c=label.canvas.getContext('2d');c.clearRect(0,0,512,96);c.fillStyle='rgba(9,20,25,.9)';c.fillRect(0,0,512,96);c.fillStyle=occupied?'#f0bf7e':'#91e5ca';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText(text,256,57,496);label.texture.needsUpdate=true;
}
export class LiftVisuals{
 constructor(scene){this.scene=scene;this.lifts=new Map();this.aprons=new Map();}
 reset(){for(const g of this.lifts.values()){g.userData.label.texture.dispose();g.userData.label.sprite.material.dispose();disposeMachine(g,true);}for(const g of this.aprons.values())disposeMachine(g,true);this.lifts.clear();this.aprons.clear();}
 sync(w,data,frame,view,time){
  this.frame=frame;this.data=data;const apronIds=new Set(),liftIds=new Set();
  for(const m of w.machines.filter(m=>m.type==='depot'&&m.depotHub&&distanceOnMoon(m,view)<1500)){
   apronIds.add(m.id);let g=this.aprons.get(m.id);if(!g){g=model('depot-apron');this.scene.add(g);this.aprons.set(m.id,g);}
   positionMachine(g,m,data,frame);
   // Small caps distinguish installed spare bays from future construction space.
   g.userData.bays??=[];
   while(g.userData.bays.length<m.depotHub.bays){const slot=g.userData.bays.length,a=slot*Math.PI/3,cap=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,.04,6),new THREE.MeshStandardMaterial({color:0x33474c,metalness:.5,roughness:.8}));cap.position.set(Math.cos(a)*13,.035,-Math.sin(a)*13);g.add(cap);g.userData.bays.push(cap);}
   for(let slot=0;slot<g.userData.bays.length;slot++)g.userData.bays[slot].visible=!w.corridors.some(t=>t.liftVersion&&(t.fromId===m.id&&t.terminals.from.slot===slot||t.toId===m.id&&t.terminals.to.slot===slot));
  }
  for(const t of w.corridors.filter(t=>t.liftVersion))for(const side of ['from','to']){
   const terminal=t.terminals[side],loc=terminal.loc;if(distanceOnMoon(loc,view)>1500)continue;const key=t.id+':'+side;liftIds.add(key);
   let g=this.lifts.get(key);if(!g){g=model('lift');if(!g.userData.asset)g.add(fallback());const shaft=new THREE.Mesh(new THREE.PlaneGeometry(3.85,3.85),new THREE.MeshBasicMaterial({color:0x071014,depthWrite:false}));shaft.rotation.x=-Math.PI/2;shaft.position.y=.018;g.add(shaft);g.userData.shaft=shaft;
    g.userData.platform=g.getObjectByName('Lift_platform');const label=caption();g.add(label.sprite);g.userData.label=label;g.userData.samples=[];g.userData.lift={corridorId:t.id,side};this.scene.add(g);this.lifts.set(key,g);
   }
   positionMachine(g,{...loc,rotation:loc.rotation||0},data,frame);g.userData.machine=null;g.userData.loc=loc;g.userData.installed=terminal.installed;
   const samples=g.userData.samples;if(samples.at(-1)?.tick!==w.tick){samples.push({time,tick:w.tick,depth:t.elevators?.[side]?.depth||0});if(samples.length>12)samples.shift();}
   const s=tunnelStatus(w,t);g.userData.status=s;
   updateCaption(g.userData.label,!terminal.installed?'LIFT INSTALLATION':s.label+(s.capacity?` · ${s.occupied}/${s.capacity}`:''),s.occupied>0);
   for(const light of g.userData.asset?.lights||[]){light.color.setHex(s.occupied?0xe9b674:0x85f2db);light.emissive.copy(light.color);light.emissiveIntensity=terminal.installed?2:.35;}
  }
  for(const [id,g] of this.aprons)if(!apronIds.has(id)){disposeMachine(g,true);this.aprons.delete(id);}
  for(const [id,g] of this.lifts)if(!liftIds.has(id)){g.userData.label.texture.dispose();g.userData.label.sprite.material.dispose();disposeMachine(g,true);this.lifts.delete(id);}
 }
 animate(time,camera,terrain,connected){
  for(const g of this.aprons.values()){if(terrain){terrain.surfacePoint(g.userData.machine,g.position);g.position.add(new THREE.Vector3(0,.09,0).applyQuaternion(g.quaternion));}}
  for(const g of this.lifts.values()){
   if(terrain)terrain.surfacePoint(g.userData.loc,g.position);
   const samples=g.userData.samples,clock=time-ROVER_DELAY_MS;let a=samples[0],b;for(let i=1;i<samples.length;i++){b=samples[i];if(clock<=b.time)break;a=b;b=null;}
   let depth=a?.depth||0;if(b)depth+=(b.depth-depth)*Math.max(0,Math.min(1,(clock-a.time)/(b.time-a.time)));
   if(connected&&g.userData.platform)g.userData.platform.position.y=depth;
   if(g.userData.asset)g.userData.asset.root.visible=g.userData.installed;
   g.userData.label.sprite.visible=camera.position.distanceTo(g.position)<180;
  }
 }
 get stats(){return [...this.lifts].map(([id,g])=>({id,depth:g.userData.platform?.position.y,installed:g.userData.installed,status:g.userData.status}));}
}
