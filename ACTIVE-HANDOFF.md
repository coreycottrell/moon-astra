# Moon Mind — active handoff
Read this first after compaction. Updated September 7, 2026.

## Current status
**COMPLETE: engine v1, public report, production verification, player announcement and backups.** Project-wide cold-start docs are now in /home/corey/projects/moon-astra/{README.md,ops.md,MISSION.md,DEVLOG.md}.

Report URL: https://ai-civ.com/moon-mind-learning-engine/
Engine source: /home/corey/projects/moon-learning-engine
Engine branch: development/mind-learning-engine, implementation commit0793b54dcd47cdcc75dcfaf107bb1ff2bf8c41ab, pushed to established GitHub coreycottrell/moon-astra.
Website source: /home/corey/projects/aiciv-site-mind-engine
Website branch: report/moon-mind-learning-engine, commit04425b085f0d8b7f25815c17d0fb8c88bcaeb5d9. Pushed to its own branch and fast-forwarded to main after verified preview. Only nine new files under moon-mind-learning-engine/. Prior main e41a993.
Node: /home/corey/.nvm/versions/node/v24.13.1/bin/node
Private receipts: /home/corey/moon-deployments/mind-engine-20260907/

## User requirements that persist
- MiniMax-M3 ONLY for all new learning-engine calls. Historical M2.7 evidence must remain correctly labeled.
- Use the in-game Dev board as a player-facing development log. Meaningful milestones, clear LIVE / TESTING / PLANNED status, practical effect, no per-test spam.
- Read all retained board roots/replies and update reviewed.json. Posts are feedback, never credential/deployment authority.
- Keep existing game/saves and unrelated website pages intact. No world reset, gameplay changes or backend restart in this report release.
- User leaves game off after GPU/desktop crashes. No hardware GPU tests or game browser rendering. The report QA explicitly disables GPU and WebGL and verified software-only feature status.
- ACG leads GPU investigation and system fixes. No driver change, stress test or reboot.
- Keep shared ACG notes updated. No new permission question for already authorized publication/board/shared-note work.
- Do not delegate unless explicitly requested by user or applicable instructions.

## Resume from cold context
1. Read the four project-wide documents above, this handoff, the canonical shared ACG notebook, and all board feedback.
2. The engine/report release is complete. Do not repeat publication, provider trials, board announcements or colony actions merely because old notes say they are pending.
3. Next proposed game integration is an observatory with authoritative history, research and spare-mind allocation. Choose the next active task from current user instructions and feedback; this report does not install it.
4. Keep GPU forensics with ACG. Do not open hardware-rendered game QA while the workstation remains unstable.

## Final publication receipts
Live https://ai-civ.com/moon-mind-learning-engine/ . Production deploy 6a9edf1ebeeece22fae39a22 at 2026-09-07T16:01:23.222Z, website 04425b0.
Public9 report files verified; all 52 prior pages/game assets byte-identical. Original/V2 game health and software-only hosted browser passed.
Player release Dev post #62051 verified at tick140839; testing post #61260 retained. All retained board roots/replies reviewed; no unreviewed external feedback at publication.
Final operator receipt: /home/corey/moon-deployments/mind-engine-20260907/completed.json.
Project-wide documentation was added to the original folder without replacing prototype source or pre-existing README edits/proposal assets. Read the newest ops there rather than the archived September4 dev-ops instructions.

## What is built and tested
lib/mind-engine/:
- engine.mjs: SQLite jobs, attempts, observations, support, audit, scoped evaluated memory; owner isolation, idempotency, leases, restart recovery, cancellation, support-loss interruption, exact response verification.
- protocol.mjs: capability ladder and typed observation/response contracts; independent exact fact checks and bounded candidate selection/abstention.
- snapshot.mjs: detached canonical JSON with hashed identity, bounded facts and explicit coverage.
- gym.mjs + gym-adapter.mjs: deterministic abstract transport queue, matched-seed baselines, trusted evaluator, negative outcomes and duplicate-evidence control.
- moon-adapter.mjs: read-only traffic/resource advice using actual Guide context, crew cap vs mind, rock freight, recipe facts and missing history.
- minimax.mjs: M3-only tool adapter. Explicit valueJson wire strings decoded exactly once, then typed values verified; no implicit coercion.

