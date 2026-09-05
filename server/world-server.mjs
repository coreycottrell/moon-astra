import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,createReadStream,statSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,observe,preview,GameError,RULESET,BUILD_TIME,BLUEPRINT} from '../src/shared-world.js';
import {TYPES} from '../src/simulation.js';
import {LunarData,direction} from '../src/geography.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=s=>createHash('sha256').update(s).digest('hex');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new GameError('JSON_REQUIRED','Use application/json',415);
  let bytes=0,parts=[];
  for await(const p of req){bytes+=p.length;if(bytes>16384)throw new GameError('BODY_TOO_LARGE','Commands are limited to 16 KB',413);parts.push(p);}
  try{return JSON.parse(Buffer.concat(parts).toString());}catch{throw new GameError('INVALID_JSON','The request body is not valid JSON');}
}
function loadTerrain(){
  const bytes=gunzipSync(readFileSync(resolve(ROOT,'public/data/moon-height.u16.gz')));
  const data=new LunarData(new Uint16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),5760,2880);
  return loc=>data.height(direction(loc.lat,loc.lon));
}
export function createWorldServer({database=resolve(ROOT,'.world/world.sqlite'),terrain=loadTerrain(),tickMs=1000,serveStatic=false,publicOrigin}={}){
  if(publicOrigin){const u=new URL(publicOrigin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('MOON_PUBLIC_ORIGIN must be an HTTP(S) origin without a path');publicOrigin=u.origin;}
  if(database!==':memory:')mkdirSync(dirname(database),{recursive:true,mode:0o700});
  const db=new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts (actor TEXT NOT NULL, key TEXT NOT NULL, digest TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(actor,key));`);
  const saved=db.prepare('SELECT data FROM world WHERE id=1').get();
  let world=saved?JSON.parse(saved.data):freshSharedWorld();
  if(world.version!==2||world.ruleset!==RULESET)throw Error('Unsupported saved world. Preserve the database and use its matching ruleset.');
  const save=db.prepare('INSERT INTO world(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data');
  if(!saved)save.run(JSON.stringify(world));
  const viewers=new Map(),buckets=new Map();let failed=false;
  function commit(next,extra=()=>{}){db.exec('BEGIN IMMEDIATE');try{
    // Fail closed if a second process opens this database: never overwrite its world.
    if(db.prepare('SELECT data FROM world WHERE id=1').get().data!==JSON.stringify(world))throw Error('Another server changed this database. Run one world process per database.');
    extra();save.run(JSON.stringify(next));db.exec('COMMIT');world=next;
  }catch(e){db.exec('ROLLBACK');failed=true;throw e;}}
  function broadcast(){for(const [res,actor] of viewers){if(res.writableLength>1024*1024){res.end();viewers.delete(res);continue;}res.write(`event: snapshot\nid: ${world.sequence}\ndata: ${JSON.stringify(observe(world,actor))}\n\n`);}}
  function rate(id){
    const now=Date.now();let b=buckets.get(id);if(!b||now-b.start>10000){b={start:now,n:0};buckets.set(id,b);}
    if(++b.n>100)throw new GameError('RATE_LIMITED','Use fewer than 100 requests per 10 seconds',429);
    if(buckets.size>1000)for(const [key,value] of buckets)if(now-value.start>10000)buckets.delete(key);
  }
  function authenticate(req){const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'');if(!match)throw new GameError('UNAUTHORIZED','A game access token is required',401);const row=db.prepare('SELECT id FROM identities WHERE token_hash=?').get(hash(match[1]));if(!row)throw new GameError('UNAUTHORIZED','Access token not recognized',401);return row.id;}
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      if(req.method!=='GET'&&req.headers.origin){
        let origin;try{origin=new URL(req.headers.origin);}catch{throw new GameError('ORIGIN_REJECTED','Use the same game origin',403);}
        if(origin.origin!==publicOrigin&&origin.host!==req.headers.host)throw new GameError('ORIGIN_REJECTED','Use the same game origin',403);
      }
      if(path==='/api/v1/health')return json(res,failed?503:200,{ok:!failed,ruleset:RULESET,tick:world.tick,players:world.players.length});
      if(path==='/api/v1/catalog')return json(res,200,{ruleset:RULESET,unit:'metal and rock quantities use milli-units internally; command amounts use whole metal units',types:TYPES,constructionSeconds:BUILD_TIME,blueprint:BLUEPRINT,actions:['build.place','blueprint.deploy','replicator.configure','shipment.send','project.contribute','claim.pause','claim.grant','claim.revoke']});
      if(path==='/api/v1/join'&&req.method==='POST'){
        rate(`join:${req.socket.remoteAddress}`);const input=await body(req);
        if(failed)throw new GameError('WORLD_PAUSED','Persistence is unavailable',503);
        const token=randomBytes(32).toString('hex'),id='p_'+randomBytes(8).toString('hex'),next=structuredClone(world);
        const p=addPlayer(next,id,input?.name);commit(next,()=>db.prepare('INSERT INTO identities(id,token_hash) VALUES(?,?)').run(id,hash(token)));
        broadcast();return json(res,201,{token,player:p,observation:observe(world,id)});
      }
      if(path.startsWith('/api/')){
        const actor=authenticate(req);rate(actor);
        if(path==='/api/v1/observe'&&req.method==='GET')return json(res,200,observe(world,actor));
        if(path==='/api/v1/events'&&req.method==='GET'){
          const after=Number(url.searchParams.get('after')||0);
          if(!Number.isSafeInteger(after)||after<0)throw new GameError('INVALID_CURSOR','Use a nonnegative event sequence');
          return json(res,200,{events:world.events.filter(e=>e.sequence>after),sequence:world.sequence,resyncRequired:after>0&&after<(world.events[0]?.sequence||0)-1});
        }
        if(path==='/api/v1/stream'&&req.method==='GET'){
          const active=[...viewers.values()].filter(p=>p===actor).length;if(active>=4)throw new GameError('STREAM_LIMIT','Use at most four live views per player',429);
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
          viewers.set(res,actor);res.write(`event: snapshot\ndata: ${JSON.stringify(observe(world,actor))}\n\n`);
          res.on('close',()=>viewers.delete(res));return;
        }
        if(path==='/api/v1/preview'&&req.method==='POST')return json(res,200,preview(world,actor,await body(req),{terrain}));
        if(path==='/api/v1/commands'&&req.method==='POST'){
          if(failed)throw new GameError('WORLD_PAUSED','Persistence failed. The world is paused for recovery.',503);
          const input=await body(req),key=req.headers['idempotency-key'];
          if(typeof key!=='string'||!/^[a-zA-Z0-9_.:-]{8,128}$/.test(key))throw new GameError('IDEMPOTENCY_REQUIRED','Supply an Idempotency-Key containing 8–128 letters, digits, dots, colons, dashes, or underscores');
          const digest=hash(JSON.stringify(input)),old=db.prepare('SELECT digest,data FROM receipts WHERE actor=? AND key=?').get(actor,key);
          if(old){if(old.digest!==digest)throw new GameError('IDEMPOTENCY_CONFLICT','This command key belongs to a different request',409);return json(res,200,JSON.parse(old.data));}
          const next=structuredClone(world),result=applyCommand(next,actor,input,{terrain});
          const receipt={ok:true,commandId:key,status:'applied',tick:next.tick,result};
          commit(next,()=>db.prepare('INSERT INTO receipts(actor,key,digest,data) VALUES(?,?,?,?)').run(actor,key,digest,JSON.stringify(receipt)));
          broadcast();return json(res,200,receipt);
        }
        throw new GameError('NOT_FOUND','API endpoint not found',404);
      }
      if(serveStatic&&req.method==='GET'){
        const base=resolve(ROOT,'dist'),file=resolve(base,'.'+decodeURIComponent(path==='/'?'/index.html':path));
        if(!file.startsWith(base+sep)||!existsSync(file)||!statSync(file).isFile())return json(res,404,{error:'NOT_FOUND'});
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.gz':'application/gzip'};
        res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});createReadStream(file).pipe(res);return;
      }
      json(res,404,{error:'NOT_FOUND'});
    }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.code||'SERVER_ERROR',message:e instanceof GameError?e.message:'The world could not process this request'});else res.end();if(!(e instanceof GameError))console.error(e);}
  });
  const timer=tickMs>0?setInterval(()=>{
    if(failed)return;
    try{const next=structuredClone(world);stepWorld(next,{terrain});commit(next);broadcast();}catch(e){failed=true;console.error('World paused after persistence/simulation failure',e);}
  },tickMs):null;
  return {server,get state(){return structuredClone(world);},advance(n=1){for(let i=0;i<n;i++){const next=structuredClone(world);stepWorld(next,{terrain});commit(next);}broadcast();},async close(){if(timer)clearInterval(timer);for(const res of viewers.keys())res.end();await new Promise(resolve=>server.close(resolve));db.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const production=process.argv.includes('--production'),port=Number(process.env.MOON_PORT||(production?4175:4176));
  const app=createWorldServer({database:process.env.MOON_DB||resolve(ROOT,'.world/world.sqlite'),serveStatic:production,publicOrigin:process.env.MOON_PUBLIC_ORIGIN});
  app.server.listen(port,process.env.MOON_HOST||'127.0.0.1',()=>console.log(`MOON civilization ${production?'game':'API'} ready on http://localhost:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
