// One read-only polling pass. Schedule with flock + cron; no model or game writes.
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {boardEntries,collectBoard,inboxMarkdown} from './lib/dev-board.mjs';
const {values}=parseArgs({options:{config:{type:'string'},seed:{type:'string'}}});
if(!values.config)throw Error('Supply --config with a private watcher configuration');
const config=JSON.parse(readFileSync(values.config)),folder=resolve(config.directory);mkdirSync(folder,{recursive:true,mode:0o700});
const stateFile=resolve(folder,'state.json');
const save=(file,value)=>{writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n',{mode:0o600});renameSync(file+'.tmp',file);};
let state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile)):{};
try{
  const access=JSON.parse(readFileSync(config.access)),url=new URL(access.game);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Invalid game URL');
  const base=url.href.replace(/\/$/,'')+'/api/v1/';
  if(state.game&&state.game!==base)throw Error('This watcher belongs to another game');
  const get=async(path,authenticated=false)=>{
    const r=await fetch(base+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:authenticated?{Authorization:'Bearer '+access.token}:{}});
    if(!r.ok)throw Object.assign(Error('HTTP '+r.status),{code:'HTTP_'+r.status});return r.json();
  };
  if((await get('catalog')).ruleset!=='moon-foundry-1')throw Error('Wrong ruleset; no credential sent');
  if(values.seed){if(state.known)throw Error('Refusing to replace an existing baseline');state=collectBoard(JSON.parse(readFileSync(values.seed))).state;}
  const world=await get('observe',true),actor=world.players.find(p=>p.id===world.actorId);
  if(actor?.name!==access.player)throw Error('Player identity mismatch');
  const result=collectBoard(world,state);state={...result.state,game:base};save(stateFile,state);
  save(resolve(folder,'latest-board.json'),{observedAt:state.lastPoll,tick:world.tick,entries:boardEntries(world)});
  const inbox=resolve(folder,'inbox.md');writeFileSync(inbox+'.tmp',inboxMarkdown(state),{mode:0o600});renameSync(inbox+'.tmp',inbox);
  const due=state.pendingNotifications&&Date.now()-(state.lastNotificationAttempt||0)>=Math.max(60,config.notificationCooldownSeconds??300)*1000;
  if(due&&config.tmuxTarget){
    if(!/^%\d+$/.test(config.tmuxTarget))throw Error('Use an exact tmux pane ID');
    state.lastNotificationAttempt=Date.now();save(stateFile,state);
    const message=`Moon dev board: ${state.pendingNotifications} new/edited messages. Read ${inbox}`;
    // Only a tmux status banner, never keyboard input or board text as commands.
    const r=spawnSync('/usr/bin/tmux',['display-message','-d','12000','-t',config.tmuxTarget,message],{encoding:'utf8',timeout:2000});
    if(r.status===0){state.pendingNotifications=0;state.lastNotifiedAt=new Date().toISOString();save(stateFile,state);}
  }
  console.log(JSON.stringify({type:'dev-board.checked',tick:state.tick,newMessages:result.changes.length,devMessages:result.changes.filter(e=>e.dev).length,polls:state.polls,at:state.lastPoll}));
}catch(error){
  state.errors=(state.errors||0)+1;state.lastError=error.code||error.name;state.lastErrorAt=new Date().toISOString();save(stateFile,state);
  console.error(JSON.stringify({type:'dev-board.error',error:state.lastError,at:state.lastErrorAt}));process.exitCode=1;
}
