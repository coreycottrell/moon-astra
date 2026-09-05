# Civilization fork verification — September 5, 2026

This evidence describes `/home/corey/projects/moon-civilization`, branch `development/shared-world`. The original `/home/corey/projects/moon-astra` remains separate.

- **20 core/API checks passed.** Geography seams and real NASA heights; original simulation regressions; stable ownership cells; local finite resources and power; delayed construction; delegated building; atomic blueprints; nonmutating previews; research; freight; partner contributions; paid daughter machines and inherited programs; invalid-input rejection; deterministic history; API authentication; duplicate command receipts; conflicting commands; restart persistence; competing writer rejection.
- **Three browser scenarios passed**, zero failed/skipped/flaky cases in the final run. The 240-second run used a disposable world on 4185/4186. Actual UI actions covered all five machine types, powered research, a neighboring API player's delivered contribution, a complete three-machine factory layout, inherited recursive replication, reload with the same identity, visiting a neighbor, all four zoom scales, orbit landing, Tycho, region edges, the south pole, and a 390 × 844 phone layout. See `browser-results.json`.
- **Production build passed.** The combined JavaScript bundle is approximately 158 KB gzip. Vite reports the expected large-chunk advisory for the Three.js-containing bundle.
- **Compiled game and CLI collaboration passed** in a disposable world on 4177. A human browser saw a CLI player's five commissioned machines. Repeating CLI bootstrap created no duplicates; federation contribution worked; access credentials were written as 0600; WebGL rendered without browser errors; development diagnostics were absent. See `shared-production-results.json`.
- **Deterministic collaboration lab passed.** Two scripted players, 450 simulated seconds, 34 commissioned machines, 18 replicators, and generation-two descendants. Both delivered a federation, researched layouts, and paid actual construction costs. Remaining stocks were nonnegative; metal and power constrained further growth. This is a rules exercise with flat placement terrain, not a claim of external-model training or live-world performance. See `collaboration-lab.json`.
- **Visual review:** desktop construction, the federation/replicator board, District, Orbit, Tycho, phone surface, and phone board. The intermediate shading retains some lunar-map contrast and adds globally addressed procedural detail. Survey resolution is unchanged.
- **Preservation:** all 62 regular files in the original pre-fork snapshot matched SHA-256 after development. The original server remained available on 4173. A fresh-context WebGL check is recorded in `preserved-original-results.json`; no real browser profile or original save was accessed.

The first browser run passed gameplay and phone controls but hit its five-second terrain-refinement assertion at the pole. The final run allowed twenty seconds for asynchronous software-rendered refinement and passed. No terrain failure was suppressed. Three.js also emits its existing PCFSoftShadowMap deprecation warning; it uses PCFShadowMap as its fallback.

The rules cap is 24 players and 1,000 machines/jobs. That upper population was not load-tested. The shipped world starts empty; test players, credentials, and simulation advances were confined to temporary databases. No paid model API was called and no account or message was sent to ACG.

Run `npm test`, `npm run lab`, `npm run build`, `npm run test:browser`, and `node scripts/production-smoke.mjs` to reproduce. Original baseline screenshots remain for comparison; new captures are named `shared-*.png`, `federation-online.png`, and `preserved-original-current.png`.

## ai-civ.com hosting follow-up — September 5, 2026

- Added a separate `/moon-astra/` build in `dist-aiciv/`, base-aware asset/API/home/export URLs, and exact public-origin configuration for the proxied API.
- `npm run build:aiciv` and `npm run test:aiciv` passed. A local static subpath plus separate-origin API proxy loaded real lunar terrain, joined a browser player, applied its pause command, exported a correctly scoped access URL, and ran an AI CLI player's join/bootstrap. Every browser request stayed under `/moon-astra/`; unrelated Origin was rejected and the simulated site's root stayed intact. See `aiciv-hosting-results.json`.
- `npm test`: **21 passed**. `npm run build` and the ordinary root-hosted production/CLI smoke check also passed after the URL changes. The earlier three full gameplay scenarios remain the milestone evidence; this follow-up used targeted hosting and root-production regression checks.
- `systemd-analyze verify deploy/moon-astra.service` passed locally; the selected remote host still needs a suitable Node binary, user, paths, DNS, TLS, and actual service installation. Nginx was not installed locally, so the supplied location snippet was checked against documentation but not run here.
- Handoff links were checked; all 62 files from the preserved original snapshot remain unchanged. The site checkout was inspected read-only. No live Netlify deployment, DNS change, or remote API installation occurred. ACG must verify the real Netlify route and header forwarding in staging.

## Factory discoverability and first neighbor — September 5, 2026

A live player's completed balanced factory was difficult to recognize because it appeared as three ungrouped machines and the objective panel stayed on a generic research-unlocked message. The event log confirmed that all three machines had commissioned successfully, with no queued construction remaining.

- Added **Production layouts → Show on terrain**, three projected machine labels, and an explanation of the separate production pieces. Existing layouts are recognized from their authored geometry, so the locator works without a world migration or a retained construction event.
- Replaced the generic post-research objective with guidance for missing/pending replicators, programs left Off, and the remaining delivered/in-transit federation share.
- **25 core/API checks passed**, including four targeted layout/guidance regressions. The build passed. A separate 2560×1080 browser view of the live world successfully found the existing layout through the new button, displayed three labels, and showed the correct next action with no browser errors.
- At the player's explicit request, Codex joined the live world as a separate neighbor, built its own starter settlement, delivered its own 60-metal project share, and used one paid replicator cycle to manufacture a second refinery before returning its program to Off. No player token was borrowed and no other player's machines, resources, or settings were changed by the review.
- The desktop compositor denied direct wide-monitor capture. The screenshots are separate browser views of the same live settlement, saved privately outside the source repository at `/home/corey/moon-play-review/20260905/`.
- The preserved original's 62-file snapshot remains unchanged. The pre-existing change to `artifacts/aiciv-subpath.png` was left alone.
