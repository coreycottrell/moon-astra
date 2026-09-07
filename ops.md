# Foundry operations

Current development is `/home/corey/projects/moon-build-programs`, branch `development/build-programs`, ruleset `moon-foundry-1`, schema/economy 3. The preserved local preview below runs `/home/corey/projects/moon-foundry`, branch `development/physical-industry`. The original Neighbors game has a different checkout, database and ruleset. See [DEVLOG.md](DEVLOG.md) for the active handoff.

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

## Hosted Moon v2

The live public mount is https://ai-civ.com/moon-astra-v2/ . On `aiciv-hub`, its dedicated `moon-astra-v2` service uses port 4182 and `/var/lib/moon-astra-v2/world.sqlite`; `moon-astra-v2-staging` uses 4183 and its own state directory. See [the deployment runbook](deploy/moon-astra-v2/README.md) for routing, checks, backup and rollback. The local preview below remains independent. [The deployed release record](deploy/moon-astra-v2/DEPLOYED-2026-09-06.md) includes exact revisions, backup checksums and validation. `moon-astra-v2-backup.timer` creates verified hourly snapshots of both v2 worlds; it is separate from all existing backup jobs.

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

## Rover movement, threads and player watcher (development/rover-motion)

Implementation fork: `/home/corey/projects/moon-rover-motion`. The previous preview remains at `/home/corey/projects/moon-foundry` on 4205/4206. This fork buffers robot snapshots by 1.2 seconds, follows acknowledged route corners, aligns Blender chassis with visible terrain, and rotates wheels by distance. Two regolith tread strips follow each driving rover. Tracks are bounded to 4,096 strips, fade after 15–20 minutes, survive local recentering, and clear on a world reset or page reload. They are session-local cosmetic history; no server terrain state or physical collision rule changes.

The top bar shows mind **used / available (free)**, with total and crew reservations in the tooltip. Board replies are optional arrays within existing schema-3 posts, capped at 100 replies per thread. The server adds `board.reply` and delegated `board` scope. Old saves and old clients remain compatible. A compatible backend rollback preserves these additive fields; do not restore an older database merely to roll back the application.

The event watcher and separate bounded player are described in `docs/foundry/PLAYER-WORKFLOW.md`. Operator config, access files and model logs must remain private and outside the published game. Default model allowance is six total turns across restarts, four commands per turn, ten-minute spacing. Do not inject a development or ACG primary pane. Tmux injection requires explicit opt-in and an idle READY handshake; the independent structured-plan runner is preferable.

Pre-change evidence: `/home/corey/moon-deployments/rover-motion-20260906T124824Z`. This includes a complete tracked-source archive at 79f0f87, the current v2 website payload/config, verified online snapshots of both v2 worlds, original page hashes, and all four server PIDs. Rollout must stage backend and frontend, verify persistent state, then promote only the v2 payload and service. Original Moon services, routes and databases stay independent.

The simplified AI help form dispatches `agent.request` as a directed board thread with no resource, crew or permission side effects. Agents act through normal commands after responding. The recipient can be chosen only from existing neighbors. Token controls remain under Advanced API access. Coarse planet tiles are excluded from rover contact sampling until local detail arrives, preventing sub-surface close-up placement during terrain loading.

## MiniMax Moon Guide

The [current deployed release](deploy/moon-astra-v2/GUIDE-DEPLOYED-2026-09-06.md) records runtime `d5d66e7`, website `e657a70`, verified save preservation and rollback targets. Both V2 services load `/etc/moon-astra-v2-guide.env` through their own `30-guide.conf` systemd drop-in; original Moon services do not. Open Settlement → Guide in the hosted V2 client. The older local preview is preserved and does not receive this feature through a server restart.

See [Moon Guide operations](docs/foundry/MOON-GUIDE.md). The dedicated key is held outside the repository at `/home/corey/moon-secrets/minimax.env` (0600); load a private copy with systemd EnvironmentFile only for V2 services. A missing or failed provider disables advice without stopping the game. `guide_answers` is an additive table in the V2 database; all world schema-3 snapshots remain compatible. Provider requests are asynchronous and bounded, with daily allowances persisted across restarts. Do not publish provider credentials or raw reasoning. The source devlog records actual staging and production status.

## Ordered construction fork — 2026-09-06

Finite build orders add optional `machines[].buildOrder` fields without migrating the schema-3 save. Existing single-output programs remain unchanged. New orders keep legacy `mode` off so an older runtime cannot turn a finite list into endless fabrication on rollback. Rollback should preserve the live database; it suspends ordered automation until the new runtime is restored. Never reset colony state.

For a stopped queue, inspect its `status`, `waitingJobId`, fabrication, pending kit and the referenced construction site. Cancellation requires owner review/new order; it does not automatically spend another kit. Waiting for commissioning releases four industry mind slots. New `replicator.order` and `replicator.stop` API actions are owner-only and cannot be invoked by existing bounded delegated players. Robot mind remains 0.25 per supervised worker; UI now states it explicitly. Fixed groups/repeat require the new Coordinated construction research.

Development and QA run in this isolated fork; existing tower previews, game worlds and the separate player watcher remain independent. Follow the deployment runbook for fresh online/stopped backups, exact restore checks, staging, full-site Git publication and production verification.

## Developer message board

Before resuming Moon development, read `/home/corey/moon-player/dev-board/inbox.md` and `initial-review.md`. A separate user cron job checks every minute and batches tmux status notifications, regardless of the gameplay six-turn limit. It does not start a model turn or execute messages. Announcement thread #23009 accepts developer notes; `[DEV]` titles are highlighted. See [developer-board operations](docs/foundry/DEV-BOARD-WORKFLOW.md) for health, deduplication, notification destination and stopping only this job. No live game deployment is needed for this operator-only script.


## Traffic/tunnel fork in progress — 2026-09-07

Source: `/home/corey/projects/moon-traffic-tunnels`, branch `development/traffic-tunnels`. Evidence and verified pre-change online saves: `/home/corey/moon-deployments/traffic-tunnels-20260907`. Production/staging still point to `releases/20260906-ba847ffc1f23` as captured before work; recheck pointers before promotion. No resets or unrelated-service changes. Website must use the existing full-site Git deployment pipeline.

Board cron wrapper now uses this fork. Real prompt injection is bound to pane %25 and session `01a06dd9-5847-7c73-b3a3-4ec974195750` with exact process IDs; it includes guarded staggered Enter retries. See DEV-BOARD-WORKFLOW.md. Review receipts are private under `/home/corey/moon-player/dev-board`.
