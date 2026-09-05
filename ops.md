# Foundry operations

Applies only to `/home/corey/projects/moon-foundry`, branch `development/physical-industry`, ruleset `moon-foundry-1`, schema/economy 3. The neighboring live game has a different checkout, database and ruleset.

| Service | Location |
| --- | --- |
| Persistent preview | tmux `moon-foundry` |
| Game | `http://localhost:4205/` |
| LAN game | `http://192.168.6.34:4205/` |
| API | `http://127.0.0.1:4206/api/v1/health` |
| Database | `/home/corey/projects/moon-foundry/.world/world.sqlite` |
| Process log | `/home/corey/projects/moon-foundry/.world/dev.log` |
| Disposable browser tests | 4215 / 4216 |
| Preserved Neighbors service | tmux `moon-server`, 4175 / 4176; do not alter |
| Whitepaper preview | tmux `moon-whitepaper`, 4190; independent |

## Start and restart

```sh
cd /home/corey/projects/moon-foundry
npm run dev
```

For a persistent detached session, use a fresh `moon-foundry` session if it does not already exist:

```sh
tmux new-session -d -s moon-foundry -c /home/corey/projects/moon-foundry 'PATH=/home/corey/.nvm/versions/node/v24.13.1/bin:$PATH node scripts/dev.mjs >> .world/dev.log 2>&1'
```

The dev script stops both of its children on a signal. To restart this preview, interrupt its dev process gracefully, confirm 4205/4206 are free and the old tmux session has exited, then start it again. Server source is loaded at process startup; Vite hot reload alone does not update server simulation code. Never run two processes against one database. Do not use a broad `killall node` or stop an unrelated tmux session.

Production uses `npm run build` followed by `MOON_HOST=127.0.0.1 MOON_PORT=4206 MOON_DB=/absolute/foundry.sqlite npm start`. The production process serves `dist/` and `/api/v1` together. Use a reverse proxy and a separate Foundry public origin. See HOSTING-ACG.md.

## Check health and support

```sh
curl --fail http://127.0.0.1:4206/api/v1/health
```

Confirm `ok: true`, ruleset `moon-foundry-1`, economy 3, and an advancing tick. Authenticated `/api/v1/metrics` reports recent commit p50/p95/max, memory, world bytes, command count and queue sizes. `/api/v1/audit` returns the requesting owner’s recent commands. Inspect `.world/dev.log` after any 503. The server pauses after persistence or simulation failure rather than silently dropping work.

Admission limits are 24 settlements, 256 robots including queued chassis reservations, 1,000 machines plus sites, and 4,096 cargo packets. These are guards, not measured production capacity guarantees. Full snapshots and the single-writer SQLite transaction remain deliberate limitations of this preview.

## Back up without stopping the game

Use Python's SQLite `Connection.backup()` against the live database into a new file. Do not copy only `world.sqlite` while WAL writes are active. Do not overwrite a live database or redirect decompression into it.

Validate the copied database with `PRAGMA integrity_check`, required tables, an actual `world` row, and `version == 3`, `economyVersion == 3`, `ruleset == 'moon-foundry-1'`. Record tick, players, robots, machines, source Git revision and a SHA-256. An empty SQLite file can pass an integrity check and is not a valid world backup.

A full private project backup includes `.git`, source, docs, assets, dependency lockfile, installed dependencies, and the consistent database copy. `.agent-access` and the database contain credentials or credential hashes: keep a full backup private. The hosting package must exclude them.

## Restore

Restore into a fresh directory first. Verify the archive SHA and every manifest entry, inspect README/ops, validate its database's ruleset and world row, and preserve the previous database and WAL/SHM as one recovery set. Stop only the Foundry process before replacing its database. Restart with the same compatible source version, then check health, tick, identities, inventories and pending cargo. Test account access using its corresponding private credential file.

Foundry refuses an existing Neighbors, empty, or incompatible database before schema writes. This is not a migration tool. Never point `MOON_DB` at the canonical Neighbors database.

## Release verification

`npm test` runs rules, navigation, conservation, catalog/asset and isolated HTTP tests. `npm run test:browser` starts a disposable accelerated world. `npm run lab` runs a deterministic two-agent campaign and writes its exact final state and timeline. These commands do not reset or join the persistent preview.

The browser clock acceleration exists only in `scripts/test-server.mjs`. The persistent server always uses its normal one-second tick. Keep test fixtures, backups, agent files and database files out of public hosting.

## ACG coordination

Append to `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. Include the isolated fork revision, release checksum, test evidence and proposed separate mount. The live game and whitepaper publication remain under ACG’s existing deployment process. Inherited `deploy/` and older hosting documents describe Neighbors and are historical context; use `docs/foundry/HOSTING-ACG.md` for this fork.

## Build a reviewable release

After committing a clean reviewed checkout, run `npm run build`, `npm run build:aiciv`, `npm run test:aiciv`, then `python3 scripts/package-foundry.py`. The packager verifies each archive entry and writes `/home/corey/moon-releases/FOUNDRY-LATEST.json`; it does not deploy anything. Only `moon-foundry-site.zip` is a website payload. The operator ZIP and Git bundle belong with deployment/recovery files.

On Corey's tower, `python3 scripts/backup-foundry.py` performs that full private backup, stages and verifies the ZIP locally, then copies and hashes it on Expansion under `backups/moon-foundry/`. The report pointer is `/home/corey/moon-world-backups/FOUNDRY-LATEST.json`. It includes all regular checkout files and symlinks except the live `.world/` directory, which is replaced by its verified online database snapshot; runtime logs are excluded. Neither persistent game is stopped by this backup.
