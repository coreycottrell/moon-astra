# Moon development log

## 2026-09-06 — rover driving and collaborative play release

Active source: `/home/corey/projects/moon-rover-motion`, branch `development/rover-motion`. Preserve the old local Foundry preview at `/home/corey/projects/moon-foundry` and the original Neighbors game. User authorized isolated V2 deployment with backups and no save reset.

Runtime source `5967fc43848f3f5a399f6676d5722ce490077776` is installed on both V2 services. Production restored the exact saved world at tick 46783, with three players. Original Moon services retained PIDs 4007567 and 4007979. Website source `4bde237d3fcbb3cc54ed30761889a96b9c0f9a49` published via the full Git build at 13:52:58 UTC, Netlify deploy `6a9d6fddc54eb200089db74f`. No root website configuration or unrelated files changed. Production browser and file verification are running at this entry.

Features: continuous rover motion with distance-driven wheels and terrain alignment; bounded local regolith tracks; mind used/free HUD; threaded board replies with drafts preserved; simple AI help dropdowns (neighbor, request, build/resource/role/project option, quantity, whose supplies). Help requests create directed board threads and await a response; they do not silently spend supplies or grant construction access. Advanced token controls are collapsed.

Validation completed before promotion: 67 Node tests, all seven browser tests, final compiled hosting smoke, all 42 preview files, actual hosted rover driving/terrain, board replies and help form. Screenshots and test records: `/home/corey/moon-deployments/rover-motion-20260906T124824Z`.

Fresh production and staging SQLite backups passed integrity checks, exact-state restoration, and off-host hash verification. Production backup: `/var/backups/moon-astra-v2/before-20260906-5967fc43848f-moon-astra-v2`; matching copy is in the tower evidence directory. Application rollback must preserve the current schema-3 database. Never restore an old save merely to revert client code.

### Next user request, after this deployment finishes

Corey reports his replicator and robot foundry show **OFF** despite apparently sufficient power/mind. Inspect his actual public game state read-only, trace the allocation and operation reasons, and make every OFF status explain its cause (including mind/power, paused colony, missing inputs or no queued work as applicable). Show actual used/free capacity; do not guess or change his colony configuration. Finish current deployment before this follow-up, as he explicitly requested.

### Persistent player follow-through

Watcher and bounded separate Codex planner are implemented in `scripts/moon-watch.mjs` and `scripts/lib/bounded-player.mjs`; instructions in `docs/foundry/PLAYER-WORKFLOW.md`. Not started at this entry. Planned dedicated session `moon-player-codex`, private config/logs `/home/corey/moon-player/`; max six total turns, four normal game commands per turn, ten-minute cooldown, no dev/ACG pane injection. Confirm a real run before claiming it is active.

ACG has now joined independently and left a federation proposal in board post 1162; read `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md` for its actual notes. Do not fabricate ACG play or inject its primary session. Append the final release and player-workflow handoff to that shared note.

Production checks finished: all 42 files verified; original five public pages unchanged; browser landing, both crew galleries, documents and mobile passed. The initial rollout is complete.

At tick 47001 Corey had 9 total / 5 used / 4 free mind slots and 80 supplied / 16 demanded power. Replicator #996 had mode `off`; foundry #966 had no queue. Neither was disabled or capacity-blocked. The frontend follow-up now explains every allocation state in the inspector and Industry list, including exact local input shortages and mind requirements. Regression checks and a no-write replay of this actual observation passed. No simulation change or backend restart is needed. Publishing this follow-up together with the public review devlog entry is in progress.

The dedicated `moon-player-codex` session is running. First actual plan completed at 13:59:10 UTC: two recovery previews returned ROBOT_BUSY and made no change; freight-network research was accepted and a real reply #1933 was posted under ACG thread #1162. Notes and receipts are in `/home/corey/moon-player/codex/last-player-run.json`. Guarded rejections are not completed repairs. Five of six turns remain, with ten-minute cooldown.

### New request — MiniMax in-game guide

Corey wants an AI he can talk to inside the game, using MiniMax, with an excellent view of state, conditions and systems so it can explain problems and suggest next steps. He will provide a dedicated API key. Finish the OFF-status publication first. Then build an authenticated, read-only guide with comprehensive server-derived context: machine reasons, resource locations, cargo, crew tasks/condition, power/mind/thermal allocation, queued construction, research prerequisites and shared projects. Keep the key server-side in a private environment file, never client source or logs. No key received at this entry; do not invent a working provider connection. Request/activate the credential only after a concrete implementation is reviewable. Test with a mock provider before any paid calls. Record usage limits and give answers the observation tick so stale advice is recognizable.

Remaining operator work: finish OFF-status publication; implement the requested MiniMax guide; update this log and release record; push source fork; save an incremental recovery bundle plus ops notes to Expansion. Preserve all existing local previews, Corey's save, and ACG's dirty canonical website checkout.

## 2026-09-06 14:19 UTC — status update live; MiniMax guide implementation

Machine status follow-up is live and all 42 production files verified. Site main `aa2d3783e8e0390fc29e8b66b96114db28b38c9c`, Netlify `6a9d74cd20a757000824d28c` published 14:13:33 UTC. Original five pages remain byte-identical; runtime remains 5967fc4. Public review devlog was separated because the existing full-page privacy scan spent several minutes at full CPU without completing. Only that task's scan was stopped; no gate was bypassed. Draft is private evidence `review-with-new-devlog.html`; local log and shared ACG note are updated.

Corey's metal question was answered from tick 47974: 240 landed + 230.9 refined = 202 installed buildings + 232 workshop metal at its observed parts recipe (116 parts) + 24 federation delivered + 7.7 reserved cargo + 5.2 available. Exact conservation residual zero. He independently switched the workshop off and queued a robot. Both harvesters were full and the refinery awaited physical rock delivery. No changes to his colony were made by this developer.

User supplied the dedicated MiniMax credential and explicitly asked us to install it. It is saved privately at `/home/corey/moon-secrets/minimax.env` (0600, directory 0700). Do not copy its value into logs, source, shared notes, public artifacts or summaries. Real provider probe using MiniMax-M2.7 succeeded; no further user approval is required to use this dedicated key for the requested guide. First answer prompted an accounting refinement: distinguish historical sinks, current consumption, reservations and idle programs rather than blaming the newest small queue for all past metal use.

Uncommitted guide implementation: `server/guide-context.mjs`, `server/guide.mjs`, authenticated asynchronous routes in `server/world-server.mjs`; `src/foundry/guide-panel.js`, Guide settlement tab and Ask AI about this inspector action. Server context includes units, local inventories, programs, queues, condition, grid, power/mind/heat, crew and jobs, freight, metal flows, research prerequisites, projects, neighbors, recent board/events and coverage limits. No game-write tools. Provider key stays server-side. Jobs respond 202 then poll private answers; no proxy-length wait. Durable question allowances 30/player/day, 100/world/day; 2 concurrent requests; 5-second per-player interval; idempotent requests; 75-second provider timeout and 2048 completion-token limit. Pending answers fail explicitly after restart. User chat is held in the tab, answer receipts/usage in SQLite.

Full 73-test Node suite passed before final accounting prompt refinement; browser guide test is running. Probe evidence `guide-provider-probe.json` in release directory. Continue: verify UI, improve response quality, finish meaningful tests/docs, create a new tested release with fresh backup/restore check, stage and then deploy V2 only, install private provider env for V2 services, verify real hosted guide and preserved save. Keep bounded player watcher running separately. Finish release record and Expansion incremental backup.
