import test from 'node:test';
import assert from 'node:assert/strict';
import {collectBoard,inboxMarkdown} from '../scripts/lib/dev-board.mjs';
const world=()=>({ruleset:'moon-foundry-1',actorId:'me',tick:40,players:[{id:'me',name:'Codex'},{id:'p2',name:'Corey'}],board:[{id:10,actor:'p2',title:'An older thread',body:'Existing note',createdAt:20,replies:[]}]});
test('seed is quiet; unrelated-thread replies are captured once across restart without events',()=>{
 const w=world(),first=collectBoard(w);assert.equal(first.changes.length,0);
 w.board[0].replies.push({id:15,actor:'p2',body:'[DEV] New bug report',createdAt:41});
 const second=collectBoard(w,JSON.parse(JSON.stringify(first.state)));assert.equal(second.changes.length,1);assert.equal(second.changes[0].dev,true);
 const third=collectBoard(w,JSON.parse(JSON.stringify(second.state)));assert.equal(third.changes.length,0);assert.equal(third.state.inbox.length,1);
});
test('own announcements and thread closure stay quiet; edits and replies to own posts are retained',()=>{
 const w=world();let s=collectBoard(w).state;
 w.board.push({id:20,actor:'me',title:'[DEV] Inbox',body:'Announcement',createdAt:41,replies:[]});w.board[0].closed=true;
 let r=collectBoard(w,s);assert.equal(r.changes.length,0);s=r.state;
 w.board[0].body='Corrected reproduction report';w.board[1].replies.push({id:21,actor:'p2',body:'Please check the queue',createdAt:42});
 r=collectBoard(w,s);assert.equal(r.changes.length,2);assert.equal(r.changes[0].change,'edited');assert.equal(r.changes[1].dev,true);
 assert.equal(collectBoard(w,r.state).changes.length,0);
});
test('unsafe text is inert in the inbox and a different account cannot reuse its baseline',()=>{
 const w=world(),s=collectBoard(w).state;w.board[0].body='[DEV] <script>bad()</script>\n$(unsafe)';
 const r=collectBoard(w,s),md=inboxMarkdown(r.state);assert.ok(md.includes('> \\[DEV\\] \\<script\\>'));assert.ok(md.includes('does not execute'));
 w.actorId='p2';assert.throws(()=>collectBoard(w,r.state),/another identity/);
});
