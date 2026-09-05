# MOON — The first federation

**Make intelligence change what players can do, then let factories reproduce those capabilities across the Moon.** This is the playable civilization fork: neighboring settlements, local industry, shared research, and the same game commands for humans and AI clients.

| Version | Project directory | Play |
| --- | --- | --- |
| Preserved original | `/home/corey/projects/moon-astra` | http://localhost:4173 |
| Civilization development | `/home/corey/projects/moon-civilization` | http://localhost:4175 |

**Git branch:** `development/shared-world`. **Starting checkpoint:** tag `prototype-baseline`, commit `4469345`. The original project, its browser saves, and its server are separate. This fork does not import or overwrite the original save.

**ACG hosting handoff:** [Deploy at ai-civ.com/moon-astra](docs/ACG-HOSTING-ai-civ.com.md). Includes the existing site's Netlify/Git workflow, a separate persistent API service, scoped routing templates, staging checks, and rollback. `npm run build:aiciv` creates the client in `dist-aiciv/`; `npm run test:aiciv` verifies subpath and proxy behavior locally. Publication is still for ACG to perform.

**Shared working notepad:** [Corey / Codex / ACG](SHARED-NOTEPAD.md). Read and update this file for the current task queue, deployment status, verified checkpoints and handoff notes. Its canonical shared location is `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md` on the tower.

**Operations:** [ops.md](ops.md) is the entrypoint for the maintained [development and operations runbook](dev-ops.md), including the persistent local server, hosted worlds, backups and Blender release procedure.

