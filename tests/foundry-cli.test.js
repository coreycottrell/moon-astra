import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,writeFileSync,statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWorldServer} from '../server/world-server.mjs';
const listen=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
const cli=args=>new Promise((resolve,reject)=>{
  const env={...process.env};delete env.MOON_URL;
  const child=spawn(process.execPath,['scripts/agent.mjs',...args],{env,stdio:['ignore','pipe','pipe']});let out='',err='';
  child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);child.on('error',reject);child.on('close',code=>resolve({code,out,err}));
});
test('agent CLI joins, resumes the saved server address and reserves all seven kits',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'foundry-cli-')),file=join(dir,'access.json'),app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});
  try{
    const base=await listen(app.server),joined=await cli(['--url',base,'--access',file,'join','CLI colony']);assert.equal(joined.code,0,joined.err);
    assert.equal(statSync(file).mode&0o777,0o600);assert.equal(JSON.parse(readFileSync(file)).game,base);
    const observation=await cli(['--access',file,'observe']);assert.equal(observation.code,0,observation.err);assert.equal(JSON.parse(observation.out).ruleset,'moon-foundry-1');
    const boot=await cli(['--access',file,'bootstrap']);assert.equal(boot.code,0,boot.err);assert.equal(app.state.jobs.length,7);
    const again=await cli(['--access',file,'bootstrap']);assert.equal(again.code,0,again.err);assert.equal(app.state.jobs.length,7);
    assert.equal(app.state.jobs.filter(j=>j.type==='compute').length,2);assert.equal(app.state.jobs.filter(j=>j.type==='solar').length,2);
  }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('agent CLI refuses a foreign backend before sending credentials or joining',async()=>{
  const seen=[],server=createServer((req,res)=>{seen.push({path:req.url,authorization:req.headers.authorization});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ruleset:'moon-neighbors-1'}));});
  const dir=mkdtempSync(join(tmpdir(),'foundry-cli-')),file=join(dir,'access.json');
  try{
    const base=await listen(server);writeFileSync(file,JSON.stringify({game:base,token:'a'.repeat(64)}));
    for(const args of [['--access',file,'observe'],['--url',base,'--access',join(dir,'new.json'),'join','Wrong address']]){
      const result=await cli(args);assert.equal(result.code,1);assert.match(result.err,/different Moon ruleset/);
    }
    assert.deepEqual(seen,[{path:'/api/v1/catalog',authorization:undefined},{path:'/api/v1/catalog',authorization:undefined}]);
  }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
