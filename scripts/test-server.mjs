// Accelerated test world. Never used by npm run dev or the persistent preview.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createWorldServer} from '../server/world-server.mjs';
const dir=mkdtempSync(join(tmpdir(),'moon-foundry-browser-'));
const app=createWorldServer({database:join(dir,'world.sqlite'),tickMs:50});
await new Promise(resolve=>app.server.listen(4216,'127.0.0.1',resolve));
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit',env:{...process.env,MOON_WEB_PORT:'4215',MOON_API_PORT:'4216',MOON_WEB_HOST:'127.0.0.1'}});
let closing=false;
async function close(){if(closing)return;closing=true;child.kill('SIGTERM');await app.close();rmSync(dir,{recursive:true,force:true});}
child.on('exit',async code=>{await close();process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>close());
