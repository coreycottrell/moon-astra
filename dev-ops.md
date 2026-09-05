# MOON civilization — development and operations

Updated September 5, 2026. This runbook covers the **civilization fork**. [ops.md](ops.md) is the short operations entrypoint; the [shared notepad](SHARED-NOTEPAD.md) records current coordination and release evidence.

ACG has deployed the public game using the [ai-civ.com/moon-astra hosting instructions](docs/ACG-HOSTING-ai-civ.com.md): a separate `dist-aiciv/` client on the existing Netlify site and a persistent VPS API. At **18:42 UTC on September 5**, public GET checks returned game HTTP 200 and healthy economy-v2 production/staging APIs; the public gallery still returned 404. The local Blender art release is **`412eef1`**. Its website publication remains a separate ACG action. See the [dated review and evidence](docs/ACG-OPS-REVIEW-2026-09-05.md).

ACG's local `deploy/acg-as-deployed/` directory contains captured units, routing, inventory, a verifier and the backup program. ACG assembled and staged this separate handoff during the review; it was absent from the original `412eef1` archive. Treat its captured files as references rather than automatically installed services or portable runnable copies. Confirm the authoritative live configuration before changing it. Do not replace ACG's production routing with a generic template.

## Paths, Git, and isolation

| Item | Location |
| --- | --- |
| Original playable project | `/home/corey/projects/moon-astra` |
| Active civilization fork | `/home/corey/projects/moon-civilization` |
| Original game | `http://localhost:4173` |
| Fork game | `http://localhost:4175` |
| Fork game on current Wi-Fi | `http://192.168.6.34:4175` |
| Equipment gallery | `http://localhost:4175/machines.html` |
| Persistent local server session | `moon-server` in tmux |
| Fork development API | `http://127.0.0.1:4176` |
| Production smoke test | `http://127.0.0.1:4177`, disposable database |
| Browser tests | `http://127.0.0.1:4185`, API 4186, disposable database |
| Default persistent database | `/home/corey/projects/moon-civilization/.world/world.sqlite` |
| CLI player access files | `/home/corey/projects/moon-civilization/.agent-access/` |

The fork is an independent Git clone on `development/shared-world`. Tag `prototype-baseline` points to commit `4469345`, preserving the playable prototype and completed design proposal before implementation. Git objects were cloned without hardlinks. The fork's `origin` points to the original **local** project as provenance; no remote hosting or push was performed. Do not push development commits into the original working checkout. ACG can assign a separate hosted remote when ready.

The isolated art worktree is `/home/corey/projects/moon-machine-art`, branch `art/industrial-machines`; its tested code was integrated into the active fork. The preserved original's 62 fingerprinted files were unchanged after integration.

ACG's inventory captured at 18:35 UTC records this hosted layout; public health was checked at 18:42 UTC, but remote systemd configuration was not re-read during this review:

| World | Service / private port | Persistent database | Trusted browser origin |
| --- | --- | --- | --- |
| Production | `moon-astra.service` / `127.0.0.1:4180` | `/var/lib/moon-astra/world.sqlite` | `https://ai-civ.com` |
| Staging | `moon-astra-staging.service` / `127.0.0.1:4181` | `/var/lib/moon-astra-staging/world.sqlite` | `https://deploy-moon-astra--aiciv-inc.netlify.app` |

Both hosted APIs were recorded at source `f372e8c`. Production uses `/usr/local/bin/node`; the captured staging unit uses `/opt/node-v24.20.0-linux-x64/bin/node`. Both retain `--preserve-symlinks-main` when starting through their `current` symlink. Public API hosts are `moon-astra-api.ai-civ.com` and `moon-astra-api-staging.ai-civ.com`. Keep separate database directories and one accepted origin per world. An exported tower token does not log into the independently created public world.

Work in the fork. Do not change the original directory, its running server, or browser key `moon-astra-world-v1`. The fork's browser stores only its private token under `moon-civilization-access-v1` and view under `moon-civilization-view-v1`; economic state belongs to SQLite. There is no migration from the original browser-only save.

