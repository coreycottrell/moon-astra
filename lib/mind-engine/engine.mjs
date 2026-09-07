import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {snapshot,digest} from './snapshot.mjs';
import {canonical,capability,requestFor,validateResponse,verifiedSummary} from './protocol.mjs';

export class EngineError extends Error {constructor(code,message){super(message);this.code=code;}}
const fail=(code,message)=>{throw new EngineError(code,message);};
const data=x=>JSON.stringify(x);
const parse=x=>x?JSON.parse(x):null;
function bounded(work,signal){
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(new EngineError('ANALYSIS_INTERRUPTED','Analysis timed out or was cancelled'));
    if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});
    Promise.resolve().then(work).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export class MindEngine {
  constructor({path=':memory:',skills,clock=Date.now,timeoutMs=75000,maxSnapshotAgeMs=900000,maxConcurrent=2,ownerConcurrent=1,ownerDailyCalls=12,worldDailyCalls=40}={}){
    if(!Array.isArray(skills)||!skills.length||new Set(skills.map(s=>s.id)).size!==skills.length)throw Error('Register unique trusted skills');
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS mind_jobs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,skill TEXT NOT NULL,version INTEGER NOT NULL,state TEXT NOT NULL,request TEXT NOT NULL,response TEXT,summary TEXT,validation TEXT,error TEXT,created INTEGER NOT NULL,updated INTEGER NOT NULL,lease_token TEXT,lease_until INTEGER,mind REAL NOT NULL DEFAULT 0,UNIQUE(owner,request_key));
      CREATE TABLE IF NOT EXISTS mind_attempts(id TEXT PRIMARY KEY,job TEXT NOT NULL,owner TEXT NOT NULL,day TEXT NOT NULL,started INTEGER NOT NULL,usage TEXT);
      CREATE TABLE IF NOT EXISTS mind_episodes(id TEXT PRIMARY KEY,owner TEXT NOT NULL,job TEXT NOT NULL UNIQUE,skill TEXT NOT NULL,version INTEGER NOT NULL,domain TEXT NOT NULL,ruleset TEXT NOT NULL,context_key TEXT NOT NULL,created INTEGER NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mind_events(id INTEGER PRIMARY KEY,job TEXT NOT NULL,at INTEGER NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);`);
    this.db.exec('CREATE TABLE IF NOT EXISTS mind_observations(id TEXT PRIMARY KEY,owner TEXT NOT NULL,domain TEXT NOT NULL,ruleset TEXT NOT NULL,tick INTEGER NOT NULL,created INTEGER NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS mind_support(owner TEXT PRIMARY KEY,data TEXT NOT NULL,updated INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS mind_measurements(job TEXT PRIMARY KEY,owner TEXT NOT NULL,episode_id TEXT NOT NULL);');
    Object.assign(this,{clock,timeoutMs,maxSnapshotAgeMs,maxConcurrent,ownerConcurrent,ownerDailyCalls,worldDailyCalls});
    this.skills=new Map(skills.map(s=>[s.id,s]));this.pending=new Map();this.closed=false;
    this.recover();
  }
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  event(job,kind,detail={}){this.db.prepare('INSERT INTO mind_events(job,at,kind,detail) VALUES(?,?,?,?)').run(job,this.clock(),kind,data(detail));}
  row(id,owner){const r=this.db.prepare('SELECT * FROM mind_jobs WHERE id=? AND owner=?').get(id,owner);if(!r)fail('NOT_FOUND','Job not found for this owner');return r;}
  get(id,owner){const r=this.row(id,owner);return {id:r.id,owner:r.owner,skill:r.skill,version:r.version,state:r.state,created:r.created,updated:r.updated,reservedMind:r.mind,error:r.error,request:parse(r.request),response:parse(r.response),summary:parse(r.summary),validation:parse(r.validation)};}
  list(owner){return this.db.prepare('SELECT id,skill,state,created,updated,mind AS reservedMind,error FROM mind_jobs WHERE owner=? ORDER BY created DESC LIMIT 100').all(owner);}
  audit(id,owner){this.row(id,owner);return this.db.prepare('SELECT at,kind,detail FROM mind_events WHERE job=? ORDER BY id').all(id).map(e=>({...e,detail:parse(e.detail)}));}
  recover(){
    const rows=this.db.prepare("SELECT id FROM mind_jobs WHERE state='analyzing' AND lease_until<=?").all(this.clock());
    for(const r of rows){this.db.prepare("UPDATE mind_jobs SET state='interrupted',error='WORKER_LEASE_EXPIRED',lease_token=NULL,lease_until=NULL,mind=0,updated=? WHERE id=? AND state='analyzing' AND lease_until<=?").run(this.clock(),r.id,this.clock());this.event(r.id,'interrupted',{reason:'Worker lease expired; no automatic provider retry'});}
  }
  observe(observation){
    const {protocol,id,...input}=observation||{},s=snapshot(input);
    this.transaction(()=>{
      this.db.prepare('INSERT OR IGNORE INTO mind_observations(id,owner,domain,ruleset,tick,created,data) VALUES(?,?,?,?,?,?,?)').run(s.id,s.ownerId,s.domain,s.ruleset,s.tick,this.clock(),data(s));
      // Keep a bounded observation window. Job requests retain their own evidence.
      this.db.prepare('DELETE FROM mind_observations WHERE owner=? AND id NOT IN (SELECT id FROM mind_observations WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 300)').run(s.ownerId,s.ownerId);
    });return s;
  }
  observationWindow(owner,domain,ruleset){return this.db.prepare('SELECT data FROM mind_observations WHERE owner=? AND domain=? AND ruleset=? ORDER BY tick,created LIMIT 300').all(owner,domain,ruleset).map(r=>parse(r.data));}
  updateSupport(owner,support){
    if(!capability(0,support).ok)fail('INVALID_CAPACITY','Provide nonnegative supported nodes, free mind and research level');
    this.db.prepare('INSERT INTO mind_support(owner,data,updated) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data,updated=excluded.updated').run(owner,data(support),this.clock());
    let reserved=0;const interrupted=[];
    for(const row of this.db.prepare("SELECT * FROM mind_jobs WHERE owner=? AND state='analyzing' ORDER BY created,id").all(owner)){
      const skill=this.skills.get(row.skill),gate=capability(skill.level,support,reserved);
      if(gate.ok){reserved+=row.mind;continue;}
      this.db.prepare("UPDATE mind_jobs SET state='interrupted',error='CAPACITY_LOST',lease_token=NULL,lease_until=NULL,mind=0,updated=? WHERE id=?").run(this.clock(),row.id);
      this.pending.get(row.id)?.abort();this.event(row.id,'interrupted',{reason:gate.reason});interrupted.push(row.id);
    }return {reservedMind:reserved,interrupted};
  }
  memories(owner,s,skill){
    const key=skill.contextKey?.(s)||s.id;
    return this.db.prepare('SELECT data FROM mind_episodes WHERE owner=? AND skill=? AND version=? AND domain=? AND ruleset=? AND context_key=? ORDER BY created DESC LIMIT 40').all(owner,skill.id,skill.version,s.domain,s.ruleset,key).map(r=>parse(r.data));
  }
  submit({owner,key,skillId,observation}){
    if(this.closed)fail('CLOSED','Engine is closed');
    const skill=this.skills.get(skillId);if(!skill)fail('UNKNOWN_SKILL','Skill is not registered');
    if(typeof owner!=='string'||typeof key!=='string'||!/^[a-zA-Z0-9_.:-]{8,128}$/.test(key))fail('INVALID_KEY','Supply an owner and an 8–128 character idempotency key');
    const {protocol,id,...input}=observation||{};const s=snapshot(input);
    if(s.ownerId!==owner)fail('OWNER_MISMATCH','Observation belongs to a different owner');
    const fingerprint=digest({snapshot:s,skill:skill.id,version:skill.version});
    this.observe(s);
    return this.transaction(()=>{
      const existing=this.db.prepare('SELECT id,fingerprint FROM mind_jobs WHERE owner=? AND request_key=?').get(owner,key);
      if(existing){if(existing.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT','This key already names a different request');return this.get(existing.id,owner);}
      if(skill.domains&&!skill.domains.includes(s.domain))fail('DOMAIN_MISMATCH','Skill does not accept this domain');
      const age=this.clock()-Date.parse(s.observedAt);if(age>this.maxSnapshotAgeMs||age< -60000)fail('STALE_OBSERVATION','Capture a fresh observation');
      const request=requestFor(s,skill,this.memories(owner,s,skill)),job=randomUUID(),now=this.clock();
      this.db.prepare("INSERT INTO mind_jobs(id,owner,request_key,fingerprint,skill,version,state,request,created,updated) VALUES(?,?,?,?,?,?,'queued',?,?,?)").run(job,owner,key,fingerprint,skill.id,skill.version,data(request),now,now);
      this.event(job,'queued',{snapshotId:s.id});return this.get(job,owner);
    });
  }
  async run(id,owner,provider,{currentSupport}={}){
    if(this.closed)fail('CLOSED','Engine is closed');this.recover();
    const token=randomUUID(),controller=new AbortController(),signal=AbortSignal.any([controller.signal,AbortSignal.timeout(this.timeoutMs)]);
    const started=this.transaction(()=>{
      const row=this.row(id,owner);if(row.state!=='queued')return null;
      const request=parse(row.request),skill=this.skills.get(row.skill);
      if(!skill||skill.version!==row.version)fail('SKILL_CHANGED','Registered skill version changed');
      if(this.clock()-Date.parse(request.observation.observedAt)>this.maxSnapshotAgeMs)fail('STALE_OBSERVATION','Capture a fresh observation');
      const active=this.db.prepare("SELECT owner,mind FROM mind_jobs WHERE state='analyzing'").all();
      if(active.length>=this.maxConcurrent||active.filter(j=>j.owner===owner).length>=this.ownerConcurrent)fail('BUSY','An analysis slot is busy');
      const current=this.db.prepare('SELECT data,updated FROM mind_support WHERE owner=?').get(owner);
      const support=currentSupport||(current&&this.clock()-current.updated<=this.maxSnapshotAgeMs?parse(current.data):request.observation.support);
      const gate=capability(skill.level,support,active.filter(j=>j.owner===owner).reduce((n,j)=>n+j.mind,0));if(!gate.ok)fail('CAPACITY',gate.reason);
      const day=new Date(this.clock()).toISOString().slice(0,10);
      const counts=this.db.prepare('SELECT owner,count(*) AS n FROM mind_attempts WHERE day=? GROUP BY owner').all(day);
      if(counts.reduce((n,c)=>n+c.n,0)>=this.worldDailyCalls||(counts.find(c=>c.owner===owner)?.n||0)>=this.ownerDailyCalls)fail('DAILY_BUDGET','Analysis allowance used; failed attempts also count');
      this.db.prepare("UPDATE mind_jobs SET state='analyzing',lease_token=?,lease_until=?,mind=?,updated=? WHERE id=?").run(token,this.clock()+this.timeoutMs+3000,gate.mind,this.clock(),id);
      this.db.prepare('INSERT INTO mind_attempts(id,job,owner,day,started) VALUES(?,?,?,?,?)').run(token,id,owner,day,this.clock());this.event(id,'analyzing',{reservedMind:gate.mind});return request;
    });
    if(!started)return this.get(id,owner);
    this.pending.set(id,controller);
    let result,validation,summary,state='analyzed',error=null,usage=null;
    try{
      const response=await bounded(()=>provider(started,{signal,maxOutputTokens:2048}),signal);
      usage=response?.usage||null;const raw=response?.result??response;
      if(typeof raw==='string'&&raw.length>32000)throw new EngineError('INVALID_RESPONSE','Provider response is too large');
      result=typeof raw==='string'?JSON.parse(raw):raw;
      if(canonical(result).length>32000)throw new EngineError('INVALID_RESPONSE','Provider response is too large');
      validation=validateResponse(result,started);
      if(validation.ok)summary=verifiedSummary(result,started);else{state='rejected';error='CLAIMS_REJECTED';}
    }catch(e){state=signal.aborted?'interrupted':'failed';error=e instanceof EngineError?e.code:'PROVIDER_UNAVAILABLE';}
    finally{this.pending.delete(id);}
    if(this.closed)return {id,state:'interrupted',error:'ENGINE_CLOSED'};
    return this.transaction(()=>{
      const row=this.row(id,owner);if(row.state!=='analyzing'||row.lease_token!==token||row.lease_until<=this.clock())return this.get(id,owner);
      // Store only bounded, finite JSON; provider exceptions and hidden reasoning are excluded.
      let storedResult=null;try{if(result&&canonical(result).length<=32000)storedResult=data(result);}catch{}
      this.db.prepare('UPDATE mind_jobs SET state=?,response=?,summary=?,validation=?,error=?,lease_token=NULL,lease_until=NULL,mind=0,updated=? WHERE id=?').run(state,storedResult,summary?data(summary):null,validation?data(validation):null,error,this.clock(),id);
      if(usage&&Number.isSafeInteger(usage.inputTokens)&&Number.isSafeInteger(usage.outputTokens))this.db.prepare('UPDATE mind_attempts SET usage=? WHERE id=?').run(data(usage),token);
      this.event(id,state,{error});return this.get(id,owner);
    });
  }
  cancel(id,owner){
    const r=this.row(id,owner);if(!['queued','analyzing'].includes(r.state))return this.get(id,owner);
    this.db.prepare("UPDATE mind_jobs SET state='cancelled',lease_token=NULL,lease_until=NULL,mind=0,updated=? WHERE id=?").run(this.clock(),id);
    this.pending.get(id)?.abort();this.event(id,'cancelled');return this.get(id,owner);
  }
  evaluate(id,owner){
    const r=this.row(id,owner),request=parse(r.request),skill=this.skills.get(r.skill);
    const old=this.db.prepare('SELECT e.data FROM mind_measurements m JOIN mind_episodes e ON e.id=m.episode_id WHERE m.job=? AND m.owner=?').get(id,owner);if(old)return parse(old.data);
    if(r.state!=='analyzed'||!skill?.evaluate||skill.version!==r.version)fail('NOT_EVALUATABLE','This accepted skill has no registered evaluator');
    const result=parse(r.response);if(result.decision!=='propose')fail('NO_PROPOSAL','An abstention has no intervention');
    const measured=skill.evaluate(request.observation,result.candidateId);
    if(measured.kind!=='simulated'||!Number.isFinite(measured.improvement))fail('INVALID_EVALUATOR','Expected a finite simulator result');
    const episode={id:digest({owner,domain:request.observation.domain,ruleset:request.observation.ruleset,skill:skill.id,version:skill.version,result:measured}),job:id,owner,domain:request.observation.domain,ruleset:request.observation.ruleset,skillId:skill.id,skillVersion:skill.version,
      choice:result.candidateId,scenarioKey:skill.contextKey(request.observation),evaluatorVersion:measured.evaluatorVersion,seed:measured.seed,improvement:measured.improvement,kind:measured.kind,baseline:measured.baseline,trial:measured.trial,note:measured.note};
    this.transaction(()=>{this.db.prepare('INSERT OR IGNORE INTO mind_episodes(id,owner,job,skill,version,domain,ruleset,context_key,created,data) VALUES(?,?,?,?,?,?,?,?,?,?)').run(episode.id,owner,id,skill.id,skill.version,episode.domain,episode.ruleset,episode.scenarioKey,this.clock(),data(episode));this.db.prepare('INSERT OR IGNORE INTO mind_measurements(job,owner,episode_id) VALUES(?,?,?)').run(id,owner,episode.id);this.db.prepare("UPDATE mind_jobs SET state='complete',updated=? WHERE id=?").run(this.clock(),id);this.event(id,'measured',{episodeId:episode.id,improvement:episode.improvement,kind:'simulated'});});
    return parse(this.db.prepare('SELECT data FROM mind_episodes WHERE id=? AND owner=?').get(episode.id,owner).data);
  }
  close(){for(const [id,c]of this.pending){c.abort();this.db.prepare("UPDATE mind_jobs SET state='interrupted',error='ENGINE_CLOSED',lease_token=NULL,lease_until=NULL,mind=0,updated=? WHERE id=? AND state='analyzing'").run(this.clock(),id);}this.closed=true;this.db.close();}
}
