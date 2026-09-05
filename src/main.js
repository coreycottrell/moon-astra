import './style.css';
import './ui.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LunarData,RADIUS,direction,coordinates,frameAt,normalize,distanceOnMoon,offsetPosition} from './geography.js';
import {MoonTerrain} from './terrain.js';
import {createMachine,positionMachine,animateMachine,createRocks,disposeMachine} from './machines.js';
import {Simulation,TYPES,SAVE_KEY,validateWorld} from './simulation.js';

const $=id=>document.getElementById(id);
const format=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const coordText=({lat,lon})=>`${Math.abs(lat).toFixed(3)}° ${lat<0?'S':'N'} · ${Math.abs(lon).toFixed(3)}° ${lon<0?'W':'E'}`;
const sites=[{name:'Mare Imbrium',lat:28.5,lon:-17.5},{name:'Copernicus crater',lat:9.62,lon:-20.08},{name:'Tycho crater',lat:-43.3,lon:-11.2},{name:'Sea of Tranquility',lat:8.5,lon:31.4},{name:'The far side',lat:0,lon:180},{name:'South pole',lat:-89.9,lon:0}];
const icons={
  miner:'<path d="M7 25h19v5H7zM10 25V14h13v11M13 14v-4h7v4M23 15l6-6 6 4-5 6M30 19v10m-3 0h6M10 19h10"/><circle cx="11" cy="28" r="1"/><circle cx="22" cy="28" r="1"/>',
  solar:'<path d="M6 8h24l-3 17H3zM14 8l-3 17m11-17-3 17M5 14h24M4 20h24M15 25v7m-6 0h13"/>',
  refinery:'<path d="M6 30h25V16H6zM9 16V8h7v8m6 0V5h6v11M9 8h7m6-3h6M10 21h5v5h-5m11-5h6v5h-6M4 30h29"/>',
  replicator:'<path d="M4 31h29M7 31V7h23v24M7 11h23M17 11v8m-3 3v-3h6v3M12 26l5-3 5 3v5H12zM4 7h29"/>',
  compute:'<path d="M18 3l13 7v16l-13 7-13-7V10zM18 9l7 4v10l-7 4-7-4V13zM18 9v18M5 10l6 3m14 0 6-3M5 26l6-3m14 0 6 3"/>',
};
const buildOrder=['miner','solar','refinery','replicator','compute'];
$('build-cards').innerHTML=buildOrder.map((type,i)=>`<button class="build-card" data-build="${type}" aria-label="Build ${TYPES[type].name}" aria-pressed="false" title="${TYPES[type].description} Cost: ${TYPES[type].cost} metal."><span class="shortcut">${i+1}</span><svg viewBox="0 0 36 36" aria-hidden="true">${icons[type]}</svg><span class="name">${TYPES[type].name}</span><span class="cost">◇ ${TYPES[type].cost}</span></button>`).join('');
$('waveform').innerHTML=Array.from({length:48},()=>'<i></i>').join('');
$('destinations').innerHTML=sites.map((s,i)=>`<button class="destination" data-site="${i}"><strong>${s.name} ↗</strong><small>${coordText(s)}</small></button>`).join('');

