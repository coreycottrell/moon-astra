import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createWorldServer} from '../server/world-server.mjs';
import {offsetPosition} from '../src/geography.js';
const listen=async app=>{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+app.server.address().port;};
const call=async(base,path,{token,body,key}={})=>{const response=await fetch(base+'/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json()};};

test('HTTP preserves command receipts and in-flight construction across restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'foundry-api-')),database=join(dir,'world.sqlite');let app=createWorldServer({database,terrain:()=>0,tickMs:0});
  try{let base=await listen(app);const joined=await call(base,'join',{body:{name:'Ada'}});assert.equal(joined.status,201);const token=joined.body.token,c=joined.body.observation.claims[0],command={action:'build.place',claimId:c.id,type:'compute',...offsetPosition(c.home.lat,c.home.lon,30,20)};
    const p=await call(base,'preview',{token,body:command});assert.equal(p.status,200);assert.equal(app.state.jobs.length,0);
    const first=await call(base,'commands',{token,body:command,key:'persistent-job-001'});assert.equal(first.status,200);app.advance(15);const saved=app.state;await app.close();app=createWorldServer({database,terrain:()=>0,tickMs:0});base=await listen(app);assert.deepEqual(app.state,saved);
    const retry=await call(base,'commands',{token,body:command,key:'persistent-job-001'});assert.deepEqual(retry,first);assert.equal(app.state.jobs.length,1);
    const conflict=await call(base,'commands',{token,body:{...command,type:'solar'},key:'persistent-job-001'});assert.equal(conflict.status,409);assert.equal(conflict.body.error,'IDEMPOTENCY_CONFLICT');app.advance(500);assert.ok(app.state.machines.some(m=>m.type==='compute'));
    const metrics=await call(base,'metrics',{token});assert.equal(metrics.status,200);assert.ok(metrics.body.commitMs.samples>0);
  }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('delegated tokens have scopes, durable command budgets, receipts, revocation and audit',async()=>{
  const app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});try{const base=await listen(app),join=await call(base,'join',{body:{name:'Ada'}}),owner=join.body.token,c=join.body.observation.claims[0];
    const grant=await call(base,'access/delegate',{token:owner,body:{name:'Construction AICIV',scopes:['build'],ttlSeconds:3600,commandLimit:1}});assert.equal(grant.status,201);const token=grant.body.token;
    assert.equal((await call(base,'observe',{token})).status,200);assert.equal((await call(base,'access/delegate',{token,body:{}})).status,403);
    const forbidden=await call(base,'commands',{token,body:{action:'claim.pause',claimId:c.id,paused:true},key:'forbidden-action'});assert.equal(forbidden.body.error,'SCOPE_DENIED');
    const command={action:'build.place',claimId:c.id,type:'solar',...offsetPosition(c.home.lat,c.home.lon,30,0)},first=await call(base,'commands',{token,body:command,key:'delegated-build-1'});assert.equal(first.status,200);
    assert.deepEqual(await call(base,'commands',{token,body:command,key:'delegated-build-1'}),first);
    const exhausted=await call(base,'commands',{token,body:{...command,...offsetPosition(c.home.lat,c.home.lon,60,0)},key:'delegated-build-2'});assert.equal(exhausted.body.error,'COMMAND_LIMIT');
    const audit=await call(base,'audit',{token:owner});assert.equal(audit.body.entries.length,1);assert.equal(audit.body.entries[0].delegation,grant.body.id);
    assert.equal((await call(base,'access/revoke',{token:owner,body:{id:grant.body.id}})).status,200);assert.equal((await call(base,'observe',{token})).status,401);
  }finally{await app.close();}
});
test('owner and agent actions respect claim ownership and unauthenticated writes fail',async()=>{
  const app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});try{const base=await listen(app),a=(await call(base,'join',{body:{name:'Ada'}})).body,b=(await call(base,'join',{body:{name:'Babbage'}})).body;
    assert.equal((await call(base,'observe')).status,401);
    const c=a.observation.claims[0],command={action:'build.place',claimId:c.id,type:'solar',...offsetPosition(c.home.lat,c.home.lon,30,0)};
    assert.equal((await call(base,'commands',{token:b.token,body:command,key:'steal-resources'})).status,403);assert.equal(app.state.jobs.length,0);
    const r=await fetch(base+'/api/v1/commands',{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json',Origin:'https://unrelated.invalid','Idempotency-Key':'foreign-origin'},body:JSON.stringify(command)});assert.equal(r.status,403);
  }finally{await app.close();}
});
test('foreign and empty existing databases are refused without writes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'foundry-foreign-'));try{const path=join(dir,'world.sqlite'),db=new DatabaseSync(path);db.exec('CREATE TABLE world(id INTEGER PRIMARY KEY,data TEXT)');db.prepare('INSERT INTO world VALUES(1,?)').run(JSON.stringify({version:2,ruleset:'moon-neighbors-1',economyVersion:2}));db.close();const bytes=readFileSync(path);assert.throws(()=>createWorldServer({database:path,terrain:()=>0,tickMs:0}),/another ruleset/);assert.deepEqual(readFileSync(path),bytes);
    const empty=join(dir,'empty.sqlite'),other=new DatabaseSync(empty);other.close();assert.throws(()=>createWorldServer({database:empty,terrain:()=>0,tickMs:0}),/no world table/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('a failed multi-site command is atomic at the API boundary',async()=>{
  const app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});try{const base=await listen(app),j=(await call(base,'join',{body:{name:'Ada'}})).body,c=j.observation.claims[0];const before=app.state;
    const result=await call(base,'commands',{token:j.token,body:{action:'build.place',claimId:c.id,type:'replicator',...offsetPosition(c.home.lat,c.home.lon,40,0)},key:'locked-replicator'});assert.equal(result.status,409);assert.deepEqual(app.state,before);
    const mind={action:'build.place',claimId:c.id,type:'compute',...offsetPosition(c.home.lat,c.home.lon,60,26)};
    assert.equal((await call(base,'commands',{token:j.token,body:mind,key:'atomic-setup-mind'})).status,200);app.advance(600);
    const beforeLayout=app.state,layout=await call(base,'commands',{token:j.token,body:{action:'blueprint.deploy',claimId:c.id,...offsetPosition(c.home.lat,c.home.lon,60,0)},key:'atomic-layout-fails-last'});
    assert.equal(layout.body.error,'OCCUPIED');assert.deepEqual(app.state,beforeLayout);
    const catalog=await call(base,'catalog');assert.equal(catalog.body.ruleset,'moon-foundry-1');assert.ok(catalog.body.actions.includes('robot.fabricate'));assert.ok(catalog.body.robots.builder);
  }finally{await app.close();}
});

test('revocation closes an already-open delegated stream',async()=>{const app=createWorldServer({database:':memory:',terrain:()=>0,tickMs:0});try{const base=await listen(app),owner=(await call(base,'join',{body:{name:'Stream owner'}})).body.token,d=(await call(base,'access/delegate',{token:owner,body:{name:'Observer',scopes:['observe'],ttlSeconds:3600,commandLimit:1}})).body;
const stream=await fetch(base+'/api/v1/stream',{headers:{Authorization:'Bearer '+d.token}});assert.equal(stream.status,200);const reader=stream.body.getReader();assert.equal((await reader.read()).done,false);await call(base,'access/revoke',{token:owner,body:{id:d.id}});assert.equal((await reader.read()).done,true);assert.equal((await call(base,'observe',{token:d.token})).status,401);
}finally{await app.close();}});