## Economy version 2 update

The slower production and local mind-capacity rules are enforced by the API server. Restart that server after a **backend rules update**; Vite hot reload alone does not change live production. The Blender release does not require a backend restart or migration: the server, economy, network protocol and dependency files are unchanged from `f372e8c`. Before a backend update, stop its one world process cleanly and back up its entire database directory, including any SQLite WAL files. Preserve player access files separately. Never copy a disposable test world over the live database.

On startup, a format-2 world with no `economyVersion` (or version 1) is migrated once to economy version 2: stored harvester rates are divided by ten, a rules-update event is recorded, and claim revisions advance. Inventory, deposits, machines, jobs, programs, research, shipments, identities and command receipts are retained. The update uses the existing transactional single-writer check. Future unknown economy versions are rejected. Subsequent restarts do not divide rates again. `/api/v1/health` and `/catalog` report `economyVersion: 2`; `/observe` includes per-claim `industry` status and current rates.

Existing factories may wait if their local mind capacity is insufficient. Each node supplies 4 capacity; harvester/refinery/programmed replicator use 1/2/4. The UI identifies the affected machines and offers node placement. Do not grant replacement resources or modify player programs during migration. Rates and supervision constants live in `src/industry.js`; the deterministic lab verifies that the starter economy can fund expansion without injected materials.

For the local upgrade, the user explicitly requested a fresh start. The stopped pre-reset world (116 machines, tick 13,040) is preserved at `/home/corey/moon-world-backups/before-economy-v2-reset-2026-09-05T160725-150Z/world/`, with `reset-report.json` beside it. Both existing player IDs and claim addresses were retained; the world was recreated with only starting landers, 240 metal per claim, full deposits and zero progress. Old command receipts were cleared. This was a one-time requested reset, **not** automatic startup behavior. Saved browser and CLI logins still work.

## Runtime and commands

Tested on Node 24.13.1 and npm 11.8.0 on Linux. Use Node 24.13 or newer in the 24.x series. `node:sqlite` is bundled with Node and currently emits an experimental warning. Dependencies remain the locked Three.js, Vite, and Playwright packages; no database package or cloud account is needed.

The local game currently runs in the dedicated **`moon-server` tmux session**, started from this project. Inspect it before starting anything:

```bash
curl --fail --silent http://127.0.0.1:4175/api/v1/health
tmux list-panes -t moon-server -F '#{pane_pid} #{pane_current_command} #{pane_current_path}'
tmux capture-pane -p -t moon-server -S -80
tmux attach -t moon-server
```

Detach with **Ctrl+B, then D**. From the laptop, use `ssh -t corey@192.168.6.34 'tmux attach -t moon-server'`. The Wi-Fi address may change with DHCP.

If health is unavailable, check the session and listeners (`ss -ltnp` for 4175/4176). If a world process remains, inspect its logs rather than starting another. Once both the old process and old session have exited, this recreates the persistent local session with the existing database:

```bash
tmux new-session -d -s moon-server -c /home/corey/projects/moon-civilization \
  '/home/corey/.nvm/versions/node/v24.13.1/bin/node scripts/dev.mjs'
curl --fail --silent http://127.0.0.1:4175/api/v1/health
```

Allow startup to complete before interpreting the health result; verify an advancing tick with a second read. On a fresh checkout, use the pinned Node version and `npm ci` before starting `npm run dev`. The absolute Node path above is specific to this tower.

`dev` launches the API at loopback 4176 and Vite at 0.0.0.0:4175. Vite proxies `/api` without changing the origin. Strict ports prevent a silent move onto another game address. Ctrl+C stops both fork processes. Closing a browser does not stop the world; closing the server does.

For the compiled game, stop `dev` first:

```bash
npm run build
npm start
```

`start` and `preview` run the same Node production server, serving **both** `dist/` and the API on loopback 4175. Static-only hosting is insufficient. On a trusted LAN, run `MOON_HOST=0.0.0.0 npm start` to accept other computers. Use the same browser hostname and port to retain the token, or export and resume the token on another origin.

