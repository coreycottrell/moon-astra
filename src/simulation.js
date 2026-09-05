import {distanceOnMoon,offsetPosition} from './geography.js';
export const SAVE_KEY='moon-astra-world-v1';
export const MAX_MACHINES=500;
export const TYPES={
  seed:{name:'Seed lander',cost:0,power:8,description:'Your first foothold. Supplies 8 power and construction tools.'},
  miner:{name:'Harvester',cost:12,power:-2,description:'Collects local rock from a finite deposit. Yield depends on the settlement.',icon:'excavate'},
  solar:{name:'Solar array',cost:15,power:12,description:'Adds 12 power to this settlement’s grid.',icon:'solar'},
  refinery:{name:'Refinery',cost:25,power:-3,description:'Turns 2 rock into 1 metal per second.',icon:'refine'},
  replicator:{name:'Replicator',cost:65,power:-5,description:'After research, program an output. Every 24 powered seconds it funds construction at the machine’s full metal cost.',icon:'replicate'},
  compute:{name:'Mind node',cost:35,power:-4,description:'Produces research work. At 120 work, unlock factory layouts and programmable replication.',icon:'mind'},
};
export function freshWorld() {
  return {version:1,paused:false,metal:175,rock:0,thought:0,elapsed:0,nextId:2,replications:0,machines:[{id:1,type:'seed',lat:28.5,lon:-17.5,rotation:0,progress:0,generation:0}],view:{lat:28.5,lon:-17.5}};
}
export function validateWorld(w) {
  if(!w||w.version!==1||!Array.isArray(w.machines)||w.machines.length<1||w.machines.length>MAX_MACHINES)throw Error('Unrecognized Moon save');
  if(w.paused!==undefined&&typeof w.paused!=='boolean')throw Error('Invalid saved pause state');
  for(const k of ['metal','rock','thought','elapsed','nextId','replications'])if(!Number.isFinite(w[k])||w[k]<0||w[k]>1e12)throw Error('Invalid saved resources');
  if(!Number.isInteger(w.nextId)||!Number.isInteger(w.replications))throw Error('Invalid saved identity');
  const ids=new Set();
  for(const m of w.machines) {
    if(!Object.hasOwn(TYPES,m.type)||!Number.isSafeInteger(m.id)||m.id<1||ids.has(m.id)||m.id>=w.nextId)throw Error('Invalid saved machine');
    ids.add(m.id);
    if(!Number.isFinite(m.lat)||Math.abs(m.lat)>90||!Number.isFinite(m.lon)||Math.abs(m.lon)>180)throw Error('Invalid saved location');
    if(!Number.isFinite(m.rotation)||!Number.isFinite(m.progress)||m.progress<0||m.progress>24||!Number.isInteger(m.generation)||m.generation<0)throw Error('Invalid saved machine state');
  }
  if(!w.machines.some(m=>m.type==='seed'))throw Error('Missing seed lander');
  if(!w.view||!Number.isFinite(w.view.lat)||Math.abs(w.view.lat)>90||!Number.isFinite(w.view.lon)||Math.abs(w.view.lon)>180)throw Error('Invalid saved view');
  return w;
}
export class Simulation {
  constructor(world=freshWorld()) { this.world=validateWorld(world);this.onBuild=()=>{};this.message=()=>{};this.paused=Boolean(world.paused); }
  get paused(){return this.world.paused;}
  set paused(value){this.world.paused=Boolean(value);}
  get power() {
    let supply=0,demand=0;
    for(const m of this.world.machines){const p=TYPES[m.type].power;if(p>0)supply+=p;else demand-=p;}
    return {supply,demand,factor:demand?Math.min(1,supply/demand):1};
  }
  canBuild(type,loc,free=false) {
    if(!Object.hasOwn(TYPES,type)||type==='seed')return 'Choose a machine';
    if(this.world.machines.length>=MAX_MACHINES)return 'This prototype supports 500 machines';
    if(!Number.isFinite(loc.lat)||Math.abs(loc.lat)>90||!Number.isFinite(loc.lon)||Math.abs(loc.lon)>180)return 'Choose a point on the Moon';
    if(!free&&this.world.metal<TYPES[type].cost)return `Need ${Math.ceil(TYPES[type].cost-this.world.metal)} more metal`;
    if(this.world.machines.some(m=>distanceOnMoon(m,loc)<12))return 'Leave at least 12 m between machines';
    return null;
  }
  build(type,loc,{free=false,generation=0,rotation=0}={}) {
    const reason=this.canBuild(type,loc,free);if(reason)return {ok:false,reason};
    if(!free)this.world.metal-=TYPES[type].cost;
    const m={id:this.world.nextId++,type,lat:loc.lat,lon:loc.lon,rotation,progress:0,generation};
    this.world.machines.push(m);this.onBuild(m);return {ok:true,machine:m};
  }
  replicaSite(m) {
    // Search outward deterministically; the same geographic rules apply across tile boundaries.
    for(let i=0;i<160;i++) {
      const r=20+Math.sqrt(i)*15,a=i*2.399963229728653;
      const p=offsetPosition(m.lat,m.lon,Math.cos(a)*r,Math.sin(a)*r);
      if(!this.world.machines.some(other=>distanceOnMoon(p,other)<14))return p;
    }
    return null;
  }
  tick(dt) {
    if(this.paused||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.25);const w=this.world,f=this.power.factor;
    w.elapsed+=dt;
    const count=t=>w.machines.filter(m=>m.type===t).length;
    w.rock+=count('miner')*3*dt*f;
    const refine=Math.min(w.rock/2,count('refinery')*dt*f);
    w.rock-=refine*2;w.metal+=refine;
    w.thought+=count('compute')*dt*f;
    for(const m of [...w.machines])if(m.type==='replicator') {
      m.progress=Math.min(24,m.progress+dt*f);
      if(m.progress>=24&&w.metal>=30&&w.machines.length<MAX_MACHINES) {
        const type=['solar','miner','refinery','compute','replicator'][w.replications%5];
        const site=this.replicaSite(m);
        if(site){const result=this.build(type,site,{free:true,generation:m.generation+1});if(result.ok){w.metal-=30;m.progress=0;w.replications++;this.message(`${TYPES[type].name} assembled · generation ${m.generation+1}`);}}
      }
    }
  }
  serialize() { return JSON.stringify(validateWorld(this.world)); }
}
