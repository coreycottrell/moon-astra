import {defineConfig} from 'vite';
export default defineConfig({server:{host:process.env.MOON_WEB_HOST||'0.0.0.0',port:Number(process.env.MOON_WEB_PORT||4175),strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${process.env.MOON_API_PORT||4176}`}}}});
