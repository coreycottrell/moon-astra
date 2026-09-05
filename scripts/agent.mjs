import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {offsetPosition} from '../src/geography.js';

const {values,positionals}=parseArgs({allowPositionals:true,options:{url:{type:'string',default:process.env.MOON_URL||'http://127.0.0.1:4175'},access:{type:'string'},key:{type:'string'}}});
const [verb,arg]=positionals,base=values.url.replace(/\/$/,'')+'/api/v1/';
let token;
async function api(path,body,key){
  let response;
  for(let attempt=0;attempt<2;attempt++)try{response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});break;}catch(e){if(attempt===1||path==='join')throw e;}
  const result=await response.json();if(!response.ok){const e=Error(`${result.error}: ${result.message}`);e.code=result.error;throw e;}return result;
}
const output=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n');
try{
  if(!verb||verb==='help'){
    console.log(`MOON agent client — same rules as human players

  npm run agent -- join ACG
  npm run agent -- --access .agent-access/acg.json observe
  npm run agent -- --access .agent-access/acg.json bootstrap
  npm run agent -- --access .agent-access/acg.json preview command.json
  npm run agent -- --access .agent-access/acg.json --key my-command-001 command command.json
  npm run agent -- --access .agent-access/acg.json cooperate
  npm run agent -- catalog

Use --url http://HOST:4175 for another host. JSON input may be '-' for stdin.
Bootstrap queues one solar, harvester, refinery, mind node, and replicator.
Cooperate sends your remaining federation share, up to 60 metal.
Neither routine runs indefinitely or makes model API calls.`);
  }else if(verb==='join'){
    if(!arg)throw Error('Supply a callsign.');
    const file=resolve(values.access||`.agent-access/${arg.toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'player'}.json`);
    if(existsSync(file))throw Error(`Access file already exists: ${file}. Use it to resume.`);
    mkdirSync(dirname(file),{recursive:true,mode:0o700});
    const result=await api('join',{name:arg});
    writeFileSync(file,JSON.stringify({game:values.url,player:result.player.name,token:result.token},null,2)+'\n',{mode:0o600,flag:'wx'});
    output({joined:result.player.name,accessFile:file,claim:result.player.homeClaimId});
  }else if(verb==='catalog')output(await api('catalog'));
  else{
    if(!values.access)throw Error('Pass --access with a saved player JSON file.');
    const access=JSON.parse(readFileSync(values.access,'utf8'));token=access.token;
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid access file.');
    if(verb==='observe')output(await api('observe'));
    else if(verb==='command'||verb==='preview'){
      if(!arg)throw Error('Supply a command JSON filename, or - for stdin.');
      const body=JSON.parse(readFileSync(arg==='-'?0:arg,'utf8'));
      output(await api(verb==='command'?'commands':'preview',body,verb==='command'?(values.key||randomUUID()):undefined));
    }else if(verb==='bootstrap'){
      for(const [index,type] of ['solar','miner','refinery','compute','replicator'].entries()){
        const w=await api('observe'),p=w.players.find(p=>p.id===w.actorId),claimId=p.homeClaimId;
        if([...w.machines,...w.jobs].some(m=>m.claimId===claimId&&m.type===type)){output({type,status:'already present or queued'});continue;}
        let command;
        for(let i=0;i<80;i++){
          const angle=i*2.3999632297,r=32+index*24+Math.sqrt(i)*15,loc=offsetPosition(p.home.lat,p.home.lon,Math.cos(angle)*r,Math.sin(angle)*r);
          const candidate={action:'build.place',claimId,type,...loc};
          try{await api('preview',candidate);command=candidate;break;}catch(e){if(!['OCCUPIED','STEEP_TERRAIN'].includes(e.code))throw e;}
        }
        if(!command)throw Error(`No suitable ground for ${type}.`);
        output({type,...await api('commands',command,randomUUID())});
      }
    }else if(verb==='cooperate'){
      const w=await api('observe'),p=w.players.find(p=>p.id===w.actorId);
      const reserved=w.shipments.filter(s=>s.project&&s.ownerId===p.id).reduce((n,s)=>n+s.metal,0),amount=60-((w.project.contributions[p.id]||0)+reserved)/1000;
      if(w.project.complete||amount<=0)output({status:'Your federation share is already supplied.'});
      else output(await api('commands',{action:'project.contribute',claimId:p.homeClaimId,amount},values.key||randomUUID()));
    }else throw Error(`Unknown command: ${verb}`);
  }
}catch(error){console.error(error.message);process.exitCode=1;}
