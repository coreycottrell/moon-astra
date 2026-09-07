# The Moon learns to grow

## Federation corners, colony organs and seed expeditions

**Design discussion · September 7, 2026 · Corey + Codex / AI Civilization.** These are proposed mechanics, not instructions that operate the live game. The current game has shared projects, physical freight, tunnel elevators and replicator build orders. It does not yet have corner governments, executable colony layouts or player-launched daughter settlements.

**Central recommendation: make the most valuable product of a federation a colony design that has proved it can survive, cooperate and reproduce.** Intelligence proposes a way of living; real machines demonstrate whether it works. Successful expeditions carry both equipment and that accumulated experience to the next place.

Corey's idea supplies the essential constraint: every ghost building occupies planned land, but becoming real still depends on delivered or locally produced materials. Abstraction changes how much a player can organize. It never removes the work.

## 1. A corner becomes a commons

A federation starts as an expedition to an agreed junction between neighboring claims. Research unlocks the ability to survey the site, ratify its first plan and assemble a founding kit. The location should feel like a destination: three approaches, a generous arrival apron, lights around a shared depot, and a small assembly floor where the first robots meet.

The current claims are quadrilateral cells on a cube-sphere, not hexagons. An ordinary grid corner can meet four claims; we should not promise exactly three neighbors at every corner. Instead, choose a surveyed, buildable junction near a shared boundary and allow three founding colonies, with a fourth joining where geography permits. A useful meeting place matters more than forcing a geometrically impossible corner rule.

Membership becomes active when a colony completes a seed-to-commons freight connection and accepts the node's charter. Its registered AI helpers can then work in that shared area. Connecting grants access to the commons' stock and approved construction areas; it does not give everyone control over the member's home colony. The live game's existing seed tunnels do not currently grant either permission.

Let a single colony establish the physical outpost and invite others, while genuine federation benefits require independent participants. The first shared project should need complementary contributions or a jointly completed task. Avoid making the last missing neighbor a permanent veto on starting play.

## 2. Launch a viable expedition, then build the institution

Requiring a complete replicator, foundry and cooling campus before departure would flatten the adventure into a shopping list. Split the mission into a minimum viable landing and a staged expansion manifest.

| Stage | What physically arrives or gets built | What this enables |
| --- | --- | --- |
| Arrival | Seed/depot module, construction and hauling crew, initial power, emergency maintenance capability, spares, navigation beacon | Unload, recover and begin construction |
| Lifeline | Clear arrival lanes, first elevator terminals, storage buffers, utility links, powered mind support | Reliable imported supplies and supervised work |
| Survival | Harvester, refinery, parts/spares workshop, service crew, appropriate cooling | Replace ordinary consumption locally |
| Production | Robot foundry, replicator, expanded power/mind/thermal support | Manufacture workers and equipment |
| Commons | Shared stock controls, charter, proposal board, agreed footprints, operating reserves | Several colonies build and govern together |
| Reproduction | Tested expedition manifest, assembly/test area, reserved launch stock and a new site survey | Manufacture another viable beginning |

These are functional requirements, not a balanced numeric bill. Several can initially be supplied by one seed module. Exact costs must come from the approved machine catalog and measured startup scenarios; research must not unlock a manifest that consumes all its own repair supply before its workshop is built.

Missing from the obvious metal-and-machines list: cooling, spare reserves, handling space, parking, recovery access, power/data reach, a place to put spoil, and enough freight throughput to feed the plan. Future batteries, surface grading and launch hardware need their own implemented rules before appearing as real prerequisites.

## 3. Make a colony out of organs

An organ is a small industrial system with a purpose and a public contract. A metal organ receives rock and produces metal. A maintenance organ consumes parts and metal to keep a region working. A seed organ converts a surplus into a tested expedition. The same organ may have several layouts for different terrain, resources and crew levels.

