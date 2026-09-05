import './machine-gallery.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadMachineAssets,MACHINE_TYPES,FOUNDRY_TYPES} from './machine-assets.js';
import {createMachine,animateMachine,disposeMachine} from './machines.js';
import {BUILDINGS,ROBOTS} from './foundry/catalog.js';
import {appPath} from './urls.js';

const descriptions={
 seed:{name:'Pioneer',category:'01 / SEED LANDER',body:'The first foothold. A thermal-wrapped service module on articulated landing gear, with tracking power wings and a scanning communications dish.',specs:[['Role','Establish a settlement'],['Built-in power','8 MW'],['Motion','Wings + antenna sweep']]},
 solar:{name:'Helios',category:'02 / SOLAR ARRAY',body:'A field of indigo photovoltaic cells held on a titanium tracking yoke. Copper umbilicals carry the first energy into the growing settlement.',specs:[['Output','12 MW'],['Construction','15 metal'],['Motion','Two-axis solar tracking']]},
 miner:{name:'Regolith',category:'03 / HARVESTER',body:'A braced crawler and servo-fed auger work the local deposit. Cutting flights turn beneath the mast while the survey head watches the excavation.',specs:[['Extraction','18–24 rock / min'],['Mind capacity','1'],['Motion','Auger + feed + lidar']]},
 refinery:{name:'Fraction',category:'04 / REFINERY',body:'Sealed reaction vessels, copper induction coils and a rotating process drum turn rough lunar material into the feedstock of a civilization.',specs:[['Throughput','6 metal / min'],['Mind capacity','2'],['Motion','Induction process drum']]},
 replicator:{name:'Genesis',category:'05 / REPLICATOR',body:'The idea becomes a machine. A precision bridge carries a fabrication head over the build bed, laying down a new chassis under local mind supervision.',specs:[['Construction cycle','24 supervised seconds'],['Mind capacity','4'],['Motion','Gantry + tool + build']]},
 compute:{name:'Nous',category:'06 / MIND NODE',body:'Six cooled compute blades surround an optical core. Counter-rotating routing rings give intelligence a visible center of gravity.',specs:[['Mind capacity','4 supplied'],['Research','1 work / second'],['Motion','Core + dual optical rings']]},
};
const galleryTypes=[...MACHINE_TYPES,...FOUNDRY_TYPES];
for(const [role,r] of Object.entries(ROBOTS))descriptions[r.asset]={name:r.name,category:'FOUNDRY / ROBOT CREW',body:r.description,specs:[['Role',role],['Cargo',r.capacity/1000+' units'],['Rated travel',r.speed+' m/s']]};
for(const type of FOUNDRY_TYPES)if(BUILDINGS[type]){const b=BUILDINGS[type];descriptions[type]={name:b.name,category:'FOUNDRY / PHYSICAL INDUSTRY',body:b.description,specs:[['Construction',b.cost+' metal / '+b.parts+' parts'],['Power',b.power+' units'],['Mind capacity',b.mind+' required']]};}
descriptions.replicator.specs[0]=['Kit fabrication','60–240 powered seconds'];
const $=id=>document.getElementById(id);
$('return-game').href=appPath('');$('play-link').href=appPath('');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('studio').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x09121a);scene.fog=new THREE.Fog(0x09121a,35,120);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,200);camera.position.set(13,10,17);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,2,0);controls.minDistance=7;controls.maxDistance=80;controls.maxPolarAngle=Math.PI*.485;controls.autoRotateSpeed=.65;
const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xb3d7e6,0x433624,.5));
const key=new THREE.DirectionalLight(0xffd6a8,2.7);key.position.set(8,14,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:.1,far:60});key.shadow.normalBias=.03;scene.add(key);
const fill=new THREE.DirectionalLight(0x9adbe8,1.5);fill.position.set(-9,7,-8);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:0x09121a,metalness:.05,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.09;floor.receiveShadow=true;scene.add(floor);
const pads=new THREE.Group();scene.add(pads);
let machines=[],chosen='seed',all=false,previous=0,state='working',ready=false;
function pedestal(x,z,r=6){const base=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.1,.15,64),new THREE.MeshStandardMaterial({color:0x18252b,metalness:.4,roughness:.5}));base.position.set(x,-.04,z);base.receiveShadow=true;pads.add(base);const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,96),new THREE.MeshBasicMaterial({color:0x8f816a}));ring.rotation.x=Math.PI/2;ring.position.set(x,.05,z);pads.add(ring);}
function clear(){machines.forEach(g=>disposeMachine(g));machines=[];for(const p of [...pads.children]){p.geometry.dispose();p.material.dispose();pads.remove(p);}$('labels').replaceChildren();}
function show(type,collection=false){
 if(!ready)return;clear();chosen=type;all=collection;document.body.classList.toggle('lineup',all);
 const types=all?galleryTypes:[type];types.forEach((t,i)=>{const g=createMachine(t),x=all?(i%4-1.5)*14:0,z=all?(Math.floor(i/4)-1.5)*14:0;g.position.set(x,.08,z);g.userData.galleryType=t;scene.add(g);machines.push(g);pedestal(x,z,all?5.8:6.3);if(all){const label=document.createElement('div');label.className='model-label';label.textContent=descriptions[t].name.toUpperCase();$('labels').append(label);}});
 const isRobot=Object.values(ROBOTS).some(r=>r.asset===type);const d=descriptions[type];$('model-name').textContent=d.name;$('category').textContent=d.category;$('model-description').textContent=d.body;$('specs').innerHTML=d.specs.map(([a,b])=>`<div class="spec"><span>${a}</span><b>${b}</b></div>`).join('');
 camera.position.set(...(all?[48,52,66]:innerWidth<620?[14,12,21]:['miner','refinery','compute'].includes(type)?[10,8,13]:[13,10,17]));controls.target.set(all?0:innerWidth<1000?0:2.3,all?0:2.0,0);controls.maxDistance=all?100:45;if(!all&&isRobot){const bounds=new THREE.Box3().setFromObject(machines[0].userData.asset?.root||machines[0]),sphere=bounds.getBoundingSphere(new THREE.Sphere()),halfFov=THREE.MathUtils.degToRad(camera.fov/2),usable=Math.min(.7,camera.aspect*.55),distance=sphere.radius/(Math.sin(halfFov)*usable);controls.target.copy(sphere.center);if(innerWidth>=1000)controls.target.x+=sphere.radius*.12;camera.position.copy(controls.target).add(new THREE.Vector3(3.2,2.5,4).normalize().multiplyScalar(distance));controls.minDistance=1.4;controls.maxDistance=Math.max(18,distance*2);}else controls.minDistance=7;controls.update();
 document.querySelectorAll('.model-tab').forEach(b=>b.classList.toggle('active',b.dataset.type===type&&!all));document.querySelector('.model-tab.active')?.scrollIntoView({block:'nearest',inline:'center'});$('lineup').textContent=all?'Inspect selected machine ↗':'View complete collection ↗';
 $('status').textContent=state==='working'?'LIVE MECHANICAL PREVIEW':state==='paused'?'PAUSED / MOTION HELD':'SUPERVISION NEEDED / MOTION HELD';
}
$('model-nav').innerHTML=galleryTypes.map((t,i)=>`<button class="model-tab" data-type="${t}"><span>${String(i+1).padStart(2,'0')} / ${t==='compute'?'MIND NODE':t==='miner'?'HARVESTER':t.toUpperCase()}</span><b>${descriptions[t].name}</b></button>`).join('');
for(const b of document.querySelectorAll('.model-tab'))b.onclick=()=>show(b.dataset.type);
$('lineup').onclick=()=>show(chosen,!all);$('operation').onchange=e=>{state=e.target.value;$('status').textContent=state==='working'?'LIVE MECHANICAL PREVIEW':state==='paused'?'PAUSED / MOTION HELD':'SUPERVISION NEEDED / MOTION HELD';};
$('rotation').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotation').setAttribute('aria-pressed',String(controls.autoRotate));};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
renderer.setAnimationLoop(time=>{const delta=previous?Math.min((time-previous)/1000,.1):0;previous=time;controls.update();for(const g of machines)animateMachine(g,delta,{active:state==='working',camera});
 if(all)[...$('labels').children].forEach((label,i)=>{const p=machines[i].position.clone().add(new THREE.Vector3(0,.2,5.6)).project(camera);label.style.left=(p.x*.5+.5)*innerWidth+'px';label.style.top=(-p.y*.5+.5)*innerHeight+'px';label.hidden=p.z>1;});renderer.render(scene,camera);});
try{const loaded=await loadMachineAssets((n,total)=>$('status').textContent=`PREPARING ${n} / ${total}`);if(loaded.failed.length)console.warn('Using fallback geometry for',loaded.failed);ready=true;show(Object.hasOwn(descriptions,new URLSearchParams(location.search).get('model'))?new URLSearchParams(location.search).get('model'):'seed',new URLSearchParams(location.search).has('all'));
}catch(e){$('status').textContent=e.message;console.error(e);}
if(import.meta.env.DEV)window.__machineGallery={get ready(){return ready;},get objects(){return machines;},get info(){return {type:chosen,lineup:all,state,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries};},show,renderer,scene,camera};
