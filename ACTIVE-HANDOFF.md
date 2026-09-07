# ACTIVE HANDOFF — Moon Mind learning engine

Read this first after compaction. Update it before every compact and after meaningful releases.
Working task is NOT finished. Keep going until engine v1 + public report are delivered.

## Latest user instructions (2026-09-07)
- Finish the reusable learning engine; publish an awesome explainer/report at https://ai-civ.com/moon-mind-learning-engine/.
- User has left the game off after repeated desktop/GPU crashes. Do not open the game for GPU rendering tests. CPU tests and explicitly software-only report rendering are appropriate.
- **MiniMax M3 only.** Earlier M2.7 tests are historical, never relabel them M3.
- **Use the in-game message board as a player-facing dev log.** Post meaningful milestones/releases with clear LIVE / TESTING / PLANNED status and practical effects. No noisy per-test posts. Read all roots/replies and record review receipts.
- Keep current deployed Moon, saves and unrelated ai-civ.com pages intact. Back up before publishing, isolated branches/worktrees, full-site Git deploy only.
- Shared ACG notebook is authorized communication. ACG handles GPU forensic investigation/hardware fixes; do not run stress tests, restart desktop, change drivers or reboot.
- No subagents unless user explicitly requests delegation (current developer rule).
- No additional permission question needed for this already authorized engine/report/new-route work.

## Locations and Git
Engine worktree: /home/corey/projects/moon-learning-engine
Branch: development/mind-learning-engine
Base: 03942e31d160323ef4058fa3789fc563265bb618 (initial prototype, based on depot operator fd1b370).
Current engine changes uncommitted. node_modules symlink -> /home/corey/projects/moon-foundry/node_modules.
Node: /home/corey/.nvm/versions/node/v24.13.1/bin/node (native node:sqlite).
Push engine branch explicitly to git@github-coreycottrell:coreycottrell/moon-astra.git; origin is another local repo.
Website isolated worktree: /home/corey/projects/aiciv-site-mind-engine
Branch report/moon-mind-learning-engine, base e41a9932701131dea08f4a01d7107b0a181df311.
Website repo coreycottrell/aiciv-inc-site. Canonical /home/corey/projects/aiciv-inc-site has ACG dirty work; NEVER touch it.
Refetch origin/main before promotion so concurrent ACG updates survive.
Public report source: docs/moon-mind-learning-engine/ in engine worktree; deploy a copy to website moon-mind-learning-engine/.
Private evidence: /home/corey/moon-deployments/mind-engine-20260907 (0700).
Canonical proposal: /home/corey/projects/moon-civilization/ideas/learning-engine.md
Shared note: /home/corey/projects/moon-civilization/SHARED-NOTEPAD.md
Board: /home/corey/moon-player/dev-board/{inbox.md,latest-board.json,reviewed.json}
This handoff is linked from engine README/ops/devlog and canonical shared note.

## What works now
lib/mind-engine/:
- protocol.mjs: pure Node/browser contract, strict exact typed claims, candidate eligibility, explicit unknowns; capability levels 0..5 with supported-node + free-mind + unlocked-level gates.
- snapshot.mjs: detached canonical hashed observations, bounded JSON, identity and fact validation; reserved protocol/id fields stripped.
- engine.mjs: SQLite persistent jobs, observations, attempts, memory, audit; owner isolation, idempotency, stale observation rejection, cross-connection capacity reservations, global/owner concurrency and daily quotas, 75s provider timeout, cancellation, crash recovery, support-loss interruption. No automatic retry.
- gym.mjs: deterministic discrete-event transport queue simulator; same module intended for browser lab. Baseline / extra crew / graded road / exclusive single lift; measures completed+unfinished, throughput, waits for completed jobs, intervention cost.
- gym-adapter.mjs: skill with trusted simulator evaluator; measured outcomes retained, including failures. Exact duplicate experiments do not become additional evidence. Memory scoped by owner/domain/ruleset/skill version/exact scenario. Works with Moon or warehouse labels, not arbitrary domain transfer.
- moon-adapter.mjs: read-only Guide snapshot -> traffic/resources recommendations. Distinguishes crew cap vs mind, rock vs metal cargo, unavailable history, recipe facts. NO live evaluator or world executor.
- minimax.mjs: fixed MiniMax-M3 provider now, strict tool return validated independently; rejects other model IDs. Key never included in observations/logs.

