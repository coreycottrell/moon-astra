"""Private full checkout backup with a consistent online SQLite snapshot.
The live server keeps running. Restore into a fresh directory, never over a live world.
"""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,os,shutil,sqlite3,stat,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
os.umask(0o077)
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
snapshot=Path('/home/corey/moon-world-backups')/('foundry-'+stamp);snapshot.mkdir(parents=True)
destination=Path('/media/corey/Expansion/backups/moon-foundry');destination.mkdir(parents=True,exist_ok=True)
source=sqlite3.connect(f'file:{root}/.world/world.sqlite?mode=ro',uri=True);target=sqlite3.connect(snapshot/'world.sqlite')
source.backup(target,pages=256,sleep=.01);target.close();source.close()
db=sqlite3.connect(f'file:{snapshot}/world.sqlite?mode=ro',uri=True)
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
counts={table:db.execute('SELECT count(*) FROM '+table).fetchone()[0] for table in ['world','identities','receipts','delegations','audit']}
world=json.loads(db.execute('SELECT data FROM world WHERE id=1').fetchone()[0]);db.close()
assert (world['version'],world['economyVersion'],world['ruleset'])==(3,3,'moon-foundry-1')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
subprocess.run(['git','bundle','create',str(snapshot/'repository.bundle'),'--all'],cwd=root,check=True,capture_output=True)
report={'created':stamp,'source':str(root),'sourceRevision':head,'privateFullBackup':True,'databaseMethod':'SQLite online backup; live WAL/SHM and runtime logs excluded','worldVersion':3,'economyVersion':3,'ruleset':world['ruleset'],'worldTick':world['tick'],'worldPlayers':len(world['players']),'worldMachines':len(world['machines']),'worldRobots':len(world['robots']),'databaseIntegrity':'ok','databaseTables':counts,'browserOnlyCredentials':'Not captured; browser profiles are outside this checkout','sourceFiles':[]}
name='moon-foundry-full-'+stamp+'.zip';local=snapshot/name
hash_bytes=lambda data:hashlib.sha256(data).hexdigest()
def file_hash(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
with zipfile.ZipFile(local,'w',zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
    for current,dirs,files in os.walk(root,followlinks=False):
        current=Path(current)
        if current==root:dirs[:]=[d for d in dirs if d!='.world']
        for name in list(dirs):
            if (current/name).is_symlink():files.append(name);dirs.remove(name)
        for name in sorted(files):
            path=current/name;relative=path.relative_to(root).as_posix();mode=path.lstat().st_mode
            if stat.S_ISLNK(mode):
                data=os.readlink(path).encode();entry=zipfile.ZipInfo('moon-foundry/'+relative);entry.create_system=3;entry.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(entry,data)
            elif stat.S_ISREG(mode):
                for attempt in range(3):
                    before=path.stat();data=path.read_bytes();after=path.stat()
                    if (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns):break
                else:raise RuntimeError('File kept changing during backup: '+relative)
                entry=zipfile.ZipInfo('moon-foundry/'+relative);entry.create_system=3;entry.external_attr=mode<<16;entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,data,compresslevel=3)
            else:continue
            report['sourceFiles'].append({'path':relative,'bytes':len(data),'sha256':hash_bytes(data),'symlink':stat.S_ISLNK(mode)})
    z.write(snapshot/'world.sqlite','moon-foundry/.world/world.sqlite')
    z.write(snapshot/'repository.bundle','RESTORE/repository.bundle')
    z.writestr('RESTORE/manifest.json',json.dumps(report,indent=2)+'\n')
    z.writestr('RESTORE/README.txt','Private complete Foundry checkout including Git history, installed dependencies and consistent SQLite snapshot. Runtime logs and live WAL/SHM are excluded. Account files, if present, are private. Browser profiles and their tokens are not included. Verify this ZIP and manifest, extract into a fresh directory, validate schema/economy 3 and moon-foundry-1, and start only with the matching source. Never restore over an active database. The original Neighbors world is a different ruleset. See moon-foundry/ops.md and README.md.\n')
with zipfile.ZipFile(local) as z:
    assert z.testzip() is None
    for entry in report['sourceFiles']:assert hash_bytes(z.read('moon-foundry/'+entry['path']))==entry['sha256'],entry['path']
    assert hash_bytes(z.read('moon-foundry/.world/world.sqlite'))==file_hash(snapshot/'world.sqlite')
    for required in ['README.md','dev-ops.md','ops.md']:assert 'moon-foundry/'+required in z.namelist()
print('Local ZIP verified:',local,local.stat().st_size,'bytes',flush=True)
archive=destination/local.name;partial=Path(str(archive)+'.partial');shutil.copyfile(local,partial)
digest=file_hash(local);assert file_hash(partial)==digest;partial.replace(archive)
summary={k:v for k,v in report.items() if k!='sourceFiles'}
summary.update(archive=str(archive),archiveBytes=archive.stat().st_size,sha256=digest,files=len(report['sourceFiles']),snapshotDirectory=str(snapshot),verified=True)
Path(str(archive)+'.sha256').write_text(digest+'  '+archive.name+'\n');Path(str(archive)+'.manifest.json').write_text(json.dumps(summary,indent=2)+'\n')
(snapshot/'backup-report.json').write_text(json.dumps(summary,indent=2)+'\n');(snapshot.parent/'FOUNDRY-LATEST.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2),flush=True)
