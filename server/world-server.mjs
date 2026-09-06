import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,createReadStream,statSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {freshSharedWorld,addPlayer,applyCommand,stepWorld,observe,preview,GameError,RULESET,BUILD_TIME,BLUEPRINT,migrateEconomy} from '../src/shared-world.js';
import {ECONOMY_VERSION,PRODUCTION,MIND} from '../src/industry.js';
import {TYPES} from '../src/simulation.js';
import {WORLD_VERSION,ROBOTS,TECH,DESIGNS,PROJECTS,STAGES,LIMITS,ACTIONS} from '../src/foundry/catalog.js';
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
  if(database!==':memory:'&&existsSync(database)){
    const probe=new DatabaseSync(database,{readOnly:true});
    try{const tables=probe.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='world'").all();
      if(!tables.length)throw Error('Existing database has no world table. Refusing to initialize over it.');
      const row=probe.prepare('SELECT data FROM world WHERE id=1').get();const state=row&&JSON.parse(row.data);
      if(!state||state.version!==WORLD_VERSION||state.ruleset!==RULESET||state.economyVersion!==ECONOMY_VERSION)throw Error('This database belongs to another ruleset. Foundry requires a separate fresh database.');
    }finally{probe.close();}
  }
  const db=new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS delegations (id TEXT PRIMARY KEY, actor TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, scopes TEXT NOT NULL, expires INTEGER NOT NULL, remaining INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, tick INTEGER NOT NULL, actor TEXT NOT NULL, delegation TEXT, action TEXT NOT NULL, command_key TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts (actor TEXT NOT NULL, key TEXT NOT NULL, digest TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(actor,key));`);
  const saved=db.prepare('SELECT data FROM world WHERE id=1').get();
  let world=saved?JSON.parse(saved.data):freshSharedWorld();
  if(world.version!==WORLD_VERSION||world.ruleset!==RULESET)throw Error('Unsupported saved world. Preserve the database and use its matching ruleset.');
  const save=db.prepare('INSERT INTO world(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data');
  if(!saved)save.run(JSON.stringify(world));
  const viewers=new Map(),buckets=new Map(),timings=[],started=performance.now();let failed=false,commandCount=0;
  const cpuStarted=process.cpuUsage();
  function commit(next,extra=()=>{}){const began=performance.now();db.exec('BEGIN IMMEDIATE');try{
    // Fail closed if a second process opens this database: never overwrite its world.
    if(db.prepare('SELECT data FROM world WHERE id=1').get().data!==JSON.stringify(world))throw Error('Another server changed this database. Run one world process per database.');
    extra();save.run(JSON.stringify(next));db.exec('COMMIT');world=next;timings.push(performance.now()-began);if(timings.length>120)timings.shift();
  }catch(e){db.exec('ROLLBACK');failed=true;throw e;}}
  try{const migrated=structuredClone(world);if(migrateEconomy(migrated))commit(migrated);}catch(e){db.close();throw e;}
  function broadcast(){for(const [res,view] of viewers){const actor=view.actor;if(view.delegation){const d=db.prepare('SELECT revoked,expires FROM delegations WHERE id=?').get(view.delegation);if(!d||d.revoked||d.expires<=Date.now()){res.end();viewers.delete(res);continue;}}if(res.writableLength>1024*1024){res.end();viewers.delete(res);continue;}res.write(`event: snapshot\nid: ${world.sequence}\ndata: ${JSON.stringify(observe(world,actor))}\n\n`);}}
  function rate(id){
    const now=Date.now();let b=buckets.get(id);if(!b||now-b.start>10000){b={start:now,n:0};buckets.set(id,b);}
    if(++b.n>100)throw new GameError('RATE_LIMITED','Use fewer than 100 requests per 10 seconds',429);
    if(buckets.size>1000)for(const [key,value] of buckets)if(now-value.start>10000)buckets.delete(key);
  }
  function authenticate(req){
    const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'');if(!match)throw new GameError('UNAUTHORIZED','A game access token is required',401);
    const digest=hash(match[1]),row=db.prepare('SELECT id FROM identities WHERE token_hash=?').get(digest);if(row)return {id:row.id,delegation:null};
    const d=db.prepare('SELECT * FROM delegations WHERE token_hash=?').get(digest);
    if(!d||d.revoked||d.expires<=Date.now())throw new GameError('UNAUTHORIZED','Access token is unrecognized, revoked, or expired',401);
    return {id:d.actor,delegation:d,scopes:JSON.parse(d.scopes)};
  }
  const scopes={board:['board.post','board.reply','board.close'],build:['build.place','blueprint.deploy','build.cancel'],logistics:['freight.transfer','shipment.send','project.contribute'],research:['research.select','design.certify'],crew:['crew.configure','crew.lend','robot.fabricate','robot.recondition']};
  function authorize(access,input){if(!access.delegation)return;
    if(!access.scopes.some(s=>scopes[s]?.includes(input?.action)))throw new GameError('SCOPE_DENIED','This delegated token cannot perform that action',403);
    if(input.claimId!==world.players.find(p=>p.id===access.id).homeClaimId)throw new GameError('SCOPE_DENIED','Delegated tokens are limited to their owner’s home settlement',403);
  }
  function metrics(){const sorted=[...timings].sort((a,b)=>a-b),cpu=process.cpuUsage(cpuStarted),memory=process.memoryUsage();return {ruleset:RULESET,tick:world.tick,healthy:!failed,uptimeSeconds:Math.floor((performance.now()-started)/1000),commitMs:{samples:sorted.length,p50:sorted[Math.floor(sorted.length*.5)]||0,p95:sorted[Math.floor(sorted.length*.95)]||0,max:sorted.at(-1)||0},memoryBytes:{rss:memory.rss,heapUsed:memory.heapUsed},cpuSeconds:(cpu.user+cpu.system)/1e6,commandsSinceStart:commandCount,activeStreams:viewers.size,worldBytes:Buffer.byteLength(JSON.stringify(world)),counts:{players:world.players.length,machines:world.machines.length,robots:world.robots.length,sites:world.jobs.length,freight:world.freight.length,blockedRobots:world.robots.filter(r=>['route-blocked','yielding','mind-limited','needs-service'].includes(r.status)).length},limits:LIMITS};}
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      if(req.method!=='GET'&&req.headers.origin){
        let origin;try{origin=new URL(req.headers.origin);}catch{throw new GameError('ORIGIN_REJECTED','Use the same game origin',403);}
        if(origin.origin!==publicOrigin&&origin.host!==req.headers.host)throw new GameError('ORIGIN_REJECTED','Use the same game origin',403);
      }
      if(path==='/api/v1/health')return json(res,failed?503:200,{ok:!failed,ruleset:RULESET,economyVersion:world.economyVersion,tick:world.tick,players:world.players.length});
      if(path==='/api/v1/catalog')return json(res,200,{ruleset:RULESET,economyVersion:ECONOMY_VERSION,unit:'Inventory is integer milli-units; command amounts use whole resource units. One tick is one simulation second.',production:PRODUCTION,mind:MIND,types:TYPES,robots:ROBOTS,technologies:TECH,designProfiles:DESIGNS,projectTemplates:PROJECTS,constructionStages:STAGES,assemblyWork:BUILD_TIME,blueprint:BLUEPRINT,actions:ACTIONS,limits:LIMITS,whitepaper:'https://ai-civ.com/moon-astra-whitepaper/'});
      if(path==='/api/v1/join'&&req.method==='POST'){
        rate(`join:${req.socket.remoteAddress}`);const input=await body(req);
        if(failed)throw new GameError('WORLD_PAUSED','Persistence is unavailable',503);
        const token=randomBytes(32).toString('hex'),id='p_'+randomBytes(8).toString('hex'),next=structuredClone(world);
        const p=addPlayer(next,id,input?.name);commit(next,()=>db.prepare('INSERT INTO identities(id,token_hash) VALUES(?,?)').run(id,hash(token)));
        broadcast();return json(res,201,{token,player:p,observation:observe(world,id)});
      }
      if(path.startsWith('/api/')){
        const access=authenticate(req),actor=access.id;rate(access.delegation?.id||actor);
        if(path==='/api/v1/metrics'&&req.method==='GET')return json(res,200,metrics());
        if(path==='/api/v1/audit'&&req.method==='GET')return json(res,200,{entries:db.prepare('SELECT tick,delegation,action,command_key FROM audit WHERE actor=? ORDER BY id DESC LIMIT 100').all(actor)});
        if(path==='/api/v1/access'&&req.method==='GET'){if(access.delegation)throw new GameError('SCOPE_DENIED','Use the owner token to manage access',403);return json(res,200,{delegations:db.prepare('SELECT id,name,scopes,expires,remaining,revoked FROM delegations WHERE actor=?').all(actor)});}
        if(path==='/api/v1/access/delegate'&&req.method==='POST'){
          if(access.delegation)throw new GameError('SCOPE_DENIED','Only the owner can delegate access',403);
          if(failed)throw new GameError('WORLD_PAUSED','Persistence is unavailable',503);const input=await body(req);
          if(!input||typeof input.name!=='string'||input.name.length<1||input.name.length>40||!Array.isArray(input.scopes)||!input.scopes.length||input.scopes.some(s=>!['observe',...Object.keys(scopes)].includes(s))||!Number.isSafeInteger(input.ttlSeconds)||input.ttlSeconds<60||input.ttlSeconds>604800||!Number.isSafeInteger(input.commandLimit)||input.commandLimit<1||input.commandLimit>1000)throw new GameError('INVALID_DELEGATION','Use a 1–40 character name, supported scopes, 60–604800 seconds and 1–1000 commands');
          if(db.prepare('SELECT count(*) AS n FROM delegations WHERE actor=? AND revoked=0 AND expires>?').get(actor,Date.now()).n>=20)throw new GameError('DELEGATION_LIMIT','Revoke old access before creating more than 20 active tokens',409);
          const token=randomBytes(32).toString('hex'),id='d_'+randomBytes(8).toString('hex'),expires=Date.now()+input.ttlSeconds*1000;commit(structuredClone(world),()=>db.prepare('INSERT INTO delegations(id,actor,token_hash,name,scopes,expires,remaining) VALUES(?,?,?,?,?,?,?)').run(id,actor,hash(token),input.name,JSON.stringify(input.scopes),expires,input.commandLimit));
          return json(res,201,{id,token,expires,remaining:input.commandLimit,scopes:input.scopes});
        }
        if(path==='/api/v1/access/revoke'&&req.method==='POST'){
          if(access.delegation)throw new GameError('SCOPE_DENIED','Only the owner can revoke access',403);if(failed)throw new GameError('WORLD_PAUSED','Persistence is unavailable',503);const input=await body(req);
          if(typeof input?.id!=='string')throw new GameError('INVALID_DELEGATION','Supply a delegation id');
          commit(structuredClone(world),()=>db.prepare('UPDATE delegations SET revoked=1 WHERE id=? AND actor=?').run(input.id,actor));broadcast();return json(res,200,{ok:true,id:input.id});
        }
        if(path==='/api/v1/observe'&&req.method==='GET')return json(res,200,observe(world,actor));
        if(path==='/api/v1/events'&&req.method==='GET'){
          const after=Number(url.searchParams.get('after')||0);
          if(!Number.isSafeInteger(after)||after<0)throw new GameError('INVALID_CURSOR','Use a nonnegative event sequence');
          return json(res,200,{events:world.events.filter(e=>e.sequence>after),sequence:world.sequence,resyncRequired:after>0&&after<(world.events[0]?.sequence||0)-1});
        }
        if(path==='/api/v1/stream'&&req.method==='GET'){
          const active=[...viewers.values()].filter(p=>p.actor===actor).length;if(active>=4)throw new GameError('STREAM_LIMIT','Use at most four live views per player',429);
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
          viewers.set(res,{actor,delegation:access.delegation?.id||null});res.write(`event: snapshot\ndata: ${JSON.stringify(observe(world,actor))}\n\n`);
          res.on('close',()=>viewers.delete(res));return;
        }
        if(path==='/api/v1/preview'&&req.method==='POST'){const input=await body(req);authorize(access,input);return json(res,200,preview(world,actor,input,{terrain}));}
        if(path==='/api/v1/commands'&&req.method==='POST'){
          if(failed)throw new GameError('WORLD_PAUSED','Persistence failed. The world is paused for recovery.',503);
          const input=await body(req),key=req.headers['idempotency-key'];
          if(typeof key!=='string'||!/^[a-zA-Z0-9_.:-]{8,128}$/.test(key))throw new GameError('IDEMPOTENCY_REQUIRED','Supply an Idempotency-Key containing 8–128 letters, digits, dots, colons, dashes, or underscores');
          authorize(access,input);const receiptActor=access.delegation?actor+':'+access.delegation.id:actor;
          const digest=hash(JSON.stringify(input)),old=db.prepare('SELECT digest,data FROM receipts WHERE actor=? AND key=?').get(receiptActor,key);
          if(old){if(old.digest!==digest)throw new GameError('IDEMPOTENCY_CONFLICT','This command key belongs to a different request',409);return json(res,200,JSON.parse(old.data));}
          if(access.delegation&&access.delegation.remaining<=0)throw new GameError('COMMAND_LIMIT','This delegated token has no commands remaining',403);
          const next=structuredClone(world),result=applyCommand(next,actor,input,{terrain});
          const receipt={ok:true,commandId:key,status:'applied',tick:next.tick,result};
          commit(next,()=>{db.prepare('INSERT INTO receipts(actor,key,digest,data) VALUES(?,?,?,?)').run(receiptActor,key,digest,JSON.stringify(receipt));db.prepare('INSERT INTO audit(tick,actor,delegation,action,command_key) VALUES(?,?,?,?,?)').run(next.tick,actor,access.delegation?.id||null,input.action,key);if(access.delegation)db.prepare('UPDATE delegations SET remaining=remaining-1 WHERE id=?').run(access.delegation.id);});commandCount++;
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
  const production=process.argv.includes('--production'),port=Number(process.env.MOON_PORT||(production?4205:4206));
  const app=createWorldServer({database:process.env.MOON_DB||resolve(ROOT,'.world/world.sqlite'),serveStatic:production,publicOrigin:process.env.MOON_PUBLIC_ORIGIN});
  app.server.listen(port,process.env.MOON_HOST||'127.0.0.1',()=>console.log(`MOON Foundry ${production?'game':'API'} ready on http://localhost:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
