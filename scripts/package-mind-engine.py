import json,pathlib,zipfile,hashlib,shutil
root=pathlib.Path(__file__).resolve().parents[1]; report=root/'docs/moon-mind-learning-engine'
for name in ['gym.mjs','protocol.mjs']:shutil.copy2(root/'lib/mind-engine'/name,report/'engine'/name)
files={str(f.relative_to(root)):f.read_bytes() for f in sorted((root/'lib/mind-engine').glob('*.mjs'))}
for name in ['scripts/mind-engine.mjs','tests/mind-engine.test.js']:files[name]=(root/name).read_bytes()
files['README.md']=(root/'docs/MIND-ENGINE.md').read_bytes()
files['system-report.md']=(report/'system-report.md').read_bytes()
files['package.json']=(json.dumps({'name':'moon-mind-engine','version':'1.0.0','private':True,'type':'module','engines':{'node':'>=24.13.1'},'scripts':{'test':'node tests/mind-engine.test.js'}},indent=2)+'\n').encode()
files['.gitignore']=b'private/\n*.sqlite*\n*.env\n'
target=report/'mind-engine-starter.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for name,body in files.items():z.writestr('mind-engine-starter/'+name,body)
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 for name,body in files.items():assert z.read('mind-engine-starter/'+name)==body
print(json.dumps({'file':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'files':len(files),'verified':True}))

