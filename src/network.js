import {TYPES} from './simulation.js';
import {cellAt,validLocation} from './claims.js';
import {distanceOnMoon,offsetPosition} from './geography.js';
import {UNIT,BLUEPRINT,preview} from './shared-world.js';
import {DESIGNS} from './foundry/catalog.js';
import {appPath} from './urls.js';
const ACCESS='moon-foundry-access-v1',VIEW='moon-foundry-view-v1';
export const FACTORY={name:'Factory layout (3 machines)',cost:52,description:'Builds a solar array, harvester, and refinery together. Add a replicator separately for automated construction.'};
export async function request(path,{token,body,key}={}){
  const response=await fetch(appPath('api/v1/'+path),{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const value=await response.json();if(!response.ok){const e=new Error(value.message||value.error||'World service unavailable');e.status=response.status;e.code=value.error;throw e;}return value;
}
export async function connectWorld(){
  const catalog=await request('catalog');
  if(catalog.ruleset!=='moon-foundry-1')throw Error('This address is connected to a different Moon world. Foundry needs its own backend; no account was opened.');
  let access;try{access=JSON.parse(localStorage.getItem(ACCESS));}catch{}
  if(access?.token){try{return new NetworkSimulation(access.token,await request('observe',{token:access.token}));}catch(e){if(e.status!==401)throw e;}}
  const dialog=document.getElementById('join-dialog');dialog.showModal();dialog.addEventListener('cancel',e=>e.preventDefault());
  return await new Promise(resolve=>{
    const form=document.getElementById('join-form');
    form.onsubmit=async e=>{
      e.preventDefault();const button=document.getElementById('join-submit');button.disabled=true;
      try{
        const tokenInput=document.getElementById('resume-token').value.trim();let token,state;
        if(tokenInput){token=tokenInput;state=await request('observe',{token});}
        else{const joined=await request('join',{body:{name:document.getElementById('callsign').value}});token=joined.token;state=joined.observation;}
        try{localStorage.setItem(ACCESS,JSON.stringify({token}));}catch{}
        dialog.close();resolve(new NetworkSimulation(token,state));
      }catch(error){document.getElementById('join-error').textContent=error.message;button.disabled=false;}
    };
  });
}
export class NetworkSimulation{
  constructor(token,state){
    this.token=token;this.state=state;this.connected=true;this.onBuild=()=>{};this.onSnapshot=()=>{};this.message=()=>{};
    const home=state.players.find(p=>p.id===state.actorId).home;let view=home;
    try{const saved=JSON.parse(localStorage.getItem(VIEW));if(validLocation(saved))view=saved;}catch{}
    this.world={view,machines:[]};this.apply(state,false);this.polling=false;
    this.timer=setInterval(()=>this.refresh(),1000);
  }
  get actor(){return this.state.players.find(p=>p.id===this.state.actorId);}
  get activeClaim(){return this.state.claims.find(c=>c.id===cellAt(this.world.view))||this.state.claims.find(c=>c.id===this.actor.homeClaimId);}
  get power(){return this.state.powers[this.activeClaim.id];}
  get paused(){return this.activeClaim.paused;}
  setView(view){this.world.view=view;this.sync();}
  sync(){const c=this.activeClaim;Object.assign(this.world,{version:3,metal:c.metal/UNIT,rock:c.rock/UNIT,thought:c.thought/UNIT,elapsed:this.state.tick,replications:c.replications,paused:c.paused,claimId:c.id,actorId:this.actor.id});}
  apply(state,notify=true){
    const oldIds=new Set(this.world.machines.map(m=>m.id)),oldMap=new Map(this.world.machines.map(m=>[m.id,m]));
    const previous=this.state?.sequence||0;this.state=state;
    this.world.machines=state.machines.map(m=>Object.assign(oldMap.get(m.id)||{},m,{progress:m.progress/UNIT}));this.sync();
    if(notify){for(const m of this.world.machines)if(!oldIds.has(m.id))this.onBuild(m);
      const event=state.events.filter(e=>e.sequence>previous&&e.type.startsWith('research.')&&(!e.claimId||e.claimId===this.activeClaim.id)).at(-1);if(event)this.message(event.message);
      this.onSnapshot();
    }
  }
  async refresh(){if(this.polling)return;this.polling=true;try{const state=await request('observe',{token:this.token});this.connected=true;this.apply(state);}catch{if(this.connected)this.message('Connection interrupted. The server keeps your world; reconnecting…');this.connected=false;}finally{this.polling=false;}}
  async command(command){
    const key=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');let result;
    for(let attempt=0;attempt<2;attempt++){
      try{result=await request('commands',{token:this.token,body:command,key});break;}
      catch(e){if(e.status||attempt===1)throw e;}
    }
    await this.refresh();return result;
  }
  canBuild(type,loc,profile='balanced'){
    if(!this.connected)return 'Reconnect to the world before building';
    try{preview(this.state,this.actor.id,{action:type==='factory'?'blueprint.deploy':'build.place',claimId:this.activeClaim.id,...(type==='factory'?{}:{type,profile}),...loc});return null;}catch(e){return e.message;}
  }
  async build(type,loc,{rotation=0,profile='balanced'}={}){
    const reason=this.canBuild(type,loc,profile);if(reason)return {ok:false,reason};
    try{const result=await this.command({action:type==='factory'?'blueprint.deploy':'build.place',claimId:this.activeClaim.id,...(type==='factory'?{}:{type,rotation,profile}),...loc,maxMetal:(type==='factory'?FACTORY:TYPES[type]).cost*DESIGNS[profile].cost});return {ok:true,...result};}catch(e){return {ok:false,reason:e.message};}
  }
  async setPaused(paused){await this.command({action:'claim.pause',claimId:this.activeClaim.id,paused});}
  saveView(){try{localStorage.setItem(VIEW,JSON.stringify(this.world.view));}catch{}}
  serialize(){return JSON.stringify({...this.state,view:this.world.view});}
}
