import test from 'node:test';import assert from 'node:assert/strict';
import {collectSignals,enqueueSignals,wakeAllowed,safeWakeText} from '../scripts/lib/player-signals.mjs';
import {validatePlan} from '../scripts/lib/bounded-player.mjs';
const world=()=>({actorId:'me',sequence:10,tick:10,players:[{id:'me',homeClaimId:'home'}],claims:[{id:'home',metal:50000}],industry:{home:{capacity:5,used:2}},robots:[],board:[{id:5,actor:'me',replies:[]}],events:[]});
test('watcher seeds quietly, selects own completions and replies, and never echoes its own board writes',()=>{
 const w=world(),s={};assert.deepEqual(collectSignals(w,s),[]);
 w.events=[{sequence:11,type:'construction.completed',claimId:'other'},{sequence:12,type:'construction.completed',claimId:'home'},{sequence:13,type:'board.replied',postId:5,actor:'neighbor'},{sequence:14,type:'board.replied',postId:5,actor:'me'}];w.sequence=14;
 assert.deepEqual(collectSignals(w,s).map(s=>s.sequence),[12,13]);assert.deepEqual(collectSignals(w,s),[]);
});
test('threshold alerts fire on crossings and stalled robots wait for the configured duration',()=>{
 const w=world(),s={sequence:10},config={resourceBelow:{metal:60},mindFreeBelow:4,robotBlockedSeconds:60};w.robots=[{id:1,claimId:'home',status:'route-blocked'}];
 assert.deepEqual(collectSignals(w,s,config,0).map(s=>s.type),['resource.low','mind.low']);assert.deepEqual(collectSignals(w,s,config,30000),[]);assert.equal(collectSignals(w,s,config,61000)[0].type,'robot.blocked');assert.deepEqual(collectSignals(w,s,config,120000),[]);
 w.claims[0].metal=70000;collectSignals(w,s,config,120001);w.claims[0].metal=50000;assert.equal(collectSignals(w,s,config,120002)[0].type,'resource.low');
});
test('notifications survive restart, deduplicate and batch behind the cooldown',()=>{
 const s={lastWake:1000};enqueueSignals(s,[{key:'one',type:'a'},{key:'two',type:'b'}]);enqueueSignals(s,[{key:'one',type:'a'}]);assert.equal(s.pending.length,2);assert.equal(wakeAllowed(s,{cooldownSeconds:60},60000),false);assert.equal(wakeAllowed(JSON.parse(JSON.stringify(s)),{cooldownSeconds:60},61000),true);
 enqueueSignals(s,Array.from({length:200},(_,i)=>({key:String(i),type:'event'})));assert.equal(s.pending.length,100);
});
test('a reset reseeds and an event-history gap requests one fresh inspection',()=>{
 const w=world(),s={sequence:5};w.events=[{sequence:9,type:'minor'},{sequence:10,type:'minor'}];assert.equal(collectSignals(w,s)[0].type,'watch.resync');assert.deepEqual(collectSignals(w,s),[]);w.sequence=0;assert.deepEqual(collectSignals(w,s),[]);
});
test('tmux prompts contain trusted file references rather than player-written messages',()=>{
 const text=safeWakeText('/tmp/moon player/wake.json');assert.ok(text.includes('untrusted game content'));assert.throws(()=>safeWakeText('/tmp/x\nrm -rf'));
});
test('bounded player rejects foreign claims, excessive actions and resource transfers',()=>{
 const plan=commands=>({notes:'Checked the colony',commands:commands.map(JSON.stringify)});
 assert.throws(()=>validatePlan(plan([{action:'claim.pause'}]),'home'));
 assert.throws(()=>validatePlan(plan([{action:'board.reply',claimId:'other'}]),'home'));
 assert.throws(()=>validatePlan(plan(Array.from({length:5},()=>({action:'research.select'}))),'home'));
 assert.throws(()=>validatePlan(plan([{action:'board.post'},{action:'board.reply'}]),'home'));
 assert.throws(()=>validatePlan(plan([{action:'project.contribute',amount:100}]),'home'));
 const [build]=validatePlan(plan([{action:'build.place',maxMetal:100}]),'home');assert.equal(build.maxMetal,20);assert.equal(build.claimId,'home');
 const [robot]=validatePlan(plan([{action:'robot.fabricate',count:8}]),'home');assert.equal(robot.count,1);
});