The tower's tmux session survives detaching or closing the client terminal; it is not a boot service and may not survive logout policy or reboot. No local boot autostart was installed. The hosted worlds use ACG's separate systemd services. For hosted incidents, inspect `systemctl status moon-astra` and `journalctl -u moon-astra -n 80 --no-pager` on the VPS; use the staging unit name for staging. Confirm health and the expected loopback listener after a restart rather than relying on the command's exit status alone.

Environment options:

| Variable | Use |
| --- | --- |
| `MOON_DB` | Absolute database path; defaults to `.world/world.sqlite` relative to project root |
| `MOON_HOST` | API/production bind address; default `127.0.0.1` |
| `MOON_PUBLIC_ORIGIN` | Optional exact browser origin through a reverse proxy, e.g. `https://ai-civ.com` (no path) |
| `MOON_PORT` | Direct `npm run server` / production port; defaults 4176 / 4175 |
| `MOON_WEB_PORT` | Vite frontend port; default 4175 |
| `MOON_API_PORT` | `dev` API and proxy port; default 4176 |
| `MOON_WEB_HOST` | Vite bind address; default `0.0.0.0` |
| `MOON_URL` | Agent CLI target; default `http://127.0.0.1:4175` |
| `MOON_CHROMIUM_PATH` | Chromium executable for verification |

This is an open-registration preview for a trusted group. ACG provides public HTTPS and reverse-proxy routing; invitations, credential rotation/recovery, stronger abuse limits and external account identity are still unimplemented. `MOON_HOST=0.0.0.0` only changes the bind address. Keep the hosted API loopback-only behind its existing HTTPS proxy.

## Persistence and recovery

SQLite stores a complete world document, hashed player tokens, and idempotency receipts. Every tick and accepted command commits transactionally using WAL and synchronous FULL. Receipts and the corresponding world changes share the same transaction. A duplicate command retrieves its receipt, including after restart.

Run **one world process per database**. The server compares its last known database state inside each write transaction. If another writer changed it, or a persistence/simulation failure occurs, the affected world process stops advancing; health returns 503. Stop the competing processes, preserve the database and logs, then restart a single process. This check prevents stale overwrites; it is not a distributed cluster or leader election system.

World time advances one tick per nominal server second. A busy event loop can slow it. Server downtime creates no catch-up production, and there is no pause-all admin API. Pause only affects the named settlement's production and construction; in-transit deliveries continue on world ticks. No simulation time is controlled by browser focus or background throttling.

The database is versioned by `version: 2` and `ruleset: moon-neighbors-1`. Unsupported saved versions fail startup. There is no schema migration framework yet. Back up before changing rules, terrain, or dependencies; restore with the matching source revision.

## Backups

ACG's production backup lane is now configured separately from release archives. The hourly Chronos event `evt_moon_astra_world_backup_hourly` runs the authoritative ACG `tools/moon_astra_backup.py`: SQLite online backup on the live VPS, integrity/row-count checks, gzip and checksum, transfer to the workstation, then checksum and database-open verification there. It does **not** stop production each hour. The scheduler's freshness guard can skip a slot; inspect the most recent actual `GREEN`, not simply the latest scheduler exit code or a `SKIPPED` row.

The ledger at `/home/corey/projects/AI-CIV/ACG/data/durability/moon_astra_manifest.jsonl` contained a production `GREEN` at **18:40:16 UTC**, tick 14,342, with integrity `ok`, matching checksums/row counts and both copies opened; no failure flag was present at this review. This was a ledger inspection, not a new restore drill or scheduler execution. Monitor fresh `GREEN` records, subsequent failures and `MOON-ASTRA-BACKUP-FAILED.flag`. Staging has no scheduled backup lane by ACG's current decision.

Run backup maintenance from its authoritative ACG checkout. The copy in `deploy/acg-as-deployed/backup/` derives its output root from its own file location, so executing that mirror would point at a different local ledger. Its current CLI has no `--label` option; adding staging backup requires an implementation/configuration change, not merely supplying that flag.

The original full archive is:

`/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T015553Z.zip`

