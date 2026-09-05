#!/usr/bin/env python3
"""Package only the compiled whitepaper and its publication handoff."""
from pathlib import Path
import hashlib, json, os, re, subprocess, zipfile
from datetime import datetime, timezone

base=Path(__file__).resolve().parent
root=base.parent.parent
out=Path(os.environ.get('MOON_PUBLICATION_OUT',str(Path.home()/'moon-releases')))
out.mkdir(parents=True,exist_ok=True)
checks=json.loads((base/'verification/checks.json').read_text())
if checks.get('status')!='PASS':raise SystemExit('The publication must pass verification before packaging.')
pdf=base/'site/whitepaper.pdf'
if not pdf.read_bytes().startswith(b'%PDF-'):raise SystemExit('Missing or invalid print edition.')
pages=int(re.search(r'^Pages:\s+(\d+)',subprocess.check_output(['pdfinfo',str(pdf)],text=True),re.M).group(1))
provenance=json.loads((base/'site/provenance.json').read_text())
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
payload={}
for path in sorted((base/'site').rglob('*')):
 if path.is_file() and not any(p.startswith('.') for p in path.relative_to(base/'site').parts):payload['site/'+path.relative_to(base/'site').as_posix()]=path.read_bytes()
for relative in ['HOSTING-ACG.md','verification/checks.json','verification/README.md']:
 payload[relative]=(base/relative).read_bytes()
for path in sorted((base/'verification').glob('*.png')):payload['verification/'+path.name]=path.read_bytes()
payload['README.md']=('''# MOON — The work of becoming

Complete compiled HTML whitepaper prepared for Corey and ACG. Host the contents of `site/` at a separate static route, preferably `https://ai-civ.com/moon-astra-whitepaper/`.

Read `HOSTING-ACG.md` before publishing. The report needs no game backend changes or API key. Run `sha256sum -c CHECKSUMS.sha256` from this extracted directory to verify included files. Local browser evidence is in `verification/`; public hosting must be checked separately.

The editable manuscript is `site/whitepaper.md`; PDF is `site/whitepaper.pdf`. Authoring source and rebuild scripts live at `/home/corey/projects/moon-civilization/docs/moon-whitepaper-v2` on the tower. This archive is a publication package, not a full game or authoring checkout.
''').encode()
publication=dict(title='MOON — The work of becoming',edition='Design whitepaper v2',prepared='2026-09-05',packagedAt=datetime.now(timezone.utc).isoformat(),authoringRevision=revision,gameSourceSnapshot=provenance['sourceRevision'],proposedURL='https://ai-civ.com/moon-astra-whitepaper/',wordCount=provenance['wordCount'],chapters=provenance['chapters'],models=8,existingBlenderModels=6,proposedConceptModels=2,pdfPages=pages,localVerification='PASS',publicDeployment='For ACG to perform; not verified by this package',gameMutations=False,files=[dict(path=p,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()) for p,b in payload.items()])
payload['PUBLICATION.json']=(json.dumps(publication,indent=2)+'\n').encode()
payload['CHECKSUMS.sha256']=''.join(hashlib.sha256(b).hexdigest()+'  '+p+'\n' for p,b in sorted(payload.items())).encode()
archive=out/'moon-whitepaper-v2-20260905.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p,b in sorted(payload.items()):z.writestr(p,b)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert set(z.namelist())==set(payload)
 for p,b in payload.items():assert hashlib.sha256(z.read(p)).digest()==hashlib.sha256(b).digest(),p
 required={'site/index.html','site/whitepaper.pdf','site/provenance.json','HOSTING-ACG.md','CHECKSUMS.sha256'}|{'site/models/'+name+'.glb' for name in ['seed','solar','miner','refinery','replicator','compute']}
 assert required<=set(z.namelist())
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
Path(str(archive)+'.sha256').write_text(digest+'  '+archive.name+'\n')
summary=dict(archive=str(archive),sha256=digest,bytes=archive.stat().st_size,files=len(payload),authoringRevision=revision,chapters=publication['chapters'],wordCount=publication['wordCount'],pdfPages=pages,proposedURL=publication['proposedURL'],verification='PASS')
Path(str(archive)+'.json').write_text(json.dumps(summary,indent=2)+'\n')
(out/'MOON-WHITEPAPER-LATEST.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
