import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const C={ivory:0xe4e1d5,copper:0xe3ac70,dark:0x17262b,steel:0x728990,light:0x88ceca};
function material(color,metalness=.45,roughness=.45){const m=new THREE.MeshStandardMaterial({color,metalness,roughness});if(color===C.copper)m.userData.reportTrim=true;return m;}
function mesh(geometry,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function block(parent,mat,w,h,d,x,y,z,round=.06){return mesh(new RoundedBoxGeometry(w,h,d,2,round),mat,parent,x,y,z);}
function tube(parent,mat,points,r=.045){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,8,false),mat,parent);}
function label(parent,text,x,y,z,w=1.1,h=.28){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#e5e1d2';ctx.fillRect(0,0,512,128);ctx.fillStyle='#18313a';ctx.font='bold 44px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.8}),parent,x,y,z);return m;
}
function makeBuilder(){
 const group=new THREE.Group(),ivory=material(C.ivory,.25,.5),copper=material(C.copper,.7,.38),dark=material(C.dark,.35,.7),steel=material(C.steel,.8,.35),light=material(C.light,.25,.3),wheels=[];
 block(group,dark,2.5,.5,4.6,0,1.05,0);block(group,ivory,2.4,.65,3.9,0,1.48,.05);block(group,copper,2.43,.13,3.95,0,1.87,.05);
 for(const x of [-1.4,1.4])for(const z of [-1.62,0,1.62]){
  const wheel=new THREE.Group();wheel.position.set(x,.61,z);group.add(wheel);wheels.push(wheel);
  const tire=mesh(new THREE.CylinderGeometry(.59,.59,.38,28),dark,wheel);tire.rotation.z=Math.PI/2;
  const hub=mesh(new THREE.CylinderGeometry(.39,.39,.43,16),steel,wheel);hub.rotation.z=Math.PI/2;
  const cap=mesh(new THREE.CylinderGeometry(.19,.19,.46,16),copper,wheel);cap.rotation.z=Math.PI/2;
  for(let k=0;k<16;k++){const a=k*Math.PI/8;const tread=block(wheel,steel,.4,.08,.12,0,Math.cos(a)*.595,Math.sin(a)*.595,.018);tread.rotation.x=a;}
  tube(group,steel,[[x*.6,1.3,z-.2],[x*.82,1.1,z],[x,.65,z]],.07);
 }
 block(group,dark,1.95,.14,1.7,0,1.99,1.05);for(const x of [-1.03,1.03])block(group,steel,.09,.35,1.9,x,2.15,1.05);
 for(const z of [.23,1.87])block(group,steel,2.12,.28,.09,0,2.12,z);
 for(const x of [-.57,.57]){block(group,ivory,.75,.49,.85,x,2.25,1.07);block(group,copper,.78,.06,.9,x,2.52,1.07);}
 block(group,ivory,1.3,.48,.72,0,2.15,-1.4);label(group,'MASON / 01',0,2.18,-1.77,1.12,.26).rotation.y=Math.PI;
 const turntable=new THREE.Group();turntable.position.set(0,2,-.63);group.add(turntable);
 mesh(new THREE.CylinderGeometry(.52,.52,.2,24),steel,turntable,0,.1,0);
 const arm=new THREE.Group();arm.position.y=.22;arm.rotation.x=-.32;turntable.add(arm);
 block(arm,copper,.36,1.48,.4,0,.66,0);for(const x of [-.28,.28]){const j=mesh(new THREE.CylinderGeometry(.25,.25,.14,20),steel,arm,x,.1,0);j.rotation.z=Math.PI/2;}
 const forearm=new THREE.Group();forearm.position.y=1.38;forearm.rotation.x=-1.05;arm.add(forearm);
 block(forearm,ivory,.32,1.38,.35,0,.62,0);tube(forearm,dark,[[.22,-.15,0],[.28,.5,.13],[.22,1.1,0]],.055);
 mesh(new THREE.CylinderGeometry(.21,.21,.32,20),steel,forearm,0,1.39,0);
 for(const x of [-.2,.2])block(forearm,copper,.1,.48,.16,x,1.64,0);
 const mast=new THREE.Group();mast.position.set(-.94,2,-1.1);group.add(mast);mesh(new THREE.CylinderGeometry(.065,.075,1.65,12),steel,mast,0,.74,0);
 const sensor=block(mast,dark,.56,.24,.26,0,1.64,0);block(sensor,light,.38,.08,.025,0,0,.15);
 for(const x of [-.85,.85])block(group,light,.27,.1,.035,x,1.47,-1.98);
 tube(group,copper,[[1.15,1.6,-1],[1.3,1.8,-.1],[1.2,1.7,1.4]],.04);
 return {group,animate(t){wheels.forEach(w=>w.rotation.x=t*.45);turntable.rotation.y=Math.sin(t*.24)*.38;arm.rotation.x=-.32+Math.sin(t*.43)*.1;forearm.rotation.x=-1.05+Math.sin(t*.37)*.12;sensor.rotation.y=Math.sin(t*.55)*.65;}};
}
function makeTunneler(){
 const group=new THREE.Group(),ivory=material(C.ivory,.25,.5),copper=material(C.copper,.75,.32),dark=material(C.dark,.4,.65),steel=material(C.steel,.75,.38),light=material(C.light,.25,.3);
 for(const x of [-1.47,1.47]){
  block(group,dark,.65,.76,5.2,x,.49,.38,.25);
  for(let k=0;k<15;k++)block(group,steel,.68,.1,.22,x,.88,-2+k*.33,.015);
  for(const z of [-1.7,-.75,.2,1.15,2.1]){const hub=mesh(new THREE.CylinderGeometry(.29,.29,.71,16),steel,group,x,.47,z);hub.rotation.z=Math.PI/2;}
 }
 block(group,ivory,2.55,1.15,4.7,0,1.25,.38);block(group,copper,2.6,.12,4.72,0,1.88,.38);
 block(group,dark,1.5,.5,3.75,0,2.18,.67);block(group,steel,.98,.2,4.45,0,2.5,.95);
 const conveyor=[];for(let i=0;i<10;i++)conveyor.push(block(group,copper,.94,.08,.11,0,2.64,-.8+i*.42,.018));
 for(const x of [-1.05,1.05])for(const z of [-.9,.35,1.6])block(group,ivory,.5,.8,.75,x,2.27,z);
 for(const z of [-1.1,.7,2.4]){const ring=mesh(new THREE.TorusGeometry(1.45,.085,8,36,Math.PI),steel,group,0,1.35,z);ring.rotation.z=0;}
 const neck=mesh(new THREE.CylinderGeometry(.63,.82,1.1,24),steel,group,0,1.45,-2.43);neck.rotation.x=Math.PI/2;
 const cutter=new THREE.Group();cutter.position.set(0,1.45,-3.04);group.add(cutter);
 const disc=mesh(new THREE.CylinderGeometry(1.38,1.43,.32,36),dark,cutter);disc.rotation.x=Math.PI/2;
 const face=mesh(new THREE.CylinderGeometry(1.19,1.19,.1,36),steel,cutter,0,0,-.2);face.rotation.x=Math.PI/2;
 const ring=mesh(new THREE.TorusGeometry(1.29,.12,10,48),copper,cutter,0,0,-.23);
 for(let k=0;k<12;k++){const a=k*Math.PI/6;const tooth=block(cutter,copper,.25,.39,.34,Math.cos(a)*1.14,Math.sin(a)*1.14,-.37,.035);tooth.rotation.z=a+.45;}
 for(let k=0;k<6;k++){const a=k*Math.PI/3;const spoke=block(cutter,ivory,.15,.9,.17,Math.cos(a)*.56,Math.sin(a)*.56,-.31,.025);spoke.rotation.z=a-Math.PI/2;}
 const nose=mesh(new THREE.ConeGeometry(.3,.4,16),copper,cutter,0,0,-.53);nose.rotation.x=-Math.PI/2;
 tube(group,copper,[[-1.12,2,2.5],[-1.55,2.4,1.1],[-1.4,2.45,-1],[-.8,1.65,-2.2]],.075);
 label(group,'MOLE / 02',0,1.55,2.75,1.45,.32);for(const x of [-.8,.8])block(group,light,.27,.11,.04,x,1.93,-2.02);
 return {group,animate(t){cutter.rotation.z=t*.35;conveyor.forEach((m,i)=>m.position.z=-1.05+((i*.42+t*.24)%4.2));}};
}