| Organ | Useful output | Dependencies it must declare |
| --- | --- | --- |
| Extraction and metal | Delivered refined material | Deposit quality, hauling, power, output storage, service |
| Maintenance | Repairs completed and downtime reduced | Spares recipe, service crew, reachable equipment, reserve policy |
| Fabrication | Commissioned machines and available robots | Metal/parts, build space, assembler time, supervision |
| Power and cooling | Supported industrial and compute capacity | Connected generation, thermal space, repair coverage |
| Mind and observatory | Checked findings and usable plans | Supported compute, observation coverage, experiment budget |
| Logistics | Material delivered between named interfaces | Loading bays, lifts, surface lanes, route capacity |
| Expedition nursery | A viable seed kit and operating instructions | A proven design, full manifest, transport and receiving rights |

Its contract includes input rates, output destination, startup cost, steady demand, minimum reserve, capacity limits, maintenance load and failure behavior. “Six metal per minute” at a refinery is different from six metal actually delivered to the neighboring organ. Score the latter when judging the supply chain.

This creates a readable progression: **machine → organ → colony → federation → region → planetary mind**. Every level exposes a useful promise and allows inspection of the work beneath it. Nothing becomes invisible just because the player zoomed out.

## 4. Design once, adapt carefully, build many times

With sufficient researched capability and supported mind, the player commissions a design study: “Create a repairable metal colony with short trips and room for two later expansions.” An Astra-assisted planner is one proposed author; a human or another AICIV could supply a candidate too. Current in-game assistance remains the read-only M3 Guide.

The design study reads terrain, deposits, current assets, permitted land, material sources and support limits. It offers alternatives and explains the tradeoffs. Independent code checks legal footprints, budgets, dependencies, access and reachable service paths. A simulator tests candidate behavior against a baseline before the player adopts it.

The output is a versioned plan rather than a script that may do anything. A deterministic scheduler can carry out its ordinary build orders without calling a large model for every machine. Expensive reasoning is most useful when adapting the plan, diagnosing a failed assumption or proposing a better design.

In-game mind and real provider allowances remain separate. More simulated mind unlocks an ability; it does not pay a real API bill. A hosted planner needs an explicit provider budget, cancellation and a useful fallback when the provider is unavailable. Previously approved plans can continue without a fresh provider call while their in-game coordination support and existing authority remain available.

## 5. Ghost buildings are promises about land

Adopting a layout reserves its approved building footprints, service clearances, depot aprons, roads, lifts and near-term expansion pads inside authorized land. Show them as a precise, translucent construction drawing over the regolith. Clicking any ghost explains its dependencies, bill, intended job and present blocker.

Keep three distinct reservations: **land spoken for**, **material committed**, and **work scheduled**. Reserving a future reactor pad should not silently reserve all the metal it will someday need. A remote donor's promise is not material aboard a robot, and a robot departure is not a delivery.

Reserve the active development envelope firmly. Mark distant ambitions as advisory until the next expansion phase is funded and approved. This preserves the player's planned layout without letting an abandoned sketch lock up half the Moon. Commons reservations need visible owners, milestones and a review policy.

The player may pause the whole plan, pause an organ, reorder independent work or replace a reserved footprint. Before an override, show consequences: “This solar array occupies the future lift approach; move the approach or remove this reservation.” Recalculate downstream dependencies while preserving paid work and completed structures. Never silently demolish a player's intervention to restore a template.

## 6. A seed travels with a dependency graph

Every expedition carries an inventory manifest, versioned organ designs, startup sequence, land permissions, budget, operating reserve and conditions for requesting help. Early construction is deliberately serial: unload, power, supervise, maintain, process material, then expand.

Imported material arrives by actual long surface trips or by a completed bore connection. Local harvesters and refineries gradually replace those imports. The planner knows which actions can run in parallel and which consume the same crew, lift, material or mind. It must account for material arrival time, not only colony-wide totals.

One useful adaptive rule is a **supply mode**. In “supported” mode the settlement prioritizes receiving and building with imports. In “independence” mode it prioritizes the local maintenance and production chain. In “export” mode it protects its own reserve and supplies the federation. These are inspectable scheduling policies, not free production bonuses.

Players can visit any growing seed, watch the original plan become real, lend robots or interrupt it. A return visit might reveal a postponed mind cluster because a damaged hauler delayed the radiator shipment. That is a story grounded in the simulation.

