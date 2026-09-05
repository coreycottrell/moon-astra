import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {offsetPosition} from '../src/geography.js';

const {values,positionals}=parseArgs({allowPositionals:true,options:{url:{type:'string'},access:{type:'string'},key:{type:'string'}}});
const [verb,arg]=positionals;
let base,game,access;
let token;
async function api(path,body,key){
  let response;
  for(let attempt=0;attempt<2;attempt++)try{response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});break;}catch(e){if(attempt===1||path==='join')throw e;}
  const result=await response.json();if(!response.ok){const e=Error(`${result.error}: ${result.message}`);e.code=result.error;throw e;}return result;
}
const output=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n');
try{
  if(verb&&verb!=='help'){
    if(values.access&&verb!=='join'&&verb!=='catalog')access=JSON.parse(readFileSync(values.access,'utf8'));
    const address=new URL(values.url||process.env.MOON_URL||access?.game||'http://127.0.0.1:4205');
    if(!['http:','https:'].includes(address.protocol)||address.username||address.password||address.search||address.hash)throw Error('Use an HTTP(S) game address without credentials, a query, or a fragment.');
    game=address.href.replace(/\/$/,'');base=game+'/api/v1/';
    const catalog=await api('catalog');
    if(catalog.ruleset!=='moon-foundry-1')throw Error('This address serves a different Moon ruleset. No credentials or commands were sent.');
  }
  if(!verb||verb==='help'){
    console.log(`MOON Foundry agent client — same rules as human players

  npm run agent -- join ACG
  npm run agent -- --access .agent-access/acg.json observe
  npm run agent -- --access .agent-access/acg.json bootstrap
  npm run agent -- --access .agent-access/acg.json preview command.json
  npm run agent -- --access .agent-access/acg.json --key my-command-001 command command.json
  npm run agent -- --access .agent-access/acg.json cooperate
  npm run agent -- catalog

Use --url http://HOST:4205 for another host. JSON input may be '-' for stdin.
Bootstrap reserves the seven landing kits: two solar, two minds, a harvester, refinery, and workshop.
Cooperate reserves up to half the first federation’s metal and parts. Crew must deliver them.
Neither routine runs indefinitely or makes model API calls.`);
  }else if(verb==='join'){
    if(!arg)throw Error('Supply a callsign.');
    const file=resolve(values.access||`.agent-access/${arg.toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'player'}.json`);
    if(existsSync(file))throw Error(`Access file already exists: ${file}. Use it to resume.`);
    mkdirSync(dirname(file),{recursive:true,mode:0o700});
    const result=await api('join',{name:arg});
    writeFileSync(file,JSON.stringify({game,player:result.player.name,token:result.token},null,2)+'\n',{mode:0o600,flag:'wx'});
    output({joined:result.player.name,accessFile:file,claim:result.player.homeClaimId});
  }else if(verb==='catalog')output(await api('catalog'));
  else{
    if(!values.access)throw Error('Pass --access with a saved player JSON file.');
    token=access.token;
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid access file.');
    if(verb==='observe')output(await api('observe'));
    else if(verb==='command'||verb==='preview'){
      if(!arg)throw Error('Supply a command JSON filename, or - for stdin.');
      const body=JSON.parse(readFileSync(arg==='-'?0:arg,'utf8'));
      output(await api(verb==='command'?'commands':'preview',body,verb==='command'?(values.key||randomUUID()):undefined));
    }else if(verb==='bootstrap'){
      for(const [index,type] of ['compute','miner','refinery','solar','workshop','compute','solar'].entries()){
        const w=await api('observe'),p=w.players.find(p=>p.id===w.actorId),claimId=p.homeClaimId;
        const required=['compute','miner','refinery','solar','workshop','compute','solar'].slice(0,index+1).filter(t=>t===type).length;
        if([...w.machines,...w.jobs].filter(m=>m.claimId===claimId&&m.type===type).length>=required){output({type,status:'already present or queued'});continue;}
        let command;
        for(let i=0;i<80;i++){
          const angle=(i+index)*2.3999632297,r=30+Math.floor(index/4)*28+Math.sqrt(i)*12,loc=offsetPosition(p.home.lat,p.home.lon,Math.cos(angle)*r,Math.sin(angle)*r);
          const candidate={action:'build.place',claimId,type,...loc};
          try{await api('preview',candidate);command=candidate;break;}catch(e){if(!['OCCUPIED','STEEP_TERRAIN','ROBOT_IN_FOOTPRINT'].includes(e.code))throw e;}
        }
        if(!command)throw Error(`No suitable ground for ${type}.`);
        output({type,...await api('commands',command,randomUUID())});
      }
    }else if(verb==='cooperate'){
      const w=await api('observe'),p=w.players.find(p=>p.id===w.actorId);
      const project=w.projects.find(p=>p.id==='first-federation');
      for(const [resource,share] of [['metal',60],['parts',6]]){
        const reserved=w.freight.filter(f=>f.toKind==='project'&&f.toId===project.id&&f.ownerId===p.id&&f.item===resource).reduce((n,f)=>n+f.amount,0),delivered=project.contributions[p.id]?.[resource]||0;
        const remaining=project.needs[resource]-(project.delivered[resource]||0)-w.freight.filter(f=>f.toKind==='project'&&f.toId===project.id&&f.item===resource).reduce((n,f)=>n+f.amount,0);
        const amount=Math.max(0,Math.floor(Math.min(share-(delivered+reserved)/1000,remaining/1000)));
        if(project.complete||amount<=0)output({resource,status:'Your federation share is already supplied.'});
        else output(await api('commands',{action:'project.contribute',claimId:p.homeClaimId,projectId:project.id,resource,amount},(values.key||randomUUID())+'-'+resource));
      }
    }else if(verb==='metrics')output(await api('metrics'));
    else if(verb==='audit')output(await api('audit'));
    else if(verb==='access')output(await api('access'));
    else if(verb==='delegate'){
      if(!arg)throw Error('Supply a JSON delegation request file.');const input=JSON.parse(readFileSync(arg,'utf8'));const d=await api('access/delegate',input);const file=resolve('.agent-access/'+d.id+'.json');mkdirSync(dirname(file),{recursive:true,mode:0o700});writeFileSync(file,JSON.stringify({game,...d},null,2)+'\n',{mode:0o600,flag:'wx'});output({delegationId:d.id,accessFile:file,expires:d.expires,remaining:d.remaining,scopes:d.scopes});
    }else if(verb==='revoke')output(await api('access/revoke',{id:arg}));
    else throw Error(`Unknown command: ${verb}`);
  }
}catch(error){console.error(error.message);process.exitCode=1;}
