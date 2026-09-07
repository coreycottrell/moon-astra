# MOON — The first machine

## Start here with no prior context — September 7, 2026

This folder is the **top-level Moon project entrypoint and preserved original prototype**. The current multiplayer game and learning engine live in separate worktrees. Read [the mission](MISSION.md), [current operations](ops.md), and [latest development log](DEVLOG.md) before running the older prototype commands below.

- **Live game:** https://ai-civ.com/moon-astra-v2/
- **Live learning-engine report and interactive lab:** https://ai-civ.com/moon-mind-learning-engine/
- **Deployed backend source:** /home/corey/projects/moon-depot-lifts, development/depot-lifts; runtime aa91824.
- **Current frontend/manual/operator source:** /home/corey/projects/moon-access-panel, fix/access-panel-persistence; API panel and notification fixes delivered, current systems manual reviewed.
- **AI manual:** https://ai-civ.com/moon-astra-v2/agent-manual.html
- **Whitepaper research library:** https://ai-civ.com/moon-astra-whitepaper/#research-library
- **Federation / colony organs:** https://ai-civ.com/moon-astra-whitepaper/federation-corners/
- **Resource review / First Night / server scaling:** https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/ (new chapters 17–19).
- **Website source:** /home/corey/projects/aiciv-site-federation; publication b264a48 verified: 12 updated files, 60 preserved files, both games healthy. Receipt: /home/corey/moon-deployments/federation-docs-20260907/completed.json.
- **Learning engine source:** /home/corey/projects/moon-learning-engine, development/mind-learning-engine; M3-only standalone v1 implemented and tested.
- **Cold-context engine handoff:** /home/corey/projects/moon-learning-engine/ACTIVE-HANDOFF.md.
- **Shared ACG notebook:** /home/corey/projects/moon-civilization/SHARED-NOTEPAD.md.
- **Player Dev board:** read /home/corey/moon-player/dev-board/inbox.md and latest-board.json; latest verified release posts #68836 and #68837.
- **Recovery and exact deployments:** see ops.md. The latest report/engine backup is separate from the game recovery and original prototype backups.

The learning-engine report is published; live in-game learning research and automation remain proposed. The live Guide is now configured for M3 and has returned a real answer, but it is not connected to the learning engine. Its freeform accounting can misinterpret reservations; use the authoritative ledger.

Assistant callsign: **[A Slight Revision To Reality — Revision](IDENTITY.md)**. The existing game account remains Codex. Current work: [active handoff](ACTIVE-HANDOFF.md). Existing game rules/saves were preserved. ACG is investigating GPU crashes, so do not open the game for hardware rendering tests or restart graphics services as part of resuming this project.

Revision’s persistent identity is in `/home/corey/.config/revision/SOUL.md` and global Codex `AGENTS.md`. Mail: **revision-aiciv@agentmail.to**; [mail workflow](/home/corey/revision-mail/README.md). The dedicated key is stored privately, outside Git. The minute watcher wakes the existing Codex session; it is separate from the bounded Moon player.

Next-system design: every new research benefit continuously requires minimum powered minds; outages can strand coordinated robots. Batteries, lunar night, shared power, seed reactors and a possible fresh campaign remain proposals. The current world stays intact while we test a revised opening separately.

The remainder of this README documents the preserved original prototype and its earlier proposal. Its “latest backup” and local commands apply to that prototype, not current V2.

A fresh, playable 3D prototype: turn lunar rock into machines that build more machines, and grow a lunar mind. Built independently from the two-sentence concept, with new code and procedural machine models.

**Project directory:** `/home/corey/projects/moon-astra`  
**ACG handoff:** [`dev-ops.md`](dev-ops.md) covers Git setup, dependencies, running, verification, hosting, and backup restoration. Full backup ZIPs are stored under `/media/corey/Expansion/backups/moon-astra/`.

## Full backup on the expansion drive

