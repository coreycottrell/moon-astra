from pathlib import Path
import re,sys
root=Path(__file__).resolve().parent
fragment=(root/'research-library.html').read_text()
css='''<style id="research-library-style">.mast-actions{flex-wrap:wrap;justify-content:flex-end}.research-library{margin:26px 0 50px;padding:clamp(22px,3vw,40px);background:#14282c;border:1px solid #355157;border-radius:14px;scroll-margin-top:110px}.research-library h2{font-size:clamp(30px,3vw,44px);margin:10px 0 20px}.research-library>p{font-size:15px;line-height:1.8}.research-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:25px 32px}.research-groups h3{font-size:18px;margin:22px 0 14px}.research-groups h3 small{display:block;color:#9ecbb3;font:10px/2 monospace;letter-spacing:.1em}.research-groups ul{padding-left:18px;margin:0}.research-groups li,.research-groups p{font-size:13px;line-height:1.8;margin-bottom:12px}.research-groups a{color:#ecc48b;text-underline-offset:3px}.research-groups li{overflow-wrap:anywhere}@media(max-width:750px){.research-groups{grid-template-columns:1fr}}</style>'''
paths=[root/'src/index.template.html']
if len(sys.argv)>1:paths.append(Path(sys.argv[1]))
for p in paths:
 s=p.read_text()
 if '<section id="research-library"' in s:
  start=s.index('<section id="research-library"');end=s.index('</section>',start)+len('</section>');s=s[:start]+fragment+s[end:]
 else:
  assert '<main id="report">' in s;s=s.replace('<main id="report">','<main id="report">'+fragment,1)
 if 'id="research-library-style"' not in s:s=s.replace('</head>',css+'\n</head>',1)
 else:s=re.sub(r'<style id="research-library-style">.*?</style>',lambda m:css,s,flags=re.S)
 s=s.replace('<div class="mast-actions">','<div class="mast-actions"><a href="#research-library">Research library ↗</a>',1) if '<a href="#research-library">Research library ↗</a>' not in s else s
 s=s.replace('<a href="https://ai-civ.com/moon-astra/" target="_blank" rel="noopener">Play MOON','<a href="https://ai-civ.com/moon-astra-v2/" target="_blank" rel="noopener">Play MOON')
 marker='<div class="sidebar-footer">';link='<a href="#research-library">Manual, engine & all resources ↗</a><a href="./federation-corners/">Federation & colony organs ↗</a>'
 if link not in s:s=s.replace(marker,marker+link,1)
 p.write_text(s)
 print('Updated',p)