export async function createViewer(container,{onStatus=()=>{}}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Interactive machine model. Arrow keys rotate, plus and minus zoom.');renderer.domElement.tabIndex=0;container.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1519);
 const camera=new THREE.PerspectiveCamera(36,1,.05,160);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;controls.minDistance=7;controls.maxDistance=25;controls.maxPolarAngle=Math.PI*.48;controls.autoRotateSpeed=.8;
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04).texture;scene.environment=env;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc0dbe6,0x443528,.65));
 const key=new THREE.DirectionalLight(0xffd6a8,3.3);key.position.set(7,12,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:40});key.shadow.normalBias=.035;scene.add(key);
 const fill=new THREE.DirectionalLight(0x98d8e5,1.8);fill.position.set(-6,6,-8);scene.add(fill);
 const floor=mesh(new THREE.CylinderGeometry(5.6,5.65,.12,80),material(0x17272d,.35,.62),scene,0,-.07,0);floor.receiveShadow=true;floor.castShadow=false;
 const ring=mesh(new THREE.TorusGeometry(5.57,.016,6,128),new THREE.MeshBasicMaterial({color:0x685a48}),scene,0,0,0);ring.rotation.x=Math.PI/2;
 const pivot=new THREE.Group();scene.add(pivot);
 let current=null,selected=null,motion=false,visible=true,elapsed=0,last=performance.now(),lastFrame=0,dirty=true,selection=0,frameCount=0,trim='#e3ac70',destroyed=false;
 const cache=new Map(),loader=new GLTFLoader();
 const resize=()=>{if(destroyed)return;const w=container.clientWidth,h=container.clientHeight;if(w<=0||h<=0)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;};
 const observer=new ResizeObserver(resize);observer.observe(container);
 function reset(){camera.position.set(10,7.3,['builder','tunneler'].includes(selected)?-12:12);controls.target.set(0,1.9,0);controls.update();dirty=true;}
 function colorEntry(entry){entry.group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.reportTrim)m.color.set(trim);});dirty=true;}
 function prepare(entry){
  const bounds=new THREE.Box3().setFromObject(entry.group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=8/Math.max(size.x,size.y,size.z);
  const outer=new THREE.Group();outer.add(entry.group);entry.group.position.x-=center.x;entry.group.position.z-=center.z;entry.group.position.y-=bounds.min.y;outer.scale.setScalar(scale);
  entry.inner=entry.group;entry.group=outer;const materials=new Map();outer.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const prep=m=>{if(materials.has(m))return materials.get(m);const n=m.clone();if(n.color){const hsl={};n.color.getHSL(hsl);if(n.userData.reportTrim||(/copper|gold|accent/i.test(n.name))||(hsl.h>.045&&hsl.h<.17&&hsl.s>.38))n.userData.reportTrim=true;}materials.set(m,n);return n;};o.material=Array.isArray(o.material)?o.material.map(prep):prep(o.material);});
  return entry;
 }
 async function obtain(id){
  if(!cache.has(id))cache.set(id,(async()=>{
   if(id==='builder')return prepare(makeBuilder());if(id==='tunneler')return prepare(makeTunneler());
   const gltf=await loader.loadAsync(new URL(`models/${id}.glb`,new URL('.',document.baseURI)).href);
   const entry={group:gltf.scene,mixer:new THREE.AnimationMixer(gltf.scene),clips:gltf.animations};
   for(const clip of gltf.animations)entry.mixer.clipAction(clip).play();return prepare(entry);
  })().catch(error=>{cache.delete(id);throw error;}));
  return cache.get(id);
 }
 async function select(id){const seq=++selection;onStatus('LOADING MODEL…');const entry=await obtain(id);if(seq!==selection||destroyed)return false;if(current)pivot.remove(current.group);current=entry;selected=id;pivot.add(entry.group);entry.mixer?.setTime(0);elapsed=0;colorEntry(entry);reset();onStatus(motion?'ROTATING / MECHANICAL STUDY':'MOTION PAUSED');dirty=true;return true;}
 function setMotion(value){motion=Boolean(value);controls.autoRotate=motion;onStatus(motion?'ROTATING / MECHANICAL STUDY':'MOTION PAUSED');dirty=true;}
 function setTrim(value){trim=value;if(current)colorEntry(current);}
 function setVisible(value){visible=value;last=performance.now();if(value)dirty=true;}
 renderer.domElement.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  if(e.key==='ArrowLeft')spherical.theta-=.13;if(e.key==='ArrowRight')spherical.theta+=.13;if(e.key==='ArrowUp')spherical.phi=Math.max(.15,spherical.phi-.1);if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI*.48,spherical.phi+.1);if(e.key==='+'||e.key==='=')spherical.radius=Math.max(7,spherical.radius*.9);if(e.key==='-')spherical.radius=Math.min(25,spherical.radius*1.1);camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));controls.update();dirty=true;
 });
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onStatus('3D CONTEXT LOST / STATIC VIEW AVAILABLE');});renderer.domElement.addEventListener('webglcontextrestored',()=>{dirty=true;onStatus('3D CONTEXT RESTORED');});
 function tick(now){if(destroyed)return;requestAnimationFrame(tick);if(!visible||document.hidden){last=now;return;}if(now-lastFrame<32)return;const delta=Math.min((now-last)/1000,.08);last=now;lastFrame=now;
  if(motion&&current){elapsed+=delta;current.mixer?.update(delta);current.animate?.(elapsed);}const moved=controls.update(delta);if(moved||motion||dirty){renderer.render(scene,camera);frameCount++;dirty=false;}
 }
 resize();reset();requestAnimationFrame(tick);
 return {select,setMotion,setTrim,setVisible,reset,renderer,scene,camera,get state(){return {selected,motion,visible,elapsed,frameCount,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,cacheEntries:cache.size,camera:camera.position.toArray()};},render(){renderer.render(scene,camera);},destroy(){destroyed=true;observer.disconnect();controls.dispose();env.dispose();renderer.dispose();renderer.domElement.remove();}};
}
