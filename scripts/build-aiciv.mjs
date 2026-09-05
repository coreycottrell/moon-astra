// Build only the public client for Netlify. The normal local dist/ stays intact.
import {build} from 'vite';
await build({base:process.env.MOON_BASE_PATH||'/moon-foundry/',build:{outDir:'dist-aiciv'}});
