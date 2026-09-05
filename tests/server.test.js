import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createWorldServer} from '../server/world-server.mjs';
import {offsetPosition} from '../src/geography.js';

async function serve(database){const app=createWorldServer({database,terrain:()=>0,tickMs:0});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');return {app,url:`http://127.0.0.1:${app.server.address().port}/api/v1/`};}
async function request(url,path,{token,body,key}={}){const r=await fetch(url+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:r.status,value:await r.json()};}
test('HTTP identity, atomic commands, duplicate receipts, and restart persistence',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'moon-api-'));let active;
  try{
    let {app,url}=await serve(join(dir,'world.sqlite'));active=app;
    assert.equal((await request(url,'observe')).status,401);assert.equal((await request(url,'join',{body:null})).status,400);
    const alice=(await request(url,'join',{body:{name:'Alice'}})).value,bob=(await request(url,'join',{body:{name:'Bob'}})).value;
    const {token,player}=alice,command={action:'build.place',claimId:player.homeClaimId,type:'miner',...offsetPosition(player.home.lat,player.home.lon,30,0)};
    assert.equal((await request(url,'commands',{token:bob.token,body:command,key:'foreign-0001'})).status,403);
    const before=app.state;assert.equal((await request(url,'preview',{token,body:command})).status,200);assert.deepEqual(app.state,before);
    const results=await Promise.all(Array.from({length:3},()=>request(url,'commands',{token,body:command,key:'place-miner-0001'})));
    results.forEach(r=>{assert.equal(r.status,200);assert.deepEqual(r.value,results[0].value);});assert.equal(app.state.jobs.length,1);assert.equal(app.state.claims[0].metal,228000);
    assert.equal((await request(url,'commands',{token,body:{...command,type:'solar'},key:'place-miner-0001'})).status,409);
    const observers=await request(url,'observe',{token});assert.equal(JSON.stringify(observers).includes(token),false);assert.equal(JSON.stringify(observers).includes(bob.token),false);
    app.advance(10);const saved=app.state;await app.close();active=null;
    ({app,url}=await serve(join(dir,'world.sqlite')));active=app;assert.deepEqual(app.state,saved);
    assert.equal((await request(url,'observe',{token})).status,200);assert.deepEqual((await request(url,'commands',{token,body:command,key:'place-miner-0001'})).value,results[0].value);
    app.advance(5);assert.equal(app.state.claims[0].rock,saved.claims[0].rock+15000);
  }finally{if(active)await active.close();rmSync(dir,{recursive:true,force:true});}
});
test('concurrent conflicting construction is serialized and cannot double spend or overlap',async()=>{
  const {app,url}=await serve(':memory:');try{
    const {token,player}=(await request(url,'join',{body:{name:'Builder'}})).value;
    const body={action:'build.place',claimId:player.homeClaimId,type:'replicator',...offsetPosition(player.home.lat,player.home.lon,30,0)};
    const results=await Promise.all([request(url,'commands',{token,body,key:'command-0001'}),request(url,'commands',{token,body,key:'command-0002'})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(app.state.claims[0].metal,175000);assert.equal(app.state.jobs.length,1);
  }finally{await app.close();}
});
test('a competing world process cannot overwrite committed state',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'moon-writer-'));let a,b;
  try{
    a=(await serve(join(dir,'world.sqlite'))).app;b=(await serve(join(dir,'world.sqlite'))).app;
    a.advance(1);assert.throws(()=>b.advance(1),/Another server changed/);assert.equal(a.state.tick,1);assert.equal(b.state.tick,0);
  }finally{if(a)await a.close();if(b)await b.close();rmSync(dir,{recursive:true,force:true});}
});
test('proxy public origin configuration rejects malformed or path-bearing origins',()=>{
  for(const publicOrigin of ['https://ai-civ.com/moon-astra','ftp://ai-civ.com','https://user:secret@ai-civ.com','https://ai-civ.com?x=1'])assert.throws(()=>createWorldServer({database:':memory:',terrain:()=>0,tickMs:0,publicOrigin}),/MOON_PUBLIC_ORIGIN/);
});