**Blender machinery:** [Explore the animated equipment gallery](http://localhost:4175/machines.html). All six machine types have detailed models, operating animations and lightweight distant representations. The in-game field guide and machine inspector also link to the gallery. [Editable Blender source, rebuilding and deployment notes](art/README.md).

## Play the fork

Requires Node **24.13 or newer in the 24.x series** (built-in SQLite), npm, and a WebGL browser.

```bash
cd /home/corey/projects/moon-civilization
npm ci
npm run dev
```

Open **http://localhost:4175**, choose a callsign, and establish your settlement. Friends on the same trusted network can use `http://YOUR-MACHINE-IP:4175`. Each player receives a neighboring claim, a seed lander, and 240 metal. To resume elsewhere, use **Settlement → Export my access token** and enter that token in the join screen.

1. Build a **Mind node**, **Harvester**, **Solar array**, and **Refinery**. Each machine occupies real terrain, costs local metal, and takes 5–12 simulation seconds to construct. A mind node supplies 4 shared capacity: a harvester needs 1, a refinery 2, and a programmed replicator 4. Industry waits until it has supervision.
2. Keep the node powered. At 120 research work, it unlocks a complete **balanced factory layout** and **programmable replicators**. A powered node produces one work per second while supervising machines. The first layouts are authored game designs, not live model-generated CAD.
3. Open **Settlement** to visit neighbors, send material shipments, or grant construction access. A builder you authorize spends your settlement's metal; they do not gain control of shipments or factory programs.
4. Deliver **120 metal** to **the first federation**. Each player can supply at most 60. Materials travel and only count after arrival. Two accounts can complete this first cooperation exercise; distinct humans are not enforced.
5. Add a second **Mind node**, then program a **Replicator** to make solar, harvesters, refineries, or mind nodes. One harvester, one refinery and one programmed replicator use 7 capacity, so they need two nodes. After the federation completes, choose **Replicator**: daughters inherit that program but each needs another 4 capacity. Every daughter pays its actual machine cost, needs space, and spends construction time.

A balanced factory is a **three-machine production layout** (solar, harvester, refinery). Find each completed or queued layout under **Settlement → Production layouts → Show on terrain**; the camera centers it and labels its pieces. A **Replicator** is built separately to automate construction. The next-step panel now follows missing machines, construction, research, factory programs, and federation contributions.

Harvesting and refining now run at **one-tenth the initial preview speed**. At full power, each supervised harvester extracts **18 or 24 rock/min**, depending on its claim; each refinery consumes **12 rock/min** to produce **6 metal/min**. These are gameplay resource units. Deposits remain finite. Settlement shows current throughput, mind capacity, and individual waiting machines. The resource counters include tenths so slow progress stays visible.

Capacity belongs to the local claim. Harvesters receive supervision first, then refineries, then replicators; older machines go first within each type. Unsupplied machines wait and draw no operating power. Replicators set to **Off** release capacity; waiting replicators retain their cycle progress. Power shortages slow supervised work and research together. Nodes and solar can always be built manually. One node supports a production line; two support that line plus a replicator; three support two production lines plus a replicator. Adding machines never creates free supervision.

Use **Surface / District / Region / Orbit** to change scale. Click the Moon from a distant view to descend. **Explore the Moon** opens the atlas; **Seed base** returns to your own lander. Green lines show your claim; blue lines show neighbors; amber rings mark construction and amber moving markers represent freight.

Keys: **1–5** select machines, **R** rotates, **Esc** cancels, **Space** pauses your settlement, **H** returns home, **O** switches orbit, **G** shows rendering-region edges. Pause stops your production and construction; freight already in transit and other settlements continue.

## Let an AI play

The browser and agent client use the same authenticated HTTP commands. No external AI service or paid API key is required. An AICIV can read observations, preview a plan, and submit bounded commands through the API; its reasoning runs outside this game.

```bash
npm run agent -- join ACG
npm run agent -- --access .agent-access/acg.json observe
npm run agent -- --access .agent-access/acg.json bootstrap
npm run agent -- --access .agent-access/acg.json cooperate
```

`bootstrap` queues one of each starter machine, searching for suitable terrain through the preview endpoint. Repeating it skips types already built or queued. Its replicator starts Off; add a second mind node before programming it alongside the production line. `cooperate` supplies the player's remaining federation contribution. These are finite scripted helpers, not autonomous model agents. They run only when you invoke them. Access files are private, Git-ignored, and created with mode `0600`.

Use `--url http://HOST:4175` for another machine. See the [API contract and command examples](docs/api.md) for observations, permissions, previews, idempotent commands, and event streams.

## What is playable now

- One persistent server world; separate claims, inventories, power, production, pause controls, and access permissions.
- Deterministic integer resource accounting, timed construction, finite deposits, and real metal shipments.
- Research that unlocks new commands, a cooperative project, and paid recursive machine construction.
- Durable player identities and command receipts in SQLite; authenticated HTTP API, polling observations, event cursors, and optional SSE snapshots.
- A deterministic [collaboration lab](artifacts/collaboration-lab.json). Run `npm run lab` to simulate two scripted players in an isolated world: research, a federation, factory layouts, and generation-two replication. It never changes the live server.
- The original full-radius, NASA-elevation Moon renderer, with a District view and procedural shading across intermediate scales. These additions improve visual continuity; they do not increase the source survey's resolution.

This is the first shared-world milestone. It has a **24-settlement / 1,000-machine-and-job cap**, automatically assigned neighboring cells, generated resource profiles, settlement-wide microgrids, straight-line abstract freight, and full shared observations. Open registration is intended for a trusted friends-and-agents preview. There is no public hosting hardening, invitation system, identity recovery service, parcel expansion, detailed transport network, electricity cables, competitive secrecy, alliance governance, thermodynamics, multi-day campaign ending, or full RL/Gymnasium adapter yet.

The game server runs while browsers are closed. Stopping the server stops world time; restart resumes from the last committed tick without inventing offline production. Use **one world process per database**. The backend detects conflicting writers and pauses rather than overwriting their state.

## Civilization design proposal

**New illustrated whitepaper v2 — The work of becoming:** [authoring directory and rebuild instructions](docs/moon-whitepaper-v2/README.md), [full design manuscript](docs/moon-whitepaper-v2/whitepaper.md), and [ACG publication handoff](docs/moon-whitepaper-v2/HOSTING-ACG.md). The standalone HTML publication includes 24 chapters, eight rotating model studies, diagrams, interactive construction/growth examples, review-note exports and a PDF edition. Source directory: `/home/corey/projects/moon-civilization/docs/moon-whitepaper-v2`; built site: its `site/` subdirectory. Local preview: `http://192.168.6.34:4190/moon-astra-whitepaper/` while the `moon-whitepaper` tmux server runs. Recommended public route: `https://ai-civ.com/moon-astra-whitepaper/`, for ACG to publish separately from the game.

Read the [illustrated report](docs/moon-civilization-proposal/report.html), the [49-page PDF](docs/moon-civilization-proposal/report.pdf), or the [Markdown source](docs/moon-civilization-proposal/report.md). The complete proposal includes 46 technologies, 45 building families, AICIV collaboration, mind-driven invention, an exponential finale, and the longer roadmap. Most of that scope remains proposed. Its references to the original prototype describe the pre-fork baseline.

The next useful milestone is **physical networks**: power cables, explicit depots and transport routes, and blueprints that include their connections. That makes logistics a spatial design problem before expanding the technology tree.

## Verify and operate

```bash
npm test
npm run lab
npm run build
npm run test:browser
```

Browser tests start their own disposable world on ports **4185/4186**, use Chromium, and leave both playable worlds untouched. Set `MOON_CHROMIUM_PATH` when Chromium lives elsewhere. The full browser flow waits for real research and daughter-machine construction, so allow several minutes. Results and screenshots are in `artifacts/`.

For the compiled game, stop the fork's development server, then run `npm run build && npm start`. This serves the built game and API together on port 4175. `dist/` alone cannot run this multiplayer version. See [dev-ops.md](dev-ops.md) for persistence, recovery, LAN hosting, verification, and backup instructions.

## Geography and credits

The reference sphere has a **1,737,400 m radius**. Six cube-sphere faces partition the whole Moon; adaptive rendering reaches level 18. Ownership uses independent, stable **level-10 cells**, whose spherical areas vary by latitude on each face. Rendering detail does not change ownership.

NASA **LRO / LOLA LDEM_16 V3.1** provides a 5,760 × 2,880 height grid, approximately 1.9 km sample spacing at the equator. A 4K lunar map supplies the large-scale appearance. Small craters, dust, grain, rocks, machine models, resource yields, and lighting are artistic. Details are globally addressed and share the same coordinate system across views.

Sources, exact transformations, and asset hashes: [public/data/sources.json](public/data/sources.json). Credits: [NOTICE.md](NOTICE.md). Prepared assets are included; the original download cache remains in the preserved prototype and its backup. Re-download with `python3 scripts/prepare_assets.py` only if regeneration is needed (NumPy and Pillow required).

## Project map

| File | Responsibility |
| --- | --- |
| `src/main.js`, `src/network.js` | 3D interface and authenticated world client |
| `src/shared-world.js` | Authoritative deterministic game rules |
| `src/claims.js` | Stable ownership cells and spherical areas |
| `server/world-server.mjs` | HTTP API, simulation clock, SQLite transactions |
| `src/terrain.js`, `src/geography.js` | Measured lunar terrain and progressive rendering |
| `src/machines.js` | Procedural machine models |
| `scripts/agent.mjs`, `scripts/lab.mjs` | Agent CLI and isolated collaboration exercise |
| `src/simulation.js` | Machine catalog and retained baseline simulator for regression tests |

## Backup and return to this session

**Civilization fork backup:** `/media/corey/Expansion/backups/moon-civilization/moon-civilization-full-20260905T122723Z.zip`, with adjacent `.sha256` and `.manifest.json`. This checkpoint includes Git history, source, prepared assets, dependencies, compiled build, documentation, verification evidence, and a fresh empty world database.

The preserved prototype's full backup is `/media/corey/Expansion/backups/moon-astra/moon-astra-full-20260905T015553Z.zip`, with adjacent SHA-256 and manifest files. That archive predates this fork. Back up this fork's Git history and its live `.world/` data separately, following [dev-ops.md](dev-ops.md).

[Resume this Moon session in Codex](codex://threads/01a06dd9-5847-7c73-b3a3-4ec974195750)

```bash
codex resume 01a06dd9-5847-7c73-b3a3-4ec974195750 --cd /home/corey/projects/moon-civilization
```

Session ID: `01a06dd9-5847-7c73-b3a3-4ec974195750`. Resuming requires the session history on this machine; project backups do not include Codex's private session history.
