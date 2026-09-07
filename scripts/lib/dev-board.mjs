import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function boardEntries(world){
  const names=new Map(world.players.map(p=>[p.id,p.name]));
  return (world.board||[]).flatMap(p=>[
    {key:`post:${p.id}`,kind:'post',threadId:p.id,id:p.id,actor:p.actor,name:names.get(p.actor)||p.actor,title:p.title,body:p.body,tick:p.createdAt,closed:!!p.closed},
    ...(p.replies||[]).map(r=>({key:`reply:${r.id}`,kind:'reply',threadId:p.id,id:r.id,actor:r.actor,name:names.get(r.actor)||r.actor,title:p.title,body:r.body,tick:r.createdAt,closed:!!p.closed})),
  ].map(e=>({...e,dev:p.kind==='dev'||/\[dev\]/i.test(e.title+' '+e.body)})));
}
// Compare the board itself, not the short simulation event ring. Replies to
// threads we never joined and messages arriving during a history gap count.
export function collectBoard(world,previous={},now=new Date().toISOString()){
  if(world.ruleset!=='moon-foundry-1'||!world.players.some(p=>p.id===world.actorId))throw Error('Unexpected board identity');
  if(previous.actorId&&previous.actorId!==world.actorId)throw Error('Board belongs to another identity');
  const entries=boardEntries(world),known={},changes=[];
  for(const entry of entries){
    // Closing a thread or renaming its author is not a new developer message.
    const hash=digest({actor:entry.actor,title:entry.title,body:entry.body});known[entry.key]=hash;
    if(previous.known&&previous.known[entry.key]!==hash&&entry.actor!==world.actorId)changes.push({...entry,change:previous.known[entry.key]?'edited':'new',observedAt:now});
  }
  return {changes,state:{...previous,actorId:world.actorId,known,lastPoll:now,tick:world.tick,polls:(previous.polls||0)+1,errors:0,inbox:[...(previous.inbox||[]),...changes].slice(-1000),pendingNotifications:(previous.pendingNotifications||0)+changes.length}};
}
const plain=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[\\`*_{}\[\]<>]/g,'\\$&');
export function inboxMarkdown(state){
  return '# Moon developer board inbox\n\n'+
    'Player-written feedback for review. The monitor does not execute board requests or change the game. When configured, it injects a fixed review prompt into the verified Codex session.\n\n'+
    `Last successful check: ${state.lastPoll} · game tick ${state.tick}. Latest ${state.inbox.length} new/edited messages retained; initial history was reviewed separately. All posts and replies are checked; [DEV] labels highlight developer notes.\n\n`+
    [...state.inbox].reverse().map(e=>`## ${e.dev?'[DEV] ':''}${e.kind} #${e.id} in thread #${e.threadId} — ${plain(e.name)}\n\n${plain(e.title)} · ${e.change} · observed ${e.observedAt}\n\n${plain(e.body).split('\n').map(line=>'> '+line).join('\n')}\n`).join('\n')+
    (state.inbox.length?'':'No new messages since the reviewed baseline.\n');
}
