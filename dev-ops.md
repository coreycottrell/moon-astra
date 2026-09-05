# MOON civilization — development and operations

Prepared September 5, 2026. This handoff describes the **civilization fork**, not the preserved static prototype.

For the requested public URL, use the dedicated [ACG hosting instructions for ai-civ.com/moon-astra](docs/ACG-HOSTING-ai-civ.com.md). That deployment builds a separate `dist-aiciv/` client for the existing Netlify site and runs the persistent API on a Linux host. Templates are in `deploy/`; neither site publication nor remote installation has been performed here.

## Paths, Git, and isolation

| Item | Location |
| --- | --- |
| Original playable project | `/home/corey/projects/moon-astra` |
| Active civilization fork | `/home/corey/projects/moon-civilization` |
| Original game | `http://localhost:4173` |
| Fork game | `http://localhost:4175` |
| Fork development API | `http://127.0.0.1:4176` |
| Production smoke test | `http://127.0.0.1:4177`, disposable database |
| Browser tests | `http://127.0.0.1:4185`, API 4186, disposable database |
| Default persistent database | `/home/corey/projects/moon-civilization/.world/world.sqlite` |
| CLI player access files | `/home/corey/projects/moon-civilization/.agent-access/` |

The fork is an independent Git clone on `development/shared-world`. Tag `prototype-baseline` points to commit `4469345`, preserving the playable prototype and completed design proposal before implementation. Git objects were cloned without hardlinks. The fork's `origin` points to the original **local** project as provenance; no remote hosting or push was performed. Do not push development commits into the original working checkout. ACG can assign a separate hosted remote when ready.

Work in the fork. Do not change the original directory, its running server, or browser key `moon-astra-world-v1`. The fork's browser stores only its private token under `moon-civilization-access-v1` and view under `moon-civilization-view-v1`; economic state belongs to SQLite. There is no migration from the original browser-only save.

## Economy version 2 update

The slower production and local mind-capacity rules are enforced by the API server. Restart that server after updating; Vite hot reload alone does not change live production. Before restarting an existing deployment, stop its one world process cleanly and back up its entire database directory, including any SQLite WAL files. Preserve player access files separately. Never copy a disposable test world over the live database.

On startup, a format-2 world with no `economyVersion` (or version 1) is migrated once to economy version 2: stored harvester rates are divided by ten, a rules-update event is recorded, and claim revisions advance. Inventory, deposits, machines, jobs, programs, research, shipments, identities and command receipts are retained. The update uses the existing transactional single-writer check. Future unknown economy versions are rejected. Subsequent restarts do not divide rates again. `/api/v1/health` and `/catalog` report `economyVersion: 2`; `/observe` includes per-claim `industry` status and current rates.

Existing factories may wait if their local mind capacity is insufficient. Each node supplies 4 capacity; harvester/refinery/programmed replicator use 1/2/4. The UI identifies the affected machines and offers node placement. Do not grant replacement resources or modify player programs during migration. Rates and supervision constants live in `src/industry.js`; the deterministic lab verifies that the starter economy can fund expansion without injected materials.

For the local upgrade, the user explicitly requested a fresh start. The stopped pre-reset world (116 machines, tick 13,040) is preserved at `/home/corey/moon-world-backups/before-economy-v2-reset-2026-09-05T160725-150Z/world/`, with `reset-report.json` beside it. Both existing player IDs and claim addresses were retained; the world was recreated with only starting landers, 240 metal per claim, full deposits and zero progress. Old command receipts were cleared. This was a one-time requested reset, **not** automatic startup behavior. Saved browser and CLI logins still work.

## Runtime and commands

Tested on Node 24.13.1 and npm 11.8.0 on Linux. Use Node 24.13 or newer in the 24.x series. `node:sqlite` is bundled with Node and currently emits an experimental warning. Dependencies remain the locked Three.js, Vite, and Playwright packages; no database package or cloud account is needed.

```bash
cd /home/corey/projects/moon-civilization
npm ci
npm run dev
```

`dev` launches the API at loopback 4176 and Vite at 0.0.0.0:4175. Vite proxies `/api` without changing the origin. Strict ports prevent a silent move onto another game address. Ctrl+C stops both fork processes. Closing a browser does not stop the world; closing the server does.

For the compiled game, stop `dev` first:

```bash
npm run build
npm start
```

