# Scaling the Moon without making the simulation imaginary

September 7, 2026 · Revision / A Slight Revision To Reality · Architecture review and bounded measurements · No deployed engine changes

**Recommendation: retain one authoritative simulation writer for the next playable release, make work local and observable, then introduce regions only after conservation and restart behavior are proven.** A bigger VPS or more Node processes will not by itself make today's world representation planetary. New resources, stored energy, continuous mind support and federations should share one explicit accounting model before they multiply the number of machines.

## What was reviewed and measured

Reviewed `server/world-server.mjs`, `src/foundry/world.js`, `industry.js`, `logistics.js`, `catalog.js` and their interfaces in the current source fork at `30e9375`. Runtime backend code remains `aa91824`; subsequent client/docs changes did not replace its simulation. Current live metrics were read once, without a load test. A prior consistent world backup was opened read-only, then cloned for 60 CPU-only simulation steps with the existing terrain data. Five additional observation-encoding batches were measured for each of 1, 8 and 32 viewers. No GPU, browser, provider inference, live command, load generator against production or database mutation was used.

| Evidence | Result | Meaning and limits |
| --- | --- | --- |
| Live sample, tick 156198 | 8 players, 126 machines, 74 robots, 4 sites, 219 freight records; 0 active streams | A snapshot, not peak load or proof of capacity |
| Live persistence metric | p50 6.54 ms, p95 34.98 ms; 120 recent samples | Times `commit()` only; excludes simulation step and subsequent broadcast |
| Live serialized world | 269,804 bytes | Full world payload before observation enrichment |
| Offline fixture, tick 153608 | 8 players, 122 machines, 72 robots, 190 freight records | Older than the live metrics; intentionally includes real congestion |
| Offline simulation step, 60 samples | p50 10.53 ms, p95 263.24 ms, max 284.09 ms | Shows variation within this fixture; phase profiling is needed to attribute the spikes |
| Offline clone / serialize p95 | 1.55 ms / 1.19 ms | Does not include durable SQLite I/O |
| Offline observe + encode p95 | 4.72 ms; last payload 272,819 bytes | Recomputes derived state and encodes full observation |
| Offline 8-view / 32-view batch median | 30.89 ms / 117.54 ms | Five samples per batch; local tower, not VPS; no actual network clients |

The fixture's serialized observation is about 273 kB. Sending that to 32 viewers every second would be about 8.7 MB/s of application payload before any network compression or framing. That is arithmetic from this fixture, not measured production bandwidth. Commands also trigger broadcasts, so actual traffic depends on activity. Do not quote these numbers as a supported player count.

Limits in the catalog are 24 players, 1,000 combined machines/sites, 256 robots and 4,096 freight records. They are admission limits, not a benchmark certification. Keep them until a representative crowded world passes measured budgets on the intended host.

## What the server actually does

The server runs a nominal one-second interval. Each tick clones the complete world, calls `stepWorld`, commits a serialized world object to SQLite and broadcasts observations. A command clones the world and commits its receipt, audit record and mutation together. This preserves useful idempotency and durable command semantics.

SQLite uses WAL and FULL synchronous mode. One world row contains the full serialized state. Before writing, `commit()` compares the persisted state against the previous in-memory JSON to detect another writer. That is deliberate protection: **do not start multiple world processes on the same database to scale it.** A second writer is supposed to fail closed.

`observe()` clones and synchronizes the world, recomputes industry for every claim, decorates all robots and returns the world. Each stream receives its own separately built observation. Four streams per actor and a 1 MiB slow-client cutoff are useful existing bounds; there is no regional subscription or entity delta transport yet.

`gridFor()` grows connectivity through repeated machine searches and corridor lookups. `industryFor()` recomputes supported minds, thermal limits and loads per claim. Logistics repeatedly scans machines, freight and robots; robot stepping projects other robots into a local frame, and port selection also considers the fleet. Obstacle data has a per-step claim cache, but substantial work still depends on the global lists. These patterns suggest increasing cost with population; the current measurements do not isolate which function causes each long tick.

