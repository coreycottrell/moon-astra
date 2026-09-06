"""Build the resource addendum from the canonical project-level ideas document.
Only writes the dedicated child directory and adds two idempotent parent links.
"""
from pathlib import Path
import argparse, hashlib, html, json, re
import markdown

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
args = argparse.ArgumentParser()
args.add_argument('--site-root', type=Path, required=True, help='Existing complete website checkout')
opts = args.parse_args()
parent = opts.site_root / 'moon-astra-whitepaper'
assert (parent / 'index.html').is_file()
out = parent / 'deeper-resource-loops'
out.mkdir(exist_ok=True)
source = ROOT / 'ideas/deeper-resource-loops.md'
manuscript = source.read_text()
public = manuscript.replace('It follows the completed guide deployment and verified Expansion backup. ', '')
public = public.replace('../public/data/sources.json', '../../moon-astra-v2/data/sources.json')
public = public.replace('No new datasets, models, resources or rules were installed for this document.', 'This addendum proposes future development; it does not change the live game.')
assert '/home/' not in public and '/media/' not in public

cycle = '''<figure class="cycle" aria-labelledby="cycle-caption"><ol>
<li><b>01 / SURVEY</b><span>Understand the ground</span><small>Samples, composition and confidence</small></li>
<li><b>02 / EXTRACT</b><span>Separate useful material</span><small>Concentrates, structures and residues</small></li>
<li><b>03 / MANUFACTURE</b><span>Build qualified components</span><small>Solar modules, tools and controls</small></li>
<li><b>04 / CONNECT</b><span>Support more intelligence</span><small>Power, minds and reliable services</small></li>
<li><b>05 / DISCOVER</b><span>Learn a better process</span><small>Revisit deposits and recover old waste</small></li>
</ol><figcaption id="cycle-caption">Proposed feedback loop. Better knowledge changes what can be recovered from the same ground; every new component still requires physical work.</figcaption></figure>'''
public_html_input = re.sub(r'```mermaid\n.*?```', cycle, public, flags=re.S)
body = markdown.markdown(public_html_input, extensions=['tables', 'fenced_code', 'sane_lists'])
body = re.sub(r'^<h1>.*?</h1>\s*', '', body, count=1, flags=re.S)
body = re.sub(r'^<p>September 6, 2026.*?</p>\s*', '', body, count=1, flags=re.S)
body = body.replace('<table>', '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable proposal table"><table>').replace('</table>', '</table></div>')
parts = re.split(r'<h2>(\d+)\. (.*?)</h2>', body)
intro = parts[0]
chapters = []
toc = []
for i in range(1, len(parts), 3):
    number, title, content = parts[i:i+3]
    ident = 'chapter-' + number
    toc.append(f'<a href="#{ident}"><span>{int(number):02d}</span>{title}</a>')
    if number == '5':
        content += (BASE / 'comparison.html').read_text()
    if number == '8':
        content = '<figure class="process-image"><img src="../images/refinery.png" alt="Existing MOON refinery model" loading="lazy" width="1400" height="900"><figcaption>Existing refinery art. Survey tools, separation attachments and precision lines described here are proposed additions.</figcaption></figure>' + content
    chapters.append(f'<section class="chapter" id="{ident}"><header class="chapter-header"><span class="chapter-number">{int(number):02d}</span><h2 class="chapter-title">{title}</h2></header>{content}</section>')
assert len(chapters) == 16

assets = {}
for name in ['style.css', 'app.js']:
    data = (BASE / name).read_bytes()
    p = Path(name)
    target = f'{p.stem}-{hashlib.sha256(data).hexdigest()[:12]}{p.suffix}'
    (out / target).write_bytes(data)
    assets[name] = target
parent_html = (parent / 'index.html').read_text()
style = re.search(r'href="\./(assets/[^\"]+\.css)"', parent_html).group(1)
template = (BASE / 'index.template.html').read_text()
for key, value in {'STYLE': '../'+style, 'CSS': assets['style.css'], 'JS': assets['app.js'], 'TOC': ''.join(toc), 'INTRO': intro, 'CHAPTERS': '\n'.join(chapters)}.items():
    template = template.replace('{{'+key+'}}', value)
assert '{{' not in template
(out / 'index.html').write_text(template)
(out / 'deeper-resource-loops.md').write_text(public)
(out / 'publication.json').write_text(json.dumps({'title': 'MOON — Deeper resource loops', 'edition': 'Whitepaper addendum 01', 'date': '2026-09-06', 'status': 'design proposal', 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'manuscriptSha256': hashlib.sha256(public.encode()).hexdigest(), 'chapters': 16, 'usesLiveGameAPI': False, 'images': 'Existing parent whitepaper assets; see ../provenance.json and ../THIRD-PARTY-NOTICES.txt'}, indent=2)+'\n')

# Match the source template edit without rebuilding the parent publication.
card = '<aside class="edition-note resource-addendum"><span class="edition-label">ADDENDUM / 01</span><p><a href="./deeper-resource-loops/"><strong>Deeper resource loops ↗</strong></a><br>Survey the ground, connect specialized industries, and discover how new intelligence changes the value of places. A detailed next-iteration proposal.</p></aside>'
nav = '<a href="./deeper-resource-loops/">Resource loops addendum ↗</a>'
if 'class="edition-note resource-addendum"' not in parent_html:
    assert parent_html.count('<main id="report">') == 1
    parent_html = parent_html.replace('<main id="report">', '<main id="report">'+card)
if nav not in parent_html:
    assert parent_html.count('<div class="sidebar-footer">') == 1
    parent_html = parent_html.replace('<div class="sidebar-footer">', '<div class="sidebar-footer">'+nav)
(parent / 'index.html').write_text(parent_html)
print(f'Built {out}: 16 chapters, local comparison widget, public manuscript and provenance.')
