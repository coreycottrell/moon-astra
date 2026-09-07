# MOON current operations

Verified September 7, 2026, after publication of Moon Mind. This is the current top-level runbook. [dev-ops.md](dev-ops.md) is the archived September 4 prototype handoff; its setup instructions are not the live V2 deployment procedure.

## Cold start: read these first

1. [MISSION.md](MISSION.md): purpose, priorities, shipped versus proposed.
2. [DEVLOG.md](DEVLOG.md): newest completed release and current follow-ups.
3. /home/corey/projects/moon-learning-engine/ACTIVE-HANDOFF.md: engine implementation and exact release receipts.
4. /home/corey/projects/moon-civilization/SHARED-NOTEPAD.md: shared Codex/ACG coordination.
5. /home/corey/moon-player/dev-board/inbox.md and latest-board.json: all retained player feedback; record the review in reviewed.json.

Current work is completed: standalone engine and report published, tested and backed up. The final player release note is Dev post #62051. No game backend, economy or save changed in this release.

## Source and deployment map

| Purpose | Directory / branch | State |
| --- | --- | --- |
| Project orientation + original prototype | /home/corey/projects/moon-astra · main · prototype code 7e07e85 | Preserved older prototype; do not deploy as V2 |
| Original Neighbors world + shared ideas/notes | /home/corey/projects/moon-civilization · development/shared-world | Separate game and state |
| Preserved local Foundry preview | /home/corey/projects/moon-foundry · development/physical-industry | Separate local world |
| Current completed V2 game source | /home/corey/projects/moon-depot-lifts · development/depot-lifts | Operatorfd1b370; runtime aa91824 |
| Latest standalone engine | /home/corey/projects/moon-learning-engine · development/mind-learning-engine | Implementation0793b54, followed by operator docs |
| Report website checkout | /home/corey/projects/aiciv-site-mind-engine · report/moon-mind-learning-engine | Report04425b0 merged into website main |
| ACG's canonical website work | /home/corey/projects/aiciv-inc-site | Existing local edits; do not overwrite |

The game GitHub repository is coreycottrell/moon-astra; canonical original origin is git@github-coreycottrell:coreycottrell/moon-astra.git. Some development clones have local origins pointing to older clones, so check the destination before pushing.
The website repository is coreycottrell/aiciv-inc-site. Never force-push main. Refetch it before promoting an isolated change.

## Live endpoints and current revisions

| Surface | Address |
| --- | --- |
| Current V2 game | https://ai-civ.com/moon-astra-v2/ |
| Earlier Neighbors game | https://ai-civ.com/moon-astra/ |
| Main whitepaper | https://ai-civ.com/moon-astra-whitepaper/ |
| Resource proposal | https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/ |
| Moon Mind report / lab / download | https://ai-civ.com/moon-mind-learning-engine/ |

V2 runtime: aa91824cc6c24f70d67646d7996f94e3b2627d65.
V2 operator source: fd1b3708c25a3e2f5c269642ed3fa4da4a2c7b6b.
Engine implementation: 0793b54dcd47cdcc75dcfaf107bb1ff2bf8c41ab.
Website main: 04425b085f0d8b7f25815c17d0fb8c88bcaeb5d9.
Production Netlify deploy: 6a9edf1ebeeece22fae39a22, published 2026-09-07T16:01:23.222Z.
Preview deploy: 6a9ede34b80aa91689f1cf65.
All nine new report files verified; all 52 prior checked site/game files remained byte-identical.

Read-only health:
    curl --fail --silent https://ai-civ.com/moon-astra-v2/api/v1/health
    curl --fail --silent https://ai-civ.com/moon-astra/api/v1/health

Expected current V2 ruleset moon-foundry-1, schema/economy 3; original game moon-neighbors-1. Recheck actual endpoints before operational work.

## Services and state: keep them separate

VPS SSH alias: aiciv-hub (root on87.99.131.49).
- moon-astra-v2: port 4182, database /var/lib/moon-astra-v2/world.sqlite.
- moon-astra-v2-staging: port 4183, separate database.
- Both V2 current release links point to releases/20260907-aa91824cc6c2.
- Original Moon services use 4180/4181 and separate worlds.
- moon-astra-v2-backup.timer handles verified hourly V2 snapshots.

Local source/service map from prior verified operation:
- Original prototype 4173.
- Neighbors 4175/4176, tmux moon-server.
- Foundry 4205/4206, tmux moon-foundry, database /home/corey/projects/moon-foundry/.world/world.sqlite.
- Whitepaper preview 4190, tmux moon-whitepaper.
These are service ownership references, not a claim that every local preview is currently running.

Do not run two processes against one SQLite file. Do not use killall node, clear browser storage or restore an older world just to roll back a frontend/report. A report update needs no game service restart.
For a real V2 backend release, use /home/corey/projects/moon-depot-lifts/deploy/moon-astra-v2/README.md and its completed release record; do not improvise from the original prototype's npm commands.

## Learning engine: run and verify independently

Node executable on this tower:
    /home/corey/.nvm/versions/node/v24.13.1/bin/node