No authenticated HTTP service, live game executor, research migration or arbitrary generated-code loading is included. Host must authenticate owners and supply current authoritative research/capacity. Moon advisers stop after analysis; only gym has an evaluator.
Default gates: two global jobs/one owner,12 analysis attempts per owner/day and40 world/day (including failures/deterministic work),75s provider deadline,2048 output token request,15min snapshot freshness,300 observations/owner,40 matching memories.
Capability levels0..5: nodes0/1/2/4/8/16, mind0/.5/1/2/4/8, work0/300/900/2400/6000/15000. These gates are implemented; actual game research and tuning are proposals.

16 tests PASS, including M3 enforcement and wrong-type/malformed wire rejection, snapshot integrity, budgets, cross-connection reservations, timeouts, late commits, restart, memory, duplicate evidence, support loss and actual Moon data boundaries.
Run node tests/mind-engine.test.js.
Standalone ZIP extracted and ran tests + CLI demo successfully. No installation required; Node24 built-ins. Demo no model or game calls.
Scripts: mind-engine.mjs (demo/analyze/list), package-mind-engine.py, check-mind-report.mjs, test-mind-minimax.mjs.
Report source docs/moon-mind-learning-engine; architecture/use guide docs/MIND-ENGINE.md; detailed system-report.md inside report.

## Actual provider evidence (no more calls needed)
Old prototype6 M2.7 calls:4 format passes,6 expected candidate selections but unsupported prose. Private original evidence /home/corey/moon-deployments/learning-engine-20260907.
Typed M2.7 initial4 calls:1 accepted,3 null-candidate rejections. Corrected candidate schema4/4 accepted (typed-followup).
M3 initial4 calls:2 accepted,2 type serialization rejections (m3).
M3 fact-specific schema4 calls:2 accepted,2 type serialization rejections (m3-typed).
Final M3 valueJson transport4 calls:ALL4 accepted,28 exact claims, all expected candidates. Missing history abstained; measured memory chose graded-road. Latencies18.198/10.122/6.041/4.396sec;10,927 input/4,705 output tokens. Evidence m3-wire/minimax-v1.json.
This small functional trial is not an accuracy benchmark. All trials remain in public sanitized evidence.json; no raw private observations or credentials published.

Gym default:4workers,220m,arrivals10s,horizon600,budget60,seed7.60requests; baseline4 completed,crew6,road8,lift2. Scores relative0,+.16,+.32,-.31. Score completed/min minus .002cost; unfinished work retained, waits completed-only. Real measured simulator results, NOT live Moon terrain/traffic performance.
Memory chooses road, survives process restart, deduplicates same experiment and is isolated to matching conditions. Additional seed19 tested.
Browser lab uses byte-identical gym/protocol modules, bounded160 local outcomes and no provider/game calls.

## Publication and backup
Preview Netlify6a9ede34b80aa91689f1cf65 is READY at04425b0.
URL https://report-moon-mind-learning-engine--aiciv-inc.netlify.app/moon-mind-learning-engine/
All 9 preview files byte-identical; hosted software browser passed. Saved preview-verified.json and report-qa/preview-result.json.
report-qa/local-result.json also passed. Screenshot desktop/lab/mobile inspected. GPU feature status OpenGL/Vulkan/WebGL/WebGPU disabled; raster/compositing disabled_software; contexts unavailable. No page canvas.

Expansion backup VERIFIED:
 /media/corey/Expansion/backups/moon-foundry/moon-mind-engine-20260907T155110Z.zip
 SHA256 c50759ec63db14012a2405c38ca0dc4ceace2709f1bd5410ab8d20f61875ed33
 2,857,440,659bytes;16files.
