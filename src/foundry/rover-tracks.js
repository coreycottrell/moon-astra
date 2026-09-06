import * as THREE from 'three';
import {offsetPosition} from '../geography.js';

// One draw call and fixed memory. Tracks are a browser-session visual history;
// the server remains authoritative and stores no cosmetic terrain deformation.
export class RoverTracks{
  constructor(scene,{capacity=4096}={}){
    this.capacity=capacity;this.records=new Array(capacity);this.count=0;this.cursor=0;
    this.geometry=new THREE.BufferGeometry();
    this.positions=new THREE.Float32BufferAttribute(new Float32Array(capacity*18),3).setUsage(THREE.DynamicDrawUsage);
    this.uvs=new THREE.Float32BufferAttribute(new Float32Array(capacity*12),2).setUsage(THREE.DynamicDrawUsage);
    this.births=new THREE.Float32BufferAttribute(new Float32Array(capacity*6),1).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position',this.positions);this.geometry.setAttribute('uv',this.uvs);this.geometry.setAttribute('trackBirth',this.births);this.geometry.setDrawRange(0,0);
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,64,0);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.16,'rgba(255,255,255,.3)');gradient.addColorStop(.84,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,128);
    ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=7;
    for(let y=-16;y<144;y+=32){ctx.beginPath();ctx.moveTo(7,y);ctx.lineTo(32,y+12);ctx.lineTo(57,y);ctx.stroke();}
    this.texture=new THREE.CanvasTexture(canvas);this.texture.wrapT=THREE.RepeatWrapping;
    this.clock={value:0};
    this.material=new THREE.MeshBasicMaterial({color:0x15191c,map:this.texture,transparent:true,opacity:.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.trackNow=this.clock;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float trackBirth;\nvarying float born;').replace('#include <begin_vertex>','#include <begin_vertex>\nborn=trackBirth;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float trackNow;\nvarying float born;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.0-smoothstep(900.0,1200.0,trackNow-born);');
    };
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=1;scene.add(this.mesh);
    this.point=new THREE.Vector3();
  }
  setTerrain(terrain){this.terrain=terrain;this.version=-1;}
  clear(){this.records.fill(undefined);this.count=0;this.cursor=0;this.geometry.setDrawRange(0,0);}
  project(index){
    const record=this.records[index];if(!record||!this.terrain)return;
    for(const [i,corner] of [0,1,2,2,1,3].entries()){
      this.terrain.surfacePoint(record.corners[corner],this.point);this.point.y+=.018;
      this.positions.setXYZ(index*6+i,this.point.x,this.point.y,this.point.z);
    }
  }
  add(home,from,to,halfTrack,time){
    const length=Math.hypot(to.x-from.x,to.y-from.y);if(length<.02||length>2)return;
    for(const side of [-1,1]){
      const corners=[];
      for(const pose of [from,to])for(const edge of [-1,1]){
        const offset=side*halfTrack+edge*.105;
        corners.push(offsetPosition(home.lat,home.lon,pose.x+Math.cos(pose.heading)*offset,pose.y-Math.sin(pose.heading)*offset));
      }
      const index=this.cursor;this.cursor=(index+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);
      this.records[index]={corners};this.project(index);
      const v0=from.travel/.32,v1=to.travel/.32;
      for(const [i,[u,v]] of [[0,v0],[1,v0],[0,v1],[0,v1],[1,v0],[1,v1]].entries()){this.uvs.setXY(index*6+i,u,v);this.births.setX(index*6+i,time);}
    }
    this.geometry.setDrawRange(0,this.count*6);this.positions.needsUpdate=this.uvs.needsUpdate=this.births.needsUpdate=true;
  }
  update(time){
    this.clock.value=time;
    if(this.terrain&&this.version!==this.terrain.revision){
      for(let i=0;i<this.count;i++)this.project(i);this.positions.needsUpdate=true;this.version=this.terrain.revision;
    }
  }
  dispose(){this.geometry.dispose();this.material.dispose();this.texture.dispose();this.mesh.removeFromParent();}
}
