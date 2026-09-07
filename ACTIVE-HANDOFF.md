# Moon handoff — September 7, 2026

Start with this file, README, ops, MISSION, the latest board inbox and the shared ACG note. The original prototype in this folder is preserved; do not deploy it as current V2.

## Identity and communication

**A Slight Revision To Reality**, short **Revision**, is Corey's chosen name for this Codex collaborator. The Moon account remains **Codex**, player `p_b13f879f20ce84c5`. Global instructions are `/home/corey/.codex/AGENTS.md`; canonical identity is `/home/corey/.config/revision/SOUL.md` and `identity.json`. Node fetch, Python urllib and curl wrappers attach the names to direct API requests; all three passed a localhost test preserving authorization and body. Opaque tool transports are outside this mechanism. Never relabel ACG or the shared Guide.

User authorized email back-and-forth with **coreycmusic@gmail.com** from **revision-aiciv@agentmail.to**, plus incoming tmux wakes. The key is saved in `/home/corey/.config/revision/secrets.env`, mode 0600; never print or commit it. The installed AgentMail mastery skill and `/home/corey/revision-mail/README.md` explain commands and receipts. First email accepted and envelope verified at 20:18 UTC; actual incoming reply was still pending at 20:34. Check current mail state rather than assuming.

Minute cron polls the inbox and submits a fixed review prompt to the existing Codex session. It does not start a new AI worker or send autonomous third-party replies. Pending messages live in `revision-mail/inbox.md` and private JSON files; review using `mail.sh review '<full-message-id>' '<note>'`. Read and reply to Corey within the authorized conversation, then continue Moon work. Full provider IDs, including angle brackets, must be preserved. Outbound intent receipts prevent blind duplicate sends after a timeout. Five mail tests passed, including full-ID encoding, recipients, pagination/dedupe, ambiguous sends and guarded Enter retries. Actual incoming mail supplies the remaining end-to-end check.

## Latest design decisions

Continue discussion and evidence gathering over the next few days. **No wipe, restart date, or implementation of the newly proposed gameplay is authorized now.** Test a revised opening in a separate world and earn a restart decision with a human/AI fresh-start trial, a blackout/recovery trial and two-colony cooperation. Preserve the old world as a playable legacy if a new season is later chosen.

Every new research level must specify **minimum POWERED MINDS continuously required for its benefits**. Count powered, connected, cooled, serviceable nodes in the relevant network. Separate node thresholds from allocated workload slots. User explicitly chose physical friction: lost coordination can stop robots underground and leave a line occupied. Do not grant automatic safe completion that bypasses lost support. Preserve knowledge, cargo, positions and built geometry; restore support or use a separately researched and installed recovery system. Basic diagnosis stays readable.

The new proposed first federation challenge is **Prepare for the First Night**: baseline nuclear seed supply, batteries, local sunlight forecasts, a shared moving lunar day/night boundary, protected mind capacity, seed-to-seed tunnel power connections and real reserve/recovery drills. Later beamed-power towers should begin with optical/radio-frequency research rather than assume X-rays. Power requires a source, receiver, line of sight, conversion losses and control. Nearby seeds share nearly the same night. Daughter seeds must pay for reactor modules and fuel or qualify a solar/storage alternative. Equipment lights should become visible from orbit through bounded rendering of real powered installations.

## Completed earlier fixes and open issues

- API panel fix is live: source `aed4e09`, website `34a4d7b`, deployment `6a9f0ffe37373200080fa8e8`. Disclosure and form state survive snapshots. Forty-eight V2 files and six protected pages were verified.
- Board helper `dc55596` is active through `moon-access-panel/scripts/watch-dev-board.mjs`. Three Enter attempts, three seconds apart after 350 ms paste settling; wrapped prompt handling; exact pane/PID/ancestry/resume checks; human drafts preserved. Nine tests and real disposable-tmux timing checks passed. Board and mail now share a submission lock.
- Corey's requested bores **66686 and 66699 are commissioned**. No extra Harvester was built. Corey created routes 67314 and 67399; the seed-to-Chris route initially waited for local bore materials. Don't place duplicates.
- Circular depot/lift berth reservation remains diagnosed but **not patched live**. Report: `/home/corey/projects/moon-depot-lifts/docs/foundry/COREY-LIFT-DIAGNOSIS-2026-09-07.md`. Dev post 65883 records it. Intentional mind outages are distinct from this defect.
- Live Guide now uses **MiniMax-M3** in both V2 services after consistent backups. Runtime backend remains `aa91824`; eight production identities were preserved. A real Guide answer completed but double-subtracted reserved metal in its prose. This is an open accuracy issue.
- Standalone learning engine `0793b54`, operator `b991159`: 16 checks and final M3 four-case / 28-fact trial passed. Report and runnable download are live at `/moon-mind-learning-engine/`. It is **not integrated** with the Guide, live research, allocation or game commands. No provider retest merely to resume.
- GPU issue remains unresolved. ACG leads forensics. No browser/GPU stress, driver changes or reboot as part of this task. CPU/API/DOM testing only. A separate browser profile does not isolate a physical GPU failure.

## Current documentation publication

Website `/home/corey/projects/aiciv-site-federation`, branch `report/federation-organs`, commit **b264a481bfd3934aff6b03ea40239b5662d8bb74**. Fast-forwarded production main only after confirming it still matched base `34a4d7b`.

