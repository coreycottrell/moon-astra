import test from 'node:test';
import assert from 'node:assert/strict';
import {injectBoardAlert,emptyComposer,codexSession,alertInComposer,BOARD_PROMPT} from '../scripts/lib/tmux-board-alert.mjs';
const config={tmuxTarget:'%25',tmuxInjection:{enabled:true,panePid:100,codexPid:102,sessionId:'01a06dd9-5847-7c73-b3a3-4ec974195750'}};
function fixture(overrides={}){
 const calls=[],files={'/proc/102/cmdline':'/vendor/bin/codex\0resume\0'+config.tmuxInjection.sessionId+'\0','/proc/102/stat':'102 (codex) S 101','/proc/101/stat':'101 (node) S 100',...overrides.files};
 const run=(bin,args)=>{calls.push(args);const typed=calls.some(a=>a.includes('-l')),entered=calls.filter(a=>a.at(-1)==='Enter').length;return {status:0,stdout:args[0]==='capture-pane'?(overrides.screen??(typed&&entered<(overrides.enters??1)?'Working\n\n› '+BOARD_PROMPT+'\n\n tab to queue message':'Working\n\n› Ask Codex to do anything\n\n  gpt-6-astra')):args[0]==='display-message'?(overrides.pid??'100'):'',...overrides.result};};
 return {calls,run,read:path=>files[path],pause:()=>{}};
}
test('only the bound Codex session with an empty composer receives the fixed prompt and Enter',()=>{
 const f=fixture();assert.equal(injectBoardAlert(config,f).sent,true);
 assert.deepEqual(f.calls.filter(a=>a[0]==='send-keys'),[['send-keys','-t','%25','-l','--',BOARD_PROMPT],['send-keys','-t','%25','Enter']]);
});
test('paste debounce gets two staggered retries, stopping after verified submission',()=>{
 const f=fixture({enters:3});assert.equal(injectBoardAlert(config,f).sent,true);assert.equal(f.calls.filter(a=>a.at(-1)==='Enter').length,3);
 assert.ok(alertInComposer('Working\n\n› '+BOARD_PROMPT.replace('Briefly','\n  Briefly')+'\n\n tab to queue message'));
 assert.ok(!alertInComposer('› '+BOARD_PROMPT+' extra human text\n\n tab to queue message'));
});
test('reused panes, wrong sessions, drafts, prompts and missing processes receive no keys',()=>{
 for(const options of [{pid:'200'},{files:{'/proc/102/cmdline':'/bin/bash\0'}},{screen:'› my unfinished message\n\n gpt-6-astra'},{screen:'› Ask Codex to do anything\nold\nold\nold\nold\nApprove command?'}]){
  const f=fixture(options);assert.equal(injectBoardAlert(config,f).sent,false);assert.ok(!f.calls.some(a=>a[0]==='send-keys'));
 }
 assert.equal(codexSession(['/bin/sh','-c','codex resume x'],'x'),false);
 assert.equal(emptyComposer('$ '),false);
});
