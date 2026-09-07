import * as THREE from 'three';
import {RoverVisual,robotFallback} from './rover-visual.js';
import {LiftVisuals} from './lift-visual.js';
import {RoverTracks} from './rover-tracks.js';
import {instantiateMachine} from '../machine-assets.js';
import {positionMachine,disposeMachine} from '../machines.js';
import {ROBOTS,BUILDINGS} from './catalog.js';
import {distanceOnMoon,direction} from '../geography.js';


export class FoundryScene{
  constructor(scene){this.scene=scene;this.robots=new Map();this.sites=new Map();this.overlays=new THREE.Group();scene.add(this.overlays);this.showUtilities=false;this.showRoutes=false;this.tracks=new RoverTracks(scene);this.liftVisuals=new LiftVisuals(scene);}
  clearOverlays(){for(const o of [...this.overlays.children]){o.traverse(x=>{x.geometry?.dispose();x.material?.dispose();});o.removeFromParent();}}
  setTerrain(terrain){this.terrain=terrain;this.tracks.setTerrain(terrain);}
  reset({clearTracks=false}={}){if(clearTracks)this.tracks.clear();this.liftVisuals.reset();for(const g of this.robots.values())disposeMachine(g,true);this.robots.clear();for(const g of this.sites.values())disposeMachine(g,true);this.sites.clear();this.clearOverlays();}
  sync(state,data,frame,view,received=performance.now()){
    this.data=data;this.frame=frame;const nearby=state.robots.filter(r=>distanceOnMoon(r,view)<1500),ids=new Set(nearby.map(r=>r.id));
    for(const [id,g] of this.robots)if(!ids.has(id)){disposeMachine(g,true);this.robots.delete(id);}
    for(const r of nearby){
      let g=this.robots.get(r.id);if(!g){g=new THREE.Group();const asset=instantiateMachine(ROBOTS[r.role].asset);
        if(asset){g.add(asset.root);g.userData.asset=asset;}
        const fallback=robotFallback(r.role);fallback.visible=!asset;g.add(fallback);g.userData.fallback=fallback;
        const marker=new THREE.Mesh(new THREE.RingGeometry(.7,.77,24),new THREE.MeshBasicMaterial({color:r.role==='service'?0x8bdcca:r.role==='hauler'?0xf5bc7b:0xb6d8f2,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.07;g.add(marker);g.userData.marker=marker;
        g.userData.visual=new RoverVisual(g,r.role,this.tracks);this.scene.add(g);this.robots.set(r.id,g);
      }
      g.userData.robot=r;g.userData.machine=r;
      const home=state.claims.find(c=>c.id===r.claimId)?.home;
      g.userData.visual.sync(r,state.tick,received,home);
      const crate=g.userData.asset?.root.getObjectByName('Payload_crate');if(crate)crate.visible=!!r.cargo?.length;
    }
    const jobs=state.jobs.filter(j=>distanceOnMoon(j,view)<1500),jobIds=new Set(jobs.map(j=>j.id));
    for(const [id,g] of this.sites)if(!jobIds.has(id)){disposeMachine(g,true);this.sites.delete(id);}
    for(const j of jobs){let g=this.sites.get(j.id);if(!g){
      g=new THREE.Group();const radius=j.radius??BUILDINGS[j.type].radius;
      const slab=new THREE.Mesh(new THREE.BoxGeometry(radius*1.8,.18,radius*1.8),new THREE.MeshStandardMaterial({color:0x353c42,roughness:.9}));slab.position.y=.12;g.add(slab);
      const scaffold=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(radius*1.6,4,radius*1.6)),new THREE.LineBasicMaterial({color:0xd2a372,transparent:true,opacity:.5}));scaffold.position.y=2;g.add(scaffold);g.userData.scaffold=scaffold;
      for(const x of [-1,1])for(const z of [-1,1]){const light=new THREE.Mesh(new THREE.CylinderGeometry(.075,.1,.8,6),new THREE.MeshBasicMaterial({color:0xf6b477}));light.position.set(x*radius,.4,z*radius);g.add(light);}
      this.scene.add(g);this.sites.set(j.id,g);
    }positionMachine(g,j,data,frame);g.userData.scaffold.scale.y=j.phase==='supply'?.08:Math.max(.15,1-j.remaining/j.duration);}
    this.liftVisuals.sync(state,data,frame,view,received);
    this.clearOverlays();
    const local=p=>new THREE.Vector3(...frame.toLocal(data.point(direction(p.lat,p.lon))));
    const line=(a,b,color,height=.3,opacity=.65)=>{const points=[];for(let i=0;i<=12;i++){const p={lat:a.lat+(b.lat-a.lat)*i/12,lon:a.lon+(b.lon-a.lon)*i/12};points.push(local(p).add(new THREE.Vector3(...frame.vectorToLocal(direction(p.lat,p.lon))).multiplyScalar(height)));}const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:height>=0}));this.overlays.add(o);};
    if(this.showUtilities)for(const industry of Object.values(state.industry))for(const edge of industry.grid.edges){const a=state.machines.find(m=>m.id===edge.from),b=state.machines.find(m=>m.id===edge.to);if(a&&b&&distanceOnMoon(a,view)<1500)line(a,b,edge.underground?0x87ddc9:0xc59158,edge.underground?-3:.4);}
    for(const t of state.corridors){
      const a=state.machines.find(m=>m.id===t.fromId),b=state.machines.find(m=>m.id===t.toId);if(!a||!b)continue;
      const ratio=t.excavated/t.length,end={lat:a.lat+(b.lat-a.lat)*ratio,lon:a.lon+(b.lon-a.lon)*ratio};
      // Keep links visible near either end and along the middle of long routes.
      const center={lat:(a.lat+b.lat)/2,lon:(a.lon+b.lon)/2};if(distanceOnMoon(center,view)>t.length/2+1500)continue;
      if(!t.complete&&this.showUtilities)line(a,b,0x425f64,-3,.3);
      line(a,end,t.transport?0x78debf:0xc59158,this.showUtilities?-3:.5,.9);
      if(t.portals&&!t.liftVersion)for(const loc of Object.values(t.portals).flat()){
        if(distanceOnMoon(loc,view)>1500)continue;
        const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(2.1,.22,8,32),new THREE.MeshStandardMaterial({color:t.complete?0x78debf:0xc59158,metalness:.5,roughness:.5}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;g.add(ring);
        const shaft=new THREE.Mesh(new THREE.CircleGeometry(1.85,24),new THREE.MeshStandardMaterial({color:0x0b1318,roughness:1}));shaft.rotation.x=-Math.PI/2;shaft.position.y=.06;g.add(shaft);positionMachine(g,{...loc,rotation:0},data,frame);this.overlays.add(g);
      }
    }
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
  animate(delta,camera,connected,time=performance.now()){
    this.tracks.update(time/1000);this.liftVisuals.animate(time,camera,this.terrain,connected);
    for(const g of this.robots.values()){
      const a=g.userData.asset,near=camera.position.distanceTo(g.position)<120;
      if(a){a.root.visible=near;g.userData.fallback.visible=!near;}
      g.userData.visual.animate(delta,time,connected,this.terrain,this.frame,this.data);
      const distance=camera.position.distanceTo(g.position);g.visible=distance<2500;g.userData.marker.visible=distance<450;
    }
  }
  get motionStats(){return {lifts:this.liftVisuals.stats,trackStrips:this.tracks.count,trackCapacity:this.tracks.capacity,rovers:[...this.robots].map(([id,g])=>({id,position:g.position.toArray(),up:new THREE.Vector3(0,1,0).applyQuaternion(g.quaternion).toArray(),heading:g.userData.visual.heading,speed:g.userData.visual.speed,travel:g.userData.visual.travel,wheelRoll:{...g.userData.visual.roll},detailed:!!g.userData.asset?.root.visible}))};}
}
