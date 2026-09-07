# Foundry development and release entrypoint

Active source: `/home/corey/projects/moon-traffic-tunnels`, branch `development/traffic-tunnels`. The preserved local preview still uses `/home/corey/projects/moon-foundry`, branch `development/physical-industry`; do not restart it against this fork without choosing a separate database and ports.

The current runbook is [ops.md](ops.md). Hosting instructions are [docs/foundry/HOSTING-ACG.md](docs/foundry/HOSTING-ACG.md). Scope and measured evidence are in [docs/foundry/RELEASE.md](docs/foundry/RELEASE.md).

Run the preserved 4205/4206 preview only from `/home/corey/projects/moon-foundry`. For this fork, use disposable test worlds or explicitly choose unused ports and a separate database. Run `npm test`, `npm run test:browser`, `npm run lab`, and `npm run build` for release checks. Browser tests use temporary databases on 4215/4216. Never reuse the existing Neighbors world file.

Core systems are pure modules in `src/foundry/`: catalog, state, commands, navigation, logistics, industry and world. `src/shared-world.js` is the compatibility import surface used by the HTTP server and client preview. The server owns time and persistence; the browser renders observations and submits commands.

Blender source and editable collection are in `art/blender/`; exported assets and SHA manifests are in `public/models/foundry-01/`. `bash scripts/build-foundry-assets.sh --render` regenerates the full collection. HTML manuals are generated from `docs/foundry/` by `python3 scripts/build-foundry-docs.py`; generated static pages are committed so hosting needs only the Node build.

The shared coordination note is `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. It is not duplicated as a writable shared notebook in this fork.

Hosted V2 uses dedicated production/staging services on the VPS. The MiniMax guide is configured with a private systemd EnvironmentFile; see [guide operations](docs/foundry/MOON-GUIDE.md). It only reads game state. Keep credentials outside the repository and website payload. Updates must preserve the current world and original Moon services, use fresh SQLite backups, and publish through the full-site Git build.

Current traffic/tunnel runtime: `b00ff861b7db3c87ba596a622eed9d9deae7c2b6`, website `6432b52992dcd5355c8563cf3dfe5a66ba1182ab`, published 2026-09-07 12:10 UTC. See [the deployment record](deploy/moon-astra-v2/TRAFFIC-TUNNELS-DEPLOYED-2026-09-07.md) and `/home/corey/moon-deployments/V2-LATEST.json` for completed publication/recovery checks. Read the actual developer board inbox on every resumption; its tmux prompt binding and staggered Enter retries are described in [DEV-BOARD-WORKFLOW.md](docs/foundry/DEV-BOARD-WORKFLOW.md).
