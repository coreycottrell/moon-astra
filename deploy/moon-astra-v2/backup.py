#!/usr/bin/env python3
"""Online snapshots of only the two Foundry v2 worlds; run as root on aiciv-hub."""
import datetime, hashlib, json, os, pathlib, sqlite3
os.umask(0o077)
root=pathlib.Path('/var/backups/moon-astra-v2')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
run=root/stamp
run.mkdir(parents=True,mode=0o700)
report={}
for name in ['moon-astra-v2','moon-astra-v2-staging']:
    source=pathlib.Path('/var/lib')/name/'world.sqlite'
    target=run/(name+'.sqlite')
    with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True,timeout=30) as src, sqlite3.connect(target) as dst:
        src.backup(dst,pages=256,sleep=.05)
        assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        world=json.loads(dst.execute('SELECT data FROM world WHERE id=1').fetchone()[0])
        assert (world['version'],world['economyVersion'],world['ruleset'])==(3,3,'moon-foundry-1')
        counts={table:dst.execute('SELECT count(*) FROM '+table).fetchone()[0] for table in ['world','identities','delegations','receipts','audit']}
        assert counts['identities']==len(world['players'])
    release=json.loads((pathlib.Path('/srv')/name/'current/RELEASE.json').read_text())
    report[name]={'sourceRevision':release['sourceRevision'],'tick':world['tick'],'players':len(world['players']),'tables':counts,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(run/'report.json').write_text(json.dumps(report,indent=2)+'\n')
(root/'latest.json').write_text(json.dumps({'directory':str(run),'worlds':report},indent=2)+'\n')
print(json.dumps({'directory':str(run),'worlds':report},indent=2))
