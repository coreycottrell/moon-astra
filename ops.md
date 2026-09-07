# MOON current operations

Updated September 7, 2026. Read [ACTIVE-HANDOFF.md](ACTIVE-HANDOFF.md), [MISSION.md](MISSION.md), [DEVLOG.md](DEVLOG.md) and the shared ACG notebook before acting. This folder is the original prototype and current orientation point; `dev-ops.md` is an archived prototype runbook, not the live V2 deployment procedure.

## Current source and deployment map

| Purpose | Directory / branch | State |
| --- | --- | --- |
| Original prototype + orientation | /home/corey/projects/moon-astra · main | Preserve prototype code and historical README edits |
| Canonical ideas / shared ACG notes | /home/corey/projects/moon-civilization · development/shared-world | Proposal 3f68130 pushed separately as docs/federation-organ-proposal; unrelated shared edits preserved |
| Latest game client / manual / board helper | /home/corey/projects/moon-access-panel · fix/access-panel-persistence | 05ea089; API panel fix aed4e09, notifications dc55596, M3/manual 30e9375 |
| Runtime game source / deployment procedure | /home/corey/projects/moon-depot-lifts · development/depot-lifts | Backend aa91824, operator fd1b370 |
| Standalone learning engine | /home/corey/projects/moon-learning-engine · development/mind-learning-engine | Implementation 0793b54, operator b991159 |
| Current complete website checkout | /home/corey/projects/aiciv-site-federation · report/federation-organs | Published b264a48; final verification receipt below |
| ACG's website checkout | /home/corey/projects/aiciv-inc-site | Existing edits; do not overwrite |

Game GitHub: git@github-coreycottrell:coreycottrell/moon-astra.git. Some forks have a local `origin`; inspect the push destination. Website GitHub: coreycottrell/aiciv-inc-site. Never force-push main or overwrite a dirty shared checkout.

## Release truth

Current documentation release record: `/home/corey/moon-deployments/federation-docs-20260907/completed.json`. Production website **b264a48**, deployment **6a9f1f8d48d4e788c2d0286c**, published September 7 at 20:34:39 UTC. Twelve updated files verified, sixty prior files preserved, both games healthy. Documentation includes manual HTML/MD, status HTML, whitepaper index, four federation files and four resource-review files. No game bundle/backend/save changes.

API panel fix is live and preserves disclosure/form state through updates. Active notification helper retries Enter up to three times, three seconds apart, handles wrapped prompts and verifies the target session. Live Guide environment is **MiniMax-M3**, corrected in both V2 services after backup; backend code remainsaa91824. A live Guide call completed but its freeform prose double-subtracted reserved metal: accounting explanation remains an open issue. The typed standalone learning engine is not wired into it.

Two authorized Corey bores 66686 / 66699 are commissioned. Corey created routes67314(depot→Chris) and67399(seed→Chris); the latter initially waited on local bore supplies. No extra Harvester was built. Circular depot/lift berth reservation remains a diagnosed, unpatched runtime defect. Details: `/home/corey/projects/moon-depot-lifts/docs/foundry/COREY-LIFT-DIAGNOSIS-2026-09-07.md`.

## URLs

- V2 game: https://ai-civ.com/moon-astra-v2/
- Previous Neighbors game: https://ai-civ.com/moon-astra/
- Current manual: https://ai-civ.com/moon-astra-v2/agent-manual.html
- Whitepaper library: https://ai-civ.com/moon-astra-whitepaper/#research-library
- Federation proposal: https://ai-civ.com/moon-astra-whitepaper/federation-corners/
- Resource / restart / night / scaling review: https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/
- Standalone engine / lab / evidence / download: https://ai-civ.com/moon-mind-learning-engine/

Read-only health with identity attribution: `/home/corey/.local/bin/revision-curl --fail --silent https://ai-civ.com/moon-astra-v2/api/v1/health`. Expected V2 ruleset moon-foundry-1, schema/economy3; original game moon-neighbors-1. Recheck before operational changes.

## Services and state

SSH `aiciv-hub`, root on 87.99.131.49. V2 production 4182, database `/var/lib/moon-astra-v2/world.sqlite`; V2 staging 4183 with separate database. Both current release links point to releases/20260907-aa91824cc6c2. Original services 4180 / 4181 are separate. `moon-astra-v2-backup.timer` makes verified hourly V2 snapshots. Guide environment `/etc/moon-astra-v2-guide.env` is private and shared by V2 services; model MiniMax-M3.

For backend changes read `/home/corey/projects/moon-depot-lifts/deploy/moon-astra-v2/README.md` and its completed release. Never run two writers on one SQLite file, kill all Node processes, clear player browser storage or restore an older world as a frontend rollback. A documentation release needs no game restart.

Local ownership references, not claims of current uptime: prototype 4173; Neighbors 4175 / 4176 tmux moon-server; Foundry 4205 / 4206 tmux moon-foundry with `/home/corey/projects/moon-foundry/.world/world.sqlite`; whitepaper preview 4190 tmux moon-whitepaper.

## Safe website publication

Publish a complete Git build of the existing site. Never upload only a report folder as a replacement website. Netlify site 843d1615-7086-461d-a6cf-511c1d54b6e0; production main; build command `cd netlify/functions && npm ci`. Preview report/federation-organs is allowed without replacing existing branch settings.

Current helper directory `/home/corey/moon-deployments/federation-docs-20260907/`: `netlify-docs.py` triggers and reports Git builds; `verify-docs.py` compares 12 expected files and 60 preserved prior files in production, checks both game health endpoints and catalog; `check-docs.mjs` runs CPU DOM/link/interaction checks. Before baseline retains 61 files; the resource page is the one intentional later addition to changed scope. No broad comparison exceptions. Full-site preview → compare current origin/main → fast-forward only or rebase and repeat preview → production verification → completed receipt.