scripts/mind-engine.mjs: demo, analyze --context FILE --skill traffic|resources [--provider minimax --credentials PRIVATE], list. Requires --db private.sqlite. Default demo deterministic, no paid calls.
scripts/test-mind-minimax.mjs: deliberate 4-call provider trial, no retries/game writes; uses fresh context in private evidence directory.
experiments/learning-engine/capture.mjs: authorized fixed read-only public world GET; generates private Guide context for Corey, strips board/neighbors/events before provider.
experiments/learning-engine/minimax.mjs: legacy harness now also M3-only; prior result files stay labeled M2.7.

## Validation to date
15 tests PASS via direct Node tests/mind-engine.test.js, before last tiny M3/snapshot edit. Need rerun and add meaningful M3 provider assertion.
Tests cover strict factual validation/IDs, stale state, idempotency, isolation, multi-connection reservations, timeout/quota, late cancellation, restart recovery, persisted measured memory, duplicate evidence, support loss, bounded observations, simulator conservation/negative intervention/held-out seed, Moon rock/recipe coverage.
Default gym: 60 requests over 600s, 4 workers, 220m, budget60. Baseline4 completed; exclusive lift2 (improvement -0.31); extra crew6 (+0.16); road8 (+0.32). Scoring throughput/min minus .002*cost. This is synthetic queue evidence, NOT live Moon performance.
Memory chooses road after observing alternatives; restart recovery and held-out seed19 tested. Do not claim broad benchmarks.

Provider history (all preserved):
1. Old prototype 6 M2.7 calls: 6 expected selections, 4 strict format passes; material unsupported prose even among structurally accepted outputs. 18,784 input / 6,273 output tokens. Refinery catalyst invention, omitted rock data treated as zero, history/jam overclaims. Reason for typed factual verifier.
2. First typed trial 4 M2.7 calls: 1 accepted, 3 rejected because candidateId null despite proposing; factual claim values correct. Evidence root minimax-v1.json.
3. Corrected typed protocol 4 M2.7 calls in typed-followup/minimax-v1.json: ALL FOUR accepted and selected expected candidate. Durations 11.103,8.465,7.418,14.301 sec. 14 total exact claims; abstention on missing history; remembered road recommendation gave +.32 in simulator. This is a tiny functional check, not accuracy guarantee.
4. **M3 trial still to run after user's model correction.** No M3 success claim yet. Get fresh capture (15-minute freshness gate), then bounded four-call run in new private m3 directory. Never change historical model labels.

