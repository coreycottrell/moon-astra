# Current systems review — September 7, 2026

Scope: review recent Foundry systems and user-facing documentation, not a new gameplay release. Backend remains aa91824; the API disclosure patch aed4e09 is published in website34a4d7b. Notification fix dc55596 is active in the tower board cron wrapper. The V2 Guide environment now selects MiniMax-M3; staging then production were restarted with validated backups and retained player identities. Default model strings in this source branch also move to M3 for future deployments.

## Source and behavior reviewed

| Area | Source of truth | Documentation result |
| --- | --- | --- |
| Costs, recipes, research, project rewards | catalog.js, industry.js, commands.js | Explicit current rates, supervision, power/cooling and shared-project bills |
| Physical construction and orders | construction.js, build-orders.js, commands.js | Accepted vs commissioned, paid work, finite/repeating orders and nonadaptive templates |
| Freight and crew | logistics.js, machine-status.js, panel.js | Available vs reserved vs aboard; Update logistics is a saved checkbox, not an optimizer |
| Tunnels and depots | corridors.js, lift-network.js, lift-transit.js, corridor-panel.js | Independent Start, bore inventory, lift installation, six connections vs two loading positions |
| API and access | world-server.mjs, commands.js | Owner-only infrastructure/programming, delegation limits, preview/idempotency and audit |
| Guide | guide.mjs, guide-context.mjs, actual live request | M3 configured and response received; read-only snapshot adviser, no learning tools |
| Standalone learning | moon-learning-engine lib/mind-engine and release evidence | 16 checks, final M3 4/4 and 28 facts; synthetic evaluated memory, no live integration |
| Notifications and board | tmux-board-alert.mjs, active poll.sh, reviewed.json | Wrapped prompt matching, three attempts 3s apart, meaningful Dev notes and current review |
| Colony organs and federation corners | canonical Moon ideas folder | Proposal page only; no new commands, government or expedition gameplay |

Paths in the first five rows are under src/foundry unless named as server modules. Exact public reference: /moon-astra-v2/agent-manual.html . The generated Markdown download is rebuilt from the same manual source.

## Confirmed limitations

- Entrance waiters can reserve destination loading bays too early, producing circular lift/depot waiting. The copied-world one-line experiment is not deployed and is not a completed traffic release.
- M3 live Guide connection test returned prose that double-subtracted reserved cargo from already-available metal. This establishes a real accounting advice failure, even though the provider request succeeded. Typed engine verification is not wired into this freeform Guide.
- Tunnel ledger EXCAVATING identifies a phase; inspect the assigned bore for a local feedstock/power/mind blocker.
- Existing group build orders do not reserve whole-colony geometry, launch daughter settlements or adapt to terrain.
- Higher tunnel tiers still have finite capacity and one elevator per terminus. Upgrade admission requires a clear route.
- GPU/desktop instability remains unresolved by this work; no browser/GPU test was used.

## Checks and publication

Existing Guide tests: three pass, including default M3 request, ownership, no world writes, generic provider errors, durable allowances and unavailable provider handling. No extra engine trials were needed; the prior preserved evidence supplies the standalone results.

Document checks use a DOM emulator, not a rendering browser: four HTML pages, 148 local asset/navigation links, 56 fragment targets, unique IDs, viewport metadata and four illustrative phases pass. Publication receipt: /home/corey/moon-deployments/federation-docs-20260907/ . Use its final receipt for actual published hashes/status.

Canonical proposal: /home/corey/projects/moon-civilization/ideas/federation-corners-and-colony-organs.md . Builder: docs/moon-whitepaper-v2/federation-corners in that same shared project. The whitepaper research fragment updates both the canonical parent template and the isolated website copy.
