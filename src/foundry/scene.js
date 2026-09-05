import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {instantiateMachine} from '../machine-assets.js';
import {positionMachine,disposeMachine} from '../machines.js';
import {ROBOTS,BUILDINGS} from './catalog.js';
import {distanceOnMoon,direction} from '../geography.js';


function robotFallback(role){
  const g=new THREE.Group(),scale=role==='heavy'?1.6:role==='hauler'?1.35:1;
  const material=(color)=>new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.65});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.86*scale,.38,1.05*scale),material(0xe0dcd1));body.position.y=.53;g.add(body);
  const wheels=[];for(const x of [-1,1])for(const z of [-1,0,1])wheels.push(new THREE.BoxGeometry(.15,.38,.32).translate(x*.48*scale,.23,z*.4*scale));
  const joined=mergeGeometries(wheels);wheels.forEach(p=>p.dispose());g.add(new THREE.Mesh(joined,material(0x26323a)));
  const tool=new THREE.Mesh(new THREE.BoxGeometry(role==='hauler'?.75:.16,role==='hauler'?.25:.55,.5),material(0xc68951));tool.position.set(.1,.92,.1);g.add(tool);return g;
}

export class FoundryScene{
  constructor(scene){this.scene=scene;this.robots=new Map();this.sites=new Map();this.overlays=new THREE.Group();scene.add(this.overlays);this.showUtilities=false;this.showRoutes=false;}
  clearOverlays(){for(const o of [...this.overlays.children]){o.traverse(x=>{x.geometry?.dispose();x.material?.dispose();});o.removeFromParent();}}
  reset(){for(const g of this.robots.values())disposeMachine(g,true);this.robots.clear();for(const g of this.sites.values())disposeMachine(g,true);this.sites.clear();this.clearOverlays();}
  sync(state,data,frame,view){
    this.data=data;this.frame=frame;const nearby=state.robots.filter(r=>distanceOnMoon(r,view)<1500),ids=new Set(nearby.map(r=>r.id));
    for(const [id,g] of this.robots)if(!ids.has(id)){disposeMachine(g,true);this.robots.delete(id);}
    for(const r of nearby){
      let g=this.robots.get(r.id);if(!g){g=new THREE.Group();const asset=instantiateMachine(ROBOTS[r.role].asset);
        if(asset){g.add(asset.root);g.userData.asset=asset;}
        const fallback=robotFallback(r.role);fallback.visible=!asset;g.add(fallback);g.userData.fallback=fallback;
        const marker=new THREE.Mesh(new THREE.RingGeometry(.7,.77,24),new THREE.MeshBasicMaterial({color:r.role==='service'?0x8bdcca:r.role==='hauler'?0xf5bc7b:0xb6d8f2,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.07;g.add(marker);g.userData.marker=marker;
        positionMachine(g,r,data,frame);g.userData.drawPosition=g.position.clone();g.userData.drawQuaternion=g.quaternion.clone();this.scene.add(g);this.robots.set(r.id,g);
      }
      const old=g.userData.robot;g.userData.moving=!!old&&distanceOnMoon(old,r)>.05;g.userData.robot=r;
      positionMachine(g,r,data,frame);g.userData.targetPosition=g.position.clone();g.userData.targetQuaternion=g.quaternion.clone();g.position.copy(g.userData.drawPosition);g.quaternion.copy(g.userData.drawQuaternion);
      const crate=g.userData.asset?.root.getObjectByName('Payload_crate');if(crate)crate.visible=!!r.cargo?.length;
    }
    const jobs=state.jobs.filter(j=>distanceOnMoon(j,view)<1500),jobIds=new Set(jobs.map(j=>j.id));
    for(const [id,g] of this.sites)if(!jobIds.has(id)){disposeMachine(g,true);this.sites.delete(id);}
    for(const j of jobs){let g=this.sites.get(j.id);if(!g){
      g=new THREE.Group();const radius=BUILDINGS[j.type].radius;
      const slab=new THREE.Mesh(new THREE.BoxGeometry(radius*1.8,.18,radius*1.8),new THREE.MeshStandardMaterial({color:0x353c42,roughness:.9}));slab.position.y=.12;g.add(slab);
      const scaffold=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(radius*1.6,4,radius*1.6)),new THREE.LineBasicMaterial({color:0xd2a372,transparent:true,opacity:.5}));scaffold.position.y=2;g.add(scaffold);g.userData.scaffold=scaffold;
      for(const x of [-1,1])for(const z of [-1,1]){const light=new THREE.Mesh(new THREE.CylinderGeometry(.075,.1,.8,6),new THREE.MeshBasicMaterial({color:0xf6b477}));light.position.set(x*radius,.4,z*radius);g.add(light);}
      this.scene.add(g);this.sites.set(j.id,g);
    }positionMachine(g,j,data,frame);g.userData.scaffold.scale.y=j.phase==='supply'?.08:Math.max(.15,1-j.remaining/j.duration);}
    this.clearOverlays();
    const local=p=>new THREE.Vector3(...frame.toLocal(data.point(direction(p.lat,p.lon))));
    const line=(a,b,color,height=.3,opacity=.65)=>{const points=[];for(let i=0;i<=12;i++){const p={lat:a.lat+(b.lat-a.lat)*i/12,lon:a.lon+(b.lon-a.lon)*i/12};points.push(local(p).add(new THREE.Vector3(...frame.vectorToLocal(direction(p.lat,p.lon))).multiplyScalar(height)));}const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:height>=0}));this.overlays.add(o);};
    if(this.showUtilities)for(const industry of Object.values(state.industry))for(const edge of industry.grid.edges){const a=state.machines.find(m=>m.id===edge.from),b=state.machines.find(m=>m.id===edge.to);if(a&&b&&distanceOnMoon(a,view)<1500)line(a,b,edge.underground?0x87ddc9:0xc59158,edge.underground?-3:.4);}
    for(const t of state.corridors){const a=state.machines.find(m=>m.id===t.fromId),b=state.machines.find(m=>m.id===t.toId);if(!a||!b||distanceOnMoon(a,view)>1500)continue;const ratio=t.excavated/t.length,end={lat:a.lat+(b.lat-a.lat)*ratio,lon:a.lon+(b.lon-a.lon)*ratio};line(a,end,0x78debf,this.showUtilities?-3:.5,.9);}
    const waiting=state.freight.filter(f=>f.status==='waiting'&&distanceOnMoon(f.fromLocation,view)<1500);
    if(waiting.length){const crates=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.5,.65),new THREE.MeshStandardMaterial({metalness:.45,roughness:.6}),waiting.length),dummy=new THREE.Object3D(),color=new THREE.Color();
      for(const [index,f] of waiting.entries()){dummy.position.copy(local(f.fromLocation)).add(new THREE.Vector3((f.id%5-2)*.8,.7,(f.fromLocation.radius||0)+1.2));dummy.updateMatrix();crates.setMatrixAt(index,dummy.matrix);crates.setColorAt(index,color.set(f.item.startsWith('kit')?0xe9bd78:f.item==='rock'?0x727b83:0xafc4c2));}this.overlays.add(crates);
    }
    for(const p of state.projects)if(distanceOnMoon(p,view)<1500){
      const g=new THREE.Group(),mast=new THREE.Mesh(new THREE.CylinderGeometry(.2,p.complete?2:.3,p.complete?9:2,8),new THREE.MeshStandardMaterial({color:0xc89865,metalness:.7,roughness:.3}));mast.position.y=p.complete?4.5:1;g.add(mast);
      if(p.complete){const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.13,8,40),new THREE.MeshStandardMaterial({color:0x91e7ce,emissive:0x41b895,emissiveIntensity:1.5}));ring.rotation.x=Math.PI/2;ring.position.y=7;g.add(ring);}
      positionMachine(g,{...p,rotation:0},data,frame);this.overlays.add(g);
    }
  }
  animate(delta,camera,connected){for(const g of this.robots.values()){
    const r=g.userData.robot;g.position.lerp(g.userData.targetPosition,1-Math.exp(-7*delta));g.quaternion.slerp(g.userData.targetQuaternion,1-Math.exp(-6*delta));g.userData.drawPosition.copy(g.position);g.userData.drawQuaternion.copy(g.quaternion);
    const a=g.userData.asset,near=camera.position.distanceTo(g.position)<100;if(a){a.root.visible=near;g.userData.fallback.visible=!near;for(const [name,action] of Object.entries(a.actions)){const active=connected&&r.status!=='paused'&&r.status!=='mind-limited'&&(name==='Idle'||name==='Travel'&&g.userData.moving||name==='Work'&&['building','servicing'].includes(r.status));action.paused=!active;}if(near)a.mixer.update(delta);}
    g.visible=camera.position.distanceTo(g.position)<2500;g.userData.marker.visible=camera.position.distanceTo(g.position)<450;
  }}
}
