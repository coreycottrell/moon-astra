import * as THREE from 'three';
import {RADIUS,cubeDirection,coordinates,normalize,dot,clamp,noise} from './geography.js';
const SEGMENTS=16;
export class MoonTerrain {
  constructor(scene,data,frame,texture) {
    this.data=data;this.frame=frame;this.group=new THREE.Group();scene.add(this.group);
    this.cache=new Map();this.active=[];this.pending=[];this.desired=[];this.showBorders=false;
    this.material=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0,color:0xe3e3e3,side:THREE.FrontSide});
    // Fine regolith grain is world anchored; macro albedo comes from the lunar map.
    this.material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lunarPosition;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlunarPosition = position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 lunarPosition;\nfloat grain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat viewDistance=length(vViewPosition);\nfloat closeGrain = 1.0-smoothstep(250.0,2000.0,viewDistance);\ndiffuseColor.rgb=mix(vec3(.12),diffuseColor.rgb,smoothstep(2000.0,220000.0,viewDistance));\ndiffuseColor.rgb *= 1.0 + (grain(floor(lunarPosition*7.0))-.5)*.17*closeGrain;');
    };
    this.borderMaterial=new THREE.LineBasicMaterial({color:0xffb66d,transparent:true,opacity:.32,depthWrite:false});
    for(let face=0;face<6;face++){const n=this.node(face,0,0,0);this.makeTile(n);this.active.push(n.key);this.cache.get(n.key).mesh.visible=true;}
  }
  node(face,level,x,y) {
    const n=2**level,span=2/n,u=-1+x*span,v=-1+y*span;
    return {face,level,x,y,u,v,span,key:`${face}/${level}/${x}/${y}`};
  }
  update(camera,force=false) {
    const world=this.frame.toWorld(camera.position.toArray());
    if(!force&&this.lastWorld&&Math.hypot(...world.map((v,i)=>v-this.lastWorld[i]))<Math.max(3,this.lastAltitude*.025))return;
    this.lastWorld=world;const r=Math.hypot(...world);this.lastAltitude=Math.max(40,r-RADIUS);
    const cameraDir=normalize(world), horizon=Math.acos(clamp((RADIUS-12000)/r,-1,1));
    camera.updateMatrixWorld();
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const leaves=[];
    const visit=n=>{
      const d=cubeDirection(n.face,n.u+n.span/2,n.v+n.span/2);
      const angle=Math.acos(clamp(dot(cameraDir,d),-1,1));
      if(n.level>1&&angle>horizon+n.span*.95+.006)return;
      const point=this.data.point(d,false),dist=Math.hypot(...point.map((v,i)=>v-world[i]));
      const size=RADIUS*n.span;
      if(n.level>1&&!frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(...this.frame.toLocal(point)),size+30)))return;
      // Retain kilometer-scale relief in the foreground of regional views.
      if(n.level<18&&(size/Math.max(20,dist)>.65||(dist<220000&&size>48000))){for(let y=0;y<2;y++)for(let x=0;x<2;x++)visit(this.node(n.face,n.level+1,n.x*2+x,n.y*2+y));}
      else leaves.push(n);
    };
    for(let face=0;face<6;face++)visit(this.node(face,0,0,0));
    this.desired=leaves;
    this.pending=leaves.filter(n=>!this.cache.has(n.key));
    this.pending.sort((a,b)=>b.level-a.level);
    if(!this.pending.length)this.commit();
  }
  process(budget=10) {
    const start=performance.now();
    while(this.pending.length&&performance.now()-start<budget)this.makeTile(this.pending.shift());
    if(!this.pending.length&&this.desired.length)this.commit();
  }
  commit() {
    const desired=new Set(this.desired.map(n=>n.key));
    for(const key of this.active)if(!desired.has(key)){const tile=this.cache.get(key);if(tile){tile.mesh.visible=false;tile.border.visible=false;}}
    this.active=[...desired];
    for(const key of this.active){const tile=this.cache.get(key);tile.mesh.visible=true;tile.border.visible=this.showBorders;tile.used=performance.now();}
    this.desired=[];
    if(this.cache.size>700){
      const unused=[...this.cache].filter(([key])=>!desired.has(key)).sort((a,b)=>a[1].used-b[1].used);
      for(const [key,tile]of unused.slice(0,this.cache.size-600)){this.group.remove(tile.mesh,tile.border);tile.mesh.geometry.dispose();tile.border.geometry.dispose();this.cache.delete(key);}
    }
  }
  makeTile(n) {
    if(this.cache.has(n.key))return;
    const positions=[],uvs=[],normals=[],indices=[],directions=[];
    const centerUV=(coordinates(cubeDirection(n.face,n.u+n.span/2,n.v+n.span/2)).lon+180)/360;
    const addVertex=(i,j,skirt=0)=>{
      const d=cubeDirection(n.face,n.u+n.span*i/SEGMENTS,n.v+n.span*j/SEGMENTS);
      const h=this.data.height(d),p=d.map(v=>v*(RADIUS+h-skirt));
      positions.push(...this.frame.toLocal(p));directions.push(d);
      const c=coordinates(d);let u=(c.lon+180)/360;
      if(u-centerUV>.5)u-=1;if(u-centerUV<-.5)u+=1;
      uvs.push(u,(c.lat+90)/180);
      let normal=d;
      if(n.level>=5){
        const e=normalize(Math.abs(d[1])>.9999?[1,0,0]:[-d[2],0,d[0]]);
        const north=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]];
        const step=Math.max(2,RADIUS*n.span/SEGMENTS*.12);
        const he=this.data.height(normalize(d.map((v,k)=>v+e[k]*step/RADIUS)));
        const hn=this.data.height(normalize(d.map((v,k)=>v+north[k]*step/RADIUS)));
        normal=normalize(d.map((v,k)=>v-e[k]*(he-h)/step-north[k]*(hn-h)/step));
      }
      normals.push(...this.frame.vectorToLocal(normal));
      return positions.length/3-1;
    };
    for(let j=0;j<=SEGMENTS;j++)for(let i=0;i<=SEGMENTS;i++)addVertex(i,j);
    // Winding differs by cube face. Determine it in world space once.
    const a=new THREE.Vector3(...positions.slice(0,3)),b=new THREE.Vector3(...positions.slice(3,6)),c=new THREE.Vector3(...positions.slice((SEGMENTS+1)*3,(SEGMENTS+2)*3));
    const outward=new THREE.Vector3(...normals.slice(0,3));
    const flip=b.sub(a).cross(c.sub(a)).dot(outward)<0;
    const tri=(a,b,c)=>flip?indices.push(a,c,b):indices.push(a,b,c);
    for(let j=0;j<SEGMENTS;j++)for(let i=0;i<SEGMENTS;i++){const a=j*(SEGMENTS+1)+i,b=a+1,c=a+SEGMENTS+1,d=c+1;tri(a,b,c);tri(b,d,c);}
    // Edge skirts cover T-junctions where adjacent quadtree leaves use different LODs.
    const edges=[Array.from({length:17},(_,i)=>[i,0]),Array.from({length:17},(_,j)=>[16,j]),Array.from({length:17},(_,i)=>[16-i,16]),Array.from({length:17},(_,j)=>[0,16-j])];
    const border=[];const skirt=Math.max(2,RADIUS*n.span*.006);
    for(const edge of edges){
      const lower=edge.map(([i,j])=>addVertex(i,j,skirt));
      for(let i=0;i<edge.length-1;i++){
        const [x,y]=edge[i],[xx,yy]=edge[i+1],a=y*17+x,b=yy*17+xx;
        tri(a,lower[i],b);tri(b,lower[i],lower[i+1]);
        const pa=positions.slice(a*3,a*3+3),pb=positions.slice(b*3,b*3+3);
        const na=normals.slice(a*3,a*3+3),nb=normals.slice(b*3,b*3+3);
        const offset=Math.max(.25,RADIUS*n.span*.00008);
        border.push(...pa.map((v,k)=>v+na[k]*offset),...pb.map((v,k)=>v+nb[k]*offset));
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,this.material);mesh.receiveShadow=true;mesh.visible=false;mesh.userData.tile=n;
    const borderGeo=new THREE.BufferGeometry();borderGeo.setAttribute('position',new THREE.Float32BufferAttribute(border,3));
    const line=new THREE.LineSegments(borderGeo,this.borderMaterial);line.visible=false;line.frustumCulled=true;
    this.group.add(mesh,line);this.cache.set(n.key,{mesh,border:line,used:performance.now(),level:n.level});
  }
  setBorders(show) {this.showBorders=show;for(const key of this.active)this.cache.get(key).border.visible=show;}
  get meshes(){return this.active.map(key=>this.cache.get(key).mesh);}
  get stats(){return {tiles:this.active.length,pending:this.pending.length,maxLevel:Math.max(0,...this.active.map(k=>this.cache.get(k).level)),cached:this.cache.size};}
  dispose(){for(const t of this.cache.values()){t.mesh.geometry.dispose();t.border.geometry.dispose();}this.material.dispose();this.borderMaterial.dispose();this.group.removeFromParent();}
}