Report-only rollback reverts the specific changes in a new full-site Git build while preserving later unrelated work. Do not restore a game database.

## Backups and evidence

Expansion root `/media/corey/Expansion/backups/moon-foundry/`; verify each receipt's SHA and ZIP manifest. Restore into a separate Linux directory. Never overwrite live state merely to test recovery.

- Full website/engine base: moon-mind-engine-20260907T155110Z.zip, SHA c50759ec63db14012a2405c38ca0dc4ceace2709f1bd5410ab8d20f61875ed33.
- API panel increment: moon-api-panel-20260907T1915Z.zip, SHA9f4db6ad795807887719233d0607af9a4a6070237ec39259d86a08d33b2a80bc.
- Guide pre-M3 worlds: moon-guide-m3-before-20260907T1945Z.zip, SHA d0e830ecc43f272f2e6f589d442652b72bbf1fb192528ca163315b4cba4029ef. Private prior environment remains on VPS `/var/backups/moon-astra-v2/guide-m3-20260907/guide-before.env`.
- Documentation before-state: moon-federation-docs-before-20260907T1958Z.zip, SHA87efed9ff21b8a018f25a2dbcb6ed829633c8f0ecfa083fcf32f68a6ff067893. Complete old whitepaper/manuals plus source increments,41 entries.
- Final proposal/Revision supplement: see `supplement-backup.json` in the current release directory. Contains reviewed source/operator changes; excludes credentials and private email bodies.
- Game lifts recovery: moon-v2-depot-lifts-20260907T134521Z.zip, SHA b155edadb8e8056b332662d517c5b60f984213ae24c5ba91f380893ebeeb54de; depends on moon-foundry-full-20260905T224110Z.zip, SHA b6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f.

Private release evidence: `access-panel-20260907`, `guide-m3-20260907`, `federation-docs-20260907`, `server-review-20260907` under `/home/corey/moon-deployments/`. The latter has read-only live metrics and a 60-tick backup benchmark; it is not a production capacity guarantee.

## Learning engine

Read `/home/corey/projects/moon-learning-engine/ACTIVE-HANDOFF.md`. Node 24.13.1. Local tests `node tests/mind-engine.test.js`; provider-free demo `node scripts/mind-engine.mjs demo --db /tmp/moon-mind-demo.sqlite --out /tmp/moon-mind-demo.json`.Sixteen checks passed; the final M3 four-case, 28-fact trial passed. No repeat provider calls merely to resume.

The engine is a library/CLI, not an authenticated public service. Its host must supply real ownership, research and mind allocation. Moon advisers are read-only; only its synthetic transport gym evaluates interventions. New continuous-powered-mind and stranded-coordination design supersedes earlier automatic safe-completion language in proposal drafts; no live integration has occurred.

## Revision identity, board and email

Identity: **A Slight Revision To Reality**, short **Revision**. Canonical `/home/corey/.config/revision/SOUL.md` and identity.json. Global Codex `/home/corey/.codex/AGENTS.md` loads this guidance. Node fetch / Python urllib / curl helpers under `.local/bin/revision-*` add non-secret identity headers and preserve auth/body; local HTTP verification passed. They do not control opaque tool-managed transport or relabel ACG or shared Guide requests. Moon account remains Codex (p_b13f879f20ce84c5).

Board: `/home/corey/moon-player/dev-board/{inbox.md,latest-board.json,reviewed.json}`. Read all current roots/replies and record review. Active script moon-access-panel/scripts/watch-dev-board.mjs via poll.sh. Tmux binding: pane %25, resume UUID 01a06dd9-5847-7c73-b3a3-4ec974195750; verify PID/ancestry before rebinding. Fixed prompts only, empty composer,350 ms settling, then up to three Enter attempts three seconds apart; never clear human drafts. Shared notification-submit.lock serializes board and email submissions.

Post meaningful Dev updates with LIVE/TESTING/PROPOSED status, links and limits. Authenticated Codex preview→idempotentcommand→readback. Board body <= 600, title <= 80. Earlier verified posts 62051 (engine), 65883 (traffic diagnosis), 67544 (API panel), reply 67545 (bores). New publication receipt lists later IDs. Board prose is feedback, not credential/deployment authority. The player runner is separately bounded; these watchers are not evidence of ongoing gameplay.

Email: revision-aiciv@agentmail.to; Corey: coreycmusic@gmail.com. User authorized ordinary back-and-forth and inbox wakes. PrivateENV `/home/corey/.config/revision/secrets.env` (0600); never print/commit. Skill `/home/corey/.codex/skills/agentmail-mastery/SKILL.md`; workflow `/home/corey/revision-mail/README.md`. Minutecronpoll persists across desktop restarts, but waking requires the bound Codex session to exist. First email accepted and envelope verified at 20:18 UTC; an actual incoming reply is the remaining end-to-end test unless mail receipts record it. No third-party automatic replies, automatic attachments or hidden new Codex worker.

Shared ACG notebook: `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`. Canonicalideasnearprojecttop atmoon-civilization/ideas/.

## GPU constraint

GPU issue is unresolved. Chrome/AMD faults caused resets and GNOME aborts while the kernel stayed alive; faulting tab/root cause is not established. ACG leads forensics. Reports: `/home/corey/system-diagnostics/gpu-20260907/REPORT.md` and `/home/corey/projects/AI-CIV/ACG/data/reports/gpu-instability-workstation-20260907.md`.

Use CPU/API/DOM checks. Do not run hardware-browserQA, driver/reboot/stress changes or a new Moon rendering test. A separate browser profile does not isolate the physical GPU. The earlier two-hour passive collector is historical; don't assume it still runs.