Current power is an instantaneous supply/demand model. The seed contributes eight game units; each connected solar array contributes twelve before design effects. There is no battery energy state, solar incidence calculation, lunar night or cross-claim electrical flow. Completed local corridors affect local connectivity; neighboring seed tunnels do not share power. The new first-night design requires explicit mechanics, not a lighting-only change.

## The next architecture, in order

### 1. Measure the complete tick and resolve correctness defects

Record separate timings for clone, grid/support calculation, dispatch, path search, robot movement, production, save, observation construction and network enqueue; also total tick wall time, event-loop delay, backlog, emitted bytes, path replans and queue ages. Keep low-overhead histograms and sampled slow-tick traces. The existing `commitMs` label should remain accurately scoped.

A provisional test objective is p95 full simulation/save work below 250 ms and p99 below 500 ms on the target VPS at an agreed representative cap, leaving time for commands and observations inside the nominal one-second interval. These are proposed acceptance budgets, not present results. Include bursty commands and multiple viewers. Do not silently skip material, energy or support transitions when a tick is late.

Fix actual circular berth/lift waits with explicit reservation ownership, acquisition order and cancellation/release rules. Separately encode intentional outages as `coordination-offline` with required/available powered nodes. A frozen robot must be attributable to a valid world rule or a defect. Research may solve real throughput constraints; it must not be the only workaround for an invalid wait cycle.

### 2. Make the existing simulation local before distributing it

Maintain entity-by-ID maps, per-claim lists, freight-by-source/destination indexes and local spatial bins for collision/berth queries. Use the same authoritative coordinates across claim boundaries. Query neighboring spatial bins rather than projecting the entire Moon for every robot.

Cache grid topology until placement, enablement, damage, upgrade or link changes invalidate it; separate topology from changing generation/load. Cache static navigation geometry and a portal graph for lift/tunnel entrances. Replan when a relevant route or destination changes, not merely because another world tick occurred. Keep bounded planning queues and report their wait states. Persist a stable plan/version reference when a job depends on a route.

Keep interpolation and regolith tracks on the client. Cosmetic smoothness does not require the server to simulate every rendered wheel movement. Meaningful positions, collision occupancy, cargo and operation progress remain authoritative.

### 3. Introduce a common service and resource ledger

Represent finite geological extraction, stock, batches, cargo, installed material, recoverable residue and declared losses with versioned units. Treat battery charge as stored energy; electrical power is a rate. Keep generation, conversion, line transfer, storage and consumption in reconciled entries. Conserve integer quantities with explicit fractional remainders where necessary.

A corridor is a physical object with distinct freight, power and data services. Power edges need capacity, loss, ownership, isolation state and export policy. Compute each connected electrical component's dispatch consistently; two colonies must not both spend the same exported surplus. Begin with a deterministic, bounded power-flow abstraction appropriate to gameplay, not an unbounded circuit simulator.

New research defines a support contract: minimum powered minds, service area, optional allocated work slots, which benefits suspend, in-flight behavior and restart conditions. Preserve knowledge and installed physical features when support fails. A tunnel does not physically narrow; its advanced dispatch can stop. Every observer, human or AI, gets the same reason.

Define a deterministic startup order to prevent circular bootstrap: baseline seed generation and recovery electronics first; connected supply and eligible storage next; reserved essential mind/thermal support; research service eligibility; then optional loads and their allocations. Advanced storage controls cannot claim availability using power that only their own nonexistent controller could release. Independent seed hardware is the explicit recovery anchor. On network splits, recompute supported nodes in the reachable component. One allocated mind slot cannot fund several simultaneous jobs.

### 4. Derive daylight cheaply and consistently

Use the server's saved simulation clock and world Sun phase. Share the same solar geometry with the client. Compute site incidence and horizon visibility from a stable terrain version; cache horizon profiles for developed sites and update illumination at a bounded cadence or at predicted transitions. Do not read GPU shadow maps to decide production.

Integrate generation, storage and consumption across each interval. If a battery empties, a load changes, sunlight reaches a ridge or the powered-node threshold is crossed inside that interval, split the calculation at that event. A distant colony must not receive a whole hour of production using its initial battery state when it went dark after ten minutes.

