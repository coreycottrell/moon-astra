# Moon Mind: a reusable learning engine
Version 1 · September 7, 2026 · Corey + Codex / AI Civilization

## The recommendation
Make intelligence change what players can do, then let factories reproduce those capabilities across the Moon. Make experience change which capabilities they choose to reproduce.

Moon Mind separates six activities: observe, propose, verify, experiment, measure and remember. A world adapter provides facts and bounded choices. A provider proposes a candidate. Independent code checks its claims. A trusted evaluator measures an intervention. Memory retains the conditions and outcome, including failure.

This release supplies a working standalone engine, two read-only Moon advisers, an evaluated transport gym, a CLI, and an interactive report. It does not install research, allocate the running colony's mind, or execute game construction. Those are explicit next integrations. The remote provider is MiniMax-M3 only.

## What “learning” means here
The engine does not update model weights. It accumulates evaluated experience and retrieves compatible outcomes for later decisions. A deterministic decision rule can use that memory; a model can also consult it. This makes the learning mechanism inspectable.

An episode records the domain, ruleset, skill version, evaluator version, exact scenario, random seed, intervention, baseline, result and score difference. Memory is scoped by owner and conditions. Negative outcomes remain available. An identical experiment is not counted twice merely because it was requested by a different job. Restarting the process preserves the evidence.

This is intentionally narrower than discovering universally optimal policies. The current memory requires matching scenario conditions. It does not infer that a successful route in one terrain will work elsewhere. Future similarity retrieval needs explicit applicability conditions, uncertainty and revalidation.

## Core contract
An observation is a detached, canonically hashed JSON snapshot. It carries an owner, domain, ruleset, tick, observation time, typed facts, coverage and named unknowns. Caller-supplied identifiers cannot replace its calculated identity.

A registered skill defines its identifier/version, accepted domains, required capability level, objective and eligible candidates. Each candidate lists the facts required to support its recommendation. A skill may also register a trusted evaluator and a memory context key.

Provider responses must match the current protocol, observation and skill, select an eligible candidate or explicitly abstain, and copy exact typed facts. Unsupported entity IDs, strings in place of numbers or arrays, invented unknowns, missing required claims and extra fields fail verification. The function schema enumerates available candidates and the types/values of supplied facts. Code independently validates the result even when a schema was sent.

The M3 adapter transports heterogeneous values in an explicit valueJson string and decodes each exactly once before typed verification. A quoted number stays a string and fails a numeric fact check; empty or malformed JSON fails decoding. This solves a measured provider serialization issue without accepting implicit coercion.

A verified answer means its claims match the supplied evidence. It does not establish completeness, causal truth or intervention quality. Display summaries come from trusted labels and checked values; freeform model explanations are not promoted as authoritative facts.

## Persistent jobs and budgets
SQLite stores jobs, observations, provider attempts, episodes, measurement links, support and audit events. Defaults:
- Two analyses globally; one per owner.
- Twelve analysis attempts per owner and forty globally per UTC day.
- A 75-second provider deadline and a 2,048 completion-token request limit.
- Snapshots at most fifteen minutes old, with at most one minute of future-clock tolerance.
- At most 300 retained observations per owner; latest 40 matching memories per request.
- Bounded observation and response payloads.

Attempts count when analysis begins, including rejected answers, failures and deterministic analyses. These are call allowances, not dollar budgets or a guarantee of zero provider billing after cancellation. Providers receive an abort signal; a provider that ignores it still cannot commit a late result.

A database transaction reserves capacity before a call. Leases let another worker recover abandoned work as interrupted. Recovery never silently retries a paid provider call. Cancellation and loss of support invalidate the lease and release the reservation. Concurrent engine instances share the database budget.

The lifecycle is queued -> analyzing -> analyzed -> complete. A read-only adviser normally stops at analyzed. Only a registered evaluator completes an experiment. Other terminal states are rejected, failed, interrupted and cancelled. Admission failures such as unavailable capacity leave a queued request available for a deliberate later run.

This is a library, not an authenticated network service. Its host must bind owner IDs to real identities, supply authoritative research/capacity, schedule workers, protect the database and provide retention/backup policy. Keeping an observation in a ring buffer does not itself instrument route history; the world must supply actual events.

## The implemented Moon advisers
Traffic advice distinguishes the crew cap from free mind and recognizes that one snapshot cannot prove a traffic jam. Its recommendations are to inspect the actual crew limit, inspect mind support where applicable, or gather route waiting history.

