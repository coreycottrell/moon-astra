import {spawn} from 'node:child_process';
const api=spawn(process.execPath,['server/world-server.mjs'],{stdio:'inherit',env:{...process.env,MOON_PORT:process.env.MOON_API_PORT||'4176'}});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;api.kill('SIGTERM');web.kill('SIGTERM');process.exitCode=code;}
for(const child of [api,web])child.once('exit',code=>stop(code||0));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