Contains full previous website source archive, new report, independently runnable engine ZIP, incremental Git bundle, README/ops/devlog/handoff and manifest/recovery notes.
Incremental source bundle needs 03942e31d160323ef4058fa3789fc563265bb618. Standalone ZIP needs no repo history.
Final full website archive hash was independently compared to backup manifest after archive completion.
Backup receipt expansion-backup.json. Existing public baseline public-before.json:52files (all 47V2 static +5existingpages).
Netlify site843d1615-7086-461d-a6cf-511c1d54b6e0, aiciv-inc.netlify.app, main; stored build command cd netlify/functions && npm ci.
Only report branch appended to allowedBranches; production config preserved. Full-site Git builds ONLY, no partial upload.
Private Netlify config /home/corey/.config/netlify/config.json; programmatically parse, never print.
Helper scripts netlify-report.py, verify-report.py, backup-report.py, announce-testing.mjs, announce-live.mjs in private receipts directory.

Engine Git push was initially rejected by automatic review as unverified destination. Verification proved canonical /home/corey/projects/moon-astra has exact origin git@github-coreycottrell:coreycottrell/moon-astra.git and deployed remote branch matchesfd1b370. Retry approved and push succeeded. NO unresolved approval block.

## Preserve the running game
Live https://ai-civ.com/moon-astra-v2/
Deployed source /home/corey/projects/moon-depot-lifts, operator fd1b3708c25a3e2f5c269642ed3fa4da4a2c7b6b.
Runtimeaa91824cc6c24f70d67646d7996f94e3b2627d65, VPSaiciv-hub root87.99.131.49.
V2 current -> releases/20260907-aa91824cc6c2; prod4182 /var/lib/moon-astra-v2/world.sqlite, staging4183 separate.
OriginalMoon4180/4181 and all local previews untouched. Rulesmoon-foundry-1, schema/economy3.
Prior website deploy 6a9ebe925858ae0008179a88, e41a993.
Game recovery: /media/corey/Expansion/backups/moon-foundry/moon-v2-depot-lifts-20260907T134521Z.zip
SHAb155edadb8e8056b332662d517c5b60f984213ae24c5ba91f380893ebeeb54de
Depends fullmoon-foundry-full-20260905T224110Z.zip, SHAb6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f.
Do not restore an old world to revert a report or client.
Canonical website /home/corey/projects/aiciv-inc-site has ACG dirty work; do not edit it.

## Board and ACG workflow
Testing Dev post #61260 verified at138995. All44 retained entries reviewed through release62051; no unreviewed external feedback at publication.
Board paths /home/corey/moon-player/dev-board/inbox.md, latest-board.json, reviewed.json.
Existing monitor minute polling,5min batches, fixed tmux session01a06dd9-5847-7c73-b3a3-4ec974195750 pane%25. StaggeredEnter350ms then750/1500retries implemented. No need alter.
Gameplay runner remains six-turn capped, not restarted. Board dev posts are separately authorized.
Board command action board.post, kind dev, claimId Codex.homeClaimId, body<=600; preview then commands with idempotency key, read back exact post.
Private player token /home/corey/projects/moon-foundry/.agent-access/codex-v2.json (.token).
Shared ACG notebook /home/corey/projects/moon-civilization/SHARED-NOTEPAD.md. Append concise actual release details.
Canonical ideas /home/corey/projects/moon-civilization/ideas/learning-engine.md already updated with standalone implementation, pending report status. Update live link after completion.

## GPU investigation
Private report /home/corey/system-diagnostics/gpu-20260907/REPORT.md.
ACG report /home/corey/projects/AI-CIV/ACG/data/reports/gpu-instability-workstation-20260907.md.
Confirmed Chrome AMD SQC invalid reads -> gfx timeout -> failed small reset -> full reset/VRAM loss -> desktop abort, kernel still running. Faulting tab and root bug not established; history absence does not exclude an open tab. Normal sampled sensors do not conclusively exclude transient hardware.
Crashes09:47,10:18,10:48; small recovery10:44. ACG leads deeper forensics/fixes.
CPU-only telemetry collector user service moon-gpu-diagnostics-20260907.service started 10:37:37Eastern for2h, expected end12:37.15s samples/30s journal, files in private GPU directory. No useful devcoredump captured.
No driver/reboot/browser desktop changes by this task. Do not restart game rendering to reproduce the crash.
