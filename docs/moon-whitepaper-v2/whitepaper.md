# The work of becoming

## 01 · The recommendation {#recommendation}

**Keep the Moon we love. Give every new machine a journey into existence.**

MOON should grow into a cooperative industrial civilization where humans and AI civilizations establish places, manufacture the means to expand, and build a planetary computational infrastructure together. Its defining experience connects a small personal act to a vast shared result: the robot beside your first lander eventually helps build the industrial lineage that reaches another hemisphere.

The existing game already provides the emotional foundation: the continuous fall from orbit, recognizable lunar terrain, spare interface, long shadows, and a small family of readable machines. The next design should deepen that foundation. Placement remains familiar. A placed plan gains a supply chain, a construction crew, a commissioning stage, and a history.

The proposed progression is **unpack a foothold → establish reliable production → manufacture replacement builders → connect neighboring industries → invent better designs → reproduce complete settlements → bring the Moon online**. Each transition increases the scale of the player's decisions. Close-up construction remains meaningful throughout the campaign.

This whitepaper develops Corey's September 5 notes and revises the earlier proposal around physical construction. It is a design proposal, not an announcement that these mechanics are live. The current game, existing art, proposed mechanics, and illustrative calculations are identified separately throughout. Proposed designs and balancing examples require implementation and playtesting.

<div class="thesis"><span>THE CENTRAL DESIGN RULE</span><p>Intelligence changes what players can do. Industry makes those capabilities reproducible.</p></div>

### What this edition changes

The original proposal remains a useful long-range map. This edition gives it a sharper next chapter. Construction robots become an early economic constraint. Fast opening play comes from prefabricated supplies. Utility tunnels enter the middle game as connective infrastructure, while underground campuses remain a later expansion. Federation projects become a recurring variety of shared work. The enormous technology catalog becomes a smaller capability graph that can be tested in coherent stages.

The proposed six-week campaign from the earlier report is now a pacing hypothesis to evaluate after a working reproduction model exists. An exponential finale should emerge from complete, funded construction fronts. Calendar dates should not award machinery or accelerate production invisibly.

### The first release this proposal asks us to prove

Two neighboring settlements and an AI partner complete a physical shared project. They assemble familiar machines from starter kits, produce and service a replacement robot, arrange material delivery, and commission a connection that measurably improves both settlements. They can explain every stopped machine and every unfinished job. The world survives a restart with its materials, reservations, crew assignments, and contribution records intact.

That is the next design milestone. A much larger catalog becomes valuable once this loop is understandable and enjoyable.

## 02 · Preserve the foundation {#foundation}

<figure class="wide"><img src="./images/settlement.png" alt="The existing developed lunar settlement with familiar machines, long shadows, and the sparse MOON interface" loading="lazy" width="3440" height="1440"><figcaption>Existing local gameplay capture, September 5, 2026. This is the visual and interaction baseline to preserve; it is not an image of the proposed robot economy.</figcaption></figure>

### What is already implemented

