# Traffic and tunnel deployment — 2026-09-07

Live: https://ai-civ.com/moon-astra-v2/ . Refresh to load the tunnel planner, traffic fixes, crew-cap explanations, stable Guide scrolling and Dev note board category. All existing worlds remain in place.

## Release identity

| Item | Value |
| --- | --- |
| Source | `/home/corey/projects/moon-traffic-tunnels`, `development/traffic-tunnels` |
| Runtime revision | `b00ff861b7db3c87ba596a622eed9d9deae7c2b6` |
| Both V2 service targets | `releases/20260907-b00ff861b7db` |
| Backend archive SHA-256 | `40ce29cde4d391a7ad6cb04933024261de1f2c5cd57a59b277389a8feb2c7a22` |
| Website revision | `6432b52992dcd5355c8563cf3dfe5a66ba1182ab` |
| Production Netlify deploy | `6a9ea953a81762000979dc79` |
| Published UTC | `2026-09-07T12:10:30.653Z` |
| Staging Netlify deploy | `6a9ea839bcc6bde15a1594c5` |
| Private evidence | `/home/corey/moon-deployments/traffic-tunnels-20260907` |

Later operator-only commits on this branch do not change the immutable runtime revision above. `/home/corey/moon-deployments/V2-LATEST.json` records the final operator revision and Expansion backup receipt.

## What changed

Rovers replan around occupied ground, use free nearby loading berths, wait physically outside a full loading ring, and park locally. Routine input buffers refill in batches with a bounded final-scrap drain; nearer active depots participate. Construction and fabrication retain their exact bills. Crew-cap waiting is distinct from a real shortage of mind. Stop future builds still preserves paid work; its display now explains that work is finishing.

Industry → Plan a tunnel separates the working Bore, Start and End. Local routes span 20–500 m; a neighboring seed can be up to 6 km away. Powered excavation costs 0.5 metal + 0.1 part and ten powered seconds per metre, supplied at the working bore. Newly completed links have two directional lanes; robots enter a portal, travel underground at 1.5× condition-adjusted speed, and emerge with their cargo. Following distance and blocked-exit waiting prevent surface overlap. Transit survives a save/restart. Existing utility links retain their old behavior. Neighboring inventories and power remain separate. Route selection currently uses one useful completed corridor, not a multi-hop network. Roads, bulk pipelines/conveyors and shared-corner federation hubs remain proposals.

Guide world ticks preserve the chat DOM and scroll. The board includes Dev note, and the independent tower monitor submits a fixed review prompt into the explicitly bound Codex conversation. Enter has two guarded staggered retries. All retained board posts/replies were reviewed; release post #56138 and replies #56139 (Chris #34265) / #56140 (Corey #55403) were verified at tick 127345. The separate gameplay runner remains at its six-turn cap.

## Validation and state preservation

- 99 unit/server tests passed. The full browser run passed nine scenarios and exposed an intermittent Guide refresh race; the actual DOM preservation fix then passed the Guide scenario three consecutive times. The tunnel-planner browser scenario and compiled subpath/proxy smoke also passed.
- A copy of the six-player world using real lunar terrain ran for 600 ticks. All 31 previously long-stuck robots moved: Corey 11, Chris 20. This is bounded scenario evidence, not a guarantee that future layouts cannot jam.
- Staging preserved the exact saved world at tick 126635 / two players. Production preserved it at tick 126778 / six players. Online, stopped and restore-test SQLite copies were independently copied and hash-verified. Original Moon service PIDs stayed unchanged.
- Both hosted desktop/mobile checks passed, with no game writes or browser errors. All 42 production files matched the release (HTML allows the host's pretty-URL serialization). Raw gzip terrain, GLB signatures, cache headers and missing-asset 404s passed. Homepage, original Moon, review, whitepaper and resource-loop page hashes remained unchanged.
- Corey separately authorized regrouping their 16 robots after the upgrade. At tick 126871 they were spaced on clear ground 221 m from their seed. Only position/navigation state changed; cargo, tasks, condition, resources, other players, identity/delegation/receipt tables and world time were preserved. A maintenance audit marker prevents rerunning. Fresh before-regroup snapshots are retained. At tick 126951 neither Corey nor Chris had a robot blocked for more than 100 ticks. Crew maximum remained 10 for Corey.

## Backup and recovery

Before promotion, verified source recovery against the retained full September 5 backup and copied `moon-v2-traffic-tunnels-20260907T120120Z.zip` to `/media/corey/Expansion/backups/moon-foundry/`. SHA-256: `cfb73ee8bec8744b3f4d873d96f705fdef5386fe524efd333168100d17faca1e`.

The final follow-up archive adds operator docs, all upgrade/regroup save copies, maintenance scripts, publication receipts and the road/hub proposal. Its final path and hash are in `/home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json`. This incremental ZIP depends on `moon-foundry-full-20260905T224110Z.zip`, SHA-256 `b6e1d5208bda8689a8d5f2d88f6df0d5be8c787d634e50937b6090f271302b5f`. Both the Git restore and every ZIP manifest entry are verified. Keep both archives private.

Fresh VPS backups reside under `/var/backups/moon-astra-v2/`: `before-20260907-b00ff861b7db-moon-astra-v2`, its staging counterpart, and `before-corey-regroup-20260907`. Evidence includes their hashes and exact-restore receipts. Normal hourly V2 backups remain enabled.

Previous runtime target: `releases/20260906-ba847ffc1f23`; prior website revision: `8bdd710b3b96fe635efd253867bf61e3db658068`. For application rollback, retain the current live database and follow the runbook's single-service backup/switch/check procedure. Old code lacks the new transport/board behavior; inspect active `tunnelRide` records before considering that rollback, and prefer fixing forward with occupied tunnels. Never restore an older save just to undo an application release. Website recovery must use a reviewed full-site Git build preserving subsequent unrelated work. No partial Netlify site upload. Do not rerun the one-time regroup helper.
