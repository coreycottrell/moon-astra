"""Package the committed release. Only the site archive belongs in a web root."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip(), 'Commit the reviewed files before packaging'
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
output=Path('/home/corey/moon-releases')/('foundry-'+stamp+'-'+head[:8]);output.mkdir(parents=True)
sha=lambda data:hashlib.sha256(data).hexdigest()
report={'version':'0.3.0-foundry.1','ruleset':'moon-foundry-1','created':stamp,'source':str(root),'revision':head,'branch':'development/physical-industry','directory':str(output),'siteMount':'/moon-foundry/','artifacts':[]}
def archive(name,entries):
    path=output/name;manifest={'revision':head,'ruleset':report['ruleset'],'files':[]}
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
        for name,source in sorted(entries):
            assert not any(p in {'.world','.agent-access','node_modules','.git'} for p in Path(name).parts)
            assert not source.is_symlink(),f'Unexpected symlink: {source}'
            data=source.read_bytes();z.writestr(name,data)
            manifest['files'].append({'path':name,'bytes':len(data),'sha256':sha(data)})
        z.writestr('RELEASE-MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        for entry in manifest['files']:assert sha(z.read(entry['path']))==entry['sha256'],entry['path']
    digest=sha(path.read_bytes());Path(str(path)+'.sha256').write_text(digest+'  '+path.name+'\n')
    report['artifacts'].append({'file':str(path),'bytes':path.stat().st_size,'sha256':digest,'files':len(manifest['files']),'verified':True})
    print('Verified',path.name,len(manifest['files']),'files',flush=True)
assert (root/'dist/index.html').exists() and (root/'dist-aiciv/index.html').exists()
archive('moon-foundry-site.zip',[(p.relative_to(root/'dist-aiciv').as_posix(),p) for p in (root/'dist-aiciv').rglob('*') if p.is_file()])
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
roots={'README.md','ops.md','dev-ops.md','package.json','package-lock.json','vite.config.js','playwright.config.js','index.html','machines.html','.gitignore','SHARED-NOTEPAD.md'}
prefixes=('src/','server/','public/','scripts/','tests/','docs/foundry/','art/blender/','artifacts/foundry/')
selected=[p for p in tracked if p and (p in roots or p.startswith(prefixes) or p=='artifacts/browser-results.json')]
entries=[('moon-foundry/'+p,root/p) for p in selected]
entries += [('moon-foundry/dist/'+p.relative_to(root/'dist').as_posix(),p) for p in (root/'dist').rglob('*') if p.is_file()]
archive('moon-foundry-operator.zip',entries)
bundle=output/'moon-foundry-source.bundle'
subprocess.run(['git','bundle','create',str(bundle),'--all'],cwd=root,check=True,capture_output=True)
subprocess.run(['git','bundle','verify',str(bundle)],cwd=root,check=True,capture_output=True)
digest=sha(bundle.read_bytes());Path(str(bundle)+'.sha256').write_text(digest+'  '+bundle.name+'\n')
report['artifacts'].append({'file':str(bundle),'bytes':bundle.stat().st_size,'sha256':digest,'verified':True})
(output/'release.json').write_text(json.dumps(report,indent=2)+'\n')
(output.parent/'FOUNDRY-LATEST.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)