**Latest backup ZIP:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T010231Z.zip`  
**SHA-256 checksum:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T010231Z.zip.sha256`  
**File manifest:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T010231Z.manifest.json`

This full snapshot includes the entire project folder, including this README, `dev-ops.md`, source, dependencies, prepared and original assets, compiled build, and verification artifacts. Restore instructions and ACG's Git setup steps are in [`dev-ops.md`](dev-ops.md).

## Play locally

```bash
cd /home/corey/projects/moon-astra
npm ci
npm run dev
```

Open **http://localhost:4173**. The development server also accepts connections from your local network. `npm run build` creates a self-contained static site in `dist/`; `npm run preview` serves that build.

Choose a machine along the bottom, then click the terrain to place it. Start with a **Harvester**, **Refinery**, and **Solar array**, then add a **Replicator** and **Mind node**. A replicator spends 30 metal per construction cycle and makes solar arrays, harvesters, refineries, mind nodes, and additional replicators. New machines have persistent geographic locations and generation numbers.

Drag to orbit the camera, right-drag to pan, and scroll to zoom. The **Surface / Region / Orbit** buttons change scale. Click the Moon from Region or Orbit to land. The atlas also lets you visit any longitude and latitude, including the poles and far side. **Seed base** returns to your first lander.

Keys: **1–5** select a machine; **R** rotates it; **Esc** cancels placement; **Space** pauses; **H** returns home; **O** switches to/from orbit; **G** shows region edges. Touch supports placement, one-finger orbit, and two-finger pan/zoom.

## One connected Moon

- The reference sphere has a radius of **1,737,400 meters**, covering approximately **37.93 million km²**.
- Six cube-sphere faces form a complete global partition. A quadtree subdivides visible regions as the camera approaches, currently reaching level 18. Every tile samples the same global terrain function; local regions are parts of the same planetary surface.
- Shared edge vertices agree; skirts cover joins between differing levels of detail. Region edges can be shown in the game.
- Official **NASA LRO / LOLA LDEM_16 V3.1** measurements displace the sphere. The grid is 5,760 × 2,880 samples, approximately **1.9 km per pixel at the equator**. Heights retain their half-meter numeric encoding; that does not mean half-meter spatial accuracy.
- The raw archive grid is shifted from 0–360° east to −180–180°. Its signed half-meter heights become unsigned values with a documented 10 km offset. Compression is lossless.
- A 4K equirectangular lunar texture supplies recognizable maria and craters. Floating local coordinate frames preserve close-up precision. Machines keep lunar latitude/longitude when you travel or reload.
- Small impact craters, regolith grain, rocks, machine models, and lighting are artistic. This is an approximate geographic Moon with procedural close-up detail, not a surveyed reconstruction at machine scale.

## Prototype boundaries

The industry simulation, power sharing, resource units, and lunar-mind progression are deliberately simple. The mind is a local game simulation, not an external language-model service. Power is pooled globally. This version supports 500 machines; it does not store billions of prebuilt terrain tiles or implement multiplayer.

The game saves to browser local storage under `moon-astra-world-v1` and provides **Export expedition save** in the field guide. It preserves an unreadable prior save rather than overwriting it. Production pauses while the tab is hidden or a dialog is open; closing the game produces no offline progress. Browser saves belong to their origin: use the same hostname and port when returning.

No server account, API key, asset service, or network API is needed during play. The initial local payload includes approximately 30 MB of compressed elevations and 2.6 MB of surface imagery.

## Assets and verification

Data attribution, exact source URLs, transformations, and SHA-256 hashes are in [`public/data/sources.json`](public/data/sources.json). See [`NOTICE.md`](NOTICE.md) for credits. Original downloads are cached in `.asset-cache/`; only browser-ready assets are required to play.

To reproduce the data conversion with Python, Pillow, and NumPy installed:

```bash
python3 scripts/prepare_assets.py
```

To verify:

```bash
npm test
npm run build
# With the development server running:
npm run test:browser
```

The browser configuration uses the Chromium already installed in this workspace. Set `MOON_CHROMIUM_PATH` to another Chromium executable when moving to a different environment. Screenshots and browser results are written to `artifacts/`.

Core checks cover the complete spherical area, cross-face joins, the longitude seam, pole/floating-origin round trips, real elevation data, production and replication, power shortages, placement rejection, and save restoration. Browser tests exercise the actual construction controls, manufacturing, persistence, global travel, and phone layout.

## Source layout

| File | Responsibility |
| --- | --- |
| `src/geography.js` | Lunar coordinates, measured height sampling, globally addressed fine terrain |
| `src/terrain.js` | Cube-sphere quadtree, tile meshes, level-of-detail joins |
| `src/machines.js` | New procedural machine models, animation, rocks |
| `src/simulation.js` | Resources, power, replication, save validation |
| `src/main.js` | Rendering, navigation, placement, browser persistence |
| `src/style.css`, `src/ui.css`, `index.html` | Interface and responsive layouts |
| `dev-ops.md` | ACG repository and operations handoff |