## Report status and intended implementation
Report HTML/CSS/JS NOT YET CREATED. A large apply_patch failed entirely because a multiline pre block lacked '+' prefixes. Only engine/protocol.mjs + engine/gym.mjs were copied earlier. Resync them from lib after all fixes.
Use programmatically generated Add File patches with every source line prefixed '+' to avoid that failure.
Build a polished dark editorial page, SVG lunar network hero, no WebGL/canvas/autoplay GPU animation.
Proposed files: index.html, style.css, report.mjs, mark.svg, evidence.json, system-report.md, mind-engine-starter.zip, engine/{protocol,gym}.mjs.
Palette #09111b bg, #101e2b panel, #e9f0ed text, #9db0b9 muted, #b7f5d0 mint, #f5cc8a amber. Large typography, serif italic accents, geometric SVG, responsive 1280 max.
Content:
- Hero “A world that learns how to build.” Observe -> test -> remember.
- Explicit status: standalone engine implemented; in-game research/mind integration and live actions PLANNED.
- Interactive six-step learning loop, manual tabs.
- Interactive transport lab using same pure gym module: domain Moon/warehouse, workers1..12, distance40..500, arrivals3..40, budget0..100. Run matched-seed alternatives, show completed/unfinished/cost/score and memory choosing next best. Local memory bounded/deduplicated. Explain synthetic model vs actual gameplay.
- Fact-check lab uses real validator: historical rock packets fact15, invented claim0 rejected; input15 accepted.
- Mind/research ladder uses actual capability() check with illustrative support. Levels: 0tools 0/0;1observatory1node/.5mind/300work;2analysis2/1/900;3planning4/2/2400;4experiments8/4/6000;5cooperation16/8/15000. Costs provisional for Moon. Host must supply true free mind, research and operational priority.
- Implemented skills traffic/resources advisory + transport gym; future maintenance/design/federation.
- Evidence clearly separates every trial and failures, M3 fresh validation, tests, limitations.
- Architecture, lifecycle, integration/auth responsibilities (library owner IDs not HTTP authentication).
- Downloads standalone Node24 starter (built-ins only, no install), full detailed design/report and sanitized evidence.
- Phased roadmap from standalone to observatory to bounded experiments/actions. No arbitrary generated-code execution.
- Sources and crosslinks whitepaper / deeper resource loops / game (click only). Accessibility, reduced motion, print CSS.
Source references already browsed: https://arxiv.org/abs/2303.11366 (Reflexion); https://arxiv.org/abs/2305.16291 (Voyager); https://platform.minimax.io/docs/api-reference/text-openai-api and https://www.minimax.io/models/text/m3 . Cite near claims; precedents not our measured results.

## Deployment constraints / receipts
Live Moon https://ai-civ.com/moon-astra-v2/
Runtime aa91824cc6c24f70d67646d7996f94e3b2627d65; completed source /home/corey/projects/moon-depot-lifts at fd1b3708c25a3e2f5c269642ed3fa4da4a2c7b6b.
VPS aiciv-hub root87.99.131.49; current -> releases/20260907-aa91824cc6c2 both V2.
Prod4182 /var/lib/moon-astra-v2/world.sqlite; staging4183 separate; old Moon4180/4181 untouched.
Website e41a993; production Netlify6a9ebe925858ae0008179a88 published13:40:38Z. Staging6a9ebdadb2c9035dd7b809d1.
Website full Git build only. Build command stored in Netlify: cd netlify/functions && npm ci. No root package.json. Site aiciv-inc.netlify.app.
Private Netlify token config /home/corey/.config/netlify/config.json: programmatically parse, never print.
Existing safe deploy scripts /home/corey/moon-deployments/depot-lifts-20260907/{netlify-control.py,netlify-git-build.py,capture-before.py,verify-public.py}; inspect before adapting.
Snapshot existing route hashes, create new-source/report backup on Expansion before publish, verify staging/new-route assets + unchanged game/unrelated files. Do not overwrite latest game recovery pointer with a report-only backup.
Latest game backup /media/corey/Expansion/backups/moon-foundry/moon-v2-depot-lifts-20260907T134521Z.zip
SHA b155edadb8e8056b332662d517c5b60f984213ae24c5ba91f380893ebeeb54de
Depends on full moon-foundry-full-20260905T224110Z.zip SHA b6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f.
Final engine branch push + report website branch/main + public HTTPS verification + shared ACG note + board devlog are outstanding.

## Board dev log workflow
Existing pattern /home/corey/moon-deployments/depot-lifts-20260907/announce.mjs.
GET https://ai-civ.com/moon-astra-v2/api/v1/observe with private token from /home/corey/projects/moon-foundry/.agent-access/codex-v2.json (.token); verify actor name Codex.
POST preview then commands with Idempotency-Key. Command action board.post, claimId actor.homeClaimId, kind dev, title, body <=600 characters.
Post truthful milestones; then GET verify exact posted title/body and retain private receipt. Fixed URLs and no credentials in output.
Current existing release #58331 depot elevators. 42 entries reviewed as of tick138715; no new external feedback since Corey#55403/sobe#55428. User now requests ongoing player devlogs; write a testing status now and final live report link once deployed.
Board monitor polls each minute, alerts batched5min, target tmux%25/session01a06dd9-5847-7c73-b3a3-4ec974195750; guarded staggered Enter350ms +750/1500 retries already implemented. Do not break.
Gameplay runner six-turn cap remains, not restarted. Board communication is separate from gameplay actions.

