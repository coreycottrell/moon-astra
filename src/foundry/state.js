import {BUILDINGS,ROBOTS,PROJECTS,UNIT,RULESET,WORLD_VERSION,ECONOMY_VERSION,LIMITS,PRODUCTION} from './catalog.js';
import {cellArea,cellCenter,startingCell} from '../claims.js';
import {offsetPosition} from '../geography.js';

export class GameError extends Error{constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
export const fail=(code,message,status=409)=>{throw new GameError(code,message,status);};
export function emit(w,type,message,details={}){w.events.push({sequence:++w.sequence,tick:w.tick,type,message,...details});if(w.events.length>LIMITS.events)w.events.splice(0,w.events.length-LIMITS.events);}
export function player(w,id){const p=w.players.find(p=>p.id===id);if(!p)fail('UNAUTHORIZED','This player is not part of this world',401);return p;}
export function claim(w,id){const c=w.claims.find(c=>c.id===id);if(!c)fail('CLAIM_NOT_FOUND','Claim not found',404);return c;}
export function own(w,actor,id,build=false){player(w,actor);const c=claim(w,id);if(c.ownerId!==actor&&!(build&&c.builders.includes(actor)))fail('FORBIDDEN','This settlement has not granted this permission',403);return c;}
export const machine=(w,id)=>w.machines.find(m=>m.id===id);
export const robot=(w,id)=>w.robots.find(r=>r.id===id);
export const addStock=(inventory,item,amount)=>{inventory[item]=(inventory[item]||0)+amount;};
export const stock=(inventory,item)=>inventory?.[item]||0;
export const countStock=inventory=>Object.values(inventory).reduce((a,b)=>a+b,0);
export function storage(w,cid){return w.machines.filter(m=>m.claimId===cid);}
export function syncClaims(w){for(const c of w.claims){const nodes=storage(w,c.id);for(const item of ['metal','rock','parts','spares'])c[item]=nodes.reduce((n,m)=>n+stock(m.inventory,item),0);c.kits=Object.fromEntries(Object.keys(BUILDINGS).map(t=>[t,nodes.reduce((n,m)=>n+stock(m.inventory,'kit.'+t),0)/UNIT]));}}
export function createMachine(w,c,type,loc,options={}){const m={id:w.nextId++,claimId:c.id,ownerId:c.ownerId,type,...loc,rotation:0,generation:0,progress:0,mode:type==='workshop'?'parts':'off',condition:10000,inventory:{},enabled:true,design:'balanced',produced:0,commissionedAt:w.tick,...options};w.machines.push(m);return m;}
export function createRobot(w,c,role,{x=0,y=12,generation=0}={}){const r={id:w.nextId++,ownerId:c.ownerId,claimId:c.id,workClaimId:c.id,role,radius:ROBOTS[role].radius,name:ROBOTS[role].name,x,y,rotation:0,condition:10000,status:'idle',task:null,path:[],blockedTicks:0,distanceTravelled:0,workDone:0,generation,createdAt:w.tick};w.robots.push(r);return r;}
export function freshSharedWorld(){return {version:WORLD_VERSION,ruleset:RULESET,economyVersion:ECONOMY_VERSION,tick:0,nextId:1,players:[],claims:[],machines:[],robots:[],jobs:[],freight:[],shipments:[],corridors:[],board:[],designs:[],events:[],sequence:0,projects:PROJECTS.map(p=>({...structuredClone(p),delivered:{},contributions:{},workDone:0,complete:false,phase:'supply',crew:[]})),totals:{mined:0,refined:0,parts:0,spares:0,robotsBuilt:0,machinesBuilt:0,repairs:0,freightDelivered:0},project:{id:'first-federation',name:'The first federation',delivered:0,contributions:{},complete:false}};}
export function addPlayer(w,id,name){
  if(typeof name!=='string'||!/^[\p{L}\p{N} _.-]{2,32}$/u.test(name.trim()))fail('INVALID_NAME','Use 2–32 letters, numbers, spaces, dots, or dashes',400);
  name=name.trim();if(w.players.some(p=>p.id===id||p.name.toLowerCase()===name.toLowerCase()))fail('NAME_TAKEN','That callsign already has a settlement. Resume with its access token or choose another.');
  if(w.players.length>=LIMITS.players)fail('WORLD_FULL','This preview supports 24 settlements');
  if(w.machines.length+w.jobs.length>=LIMITS.machines)fail('WORLD_CAPACITY','There is no capacity for another lander');
  const reservedRobots=w.machines.reduce((n,m)=>n+(m.queue?.length||0)+(m.fabrication?.role?1:0),0);
  if(w.robots.length+reservedRobots+4>LIMITS.robots)fail('ROBOT_CAPACITY','A new landing needs capacity for all four starter robots');
  const cid=startingCell(w.players.length),home=cellCenter(cid),p={id,name,homeClaimId:cid,home,joinedAt:w.tick};
  const c={id:cid,ownerId:id,name:`${name}'s settlement`,home,areaKm2:cellArea(cid),builders:[],metal:0,rock:0,parts:0,spares:0,thought:0,deposit:250000*UNIT,yieldPerSecond:w.players.length%2?PRODUCTION.bulkHarvester:PRODUCTION.standardHarvester,profile:w.players.length%2?'Loose regolith · bulk yield':'Dense regolith · standard yield',revision:1,paused:false,unlocks:[],replications:0,research:'factory-plans',researchProgress:0,crewLimit:2,maxActive:4,autoLogistics:true};
  w.players.push(p);w.claims.push(c);
  const lander=createMachine(w,c,'seed',home);lander.inventory={metal:240000,parts:32000,spares:16000,'kit.solar':2000,'kit.miner':1000,'kit.refinery':1000,'kit.compute':2000,'kit.workshop':1000};
  ['builder','builder','hauler','service'].forEach((role,i)=>createRobot(w,c,role,{x:(i-1.5)*2.4,y:18}));
  if(w.players.length===1)w.projects.forEach((project,i)=>Object.assign(project,{claimId:cid,ownerId:id,...offsetPosition(home.lat,home.lon,110+i*28,90),radius:7}));
  emit(w,'player.joined',`${name} landed with four robot crew and seven prefabricated machine kits`,{actor:id,claimId:cid});syncClaims(w);return p;
}
