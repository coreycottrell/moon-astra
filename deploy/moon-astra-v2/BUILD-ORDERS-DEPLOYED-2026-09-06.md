# Ordered construction deployed — 2026-09-06

Live: https://ai-civ.com/moon-astra-v2/ . Refresh the client, then Settlement → Industry → Replicator → Create build order.

Runtime/source: `ba847ffc1f23f0cd253158aa24cb19e894ba9b08` in immutable release `20260906-ba847ffc1f23` on both V2 services. Active fork `/home/corey/projects/moon-build-programs`, branch `development/build-programs`, pushed to coreycottrell/moon-astra. Website main `8bdd710b3b96fe635efd253867bf61e3db658068`; full-site Git production deploy `6a9d8d5002dad00008088bb5`, published 2026-09-06T15:58:28.428Z. Preview deploy 6a9d8c9790ec8b9e5e9bca5e verified the same site commit first.

## What changed

Finite counted machine sequences are available with the replicator. The order advances only when each actual construction site becomes a commissioned machine. The editor supports quantities, reorder/remove, saved drafts across polling, a per-cycle material bill, full-load support estimates and Stop future builds. A cancelled site stops its order; paid batches and existing sites survive stopping. Waiting for construction releases the replicator's four mind slots. Ordered daughter replicators start off.

Coordinated construction research (600 work; factory-plans + service-loop and a commissioned replicator) unlocks repeat and Production cell / Service cell / Mind cluster templates. Individual output research still applies. These are fixed sequences; they do not adaptively insert infrastructure. Estimates assume new grid connections and all enabled connected industry at full load, include current supervised crew, and warn about mind/power/cooling. Freight throughput and later construction remain uncertain.

Robot balance is unchanged: 0.25 mind per supervised robot, including idle crew in the active allowance. Four starting crew use the lander's one slot. The Crew panel now states this explicitly and the API catalog includes `mind.costPerRobot`.

`replicator.order` and `replicator.stop` are owner-only, previewable and idempotent. Full order state is observed and included in guide context. Existing delegated scopes and bounded player command allowance were not expanded. Legacy single-output programs are unchanged; no developer commands altered a live colony.

## Verification and preservation

81 automated checks pass, including physical commissioning, costs/counts, stop, cancellation, repeat research, ownership, exact serialization and SQLite/API retry recovery. Eight existing browser scenarios passed; the new editor scenario passed after fixing a quantity-change rerender that swallowed Add step. A later test-only scroll retry adjustment handled ordinary polling. Desktop/mobile screenshots and all reports are under `/home/corey/moon-deployments/build-orders-20260906T154240Z`. Compiled local hosting smoke, both hosted UIs and all 42 public V2 files passed; hosted checks issued zero game writes.

Production restored its exact save at tick 54295 with four players; staging tick 54056 with two. Fresh online/stopped snapshots were taken and exact restoration under the new runtime was proved before each switch. All copies passed off-host SHA-256 and SQLite integrity checks. Original Moon service PIDs were preserved. The homepage, /moon-astra/, review, parent whitepaper and deeper-resource addendum remained byte-identical. Existing tower previews, provider environment and bounded player watcher were not reconfigured.

## Recovery

Previous runtime: `releases/20260906-d5d66e770d44`. Application rollback must preserve the current database. Ordered programs keep legacy mode off, so a rollback suspends new order automation instead of repeating a finite output indefinitely; restore this release to resume it. Do not reset the live world or restore an older save during ordinary rollback.

Private VPS copies: `/var/backups/moon-astra-v2/before-20260906-ba847ffc1f23-moon-astra-v2` and the corresponding `-staging` directory. Copies live in the tower evidence folder. Production stopped.sqlite SHA-256 `db604ad9ca3f8d8a48cb896b262908ddb71dda137012a7da33b7083a57da952c`; staging stopped.sqlite `700b9c4367fd1f745967e1993c8eb59dccc28027e01bdd65d1614f4e39e9432f`.

Before deployment, source ba847ff recovered exactly against the full September 5 backup bundle. Expansion recovery ZIP `moon-v2-build-orders-20260906T155033Z.zip`, SHA-256 `6e92819523364f7411ef0bccd322ac97cb317f879129e92d514eec4614b1e8d7`, includes source and both fresh online saves. The final follow-up also includes this record and stopped snapshots; consult `/home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json` and `/home/corey/moon-deployments/V2-LATEST.json` for the completed copy's exact path/hash. All incremental ZIPs depend on `moon-foundry-full-20260905T224110Z.zip`; retain it. The MiniMax key is installed separately.

## Publication gate

All four changed public HTML pages passed the existing privacy gate with zero hits. A preliminary scan over-applied the prose rules to compiled JavaScript and flagged existing byte tables/probes, authentication interpolation/timer code and the HARVESTER label. Reviewed against previously deployed code and the hook's explicit html/json/xml/txt/md scope. No gate, baseline, hook or bypass flag was changed. The actual isolated worktree was checked, preserving ACG's dirty canonical website checkout.
