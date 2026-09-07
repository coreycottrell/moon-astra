from pathlib import Path
import markdown,shutil,sys
here=Path(__file__).resolve().parent
project=here.parents[2]
source=project/'ideas/federation-corners-and-colony-organs.md'
out=Path(sys.argv[1]) if len(sys.argv)>1 else here/'site'
out.mkdir(parents=True,exist_ok=True)
text=source.read_text();body=markdown.markdown(text.split('\n',4)[4],extensions=['tables','toc','fenced_code'])
template=(here/'index.template.html').read_text()
(out/'index.html').write_text(template.replace('<!-- PROPOSAL -->',body))
for name in ['style.css','plan.js']:shutil.copy2(here/name,out/name)
shutil.copy2(source,out/'proposal.md')
print(out)
