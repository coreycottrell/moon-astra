import './styles.css';
import {models} from './models.js';

const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const chapters=[...document.querySelectorAll('.chapter')].map(s=>({id:s.id,title:s.querySelector('h2').textContent}));

// Reading navigation. All chapters and figures remain available without scripts.
const menu=$('menu-toggle'),contents=$('contents');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));contents.classList.toggle('open',open);});
contents.addEventListener('click',e=>{if(e.target.closest('a')){contents.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
addEventListener('keydown',e=>{if(e.key==='Escape'){contents.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
let scrollQueued=false;
function updateReading(){scrollQueued=false;const total=document.documentElement.scrollHeight-innerHeight;$('reading-progress').style.width=(total>0?scrollY/total*100:0)+'%';let active=chapters[0]?.id;for(const c of chapters){if($(c.id).getBoundingClientRect().top<=180)active=c.id;else break;}for(const a of contents.querySelectorAll('nav a')){const yes=a.getAttribute('href')==='#'+active;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}
addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateReading);}},{passive:true});updateReading();$('print-report').addEventListener('click',()=>print());

// Serialized, explicitly illustrative construction model, independent of the game.
function updateConstruction(){const crew=Number($('crew').value),distance=Number($('distance').value),fabrication=$('prefab').checked?0:60,haul=2*distance/.25/60+6,assembly=48/(Math.min(crew,4)*.8),test=8,total=fabrication+haul+assembly+test;
 $('crew-value').textContent=String(crew);$('distance-value').textContent=distance+' m';$('build-total').replaceChildren(document.createTextNode(total.toFixed(1)+' '),Object.assign(document.createElement('small'),{textContent:'min'}));
 $('crew-explanation').textContent=`${Math.min(crew,4)} useful assembly ${Math.min(crew,4)===1?'position':'positions'} occupied.${crew>4?` ${crew-4} extra ${crew-4===1?'builder can':'builders can'} work on another site.`:' At most four robots can assemble this module at once.'}`;
 for(const [name,time]of [['fab',fabrication],['haul',haul],['assembly',assembly],['test',test]]){const bar=$('bar-'+name);bar.style.flex=String(time);bar.style.display=time===0?'none':'block';const out=$(name+'-time');if(out)out.textContent=time.toFixed(1)+' min';}
 return {crew,distance,fabrication,haul,assembly,test,total};
}
for(const id of ['crew','distance','prefab'])$(id).addEventListener('input',updateConstruction);updateConstruction();

// This curve is an analytical scenario, with its exact limitations printed nearby.
const svgNS='http://www.w3.org/2000/svg';
function svgNode(type,attrs,text){const n=document.createElementNS(svgNS,type);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function updateGrowth(){const hours=Number($('doubling').value),factor=Number($('availability').value)/100,days=Math.log2(90)*hours/(24*factor);$('doubling-value').textContent=hours+' h';$('availability-value').textContent=Math.round(factor*100)+'%';$('growth-days').replaceChildren(document.createTextNode(days.toFixed(1)+' '),Object.assign(document.createElement('small'),{textContent:'days'}));
 const left=42,top=14,width=692,height=214,coverage=d=>Math.min(100,2**(factor*d*24/hours));
 $('growth-grid').replaceChildren();$('growth-labels').replaceChildren();
 for(const value of [0,25,50,75,100]){const y=top+height-value/100*height;$('growth-grid').append(svgNode('line',{x1:left,x2:left+width,y1:y,y2:y,stroke:'#29454e','stroke-width':1,class:'grid-line'}));$('growth-labels').append(svgNode('text',{x:32,y:y+4,'text-anchor':'end',class:'chart-axis'},value+'%'));}
 for(const day of [0,2,4,6,8,10,12,14])$('growth-labels').append(svgNode('text',{x:left+day/14*width,y:251,'text-anchor':'middle',class:'chart-axis'},day+'d'));
 let d='';for(let i=0;i<=168;i++){const day=i/12;d+=(i?'L':'M')+(left+day/14*width).toFixed(2)+' '+(top+height-coverage(day)/100*height).toFixed(2)+' ';}
 $('growth-line').setAttribute('d',d);$('growth-area').setAttribute('d',d+`L${left+width} ${top+height}L${left} ${top+height}Z`);
 $('growth-row').replaceChildren(Object.assign(document.createElement('td'),{textContent:'Coverage'}),...[0,2,4,6,8,14].map(day=>Object.assign(document.createElement('td'),{textContent:coverage(day).toFixed(1)+'%'})));
 return {hours,factor,daysTo90:days,day14:coverage(14)};
}
for(const id of ['doubling','availability'])$(id).addEventListener('input',updateGrowth);updateGrowth();

const technologies=JSON.parse($('technology-data').textContent),techById=new Map(technologies.map(t=>[t.id,t]));
function chooseTechnology(id){const t=techById.get(id);if(!t)return;const ancestors=new Set();const visit=x=>{for(const p of techById.get(x).prereq){if(!ancestors.has(p)){ancestors.add(p);visit(p);}}};visit(id);for(const b of document.querySelectorAll('[data-tech]')){const selected=b.dataset.tech===id;b.classList.toggle('selected',selected);b.classList.toggle('ancestor',ancestors.has(b.dataset.tech));b.setAttribute('aria-pressed',String(selected));}
 $('tech-detail').replaceChildren(Object.assign(document.createElement('strong'),{textContent:t.id+' · '+t.name}),document.createTextNode('Prerequisites: '+(t.prereq.length?t.prereq.map(p=>techById.get(p).name).join(' + '):'Starting knowledge')+'. Demonstration: '+t.demo+'.'));
}
for(const b of document.querySelectorAll('[data-tech]'))b.addEventListener('click',()=>chooseTechnology(b.dataset.tech));

// One lazy WebGL canvas, eight bounded models, posters when WebGL is unavailable.
let viewer=null,viewerPromise=null,chosen='seed',motion=!reduced.matches,currentColor='#e3ac70',galleryVisible=false,modelRequest=0;
function motionLabel(){$('model-motion').setAttribute('aria-pressed',String(motion));$('model-motion').textContent=motion?'Pause motion':'Resume motion';}
motionLabel();
function describeModel(id){const m=models.find(x=>x.id===id);chosen=id;for(const b of document.querySelectorAll('[data-model]'))b.setAttribute('aria-pressed',String(b.dataset.model===id));$('model-name').textContent=m.name;$('model-role').textContent=m.role.toUpperCase();$('model-kind').textContent=m.status;$('model-status').textContent=m.status.toUpperCase();$('model-status').classList.toggle('proposed',m.status.startsWith('Proposed'));$('model-mechanism').textContent=m.motion;$('model-description').textContent=m.description;$('model-future').textContent='Proposed: '+m.future+'.';$('model-poster').src=new URL('images/'+m.image,document.baseURI).href;$('model-poster').alt=m.name+' / '+m.status;$('print-model-image').src=$('model-poster').src;$('print-model-image').alt=$('model-poster').alt;}
async function ensureViewer(){
 if(!viewerPromise){$('model-start').disabled=true;$('model-start').textContent='Preparing the 3D study…';viewerPromise=(async()=>{const {createViewer}=await import('./viewer.js');viewer=await createViewer($('model-stage'),{onStatus:t=>$('viewer-status').textContent=t});viewer.setMotion(motion);viewer.setTrim(currentColor);viewer.setVisible(galleryVisible);return viewer;})().catch(error=>{viewer?.destroy();viewer=null;viewerPromise=null;throw error;});}
 return viewerPromise;
}
async function showModel(id=chosen){const seq=++modelRequest;describeModel(id);try{const v=await ensureViewer();const won=await v.select(id);if(seq!==modelRequest||!won)return;v.renderer.domElement.hidden=false;v.setMotion(motion);$('model-start').hidden=true;$('model-poster').hidden=true;$('model-start').disabled=false;}
 catch(error){if(seq!==modelRequest)return;console.warn('Model preview unavailable:',error.message);if(viewer)viewer.renderer.domElement.hidden=true;$('model-start').hidden=false;$('model-start').disabled=false;$('model-start').textContent='Retry 3D preview ↗';$('model-poster').hidden=false;$('viewer-status').textContent='STATIC VIEW / 3D UNAVAILABLE';}
}
$('model-start').addEventListener('click',()=>showModel());
for(const b of document.querySelectorAll('[data-model]'))b.addEventListener('click',()=>showModel(b.dataset.model));
$('model-motion').addEventListener('click',()=>{motion=!motion;motionLabel();viewer?.setMotion(motion);});$('model-reset').addEventListener('click',()=>viewer?.reset());
for(const b of document.querySelectorAll('[data-color]'))b.addEventListener('click',()=>{currentColor=b.dataset.color;for(const sw of document.querySelectorAll('[data-color]'))sw.setAttribute('aria-pressed',String(sw===b));viewer?.setTrim(currentColor);});
const galleryObserver=new IntersectionObserver(entries=>{galleryVisible=entries[0].isIntersecting;viewer?.setVisible(galleryVisible);if(galleryVisible&&!viewerPromise&&!reduced.matches)showModel();},{threshold:.15});galleryObserver.observe($('model-stage'));
reduced.addEventListener('change',()=>{if(reduced.matches){motion=false;motionLabel();viewer?.setMotion(false);}});
addEventListener('beforeprint',()=>viewer?.setVisible(false));addEventListener('afterprint',()=>viewer?.setVisible(galleryVisible));

// Browser-local review notes. Text is always rendered with textContent.
const storageKey='moon-whitepaper-v2-notes',dialog=$('review-dialog');let notes=[],storageAvailable=true;
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))notes=saved.filter(n=>typeof n?.id==='string'&&typeof n.text==='string'&&typeof n.created==='string'&&chapters.some(c=>c.id===n.section)&&['discuss','support','revise','defer'].includes(n.verdict));}catch{storageAvailable=false;}
function persistNotes(){try{localStorage.setItem(storageKey,JSON.stringify(notes));storageAvailable=true;}catch{storageAvailable=false;}}
function renderNotes(){$('review-count').textContent=String(notes.length);$('saved-notes').replaceChildren();for(const n of [...notes].reverse()){const item=document.createElement('article');item.className='saved-note';item.append(Object.assign(document.createElement('strong'),{textContent:chapters.find(c=>c.id===n.section).title}),Object.assign(document.createElement('small'),{textContent:n.verdict.toUpperCase()+' · '+n.created.slice(0,16).replace('T',' ')+' UTC'}),Object.assign(document.createElement('p'),{textContent:n.text}));const remove=Object.assign(document.createElement('button'),{type:'button',textContent:'Remove note'});remove.addEventListener('click',()=>{notes=notes.filter(x=>x.id!==n.id);persistNotes();renderNotes();$('note-status').textContent=storageAvailable?'Note removed.':'Removed in memory only; export to keep remaining notes.';});item.append(remove);$('saved-notes').append(item);}if(!storageAvailable)$('note-status').textContent='Browser storage is unavailable. Notes are kept in memory; export before closing this page.';}
function openReview(section){if(section)$('review-section').value=section;if(!dialog.open)dialog.showModal();}
$('open-review').addEventListener('click',()=>openReview());for(const b of document.querySelectorAll('[data-review]'))b.addEventListener('click',()=>openReview(b.dataset.review));
$('save-note').addEventListener('click',()=>{const value=$('review-text').value.trim();if(!value){$('note-status').textContent='Write a note before saving.';$('review-text').focus();return;}notes.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),section:$('review-section').value,verdict:$('review-verdict').value,text:value,created:new Date().toISOString()});persistNotes();renderNotes();$('review-text').value='';$('note-status').textContent=storageAvailable?'Saved in this browser. Export to share with ACG.':'Saved in memory only. Export before closing this page.';});
function download(filename,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('export-notes').addEventListener('click',()=>{const body='# MOON whitepaper v2 — review notes\n\nExported '+new Date().toISOString()+'\n\n'+notes.map(n=>'## '+chapters.find(c=>c.id===n.section).title+'\n\nResponse: '+n.verdict+'\n\n'+n.text+'\n\n').join('');download('moon-whitepaper-v2-review.md',body,'text/markdown');});
$('export-json').addEventListener('click',()=>download('moon-whitepaper-v2-review.json',JSON.stringify({edition:'moon-whitepaper-v2',exported:new Date().toISOString(),notes},null,2),'application/json'));renderNotes();

// Read-only diagnostics for publication verification, never a game interface.
window.__moonPaper={get viewer(){return viewer;},get chosen(){return chosen;},showModel,updateConstruction,updateGrowth,chooseTechnology,get noteCount(){return notes.length;},get chapters(){return chapters.length;}};