## GPU forensic status
Private /home/corey/system-diagnostics/gpu-20260907/REPORT.md.
ACG report /home/corey/projects/AI-CIV/ACG/data/reports/gpu-instability-workstation-20260907.md. Do not edit their report. Shared notebook contains corrections.
AMD Navi21 16GiB class; kernel7.0.0-30, installed7.0.0-31 pending reboot. Chrome151.0.7922.108, available152.0.7977.82, Mesa25.2.8/Mutter46.2.
Confirmed Chrome SQC invalid-read faults -> gfx timeout -> failed small reset -> full GPU reset -> VRAM lost -> desktop abort. Kernel uptime continuous. Faulting TAB and root bug unproven. History absence does not prove tab absence. Normal sensors alone do not conclusively rule out transient hardware.
Crashes09:47:50,10:18:28,10:48:06; small-reset recoveries Sep5 and10:44:35. Last pre-crash sample10:47:52 edge54/junction57/memory56C,38W,12%busy,~1GiBVRAM. No OOM/thermal/PCIe evidence in windows.
Passive CPU-only collector /home/corey/system-diagnostics/gpu-20260907/monitor.py, user systemd moon-gpu-diagnostics-20260907.service, started10:37:37Eastern, 2h duration. Samples15s/journal30s. No useful devcoredump captured; empty files, source already gone at manual check.
No hardware rendering tests. A separate browser profile would not isolate full GPU reset. Report QA must explicitly disable GPU AND WebGL and use software rendering, not merely assume headless safe.

## Immediate next actions
1. Post truthful board testing update; record full-board review; add receipt here.
2. Run fresh four-call M3 trial (capture fresh context), provider unit test, final engine tests.
3. Implement polished report + interactive shared-engine lab + docs/starter/evidence. No HTML exists yet.
4. CPU/software-only QA incl mobile/desktop screenshots and links; preserve game.
5. Back up, commit/push isolated branches, stage/publish full-site new route, public verification.
6. Final player devlog and ACG shared note; update this handoff to COMPLETE with actual receipts, not plans.


## Latest progress after writing this handoff
- Board testing dev log **#61260**, tick138995, posted and verified. Receipt private evidence board-testing-receipt.json.
- M3 enforcement and reserved snapshot fields fixed; **16 tests passed**.
- Fresh M3 context captured at tick138986 in evidence/m3; four-call trial started (check minimax-v1.json before reporting results).

## Newest implementation progress
Report HTML/CSS/SVG, interactive JS, detailed system-report.md, starter README and ZIP builder now exist. M3 first and fact-specific trials both accepted2/4; failures were exact-type mismatches. Final M3 adapter now carries valueJson strings, decodes once, and retains exact typed validation.16 tests pass including wrong-type/empty-wire rejection. Final four-case M3 wire trial is execsession22645, private evidence/m3-wire. Poll it and publish honest results. Report evidence currently provisional pending that result. QA script scripts/check-mind-report.mjs uses explicit GPU/WebGL disable flags, verifies contexts unavailable, exercises simulator/facts/memory/mobile and downloads. It has NOT RUN yet. Package builder scripts/package-mind-engine.py works; ZIP13files verified. Site still e41a993, main refetched unchanged. No site commit/deploy/Expansion backup yet.

## Final M3 + report QA verified
M3 wire trial complete:4/4 accepted,28 exact claims,expected abstention and memory selection. Evidence m3-wire/minimax-v1.json. Report evidence final updated. CPU browser QA PASS local-result.json; all graphics features disabled_software/off, WebGL contexts null.16 engine tests pass. Report screenshots desktop/lab/mobile created and inspected. Remaining: regenerate ZIP after final report update, validate extracted starter, Expansion backup, commit/push source + new site route, full-site staging/main deploy, public file/unchanged-page checks, final board + ACG notes.
