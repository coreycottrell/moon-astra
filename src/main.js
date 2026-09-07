import './style.css';
import './ui.css';
import './colony.css';
import './foundry/style.css';
import {tunnelStatus,tierFor,DEPOT_LIMITS} from './foundry/lift-network.js';
import {FoundryScene} from './foundry/scene.js';
import {renderFoundryPanel,openFoundryGuide} from './foundry/panel.js';
import {machineStatus as describeMachineStatus} from './foundry/machine-status.js';
import {ROBOTS,DESIGNS} from './foundry/catalog.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {LunarData,RADIUS,direction,coordinates,frameAt,normalize,distanceOnMoon,offsetPosition} from './geography.js';
import {MoonTerrain} from './terrain.js';
import {createMachine,positionMachine,animateMachine,createRocks,disposeMachine} from './machines.js';
import {TYPES} from './simulation.js';
import {connectWorld,FACTORY} from './network.js';
import {cellBoundary} from './claims.js';
import {BLUEPRINT,UNIT,PROJECT_COST,PLANNER_WORK,industryFor} from './shared-world.js';
import {MIND,PRODUCTION} from './industry.js';
import {appPath,BASE_URL} from './urls.js';
import {factoryLayouts,nextObjective} from './guidance.js';
import {loadMachineAssets,loadedMachineTypes} from './machine-assets.js';

