import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'moon-browser-world-'));
const child=spawn(process.execPath,['scripts/dev.mjs'],{stdio:'inherit',env:{...process.env,MOON_DB:join(dir,'world.sqlite'),MOON_WEB_PORT:'4185',MOON_API_PORT:'4186',MOON_WEB_HOST:'127.0.0.1'}});
child.on('exit',code=>{rmSync(dir,{recursive:true,force:true});process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