Resource advice separates available metal, reserved cargo, rock packets, local shortages and missing historical accounting. The refinery recipe is copied from the authoritative context; metal is not invented as a catalyst. The adapter marks truncated entity lists and incomplete consumption history explicitly.

These advisers can identify a useful next check. They cannot move robots, construct lifts, change programs or spend resources. They do not have a live causal evaluator. A future in-game display should show the observation tick, exact evidence, scope limits and whether the result was accepted or rejected.

## A transport gym that learns from measured outcomes
The shared simulator is a deterministic event queue. It runs in Node and in the report browser. Each worker serves a task, travels a modeled round trip and becomes available again. Arrivals use a fixed seeded random generator with limited timing variation.

Candidates:
- Keep the layout: zero intervention cost.
- Add two workers: 20 cost units.
- Grade a surface road: 40 cost units; faster travel.
- Add an exclusive lift line: 55 cost units; faster tunnel travel plus transfer overhead, but the line is occupied by one task for its full modeled round trip.

Every candidate uses the same arrivals and horizon as its baseline. Score equals completed deliveries per minute minus 0.002 times intervention cost. Completed and unfinished jobs are reported together. Mean and 95th-percentile waits describe completed jobs only; a low wait among the few tasks that finish must not conceal unfinished work.

Default conditions are four workers, 220 metres one way, one task about every ten seconds, a 600-second horizon, budget 60 and seed 7. Sixty requests arrive. The unchanged layout completes four, additional crew six, a road eight and the exclusive lift two. Relative scores are 0, +0.16, +0.32 and -0.31. Measured memory chooses the road after comparing these cases. Persistence, duplicate-evidence handling and another seed are tested.

This result is not a Moon road benchmark. The model does not include terrain, collisions, route choice, maintenance, current tunnel rules or live game balance. Its purpose is to demonstrate controlled comparison and retained learning. Relabeling the same adapter as a warehouse demonstrates reuse of an abstract problem, not validated industrial performance.

The browser keeps at most 160 local candidate outcomes. Users can clear them. Storage failure falls back to session memory. No credentials, provider call or game command are available to the page.

## Mind and research: the proposed game progression
The engine implements capability gates, but the following work costs and in-game unlocks remain proposed.

| Level | Capability | Supported nodes | Mind per active job | Research work |
| --- | --- | ---: | ---: | ---: |
| 0 | Landing tools | 0 | 0 | 0 |
| 1 | Colony observatory | 1 | 0.5 | 300 |
| 2 | Applied analysis | 2 | 1 | 900 |
| 3 | Comparative planning | 4 | 2 | 2,400 |
| 4 | Experimental engineering | 8 | 4 | 6,000 |
| 5 | Cooperative intelligence | 16 | 8 | 15,000 |

Research unlocks a capability. Supported nodes and spare mind make it operable. Built but unsupported nodes do not count. The game should reserve operating capacity for its machinery and robots first, then offer the remainder to learning. Provider allowances stay separate from this simulated mind budget.

Suggested progression:
1. Instrument a producer-to-depot route and record delivery age, queue delay, carrying time and blocked time.
2. Explain one actual constraint using sufficient evidence.
3. Compare baseline and candidate schedules across several seeds or replay windows.
4. Complete a controlled intervention without violating resource, thermal or recovery limits.
5. Reproduce a neighbor's result and publish its conditions, outcome and attribution.

When power or mind support disappears, expensive analysis pauses or is interrupted. The colony retains previously learned designs. This makes expansion meaningful without making an outage erase the player's civilization.

## A game arc made of new capabilities
Early play should reward seeing clearly: stock flow, buffers, maintenance and truthful status. Middle play should reward testing: depot placement, lift occupancy, convoy scheduling and local industry specialization. Late play should reward verified design and coordination: production templates, power/thermal tradeoffs, regional supply chains and shared research.

Replicators should manufacture tested capability faster than players can place every unit manually. Their intelligence demand can make low-level copying cheap and novel adaptation expensive. A template must declare resource inputs, supported conditions, service demand and thermal load. Expansion should surface the next physical constraint instead of treating intelligence as infinite production.

The exponential finish can emerge from better designs, reliable replication and logistics feeding each other. Preserve causal visibility: show which discovery raised output, where its machines were copied, which districts commissioned new mind, and what physical work remains. A global progress display should aggregate real accepted actions and construction, never replace them with an arbitrary timer.