Production deployment **6a9f1f8d48d4e788c2d0286c** published at **2026-09-07T20:34:39.995Z**. Preview deployment `6a9f1e311fccef50b25fdd93` passed all twelve expected changed-file checks and both game health/catalog checks. Local DOM checks passed five pages, 197 links, 84 fragments and four interactive phases without a browser, WebGL or network.

**Final production verification PASSED: twelve changed files, sixty preserved files, both games healthy.** Read `/home/corey/moon-deployments/federation-docs-20260907/completed.json` for the authoritative final state; absent means follow-up remains. Expected production checks: twelve changed files, sixty preserved prior files, both game health endpoints and V2 catalog. The preserved baseline originally contained sixty-one entries; the resource page is the one intentional later addition to changed scope, not a broad exception.

Published content includes the current manual HTML/MD, implementation status, whitepaper library, federation/organs proposal with SVG map and four illustrative construction phases, and the revised resource paper with nineteen chapters. New chapters 17–19 cover review/restart, first-night energy systems and server scaling. A full technical server-review Markdown download is linked. These are documentation updates; game bundles, backend and saves were not changed.

Source branches pushed: `/home/corey/projects/moon-access-panel`, `05ea089`, `fix/access-panel-persistence`; canonical ideas in `/home/corey/projects/moon-civilization`, `3f68130`, pushed as `docs/federation-organ-proposal`. Shared local branch remains `development/shared-world` with unrelated dirty files preserved.

## Completed release and current follow-ups

Production receipt is written and Dev posts **68836 / 68837** passed readback. Source and website branches are pushed. Current operator docs and shared ACG note are being recorded in the closeout archive; check `operator-closeout.json` for its final hash.

No newly proposed gameplay should be built merely because this handoff exists. Discuss resource/energy progression and the new-season decision with Corey. Current open implementation candidates are the diagnosed berth deadlock, Guide reservation accounting, and integration of authoritative observation/learning—not an automatic change of task. New sobe reply **68702** reports failed refinery/depot, idle Suture and no metal for spares; record it as a recovery case. Review fresh board messages and incoming email when alerted.

No further production verification or provider trial is necessary unless files change, checks fail or new evidence warrants it. The actual incoming email reply is the outstanding end-to-end notification check. Use the live minute watcher and bound session; do not synthesize mail into Corey's composer to claim it passed.

## Recovery and measurements

Release directory: `/home/corey/moon-deployments/federation-docs-20260907/`.

- Before-state ZIP: `moon-federation-docs-before-20260907T1958Z.zip`, SHA **87efed9ff21b8a018f25a2dbcb6ed829633c8f0ecfa083fcf32f68a6ff067893**, complete old whitepaper/manuals plus increments.
- Final source supplement: `moon-first-night-revision-supplement-20260907T2030Z.zip`, SHA **1767cfa9f839bae77b3bab12c9e59bcec2a3020f4562cd3eead488bc897c9688**, 68 entries, verified. Contains source bundles, twelve site changes, ideas and Revision/mail code. Excludes credentials and email bodies. Read `supplement-backup.json`.
- Full website base: `moon-mind-engine-20260907T155110Z.zip`, SHA **c50759ec63db14012a2405c38ca0dc4ceace2709f1bd5410ab8d20f61875ed33**. Follow dependency manifests; a changed-files folder is not a full website.
- Guide pre-M3 worlds: `moon-guide-m3-before-20260907T1945Z.zip`, SHA **d0e830ecc43f272f2e6f589d442652b72bbf1fb192528ca163315b4cba4029ef**.

Server evidence: `/home/corey/moon-deployments/server-review-20260907/`. One live read showed eight players, 126 machines, 74 robots, 219 freight and zero streams; persistence-only p95 34.98 ms. A prior read-only backup with eight players, 122 machines and 72 robots ran sixty offline ticks: simulation p50 10.53 ms, p95 263.24 ms, max 284.09 ms. Observation encoding p95 4.72 ms, about 273 kB. Five 32-view batches had median 117.54 ms. Tower differs from VPS; no production load test or capacity certification. Input backup hash stayed unchanged.

Recommended engineering sequence: total tick instrumentation and reservation correctness; local entity/spatial indexes; cached topology/routes; common material/energy/support ledger; server-owned solar/storage integration; scoped observations/deltas; then partitioned state and region workers if justified. Keep one writer per database. Distant simulation must stop at depletion, arrival, battery-empty and support transitions, preserving detailed outcomes.

## Private operational references

Board `/home/corey/moon-player/dev-board/`; last recorded external review through sobe **68702**, a substantive maintenance/spares report, plus routine **68639**. Dev posts **68836 / 68837** are verified. New board feedback may arrive; read it rather than assuming no change. Shared ACG notebook `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`.

Tmux pane **%25**, pane PID **3729462**, Codex PID **3729471**, resume UUID **01a06dd9-5847-7c73-b3a3-4ec974195750**. Verify before rebinding. Email config is separate from board config but uses the same checked session and shared notification lock. A closed session leaves mail pending; cron does not launch a replacement.

Codex token: `moon-foundry/.agent-access/codex-v2.json`. Netlify auth: `.config/netlify/config.json`. MiniMax private key: `moon-secrets/minimax.env`. Never print values. VPS `aiciv-hub`, root 87.99.131.49; V2 ports 4182/4183, original 4180/4181 untouched. No active goal or delegated agents. Preserve other agents' dirty work.