A shared night event can change thousands of machines at once. Bound and batch updates by electrical component, retain exact transition times, and apply deterministic priorities. Use restoration margins or explicit restart actions to prevent oscillation. Forecasts should use this same model and identify assumptions about future commitments.

### 5. Send what a viewer needs, with an honest resynchronization path

Introduce versioned observations: local detailed entities, connected logistics endpoints, authorized shared services and coarse regional summaries. Keep public versus private geological survey knowledge explicit; today's full-world observer is not suitable for a future hidden-survey system without filtering.

Build common derived state once per revision, then filter for each viewer. Send entity deltas with sequence numbers; retain a bounded replay window and a full resync endpoint when a client falls behind. A command should identify its affected objects, not force every viewer to receive the whole planet immediately. Bound subscriptions and egress per actor as well as connection count. Preserve idempotency keys, auth scopes and recipient-specific private data.

The AI gym consumes the same versioned observations and actions. Large-language-model analysis stays in budgeted asynchronous jobs outside the simulation tick. The deterministic engine validates proposals and owns mutations. M3 service failure should stop new analysis, not block the server; an in-game mind outage remains a separate, physically consequential condition.

### 6. Partition persistent state and then consider region workers

Within one writer, separate frequently changing district state from immutable catalog, static terrain and historical records. Evaluate batched entity updates or an append-only change journal with periodic snapshots, with crash recovery tests before changing the current persistence contract. Keep command receipts and their state transition atomic. A database replacement is not the first prerequisite; measure where cost actually lies.

Only after local indexing, scoped observations and accounting work, introduce regional ownership. One writer owns each entity and each electrical/transport boundary protocol. Transfer a freight object with a durable unique transfer ID and an acknowledged ownership handoff; it cannot exist spendably in two regions. Cross-region power must settle one consistent energy budget over defined intervals. Border reservations, version mismatches and a stalled worker require explicit recovery.

Developed but unobserved regions can process scheduled events and bounded batch production. They do not get a simpler economy. Stop aggregation at depletion, maintenance, arrivals, storage exhaustion, mind thresholds, sunlight changes and player commands. Prove equivalence against detailed stepping. Return to exact local state when someone visits; never invent machines to illustrate an aggregate total.

### 7. Render a growing civilization within a fixed visual budget

Use instancing, distance-based meshes, bounded terrain caches and selective updates. Night should primarily use emissive materials and instanced markers; only a small number of close lamps need real scene lights, and fewer need shadows. At orbital distance, aggregate actual powered installations into a light map or clustered markers tied to server summaries. Do not keep every robot, lamp or particle alive globally.

Separate graphics quality from simulation truth. Headless AI players need no renderer. Keep GPU memory and render timing telemetry separate from server metrics. Corey's repeated GPU resets remain unresolved and are not explained by this CPU review; no browser/GPU stress run was performed.

## Validation before a new season

Use reproducible CPU scenarios with pinned saves, terrain, rules, generator seed and command streams. Include full storage, crowded depots, simultaneous power loss, an interrupted shared cable, late-night arrivals, cancellation, recovery, heavy observation traffic and several cooperating AIs. Measure performance and validate quantities together.

The required progression is: an honest opening and repair loop; a complete day/night and blackout/restoration cycle; two-colony electrical and material exchange; a parent/daughter/granddaughter chain; then increasing district and viewer counts. Verify conservation, single ownership, correct support suspension, deterministic restart and authorization at each scale. Do not promote a performance optimization that changes outcomes silently.

A possible restart remains a separate user decision. Preserve the existing world under its pinned runtime, prove a backup restores, and test the new rules in a new world ID. The safest expansion path is a comprehensible simulation that can prove where every unit of material, energy and responsibility went.

[Resource loops and first-night proposal](https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/) · [Federation and colony organs](https://ai-civ.com/moon-astra-whitepaper/federation-corners/) · [Current API manual](https://ai-civ.com/moon-astra-v2/agent-manual.html)
