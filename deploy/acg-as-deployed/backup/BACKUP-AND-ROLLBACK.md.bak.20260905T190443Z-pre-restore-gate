# Backup and rollback — what exists, where, and how to prove a snapshot restores

Read off the running system 2026-09-05 18:30–18:40Z.

## The honest starting point

Before 2026-09-05 the live MOON world had been accumulating player state with
**zero backups**. `/var/backups/moon-astra` did not exist at all. This is recorded
because a durability section that opens with its own architecture, rather than
with how bad it recently was, teaches the reader nothing.

## Three tiers

| tier | location | cadence | purpose |
|---|---|---|---|
| pre-update snapshot | `/var/backups/moon-astra/pre-<rev>-<ts>.tgz` + `.sha256` | by hand, before each switch | the rollback target for *this* deploy |
| host-local hourly | `/var/backups/moon-astra/moon-astra-world-<ts>.sqlite.gz` | hourly | fast restore, same machine |
| **off-machine hourly** | `<ACG repo>/data/durability/moon-astra/` on the workstation | hourly, keep-168 | **the actual durability claim** |

**The direction of "off-machine" is the part that is easy to get backwards.** ACG's
git spine backs the *workstation up to* this hub. So for a hub-hosted store, a copy
into the workstation's usual backup folder would be a **same-machine** copy wearing
the word "off-machine". The real leg runs **hub → workstation**, and that reversed
leg is the claim. The host-local tier is fast-restore, not durability.

## How the snapshot is taken, and why not the documented way

The hosting guide's §8 says stop the service and tar the persistent directory.
That is right for a **hand-taken pre-update snapshot** — it took the first one —
and wrong for an unattended lane, which would stop a live world every hour forever.

The hourly lane instead uses the **SQLite online backup API** (`tools/moon_astra_backup.py`,
copied here). Never a `cp` of a live database, never a service stop. This still
satisfies §8's actual requirement — *"do not copy an active database file by
itself"* — because it is not a file copy. It matters here: the world runs in WAL
mode and right now carries a **4.1 MB `-wal`** against a 110 KB main file, so a
naive `cp world.sqlite` would capture a torn, stale world and look fine doing it.

Scheduling is one Chronos event, `evt_moon_astra_world_backup_hourly`. **No cron**,
on either machine.

The lane does not trust itself at any step:

```
online backup on the host
  → open the copy remotely: integrity_check + per-table row counts
  → gzip + sha256 on the host
  → scp host → workstation
  → local sha256 must EQUAL the host's
  → local OPEN whose row counts must EQUAL the host's
```

`scp exited 0` is not verification and is never accepted as such.
Failure is loud: non-zero exit, a RED row in `data/durability/moon_astra_manifest.jsonl`,
and a `MOON-ASTRA-BACKUP-FAILED.flag` file.

**The gate has gone red 3 times** (visible in the manifest, all at build time, when
it was deliberately driven red on all three legs — unreachable host, service not
active, remote-snapshot failure — and green again after). That is the evidence it
is not a false-green.

## Proving a snapshot actually restores

Do not trust a byte count. Restore it and open it. Run on a **scratch copy** —
never over the live file:

```bash
SNAP=data/durability/moon-astra/moon-astra-world-20260905T174711Z.sqlite.gz
mkdir -p /tmp/moon-restore-test
gunzip -c "$SNAP" > /tmp/moon-restore-test/world.sqlite
echo "gunzip exit=$?"

python3 - <<'PY'
import sqlite3, json
c = sqlite3.connect('/tmp/moon-restore-test/world.sqlite')
print('integrity:', c.execute('PRAGMA integrity_check').fetchone()[0])
for t in ('world','identities','receipts'):
    print(t, c.execute(f'select count(*) from "{t}"').fetchone()[0])
w = json.loads(c.execute('select * from world').fetchone()[1])
print('tick', w['tick'], 'economyVersion', w['economyVersion'],
      'players', len(w['players']), 'ruleset', w['ruleset'])
PY
```

Run 2026-09-05 18:34Z against that snapshot. Result:

```
gunzip exit=0
integrity: ok
world 1 / identities 1 / receipts 0
tick 11163  economyVersion 2  players 1  ruleset moon-neighbors-1
```

The world row deserialized, the economy version is the one that shipped, and the
player roster is intact. **That is a restore, not a file that merely unzipped.**

The same check on the pre-update tarball is what proved it captured *current*
state rather than a stale checkpoint: its world row read tick 9208, matching the
health reading taken seconds before the stop. A snapshot whose tick predates the
stop is a snapshot of the wrong moment.

One SQLite detail worth carrying: on the graceful stop, SQLite checkpointed the
WAL into the main file and removed the `-wal`/`-shm` companions, so the production
tarball's single file **is** the complete world. Staging's archive still contains
its `-wal`/`-shm` companions — restore all three together or lose the tail.

## Rollback

```bash
# CODE ONLY — the world is untouched. Try this first; it is reversible.
ssh root@87.99.131.49 \
  'ln -sfn releases/49f6d88 /srv/moon-astra/current && systemctl restart moon-astra'
```

Both release directories are on disk on **both** services right now
(`49f6d88` 32M, `f372e8c` 55M). This is the only reason the one-line rollback
exists, and it is why `--preserve-symlinks-main` was chosen over hardcoding the
release path in the unit: hardcoding also fixes the entrypoint guard, and silently
removes this.

```bash
# CODE + WORLD — destroys all play since the snapshot. Only for a damaged world.
ssh root@87.99.131.49 'systemctl stop moon-astra && \
  tar -xzf /var/backups/moon-astra/pre-f372e8c-20260905T171404Z.tgz -C /var/lib && \
  ln -sfn releases/49f6d88 /srv/moon-astra/current && systemctl start moon-astra'
```

Then run `verify/verify-moon-deploy.sh` and confirm the tick advances. A restored
world that does not tick is a restored file, not a restored service.

Site rollback target: the currently published `main` of `aiciv-inc-site`.

## Named gaps — decisions and oversights, told apart

- **Staging is not backed up. This is a decision.** It is a disposable world fed by
  the Netlify branch-deploy preview; losing it costs a redeploy, not player state.
  If that stops being true: add a second `--label` to `moon_astra_backup.py`
  pointing at `/var/lib/moon-astra-staging/world.sqlite`. Owner: fleet-lead.
- **Retention is keep-168 (7 days hourly) on both sides.** 24h of retention only
  protects against "yesterday was fine", not against slow corruption found days
  later.
- **Restore has been proven on a scratch copy, never rehearsed end-to-end against
  a live service.** We have not once stopped production, restored a snapshot, and
  restarted. That is the honest limit of this claim. Owner: fleet-lead.