const $=id=>document.getElementById(id);
const format=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const resourceFormat=new Intl.NumberFormat('en-US',{maximumFractionDigits:1,minimumFractionDigits:1});
const claimIndustry=cid=>sim.state.industry?.[cid]||industryFor(sim.state,cid);
function machineStatus(m){return describeMachineStatus(m,claimIndustry(m.claimId));}
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
let foundryScene,inspectedRobotId=null,inspectedLiftId=null,selectedProfile='balanced';
let mode='surface',selected=null,rotation=0,hover=null,inspected=null,tween=null,sound=false,audioContext,focusedLayout=null;
let lastSave=0,lastUI=0,lastLod=0,now=0,lastFrame=0;
let modelMap=new Map(),pointerDown=null,toastTimeout,claimLines,jobMarkers,placing=false;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const screenVector=new THREE.Vector3();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function beep(frequency=420){if(!sound)return;try{audioContext??=new AudioContext();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.2);}catch{sound=false;}}
function save(){if(!sim)return;sim.saveView();$('save-status').textContent=sim.connected?'SHARED WORLD · '+sim.actor.name.toUpperCase():'RECONNECTING · WORLD RETAINED';}
function localAt(loc){return new THREE.Vector3(...frame.toLocal(data.point(direction(loc.lat,loc.lon))));}
function clearLayoutFocus(){focusedLayout=null;$('layout-labels').replaceChildren();}
function focusLayout(id){
  const layout=factoryLayouts(sim.state,sim.activeClaim.id).find(l=>l.id===id);if(!layout)return;$('inspect-model').href=appPath('machines.html?all=1');
  $('colony-dialog').close();setLocation(layout.center,`Production layout ${id}`);focusedLayout=layout;
  $('layout-labels').innerHTML=layout.parts.map(p=>`<div class="layout-label" data-layout-part="${p.id}">${escapeHTML(TYPES[p.type].name)}</div>`).join('');
  $('inspect').hidden=false;$('inspect-type').textContent=`PRODUCTION LAYOUT ${id}`;$('inspect-title').textContent='Three machines. One layout.';$('inspect-body').textContent='This is your balanced factory: solar power, a harvester, and a refinery. Add a replicator separately to automate construction.';
}
function clearOverlay(group){if(!group)return;group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});group.removeFromParent();}
function rebuildClaims(){
  clearOverlay(claimLines);claimLines=new THREE.Group();scene.add(claimLines);
  for(const c of sim.state.claims){
    const points=cellBoundary(c.id,64).map(p=>localAt(p).add(new THREE.Vector3(...frame.vectorToLocal(direction(p.lat,p.lon))).multiplyScalar(4)));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:c.ownerId===sim.actor.id?0xa1dfba:0x8ea8c8,transparent:true,opacity:.8,depthWrite:false}));claimLines.add(line);
  }
}
function rebuildJobs(){
  clearOverlay(jobMarkers);jobMarkers=new THREE.Group();scene.add(jobMarkers);
  for(const j of sim.state.jobs){
    if(!nearbyMachine(j))continue;
    const ring=new THREE.Mesh(new THREE.RingGeometry(6.5,7.1,48,1,0,Math.PI*2*(1-j.remaining/j.duration+.03)),new THREE.MeshBasicMaterial({color:0xffc58a,side:THREE.DoubleSide}));
    const g=new THREE.Group();ring.rotation.x=-Math.PI/2;ring.position.y=.8;g.add(ring);positionMachine(g,j,data,frame);jobMarkers.add(g);
  }
  for(const s of sim.state.shipments){
    const a=sim.state.claims.find(c=>c.id===s.from).home,b=s.project?sim.state.claims[0].home:sim.state.claims.find(c=>c.id===s.to).home;
    const t=Math.max(0,Math.min(1,(sim.state.tick-s.departedAt)/(s.arrivesAt-s.departedAt))),da=direction(a.lat,a.lon),db=direction(b.lat,b.lon);
    const loc=coordinates(da.map((v,i)=>v*(1-t)+db[i]*t));
    const marker=new THREE.Mesh(new THREE.OctahedronGeometry(mode==='surface'?2:35),new THREE.MeshBasicMaterial({color:0xffce8e}));marker.position.copy(localAt(loc));marker.position.add(new THREE.Vector3(...frame.vectorToLocal(direction(loc.lat,loc.lon))).multiplyScalar(15));jobMarkers.add(marker);
  }
}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let colonyBusy=false;
async function colonyCommand(command){
  if(colonyBusy)return;colonyBusy=true;$('colony-notice').textContent='Sending instructions…';
  try{await sim.command(command);$('colony-notice').textContent='Instructions accepted by the world.';beep(520);return true;}catch(e){$('colony-notice').textContent=e.message;return false;}
  finally{colonyBusy=false;renderColony(true);}
}
function renderColony(force=false){
  // Guide answers are snapshots, not a live ledger. Keep the reading surface
  // intact through world ticks; explicit chat actions/status changes refresh it.
  if(!force&&$('colony-content').querySelector('[data-current-tab="guide"]'))return;
  if(!force&&(colonyBusy||document.activeElement?.matches('#colony-content input,#colony-content select,#colony-content textarea')))return;
  renderFoundryPanel($('colony-content'),{sim,command:colonyCommand,selectBuild,visit:setLocation,focus:focusFoundry,refresh:()=>renderColony(true),notice:s=>$('colony-notice').textContent=s,utilities:toggleUtilities});
}
function toggleUtilities(){foundryScene.showUtilities=!foundryScene.showUtilities;$('utilities-toggle').setAttribute('aria-pressed',String(foundryScene.showUtilities));foundryScene.sync(sim.state,data,frame,sim.world.view);toast(foundryScene.showUtilities?'Power and data routes visible. Buried corridors appear through the surface.':'Utility overlay hidden.');}
function inspectRobot(r){inspectedLiftId=null;inspected=null;inspectedRobotId=r.id;$('inspect').hidden=false;$('inspect-type').textContent=`ROBOT CREW / ${r.id}`;$('inspect-title').textContent=r.name;$('inspect-body').textContent=ROBOTS[r.role].description;$('inspect-model').href=appPath('machines.html?model='+ROBOTS[r.role].asset);}
function focusFoundry(target,isRobot=false){
  $('colony-dialog').close();setLocation(target,isRobot?target.name:target.type?TYPES[target.type].name:target.name);
  camera.position.set(...(isRobot?[7,5,10]:[28,22,34]));controls.target.set(0,isRobot?.5:1,0);controls.minDistance=isRobot?2:8;controls.update();
  if(isRobot)inspectRobot(target);else if(target.type&&sim.world.machines.some(m=>m.id===target.id))inspectMachine(target);
}
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
  cancelBuild();clearLayoutFocus();inspected=null;inspectedRobotId=null;inspectedLiftId=null;$('inspect').hidden=true;foundryScene?.reset();
  sim.world.view={lat:loc.lat,lon:loc.lon};
  sim.setView(loc);
  frame=frameAt(loc.lat,loc.lon,data.height(direction(loc.lat,loc.lon)));
  terrain?.dispose();terrain=new MoonTerrain(scene,data,frame,texture);foundryScene?.setTerrain(terrain);
  terrain.setBorders($('borders').getAttribute('aria-pressed')==='true');
  removeModels();sim.world.machines.forEach(addMachine);
  if(rocks){rocks.geometry.dispose();rocks.material.dispose();rocks.removeFromParent();}rocks=createRocks(data,frame);scene.add(rocks);
  setMode(requestedMode,false);rebuildMarkers();rebuildClaims();rebuildJobs();foundryScene?.sync(sim.state,data,frame,sim.world.view);
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
  if(mode==='district')position=new THREE.Vector3(1200,1800,1400);
  if(mode==='region')position=new THREE.Vector3(60000,120000,90000);
  if(mode==='orbit'){
    target=new THREE.Vector3(...frame.toLocal([0,0,0]));position=target.clone().add(new THREE.Vector3(RADIUS*.35,RADIUS*3.5,RADIUS*.6));
    controls.minDistance=RADIUS*1.06;controls.maxPolarAngle=Math.PI-.01;controls.enablePan=false;
  }
  if(animate)tween={start:performance.now(),fromPosition:camera.position.clone(),toPosition:position,fromTarget:controls.target.clone(),toTarget:target};
  else{tween=null;camera.position.copy(position);controls.target.copy(target);controls.update();}
  if(rocks)rocks.visible=mode==='surface';if(markers)markers.visible=mode!=='surface';
  $('construction-hint').textContent=mode==='surface'?'Choose a site. Your crew will build it.':'Click the Moon to descend and build.';
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
function selectBuild(type,profile='balanced'){
  if(mode!=='surface')setMode('surface');
  if(selected===type){cancelBuild();return;}
  cancelBuild();selected=type;selectedProfile=profile;rotation=0;
  if(type==='factory'){ghost=new THREE.Group();for(const p of BLUEPRINT){const g=createMachine(p.type);g.position.set(p.east,0,-p.north);ghost.add(g);}}
  else{ghost=createMachine(type);if(type==='depot')ghost.add(createMachine('depot-apron'));}
  ghostRing.scale.setScalar(type==='depot'?DEPOT_LIMITS.apronRadius/6.6:1);
  ghost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.35;o.material.depthWrite=false;o.castShadow=false;}});ghost.visible=false;scene.add(ghost);
  document.querySelectorAll('[data-build]').forEach(b=>{b.classList.toggle('selected',b.dataset.build===type);b.setAttribute('aria-pressed',String(b.dataset.build===type));});
  const definition=type==='factory'?FACTORY:TYPES[type];
  $('placement-hint').hidden=false;$('cancel-build').hidden=false;$('placement-text').textContent=`Place ${definition.name.toLowerCase()} · ${definition.cost} metal`;
  renderer.domElement.classList.add('placing');beep(300);
}
function updateGhost(){
  if(!selected||!hover)return;
  const reason=sim.canBuild(selected,hover.loc,selectedProfile);
  positionMachine(ghost,{...hover.loc,rotation},data,frame);ghost.visible=true;
  ghostRing.position.copy(hover.point);ghostRing.position.y+=.35;ghostRing.visible=true;ghostRing.material.color.set(reason?0xef806a:0xefbd86);
  const definition=selected==='factory'?FACTORY:TYPES[selected];
  $('placement-text').textContent=reason||`Click to place ${definition.name.toLowerCase()} · ${definition.cost} metal`;
}
function inspectLift(id){inspected=null;inspectedRobotId=null;inspectedLiftId=id;clearLayoutFocus();$('inspect').hidden=false;$('inspect-type').textContent='UNDERGROUND FREIGHT / '+id;$('inspect-title').textContent='Robot elevator';$('inspect-model').href=appPath('machines.html?model=lift');updateLiftInspector();}
function updateLiftInspector(){const t=sim.state.corridors.find(t=>t.id===inspectedLiftId);if(!t)return;const s=tunnelStatus(sim.state,t);$('inspect-body').textContent=`Connection #${t.fromId} ↔ #${t.toId} · ${tierFor(t).name}. One lift at each end. A robot rides down, travels underground with its cargo, then rides up and drives clear.`;$('inspect-progress').textContent=`${s.label} · ${s.occupied} / ${s.capacity} robots · ${s.waiting||0} waiting${s.robotId?' · Robot #'+s.robotId:''}${s.eta!==null&&s.eta!==undefined?' · about '+s.eta+'s travel left (queues can add time)':''}`;}
function inspectMachine(m){inspectedLiftId=null;inspectedRobotId=null;$('inspect-model').href=appPath(`machines.html?model=${m.type}`);clearLayoutFocus();inspected=m;$('inspect').hidden=false;$('inspect-type').textContent=`GENERATION ${String(m.generation).padStart(2,'0')} · MACHINE ${String(m.id).padStart(3,'0')}`;$('inspect-title').textContent=TYPES[m.type].name;$('inspect-body').textContent=TYPES[m.type].description;}
function bind(){
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>selectBuild(b.dataset.build));
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setMode(b.dataset.view));
  $('cancel-build').onclick=cancelBuild;$('home').onclick=()=>setLocation(sim.actor.home,sim.actor.name+' · home');
  $('close-inspect').onclick=()=>{inspectedLiftId=null;inspectedRobotId=null;inspected=null;clearLayoutFocus();$('inspect').hidden=true;};
  $('inspect-guide').onclick=()=>{openFoundryGuide(sim.actor.id,inspected?{machineId:inspected.id}:inspectedRobotId?{robotId:inspectedRobotId}:{});renderColony(true);$('colony-dialog').showModal();};
  const reflectPause=()=>{document.body.classList.toggle('paused',sim.paused);$('pause').textContent=sim.paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',sim.paused?'Resume simulation':'Pause simulation');};
  reflectPause();
  $('pause').onclick=async()=>{try{await sim.setPaused(!sim.paused);reflectPause();save();toast(sim.paused?'This settlement is paused. Neighbors continue.':'Settlement production resumed');}catch(e){toast(e.message);}};
  $('colony').onclick=()=>{cancelBuild();renderColony();$('colony-dialog').showModal();};
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
    if(e.key.toLowerCase()==='r'&&selected&&selected!=='factory'){rotation+=Math.PI/2;updateGhost();}
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
  canvas.addEventListener('pointerup',async e=>{
    if(e.button!==0||!pointerDown)return;const movement=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(movement>6)return;
    const hit=pick(e);if(!hit)return;
    if(mode!=='surface'){setLocation(hit.loc);toast('Surface reached. Begin building here.');return;}
    if(selected){if(placing)return;placing=true;const type=selected;try{const result=await sim.build(type,hit.loc,{rotation,profile:selectedProfile});if(result.ok){beep(640);toast(type==='factory'?'Three construction sites reserved. Your crew will deliver and assemble each machine.':`${TYPES[type].name} reserved. Watch the crew deliver its supplies.`);save();if(selected&&hover)updateGhost();rebuildJobs();}else{toast(result.reason);beep(140);}}finally{placing=false;}return;}
    raycaster.setFromCamera(pointer,camera);const machineHit=raycaster.intersectObjects([...modelMap.values(),...foundryScene.robots.values(),...foundryScene.liftVisuals.lifts.values()],true)[0];
    if(machineHit){let o=machineHit.object;while(o&&!o.userData.machine&&!o.userData.lift)o=o.parent;if(o?.userData.lift)inspectLift(o.userData.lift.corridorId);else if(o?.userData.robot)inspectRobot(o.userData.robot);else if(o?.userData.machine){inspectedRobotId=null;inspectMachine(o.userData.machine);}}
    else{$('inspect').hidden=true;inspected=null;inspectedRobotId=null;inspectedLiftId=null;clearLayoutFocus();}
  });
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});window.addEventListener('pagehide',save);
}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
function updateUI(){
  const w=sim.world,p=sim.power,count=type=>w.machines.filter(m=>m.type===type&&m.claimId===sim.activeClaim.id).length;
  $('metal').textContent=resourceFormat.format(w.metal);$('rock').textContent=resourceFormat.format(w.rock);$('power').textContent=`${Math.max(0,p.supply-p.demand)} / ${p.supply}`;document.querySelector('.power').style.color=p.factor<1?'#f39b7f':'';
  $('power').title=`${p.demand} MW required, ${p.supply} MW available${p.factor<1?'. Production slowed; add solar arrays.':''}`;
  const industry=claimIndustry(sim.activeClaim.id);
  const mindFree=Math.max(0,industry.capacity-industry.used);$('mind-capacity').textContent=`${industry.used} / ${mindFree}`;
  $('mind-resource').title=`${industry.used} mind slots used, ${mindFree} available, ${industry.capacity} total. Includes ${industry.crewReserved} reserved for crew. ${industry.blockedIds.length} machines waiting for supervision.`;
  $('mind-resource').classList.toggle('warning',industry.blockedIds.length>0);
  $('nodes').textContent=count('compute');$('nodes').title=`${industry.used} / ${industry.capacity} mind capacity in use · ${industry.blockedIds.length} machines waiting`;$('machines').textContent=w.machines.filter(m=>m.claimId===sim.activeClaim.id).length;
  const complete=buildOrder.filter(type=>count(type)>0).length;
  const unlocked=sim.activeClaim.unlocks.includes('factory-plans');
  const next=nextObjective(sim.state,sim.activeClaim);$('objective-title').textContent=next.title;$('objective-body').textContent=next.body;
  $('step-number').textContent=`${String(Math.min(5,complete+1)).padStart(2,'0')} / 05`;$('objective-progress').style.width=complete/5*100+'%';
  const minds=count('compute');$('mind-state').textContent=unlocked?'FACTORY PLANS':minds?'LEARNING':'DORMANT';
  $('mind-message').textContent=unlocked?'I can turn a working idea into a whole factory.':!minds?'A silent world. For now.':`${Math.floor(w.thought)} / 120 research. New capabilities are taking shape.`;
  if(industry.blockedIds.length){$('mind-state').textContent='CAPACITY NEEDED';$('mind-message').textContent=`${industry.blockedIds.length} machines need supervision. Add a mind node to bring them online.`;}
  [...$('waveform').children].forEach((bar,i)=>bar.style.height=(minds?3+Math.abs(Math.sin(i*.5+now*.001)*Math.cos(i*.19-now*.0007))*24:2)+'px');
  for(const b of document.querySelectorAll('[data-build]')){const type=b.dataset.build,kits=sim.activeClaim.kits[type]||0,unaffordable=!kits&&(w.metal<TYPES[type].cost||sim.activeClaim.parts<TYPES[type].parts*UNIT);b.classList.toggle('unaffordable',unaffordable);b.querySelector('.cost').textContent=kits?`${kits} KIT${kits>1?'S':''}`:`◇ ${TYPES[type].cost} + ${TYPES[type].parts} parts`;}
  const crew=sim.state.robots.filter(r=>r.claimId===sim.activeClaim.id),busy=crew.filter(r=>!['idle','paused'].includes(r.status)).length;
  $('crew-hud-text').textContent=`${busy} / ${crew.length} crew working · ${industry.used} / ${industry.capacity} mind slots`;
  $('crew-hud-text').classList.toggle('warning',industry.blockedIds.length>0||p.factor<1);
  if(inspected){const current=sim.state.machines.find(m=>m.id===inspected.id)||inspected;const contents=Object.entries(current.inventory||{}).filter(([,n])=>n>0).map(([k,n])=>`${resourceFormat.format(n/UNIT)} ${k}`).join(' · ');$('inspect-progress').textContent=`${machineStatus(current)} · ${Math.round(current.condition/100)}% condition · ${current.design||'balanced'} design${contents?' · '+contents:''}`;}
  if(inspectedLiftId)updateLiftInspector();
  if(inspectedRobotId){const r=sim.state.robots.find(r=>r.id===inspectedRobotId);if(r)$('inspect-progress').textContent=`${r.status.replaceAll('-',' ')} · ${Math.round(r.condition/100)}% condition · ${Math.round(r.distanceTravelled)} m traveled${r.cargo.length?' · carrying '+r.cargo.map(c=>`${c.amount/UNIT} ${c.item}`).join(', '):''}`;}
  if(focusedLayout){
    const parts=[...sim.state.machines,...sim.state.jobs],complete=new Set(sim.state.machines.map(m=>m.id));
    $('inspect-progress').textContent=`${focusedLayout.parts.filter(p=>complete.has(p.id)).length} / 3 machines complete · grouped production`;
    for(const label of $('layout-labels').children){const part=parts.find(p=>p.id===Number(label.dataset.layoutPart));if(!part)continue;const v=localAt(part).add(new THREE.Vector3(0,9,0)).project(camera);label.hidden=mode!=='surface'||v.z<-1||v.z>1||Math.abs(v.x)>.9||Math.abs(v.y)>.85;label.style.left=(v.x*.5+.5)*innerWidth+'px';label.style.top=(-v.y*.5+.5)*innerHeight-10+'px';label.textContent=TYPES[part.type].name+(complete.has(part.id)?'':` · ${part.remaining}s`);}
  }
  const dist=camera.position.distanceTo(controls.target);$('scale').textContent=dist>10000?`${format.format(dist/1000)} km`:`${format.format(dist)} m`;
  $('pause').disabled=sim.activeClaim.ownerId!==sim.actor.id;document.body.classList.toggle('paused',sim.paused);$('pause').textContent=sim.paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',sim.paused?'Resume settlement':'Pause settlement');
  const homeSeed=w.machines.find(m=>m.type==='seed'&&m.ownerId===sim.actor.id);
  if(mode==='surface'&&homeSeed&&modelMap.has(homeSeed.id)){
    const g=modelMap.get(homeSeed.id);screenVector.copy(g.position).add(new THREE.Vector3(0,9,0)).project(camera);
    const visible=screenVector.z>-1&&screenVector.z<1&&Math.abs(screenVector.x)<.95&&Math.abs(screenVector.y)<.95;
    $('marker-label').hidden=!visible;$('marker-label').style.left=(screenVector.x*.5+.5)*innerWidth+16+'px';$('marker-label').style.top=(-screenVector.y*.5+.5)*innerHeight-24+'px';
  }else $('marker-label').hidden=true;
}
function animate(time){
  const delta=lastFrame?Math.min((time-lastFrame)/1000,.1):0;lastFrame=time;
  now=time;
  // Economic time belongs to the server, including when this browser is closed.
  // Keep menus responsive even on software WebGL. Snapshots continue updating
  // their contents while the obscured 3D scene holds its last rendered frame.
  if($('colony-dialog').open||$('atlas-dialog').open||$('help-dialog').open){
    if(time-lastUI>180){updateUI();lastUI=time;}
    return;
  }
  if(tween){const t=Math.min(1,(time-tween.start)/1100),e=t*t*(3-2*t);camera.position.lerpVectors(tween.fromPosition,tween.toPosition,e);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,e);if(t===1)tween=null;}
  controls.update();
  // Keep a surface camera above the actual measured terrain, including steep crater walls.
  if(mode==='surface'&&!tween){const w=frame.toWorld(camera.position.toArray()),d=normalize(w),floor=RADIUS+data.height(d)+4;if(Math.hypot(...w)<floor)camera.position.fromArray(frame.toLocal(d.map(v=>v*floor)));}
  if(time-lastLod>200){terrain.update(camera);lastLod=time;}
  terrain.process(8);
  for(const g of modelMap.values()){const m=g.userData.machine,i=claimIndustry(m.claimId),c=sim.state.claims.find(c=>c.id===m.claimId),active=sim.connected&&!c.paused&&i.states[m.id]==='active';animateMachine(g,delta,{power:i.powerFactor,active,camera,progress:m.type==='replicator'&&m.fabrication?m.fabrication.progress/(m.fabrication.seconds*UNIT)*24:undefined});}
  foundryScene?.animate(delta,camera,sim.connected,time);
  if(time-lastUI>180){updateUI();lastUI=time;}
  if(time-lastSave>4000){save();lastSave=time;}
  renderer.render(scene,camera);
}
async function init(){
  try{
    sim=await connectWorld();
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('scene').appendChild(renderer.domElement);
    scene=new THREE.Scene();foundryScene=new FoundryScene(scene);scene.background=new THREE.Color(0x06090d);
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
    camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.3,80_000_000);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.screenSpacePanning=false;controls.zoomSpeed=1.3;controls.rotateSpeed=.55;
    scene.add(new THREE.AmbientLight(0xc8d6e0,.65));
    const sun=new THREE.DirectionalLight(0xfffaf3,4.2);sun.position.set(-1800,1600,1100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:6000});sun.shadow.normalBias=.08;sun.shadow.bias=-.00008;scene.add(sun,sun.target);
    const starPositions=[];for(let i=0;i<1800;i++){const y=1-2*(i+.5)/1800,a=i*2.39996,r=Math.sqrt(1-y*y);starPositions.push(Math.cos(a)*r*45_000_000,y*45_000_000,Math.sin(a)*r*45_000_000);}
    const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb8c6d1,size:1.05,sizeAttenuation:false,transparent:true,opacity:.45,depthWrite:false})));
    const loaded=await Promise.all([LunarData.load(s=>$('loading-detail').textContent=s),new THREE.TextureLoader().loadAsync(appPath('data/moon-color.webp')),loadMachineAssets((n,total)=>$('loading-detail').textContent=`Preparing lunar machinery · ${n} / ${total}`)]);
    [data,texture]=loaded;if(loaded[2].failed.length)toast('Some detailed models were unavailable. Using lightweight machinery.');texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    ghostRing=new THREE.Mesh(new THREE.RingGeometry(6.6,6.72,64),new THREE.MeshBasicMaterial({color:0xf2bd80,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));ghostRing.rotation.x=-Math.PI/2;ghostRing.visible=false;scene.add(ghostRing);
    sim.onBuild=m=>{addMachine(m);rebuildMarkers();};sim.message=message=>{toast(message);beep(760);};
    let claimCount=0,lastSnapshotTick=sim.state.tick;sim.onSnapshot=()=>{if(!frame)return;
      // A requested campaign reset also removes the old world's rendered machines.
      if(sim.state.tick<lastSnapshotTick){foundryScene.reset({clearTracks:true});setLocation(sim.world.view,locationName(sim.world.view),mode);}
      lastSnapshotTick=sim.state.tick;rebuildJobs();foundryScene.sync(sim.state,data,frame,sim.world.view);if(sim.state.claims.length!==claimCount){rebuildClaims();claimCount=sim.state.claims.length;}if($('colony-dialog').open)renderColony();save();};
    setLocation(sim.world.view,locationName(sim.world.view));resize();bind();$('utilities-toggle').onclick=toggleUtilities;$('crew-hud').onclick=()=>{$('colony-dialog').showModal();renderColony(true);};
    $('loading-detail').textContent='Stitching the first regions';
    while(terrain.pending.length){terrain.process(12);await new Promise(resolve=>setTimeout(resolve,0));}
    updateUI();renderer.setAnimationLoop(animate);$('loading').classList.add('fade');setTimeout(()=>$('loading').hidden=true,750);
    // Read-only diagnostics for verification, never a second path for game mutations.
    if(import.meta.env.DEV)window.__moon={get state(){return JSON.parse(sim.serialize());},get stats(){return {...terrain.stats,mode,camera:camera.position.toArray(),cameraTarget:controls.target.toArray(),frameLocation:{...sim.world.view},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,power:sim.power,machineAssets:loadedMachineTypes(),robots:foundryScene.robots.size,roverMotion:foundryScene.motionStats,constructionSites:foundryScene.sites.size,detailedMachines:[...modelMap.values()].filter(g=>g.userData.asset).length};},screenLocation(east,north){const p=offsetPosition(sim.world.view.lat,sim.world.view.lon,east,north);const v=localAt(p).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,location:p};}};
  }catch(error){console.error(error);$('loading-detail').textContent=`Could not open this expedition: ${error.message}`;$('retry').hidden=false;$('retry').onclick=()=>location.reload();}
}
init();
