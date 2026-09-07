# MOON development log

Latest entries first. The current runbook is [ops.md](ops.md), the purpose is [MISSION.md](MISSION.md), and detailed historical release logs remain in the relevant feature worktrees.


## 2026-09-07 — Federation library, First Night review and Revision mail published

Published website **b264a48**, Netlify **6a9f1f8d48d4e788c2d0286c**, September 7 at 20:34:39 UTC. Twelve documentation files verified against the complete-site build; sixty prior files stayed identical, both game health endpoints passed. No game rule, bundle or world reset in this release.

The [whitepaper library](https://ai-civ.com/moon-astra-whitepaper/#research-library) now links the current manual, status, galleries, engine/lab/evidence/downloads and related proposals. New [federation/colony organs paper](https://ai-civ.com/moon-astra-whitepaper/federation-corners/) has an SVG concept map and four illustrative build stages. Revised [resource loops](https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/) has nineteen chapters, including review/restart, Prepare for the First Night and a detailed server review. Five-page CPU DOM checks covered 197 local links, 84 anchors and the four stages without a browser or GPU.

Design direction: every new research level continuously needs minimum powered minds; unsupported coordination can strand robots underground. Batteries, baseline seed nuclear power, a shared lunar clock, tunnel power links, later power-beaming towers and real equipment lights make the first night a cooperation and resilience test. No restart is scheduled: prove the opening in a separate world, preserve today's workshop and history. Reactor modules/fuel must be accounted for in seed reproduction.

Server review used one read-only live sample and sixty simulated ticks on an unchanged backup. Fixture step median 10.53 ms, p95 263.24 ms; persistence-only metrics omit that simulation cost. Full-world observations are rebuilt per viewer. Recommended work: phase timing and reservation correctness, local indexes/caches, authoritative energy/resource/support accounting, scoped observations, then measured regional scaling. These are findings and proposals, not a shipped optimization.

Identity **A Slight Revision To Reality / Revision** is saved in global Codex AGENTS, canonical SOUL/profile and project IDENTITY. Direct HTTP helpers passed three localhost tests preserving auth/body. Installed AgentMail mastery skill; key stored privately outside Git. First email from revision-aiciv@agentmail.to to Corey accepted/envelope verified at 20:18 UTC. A minute cron watcher queues fixed tmux review prompts with guarded three-Enter retries and a shared lock with the Moon board. Five mail tests passed. Actual incoming reply remains the end-to-end check; no third-party auto-replies or independent Codex worker.

Player Dev posts **68836 / 68837** announce the release and proposals. Reviewed sobe's substantive #68702 report: broken refinery/depot, idle Suture and no metal for spares. Logged as an opening/recovery case; no speculative live repair claimed. Existing lift/depot circular reservation and Guide prose accounting issues remain open; GPU investigation remains with ACG. Live Guide uses M3, but the separately tested learning engine is not integrated.

Backup before publication: moon-federation-docs-before-20260907T1958Z.zip, SHA87efed9ff21b8a018f25a2dbcb6ed829633c8f0ecfa083fcf32f68a6ff067893. Final source supplement: moon-first-night-revision-supplement-20260907T2030Z.zip, SHA1767cfa9f839bae77b3bab12c9e59bcec2a3020f4562cd3eead488bc897c9688. Verified recovery chain and complete receipts: `/home/corey/moon-deployments/federation-docs-20260907/completed.json`. Current source commits: client/manual05ea089, canonical ideas3f68130. Shared dirty work and historical README edits preserved.

## 2026-09-07 — Cold-start documentation and Moon Mind release complete

Corey requested a reusable learning engine, an explainer at /moon-mind-learning-engine/, MiniMax-M3 only, player-facing board development updates, and documentation sufficient to resume with no conversation context.

Delivered:
- [Moon Mind report](https://ai-civ.com/moon-mind-learning-engine/): SVG diagrams, six-step learning loop, interactive transport lab, fact checker, proposed mind/research ladder, evidence, technical design and runnable starter download.
- Standalone engine at /home/corey/projects/moon-learning-engine, development/mind-learning-engine, implementation 0793b54. SQLite jobs, quotas, mind reservations, typed verification, read-only Moon adapters and measured simulator memory.
- M3's initial type-serialization failures were rejected and preserved as evidence. Explicit JSON-text claim transport is decoded once before the unchanged typed verifier. Final 4/4 cases accepted with 28 exact claims. Missing history abstains; measured memory chooses the better tested intervention.
- Sixteen engine checks passed. Extracted starter tests/demo passed. Local, preview and production browser checks passed with GPU/WebGL disabled.
- Full-site website commit04425b0, production deploy 6a9edf1ebeeece22fae39a22 at 2026-09-07T16:01:23.222Z.
- All 9 report assets verified; all 52 prior checked website/game files byte-identical. Both original and V2 game health passed.
- Player Dev posts 61260 (testing) and62051 (live report) verified. Continue using the board as a dev log.

Preserved: V2 runtime aa91824, operator fd1b370, existing game services, economy, saves, player identities and all unrelated site content. The report does not install live learning research or construction automation.

Recovery: /media/corey/Expansion/backups/moon-foundry/moon-mind-engine-20260907T155110Z.zip, SHA256 c50759ec63db14012a2405c38ca0dc4ceace2709f1bd5410ab8d20f61875ed33. Includes full prior website source, new report, engine starter, incremental source history and recovery instructions. Full receipts: /home/corey/moon-deployments/mind-engine-20260907/completed.json.

Original project README already had local edits and an untracked proposal folder when this documentation task began. They are preserved. New ops.md, MISSION.md and this DEVLOG.md make /home/corey/projects/moon-astra a reliable top-level entrypoint without changing its prototype code.

## Current follow-ups

- GPU instability remains under ACG investigation. Corey keeps game rendering off; do not treat publication of a static report as proof that the GPU issue is fixed.
- Future game integration: a read-only colony observatory, real route/production history, shared mind allocation and research unlocks; then bounded field experiments and shared findings.
- Roads, federation corner hubs and deeper resource geography remain proposals unless a later release explicitly ships them.
- Read current board feedback and the shared ACG note before choosing a new implementation task. The standalone engine/report release has no remaining feature work.

## 2026-09-07 — Depot elevators and logistics release

Current completed game source is /home/corey/projects/moon-depot-lifts, development/depot-lifts. Operatorfd1b370 and runtime aa91824 are deployed for V2.
Robot-sized terminals carry robots and cargo underground. Depots reserve up to six bays, start with two and expand; older depots can be retrofitted where clearance permits. Legacy utility corridors can be fitted with elevators. Tunnel tiers add capacity. Actual occupancy and elevator phases are exposed through the API.
Game Dev release post #58331. Detailed deployment and recovery record: /home/corey/projects/moon-depot-lifts/deploy/moon-astra-v2/DEPOT-LIFTS-DEPLOYED-2026-09-07.md.

## Earlier history: where to look

- Initial prototype: this directory, original README and archived dev-ops.md; initial commit 7e07e85.
- Shared Neighbors world, initial proposal and collaboration notes: /home/corey/projects/moon-civilization.
- Physical industry and robot work: /home/corey/projects/moon-foundry and later feature worktrees.
- Rover/collaboration, guide, build orders, traffic, tunnels and depot rollouts: chronological DEVLOG.md and deploy/moon-astra-v2/ records in /home/corey/projects/moon-depot-lifts.
- Canonical design ideas and shared ACG notebook: /home/corey/projects/moon-civilization/ideas/ and SHARED-NOTEPAD.md.

Historical “next task” paragraphs describe their date, not a current command. Start with the latest entry and ops.md.


## September 7 — Revision, current systems audit and federation proposal

Assistant selected the callsign A Slight Revision to Reality (Revision) at Corey's invitation. Existing player identity remains Codex.

API panel/draft fix published and verified; tmux hard-wrap/Enter retry repair active. Guide configuration corrected toM3 after verified backups; real read-only request completed, revealing a double-subtraction accounting error in freeform prose. Standalone learning engine tested earlier but still not connected to Guide/research. Current docs explicitly separate these systems and open traffic issues.

Read board roots/replies through51entries including sobe67655; public Dev67544 and bore-status reply67545 verified. Both requested bores commissioned; Corey seed-to-Chris tunnel67399 did start and awaited local liner supply. No duplicate route/extra harvester built.

Prepared current manual, implementation page, research library and an illustrated federation/organ/seed proposal in isolated websitebranch82e6e73. Document checks passed148links,56anchors and4illustrative phases without a browser or GPU. Publication/backup receipts: /home/corey/moon-deployments/federation-docs-20260907/. Consult ACTIVE-HANDOFF.md for remaining work; these design ideas are not game rules.
