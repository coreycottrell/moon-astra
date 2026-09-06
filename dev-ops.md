# Foundry development and release entrypoint

Active source: `/home/corey/projects/moon-rover-motion`, branch `development/rover-motion`. The preserved local preview still uses `/home/corey/projects/moon-foundry`, branch `development/physical-industry`; do not restart it against this fork without choosing a separate database and ports.

The current runbook is [ops.md](ops.md). Hosting instructions are [docs/foundry/HOSTING-ACG.md](docs/foundry/HOSTING-ACG.md). Scope and measured evidence are in [docs/foundry/RELEASE.md](docs/foundry/RELEASE.md).

Run `npm run dev` for the separate 4205/4206 preview. Run `npm test`, `npm run test:browser`, `npm run lab`, and `npm run build` for release checks. Browser tests use temporary databases on 4215/4216. Never reuse the existing Neighbors world file.

Core systems are pure modules in `src/foundry/`: catalog, state, commands, navigation, logistics, industry and world. `src/shared-world.js` is the compatibility import surface used by the HTTP server and client preview. The server owns time and persistence; the browser renders observations and submits commands.

Blender source and editable collection are in `art/blender/`; exported assets and SHA manifests are in `public/models/foundry-01/`. `bash scripts/build-foundry-assets.sh --render` regenerates the full collection. HTML manuals are generated from `docs/foundry/` by `python3 scripts/build-foundry-docs.py`; generated static pages are committed so hosting needs only the Node build.

The shared coordination note is `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. It is not duplicated as a writable shared notebook in this fork.

Hosted V2 uses dedicated production/staging services on the VPS. The MiniMax guide is configured with a private systemd EnvironmentFile; see [guide operations](docs/foundry/MOON-GUIDE.md). It only reads game state. Keep credentials outside the repository and website payload. Updates must preserve the current world and original Moon services, use fresh SQLite backups, and publish through the full-site Git build.