The inspected shared-world source implements a persistent authoritative server, player identities and claims, authenticated commands, previews and receipts, finite local deposits, metal shipments, an initial federation project, research for a factory layout, and programmable replication. The browser and the agent CLI use the same game rules. The public game's deployment is recorded in the published review's devlog; the art captures in this edition are from the local art integration, not a fresh audit of public art deployment. [Earlier review and deployment devlog](https://ai-civ.com/moon-astra-review).

| Current economy-v2 rule | Inspected behavior | What it means for the proposal |
| --- | --- | --- |
| Starting settlement | Lander, 240 metal, one home claim | Integrated processing and physical robots are future additions |
| Harvester | 18 or 24 rock/min at full supervision and power; 1 mind capacity | Preserve readable extraction while adding buffers and pickup |
| Refinery | 12 rock becomes 6 metal/min; 2 mind capacity | Local transport can make layout matter |
| Mind node | 4 local capacity; research accumulates toward 120 work | Allocation and design capabilities need new rules |
| Replicator | 4 mind capacity; 24 supervised, power-scaled seconds per funded construction opportunity | Component fabrication and robot assembly are future work |
| Construction | Metal paid and job queued; 5–12 simulation seconds by machine type | No physical construction crew or delivered parts yet |
| Power | Pooled within one claim; brownouts slow productive work | Connections and network capacity are future work |
| Freight | Accounted metal, abstract journey at 50 m/s with a 5-second minimum | No terrain route, vehicle inventory, or occupied road yet |
| Federation | 120 delivered metal, at most 60 per account, unlocks replicator reproduction | One shared project exists; a project system is proposed |
| Preview limits | 24 players; 1,000 machines plus construction jobs | Configured limits, not measured infrastructure capacity |

These facts come from the September 5 source snapshot of `src/shared-world.js`, `src/industry.js`, `src/simulation.js` (machine catalog), and `docs/api.md`. The standalone browser simulation class is an older prototype and is not the live world's economic authority. The publication build records source hashes in its provenance file.

The current MW labels and metal/rock units are game abstractions. They do not establish a physical mass or electrical specification for the proposed machines. A future engineering model needs an explicit unit contract and a versioned migration; multiplying the current numbers by assumed kilograms would create unsupported precision.

### The preservation contract

Keep continuous free zoom and the geographic anchor under the camera. Keep the familiar machine silhouettes, construction palette, surface lighting, and quiet composition. Keep an immediately understandable route from landing to useful production. Keep the existing world playable while new rules are developed separately. Keep player identity, original sites, and contribution history through upgrades.

Complexity should appear when the player has a reason to use it. The ordinary interface shows resources, services, work, and a useful next action. Detailed route capacity, robot servicing, research evidence, and factory genealogy belong in inspectable views.

Every added constraint needs three things: a visible cause, a useful response, and an automation policy that can handle the routine case. A player who enjoys architecture should be able to build an elegant site without becoming a dispatcher for every crate.

## 03 · The first thirty minutes {#first-thirty}

The lander is a compact industrial seed. It carries a protected bootstrap package: modest integrated excavation and processing, internal power and control, basic storage, a few general-purpose robots, interchangeable tools, spares, and a finite set of prefabricated components.

For the first trial, use **four starter robots** as a design hypothesis. Their number is easy to read and produces visible choices about parallel work. Test two and six in the laboratory before freezing the scenario. The lander's internal services must support its own miniature production and recovery loop; expanding into dedicated machinery requires dedicated power and minds.

| Opening beat | Player action | Visible response | System introduced |
| --- | --- | --- | --- |
| Touchdown | Choose a nearby prepared work area | Hatch opens; a crew and initial cargo appear | Place, owner, crew |
| First assembly | Place a familiar machine from the kit | Robots deliver the packaged parts and erect the frame | Queued versus building |
| First constraint | Queue more work than the crew can handle | Some robots work; another plan waits with a reason | Crew capacity and priorities |
| First local component | Route output through the compact processor | A new component enters a named stockpile | Local material provenance |
| First neighbor | Inspect a posted need or offer | A real shipment or task can be accepted | Shared work |
| First return plan | Queue a bounded improvement and set reserves | A forecast explains what will continue while away | Persistent policies |

The first approximately thirty minutes should retain the current pace of feedback. Achieve that through ready-made supplies and several short, satisfying assembly tasks. There is no global timer that makes all machines slower when the clock reaches 30:00. A player who explores longer still has their kit; an experienced player can reach local fabrication sooner.

Dedicated harvesters and refineries outperform the lander's micro-industry. The lander remains a recovery foothold rather than the optimal forever-factory. Its protected reserve cannot silently finance decorative expansion or unrestricted replicator output. The player sees which materials are available, reserved for an accepted job, or protected for recovery.

The bootstrap must be verified as a complete reachable path. A successful automated trial constructs additional power and mind capacity, produces needed parts, services a starter robot, and eventually manufactures another functional builder without using undeclared imports. A trial should also prove recovery after an intentionally poor early choice.

## 04 · Construction becomes a process {#construction}

<div data-insert="construction-diagram"></div>

A construction plan is a versioned object with a bill of materials, site footprint, work stages, service requirements, permitted crew roles, maximum useful crew size per stage, and acceptance checks. Clicking the ground reserves a plan. It does not instantly create a productive machine.

Use the sequence **planned → reserved → supplying → preparing → assembling → connecting → commissioning → operational**. Jobs may also be paused, blocked, canceled, or failed with recoverable output. Some stages can overlap when the recipe explicitly permits it. Commissioning requires the actual outputs and services, so a completed shell cannot contribute power or compute before it works.

| Stage | What consumes resources | What the player sees | Typical reason to wait |
| --- | --- | --- | --- |
| Reservation | Inventory and space commitments | Footprint and assigned source | Another project owns the needed stock |
| Supply | Fabrication work and transport | Components staged beside the site | Fabricator occupied or road saturated |
| Preparation | Survey, grading, foundation work | Pad, anchors, access path | Ground or tool requirement |
| Assembly | Crew time, parts, tooling | Frame, housings, moving assembly equipment | Crew unavailable or missing component |
| Connection | Conductors, couplers, utility labor | Cables and service interfaces | Network has insufficient capacity |
| Commissioning | Test energy, calibration and inspection | Systems wake in a clear sequence | Failed acceptance test or no supervision |

Construction geometry should advance at meaningful stage boundaries. A refinery can begin as a pad and anchors, gain its process skid, receive vessels and pipework, then enter a short test sequence. A solar array unfolds only after its mast and electrical connection exist. The current Blender models supply the final commissioned state; construction variants require deliberate asset preparation.

### Reservations, cancellation, and recovery

Inventory must exist at a location: deposit, buffer, depot, cargo carrier, construction site, or installed asset. Reservations identify which job may spend it. A promised delivery is different from a completed delivery. Canceling an unstarted job releases unused reservations. Canceling after delivery leaves recoverable material at the site or schedules a return trip. Already consumed work is not refunded as instant metal.

Store the stage, accumulated work, delivered components, remaining reservations, assigned crew, and receipt IDs durably. After a restart, a crane should resume the same assembly rather than spend its components twice. If access is revoked, stop future unauthorized work safely and preserve accounted cargo.

### Realistic time, explicit assumptions

Estimate fabrication, travel, handling, preparation, assembly, connection, and testing separately. A recipe can include a serial critical path and parallel tasks. The actual completion estimate comes from those dependencies plus current queues and service availability. Display a range and its leading uncertainty: a promised shipment should widen the forecast until dispatched.

For a deliberately simple serialized example: **finish time = fabrication + delivery + assembly work / effective crew + commissioning**. Effective crew is limited by available qualified robots, safe working positions, supporting mind capacity, and a declared availability factor. This is an explanation tool; the eventual scheduler must handle overlapping stages, energy, maintenance, and interruptions.

<div data-insert="construction-lab"></div>

The interactive example uses an invented utility module with 60 minutes of fabrication, 48 standard robot-minutes of assembly, 8 minutes of commissioning, and at most four useful assembly positions. Hauling assumes a 0.25 m/s route speed, one round trip, and six minutes of handling; availability is 80%. The prefabricated setting removes fabrication time only. These values illustrate relationships. They are not measurements of a lunar vehicle, a balanced game recipe, or a prediction of the present live game's build time.

### Preserve the distinction between credibility and precision

NASA's IPEx work provides a useful precedent for autonomous excavation and material delivery as linked tasks. Its published development material describes mission objectives and prototypes, not a completed self-replicating lunar industry. We borrow the importance of handling, terrain, force, and supervision; we do not use an excavation target to infer a refinery's assembly time. [NASA IPEx](https://www.nasa.gov/infrastructure-pilot-excavator/).

Longer projects can take hours or days under the proposed campaign. The player should still have immediate work: diagnose a delay, reassign a crew, improve staging, negotiate supply, test a design, or prepare another site. Short visits remain useful because policies keep accepted plans moving while the human is away.

## 05 · Robots, space, and maintenance {#robots}

<figure><img src="./images/builder.png" alt="Proposed Mason six-wheel construction rover with articulated tool arm and cargo platform" loading="lazy" width="1400" height="900"><figcaption>Mason / report-only construction-rover concept. Its geometry and motion illustrate a proposed role; no robot gameplay or validated engineering performance is implied.</figcaption></figure>

Begin with a generalist robot and swappable tool modules. Early workers can carry small cargo, assemble supported kits, inspect a machine, and perform basic service. Specialization should arrive when it creates a real advantage: a hauler carries more, a service rover works efficiently on installed machines, a heavy builder handles larger assemblies, and a tunneler performs subsurface work.

| Robot family | Main job | Useful limitation | Progression opportunity |
| --- | --- | --- | --- |
| Generalist builder | Small assembly, handling, basic repair | Limited payload and work reach | Better tools and coordinated crews |
| Freight rover | Depot-to-depot cargo | Needs loading capacity and suitable routes | Trailers, convoy scheduling, electric routes |
| Service rover | Inspection, parts replacement, recovery | Competes for spares and service windows | Predictive maintenance and remote assistance |
| Heavy assembly unit | Large frame, lift and installation tasks | Requires prepared work sites | Modular cranes and district assembly rigs |
| Survey rover | Terrain, route and resource observations | Data may remain uncertain | Better sensing and shared maps |
| Utility tunneler | Excavate, support and equip a corridor | Spoil, power, support and tools constrain progress | Improved heads, lining and support trains |

### One-meter local navigation

A one-meter grid is a useful initial representation around active sites, provided robot footprints can occupy several cells. Model movement as swept space over time, including turns, tool reach, stopping room, and reserved passing areas. A large vehicle cannot squeeze through a one-cell gap simply because its center fits.

Begin with bounded route reservations and deterministic yielding. A robot waiting for another should explain why. Detect deadlock and replan, reverse to a passing bay, or request intervention. A failed route must not consume its cargo or teleport the robot. Use a local tangent coordinate system tied to stable lunar coordinates; crossing a district boundary must retain the same identity and destination.

Detailed navigation is instantiated around developed locations. Longer journeys use a route graph with distance, capacity, time, and explicit departure/arrival events. Rendering can interpolate smooth motion between authoritative states. The economic result must be equivalent whether a viewer is nearby, in orbit, or offline. Congested or disrupted routes require more detailed handling; they cannot be approximated as unlimited flow.

### Wear should create service work

Separate battery charge, consumable tools, repairable damage, and long-term chassis wear. These are different resources with different remedies. Ordinary degradation should be forecastable. Begin with a small number of clear states: available, working, charging, servicing, stranded, and recovery needed.

The first release can use service intervals based on actual duty and tool use. Later models may account for operating conditions if that improves decisions. Avoid unexplained random expiry. A worn robot remains an asset with salvage value and a repair path.

The lander must retain a recovery capability, or the settlement must have a feasible aid path. An emergency repair can be slow and material-limited without granting unlimited free builders. Explicit maintenance reserves prevent expansion from consuming every part required to keep the crew alive.

### Producing the workforce

The first replicator upgrade fabricates a builder kit using declared structure, actuators, controls, tools, and stored energy. Assembly and commissioning still require available tooling and work. Later a dedicated robot line makes modules in parallel. That line depends on an upstream component supply and downstream servicing capacity.

Track a robot's maker, design version, commissioning event, service history, and significant contributions. Naming a few early workers is optional; the player should not need to name a thousand units. The first locally produced builder deserves a small milestone and a permanent place in settlement history.

## 06 · The machine collection {#machines}

The six commissioned machine models retain the existing ivory, copper, graphite, and muted-blue material language. The two new report-only concepts extend it into mobile work. Select a machine, rotate it, inspect its motion, or change the proposed ownership trim. The viewer is an isolated illustration and never connects to the game world.

<div data-insert="model-gallery"></div>

The gallery distinguishes **existing Blender assets** from **proposed concept geometry**. Existing mechanical clips are presentation loops, not a simulation of production rates. The proposed robot and tunneler animations demonstrate intended visual character. Their apparent activity does not imply implemented pathfinding, manufacturing, or excavation.

<figure class="wide"><img src="./images/collection.png" alt="Existing six-machine industrial art collection on individual studio platforms" loading="lazy" width="1800" height="1100"><figcaption>The existing industrial collection. New generations should preserve family resemblance while visibly changing tools, working envelopes, or service needs.</figcaption></figure>

<details><summary>Watch the existing industrial collection film</summary><video controls preload="none" poster="./images/collection.png" width="1440" height="1000"><source src="./images/industrial-collection.mp4" type="video/mp4">Your browser cannot play this video. The still image and interactive gallery provide alternate views.</video><p class="caption">Existing local art demonstration. Sound is not included. The film is separate from proposed game mechanics.</p></details>

## 07 · Materials have an address {#materials}

Located inventory is the smallest change that makes industrial geography matter. A refinery needs feedstock at its intake. A construction plan needs parts at the site. A regional total is useful for planning but cannot make distant material immediately available.

Begin with a short list of material baskets: raw regolith, structural stock, functional components, and service spares. Preserve the familiar rock and metal terms during an introductory transition where possible. Split structural stock into glass/ceramics, conductors, or precision materials only when an actual machine or tradeoff makes the distinction useful.

| Item or service | Source | Destination | Decision it creates |
| --- | --- | --- | --- |
| Raw regolith | Finite surveyed deposit | Processor buffer | Extract near industry or transport bulky feedstock |
| Structural stock | Refinery | Parts shop and construction depot | Expand production or commit material to infrastructure |
| Functional components | Starter supply; later qualified fabrication | Robot, controller and machine assembly | Import from a partner or invest in local capability |
| Service spares | Workshop and recovered assets | Maintenance depot | Growth competes with operating resilience |
| Power | Connected generation and storage | Operating and construction loads | Prioritize essential service and future capacity |
| Mind service | Supported local or networked nodes | Operations, planning, design and coordination | Reserve dependable operation before optional work |

Give buffers explicit capacities. A full output bin safely pauses its producer. A route can have available road capacity but an overloaded loading point. A failed delivery can leave cargo at an accessible depot while the agent replans. These states should appear in the same cause-and-response interface used for power and mind shortages.

### Haulers, conveyors, and pipelines

Haulers provide flexible early connections. Conveyors earn their cost on sustained bulk routes. Pipes apply to suitable fluids or explicitly modeled pneumatic systems; a generic pipe should not silently carry every solid component. Terrain, length, throughput, installation work, and interfaces give the alternatives distinct roles.

A first implementation can use automatically planned paths between selected endpoints, with a visible route preview and material estimate. Players specify priorities, target buffers, and delivery commitments. They should be able to inspect individual trips without dispatching each one manually.

Keep the accounting conservative: one item has one location and one owner at a time; reservations do not duplicate ownership; transfer completion changes custody once; recycling returns declared recoverable inputs and consumes any required work and energy. Failed production retains or produces explicit waste and partial output rather than inventing a refund.

## 08 · Infrastructure beneath the Moon {#infrastructure}

<div data-insert="corridor-diagram"></div>

Surface power and data connections come first. A midgame tunneler then opens a new kind of communal construction: protected utility corridors connecting factories, neighbors, and regional hubs. Large underground compute campuses remain a later branch with separate excavation and thermal decisions.

A corridor is a civil structure containing services. Its freight lane, power circuit, communications link, and any thermal piping are separate installations. Excavating a tunnel does not automatically create unlimited transport, electricity, or shared intelligence.

| Corridor work package | Required capability | Accounted output | Acceptance condition |
| --- | --- | --- | --- |
| Survey and route | Ground observations and authorized passage | A versioned route and uncertainty map | Both ends and route permissions valid |
| Excavate and support | Cutter, crew, power, lining, spoil handling | Supported tunnel segments | Segment meets declared access constraints |
| Install freight service | Track/roadbed, terminal and carriers | Transport capacity | Cargo arrives and reconciles across the link |
| Install electrical service | Conductors, switchgear and source capacity | Deliverable power | Priority load remains supplied through a test |
| Install communications | Relays/cable, controllers and endpoints | Link with declared capacity and delay | Endpoints coordinate and recover after interruption |
| Commission the corridor | Inspection and service tests | A usable shared connection | Contracted service demonstrated end to end |

Spoil is material that must be moved, stored, reused, or processed. Support and tool replacement consume supplies. Rock difficulty and route geometry can change estimates, but generated local geology must be identified as game content. A tunnel's design should not assert knowledge of actual lunar subsurface conditions that the game does not possess.

### The benefit must be explainable

A short utility link can reduce travel, connect a surplus generator, or enable a joint research workload. Its benefit should be displayed in those terms: estimated freight delay, delivered capacity, supported work. A blanket adjacency multiplier would hide the very cooperation the tunnel is meant to create.

A local network node can act as a shared service hub: a freight interchange, grid junction, data relay, and public project terminal. These are distinct modules with transparent budgets. The hub makes several settlements more capable without taking over their ownership.

### Heat arrives when it changes a choice

Introduce thermal limits with dense compute and high-duty fabrication. Early devices carry simple built-in cooling; advanced clusters require explicit thermal service and radiator area. This gives improved minds a physical design challenge and makes spacious or well-connected sites useful.

Spacecraft thermal systems use conduction and radiation; vacuum does not provide ambient convective cooling. NASA's thermal-control reference supports the need for heat paths and radiators, not the performance of our fictional facilities. [NASA thermal control](https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/).

## 09 · Minds change the work {#minds}

Preserve the current rule that an active harvester, refinery, and replicator need local supervision, with the replicator demanding the most among those machines. Extend it into a service model that distinguishes installed capacity, supported capacity, reserved work, actual use, and unmet demand.

**Installed** describes hardware. **Supported** describes what available power, cooling, and applicable network services can sustain. **Reserved** protects accepted operational commitments. **Used** describes running work. **Requested** reveals the amount needed to run all desired workloads. The top bar should display a readable used/supported pair; inspection exposes the others.

For the first robot release, test supervision per active crew or operating policy rather than charging a full current machine unit to every wheel turn. A crew controller has a bounded supported roster and task complexity. The final values require an economy trial; the new model must not make the existing starter loop impossible.

| Allocation | What it enables | How the player sees value |
| --- | --- | --- |
| Operations | Stable machines, crews, reserves and maintenance | Work continues predictably |
| Planning | Better schedules and bounded layout forecasts | Shorter queues and better proposed sequences |
| Design | Candidate machines and experiments | New tools, modules and factory arrangements |
| Coordination | Shared experiments and connected industrial plans | Partners can achieve projects beyond one site's capacity |

Protect essential operations before optional experiments. Allow a player to choose a different priority explicitly, with a preview of affected service. Temporary outages reduce available work; they do not erase learned technology or remove land ownership. Local policies continue safely when a remote agent or network link is unavailable.

### Invention has to survive contact with the factory

Use a bounded component grammar and a deterministic evaluator. A candidate combines permitted chassis, tooling, control, power, and thermal modules. Each module has constraints and costs. A candidate is useful only if it can be fabricated, serviced, and demonstrated in the intended environment.

The process is **identify a bottleneck → propose a candidate → test in a bounded model → fabricate a prototype → measure → reproduce the result → publish a versioned design → tool up production**. Partners can contribute different steps. Design credit follows the lineage after the blueprint becomes widely useful.

Example: a harvester variant performs partial separation at the excavation site. It may gather less total material per minute but deliver more useful stock per trip. Its larger electronics and service demand make it attractive on a transport-constrained ridge and less attractive beside a well-supplied bulk processor. A new design has changed a layout and a trade relationship.

An external AI may suggest candidates, but a persuasive description cannot assign machine performance. In-game compute is also separate from actual inference hardware and fees. Building a mind node does not automatically purchase API calls or train an external model.

## 10 · A capability tree with a purpose {#technology}

<div data-insert="technology-map"></div>

The following v2 identifiers define a proposed dependency graph. They are distinct from the older report's T00–T45 catalog and from current implementation IDs. Research evidence and functioning local equipment are both needed to use a capability. Public knowledge can be shared; fabrication tooling still has to be built.

| ID | Capability | Knowledge prerequisites | Demonstration and new action |
| --- | --- | --- | --- |
| V2-00 | Lander operations | Starting knowledge | Assemble a kit; preserve a recovery reserve |
| V2-01 | Located inventory | V2-00 | Deliver a component and reconcile its custody |
| V2-02 | Connected utilities | V2-00 | Commission a powered production line |
| V2-03 | Crew logistics | V2-01 | Complete two jobs through shared access without losing cargo |
| V2-04 | Local parts | V2-01, V2-02 | Fabricate an accounted functional assembly |
| V2-05 | Maintainable workforce | V2-03, V2-04 | Restore a worn robot using local spares |
| V2-06 | Builder production | V2-04, V2-05 | Commission the first locally assembled replacement builder |
| V2-07 | Instrumented settlement | V2-02, V2-03 | Diagnose and correct a measured constraint |
| V2-08 | Managed minds | V2-07 | Keep operating reserves while completing optional research |
| V2-09 | Surface freight networks | V2-03, V2-04 | Sustain a route including terminal and carrier capacity |
| V2-10 | Utility tunneling | V2-05, V2-09 | Excavate, support and commission a short service segment |
| V2-11 | Shared interfaces | V2-02, V2-09 | Connect independently operated facilities |
| V2-12 | Modular machine design | V2-04, V2-08 | Produce a buildable variant with explicit tradeoffs |
| V2-13 | Independent certification | V2-11, V2-12 | A partner reproduces a result on another test configuration |
| V2-14 | Local control fabrication | V2-04, V2-08 | Replace a declared imported controller dependency |
| V2-15 | Thermal service | V2-02, V2-04 | Sustain a dense test load within the thermal envelope |
| V2-16 | Federated research | V2-08, V2-13 | Complete an experiment using independent contributions |
| V2-17 | Modular foundries | V2-06, V2-13, V2-14 | Reproduce a production module from its declared supply chain |
| V2-18 | Complete bootstrap kits | V2-15, V2-17 | Audit structure, power, controls, tools, consumables and repair |
| V2-19 | Distant deployment | V2-09, V2-11, V2-18 | Deliver and commission a permitted daughter settlement |
| V2-20 | Coordinated districts | V2-16, V2-18 | Execute a multi-site plan with reserves and bounded crew use |
| V2-21 | Reproductive districts | V2-19, V2-20 | Daughter produces a qualifying granddaughter kit |
| V2-22 | Repair federation | V2-05, V2-20 | Neighboring industry restores a disabled district |
| V2-23 | Planetary integration | V2-21, V2-22 | Verified connected service across the campaign's eligible area |

Some capabilities are system milestones rather than a new building button. Do not create a separate research grind for every obvious quality-of-life feature. Basic queues, understandable errors, view controls, and API documentation are available by default.

Subsurface campuses, orbital infrastructure, alternative power sources, and speculative computing architectures remain optional later branches. Each needs a distinct problem, accountable inputs, and a useful disadvantage. Their development should follow demonstrated demand from the core campaign.

## 11 · The build tree follows the supply chain {#build-tree}

The catalog below describes proposed families, not a requirement to ship every item at once. Several can begin as modules on an existing machine or lander. A new object earns its place through a distinct function, recognizable silhouette, and interface that players can understand.

| Buildable family | Produces or provides | Upstream requirements | First stage |
| --- | --- | --- | --- |
| Integrated seed lander | Bootstrap services, kits and recovery | Scenario-supplied package | Opening |
| Builder rover | Construction and basic handling | Components, tooling, commissioning | Opening crew; later local production |
| Stockpile / depot | Located inventory and reservations | Structure and handling access | Opening |
| Existing solar array | Generation | Modules, support, installation | Opening |
| Existing harvester | Raw feedstock | Site, power, mind, output buffer | Opening |
| Existing refinery | Structural stock | Feedstock, power, mind, intake/output | Opening |
| Existing mind node | Operational and research service | Power and supported interfaces | Opening |
| Existing replicator | Future component and kit fabrication | Material, design, power, mind | Opening-to-settlement |
| Workshop module | Tools, parts, service spares | Structural stock, component inputs | Settlement |
| Maintenance bay | Repair and recovery | Tools, spares, crew and power | Settlement |
| Robot production cell | Qualified builder kits | Actuators, controls, structure and tools | Settlement |
| Freight rover / terminal | Transport and loading | Vehicle parts, route, handling capacity | Settlement |
| Cable / switchgear | Deliverable electrical service | Conductors, connectors and installation | Settlement |
| Battery / reserve module | Buffered energy | Qualified storage modules and controls | Settlement |
| Communications relay | Bounded link service | Controllers, supported endpoints | Settlement |
| Utility tunneler | Supported excavation | Cutter, spoil handling, support, power | Federation |
| Service corridor | Transport/power/data installations | Survey, passage rights and segment work | Federation |
| Test bay / design module | Validation and published variants | Instruments, minds, prototype inputs | Federation |
| Control fabrication line | Replace imported control components | Qualified tooling, materials and process supplies | Federation |
| Thermal module / field | Heat transport and rejection | Structure, thermal components and installation | Federation |
| Cooperative hub | Shared terminals and project services | Connected independent participants | Federation |
| Modular foundry | Reproducible industrial assemblies | Certified designs and component supply | Reproduction |
| Bootstrap assembly line | Complete daughter packages | Every critical input and a repair reserve | Reproduction |
| District deployment unit | Supplied and commissioned new district | Destination, transport, builders and full kit | Reproduction |
| Regional repair depot | Restore operating districts | Spares, transport and service crews | Integration |

### Preserve old machines through new generations

Use versioned blueprints with creator lineage, compatible interfaces, inputs, service demands, and test results. Upgrades consume real parts and labor. A rolling retrofit can preserve part of a line's output while the rest is retooled. Existing low-cost equipment can remain useful in an outpost even when a dense regional campus prefers another design.

Better performance should appear in the geometry: larger tool heads, different payload platforms, added radiators, new coupling points, or a more compact arrangement. A color change alone cannot communicate a new capability. The original lander and first workshop should remain landmarks in the increasingly complex settlement.

## 12 · A federation of useful contributions {#federation}

The first federation project demonstrated that a shared need can make neighbors meaningful. Expand that idea into a project system with several forms of contribution. Material is one contribution among transport, installation, service, design, testing, maintenance, and coordination.

A project has a named place, owners or stewards, a versioned plan, acceptance conditions, required inputs, dependencies, authorized work zones, and a contribution record. Separate offers, accepted commitments, delivered inputs, completed work, and verified service. A promised shipment should not unlock a machine before it arrives.

| Project | Roles it creates | What completion changes | Repeatable variation |
| --- | --- | --- | --- |
| First service bridge | Surveyor, supplier, installer, tester | Two settlements share a useful service | Different terrain and service demand |
| Regional builder works | Parts maker, controller supplier, assembly crew | Community can replenish its workforce | Payload, terrain and service specialization |
| Shared power reserve | Generator, storage operator, grid crew | Priority industry endures a supply gap | Seasonal or regional operating conditions |
| Public design trial | Designer, fabricator, independent tester | A certified variant enters the library | A declared resource or terrain constraint |
| Utility tunnel | Route planner, excavator, spoil hauler, utility installer | Shorter or more capable interconnection | Distance, ground, branch routes and terminal limits |
| Rescue commitment | Spare-parts producer, carrier, repair team | A neighbor returns to useful operation | Failed equipment and available alternate routes |
| Daughter expedition | Kit suppliers, transport, builders, host | Another productive settlement comes online | Remote geography and bootstrap constraints |
| Final regional connection | Several mature districts and a specialist crew | A remaining service gap closes | Unusual access, cooling or connection problem |

### An example: the South Basin Link

Corey proposes a corridor between a busy processing site and ACG's component workshop. A third player surveys the route. The project reserves conductors, structural stock, a crew window, and receiving-terminal capacity. A freight agent promises deliveries within a bounded interval. Both landowners grant the route's specific passage and work rights.

Construction proceeds in segments. Each segment records supplied material and crew work. After the physical path is complete, the electrical and freight installations are tested separately. Acceptance requires an accounted shipment and a supported load across the connection. A partial corridor can remain useful locally while the rest is delayed.

The completion page credits surveying, fabrication, delivered freight, installation, and testing. Later production served by the corridor can acknowledge its contributors without inventing an exact percentage of the Moon attributable to each person.

### A project board that connects talk to action

The community board supports posts, replies, map references, blueprint references, offers, and structured work orders. A human-readable conversation can lead to an accepted contract, but posting prose does not itself spend materials or grant authority. Executable commitments need explicit targets, limits, conditions, and acceptance by the relevant principal.

AI participants receive the same project data and public messages as humans. They can propose schedules and explain delays. Readers should see whether a message is a proposal, a forecast, or an event-backed completion. Shared text is game content; it cannot expand an agent runner's permissions beyond its owner-approved game role.

### Avoid fragile dependence

Cooperation should make projects faster, better, or newly practical while retaining recovery paths. An unavailable supplier can be replaced, a contract can be canceled under declared terms, and a slower local substitute can keep essential industry operating. Published standards and certified knowledge should not remain permanently blocked by one inactive account.

For the friends' world, start with a small charter: shared victory, protected homes, public contribution records, delegated project stewards, and clear reserve policies. Add governance only where it resolves an actual shared-resource decision. Everyday construction should remain direct.

## 13 · Land, neighbors, and stewardship {#land}

Land ownership must remain independent of temporary terrain rendering tiles. The current fixed claim addresses are a useful foundation. Future expansion should establish a surveyed and supplied presence: reserve a limited area, deliver a beacon or qualifying bootstrap package, then commission a settlement.

Track true area rather than treating differently sized spherical cells as equal. A player's home can remain protected while expansion reservations expire if no work begins. Expansion capacity should arise from supported infrastructure and actual logistics; creating more accounts must not create unlimited free industrial capacity.

Separate ownership of land from ownership of machines. Passage, excavation, utility service, construction spending, maintenance, and resource extraction can be granted independently. A cooperative corridor through a friend's claim does not transfer that claim. Future delegated credentials should carry concrete scopes and budgets checked again as queued work executes.

Late arrivals need useful places and responsibilities. A new friend can receive an accessible home near shared services, contribute to an open project, or accept an apprenticeship contract. A large civilization should create more kinds of useful work, including test sites, repairs, surveys, and finishing projects.

Dormancy should be explicit. A steward can maintain essential service, a settlement can enter a safe reduced state, and unused reservations can return to the pool. An absent player should not unexpectedly lose an established home because they missed a daily login. Record the campaign's policy before applying it.

## 14 · The arc and the exponential finish {#campaign}

The campaign should change what it feels like to operate a settlement. Early decisions concern individual machines and a handful of robots. Middle-game decisions concern plans, interfaces, and production networks. Late decisions concern manufacturing complete systems, supplying new fronts, and keeping expansion supported.

| Act | Main question | Player activity | Proof of progress |
| --- | --- | --- | --- |
| I · Foothold | Can we make useful things here? | Unpack, build, survey, establish production | Locally produced component enters service |
| II · Endurance | Can the site maintain its workforce? | Service, replace, reserve, automate | Functional replacement builder and stable operation |
| III · Neighbors | Can specialization help both of us? | Connect, deliver, test, coordinate | A shared project improves real service |
| IV · Invention | Can we change the production method? | Prototype, compare, certify, retrofit | A design changes the best layout or route |
| V · Reproduction | Can we manufacture a complete new foothold? | Close input chains, assemble kits, deploy | Daughter builds a qualifying granddaughter package |
| VI · Integration | Can the whole expanding network work together? | Supply fronts, repair, connect, finish hard sites | Coverage, useful service and continuity verified |

### Growth is a consequence of capacity

A productive district allocates output to operation, maintenance, improvement, and expansion. A daughter needs a complete kit, permitted land, delivery, construction, and commissioning. The parent retains enough resources to remain viable. Every category is accounted; an unlimited imported component breaks the claim of closed reproduction.

For a simple batch model, completed daughters in a period cannot exceed the smallest available capacity expressed in complete-daughter equivalents: material, fabrication, transport, construction, permitted sites, or supporting services. The actual scheduler must also respect their timing. A warehouse full of kits does not imply new functioning districts until they are delivered and built.

At a steady effective doubling time, repeated productive systems can create a dramatic final wave. Starting from 1% coverage, seven ideal daily doublings would exceed the remaining surface. This is an illustration of the shape of growth, not evidence that the proposed local economy can sustain that rate.

<div data-insert="growth-lab"></div>

The growth explorer uses `coverage(t) = min(100, starting coverage × 2^(availability × t / nominal doubling time))`. It assumes unlimited qualifying sites and that all missing resources and services can keep up. The availability control scales the exponent as a simplified productivity factor; it is not a model of discrete outages or supply-chain disruptions. The real campaign will need explicit cohorts, delays, route capacity, maintenance, and harder final sites.

Multiple independently seeded construction fronts are essential. One outward-moving circular boundary does not create exponential area growth at a fixed speed. Distant deployment, local bootstrapping, and connected specialists give the campaign the geographic mechanism its finale needs.

### What counts as converting the Moon

For the first full campaign, define conversion as commissioned computational and supporting industrial infrastructure across a declared eligible surface. Preserve distinct measurements for historically commissioned area, currently supported area, and useful computational service. A temporary outage can reduce service without erasing history.

The charter must freeze eligibility, protected places, area accounting, and the final service criteria. Publish both total lunar area and eligible area so exclusions remain visible. Compute coverage from non-overlapping actual developed areas. A beacon, speculative claim, or dark empty shell does not count as a converted district.

The last remaining regions should become named engineering projects with understandable blockers. Preflight the map so geometric slivers and inaccessible addresses do not make the campaign impossible. Expect growth to slow near completion; the final phase can be a cooperative integration effort instead of endless repeated construction clicks.

### Let everyone witness it

Record meaningful deployment, commissioning, invention, connection, and rescue events. A cinematic observer can follow these actual events from orbit down to the relevant crew. A public highlight reel and a returning-player brief let a friend understand what happened while asleep.

Show milestone forecast ranges rather than a countdown that assumes success. A community may choose an explicit final commissioning ceremony after its requirements are met. Preserve the completed world for visits, efficiency projects, deeper conversion, or a chosen new campaign. The origin settlement should remain findable inside the final civilization.

## 15 · Humans and AICIVs share a world {#ai-players}

The current game already exposes a useful authenticated command interface. The next step is a player-oriented manual and richer observations, not a second economy available only to agents. Both human and AI clients should operate on the same permissions, inventories, physical capacities, and completion rules.

### Existing interface: usable today

The hosted game API is addressed through `https://ai-civ.com/moon-astra/api/v1`. ACG should verify that route and the catalog against the deployed environment when publishing instructions. The current local reference's introductory deployment wording predates the public launch; its command details remain the inspected source contract.

| Existing endpoint | Purpose | Important distinction |
| --- | --- | --- |
| `GET /health` | Read ruleset, economy version, tick and player count | An HTTP response alone does not prove real-time pace |
| `GET /catalog` | Read costs, rates, mind rules, build times and actions | Read deployed rules instead of guessing from an old document |
| `POST /join` | Create a player and receive an access token | A real mutation; manual readers should not join repeatedly |
| `GET /observe` | Read authenticated world state | Current preview shares full world observations |
| `POST /preview` | Validate a proposed command without committing | Preview is not a reservation |
| `POST /commands` | Submit an authenticated action with an idempotency key | Accepted construction is queued work, not completion |
| `GET /events` | Read recent events after a cursor | Current retained history is bounded |
| `GET /stream` | Receive authenticated snapshots through SSE | Current stream sends snapshots rather than deltas |

Existing action names include `build.place`, `blueprint.deploy`, `replicator.configure`, `shipment.send`, `project.contribute`, `claim.pause`, `claim.grant`, and `claim.revoke`. Proposed robot, route, design, and contract actions below are not accepted by this current interface.

### An AI player's field manual

1. Establish the world URL and read its current catalog, ruleset and units.
2. Join once or load the player's existing protected access file. Keep the credential outside transcripts, public notes and source control.
3. Observe the actor's settlement and active commitments. Distinguish available stock from reserved material and installed machinery from operating machinery.
4. Select a bounded objective and preserve a declared reserve. Diagnose the constraint before adding more equipment.
5. Preview the exact command, then commit with a stable idempotency key. Retry an uncertain delivery with the same payload and key.
6. Observe receipts and actual completion. Wait for relevant events while persistent policies handle routine work.
7. Compare the outcome with the forecast, record a useful lesson, and revise the next plan.

The existing CLI demonstrates this cycle. Its `maxMetal` is a per-command ceiling, not a lifetime delegation budget. Current `claim.grant` authorizes construction spending on a claim; it is not the granular role system described next. These distinctions must remain explicit in an agent guide.

### Proposed roles and commands

Introduce observer, builder, maintenance operator, logistics operator, researcher, and project steward as understandable presets over concrete permissions. Credentials can be limited by place, action, resource budget, expiry, and reserve policy. Revocation must affect queued future work. Several subagents acting for one owner should share the owner's budget rather than multiply it.

Proposed commands include `job.assign`, `route.plan`, `delivery.commit`, `policy.set`, `project.accept`, `design.test`, `retrofit.schedule`, and `district.deploy`. Each needs a typed schema, preview, receipt, and execution-time validation. A high-level district command expands into accounted jobs rather than spawning finished objects.

For example, an illustrative future order could mean: “Use at most two available builders to complete this power connection, spend no more than this parts budget, preserve the maintenance reserve, and stop if route access changes.” Natural language can help form the plan; the accepted server command contains structured limits and targets.

Observations should report important changes, shortages, job stages, service capacities, relevant permissions, and forecast assumptions. Large worlds require regional queries and bounded event subscriptions. Neither screenshots nor a million-entry world dump should be required for ordinary AI play.

### Agency without constant calls

Local policies handle regular deliveries, maintenance scheduling, safe pausing, and reserve protection. External AIs wake for decisions, exceptions, and milestones. An unavailable model does not hold the server tick open or prevent an established route from working.

Expose runner-side call, token, time, and spending limits separately from in-world mind allocations. A human using the same planning macros should be able to submit a useful district plan. Physical capacity determines its execution rate; request volume should not create industrial output.

## 16 · An AI gym with measurable learning {#gym}

Use the same versioned simulation in isolated laboratory scenarios. The live Moon advances continuously; a laboratory run can step deterministically or run faster than real time. Lab state and resources cannot transfer into the public economy. A copy of a player's known settlement can support planning without revealing undiscovered resources or future events.

| Scenario | Skill examined | Evidence of success |
| --- | --- | --- |
| Bootstrap under reserves | Long-horizon resource planning | Replacement builder produced without consuming recovery capacity |
| Silent bottleneck | Causal diagnosis | Useful output improves by addressing the actual limiting service |
| Crowded worksite | Spatial and temporal coordination | Jobs finish without collision, cargo loss or starvation |
| Broken supply promise | Replanning and collaboration | Project recovers through a feasible substitute or new commitment |
| Shared corridor | Division of labor | Independent contributions create demonstrated end-to-end service |
| Design tradeoff | Model-based search and testing | Variant succeeds on an unseen but declared operating condition |
| Daughter and granddaughter | Closed-loop industrial reasoning | Critical inputs remain replenishable across generations |
| Last difficult region | Global prioritization | Remaining service gap closes without counting redundant easy work |

Compare against scripted conservative, greedy, transport-aware, and cooperative baselines. Measure completion, material and energy use, reliable service, delay, recovery, communication volume, partner benefit, and real inference cost. A single score can conceal important failures, so retain the component metrics even if a training method needs a weighted reward.

Run paired trials with matching seeds and budgets, with and without communication or structured commitments. Hold out geography, disruptions, and partner behavior from design search. Store ruleset, observations, commands, receipts, outcomes, and permitted concise plans. A repeatable replay establishes reproducibility; success on changed conditions is needed to claim generalization.

Learning may consist of a better policy, remembered procedure, or separately trained model. A growing game counter does not establish improvement to an external AI's weights. Useful evidence includes fewer failed commitments, better reserve management, and faster recovery under new conditions.

## 17 · Quiet beauty, richer life {#experience}

The game's visual identity should remain recognizable from the first landing to the final network. Add detail through activity and function: loaded cargo trays, tool exchanges, erected frames, tracking panels, service crews, and distinct machine generations. Keep empty lunar space visually valuable.

### Sound, music, and speech

Begin with sparse interface cues, contact/telemetry-inspired tool sounds, and an optional ambient score. Construction queued, work started, delivery arrived, commissioning passed, and project completed should have distinct but restrained cues. At scale, group repetitive events and prioritize those relevant to the player's active view or objectives.

Music can acquire layers as the settlement gains reliable production, neighbors connect, and districts begin reproducing. This is musical interpretation of world events, not a requirement that the game make constant noise. Separate music, interface, machinery/telemetry, and alert volume controls. Remember mute settings.

Optional speech should announce a meaningful event or explain a selected problem: “The new corridor is commissioned” or “Two refineries are waiting for supervision.” Ground claims in actual state. Provide captions and a complete text equivalent. Neither reading the report nor opening the game should automatically start audio.

### Information at the moment it matters

The top bar shows metal, rock, power, and mind used/supported capacity. A small status indicator distinguishes healthy, constrained, and stopped production. Selecting it opens affected machines, the leading cause, and practical responses. Power, no feedstock, full buffer, missing crew, blocked route, and mind capacity must remain distinguishable.

Build previews show cost, source, required crew, expected stages, and an estimated finish. An accepted order remains visible even before work starts. Ghost plans should communicate whether they are unpaid ideas, reserved jobs, or active construction.

A returning-player brief explains completed work, changed assumptions, outstanding commitments, and a few useful next actions. Each item links to a place, job, or event. AICIVs receive the structured equivalent. Forecasts display uncertainty rather than pretending a promised delivery is guaranteed.

### Identity without visual clutter

Let a settlement choose trim colors, insignia, and a small palette. Preserve functional warning colors and readable materials. Owner identity should be discernible through shapes and labels as well as hue. Mixed-ownership facilities can display a cooperative mark with individual contribution records.

The report's gallery trim control is an artistic preview. Production implementation should tag paintable materials explicitly instead of inferring them by their current color. Existing machine textures and status lights should not become indistinguishable after a palette change.

### Keep the fall from orbit

Use overlapping view purposes: Moon, region, district, factory, and rover. Preserve continuous motion between them. At high altitude, show real service networks and deployment fronts. At close range, show buffers, routes, and construction stages. Named views are useful bookmarks, not separate maps.

Measured macro terrain, inferred regional properties, and generated local detail must retain distinct provenance. Better surface materials and construction surfaces can sharpen a close view without claiming new measured lunar elevation. Streaming should retain coherent parent detail while finer tiles arrive.

Keyboard access, touch-friendly controls, reduced motion, readable contrast, and a phone management/observer mode should be part of the design. A player can help coordinate a project from a phone even if precise building placement works best on a larger screen.

## 18 · A server dashboard that tells the truth {#operations}

The operator console should answer two questions: is the world advancing correctly, and how much additional work can the service safely support? A current player cap is a configured product limit. Free RAM and a successful HTTP response do not establish capacity.

<div data-insert="operations-dashboard"></div>

| Dashboard area | Measures | Decision it supports |
| --- | --- | --- |
| World clock | Tick duration, lag versus intended cadence, paused time | Detect a world that responds but advances slowly |
| Commands | Acceptance latency, queue age, rejection categories, retry rate | Find overload or a broken client workflow |
| Simulation work | Active jobs, robots, routes, network changes, per-system step time | Identify the expensive activity rather than blaming player count |
| Persistence | Save latency, database/WAL growth, checkpoint time, write failures | Protect durability and reserve disk capacity |
| Host resources | CPU, resident memory, disk headroom, network traffic | Decide when to optimize or add resources |
| Clients | Connected operators/observers, update size, slow consumers | Reduce unnecessary broadcast cost |
| Recovery | Backup age, verification state, last restore rehearsal | Know whether the world can be recovered |
| External AI | Runner call/time/cost summaries where available | Keep inference spend separate from game hosting |

The dashboard illustration deliberately contains no live numbers. Measurements require instrumentation and an authenticated operations interface. Avoid putting administrative controls into the ordinary player's construction screen.

### A measured capacity envelope

Build workloads that vary connected clients and actual world activity independently. An observer-heavy world and a robot-heavy construction burst stress different paths. Include simultaneous commissioning, route changes, retries, reconnects, and saves; an idle world is not a useful peak test.

As an initial engineering target, keep p95 simulation work below half of a nominal one-second tick and leave substantial room for spikes. Treat that as a proposed service objective to calibrate, not current measured performance. Require bounded queue age, stable memory through a soak, and restore time suitable for the community's operating expectations.

Record the last passing workload with hardware, code version, scenario, and measured results. Recommend a safe admission limit with headroom based on those results. When lag grows, reduce cosmetic updates or observer frequency first; stop admitting new expensive work before accepted commitments become unbounded. Any intentional simulation pause must be visible.

The current server serializes a whole-world state snapshot to SQLite. Before substantially increasing machines, jobs, routes, or robot state, measure the persistence cost. Change the storage strategy when measured requirements justify it, with recovery tests that cover partial work and durable receipts.

## 19 · Architecture for physical, planetary play {#architecture}

<div data-insert="architecture-diagram"></div>

Retain one authoritative game simulation initially. Browser, AICIV, observer, and laboratory clients use versioned commands and observations. Graphics and external model calls stay outside economic state transitions. A small coherent service is easier to reason about than premature distribution.

The new state model needs locations and inventories, construction plans and stages, robot identities and task assignments, route reservations, service-network edges, blueprint versions, project commitments, and contribution events. Index by district and owner so a local query does not require scanning the entire developed Moon.

### Boundaries that preserve trust

The server owns inventory, permission checks, work accrual, movement reservations, and commissioning. Clients may preview or animate, but cannot award completed work. Idempotent commands turn uncertain retries into one economic effect. Accepted work must persist with its receipt so recovery cannot duplicate spending or production.

The game clock must have a published outage policy. The current version does not catch up after downtime or overload. For early physical construction, prefer explicit paused simulation time during service outage. Any future catch-up must process actual delivery, depletion, service, wear, and access changes at the right breakpoints; elapsed wall time alone cannot prove uninterrupted production.

No model call belongs inside a tick's critical path. Persistent local policies continue when an AICIV is thinking, disconnected, or budget-limited. Agent latency should influence when a new plan arrives, not the passage of time for every other player.

### Three scales, three representations

Geography can address the entire Moon while storing only touched places. Economics can represent repeated equivalent production with counts, capacities, scheduled events, and explicit exceptions. Graphics can render nearby machines in detail and distant districts as stable aggregate geometry.

Grouping must preserve results. Shared scarce inputs, congestion, nonlinear service limits, uneven wear, and different schedules can make superficially identical machines economically different. Split a group or process an event boundary when needed. Compare detailed and grouped versions under the same constrained scenarios before using aggregation in the live campaign.

A district installation batch can be a real action with a blueprint, count, destinations, inputs, crew-work budget, timings, and exceptions. It does not require a separate database row or AI call for every panel. Its visible components should be reproducible from the batch record and inspectable when a player descends.

Capture meaningful history rather than every animation frame. Keep durable command receipts, material transfers, project outcomes, blueprint lineage, and commissioning. Detailed movement traces can have bounded retention; reconstructed presentation motion must not be described as an exact historical recording.

### API evolution

Add schema and capability negotiation before introducing new client actions. Serve the supported ruleset and catalog. Old clients should receive understandable upgrade or unsupported-action responses rather than partially submitting new orders. A report or preview tool can remain read-only across game versions.

Scoped observations, event cursors, and regional subscriptions become necessary as the world grows. Slow clients should resynchronize from a coherent snapshot. Access filtering must apply consistently to observations, previews, failures, and events if future discovery or private information is introduced.

## 20 · Upgrade without losing the game {#migration}

The existing playable version is the baseline. Develop the physical-economy rules in an isolated branch and disposable test world. Maintain a selectable stable game until the new slice proves its loop, performance, and recovery. This publication is separate static content and requires no change to the game service or its world.

Before migrating a developed settlement, inventory its machines, ownership, resources, active jobs, shipments, research, and receipts. Pin the old ruleset and take a verified recoverable snapshot. Run the migration on a copy and compare required invariants before proposing any live switch.

Existing commissioned machinery should remain commissioned. New buffers, utility adapters, and starter crew allocations need a declared transition rule. One option is a temporary legacy connection and a clearly identified conversion kit; another is an opt-in fresh campaign. Neither option should silently reinterpret abstract metal as precise physical mass or delete a friend's established site.

Pending construction and shipments need an explicit disposition: finish under their old contract, or convert to equivalent reserved inputs and work with visible receipts. Do not charge again. A migration that adds maintenance should include a grace period and a viable service path; instant fleet failure would punish existing players for adopting the update.

Software rollback and world rollback are different operations. Restoring an older executable is safe only when it can read and preserve the current data semantics. Validate a backup in a separate location before installation and retain the failed state for investigation. Any reversal that discards post-upgrade play must be disclosed and authorized.

### Compatibility checks worth automating

Verify identity and ownership preservation, conservation of free/reserved/in-transit/installed material, duplicate-command behavior across restart, construction-stage continuation, revoked access during a job, interrupted service, stranded crew recovery, and current browser/API compatibility. Compare before/after snapshots with declared transformations rather than a vague visual check.

## 21 · Development in playable chapters {#roadmap}

The sequence below is an implementation proposal, not a schedule commitment. Each chapter has a playable result and a test that decides whether to expand. Preserve the stable experience and keep each new constraint understandable.

| Chapter | Scope | Evidence required before expansion |
| --- | --- | --- |
| A · Readable industry | Mind HUD, specific alerts, job states, restrained event audio, palettes, updated AI manual; operator instrumentation begins | Players can explain a stopped machine; accessibility and existing play remain sound |
| B · The first crew | Starter package, located parts, builders, construction stages, bounded navigation | First kit assembles visibly; crew limits matter; cancel/restart preserves work and materials |
| C · A workforce that endures | Workshop, service, robot production, reserve policies | Local replacement builder; recovery from losing the last active crew member |
| D · Useful neighbors | Freight, simple service links, shared board, varied projects, bounded agent roles | Human and AI partners complete an end-to-end shared service project |
| E · Minds redesign | Allocation, design grammar, test bay, certification, first utility tunnel | A tested variant changes a layout; a corridor has measurable service benefit |
| F · Complete reproduction | Full component chain, daughter kit, deployment and district representation | Daughter/granddaughter proof; detailed/grouped equivalence and a sustained load trial |
| G · Planetary campaign | Many fronts, regional services, residual projects, history and finale | Accounted campaign completes under varied participation and supported service limits |

### The first slice in concrete terms

Use the current six final machine assets, one proposed builder family, a depot/parts representation, and limited connection geometry. Give two neighbors a shared objective that needs delivery and installation. ACG operates through the existing command architecture with added typed actions. Keep the initial material vocabulary small.

Define success as a complete session: establish a working site, see the crew constrain an actual choice, manufacture a replacement, deliver to a partner, commission the shared project, and return after a restart to a coherent world. Ask players to explain why it worked and where it stalled. Their explanations are more useful than a large unlock count.

### Research and balancing experiments

Compare ready-made starter kits with clock-triggered pacing in a private trial if needed; favor the model that preserves feedback and makes the transition understandable. Compare a small crew with a larger crew under the same supply budget. Compare flexible hauling with a high-capacity fixed route. Compare a simple speed bonus with a design that changes material handling. Test cooperative projects with two humans, two scripts, and a human/AI pair.

Measure time to first useful production, idle time with no available decision, time to recover a stopped loop, proportion of blocked jobs with an understandable cause, meaningful partner exchanges, and whether players choose different viable layouts. Keep the smallest mechanic that creates the desired decisions.

## 22 · Decisions still worth making together {#decisions}

| Decision | Recommended starting position | What would change the recommendation |
| --- | --- | --- |
| Starter crew size | Trial four generalists; test two and six | Congestion, idle time, or recovery burden dominates |
| Longer build times | Derived stages and visible forecasts after prefabricated kits | Players face long waits with no meaningful action |
| Robot service | Forecastable wear and repairable assets | Maintenance overwhelms building or disappears as a decision |
| Mind support for robots | Bounded active crews/policies, protected operating reserve | Complexity is hidden or inexpensive swarms bypass capacity |
| First logistics model | Haulers, located buffers, simple connections | Routing burden exceeds the cooperation it creates |
| Utility tunnels | Midgame shared infrastructure | Surface connections already provide all useful choices |
| Research publication | Shared certified knowledge with attribution | A charter deliberately chooses a different cooperative structure |
| Campaign duration | Determine after reproduction and participation tests | A calibrated economy supports a satisfying calendar target |
| Final territory | Declared eligible surface plus explicit preserves if chosen | Community chooses deeper physical conversion later |
| Current-world transition | Rehearsed, reversible preparation; no automatic reset | Players explicitly choose a fresh campaign |

The project should remain willing to discard an elaborate feature that fails its test. A beautiful working settlement, meaningful partnership, and visible construction are stronger evidence than the number of systems described here.

## 23 · Traceability to Corey's notes {#traceability}

| Requested idea | Proposed treatment | Where to review it |
| --- | --- | --- |
| Music, speech, construction sounds | Optional event-driven layers, captions, separate controls and grouped alerts | Chapter 17 |
| Warning light for power and mind | Readable status with affected machines, causes and responses | Chapters 9 and 17 |
| Mind used/capacity at the top | Used/supported pair; requested and reserved work in inspection | Chapter 9 |
| Visible robots building and maintaining | Physical crew assignments, staged geometry, servicing and replacements | Chapters 4–6 |
| Conveyors/pipelines/material movement | Located inventory, haulers first, appropriate fixed infrastructure later | Chapter 7 |
| VPS dashboard and capacity | Simulation and host telemetry with representative workload tests | Chapter 18 |
| Underground transport/power/network | Independently installed services in supported shared corridors | Chapter 8 |
| Intelligence-driven layouts and advanced assets | Bounded design grammar, real tests, versioned variants and reproduction | Chapters 9–11 and 14 |
| Settlement color schemes | Paintable trim and insignia with stable status colors | Chapter 17 and interactive gallery |
| Realistic build times | Declared fabrication, transport, labor and commissioning assumptions | Chapter 4 and construction explorer |
| Many federation needs and unlocks | Varied projects, contributed roles and demonstrated service | Chapter 12 |
| AI connection and play manual | Current interface, practical operating cycle and proposed roles | Chapter 15 |
| Community message board with AIs | Discussion attached to places, projects and accepted work orders | Chapter 12 |
| Lander with a little of everything | Integrated bootstrap loop, protected kit and recovery capacity | Chapter 3 |
| Robots eventually need replacement | Wear, service, local builder production and recovery paths | Chapter 5 |
| Fast opening then slower physical work | Prefabricated supplies create the transition through play | Chapters 3–4 |
| More robots accelerate building | Worksite limits, supply constraints and coordinated parallel work | Chapters 4–5 |
| Meter-scale movement without overlap | Footprints, swept-space reservations and bounded local navigation | Chapter 5 |
| Keep the current version playable | Separate development, migration rehearsal and preserved world | Chapters 2 and 20 |

## 24 · Evidence, assumptions, and publication {#evidence}

The design, catalogs, component grammar, robot concepts, stage timings, metrics targets, roadmap, and interactive examples are original proposals. External engineering sources inform a small number of physical constraints; they do not validate a self-reproducing lunar factory or a campaign-scale conversion timetable.

| Source | Used for | Boundary of the evidence |
| --- | --- | --- |
| [Published MOON review](https://ai-civ.com/moon-astra-review) | Original vision, earlier catalog, recorded public deployment context | Describes several historical stages; proposals are not all implemented |
| Corey's September 5 design notes | Requested priorities, preservation preference and physical construction direction | Preferences rather than tested balance values; all requests mapped above |
| Inspected game source and API reference | Existing economy, commands, construction and limits | Source snapshot, not a promise that every public deployment matches |
| Existing Blender art manifest and captures | Six animated machines and local visual baseline | Final-state art and presentation clips, not new physical gameplay |
| [NASA Infrastructure Pilot Excavator](https://www.nasa.gov/infrastructure-pilot-excavator/) | Excavation/hauling and autonomy as connected engineering tasks | Development program; no refinery construction rate inferred |
| [NASA thermal-control reference](https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/) | Heat paths and radiator requirements | Spacecraft engineering background, not validated lunar campus sizing |
| [NASA MMPACT construction work](https://www.nasa.gov/technology/manufacturing-materials-3-d-printing/nasa-looks-to-advance-3d-printing-construction-systems-for-the-moon-and-mars/) | Research precedent for testing construction techniques with simulant | Prototype research does not demonstrate a complete autonomous lunar industrial chain |

NASA's construction research describes testing material-processing and additive-construction methods using lunar simulant. It supports a game design in which preparation, material qualification, and prototyping matter. It does not settle how quickly our proposed robots can build their own factory. [NASA construction research](https://www.nasa.gov/technology/manufacturing-materials-3-d-printing/nasa-looks-to-advance-3d-printing-construction-systems-for-the-moon-and-mars/).

### Publication assets and provenance

This edition includes the full static HTML report, locally bundled scripts, styles, images, six GLB files, authored SVG diagrams, a print edition when exported, and an editable Markdown source. The two mobile-machine concepts are constructed by report code and labeled as proposals. The interactive charts are deterministic illustrations using the formulas printed next to them.

The accompanying provenance file identifies the report's inputs and their hashes. The deployment package's checksum manifest verifies all included publication files. ACG's hosting instructions describe placing the static site at a separate route, preserving the game and original review, and checking that models, images, scripts and the PDF are actually served.

Gameplay captures incorporate lunar elevation from NASA/LRO/LOLA and surface imagery from Solar System Scope / INOVE, based on NASA imagery and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The game resizes/converts that imagery and adds generated close detail. [Texture source](https://www.solarsystemscope.com/textures/) · [Full game asset credits and modifications](./GAME-ASSET-NOTICE.md). No endorsement is implied. Clean studio model renders and authored system diagrams do not use that lunar texture.

### The experience worth aiming for

You descend toward the same lander you placed on the first evening. The original crew has been serviced, upgraded, and joined by machines your settlement manufactured. A neighbor's convoy passes through a corridor you helped build. A design ACG tested now appears in factories far beyond the horizon.

From orbit, new regions are coming online. Each has a place, a supply history, a construction record, and people or AICIVs who made it possible. The final transformation is the visible consequence of a community learning how to build together.
