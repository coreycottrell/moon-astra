// Read-only world watcher. Game writes, if enabled, go through the bounded player.
import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {collectSignals,enqueueSignals,wakeAllowed,safeWakeText} from './lib/player-signals.mjs';
import {runPlayer} from './lib/bounded-player.mjs';
import {submitTmuxPrompt} from './lib/tmux-board-alert.mjs';
const {values}=parseArgs({options:{config:{type:'string'},once:{type:'boolean'},help:{type:'boolean'}}});
if(values.help||!values.config){console.log('node scripts/moon-watch.mjs --config /private/player-watch.json [--once]\nSee docs/foundry/PLAYER-WORKFLOW.md for signals, cooldowns, tmux and bounded play.');process.exit(values.help?0:1);}
const config=JSON.parse(readFileSync(resolve(values.config),'utf8')),folder=resolve(config.directory);
if(config.player?.enabled&&config.tmuxInject)throw Error('Choose either bounded player turns or tmux injection, not both');mkdirSync(folder,{recursive:true,mode:0o700});
const file=resolve(folder,'watch-state.json'),lock=resolve(folder,'watch.pid');
if(existsSync(lock)){const pid=Number(readFileSync(lock,'utf8'));let alive=false;try{process.kill(pid,0);alive=true;}catch(e){if(e.code!=='ESRCH')throw e;}if(alive)throw Error('A watcher is already running for this directory');unlinkSync(lock);}
writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});
let stopping=false,controller=new AbortController();for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>{stopping=true;controller.abort();});
const save=(path,value)=>{writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n',{mode:0o600});renameSync(path+'.tmp',path);};
let state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
try{
 const access=JSON.parse(readFileSync(config.access,'utf8')),game=new URL(access.game);
 if(!['http:','https:'].includes(game.protocol)||game.username||game.password||game.search||game.hash)throw Error('Invalid game address');
 const base=game.href.replace(/\/$/,'')+'/api/v1/';
 const api=async(path,body,key)=>{const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),method:body===undefined?'GET':'POST',headers:{...(path==='catalog'?{}:{Authorization:'Bearer '+access.token}),...(body===undefined?{}:{'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const j=await r.json();if(!r.ok){const e=Error(j.error||'HTTP_'+r.status);e.status=r.status;throw e;}return j;};
 if((await api('catalog')).ruleset!=='moon-foundry-1')throw Error('Wrong world; credential has not been sent');
 const identity=base+'|'+(access.player||'');if(state.identity&&state.identity!==identity)throw Error('This watcher state belongs to another identity');state.identity=identity;
 do{
  try{
   if(existsSync(resolve(folder,'PAUSED'))){if(values.once)break;await sleep(1000,undefined,{signal:controller.signal});continue;}
   const world=await api('observe');if(world.ruleset!=='moon-foundry-1')throw Error('Unexpected world');
   const actor=world.players.find(p=>p.id===world.actorId);if(access.player&&actor?.name!==access.player)throw Error('Player identity mismatch');
   const signals=collectSignals(world,state,config);enqueueSignals(state,signals);state.lastPoll=new Date().toISOString();state.tick=world.tick;save(file,state);
   if(wakeAllowed(state,config,Date.now())){
    const id=Date.now()+'-'+world.sequence,wakeFile=resolve(folder,'wake.json'),wake={id,game:access.game,player:actor.name,tick:world.tick,signals:state.pending};save(wakeFile,wake);
    let delivered=true;
    if(config.tmuxPane){
     if(!/^%\d+$/.test(config.tmuxPane))throw Error('Use an exact tmux pane ID');
     const pane=spawnSync('tmux',['display-message','-p','-t',config.tmuxPane,'#{pane_current_command}|#{@moon_player_notifications}'],{encoding:'utf8'});
     if(pane.status!==0)delivered=false;
     else if(config.tmuxInject){
      const ready=resolve(folder,'READY');if(pane.stdout.trim()!=='codex|on'||!existsSync(ready))delivered=false;
      else{unlinkSync(ready);const message=safeWakeText(wakeFile);delivered=submitTmuxPrompt(config.tmuxPane,message).sent;}
     }else delivered=spawnSync('tmux',['display-message','-t',config.tmuxPane,'Moon player: '+state.pending.length+' events; '+wakeFile]).status===0;
    }
    if(config.player?.enabled){
     if((state.playerRuns||0)>=(config.player.maxTotalRuns??6)){
      state.playerBudgetExhausted=true;console.log(JSON.stringify({type:'player.budget-exhausted',tick:world.tick}));
     }else{
      // Consume this batch durably before starting a player, so a crash cannot
      // cause another model turn for the same events and duplicate its actions.
      state.playerRuns=(state.playerRuns||0)+1;state.lastWake=Date.now();state.pending=[];save(file,state);
      const result=await runPlayer({config,world,wake,api,signal:controller.signal});save(resolve(folder,'last-player-run.json'),result);
      console.log(JSON.stringify({type:'player.finished',tick:world.tick,ok:result.ok,commands:result.commands.length}));
     }
    }
    if(delivered){state.lastWake=Date.now();state.pending=[];save(file,state);console.log(JSON.stringify({type:'watch.wake',id,signals:wake.signals.map(s=>s.type),file:wakeFile}));}
   }
   state.errors=0;save(file,state);
  }catch(e){if(stopping)break;state.errors=(state.errors||0)+1;state.lastError=e.status?'HTTP '+e.status:e.name;save(file,state);console.error(JSON.stringify({type:'watch.error',error:state.lastError,attempt:state.errors}));if(e.status===401||e.status===403)throw Error('Access expired or revoked');}
  if(!values.once&&!stopping)await sleep(Math.min(300000,Math.max(10000,(config.pollSeconds??30)*1000)*2**Math.min(state.errors||0,4)),undefined,{signal:controller.signal}).catch(()=>{});
 }while(!values.once&&!stopping);
}finally{if(existsSync(lock)&&Number(readFileSync(lock,'utf8'))===process.pid)unlinkSync(lock);}
