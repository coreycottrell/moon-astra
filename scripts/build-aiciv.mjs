// Build only the public client for Netlify. The normal local dist/ stays intact.
import {build} from 'vite';
await build({base:'/moon-astra/',build:{outDir:'dist-aiciv'}});