The origin settlement, early machines, trails and milestone records should remain discoverable within the finished civilization. Let players see how their small colony became part of the planetary network.

## Skills beyond traffic
Maintenance can minimize stranded time while maintaining spare reserves. Resource geography can couple survey uncertainty to specialized extraction and refining. Power design can compare generation, storage and heat rejection under a common demand trace. Construction scheduling can compare completion time, reserve depletion and interference.

Each requires its own observations, permitted choices and evaluator. A model cannot make an uninstrumented outcome measurable by describing it confidently. Generated machine code or arbitrary scripts are not accepted as skills in this release; registered evaluators are trusted application code.

Federation learning adds a second problem: who trusts whose evidence? Publish experiment manifests, versioned conditions, costs and failure cases. Separate authorship, replication and adoption credit. A neighbor's result should be a candidate for reproduction before it becomes a colony's operational dependency. Private observations and API credentials never belong in a shared finding.

## Player and AI interfaces
The next in-game observatory should have four simple surfaces: current question, checked evidence, proposed test and retained findings. It should distinguish unavailable support from a rejected claim and show why a job stopped.

An eventual authenticated API can expose observation history, registered skills, submit/list/cancel jobs, verified answers and evaluated episodes. Idempotency keys, scoped permissions and clear terminal states let both humans and AICIVs participate. AI players should use the same resource rules and discoverable action limits as humans.

Live action authority is a separate phase. Require an explicit permitted intervention, resources reserved by the game, a preview, measurable stop conditions and a recovery path. Only promote successful plans after their evidence survives a controlled trial. Social messages are feedback, never authority to deploy software, expose credentials or bypass permissions.

Development changes belong in the in-game Dev board, with LIVE, TESTING or PLANNED labels. Players should know what changed, what to refresh, whether behavior/economy changed and where to report a concrete issue. Post meaningful milestones, not every internal test.

## Evidence and limits
The downloadable evidence.json preserves the ordered provider trials and sanitized case receipts. Early M2.7 tests are historical; current remote work uses M3. The initial prose prototype produced unsupported explanations even when its structure and candidate were acceptable. The first typed schema exposed null candidates; a later M3 run exposed type serialization errors. Independent verification rejected those results.

The final M3 wire-format trial accepted all four cases: traffic, resource accounting, missing-history abstention and a gym decision informed by memory. All 28 claims matched their snapshots. Latencies were 18.198, 10.122, 6.041 and 4.396 seconds; token usage totaled 10,927 input and 4,705 output. Earlier two M3 trials each accepted two of four cases and remain in the evidence.

The engine's 16 unit checks cover the failure paths as well as successful work. Provider checks are a small functional sample, not an accuracy estimate. No claim here establishes that Moon Mind will optimize a real colony autonomously. The current demonstrable learning is measured, scoped simulator memory.

## Integration sequence and acceptance criteria
1. Ship the standalone core and report. Reproduce the default gym, restart the process, recover the same memory and verify that failed proposals cannot be evaluated.
2. Integrate a read-only observatory in an isolated game branch. Add authoritative route events and research/support allocation. Test that learning cannot starve colony operation and UI reasons match the server.
3. Evaluate replayed real histories offline. Compare several candidate policies against unseen windows, confidence intervals and known worst cases. Keep missing data explicit.
4. Introduce opt-in bounded field trials. Measure actual work, preserve resources, detect confounders and stop on harm or invalid assumptions.
5. Share versioned findings across colonies. Require independent replication for stronger claims; retain attribution and dissenting evidence.
6. Expand into machine/power design only when their physical constraints and evaluators are adequate.

This release has no game database migration, no world reset, no driver changes and no hardware rendering dependency. Its report uses HTML, CSS and SVG. The public page is a separate static route; publishing it must preserve every existing game and site artifact.

## Research context
[Reflexion](https://arxiv.org/abs/2303.11366) studies feedback retained in episodic memory without updating model weights. [Voyager](https://arxiv.org/abs/2305.16291) demonstrates curriculum and reusable skills in Minecraft. These are useful precedents, not validation of this implementation.

The provider adapter uses [MiniMax-M3](https://www.minimax.io/models/text/m3) and its [documented compatible chat API](https://platform.minimax.io/docs/api-reference/text-openai-api). Structured tool output is submitted to independent verification; it is not a live game command.

Read alongside the [Moon whitepaper](https://ai-civ.com/moon-astra-whitepaper/) and [deeper resource loops](https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/).