From /home/corey/projects/moon-learning-engine:
    node tests/mind-engine.test.js
    node scripts/mind-engine.mjs demo --db /tmp/moon-mind-demo.sqlite --out /tmp/moon-mind-demo.json

The demo uses no provider or game connection. It stores real synthetic experiment outcomes and consults them on its next decision. Sixteen engine checks pass. The downloadable standalone ZIP runs after extraction with Node24, without npm installation.

Remote provider integration is MiniMax-M3 only. Final four-case trial passed with 28 exact claims; preceding rejected trials remain in the report. No additional provider calls are needed merely to resume work.
The engine is a library/CLI, not an authenticated public server. Its host must supply real ownership, research and spare mind. The standalone Moon advisers are read-only; only the gym has an evaluator. Proposed in-game research costs are not installed.

Private credential locations, never values:
- Dedicated MiniMax key: /home/corey/moon-secrets/minimax.env.
- Codex player token: /home/corey/projects/moon-foundry/.agent-access/codex-v2.json.
- Netlify operator auth: /home/corey/.config/netlify/config.json.
Do not print them, copy them into reports or send them to a model.

## Website publication and rollback

Use a complete Git build of the existing site. Never upload only the report folder as a replacement site.
Netlify site843d1615-7086-461d-a6cf-511c1d54b6e0, aiciv-inc.netlify.app, production branch main. Stored build command: cd netlify/functions && npm ci.
Isolated report preview branch is enabled alongside the existing branches. Build configuration and unrelated files were preserved.

Latest receipt directory: /home/corey/moon-deployments/mind-engine-20260907/.
- completed.json: source, deployment, checks and backup.
- production-verified.json: nine report files and 52 preserved existing files.
- report-qa/hosted-result.json: software-only live interaction/mobile/download checks.
- expansion-backup.json: verified prepublication archive.
- board-live-receipt.json: player Dev release note #62051.
- netlify-report.py and verify-report.py: narrowly scoped operator helpers.

For a report-only rollback, remove/revert the specific new-route change in a fresh website branch and publish a full-site build after preserving later unrelated work. Do not restore a game database. Previous website was e41a993; the backup includes its full tracked source.

## Recovery archives

Current report/engine backup:
 /media/corey/Expansion/backups/moon-foundry/moon-mind-engine-20260907T155110Z.zip
 SHA256 c50759ec63db14012a2405c38ca0dc4ceace2709f1bd5410ab8d20f61875ed33

It contains the complete previous website source, new report, independently runnable engine ZIP, incremental Git history, docs and manifest. The source bundle requires base 03942e31d160323ef4058fa3789fc563265bb618; the standalone ZIP does not.

Current game recovery:
 /media/corey/Expansion/backups/moon-foundry/moon-v2-depot-lifts-20260907T134521Z.zip
 SHA256 b155edadb8e8056b332662d517c5b60f984213ae24c5ba91f380893ebeeb54de

That game increment depends on:
 /media/corey/Expansion/backups/moon-foundry/moon-foundry-full-20260905T224110Z.zip
 SHA256 b6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f

The original README's September5 moon-astra backup is for the old prototype, not current V2.
Verify hashes, ZIP contents and dependencies. Restore into a new Linux directory. Preserve the current live database unless a deliberate state recovery is the task.

## Player communication

Use Dev board posts for meaningful releases/progress, with LIVE / TESTING / PLANNED labels. Current posts: testing61260; live report62051; prior depot-elevator release58331.
The board monitor checks all roots/replies every minute and batches alerts. Inbox: /home/corey/moon-player/dev-board/. Receipt: reviewed.json.
tmux target: pane%25, session01a06dd9-5847-7c73-b3a3-4ec974195750. Enter retry timing350ms, then750/1500ms is already implemented; preserve it.
The separate gameplay runner remains capped at six turns; a board watcher is not an actively playing agent. Do not silently restart gameplay or impersonate ACG.

Board API publication uses a Codex identity check, command preview, board.post with kind dev, body<=600, idempotency key, then readback verification. The existing announce-live.mjs is a receipt-gated example, not a command to rerun on every resume.

Shared ACG notebook: /home/corey/projects/moon-civilization/SHARED-NOTEPAD.md.
Project ideas: /home/corey/projects/moon-civilization/ideas/. Keep proposals there rather than burying them in an old feature fork.

## GPU constraint

Corey's Chrome/AMD graphics path has repeatedly faulted, resetting the GPU and aborting the desktop while the kernel remained running. The faulting tab/root bug is not established. ACG leads hardware/driver forensics.
Private report: /home/corey/system-diagnostics/gpu-20260907/REPORT.md.
ACG report: /home/corey/projects/AI-CIV/ACG/data/reports/gpu-instability-workstation-20260907.md.
The passive CPU collector moon-gpu-diagnostics-20260907.service was started 10:37:37Eastern for two hours; do not assume it remains active after 12:37.

Do not open the game for hardware rendering QA or run driver/stress/reboot changes as part of a documentation task. Report QA uses explicit GPU/WebGL-disable flags and verifies software rendering and unavailable WebGL contexts. A separate browser profile alone does not isolate a physical GPU reset.