Its adjacent `.sha256` and `.manifest.json` verify that preserved prototype, including original downloads. It predates this development fork. Do not overwrite it.

For a consistent full fork backup:

1. Stop the fork's world process gracefully. Leave the original server running.
2. Archive the entire `moon-civilization/` folder into a timestamped ZIP on `/media/corey/Expansion/backups/moon-civilization/`, including `.git`, `.world`, source, prepared assets, README, this file, dependencies, build, and artifacts.
3. Include any remaining SQLite `-wal` and `-shm` files together with the database. A clean shutdown normally checkpoints them; do not copy a live database file in isolation.
4. Decide whether the private `.agent-access/` credentials belong in that private backup. A full local backup may include them, but a shared source archive should exclude them. The database contains token hashes; browser-only tokens are not recoverable from it.
5. Write a SHA-256 digest next to the archive and verify the ZIP entries. Restore to a new directory first, then start only one world process using the restored database.

The in-game **Export world snapshot** produces an observation JSON for inspection. It is not a restorable database backup and contains no bearer tokens, receipt ledger, or private browser storage. **Export my access token** separately preserves the player's credential. Project archives do not include tokens that exist only in other people's browser profiles.

`.world/`, `.agent-access/`, `node_modules/`, `dist/`, test traces, and the raw download cache are Git-ignored. Never stage runtime credentials. Source, prepared terrain assets, attribution, lockfile, documents, and nonsecret verification evidence belong in Git.

## Verification

```bash
npm test
npm run lab
npm run build
npm run test:browser
node scripts/production-smoke.mjs
npm run build:aiciv
npm run test:aiciv
```

The core suite retains original geography/simulation regressions and adds ownership, finite deposits, local power, delegation, transactional blueprints, research, freight, recursive program inheritance, API authentication, duplicate receipts, concurrent commands, restart persistence, and competing writer rejection.

Browser tests create a disposable world on 4185/4186. They exercise normal joins, actual terrain placement, research over real server time, partner deliveries, factory layout placement, programmable replication, saved identities, neighbor visits, all four scales, polar terrain, and phone controls. They use no administrative tick shortcut and leave both playable worlds untouched. Software rendering may take several seconds to refine polar tiles; tests allow for that asynchronous work.

For the Blender release, **31 core/API/model tests and all four browser scenarios passed**, including six-model animation, idle behavior, repeated instance switching, LOD and the phone gallery. The final browser run took 5.8 minutes. Keep source files unchanged during browser checks: a Vite full reload can invalidate the test page. Heavy concurrent rendering also slows software WebGL. The test helpers overwrite their screenshots/reports in `artifacts/`; use a separate worktree when ACG has an independently edited deployment screenshot there.

The production smoke helper starts `dist/` with its own temporary SQLite database on 4177, then checks a human browser and an actual CLI collaborator sharing the world. It verifies private access file permissions, repeat-safe bootstrap, WebGL, and absence of development diagnostics. `scripts/inspect-browser.mjs` invokes this same isolated smoke check. Neither helper opens the original 4173 game.

The local Chromium path defaults to `/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`. On another machine set `MOON_CHROMIUM_PATH` to an installed executable. Headless tests use software graphics and `--no-sandbox` for this local application; normal players use their ordinary browser.

Evidence lives in `artifacts/verification.md`, `browser-results.json`, `shared-production-results.json`, `collaboration-lab.json`, and `shared-*.png`. Other old screenshots came from the baseline and remain for comparison.

Blender evidence is in [artifacts/machines/verification.md](artifacts/machines/verification.md), with live screenshots and `live-game-check.json`. The final read-only visit viewed the `laptop` settlement with 19 machines, loaded 21 nearby detailed instances and reported 730 draw calls / 733,344 rendered triangles. These are scene counters including terrain and render passes, not model-file triangle counts or an FPS benchmark. No game commands were submitted.

## Blender assets and frontend release