`start` and `preview` run the same Node production server, serving **both** `dist/` and the API on loopback 4175. Static-only hosting is insufficient. On a trusted LAN, run `MOON_HOST=0.0.0.0 npm start` to accept other computers. Use the same browser hostname and port to retain the token, or export and resume the token on another origin.

No autostart service was installed. A launched terminal/session process may not survive logout or reboot. Restart with the appropriate command above. ACG can later add a service manager around the production command once the hosting machine and uptime policy are chosen.

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

Do not use `MOON_HOST=0.0.0.0` as a substitute for production access control. This is an open-registration preview for a trusted group. Public internet operation, TLS termination, invitations, credential rotation/recovery, stronger abuse limits, and external account identity are unimplemented. Nothing in this handoff publishes the game externally.

## Persistence and recovery

SQLite stores a complete world document, hashed player tokens, and idempotency receipts. Every tick and accepted command commits transactionally using WAL and synchronous FULL. Receipts and the corresponding world changes share the same transaction. A duplicate command retrieves its receipt, including after restart.

Run **one world process per database**. The server compares its last known database state inside each write transaction. If another writer changed it, or a persistence/simulation failure occurs, the affected world process stops advancing; health returns 503. Stop the competing processes, preserve the database and logs, then restart a single process. This check prevents stale overwrites; it is not a distributed cluster or leader election system.

World time advances one tick per nominal server second. A busy event loop can slow it. Server downtime creates no catch-up production, and there is no pause-all admin API. Pause only affects the named settlement's production and construction; in-transit deliveries continue on world ticks. No simulation time is controlled by browser focus or background throttling.

The database is versioned by `version: 2` and `ruleset: moon-neighbors-1`. Unsupported saved versions fail startup. There is no schema migration framework yet. Back up before changing rules, terrain, or dependencies; restore with the matching source revision.

## Backups

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
```

The core suite retains original geography/simulation regressions and adds ownership, finite deposits, local power, delegation, transactional blueprints, research, freight, recursive program inheritance, API authentication, duplicate receipts, concurrent commands, restart persistence, and competing writer rejection.

Browser tests create a disposable world on 4185/4186. They exercise normal joins, actual terrain placement, research over real server time, partner deliveries, factory layout placement, programmable replication, saved identities, neighbor visits, all four scales, polar terrain, and phone controls. They use no administrative tick shortcut and leave both playable worlds untouched. Software rendering may take several seconds to refine polar tiles; tests allow for that asynchronous work.

The production smoke helper starts `dist/` with its own temporary SQLite database on 4177, then checks a human browser and an actual CLI collaborator sharing the world. It verifies private access file permissions, repeat-safe bootstrap, WebGL, and absence of development diagnostics. `scripts/inspect-browser.mjs` invokes this same isolated smoke check. Neither helper opens the original 4173 game.

The local Chromium path defaults to `/home/corey/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`. On another machine set `MOON_CHROMIUM_PATH` to an installed executable. Headless tests use software graphics and `--no-sandbox` for this local application; normal players use their ordinary browser.

Evidence lives in `artifacts/verification.md`, `browser-results.json`, `shared-production-results.json`, `collaboration-lab.json`, and `shared-*.png`. Other old screenshots came from the baseline and remain for comparison.

## Assets and architecture

`public/data/` includes the prepared NASA height grid and lunar imagery. The fork intentionally did not duplicate the large `.asset-cache/` of original downloads. That cache remains in the original directory/backup. Ordinary `npm ci`, build, and play do not need asset regeneration or external requests. Use `python3 scripts/prepare_assets.py` only when deliberately rebuilding source data, with NumPy and Pillow installed. Keep `NOTICE.md` and `public/data/sources.json` with redistributed assets.

The frontend renders but never advances economics. `src/network.js` connects it to the server. `src/shared-world.js` is the deterministic rules core; `src/claims.js` fixes ownership independently of visual LOD. `server/world-server.mjs` provides the only game mutation boundary. Machine catalog definitions remain in `src/simulation.js`; its old browser-only simulation class is retained for baseline regressions but is not used by this fork's live game.

This world is deliberately bounded: at most 24 accounts, 1,000 machines plus jobs, a full snapshot per observation, a full world JSON commit per tick, and a recent 160-event window. No performance claim is made for a populated 1,000-machine world. Large populations need indexed spatial queries, region scheduling, observation filtering, event compaction, and load testing before raising the cap.

The full design proposal remains under `docs/moon-civilization-proposal/`. It describes the wider campaign, not a promise that every system exists in this build. The next implementation target is physical power and material networks before expanding parcel ownership and technology breadth.
