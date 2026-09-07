# Depot elevator release — 2026-09-07

Live at https://ai-civ.com/moon-astra-v2/ . Refresh, then open Industry → Depot connections or Plan a tunnel.

| Item | Verified value |
| --- | --- |
| Source | /home/corey/projects/moon-depot-lifts · development/depot-lifts |
| Immutable runtime revision | aa91824cc6c24f70d67646d7996f94e3b2627d65 |
| Both V2 service targets | releases/20260907-aa91824cc6c2 |
| Backend archive SHA-256 | 112b9b73fe9f3cbe902666456012ea6859f2bd6a0dc10151695cd1aa15328993 |
| Website main revision | e41a9932701131dea08f4a01d7107b0a181df311 |
| Production Netlify deploy | 6a9ebe925858ae0008179a88 |
| Published UTC | 2026-09-07T13:40:38.295Z |
| Staging Netlify deploy | 6a9ebdadb2c9035dd7b809d1 |
| Production saved world | Tick 132265 · 7 players preserved |
| Staging saved world | Tick 132104 · 2 players preserved |
| Board release post | #58331 at tick 132504 |

A seventh player joined after the initial six-player backup. Exact-restore validation preserved the saved seven-player state at promotion. No player building orders, automatic upgrades, relocations or save resets were issued. Later operator-only commits do not change the immutable runtime above.

The release adds Blender robot lifts, six-bay depot aprons (two initially usable), physical installation/expansion jobs, basic single-occupancy transport and researched convoy/passing/twin upgrades. Start and End are explicit and independent of the working bore. Depot suggestions fill the planner for review, show total liner/fitout costs and honor port reservations. Completed producer links assign their depot; new hubs have bounded storage, inbound reservations, loading positions and handling time. Useful trips can chain links. Guide context and the authenticated catalog/observation APIs expose the same state and constraints.

Old utility links require a paid Fit 2 elevators command; endpoints are preserved. Old depots need a clear apron before retrofitting; crowded buildings stay put. An unfinished excavation can be stopped with ordinary returns/salvage. Upgrade capacity arrives only when crew commissioning finishes. Robots keep cargo and supervision costs. This edition adds no separate lift power/mind allocation.

Validation: 111 unit/server checks passed before the final paused-route case, which also passed with the 11-test lift suite. Real excavation, material delivery, crew assembly and freight completion passed. Eight opposing haulers drained all four tiers without underground overlaps or lost cargo. API preview, owner-only scopes, command atomicity and restart receipts passed. A six-player production copy ran 600 ticks with measured terrain; Corey and Chris had no robot blocked over 100 ticks at its last snapshot. All 11 full browser scenarios passed, plus the new depot-control scenario in its two-test follow-up. Compiled subpath/proxy smoke passed. Both hosted desktop/mobile checks passed with zero game writes or browser errors. All 47 public files matched; gzip terrain, GLBs, caches and missing-asset 404 controls passed. Homepage, original Moon, review, whitepaper and deeper-resource-loop page hashes remained unchanged. These measurements do not prove every possible layout free of congestion.

Private evidence and backups: `/home/corey/moon-deployments/depot-lifts-20260907`. Fresh pre-work online snapshots are under `before-depot-lifts-20260907` locally and `/var/backups/moon-astra-v2/` on the VPS. Each selected V2 upgrade also takes online/stopped snapshots and checks exact restore before promotion. Other Moon services and all unrelated site paths are preserved. Full-site Git publication only.

Recovery archives are incremental against `/media/corey/Expansion/backups/moon-foundry/moon-foundry-full-20260905T224110Z.zip`, SHA-256 b6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f. Each new archive verifies source restoration against that full backup bundle and every archived file checksum. Keep game databases and operator credentials private. Final operator revision and verified Expansion archive receipt are recorded in /home/corey/moon-deployments/V2-LATEST.json and /home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json. Predeploy source restore and Expansion copy were verified before promotion: moon-v2-depot-lifts-20260907T133318Z.zip, SHA-256 c7379723a004bb0dd953700d492b4dfa0b8472cab3c4dc6d307ab0ff746ed991.

Ordinary application rollback keeps the current live database. This additive release introduces saved elevator phases; older code does not understand them. Prefer fixing forward after players build lifts. Do not point b00ff861 at occupied lift routes, restore an old world as an application rollback, or rerun the previously completed Corey regroup operation. Website recovery uses a reviewed full-site Git build that preserves subsequent unrelated changes.