let sim,renderer,scene,camera,controls,data,terrain,frame,texture,rocks,ghost,ghostRing,markers;
let mode='surface',selected=null,rotation=0,hover=null,inspected=null,tween=null,sound=false,audioContext;
let saveAllowed=true,saveWarning='',savingFailed=false,lastSave=0,lastUI=0,lastLod=0,now=0,skipNextTick=true;
let modelMap=new Map(),pointerDown=null,toastTimeout;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const screenVector=new THREE.Vector3();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function beep(frequency=420){if(!sound)return;try{audioContext??=new AudioContext();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.2);}catch{sound=false;}}
function save(){if(!sim||!saveAllowed)return;try{localStorage.setItem(SAVE_KEY,sim.serialize());$('save-status').textContent='EXPEDITION SAVED';savingFailed=false;}catch{if(!savingFailed)toast('Browser storage is unavailable. Export your expedition from the field guide.');savingFailed=true;$('save-status').textContent='SAVE UNAVAILABLE · EXPORT IN ?';}}
function readWorld(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw)return validateWorld(JSON.parse(raw));}catch{saveAllowed=false;saveWarning='The existing save could not be opened. This temporary expedition will not overwrite it; use Export to keep your new progress.';}return undefined;}
function localAt(loc){return new THREE.Vector3(...frame.toLocal(data.point(direction(loc.lat,loc.lon))));}
function nearbyMachine(m){return distanceOnMoon(m,sim.world.view)<4000;}
function addMachine(m){
  if(!nearbyMachine(m))return;
  const g=createMachine(m.type);positionMachine(g,m,data,frame);scene.add(g);modelMap.set(m.id,g);
}
function removeModels(){for(const g of modelMap.values())disposeMachine(g);modelMap.clear();}
function rebuildMarkers(){
  if(markers){markers.geometry.dispose();markers.material.dispose();markers.removeFromParent();}
  const positions=sim.world.machines.flatMap(m=>frame.toLocal(direction(m.lat,m.lon).map(v=>v*(RADIUS+data.elevation(m.lat,m.lon)+1500))));
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  markers=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffc185,size:6,sizeAttenuation:false,depthTest:true}));markers.visible=mode!=='surface';scene.add(markers);
}
function setLocation(loc,name,requestedMode='surface'){
  cancelBuild();inspected=null;$('inspect').hidden=true;
  sim.world.view={lat:loc.lat,lon:loc.lon};
  frame=frameAt(loc.lat,loc.lon,data.height(direction(loc.lat,loc.lon)));
  terrain?.dispose();terrain=new MoonTerrain(scene,data,frame,texture);
  terrain.setBorders($('borders').getAttribute('aria-pressed')==='true');
  removeModels();sim.world.machines.forEach(addMachine);
  if(rocks){rocks.geometry.dispose();rocks.material.dispose();rocks.removeFromParent();}rocks=createRocks(data,frame);scene.add(rocks);
  setMode(requestedMode,false);rebuildMarkers();
  $('place-kicker').textContent=(name||locationName(loc)).toUpperCase();$('coordinates').textContent=coordText(loc);
  const x=(loc.lon+180)/360*100,y=(90-loc.lat)/180*100;
  for(const id of ['map-cross','atlas-cross']){$(id).style.left=x+'%';$(id).style.top=y+'%';}
  terrain.update(camera,true);save();
}
function locationName(loc){const site=sites.find(s=>distanceOnMoon(s,loc)<25000);return site?.name||'Lunar frontier';}
function setMode(next,animate=true){
  cancelBuild();mode=next;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));
  let target=new THREE.Vector3(0,0,0),position;
  controls.minDistance=18;controls.maxDistance=RADIUS*8;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;
  if(mode==='surface')position=new THREE.Vector3(85,65,100);
  if(mode==='region')position=new THREE.Vector3(60000,120000,90000);
  if(mode==='orbit'){
    target=new THREE.Vector3(...frame.toLocal([0,0,0]));position=target.clone().add(new THREE.Vector3(RADIUS*.35,RADIUS*3.5,RADIUS*.6));
    controls.minDistance=RADIUS*1.06;controls.maxPolarAngle=Math.PI-.01;controls.enablePan=false;
  }
  if(animate)tween={start:performance.now(),fromPosition:camera.position.clone(),toPosition:position,fromTarget:controls.target.clone(),toTarget:target};
  else{tween=null;camera.position.copy(position);controls.target.copy(target);controls.update();}
  if(rocks)rocks.visible=mode==='surface';if(markers)markers.visible=mode!=='surface';
  $('construction-hint').textContent=mode==='surface'?'Choose a machine. Give it a place.':'Click the Moon to descend and build.';
  $('construction').classList.toggle('distant',mode!=='surface');
  if(terrain)terrain.update(camera,true);
}
function pick(event){
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(terrain.meshes,false).find(h=>h.distance>0);
  if(!hit)return null;
  const world=frame.toWorld(hit.point.toArray()),loc=coordinates(world),exact=localAt(loc);
  return {loc,point:exact,tile:hit.object.userData.tile};
}
function cancelBuild(){selected=null;hover=null;if(ghost){disposeMachine(ghost,true);ghost=null;}if(ghostRing)ghostRing.visible=false;$('placement-hint').hidden=true;$('cancel-build').hidden=true;renderer?.domElement.classList.remove('placing');document.querySelectorAll('[data-build]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});}
function selectBuild(type){
  if(mode!=='surface')setMode('surface');
  if(selected===type){cancelBuild();return;}
  cancelBuild();selected=type;rotation=0;
  ghost=createMachine(type);ghost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.35;o.material.depthWrite=false;o.castShadow=false;}});ghost.visible=false;scene.add(ghost);
  document.querySelectorAll('[data-build]').forEach(b=>{b.classList.toggle('selected',b.dataset.build===type);b.setAttribute('aria-pressed',String(b.dataset.build===type));});
  $('placement-hint').hidden=false;$('cancel-build').hidden=false;$('placement-text').textContent=`Place ${TYPES[type].name.toLowerCase()} · ${TYPES[type].cost} metal`;
  renderer.domElement.classList.add('placing');beep(300);
}
function updateGhost(){
  if(!selected||!hover)return;
  const reason=sim.canBuild(selected,hover.loc);
  positionMachine(ghost,{...hover.loc,rotation},data,frame);ghost.visible=true;
  ghostRing.position.copy(hover.point);ghostRing.position.y+=.35;ghostRing.visible=true;ghostRing.material.color.set(reason?0xef806a:0xefbd86);
  $('placement-text').textContent=reason||`Click to place ${TYPES[selected].name.toLowerCase()} · ${TYPES[selected].cost} metal`;
}
function inspectMachine(m){inspected=m;$('inspect').hidden=false;$('inspect-type').textContent=`GENERATION ${String(m.generation).padStart(2,'0')} · MACHINE ${String(m.id).padStart(3,'0')}`;$('inspect-title').textContent=TYPES[m.type].name;$('inspect-body').textContent=TYPES[m.type].description;}
function bind(){
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>selectBuild(b.dataset.build));
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setMode(b.dataset.view));
  $('cancel-build').onclick=cancelBuild;$('home').onclick=()=>setLocation(sim.world.machines[0],'Seed base');
  $('close-inspect').onclick=()=>{inspected=null;$('inspect').hidden=true;};
  const reflectPause=()=>{document.body.classList.toggle('paused',sim.paused);$('pause').textContent=sim.paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',sim.paused?'Resume simulation':'Pause simulation');};
  reflectPause();
  $('pause').onclick=()=>{sim.paused=!sim.paused;reflectPause();save();toast(sim.paused?'Expedition paused':'Expedition resumed');};
  $('sound').onclick=()=>{sound=!sound;$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Disable sound':'Enable sound');beep();};
  $('help').onclick=()=>{cancelBuild();$('help-dialog').showModal();};
  const openAtlas=()=>{cancelBuild();$('atlas-dialog').showModal();};
  $('atlas').onclick=openAtlas;$('mini-atlas').onclick=openAtlas;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>{const s=sites[Number(b.dataset.site)];$('atlas-dialog').close();setLocation(s,s.name);toast(`Arrived at ${s.name}`);});
  $('atlas-map').onclick=e=>{const r=$('atlas-map').getBoundingClientRect(),loc={lat:90-(e.clientY-r.top)/r.height*180,lon:(e.clientX-r.left)/r.width*360-180};$('atlas-dialog').close();setLocation(loc);toast('New terrain. The same Moon.');};
  $('atlas-map').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('destinations').querySelector('button').focus();}};
  $('borders').onclick=()=>{const next=$('borders').getAttribute('aria-pressed')!=='true';$('borders').setAttribute('aria-pressed',String(next));$('borders').querySelector('span').textContent=next?'ON':'OFF';terrain.setBorders(next);};
  $('export').onclick=()=>{const blob=new Blob([sim.serialize()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`moon-expedition-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Expedition exported');};
  window.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]'))return;
    if(e.key==='Escape')cancelBuild();
    if('12345'.includes(e.key)&&e.key.length===1)selectBuild(buildOrder[Number(e.key)-1]);
    if(e.key.toLowerCase()==='r'&&selected){rotation+=Math.PI/2;updateGhost();}
    if(e.code==='Space'){e.preventDefault();$('pause').click();}
    if(e.key.toLowerCase()==='h')$('home').click();
    if(e.key.toLowerCase()==='g')$('borders').click();
    if(e.key.toLowerCase()==='o')setMode(mode==='orbit'?'surface':'orbit');
  });
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointerDown={x:e.clientX,y:e.clientY};tween=null;});
  let lastPick=0;
  canvas.addEventListener('pointermove',e=>{if(!selected||performance.now()-lastPick<55)return;lastPick=performance.now();hover=pick(e);if(hover)updateGhost();else{ghost.visible=false;ghostRing.visible=false;}});
  canvas.addEventListener('pointerleave',()=>{if(ghost)ghost.visible=false;ghostRing.visible=false;});
  canvas.addEventListener('pointerup',e=>{
    if(e.button!==0||!pointerDown)return;const movement=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(movement>6)return;
    const hit=pick(e);if(!hit)return;
    if(mode!=='surface'){setLocation(hit.loc);toast('Surface reached. Begin building here.');return;}
    if(selected){const result=sim.build(selected,hit.loc,{rotation});if(result.ok){beep(640);toast(`${TYPES[selected].name} deployed`);save();updateGhost();}else{toast(result.reason);beep(140);}return;}
    raycaster.setFromCamera(pointer,camera);const machineHit=raycaster.intersectObjects([...modelMap.values()],true)[0];
    if(machineHit){let o=machineHit.object;while(o&&!o.userData.machine)o=o.parent;if(o?.userData.machine)inspectMachine(o.userData.machine);}
    else{$('inspect').hidden=true;inspected=null;}
  });
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{skipNextTick=true;if(document.hidden)save();});window.addEventListener('pagehide',save);
}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
function updateUI(){
  const w=sim.world,p=sim.power,count=type=>w.machines.filter(m=>m.type===type).length;
  $('metal').textContent=format.format(Math.floor(w.metal));$('rock').textContent=format.format(Math.floor(w.rock));$('power').textContent=`${Math.max(0,p.supply-p.demand)} / ${p.supply}`;document.querySelector('.power').style.color=p.factor<1?'#f39b7f':'';
  $('power').title=`${p.demand} MW required, ${p.supply} MW available${p.factor<1?'. Production slowed; add solar arrays.':''}`;
  $('nodes').textContent=count('compute');$('machines').textContent=w.machines.length;
  const goals=[['miner','Harvest the surface','Place a harvester to begin collecting lunar rock.'],['refinery','Give rock a purpose','Build a refinery. Rock becomes metal; metal becomes possibility.'],['solar','Catch the sunlight','Add a solar array to power your growing industry.'],['replicator','Build the machine that builds','Place a replicator. Keep 30 metal available for its first construction.'],['compute','Let the Moon think','Build a mind node. Your industry is becoming something more.']];
  const first=goals.findIndex(([type])=>!count(type)),complete=goals.filter(([type])=>count(type)>0).length;
  $('objective-title').textContent=first<0?'A world building itself':goals[first][1];$('objective-body').textContent=first<0?`${w.replications} machines assembled automatically. Grow the network or explore a new horizon.`:goals[first][2];
  $('step-number').textContent=`${String(Math.min(5,complete+1)).padStart(2,'0')} / 05`;$('objective-progress').style.width=complete/5*100+'%';
  const minds=count('compute');$('mind-state').textContent=minds?(w.thought>200?'AWAKENING':'FIRST SIGNAL'):'DORMANT';
  $('mind-message').textContent=!minds?'A silent world. For now.':w.thought>200?'I can see the shape of what we are becoming.':'There is something here. Keep building.';
  [...$('waveform').children].forEach((bar,i)=>bar.style.height=(minds?3+Math.abs(Math.sin(i*.5+now*.001)*Math.cos(i*.19-now*.0007))*24:2)+'px');
  for(const b of document.querySelectorAll('[data-build]')){b.classList.toggle('unaffordable',w.metal<TYPES[b.dataset.build].cost);b.querySelector('.cost').style.color=w.metal<TYPES[b.dataset.build].cost?'#aa8373':'';}
  if(inspected){const definition=TYPES[inspected.type];$('inspect-progress').textContent=inspected.type==='replicator'?`${Math.floor(inspected.progress/24*100)}% assembled · ${w.metal<30?'waiting for 30 metal':'30 metal per machine'}`:`${definition.power>0?'+':''}${definition.power} MW · ${p.factor<1&&definition.power<0?'reduced power':'connected'}`;}
  const dist=camera.position.distanceTo(controls.target);$('scale').textContent=dist>10000?`${format.format(dist/1000)} km`:`${format.format(dist)} m`;
  if(mode==='surface'&&modelMap.has(1)){
    const g=modelMap.get(1);screenVector.copy(g.position).add(new THREE.Vector3(0,9,0)).project(camera);
    const visible=screenVector.z>-1&&screenVector.z<1&&Math.abs(screenVector.x)<.95&&Math.abs(screenVector.y)<.95;
    $('marker-label').hidden=!visible;$('marker-label').style.left=(screenVector.x*.5+.5)*innerWidth+16+'px';$('marker-label').style.top=(-screenVector.y*.5+.5)*innerHeight-24+'px';
  }else $('marker-label').hidden=true;
}
function animate(time){
  let dt=skipNextTick?0:Math.min(Math.max(0,(time-now)/1000),.5);now=time;skipNextTick=false;
  if(!document.hidden&&!document.querySelector('dialog[open]'))while(dt>0){const step=Math.min(dt,.1);sim.tick(step);dt-=step;}
  if(tween){const t=Math.min(1,(time-tween.start)/1100),e=t*t*(3-2*t);camera.position.lerpVectors(tween.fromPosition,tween.toPosition,e);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,e);if(t===1)tween=null;}
  controls.update();
  // Keep a surface camera above the actual measured terrain, including steep crater walls.
  if(mode==='surface'&&!tween){const w=frame.toWorld(camera.position.toArray()),d=normalize(w),floor=RADIUS+data.height(d)+4;if(Math.hypot(...w)<floor)camera.position.fromArray(frame.toLocal(d.map(v=>v*floor)));}
  if(time-lastLod>200){terrain.update(camera);lastLod=time;}
  terrain.process(8);
  for(const g of modelMap.values())animateMachine(g,sim.world.elapsed,sim.power.factor);
  if(time-lastUI>180){updateUI();lastUI=time;}
  if(time-lastSave>4000){save();lastSave=time;}
  renderer.render(scene,camera);
}
async function init(){
  try{
    sim=new Simulation(readWorld());
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('scene').appendChild(renderer.domElement);
    scene=new THREE.Scene();scene.background=new THREE.Color(0x06090d);
    camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.3,80_000_000);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.screenSpacePanning=false;controls.zoomSpeed=1.3;controls.rotateSpeed=.55;
    scene.add(new THREE.AmbientLight(0xc8d6e0,.65));
    const sun=new THREE.DirectionalLight(0xfffaf3,4.2);sun.position.set(-1800,1600,1100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:6000});sun.shadow.normalBias=.08;sun.shadow.bias=-.00008;scene.add(sun,sun.target);
    const starPositions=[];for(let i=0;i<1800;i++){const y=1-2*(i+.5)/1800,a=i*2.39996,r=Math.sqrt(1-y*y);starPositions.push(Math.cos(a)*r*45_000_000,y*45_000_000,Math.sin(a)*r*45_000_000);}
    const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb8c6d1,size:1.05,sizeAttenuation:false,transparent:true,opacity:.45,depthWrite:false})));
    [data,texture]=await Promise.all([LunarData.load(s=>$('loading-detail').textContent=s),new THREE.TextureLoader().loadAsync('/data/moon-color.webp')]);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    ghostRing=new THREE.Mesh(new THREE.RingGeometry(6.6,6.72,64),new THREE.MeshBasicMaterial({color:0xf2bd80,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));ghostRing.rotation.x=-Math.PI/2;ghostRing.visible=false;scene.add(ghostRing);
    sim.onBuild=m=>{addMachine(m);rebuildMarkers();};sim.message=message=>{toast(message);beep(760);};
    setLocation(sim.world.view,locationName(sim.world.view));resize();bind();
    $('loading-detail').textContent='Stitching the first regions';
    while(terrain.pending.length){terrain.process(12);await new Promise(resolve=>setTimeout(resolve,0));}
    updateUI();renderer.setAnimationLoop(animate);$('loading').classList.add('fade');setTimeout(()=>$('loading').hidden=true,750);
    if(saveWarning){toast(saveWarning);$('save-status').textContent='TEMPORARY EXPEDITION · EXPORT IN ?';}
    // Read-only diagnostics for verification, never a second path for game mutations.
    if(import.meta.env.DEV)window.__moon={get state(){return JSON.parse(sim.serialize());},get stats(){return {...terrain.stats,mode,frameLocation:{...sim.world.view},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,power:sim.power};},screenLocation(east,north){const p=offsetPosition(sim.world.view.lat,sim.world.view.lon,east,north);const v=localAt(p).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,location:p};}};
  }catch(error){console.error(error);$('loading-detail').textContent=`Could not open this expedition: ${error.message}`;$('retry').hidden=false;$('retry').onclick=()=>location.reload();}
}
init();
