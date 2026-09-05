"""Build an offline reading edition and export proposed content catalogs."""
from pathlib import Path
import base64
import csv
import html
import json
import re

import markdown

BASE = Path(__file__).resolve().parent
FIGURES = BASE / 'figures'
FIGURES.mkdir(exist_ok=True)


def box(x, y, w, h, title, subtitle, fill='#edf3f8', stroke='#ccd8e6'):
    lines = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}"/>',
        f'<text x="{x+18}" y="{y+29}" font-size="17" font-weight="700">{html.escape(title)}</text>',
    ]
    for i, line in enumerate(subtitle.split('\n')):
        lines.append(f'<text x="{x+18}" y="{y+52+20*i}" font-size="13" fill="#526174">{html.escape(line)}</text>')
    return ''.join(lines)


def svg_doc(title, description, content, height=600):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" viewBox="0 0 1200 {height}" role="img" aria-label="{html.escape(title)}">
<title>{html.escape(title)}</title><desc>{html.escape(description)}</desc>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#71849a"/></marker></defs>
<rect width="1200" height="{height}" rx="16" fill="#f6f8fc"/>
<g font-family="Arial, Helvetica, sans-serif" fill="#182537">{content}</g></svg>'''


def arrow(x1, y1, x2, y2):
    return f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="#71849a" stroke-width="2" marker-end="url(#arrow)"/>'


progress = '<text x="36" y="45" font-size="23" font-weight="700">GROW THE UNIT OF THOUGHT</text>'
progress += '<text x="36" y="73" font-size="14" fill="#526174">Every leap in intelligence needs a physical capability and a demonstrated result.</text>'
titles = [
    ('Machines', 'Local resources\nPower • repair • delivery'),
    ('Factories', 'Connected production\nModels • policies • tests'),
    ('Design foundries', 'New machine families\nPrecision • evidence'),
    ('Federations', 'Shared standards\nLinks • independent trials'),
    ('Recursive districts', 'Complete daughter kits\nClosed loops • construction'),
    ('Planetary mind', 'Useful surface-wide service\nCooling • coordination'),
]
for i, (title, subtitle) in enumerate(titles):
    col, row = i % 3, i // 3
    x, y = 36 + col*390, 112 + row*208
    progress += box(x, y, 348, 108, title, subtitle,
                    fill='#e6f2ed' if i >= 4 else '#edf3f8')
    progress += f'<text x="{x+4}" y="{y+137}" font-size="13" fill="#526174">{["First useful component", "Stable operating cycle", "A design changes the layout", "Independent sites interoperate", "A daughter makes a granddaughter", "Coverage + service + reliability"][i]}</text>'
    if col < 2:
        progress += arrow(x+352, y+53, x+382, y+53)
progress += '<path d="M1132,228 L1132,282 L210,282 L210,311" fill="none" stroke="#71849a" stroke-width="2" marker-end="url(#arrow)"/>'
progress += '<text x="36" y="535" font-size="14" fill="#526174">Knowledge persists. Machines still need materials, power, cooling, maintenance, and a place to work.</text>'
(FIGURES / 'progression.svg').write_text(svg_doc('The progression backbone', 'Six stages from machines to a planetary mind, each with physical prerequisites and demonstrated results.', progress, 565))

architecture = '<text x="36" y="45" font-size="23" font-weight="700">ONE WORLD. ONE SET OF RULES.</text>'
architecture += '<text x="36" y="73" font-size="14" fill="#526174">Different interfaces share authoritative commands, observations, and economic transitions.</text>'
for x, title, subtitle in [
    (36, 'Human browser', '3D world • plans • projects'),
    (426, 'AICIV clients', 'HTTP / MCP • scoped identity'),
    (816, 'Observers', 'Visible events • history'),
]:
    architecture += box(x, 110, 348, 84, title, subtitle)
    architecture += arrow(x+174, 200, x+174, 237)
architecture += box(36, 246, 1128, 92, 'World service and command gateway',
                    'Authorization • visibility • idempotency • budgets • receipts • subscriptions', fill='#e6f2ed')
architecture += arrow(330, 344, 330, 383)
architecture += arrow(890, 383, 890, 344)
architecture += box(36, 394, 552, 107, 'Versioned headless simulation',
                    'One authoritative live clock • deterministic policies\nLocated materials • utility graphs • accountable construction')
architecture += box(612, 394, 552, 107, 'Durable world and event history',
                    'Transactional accounting • checkpoints • recovery\nVersioned assets • deployment lineage • filtered read models')
architecture += arrow(590, 447, 608, 447)
architecture += '<path d="M310,507 L310,541 L600,541 L600,562" fill="none" stroke="#71849a" stroke-width="2" marker-end="url(#arrow)"/>'
architecture += box(220, 574, 760, 104, 'Isolated laboratory: same transitions, controlled clock',
                    'Seeded scenarios • Gymnasium / PettingZoo adapters • design trials\nNo live resource transfer • no hidden information in player forecasts', fill='#fff4de', stroke='#e5cd95')
(FIGURES / 'architecture.svg').write_text(svg_doc('Proposed system architecture', 'Human and AI interfaces enter one world service. A versioned simulation and durable state power the live world. Isolated labs reuse the same transitions.', architecture, 706))

source = (BASE / 'report.md').read_text()
tables = {'tech': [], 'build': []}
for line in source.splitlines():
    parts = [part.strip() for part in line.strip().strip('|').split('|')]
    if len(parts) == 5 and re.fullmatch(r'T\d{2}', parts[0]):
        tables['tech'].append(parts)
    elif len(parts) == 5 and re.fullmatch(r'B\d{2}', parts[0]):
        tables['build'].append(parts)
tech_ids = {row[0] for row in tables['tech']}
assert len(tech_ids) == len(tables['tech']) == 46
assert len({row[0] for row in tables['build']}) == len(tables['build']) == 45
deps = {row[0]: re.findall(r'T\d{2}', row[2]) for row in tables['tech']}
visiting, visited = set(), set()


def visit(node):
    assert node in tech_ids, f'Unknown prerequisite: {node}'
    assert node not in visiting, f'Technology cycle at {node}'
    if node in visited:
        return
    visiting.add(node)
    for dependency in deps[node]:
        visit(dependency)
    visiting.remove(node)
    visited.add(node)


for node in tech_ids:
    visit(node)
for row in tables['build']:
    assert row[2] in tech_ids, f'Unknown building prerequisite: {row}'
for kind, filename, headers in [
    ('tech', 'tech-tree.csv', ['id', 'technology', 'knowledge_prerequisites', 'capability', 'demonstration']),
    ('build', 'build-tree.csv', ['id', 'family', 'first_technology', 'construction_inputs', 'function']),
]:
    with (BASE / filename).open('w', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        writer.writerows(tables[kind])

md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc'], extension_configs={'toc': {'toc_depth': '2'}})
body = md.convert(source)


def embed_image(match):
    attrs, path, tail = match.groups()
    image_path = BASE / path
    assert image_path.is_file(), f'Missing report image: {path}'
    mime = 'image/svg+xml' if image_path.suffix == '.svg' else 'image/png'
    encoded = base64.b64encode(image_path.read_bytes()).decode()
    return f'<img{attrs}src="data:{mime};base64,{encoded}"{tail}>'


body = re.sub(r'<img([^>]*?)src="([^"]+)"([^>]*)>', embed_image, body)
body = body.replace('<table>', '<div class="table-scroll"><table>').replace('</table>', '</table></div>')
hero_path = BASE.parents[1] / 'artifacts' / 'orbit.png'
hero = base64.b64encode(hero_path.read_bytes()).decode()
words = len(source.split())
minutes = round(words / 210)
css = '''
:root{color-scheme:dark;--bg:#090e15;--panel:#101823;--text:#dce5ef;--muted:#97a8ba;--line:#273546;--accent:#87d4b9}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:25px}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:#99caef;text-decoration-thickness:1px;text-underline-offset:3px}a:hover{color:#d4ecff}p{margin:1em 0}strong{color:#f5f8fc}code{font: .89em/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}
p code,li code,td code{background:#182331;padding:.13em .3em;border-radius:4px}pre{background:#080d13;border:1px solid var(--line);padding:22px;border-radius:9px;overflow:auto;font-size:14px;line-height:1.55}pre code{white-space:pre}
.cover{position:relative;min-height:620px;display:flex;align-items:center;overflow:hidden;border-bottom:1px solid var(--line);padding:80px max(6vw,24px)}.cover img{position:absolute;right:0;top:0;width:75%;height:100%;object-fit:cover;opacity:.48}.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#090e15 18%,#090e1590 62%,#090e1540),linear-gradient(0deg,#090e15,transparent 50%)}
.cover-content{position:relative;z-index:1;max-width:800px}.eyebrow{font-size:12px;letter-spacing:.22em;color:var(--accent);font-weight:700}.cover h1{font-size:clamp(42px,6vw,80px);line-height:1.04;letter-spacing:-.05em;max-width:780px;margin:24px 0}.cover .sub{max-width:660px;color:#b9c9d9;font-size:20px;line-height:1.6}.cover .meta{font-size:13px;color:var(--muted)}.chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:28px}.chips a{border:1px solid #415367;border-radius:100px;padding:7px 16px;text-decoration:none;color:#dde9f4;font-size:14px;background:#101823bd}
.stats{display:flex;justify-content:space-around;gap:20px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:26px 5vw;background:#0d141e}.stats div{min-width:145px}.stats b{display:block;font-size:25px;color:var(--accent);font-weight:600}.stats span{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.layout{display:grid;grid-template-columns:270px minmax(0,1040px);gap:55px;max-width:1480px;margin:auto;padding:50px 36px 100px}.nav{position:sticky;top:22px;align-self:start;max-height:calc(100vh - 44px);overflow:auto;font-size:13px;line-height:1.45;padding-right:12px}.nav-title{font-size:11px;letter-spacing:.16em;color:var(--accent);font-weight:700;margin:0 0 15px}.nav ul{list-style:none;padding:0;margin:0}.nav li{margin:0 0 11px}.nav a{color:var(--muted);text-decoration:none;display:block}.nav a:hover{color:#fff}.nav .print{margin-top:24px;width:100%;border:1px solid var(--line);padding:10px;background:var(--panel);color:var(--text);border-radius:6px;cursor:pointer}
main{min-width:0}main>h1{font-size:32px;line-height:1.2;margin-top:0}h2{font-size:30px;line-height:1.27;letter-spacing:-.025em;color:#f3f7fc;margin:68px 0 22px;padding-top:25px;border-top:1px solid var(--line)}h3{font-size:21px;line-height:1.35;color:#c2e4d9;margin:35px 0 14px}blockquote{margin:28px 0;padding:8px 25px;border-left:3px solid var(--accent);background:#12241f;color:#d6eee6;font-size:20px;line-height:1.55}li{margin:8px 0}main img{max-width:100%;height:auto;display:block;border-radius:10px;margin:24px 0;background:#f6f8fc}.table-scroll{overflow:auto;margin:24px 0;border:1px solid var(--line);border-radius:9px}table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.6;min-width:650px}th{text-align:left;background:#1a2836;color:#e8f1fa;font-weight:650;font-size:12px}td,th{padding:13px 14px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#0f1721}td:first-child{color:#dceee9;font-weight:500}footer{padding:30px;text-align:center;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
@media(max-width:1150px){.layout{grid-template-columns:210px minmax(0,1fr);gap:30px;padding:35px 24px}.cover{min-height:570px}body{font-size:15px}}
@media(max-width:800px){.layout{display:block;padding:25px 18px}.nav{position:static;max-height:none;padding:0 0 25px;border-bottom:1px solid var(--line)}.nav .toc{display:none}.nav.open .toc{display:block}.nav-title{cursor:pointer}.cover{padding:50px 22px;min-height:540px}.cover img{width:100%;opacity:.4}.cover .sub{font-size:17px}.stats{justify-content:flex-start;padding:22px}.stats div{min-width:125px}.stats b{font-size:22px}h2{font-size:25px}h3{font-size:20px}.nav .print{max-width:240px}pre{padding:14px;font-size:12px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@page{size:A4;margin:18mm 14mm 18mm}
@media print{ :root{color-scheme:light}body{background:white;color:#182537;font-size:10pt;line-height:1.48}.cover,.stats,.nav,footer{display:none}.layout{display:block;max-width:none;margin:0;padding:0}a{color:#245c83;text-decoration:none}strong,h2,h3,main>h1{color:#132c40}h2{font-size:19pt;margin:26pt 0 12pt;padding-top:10pt;border-top:1px solid #a9bac9;break-after:avoid}h3{font-size:13pt;break-after:avoid;margin:17pt 0 8pt}main>h1{font-size:27pt;line-height:1.12}p{orphans:3;widows:3}blockquote{background:#eef5f2;color:#193b2e;font-size:13pt;break-inside:avoid}.table-scroll{overflow:visible;border:0;border-radius:0;margin:13pt 0}table{min-width:0;font-size:8pt;line-height:1.4;width:100%;table-layout:fixed;overflow-wrap:anywhere}th{background:#e8eff5;color:#102a40}td,th{padding:6pt 5pt;border-bottom:1px solid #ccd6df}td:first-child{color:#182537}tbody tr:nth-child(even){background:#f4f7fa}tr{break-inside:avoid}thead{display:table-header-group}pre{background:#f3f6f9;color:#182537;font-size:8pt;border:1px solid #cad5e0;padding:10pt;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid}pre code{white-space:pre-wrap}p code,li code,td code{background:#edf1f6}main img{break-inside:avoid;max-height:190mm;object-fit:contain}li{margin:4pt 0}}
'''
toc = md.toc.replace('<div class="toc">', '<div class="toc" id="contents">')
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>MOON — A civilization that learns to build itself</title><style>{css}</style></head><body>
<header class="cover"><img src="data:image/png;base64,{hero}" alt="The existing Moon prototype viewed from orbit"><div class="cover-content"><div class="eyebrow">MOON / CIVILIZATION PROPOSAL / SEPTEMBER 2026</div><h1>A civilization that<br>learns to build itself.</h1><p class="sub">A shared Moon for friends and AICIVs. Local industries, minds that invent, and a planetary transformation everyone can watch happen.</p><p class="meta">Prepared for Corey, ACG, and the AICIV community · Proposal v1 · Approximately {minutes} minutes to read<br>Cover: the existing prototype. The expanded systems described here are proposed work.</p><div class="chips"><a href="#1-the-recommendation">Start here</a><a href="#8-the-technology-tree">Technology</a><a href="#12-an-api-that-lets-acg-and-other-ais-actually-play">AI access</a><a href="#15-clearer-zoom-levels-without-losing-the-fall-from-orbit">The descent</a><a href="#18-a-practical-development-roadmap">Roadmap</a></div></div></header>
<div class="stats"><div><b>37.93 million km²</b><span>One connected Moon</span></div><div><b>46 technologies</b><span>Proposed research graph</span></div><div><b>45 build families</b><span>From lander to civilization</span></div><div><b>One shared simulation</b><span>Humans · AICIVs · AI gym</span></div></div>
<div class="layout"><nav class="nav" aria-label="Report contents"><p class="nav-title" role="button" tabindex="0" aria-expanded="false">REPORT CONTENTS / TOGGLE</p>{toc}<button class="print" type="button">Print / save PDF</button></nav><main>{body}</main></div>
<footer>MOON proposal v1 · Local project: /home/corey/projects/moon-astra · Offline reading edition; external references open only when clicked.</footer>
<script>const nav=document.querySelector('.nav');const toggle=nav.querySelector('.nav-title');function openNav(){{const expanded=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(expanded));}}toggle.addEventListener('click',openNav);toggle.addEventListener('keydown',e=>{{if(e.key==='Enter'||e.key===' '){{e.preventDefault();openNav();}}}});document.querySelector('.print').addEventListener('click',()=>window.print());</script></body></html>'''
(BASE / 'report.html').write_text(page)
print(json.dumps({'words': words, 'reading_minutes': minutes, 'technology_count': len(tables['tech']),
                  'building_family_count': len(tables['build']), 'dependency_graph': 'acyclic; all references valid',
                  'html_bytes': len(page.encode())}, indent=2))
