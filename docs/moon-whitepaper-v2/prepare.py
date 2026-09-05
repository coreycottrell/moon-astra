#!/usr/bin/env python3
"""Render the manuscript and author the report's native SVG figures."""
from pathlib import Path
import hashlib, html, json, re, subprocess
import markdown

BASE=Path(__file__).resolve().parent
ROOT=BASE.parent.parent
PUBLIC=BASE/'public'
BUILD=BASE/'.build'
BUILD.mkdir(exist_ok=True)
FIG=PUBLIC/'figures'
FIG.mkdir(exist_ok=True)

def esc(v): return html.escape(str(v),quote=True)
def svg_start(title,desc,w=1240,h=420):
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t d"><title id="t">{esc(title)}</title><desc id="d">{esc(desc)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#e3ac70"/></marker><linearGradient id="ground" x2="0.8" y2="1"><stop stop-color="#33494f"/><stop offset="1" stop-color="#172b32"/></linearGradient></defs><rect width="{w}" height="{h}" fill="#102026" rx="5"/><style>text{{font-family:system-ui,Arial,sans-serif;fill:#e7e9df}}.small{{font-size:15px;fill:#a6b6ba}}.tag{{font-family:monospace;font-size:12px;fill:#e3ac70;letter-spacing:2px}}.label{{font-size:19px}}.muted{{fill:#88a4ad}}</style>'''
def txt(x,y,s,cls='',extra=''): return f'<text x="{x}" y="{y}" class="{cls}" {extra}>{esc(s)}</text>'
def box(x,y,w,h,title,sub,num=None):
 s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#152a32" stroke="#3c5861"/>'
 if num is not None:s+=txt(x+16,y+28,num,'tag')
 s+=txt(x+16,y+(62 if num else 32),title,'label')
 for i,line in enumerate(sub.split('\n')):s+=txt(x+16,y+(87 if num else 58)+i*22,line,'small')
 return s

s=svg_start('A machine has a journey','Seven physical stages connect a placed plan to useful commissioned service.',1240,395)
s+=txt(35,42,'CONSTRUCTION / FROM INTENT TO SERVICE','tag')
stages=[('Reserve','Parts and space'),('Supply','Make and deliver'),('Prepare','Ground and access'),('Assemble','Crew and tooling'),('Connect','Power and control'),('Commission','Test and calibrate'),('Operate','Useful output')]
for i,(a,b) in enumerate(stages):
 x=35+i*170;s+=box(x,95,153,130,a,b,f'0{i+1}')
 if i<6:s+=f'<path d="M{x+154} 160h14" stroke="#e3ac70" fill="none" marker-end="url(#arrow)"/>'
s+='<path d="M110 245v25h1020v-25" fill="none" stroke="#42646e"/>'
s+=txt(620,307,'Every stage has inputs, work, a location and a durable result.','label','text-anchor="middle"')
s+=txt(620,343,'Proposed workflow. Parallel work is allowed only where the recipe and site support it.','small','text-anchor="middle"')
(FIG/'construction.svg').write_text(s+'</svg>')

s=svg_start('A shared corridor has several services','Conceptual subsurface cutaway connecting two settlements through independently installed freight, electrical and communications services.',1240,640)
s+=txt(35,42,'SHARED INFRASTRUCTURE / A CORRIDOR, SEVERAL SERVICES','tag')
s+='<path d="M150 220L635 90L1100 225L615 380Z" fill="url(#ground)" stroke="#536b72"/><path d="M150 220L615 380L615 495L150 335Z" fill="#142930" stroke="#405b64"/><path d="M615 380L1100 225L1100 340L615 495Z" fill="#203740" stroke="#405b64"/>'
for x,y in [(340,230),(770,195)]:
 s+=f'<path d="M{x} {y}l75 -22l52 20l-75 23Z" fill="#c1cbd0"/><path d="M{x} {y}v-58l52 20v59Z" fill="#71858d"/><path d="M{x+52} {y+21}v-59l75 -22v59Z" fill="#e8e4d6"/><path d="M{x} {y-58}l75 -22l52 20l-75 22Z" fill="#dcc7aa"/>'
 s+=f'<path d="M{x+48} {y+18}v108" stroke="#8da4ad" stroke-width="20"/><path d="M{x+48} {y+18}v108" stroke="#152c34" stroke-width="12"/>'
s+='<path d="M388 356L622 430L818 323" stroke="#0a171d" stroke-width="57" fill="none" stroke-linejoin="round"/>'
for offset,color in [(-14,'#88ceca'),(0,'#e3ac70'),(14,'#b2b4dc')]:
 s+=f'<path d="M388 {356+offset}L622 {430+offset}L818 {323+offset}" stroke="{color}" stroke-width="5" fill="none" stroke-linejoin="round"/>'
s+=txt(125,122,'YOUR SETTLEMENT','tag')+txt(879,113,'YOUR NEIGHBOR','tag')
s+='<path d="M240 132l125 50M953 123l-97 51" stroke="#778f96" fill="none"/>'
s+=txt(70,426,'Supported tunnel','label')+txt(70,453,'Excavate • line • remove spoil','small')
s+='<path d="M283 434l106 -50" stroke="#a6b6ba" fill="none"/>'
for x,color,a,b in [(50,'#88ceca','FREIGHT','Vehicles, terminals, capacity'),(449,'#e3ac70','POWER','Conductors, protection, supply'),(848,'#b2b4dc','COMMUNICATIONS','Links, endpoints, coordination')]:
 s+=f'<rect x="{x}" y="530" width="342" height="77" fill="#152a32" stroke="#3b555e" rx="3"/><circle cx="{x+22}" cy="552" r="5" fill="{color}"/>'
 s+=txt(x+38,557,a,'tag')+txt(x+20,585,b,'small')
(FIG/'corridor.svg').write_text(s+'</svg>')

s=svg_start('One world, several ways to participate','Human, agent and observer clients use the same command authority. The renderer and external model calls are outside economic transitions. Laboratory runs use isolated state.',1240,670)
s+=txt(35,42,'ARCHITECTURE / ONE SHARED ECONOMY','tag')
for i,(a,b) in enumerate([('Human browser','Place • inspect • plan'),('AICIV runner','Observe • commit • learn'),('Observer','Visit • watch • replay')]):
 x=90+i*365;s+=box(x,85,330,92,a,b)
 s+=f'<path d="M{x+165} 180v33H620v28" stroke="#e3ac70" fill="none" marker-end="url(#arrow)"/>'
s+=box(205,245,830,103,'VERSIONED COMMANDS + OBSERVATIONS','Permissions • previews • budgets • idempotent receipts')
s+='<path d="M620 350v32" stroke="#e3ac70" marker-end="url(#arrow)"/>'
s+=box(205,387,830,100,'AUTHORITATIVE WORLD SIMULATION','Inventories • jobs • crews • routes • service networks • commissioning')
s+='<path d="M365 489v34M865 489v34" stroke="#e3ac70" marker-end="url(#arrow)"/>'
s+=box(90,530,545,97,'Durable world + event history','Material custody, reservations, progress and lineage')
s+=box(670,530,480,97,'Isolated laboratory state','Same rules • controlled steps • separate resources')
(FIG/'architecture.svg').write_text(s+'</svg>')
(FIG/'moon-mark.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0b1519" rx="14"/><circle cx="32" cy="32" r="22" fill="#e3ac70"/><path d="M32 10a22 22 0 0 1 0 44Z" fill="#173039"/></svg>')

manuscript=(BASE/'whitepaper.md').read_text()
report=markdown.markdown(manuscript,extensions=['tables','fenced_code','attr_list','sane_lists'])
report=re.sub(r'^<h1>.*?</h1>\s*','',report,count=1,flags=re.S)
report=report.replace('<table>','<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable design table"><table>').replace('</table>','</table></div>')
chunks=re.split(r'<h2 id="([^"]+)">([^<]+)</h2>',report)
chapters=[];rendered=[]
for i in range(1,len(chunks),3):
 ident,title,body=chunks[i:i+3];num,name=title.split(' · ',1);chapters.append((ident,num,name))
 rendered.append(f'<section class="chapter" id="{ident}"><header class="chapter-header"><span class="chapter-number">{num}</span><h2 class="chapter-title">{name}</h2><button class="chapter-review" type="button" data-review="{ident}" aria-label="Add a review note on {esc(name)}">Leave a note ↗</button></header>{body}</section>')
report='\n'.join(rendered)

widgets={
'construction-diagram':'<figure class="diagram"><img src="./figures/construction.svg" alt="A proposed construction job progresses through reserve, supply, prepare, assemble, connect, commission and operate" loading="lazy" width="1240" height="395"><figcaption>Proposed job lifecycle. Physical completion and operational service are separate milestones.</figcaption></figure>',
'corridor-diagram':'<figure class="diagram"><img src="./figures/corridor.svg" alt="Conceptual cutaway of two settlements connected by a supported tunnel with separate freight, power and communications services" loading="lazy" width="1240" height="640"><figcaption>Authored system illustration. Geometry is conceptual and does not depict surveyed subsurface terrain.</figcaption></figure>',
'architecture-diagram':'<figure class="diagram"><img src="./figures/architecture.svg" alt="Human, AI and observer clients connect through versioned commands to one authoritative simulation, with durable world state and isolated laboratory runs" loading="lazy" width="1240" height="670"><figcaption>Proposed architecture. Existing command authority remains the foundation; physical logistics and full laboratory adapters require new implementation.</figcaption></figure>',
'construction-lab':'''<div class="interactive" id="construction-lab"><div class="interactive-head"><div><p class="eyebrow">INTERACTIVE / CONSTRUCTION ESTIMATE</p><h3>What actually makes a build faster?</h3></div><span class="lab-label">ILLUSTRATIVE MODEL</span></div><div class="lab-grid"><div class="lab-controls"><div class="control"><label for="crew">Available builders <output id="crew-value" for="crew">4</output></label><input id="crew" type="range" min="1" max="16" step="1" value="4"></div><div class="control"><label for="distance">One-way haul <output id="distance-value" for="distance">100 m</output></label><input id="distance" type="range" min="20" max="1000" step="20" value="100"></div><label class="check-label"><input id="prefab" type="checkbox">Parts already prefabricated</label></div><div class="lab-results" role="status" aria-live="polite" aria-atomic="true"><p>ESTIMATED FINISH / THIS EXAMPLE</p><div class="big-number" id="build-total">102.3 <small>min</small></div><p id="crew-explanation">4 useful assembly positions. Extra builders can work on another site.</p><div class="stage-bars" aria-hidden="true"><span id="bar-fab"></span><span id="bar-haul"></span><span id="bar-assembly"></span><span id="bar-test"></span></div><div class="stage-list"><span>Fabricate<b id="fab-time">60.0 min</b></span><span>Deliver<b id="haul-time">19.3 min</b></span><span>Assemble<b id="assembly-time">15.0 min</b></span><span>Commission<b>8.0 min</b></span></div></div></div><p class="lab-foot">Single batch, serialized stages, four work positions, 80% availability. This teaching example omits queues, terrain, power interruptions and parallel supply. The full assumptions appear immediately below.</p></div>''',
'growth-lab':'''<div class="interactive" id="growth-lab"><div class="interactive-head"><div><p class="eyebrow">INTERACTIVE / THE FINAL WAVE</p><h3>Small beginnings. Many active fronts.</h3></div><span class="lab-label">ANALYTICAL SKETCH</span></div><div class="lab-grid"><div class="lab-controls"><div class="control"><label for="doubling">Nominal doubling time <output id="doubling-value">24 h</output></label><input id="doubling" type="range" min="12" max="72" value="24" step="6"></div><div class="control"><label for="availability">Productivity factor <output id="availability-value">100%</output></label><input id="availability" type="range" min="50" max="100" value="100" step="5"></div></div><div class="lab-results" role="status" aria-live="polite" aria-atomic="true"><p>FROM 1% TO 90% / IDEAL ASSUMPTIONS</p><div class="big-number" id="growth-days">6.5 <small>days</small></div><p id="growth-caption">The same accounted growth rule repeats. Sites and supplies are assumed available.</p></div></div><svg class="growth-chart" viewBox="0 0 760 270" role="img" aria-labelledby="growth-title growth-desc"><title id="growth-title">Illustrative coverage over fourteen days</title><desc id="growth-desc">A simplified exponential curve from one percent coverage. The daily values are provided in the table below.</desc><g id="growth-grid"></g><path id="growth-area" fill="#88ceca12"/><path id="growth-line" fill="none" stroke="#88ceca" stroke-width="3"/><g id="growth-labels"></g></svg><div class="table-scroll growth-table"><table><caption class="print-only">Illustrative coverage at selected days</caption><thead><tr><th>Days after 1%</th><th>0</th><th>2</th><th>4</th><th>6</th><th>8</th><th>14</th></tr></thead><tbody><tr id="growth-row"><td>Coverage</td><td>1.0%</td><td>4.0%</td><td>16.0%</td><td>64.0%</td><td>100.0%</td><td>100.0%</td></tr></tbody></table></div><p class="lab-foot">Assumes unlimited qualifying sites, supply, service and deployment capacity. The real economy is not modeled here. The formula and omitted constraints are explained below.</p></div>''',
}
models=[('seed','Pioneer','SEED LANDER'),('solar','Helios','SOLAR'),('miner','Regolith','HARVESTER'),('refinery','Fraction','REFINERY'),('replicator','Genesis','REPLICATOR'),('compute','Nous','MIND NODE'),('builder','Mason','BUILDER / CONCEPT'),('tunneler','Mole','TUNNELER / CONCEPT')]
tabs=''.join(f'<button type="button" class="model-tab" data-model="{ident}" aria-pressed="{"true" if i==0 else "false"}"><b>{name}</b><span>{i+1:02d} / {role}</span></button>' for i,(ident,name,role) in enumerate(models))
widgets['model-gallery']=f'''<div class="gallery" id="machine-gallery"><div class="model-tabs" role="group" aria-label="Select a machine">{tabs}</div><div class="model-stage" id="model-stage"><div class="stage-topline"><span id="model-status">EXISTING BLENDER ASSET</span><span id="viewer-status" role="status">ROTATABLE 3D STUDY</span></div><img class="model-poster" id="model-poster" src="./images/seed.png" alt="Pioneer seed lander studio view" loading="lazy" width="1400" height="900"><button id="model-start" class="button primary" type="button">Load rotating 3D model ↗</button></div><div class="viewer-controls"><button id="model-motion" type="button" aria-pressed="false">Resume motion</button><button id="model-reset" type="button">Reset view</button><span class="trim-label">Ownership trim</span><div role="group" aria-label="Preview settlement trim"><button class="swatch" type="button" data-color="#e3ac70" style="--swatch:#e3ac70" aria-label="Copper trim" aria-pressed="true"></button><button class="swatch" type="button" data-color="#88ceca" style="--swatch:#88ceca" aria-label="Teal trim" aria-pressed="false"></button><button class="swatch" type="button" data-color="#a5a1d6" style="--swatch:#a5a1d6" aria-label="Violet trim" aria-pressed="false"></button></div></div><p class="viewer-help">Drag to orbit · wheel to zoom · arrow keys to orbit a focused model · + / − to zoom · Pause motion stops the turntable and mechanism. Reduced-motion preferences are respected.</p><figure class="print-model"><img src="./images/seed.png" id="print-model-image" alt="Selected machine, static print view" width="1400" height="900"></figure><div class="model-info"><div><p class="eyebrow" id="model-role">SEED LANDER</p><h3 id="model-name">Pioneer</h3><dl><dt>Asset status</dt><dd id="model-kind">Existing Blender asset</dd><dt>Mechanism</dt><dd id="model-mechanism">Tracking wings and communications dish</dd></dl></div><div><p id="model-description">The familiar beginning. Proposed additions live inside this same silhouette: a compact material loop, a protected starter kit, and a small construction crew.</p><p id="model-future">Proposed: integrated bootstrap services and recovery tooling.</p></div></div></div>'''

tech=[]
for line in manuscript.splitlines():
 if not line.startswith('| V2-'):continue
 cells=[x.strip() for x in line.strip('|').split('|')]
 tech.append(dict(id=cells[0],name=cells[1],prereq=re.findall(r'V2-\d+',cells[2]),demo=cells[3]))
columns=['FOUNDATION','WORKFORCE','COORDINATION','INVENTION','REPRODUCTION','INTEGRATION']
graph=''
for i,label in enumerate(columns):
 graph+=f'<div class="tech-column"><span>{i+1:02d} / {label}</span>'
 for t in tech[i*4:i*4+4]:graph+=f'<button class="tech-card" type="button" data-tech="{t["id"]}" aria-pressed="false"><small>{t["id"]}</small>{esc(t["name"])}</button>'
 graph+='</div>'
widgets['technology-map']=f'''<div class="interactive tech-widget"><div class="interactive-head"><div><p class="eyebrow">INTERACTIVE / CAPABILITY ATLAS</p><h3>Each breakthrough opens a new kind of work.</h3></div></div><div class="tech-scroll" tabindex="0" role="region" aria-label="Scrollable capability atlas"><div class="tech-map">{graph}</div></div><div class="tech-detail" id="tech-detail" role="status" aria-live="polite">Select a capability to see its prerequisites and demonstration.</div><p class="tech-legend">Selected capability: copper · <span>prerequisite ancestry: teal</span> · Columns group themes; dependencies are authoritative in the catalog.</p></div><script type="application/json" id="technology-data">{json.dumps(tech).replace('<','\\u003c')}</script>'''
cards=[('WORLD PACE','—','Tick duration and accumulated lag'),('COMMANDS','—','Queue age and acceptance latency'),('WORKLOAD','—','Active crews, routes and job stages'),('PERSISTENCE','—','Save time, WAL growth and disk'),('HOST CAPACITY','—','CPU, resident memory and network'),('RECOVERY','—','Verified backup and restore evidence')]
widgets['operations-dashboard']='''<div class="interactive"><div class="interactive-head"><div><p class="eyebrow">OPERATOR CONSOLE / DESIGN STUDY</p><h3>Watch the world, not just the process.</h3></div><span class="lab-label">NO LIVE TELEMETRY</span></div><div class="ops-grid">'''+''.join(f'<div class="ops-card"><span>{a}</span><strong>{b}</strong><p>{c}</p><div class="empty-spark" aria-hidden="true"></div></div>' for a,b,c in cards)+'</div><p class="lab-foot">Wireframe only. The publication makes no game or monitoring API calls; these fields require future instrumentation.</p></div>'
for name,content in widgets.items():report=report.replace(f'<div data-insert="{name}"></div>',content)
if 'data-insert=' in report:raise RuntimeError('Unfilled whitepaper widget')

toc=''.join(f'<a href="#{ident}"><span>{num}</span>{name}</a>' for ident,num,name in chapters)
options=''.join(f'<option value="{ident}">{num} · {name}</option>' for ident,num,name in chapters)
wordcount=len(re.findall(r"\b[\w’'-]+\b",re.sub('<[^>]+>',' ',markdown.markdown(manuscript))))
template=(BASE/'src/index.template.html').read_text()
template=template.replace('<!-- REPORT -->',report).replace('<!-- TOC -->',toc).replace('<!-- OPTIONS -->',options).replace('<!-- WORD_COUNT -->',f'{wordcount:,}')
(BUILD/'index.html').write_text(template)
paths=['src/shared-world.js','src/industry.js','src/simulation.js','docs/api.md','public/models/industrial-01/manifest.json','art/blender/build_machines.py']
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
inputs=[dict(path=p,sha256=hashlib.sha256((ROOT/p).read_bytes()).hexdigest()) for p in paths]
provenance=dict(title='MOON — The work of becoming',edition='Design whitepaper v2',prepared='2026-09-05',sourceRevision=revision,sourceFiles=inputs,manuscriptSha256=hashlib.sha256(manuscript.encode()).hexdigest(),wordCount=wordcount,chapters=len(chapters),existingArt='Six original Blender GLBs, industrial-01; final-state presentation assets',proposedArt='Mason and Mole are report-only procedural concept models authored in src/viewer.js',figures='Original native SVG system diagrams; geometry is conceptual',screenshots='Existing local gameplay and art captures, September 5 2026; clean model posters rendered from the report viewer',simulationDisclaimer='Construction and exponential examples are simplified analytical illustrations, not a simulation of the live economy',runtime='Static report; no game API requests, no external model calls, no CDN dependencies')
(PUBLIC/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'Prepared {len(chapters)} chapters, {wordcount:,} words, {len(tech)} proposed capabilities.')
