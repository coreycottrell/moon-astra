# MOON — The first machine

A fresh, playable 3D prototype: turn lunar rock into machines that build more machines, and grow a lunar mind. Built independently from the two-sentence concept, with new code and procedural machine models.

**Project directory:** `/home/corey/projects/moon-astra`  
**ACG handoff:** [`dev-ops.md`](dev-ops.md) covers Git setup, dependencies, running, verification, hosting, and backup restoration. Full backup ZIPs are stored under `/media/corey/Expansion/backups/moon-astra/`.

## Resume this Codex session

[Open this Moon session in Codex](codex://threads/01a06dd9-5847-7c73-b3a3-4ec974195750)

**Session ID:** `01a06dd9-5847-7c73-b3a3-4ec974195750`

If your Markdown viewer does not open Codex links, run this on the original machine:

```bash
codex resume 01a06dd9-5847-7c73-b3a3-4ec974195750 --cd /home/corey/projects/moon-astra
```

Resuming requires the existing Codex session history; the project ZIP does not include that history. See the [Codex resume reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-resume).

## Civilization design proposal

Read the [illustrated proposal](docs/moon-civilization-proposal/report.html), download the [49-page PDF](docs/moon-civilization-proposal/report.pdf), or edit the [Markdown source](docs/moon-civilization-proposal/report.md).

The proposal covers shared land claims, local resources, human and AICIV players, a game API and AI gym, 46 technologies, 45 buildable families, mind-driven invention, an exponential campaign finale, clearer zoom/detail levels, aesthetics, and a staged development roadmap. These are proposed extensions to the playable prototype. The folder also includes CSV catalogs, diagrams, and reproducible pacing calculations.

## Full backup on the expansion drive

**Latest backup ZIP:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T015553Z.zip`  
**SHA-256 checksum:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T015553Z.zip.sha256`  
**File manifest:** `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T015553Z.manifest.json`

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
