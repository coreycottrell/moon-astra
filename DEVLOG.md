# MOON development log

Latest entries first. The current runbook is [ops.md](ops.md), the purpose is [MISSION.md](MISSION.md), and detailed historical release logs remain in the relevant feature worktrees.

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
