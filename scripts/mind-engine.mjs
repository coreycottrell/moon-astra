#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {MindEngine} from '../lib/mind-engine/engine.mjs';
import {deterministicResponse} from '../lib/mind-engine/protocol.mjs';
import {gymSnapshot,transportGym} from '../lib/mind-engine/gym-adapter.mjs';
import {DEFAULT_SCENARIO,chooseWithMemory} from '../lib/mind-engine/gym.mjs';
import {fromGuide,traffic,resources} from '../lib/mind-engine/moon-adapter.mjs';
import {minimax} from '../lib/mind-engine/minimax.mjs';
const [command,...args]=process.argv.slice(2),option=name=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:undefined;};
const db=option('db');if(!db)throw Error('Pass --db /absolute/private/path.sqlite');
const engine=new MindEngine({path:db,skills:[transportGym,traffic,resources]});
const emit=async value=>{const text=JSON.stringify(value,null,2);if(option('out')){await mkdir(dirname(option('out')),{recursive:true,mode:0o700});await writeFile(option('out'),text+'\n',{mode:0o600});console.log(JSON.stringify({saved:option('out'),state:value.state||'complete'}));}else console.log(text);};
async function remoteProvider(){
  let apiKey=process.env.MOON_MINIMAX_API_KEY;const model='MiniMax-M3';
  if(option('credentials')){
    const text=await readFile(option('credentials'),'utf8');const vars={};
    for(const line of text.split(/\r?\n/)){const m=/^(?:export\s+)?(MOON_MINIMAX_API_KEY|MOON_MINIMAX_MODEL)=(.*)$/.exec(line.trim());if(m)vars[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
    apiKey=vars.MOON_MINIMAX_API_KEY||apiKey;
  }return minimax({apiKey,model});
}
try{
  if(command==='demo'){
    const owner='learning-lab',observation=gymSnapshot(DEFAULT_SCENARIO,{ownerId:owner}),records=[],runKey='demo-'+Date.now().toString(36);
    for(const choice of ['single-lift','extra-crew','graded-road']){
      const job=engine.submit({owner,key:runKey+'-'+choice,skillId:transportGym.id,observation});
      await engine.run(job.id,owner,async request=>({result:deterministicResponse(request,choice)}));records.push(engine.evaluate(job.id,owner));
    }
    const next=engine.submit({owner,key:runKey+'-next-choice',skillId:transportGym.id,observation});
    const learned=chooseWithMemory(DEFAULT_SCENARIO,next.request.memory);
    await engine.run(next.id,owner,async request=>({result:deterministicResponse(request,learned.choice)}));
    const measured=engine.evaluate(next.id,owner);
    await emit({mode:'deterministic simulator; no provider calls or live game writes',before:chooseWithMemory(DEFAULT_SCENARIO,[]),after:learned,records,verifiedNextOutcome:measured,storedJobs:engine.list(owner)});
  }else if(command==='analyze'){
    const c=JSON.parse(await readFile(option('context'),'utf8')),observation=fromGuide(c),skill=option('skill')==='traffic'?traffic:option('skill')==='resources'?resources:null;if(!skill)throw Error('Choose --skill traffic or resources');
    const job=engine.submit({owner:observation.ownerId,key:option('key')||'analysis-'+observation.id.slice(0,24)+'-'+skill.id,skillId:skill.id,observation});
    const provider=option('provider')==='minimax'?await remoteProvider():async request=>({result:deterministicResponse(request,request.skill.candidates.find(c=>c.eligible)?.id)});
    const result=await engine.run(job.id,observation.ownerId,provider);await emit({id:result.id,state:result.state,error:result.error,summary:result.summary,validation:result.validation});
  }else if(command==='list')await emit(engine.list(option('owner')||'learning-lab'));
  else throw Error('Commands: demo, analyze --context FILE --skill traffic|resources [--provider minimax --credentials FILE], list [--owner ID]. Always pass --db PATH.');
}finally{engine.close();}
