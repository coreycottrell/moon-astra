import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const base=dirname(fileURLToPath(import.meta.url));
execFileSync('python3',[join(base,'prepare.py')],{stdio:'inherit'});
await build({configFile:false,root:base,base:'./',publicDir:false,logLevel:'warn',build:{
 outDir:join(base,'site'),emptyOutDir:true,manifest:true,cssCodeSplit:false,
 rollupOptions:{input:join(base,'src/app.js'),output:{entryFileNames:'assets/report-[hash].js',chunkFileNames:'assets/[name]-[hash].js',assetFileNames:'assets/[name]-[hash][extname]'}}
}});
await cp(join(base,'public'),join(base,'site'),{recursive:true});
await cp(join(base,'whitepaper.md'),join(base,'site/whitepaper.md'));
await cp(join(base,'../../NOTICE.md'),join(base,'site/GAME-ASSET-NOTICE.md'));
const manifest=JSON.parse(await readFile(join(base,'site/.vite/manifest.json'),'utf8'));
const entry=Object.values(manifest).find(x=>x.isEntry);
const css=Object.values(manifest).filter(x=>x.file?.endsWith('.css')).map(x=>x.file);
if(!entry||!css.length)throw Error('Publication bundle did not contain the expected entry and CSS');
let html=await readFile(join(base,'.build/index.html'),'utf8');
html=html.replace('<!-- BUNDLE -->',css.map(f=>`<link rel="stylesheet" href="./${f}">`).join('\n')+`\n<script type="module" src="./${entry.file}"></script>`);
await writeFile(join(base,'site/index.html'),html);
await writeFile(join(base,'site/THIRD-PARTY-NOTICES.txt'),`MOON whitepaper v2\n\nSix industrial models and project captures: original MOON project assets; see provenance.json. Proposed rover/tunneler and figures: authored for this report.\n\nGameplay captures include lunar terrain from NASA/LRO/LOLA and surface imagery from Solar System Scope / INOVE, based on NASA imagery, CC BY 4.0. Texture source: https://www.solarsystemscope.com/textures/ ; license: https://creativecommons.org/licenses/by/4.0/ . The game resizes and converts the source texture and adds generated close detail. No endorsement is implied. See GAME-ASSET-NOTICE.md for the complete data attribution and transformations.\n\nThree.js ${JSON.parse(await readFile(join(base,'../../node_modules/three/package.json'),'utf8')).version}\n`+await readFile(join(base,'../../node_modules/three/LICENSE'),'utf8'));
console.log('Publication built: '+join(base,'site/index.html'));
console.log('Next: node docs/moon-whitepaper-v2/verify.mjs (HTTP, browsers, model posters, print edition).');
