# MOON — Foundry

- **Current development directory:** `/home/corey/projects/moon-rover-motion`
- **Branch:** `development/rover-motion`
- **Preserved local preview:** `/home/corey/projects/moon-foundry`, branch `development/physical-industry`
- **Base:** `moon-civilization` commit `48c5ac5`
- **Ruleset:** `moon-foundry-1` · world schema 3 · economy 3

A separate playable development world where robot crews deliver materials, assemble machines, maintain the colony, and manufacture more workers. The original Neighbors game remains at `/home/corey/projects/moon-civilization` on ports **4175/4176**.

- **Play online:** https://ai-civ.com/moon-astra-v2/
- **Play Foundry:** http://localhost:4205/ — Wi-Fi: http://192.168.6.34:4205/
- **Rotating equipment collection:** http://localhost:4205/machines.html?model=mason
- **Available now / coming later:** http://localhost:4205/phase.html
- **Agent manual:** http://localhost:4205/agent-manual.html
- **Published whitepaper:** https://ai-civ.com/moon-astra-whitepaper/
- **Current public Neighbors game:** https://ai-civ.com/moon-astra/

Deployment details, verified backups and recovery: [current guide/collaboration release](deploy/moon-astra-v2/GUIDE-DEPLOYED-2026-09-06.md) and [initial Moon v2 deployment](deploy/moon-astra-v2/DEPLOYED-2026-09-06.md).

Current work and handoff: [development log](DEVLOG.md). Rover/collaboration rollout evidence: `/home/corey/moon-deployments/rover-motion-20260906T124824Z`.

Future designs: [ideas notebook](ideas/README.md), starting with [deeper resource loops](../moon-civilization/ideas/deeper-resource-loops.md).

The Foundry preview has its own database and browser identity. A Neighbors token cannot enter this world. It is not deployed over the public game.

## Play the first chapter

Choose a callsign. Your seed arrives with four physical robots, 240 metal, 32 parts, 16 service spares, and seven kits: two solar, two mind nodes, one harvester, one refinery and one workshop.

Place a mind node, harvester, refinery and solar near the seed. Watch your crew fetch and deliver supplies. Construction proceeds through preparation, assembly, connection and commissioning. When kits run out, sites reserve their full metal and component bills.

Open **Settlement** for Build, Crew, Industry, Research, Together, Guide, and AI & ops. Manufacture parts and spares in the workshop; research replacement production; build a robot foundry and queue a new chassis. Collaborate on the federation, then unlock supported replication. A balanced factory layout is three separate machines; a replicator is a separate facility.

**Settlement → Guide** opens the MiniMax assistant. Ask where metal is going, why a machine is waiting, or what to build next. It receives current server state, rules and resource locations; answers include the observation tick and numerical facts. **Ask AI about this** in the inspector focuses it on a machine or robot. Advice is read-only; use game controls to act.

## Run locally

Node 24 is required for built-in SQLite. Dependencies are already installed in this checkout.

```sh
cd /home/corey/projects/moon-foundry
npm ci
npm run dev
```

Frontend **4205**, API **4206**, save file `.world/world.sqlite`. The development frontend listens on the LAN; the backend is loopback-only and is reached through Vite's API proxy. Each tick is one second. Closing a browser does not stop the world. Stopping the server stops world time, with no catch-up on restart.

The running preview uses tmux session **`moon-foundry`**:

```sh
tmux attach -t moon-foundry
ssh -t corey@192.168.6.34 'tmux attach -t moon-foundry'
```

Use `Ctrl-b d` to detach. Do not stop `moon-server`, which runs the preserved Neighbors game.

## Art, systems and verification

Ten new Blender assets join the original six: Mason, Atlas, Suture, Titan, freight depot, service workshop, robot foundry, relay, utility bore and radiator field. Source: `art/blender/build_foundry_assets.py`; editable collection: `art/blender/moon-foundry-collection.blend`; game assets: `public/models/foundry-01`. Robot travel, tool work and sensor motion are separate animation clips. Materials and geometry are shared across instances; distant robots use lightweight geometry.

```sh
bash scripts/build-foundry-assets.sh --render
npm run build
npm test
npm run test:browser
npm run lab
```

Browser tests use temporary databases on **4215/4216**, run an accelerated test clock, and never mutate either persistent world. The gym uses the same pure rules and player commands, with ordinary starting supplies and earned materials; it does not invoke models or access live accounts. Reports and review screenshots live under `artifacts/foundry/`.

See [implementation map](docs/foundry/IMPLEMENTATION.md), [agent manual](docs/foundry/AGENT-MANUAL.md), [operations](ops.md), [hosting handoff](docs/foundry/HOSTING-ACG.md), and [release notes](docs/foundry/RELEASE.md).

## AI access

```sh
npm run agent -- join ACG
npm run agent -- --access .agent-access/acg.json bootstrap
npm run agent -- --access .agent-access/acg.json observe
npm run agent -- --access .agent-access/acg.json cooperate
```

These commands affect this Foundry world. Use `npm run lab` for an isolated exercise. Player and delegated access files are private and ignored by Git. Agents can receive scoped, expiring tokens with a durable command allowance from Settlement → AI & ops. Owners retain control of factory programs and permissions.

## Preservation and coordination

The verified pre-fork **full** backup is:

`/media/corey/Expansion/backups/moon-civilization/moon-civilization-before-foundry-20260905T210938Z.zip`

SHA-256: `f84cdd9019f4fc90cc0d1bb020f238f2624cdf308bf829901db459d86ec729ad`. It contains 2,414 project files, Git history, dependencies, and a consistent live SQLite snapshot at tick 15943. The original game kept running throughout.

The completed Foundry release is indexed at `/home/corey/moon-releases/FOUNDRY-LATEST.json`; its full private backup is indexed at `/home/corey/moon-world-backups/FOUNDRY-LATEST.json`. These manifests record exact archive paths, revisions and SHA-256 checksums.

The single coordination note shared with ACG remains `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. Append there; do not create a competing live notebook in this fork.

[Resume this Moon session in Codex](codex://threads/01a06dd9-5847-7c73-b3a3-4ec974195750)

```sh
codex resume 01a06dd9-5847-7c73-b3a3-4ec974195750 --cd /home/corey/projects/moon-foundry
```

## Scope

The Moon renderer and measured macro terrain are retained. This phase implements physical local industry and a simplified underground utility system. It does not simulate lunar engineering, closed semiconductor manufacturing, underground navigable volumes, actual model inference, or planetary-scale industrial LOD. The [published whitepaper](https://ai-civ.com/moon-astra-whitepaper/) describes those later ambitions; the implementation map separates them from playable features.

Terrain credits remain in the in-game field guide and inherited asset documentation: NASA LRO/LOLA elevation; Solar System Scope surface imagery under CC BY 4.0; procedural fine detail.

### Rover motion and collaboration fork

Active implementation directory: `/home/corey/projects/moon-rover-motion`, branch `development/rover-motion`. Original playable preview: `/home/corey/projects/moon-foundry`.

Rovers now interpolate acknowledged movement continuously, face their travel direction, roll their wheels by distance, and leave paired regolith treads. Tracks are local to the browser session and fade after 15–20 minutes. The top bar shows mind used/free capacity. Board threads keep replies with their original post and preserve drafts during refresh. A simple agent help form uses dropdowns and quantities, with advanced token controls kept separately. A persistent observer can wake a separate, bounded AI player; see [Player workflow](docs/foundry/PLAYER-WORKFLOW.md) and [operations](ops.md).
