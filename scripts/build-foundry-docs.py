from pathlib import Path
import markdown
import shutil
root=Path(__file__).resolve().parents[1]
style='''*{box-sizing:border-box}body{margin:0;background:#0d171d;color:#d8e0dc;font:16px/1.8 system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:55px 28px 100px}nav{display:flex;gap:25px;flex-wrap:wrap;margin-bottom:45px;font-size:13px}a{color:#e1b882}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.2;color:#f0e9db}h1{font-size:clamp(36px,5vw,67px);max-width:850px;letter-spacing:-1.5px}h2{font-size:32px;margin-top:65px}h3{font-size:20px;margin-top:38px}p,li{max-width:850px}table{border-collapse:collapse;width:100%;display:block;overflow:auto;font-size:13px;line-height:1.65;margin:30px 0}th{color:#e1b882;background:#20312f}td,th{border:1px solid #34464a;padding:15px;text-align:left;min-width:170px}td:first-child{color:#ecd9bb}code{font:13px/1.7 monospace;color:#b8d8cb;overflow-wrap:anywhere}pre{padding:22px;background:#18252c;border:1px solid #34464a;border-radius:9px;overflow:auto}pre code{white-space:pre}img{display:block;max-width:100%;width:700px;margin:35px auto;border:1px solid #3d565c;border-radius:13px}strong{color:#f0dfc6}blockquote{margin:30px 0;padding:16px 25px;border-left:3px solid #cfaa75;background:#22312e}.stamp{font:11px monospace;letter-spacing:.15em;color:#91bfae}@media(max-width:600px){main{padding:30px 20px 70px}body{font-size:14px}table{font-size:12px}h2{font-size:27px}}'''
for source,target in [('IMPLEMENTATION.md','phase.html'),('AGENT-MANUAL.md','agent-manual.html')]:
    md=(root/'docs/foundry'/source).read_text()
    body=markdown.markdown(md,extensions=['tables','fenced_code','toc'])
    title=md.splitlines()[0].lstrip('# ')
    html=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0d171d"><title>{title}</title><style>{style}</style></head><body><main><nav><a href="./">Play Foundry ↗</a><a href="phase.html">Available now / coming later</a><a href="agent-manual.html">Agent manual</a><a href="https://ai-civ.com/moon-astra-whitepaper/#research-library">Whitepaper & research library ↗</a><a href="https://ai-civ.com/moon-mind-learning-engine/">Learning engine</a></nav><p class="stamp">MOON / FOUNDRY / DEVELOPMENT EDITION · 2026-09-07</p>{body}</main></body></html>'
    (root/'public'/target).write_text(html)
    print(target,len(html),'characters')

shutil.copy2(root/"docs/foundry/AGENT-MANUAL.md",root/"public/agent-manual.md")
