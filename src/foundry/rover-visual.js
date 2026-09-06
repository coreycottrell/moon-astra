import * as THREE from 'three';
import {offsetPosition,direction} from '../geography.js';
import {RoverMotion} from './rover-motion.js';

export const roverDimensions=role=>({width:({builder:.82,hauler:1.25,service:.94,heavy:1.65})[role]||.82,length:({builder:1.1,hauler:1.85,service:1.22,heavy:2.1})[role]||1.1});
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const AXIS=new THREE.Vector3(1,0,0);
export function robotFallback(role){
  const g=new THREE.Group(),{width,length}=roverDimensions(role);
  const material=color=>new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.65});
  const body=new THREE.Mesh(new THREE.BoxGeometry(width,.35,length),material(0xe0dcd1));body.position.y=.43;g.add(body);
  const geometry=new THREE.CylinderGeometry(.23,.23,.15,12);geometry.rotateZ(Math.PI/2);
  const wheelMesh=new THREE.InstancedMesh(geometry,material(0x26323a),6);g.add(wheelMesh);g.userData.wheelMesh=wheelMesh;
  const tool=new THREE.Mesh(new THREE.BoxGeometry(role==='hauler'?width*.8:.16,role==='hauler'?.25:.55,length*.5),material(0xc68951));tool.position.set(.1,.8,.1);g.add(tool);
  // A bright forward sensor makes the heading readable beyond the Blender LOD.
  const sensor=new THREE.Mesh(new THREE.BoxGeometry(width*.55,.12,.1),material(0x7acbbf));sensor.position.set(0,.57,length*.5+.02);g.add(sensor);
  return g;
}
export class RoverVisual{
  constructor(group,role,tracks){
    this.group=group;this.motion=new RoverMotion();this.tracks=tracks;
    Object.assign(this,roverDimensions(role));this.halfTrack=this.width/2+.065;
    this.wheels=[];group.userData.asset?.root.traverse(node=>{if(/^Drive_wheel(?:\.\d+)?$/.test(node.name))this.wheels.push({node,rest:node.quaternion.clone(),side:Math.sign(node.position.x)});});
    // The authored Travel clip is time based; drive these same wheel rigs by meters.
    group.userData.asset?.actions.Travel?.stop();
    this.roll={left:0,right:0};this.travel=0;this.up=new THREE.Vector3();this.forward=new THREE.Vector3();this.right=new THREE.Vector3();this.matrix=new THREE.Matrix4();this.rotation=new THREE.Quaternion();this.dummy=new THREE.Object3D();
    this.contacts=Array.from({length:4},()=>new THREE.Vector3());
  }
  sync(robot,tick,time,home){this.robot=robot;this.home=home;this.motion.push(robot,tick,time);}
  animate(delta,time,connected,terrain,frame,data){
    if(!this.home)return;
    const pose=this.motion.sample(time);if(!pose)return;
    const gap=this.lastTime===undefined||time-this.lastTime>500||this.lastGeneration!==pose.generation||!this.wasConnected;
    const elapsed=this.lastTime===undefined?0:(time-this.lastTime)/1000;
    this.lastTime=time;this.lastGeneration=pose.generation;this.wasConnected=connected;
    if(!connected){this.previous=null;this.trackPose=null;this.speed=0;return;}
    const previous=gap?null:this.previous,distance=previous?Math.hypot(pose.x-previous.x,pose.y-previous.y):0;
    this.speed=elapsed>0?distance/elapsed:0;
    const desired=pose.heading??this.heading??0;
    if(this.heading===undefined||gap)this.heading=desired;
    else if(distance>.00001){
      // Steer into the acknowledged path, without bending that path through obstacles.
      const turn=angleDifference(desired,this.heading);this.heading+=Math.sign(turn)*Math.min(Math.abs(turn),delta*3.5);
    }
    const yaw=previous?angleDifference(this.heading,previous.heading):0;
    if(distance>0&&distance<2){
      this.travel+=distance;
      this.roll.left+=(distance-this.halfTrack*yaw)/.23;this.roll.right+=(distance+this.halfTrack*yaw)/.23;
    }
    const sample=(x,y,target)=>{
      const loc=offsetPosition(this.home.lat,this.home.lon,x,y);
      return terrain?terrain.surfacePoint(loc,target):target.fromArray(frame.toLocal(data.point(direction(loc.lat,loc.lon))));
    };
    const sin=Math.sin(this.heading),cos=Math.cos(this.heading),halfLength=this.length*.4;
    const [front,rear,left,right]=this.contacts;
    sample(pose.x+sin*halfLength,pose.y+cos*halfLength,front);sample(pose.x-sin*halfLength,pose.y-cos*halfLength,rear);
    sample(pose.x-cos*this.halfTrack,pose.y+sin*this.halfTrack,left);sample(pose.x+cos*this.halfTrack,pose.y-sin*this.halfTrack,right);
    this.forward.subVectors(front,rear).normalize();this.right.subVectors(right,left).normalize();this.up.crossVectors(this.right,this.forward).normalize();this.right.crossVectors(this.up,this.forward).normalize();
    // Blender rover fronts export along +Z. Build the full slope-aware basis.
    this.matrix.makeBasis(this.right,this.up,this.forward);this.rotation.setFromRotationMatrix(this.matrix);
    this.group.quaternion.copy(this.rotation);this.group.position.copy(front).add(rear).add(left).add(right).multiplyScalar(.25).addScaledVector(this.up,.008);
    const draw={x:pose.x,y:pose.y,heading:this.heading,travel:this.travel};
    if(gap||distance>2||distance===0)this.trackPose=null;
    else if(this.trackPose&&Math.hypot(draw.x-this.trackPose.x,draw.y-this.trackPose.y)>=.16){this.tracks.add(this.home,this.trackPose,draw,this.halfTrack,time/1000);this.trackPose=draw;}
    else if(!this.trackPose)this.trackPose=draw;
    this.previous=draw;
    const asset=this.group.userData.asset;
    if(asset){
      for(const [name,action] of Object.entries(asset.actions)){
        if(name==='Travel')continue;
        action.paused=['paused','mind-limited'].includes(pose.status)||!(name==='Idle'||name==='Work'&&['building','servicing'].includes(pose.status)&&distance<.001);
      }
      if(asset.root.visible)asset.mixer.update(delta);
      for(const {node,rest,side} of this.wheels)node.quaternion.copy(rest).multiply(this.rotation.setFromAxisAngle(AXIS,side<0?this.roll.left:this.roll.right));
    }
    if(this.group.userData.fallback.visible){
      let index=0;const mesh=this.group.userData.fallback.userData.wheelMesh;
      for(const side of [-1,1])for(const z of [-1,0,1]){
        this.dummy.position.set(side*this.halfTrack,.24,z*halfLength);this.dummy.rotation.set(side<0?this.roll.left:this.roll.right,0,0);this.dummy.updateMatrix();mesh.setMatrixAt(index++,this.dummy.matrix);
      }mesh.instanceMatrix.needsUpdate=true;
    }
  }
}