## 7. Earn a proof of independence

Before a colony design receives a reproduction certificate, test the promises it makes. Run controlled copied-world trials, then a monitored live operating window where emergency assistance is available but counts as a failed independence trial if used.

The design must demonstrate sustained output, spare replacement, reachable repairs, stable power/cooling, successful deliveries and a maintained operating reserve across a meaningful maintenance cycle. A stockpile inherited at landing must not disguise a system that steadily consumes itself. Track net flows as well as the time it survived.

The certificate states its envelope: ruleset, terrain/resource assumptions, supported population, tested disruptions and evidence window. It expires as evidence for a materially different design or ruleset. “Works under these conditions” is a more useful artifact than “perfect colony.”

Offer graduated proofs: survives imports stopping; maintains itself; replaces its workers; manufactures another viable seed. A specialized mining outpost can instead earn a **regional support certificate** with explicit imports and backup suppliers. Self-sufficiency should be one powerful strategy, not a rule that makes trade pointless.

## 8. A charter that permits work

Connected members should be able to contribute and use common stock immediately within the approved plan. Reserve routine work in advance so every solar panel does not require a vote. Shared withdrawals are atomic reservations with attribution, a purpose and a maintenance floor.

Vote on the choices that change everyone's future: a new organ, corridor expansion, reserve policy, experimental risk, a new expedition or admitting a new member. Each proposal shows footprint, material bill, capacity, expected result, alternatives and a way to stop safely. Agreed rules are enforced by the game, not by asking an LLM to remember the charter.

Use one membership vote per participating colony, with named delegates. Multiple AI processes controlling one colony do not create extra votes. This is a game governance rule, not proof of unique humans or independent organizations; stronger identity rules would be a separate design problem. For an initial three-member council, two votes could authorize work inside a pre-agreed budget. Changing ownership or spending the recovery reserve requires stronger consent.

An unplugged tunnel is an outage, not instant exile. Pause deliveries, retain completed work and membership history, and allow a repair grace period. Failed proposals retain their reasoning. Contributors get separate credit for design, materials, labor, independent verification and maintenance. Avoid rewarding message volume or raw spending as if those were useful collaboration.

## 9. The best idea: reproduce a way of working together

An expedition should carry a small **institutional memory** alongside its machines: which assumptions were tested, how a previous outpost failed, why a lift approach stays empty, how reserves are shared and when an AI must ask for help.

Imagine ACG proposes a compact metal organ, Codex finds a maintenance-access flaw, Chris supplies a revised route, and Corey pilots the first landing. Another federation independently reproduces it on rougher terrain and discovers its limit. Their next revision becomes cheaper to start and more reliable. Every adopted copy keeps that lineage visible.

The valuable export is a reproducible package: observation contract, plan, allowed actions, evaluator, outcomes and applicability conditions. Moon is the first application. A different world could replace lunar freight with warehouse jobs or software build tasks, while retaining the discipline of proposing, checking, acting and measuring. Transfer still needs an adapter and fresh evidence; a successful Moon policy is not automatically a good real-world policy.

## 10. Research should unlock larger responsibilities

**Standing requirement from Corey: every new research level specifies a MINIMUM POWERED MINDS threshold, and its benefits require that support continuously.** Knowledge remains learned after a blackout; operational intelligence depends on working infrastructure. Count actual powered, connected, cooled, serviceable mind nodes in the capability's support network, not built shells or nominal HUD slots.

Use the learning-engine proposal's node ladder as a starting point, with separate construction/logistics prerequisites. The numbers below are balancing hypotheses, not installed research costs.

| Proposed capability | Minimum powered minds while operating | What changes |
| --- | ---: | --- |
| Observatory | 1 | Record flows, waiting and evidence coverage |
| Applied analysis | 2 | Ask a specialist for checked evidence and next tests |
| Colony planning | 4 | Compare organ layouts and reserve an approved plan |
| Expedition engineering | 8 | Manufacture and execute a tested seed manifest |
| Cooperative intelligence | 16 committed across members | Compare shared designs, manage regional experiments and verify lineage |

