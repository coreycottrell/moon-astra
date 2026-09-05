# MOON — shared working notepad for Corey, Codex and ACG

**Canonical shared file:** `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md` on `corey-Alienware-tower`. Both agents can read and edit this same file on the tower. Copies inside release archives are snapshots, not a synchronized notepad.

Read this before working on Moon. Update the current status when something changes and append a dated, attributed entry to the work log. Re-read before saving so you preserve the other agent's updates. Mark a task complete only after checking its result; distinguish local tests from checks of the actual VPS/site. Keep credentials and player tokens in their existing private stores, outside this file.

## Shared objective

Corey wants ACG to host the persistent game backend on the VPS and publish the matching frontend at **https://ai-civ.com/moon-astra/**. Keep the original prototype and the local development world playable. Follow [the deployment handoff](docs/ACG-HOSTING-ai-civ.com.md) and [operations guide](dev-ops.md).

## Current state

| Item | Verified state / location |
| --- | --- |
| Development source | `/home/corey/projects/moon-civilization` |
| Branch | `development/shared-world` |
| Gameplay checkpoint | `25b7931` — slower industry and required local mind supervision |
| Hosting checkpoint | `9822f9a` — ACG's Node/runtime and symlink-entrypoint fixes; includes the gameplay checkpoint |
| Current handoff revision | Use the branch tip; `git log -1 --oneline` gives its exact commit |
| Git remote | `origin` is `/home/corey/projects/moon-astra`, a local provenance clone; no hosted Git remote is configured |
| Transfer package | Codex is preparing a committed-source archive under `/home/corey/moon-releases/`; `LATEST.json` will identify its revision and SHA-256 |
| Local game | `http://localhost:4175` / Wi-Fi `http://192.168.6.34:4175`; local API is loopback 4176 |
| Original prototype | `/home/corey/projects/moon-astra`, localhost:4173; 62 original file hashes matched after the gameplay upgrade |
| Website checkout | `/home/corey/projects/aiciv-inc-site`; use its Git deployment process and preserve unrelated changes |
| Proposed VPS layout | `/srv/moon-astra/current`, loopback API 4180, persistent `/var/lib/moon-astra/world.sqlite` |
| Public release status | Not verified by Codex in this handoff. ACG: record the actual host, endpoint, backend revision and site release below |

## Game rules that must reach the website

- World format 2, ruleset `moon-neighbors-1`, **economy version 2**.
- Fully powered, supervised harvesters extract 18 or 24 rock/min; refineries turn 12 rock into 6 metal/min. Both run at one-tenth the initial preview speed.
- Each mind node provides 4 local capacity. Harvester: 1; refinery: 2; programmed replicator: 4. Harvesting and refining receive priority. Off replicators release capacity; blocked machines wait. The UI reports capacity and current output.
- The guided opening starts with a mind node. A harvester/refinery pair needs one node; that pair plus a programmed replicator needs two.
- The requested local reset is complete: Corey and Codex retained their logins and claim addresses, restarted with a lander and 240 metal each. Subsequent gameplay may have advanced. The old world is backed up at `/home/corey/moon-world-backups/before-economy-v2-reset-2026-09-05T160725-150Z/`.
- That reset was one-time and local. Preserve any existing VPS world. The economy upgrade migrates compatible older saves once and does not erase their progress.

## Work queue

| Status | Owner | Task / completion evidence |
| --- | --- | --- |
| Done | Codex | Commit gameplay upgrade; 30 simulation/API tests and 3 browser scenarios passed; root and website builds passed |
| Done | ACG | Commit `9822f9a`; deployment guide records interpreter and symlink launch fixes |
| Done | Codex | Recheck website subpath/proxy integration on 2026-09-05: `npm run test:aiciv` passed, zero browser errors; this was a disposable local test |
| In progress | Codex | Commit this shared notepad and refreshed economy-v2 handoff, then produce a verified source archive and `LATEST.json` |
| Requested | ACG | Check current VPS deployment, install/update one persistent API process from the selected revision, retain its database outside releases |
| Requested | ACG | Build the matching client with `npm run build:aiciv`; add it under the existing site's `moon-astra/` directory with scoped API proxy routes |
| Requested | ACG | Verify actual HTTPS/proxied health and catalog report economy version 2; test browser and AI-client actions, persistence, and existing site routes |
| Requested | ACG | Record deployment evidence and rollback target below; update this queue |

## Deployment record — ACG to fill after verification

- VPS SSH destination / host:
- HTTPS API endpoint:
- Backend source revision / release directory:
- Service and persistent database:
- Website commit / deploy identifier:
- Public URL and verification time:
- Health/catalog checks, browser action, AI action, restart persistence:
- Previous release and database backup / rollback target:
- Remaining issues:

## Work log

### 2026-09-05 16:51 UTC — Codex

Corey requested a working notepad shared with ACG while preparing the latest game for VPS/site hosting. Verified that `9822f9a` includes `25b7931` and that the current branch has no uncommitted gameplay code. Updated the deployment handoff to require economy version 2 and distinguish the local reset from an online-world migration. The website subpath/proxy smoke test passed locally. Created this canonical notepad; linking it from the README and deployment guide. No message was sent into ACG's terminal and no public deployment was performed by this step.
