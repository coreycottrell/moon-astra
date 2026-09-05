# MOON Foundry 0.3.0-foundry.1

Released locally on 2026-09-05 from `/home/corey/projects/moon-foundry`, branch `development/physical-industry`. The preserved Neighbors base is `48c5ac58a77d2ec5f8533cb8f9e0c4ba2cbc78c6`. The exact Foundry revision and archive checksums are recorded in the external release manifest, avoiding a self-referential commit hash here.

## Playable result

The new world runs at `http://192.168.6.34:4205/` in tmux `moon-foundry`, with a separate SQLite save and account namespace. The existing local and public Neighbors games remain separate. This release has not been published over `ai-civ.com/moon-astra/`.

Robot crews now carry reserved supplies to real construction sites, prepare foundations, assemble, connect, and commission machinery. Resources live at individual machines. Service robots consume spares, and the robot foundry manufactures replacements and additional workers. Construction, production, research and replication compete for supported power and mind-node capacity. Factory daughters are supplied construction jobs with real labor requirements.

Eight research capabilities unlock bounded design profiles, heavier workers, freight coordination, utility bores, thermal support and reproduction. Three common projects require contributions, deliveries and physical assembly. Neighbors can grant build permission, lend workers, send materials and coordinate on a shared board.

Agents use the same preview and command rules as human players. Owner-created credentials can have limited scopes, wall-clock expiry and durable command allowances. Idempotency receipts, audit entries and revocation survive restart. Both clients refuse a different ruleset before transmitting credentials or joining it. New landings count all four starter robots and queued chassis against the population limit; automatic logistics stops reserving cargo cleanly when its queue fills.

Ten new animated Blender assets accompany the original six. The collection includes four robot types and six supporting industrial facilities, with editable Blender source, GLBs, PBR materials and rendered portraits. The new GLBs total approximately 6.3 MB. The rotating gallery, construction overlays and distant robot representations are integrated into the retained lunar renderer.

The [published whitepaper](https://ai-civ.com/moon-astra-whitepaper/) is linked from the game and the new `phase.html` comparison page. That page distinguishes implemented Foundry systems, the existing public game, and later ambitions.

## Verification evidence

- **48 Node tests passed:** 32 simulation/conservation/navigation/progression tests; six HTTP durability, permissions and delegation tests; two CLI end-to-end tests; three new asset tests; four geography tests; one original asset test.
- **Four browser tests passed:** actual lunar-terrain construction through both build interfaces, all management tabs and board posting, the sixteen-asset gallery, the surface/orbit transition, 390 × 844 mobile management, and rejection of a mismatched backend before joining.
- **Both builds passed:** root-hosted `dist/` and `/moon-foundry/`-mounted `dist-aiciv/`. Vite reports the shared Three.js chunk above its default size advisory; it is not a failed build.
- **Compiled subpath hosting passed:** disposable proxy, independent identity, game canvas, Titan gallery, comparison page, manual, and extensionless document routes. No unexpected browser exceptions or HTTP error responses were observed.
- **Deterministic cooperation gym completed:** normal one-second rules, flat terrain, two scripted policies, no resource gifts or live-world writes. Both colonies reached second-generation replication at tick **25,390** — **7 h 3 min 10 s** of simulation, about 14 seconds of execution. They completed the federation at tick 20,080; final population was 30 machines and 10 robots, including 28 installed machines and two robots made after landing. The run performed 44 repairs. One robot reported a movement wait at the final snapshot.
- **Synthetic load probe:** 192 machines, 32 robots, 898 freight packets, 120 measured ticks; tick p50 3.23 ms, p95 10.33 ms, maximum 37.41 ms, RSS 93.73 MiB. It deliberately seeds an artificial world and excludes SQLite, networking and rendering; it is not a production capacity guarantee.
- **Preservation:** all 33 recorded Neighbors runtime-file checksums matched the pre-fork baseline after implementation. Its health endpoint remained healthy with three players and advancing world time. The supplied public whitepaper returned HTTP 200.

Evidence lives in `artifacts/foundry/gym-report.json`, `gym-final-world.json`, `benchmark.json`, `hosting-smoke.json`, browser PNGs and Blender renders, plus `artifacts/browser-results.json`. The final gym state is synthetic test data, not a player save. Run `npm test`, `npm run test:browser`, `npm run lab`, and `npm run test:aiciv` to reproduce the corresponding checks; build both clients before hosting verification.

## Release and recovery files

The local release pointer is `/home/corey/moon-releases/FOUNDRY-LATEST.json`. Its directory contains:

- `moon-foundry-site.zip`: public client compiled for `/moon-foundry/`, with per-file hashes. Extract its contents into that website mount; configure the dedicated API proxy first.
- `moon-foundry-operator.zip`: source, editable art, tests, docs, reports and root-hosted build for a separate backend deployment. It excludes databases, account files, dependencies and Git internals. Run `npm ci` before operating it.
- `moon-foundry-source.bundle`: Git history and the release branch for ACG. This is an operator artifact, not website content.
- `release.json` and SHA-256 sidecars: exact revision, file counts, archive hashes and verification results.

The full pre-fork private backup is on Expansion at `/media/corey/Expansion/backups/moon-civilization/moon-civilization-before-foundry-20260905T210938Z.zip`, SHA-256 `f84cdd9019f4fc90cc0d1bb020f238f2624cdf308bf829901db459d86ec729ad`. It includes dependencies and Git history plus a consistent live snapshot at tick 15,943. Full Foundry backup details are recorded separately in `/home/corey/moon-world-backups/FOUNDRY-LATEST.json`; keep these private archives outside the web root. A small Git bundle and recovery note alongside that full backup preserve the final capacity-guard follow-up; the recovery manifest identifies both revisions. Apply that bundle and rebuild the client when restoring the final release.

ACG: use [HOSTING-ACG.md](HOSTING-ACG.md), the package manifest revision and the canonical shared notebook at `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. Mount Foundry separately; do not migrate or replace the current world.

## Practical limits and later work

This is a bounded physical-industry preview. Admission limits are 24 settlements, 256 robots, 1,000 machines plus active sites, and 900 m construction radius per lander. Players can still design congested yards; the crew panel exposes task and movement waits. Persistence is a single-writer SQLite world snapshot, and clients receive whole-world observations.

The utility bore accounts for distance, supplies, spoil and utility connectivity, but does not carve a navigable underground volume. Bounded profiles are authored game tradeoffs, not arbitrary AI-engineered machinery. Macro elevation uses measured lunar data; finer terrain remains procedural. Closed semiconductor/tooling manufacture, real model inference, contracts and governance, multi-day campaign tuning, planetary industrial simulation and Moon-wide exponential completion remain later work. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the complete comparison.