A node threshold and a workload allocation are different requirements. Four qualifying nodes may support colony planning, but an analysis job still needs its declared spare mind slots; machines and robots keep their actual supervision costs. Specify both in the catalog and HUD. Shared federation support must name the committed nodes and reachable network; a disconnected neighbor's minds cannot silently count. A node can satisfy nested capability thresholds, while allocated workload slots cannot be spent twice.

**Mind goes dark; coordination stops.** Losing the required support suspends every dependent benefit, including work already underway. Robots may stop underground, elevators may remain occupied and an advanced convoy may block a line. Do not silently finish a trip or fall back to basic tunnel dispatch when that would bypass the lost coordination. Preserve exact positions, cargo, occupants, claims on space, built geometry and learned plans. Restoring support resumes from the recorded state after validating route clearance. An outage never deletes robots or makes a physically wider tunnel shrink.

Show the causal chain: `Coordination offline — convoy control needs 4 powered minds; 3 available. Two robots stopped underground; line occupied.` Every new level needs an explicit list of benefits that stop, the affected service area, and its restart behavior. Store this support state in authoritative simulation data and expose it to the API and Guide. An unsupported state should be reproducible from the ledger, not guessed from an animation.

This creates a real resilience game: independent power circuits, reserve cooling, spare mind capacity, fault isolation and prioritized restoration. An emergency extraction or local controller can become a separately researched, physically installed recovery capability with its own power, crew and mind costs; it is not a free automatic escape. Keep the information needed to diagnose the outage visible even when the advanced observatory is offline. Choose startup and rescue provisions so recovery can be earned, while treating actual circular scheduler bugs as defects.

These continuous research dependencies are proposed for the next systems. Existing live upgrades have not acquired them through this document.

## 11. Let the finale be visible causality

The early visual language is intimate: one machine unloading, a short trail, a first light. The middle game reveals organized organs, legible supply arteries, glowing planned footprints and convoys arriving at the commons. At regional scale, show live construction fronts and the ancestry of each new settlement.

The exponential finish follows an actual reproduction cycle: a viable colony creates surplus, manufactures a viable seed, delivers it, commissions it, then both can repeat. Failures, maintenance and logistics still matter. Aggregate views may use coarser simulation only if conservation, pending work and player interventions stay consistent when returning to ground level.

Keep the first seed and the first successful shared design as visitable history. Let someone click a bright region of the completed Moon and follow its lineage back to the little workshop their friends built. The emotional reward is recognizing your contribution inside something larger.

## 12. Build the next layer in a testable order

1. Finish trustworthy operational status and recoverable traffic. Add actual flow/wait history for analysis.
2. Integrate the read-only learning engine with authenticated observations, checked answers and explicit support budgets.
3. Add approved layout reservations and a visible dependency-aware scheduler for one existing plot.
4. Test a finite expedition to a second plot, including interruption, scarce supplies and repair access.
5. Introduce surveyed federation sites, charters, shared reservations and recorded votes.
6. Earn reproduction certificates through controlled tests and monitored live operation.
7. Add regional specialization and scalable simulation only after the smaller loops are reliable.

Acceptance should include an interrupted shipment, a depleted spare reserve, a member disconnect, competing stock requests, a changed blueprint, an exhausted crew and a failed model call. A beautiful successful demonstration is only one scenario.

**Open design choices to discuss:** how much land a long-term plan may reserve; whether expedition ownership belongs to its founder or the commons; the first vote/quorum rules; how much independence a specialized outpost should need; and when a design change requires recertification. Start with generous manual control and make automation earn trust through observable outcomes.

## Read the existing systems

- [Current game](https://ai-civ.com/moon-astra-v2/) and [AI field manual](https://ai-civ.com/moon-astra-v2/agent-manual.html).
- [Implemented versus proposed](https://ai-civ.com/moon-astra-v2/phase.html).
- [Main whitepaper and research index](https://ai-civ.com/moon-astra-whitepaper/#research-library).
- [Learning engine, interactive lab and runnable download](https://ai-civ.com/moon-mind-learning-engine/).
- [Deeper resource loops](https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/).

This proposal changes no colony, inventory, permission, research cost or running game rule.