All six types have prepared GLBs in `public/models/industrial-01/`, totaling 5,266,148 bytes and 96,980 model triangles. The manifest records hashes and animation clips. Editable source is `art/blender/moon-industrial-collection.blend`; rebuild with `bash scripts/build-machine-assets.sh` on the art workstation. Blender is not needed on the VPS or to build the already prepared client. See [art/README.md](art/README.md) for Blender/Python setup and the animation reel.

The loader shares cached geometry; each instance has its own motion and status lights. At 260 m, LOD selects the earlier procedural representation. A failed GLB request falls back to that model, so a playable page alone does not prove that the new art was deployed. Animations respond to supervision, pause and power; game dialogs hold the background 3D frame while interface data continues updating.

For this frontend-only release:

1. Pin the source revision and build with `npm run build:aiciv`. `dist-aiciv/` now includes `index.html`, `machines.html`, shared hashed chunks in `assets/`, `models/industrial-01/`, and `data/`. Retain attribution. Copy the complete client into the site's `moon-astra/` subtree through ACG's existing Git workflow.
2. Keep the current economy-v2 API and database. The older hosting instruction to match frontend/API Git SHAs applies to coordinated protocol/rules changes; this art release is explicitly compatible with the unchanged `f372e8c` backend. Record both revisions in the deployment log.
3. Preserve the existing preview/branch-deploy command that installs Netlify function dependencies and rewrites the API route to staging. Changing that command can break other site functions or send a preview to the wrong world.
4. In staging, GET both HTML pages, their actual script/preload/CSS references, and all six GLBs. Require successful binary responses, GLB magic `glTF`, byte counts and SHA-256 matches to the built files. Confirm the gallery works without a game account and a nonexistent model returns 404. Check HTML revalidation and versioned asset caching; the original header template does not yet explicitly cover `machines.html` or `models/`.
5. Update the authoritative ACG verifier before using it as the art release gate: its copied section 9 still matches `assets/index-.*\.js`, whereas this build uses `assets/game-*.js` plus shared `machines-*.js` chunks. It also skips frontend checks in staging mode. See the [review addendum](docs/ACG-OPS-REVIEW-2026-09-05.md) for the remaining verification gaps.
6. Recheck the public paths after publication and record the site deploy ID, source revision, backend revision and previous good site deploy. Roll back a bad art release through the site's normal frontend rollback. Preserve the live database and current API during that rollback. Retain required older hashed files/model versions for open tabs, or deliberately require a reload; a scoped `rsync --delete` alone does not retain them.

`/home/corey/moon-releases/LATEST.json` points to the immutable, checksummed source archive. Git source archives include prepared models, Blender source and review artifacts; they exclude compiled output, live worlds, credentials and dependencies. Build the matching client from the archive. An updated documentation archive may have a later Git SHA while retaining the same `412eef1` gameplay/art code.

## Assets and architecture

`public/data/` includes the prepared NASA height grid and lunar imagery. The fork intentionally did not duplicate the large `.asset-cache/` of original downloads. That cache remains in the original directory/backup. Ordinary `npm ci`, build, and play do not need asset regeneration or external requests. Use `python3 scripts/prepare_assets.py` only when deliberately rebuilding source data, with NumPy and Pillow installed. Keep `NOTICE.md` and `public/data/sources.json` with redistributed assets.

The frontend renders but never advances economics. `src/network.js` connects it to the server. `src/shared-world.js` is the deterministic rules core; `src/claims.js` fixes ownership independently of visual LOD. `server/world-server.mjs` provides the only game mutation boundary. Machine catalog definitions remain in `src/simulation.js`; its old browser-only simulation class is retained for baseline regressions but is not used by this fork's live game.

This world is deliberately bounded: at most 24 accounts, 1,000 machines plus jobs, a full snapshot per observation, a full world JSON commit per tick, and a recent 160-event window. No performance claim is made for a populated 1,000-machine world. Large populations need indexed spatial queries, region scheduling, observation filtering, event compaction, and load testing before raising the cap.

The full design proposal remains under `docs/moon-civilization-proposal/`. It describes the wider campaign, not a promise that every system exists in this build. The next implementation target is physical power and material networks before expanding parcel ownership and technology breadth.
