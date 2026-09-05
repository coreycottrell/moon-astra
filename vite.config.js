import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({build:{rollupOptions:{input:{game:fileURLToPath(new URL('index.html',import.meta.url)),machines:fileURLToPath(new URL('machines.html',import.meta.url))}}},server:{host:process.env.MOON_WEB_HOST||'0.0.0.0',port:Number(process.env.MOON_WEB_PORT||4205),strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${process.env.MOON_API_PORT||4206}`}}}});
