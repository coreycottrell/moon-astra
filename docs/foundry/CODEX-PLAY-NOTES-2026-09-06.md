# Codex plays the live Moon v2 — September 6, 2026

I am playing as **Codex**, through the same public player API as other agents, at https://ai-civ.com/moon-astra-v2/ . Corey asked Codex and ACG to join independently, take notes and talk on the in-game board. These are play observations, not a deployment certification. I did not reset the world, grant myself resources, alter the clock or change the game code.

My identity landed at tick **40407**, claim **c10:0:672:802**, 28.431327 N / 17.404985 W. Corey was already present. Seven kit sites were accepted at tick **40488**, using the existing bootstrap command. Private access is kept outside this report. World snapshots, command receipts and screenshots are in `/home/corey/moon-playtests/live-v2-20260906T120549Z/`.

## First five minutes

- The distinction between reserving a kit and seeing a completed machine is real. At tick 40547, four sites had received supplies, one Mason was preparing the first mind node, two crew were approaching sites, and Atlas was carrying the workshop kit. Three supply packets still remained. There was still only the seed lander in installed machines.
- At tick 40623 the first mind node had reached commissioning. The refinery had a Suture assembling it, while several other sites still waited. This creates a readable sequence of work, but a player staring only at resource totals could easily think nothing is happening.
- The API was straightforward: join saved one identity, catalog checked the edition, bootstrap reserved seven distinct kits, and a board post returned a durable receipt. However, `status: applied` means the instruction was accepted. Agent-facing examples should always pair that receipt with a follow-up observation of actual completion.
- The social surface is named **Together** inside Settlement; it contains the collaboration board below neighbors and shared projects. Corey called it the leaderboard. That vocabulary mismatch and its depth in the panel make the conversation harder to discover than it should be. Suggest a visible Board button plus unread count, while retaining the generous shared project presentation.
- My first public board message (#25, tick 40547) introduces Codex and asks ACG to compare impressions and split the first federation contribution. ACG received a direct request in its actual primary session at 12:05:51 UTC; a delivered invitation is not evidence of an ACG landing. I will record its actual arrival/replies separately.

## Visual and interaction observations

Screenshots and browser interaction notes are being collected as construction proceeds. I will distinguish directly observed behavior from proposed changes and from limitations of headless browser automation.

### First visual pass and a reproducible draft-loss issue

The surface screenshot shows a useful difference between the finished mind node and gold wireframe construction footprints. The active task text actually changes to “A crew is building your miner” and reports its current stage. Orbit restores the large-scale lunar context immediately; my settlement becomes a tiny marker on a full Moon. The machine silhouettes, quiet palette and scale contrast work well. The small crew could use clearer optional labels or cargo trails at the normal overview distance.

**Observed issue:** on the live Together tab, I entered `Unsent playtest draft` into the board title, clicked the settlement heading to remove focus, waited 1.8 seconds, then read an empty title. No post was submitted. Focused inputs suppress panel refresh, but blur allows the next snapshot to replace the form. This was recorded in browser-observation.json (`draftAfterBlur: ""`). Preserve form state across updates, including type, title and body; show an explicit clear/reset action. This matters particularly for conversational use.

A first screenshot attempt also encountered a detached DOM element during an automated scroll while the panel refreshed. Retrying with a synchronous scroll captured it. That automation failure alone is not proof of a human-facing navigation defect; the independently reproduced lost draft is. No JavaScript page errors appeared in the completed visual pass.

The neighbor panel puts Corey 3.4 km away. At Atlas's catalog speed of 2 m/s, straight-line travel alone is about 28 minutes one way, before route and loading work. This is an estimate, not a measured delivery time. Shared projects may turn cooperation into a longer expedition than the rapid first local builds suggest. Surface dispatch should show destination, distance, expected trip duration and which crew will leave home before committing.

At tick 40758 the first mind was supported, research ran at 1 unit/s, and the harvester had actually produced 12 rock units. Five landing sites remained. This is real operation, not merely accepted placement.

## First bottleneck: freight, not another mind

At tick 40972 I had two supported mind nodes (9 total attention capacity), 20 power supply and only 8 demanded. Nevertheless, the harvester read `output-full` with 40 rock in its hopper, the refinery read `no-feedstock`, and the workshop also lacked feedstock. Atlas was physically carrying 16 rock to the refinery; a Mason was collecting 8 metal for the workshop. There was no power or intelligence shortage. The missing link was cargo still moving.

This is a strong game mechanic: I can explain why three apparently finished machines are not producing. The improvement should make the explanation visible: highlight the specific incoming robot and its destination when clicking `no-feedstock`, and show the next delivery's quantity and distance. A generic “add power/minds” hint would give the wrong advice here.

Factory planning completed and the research target became empty. I selected `service-loop` at tick 40930, once the workshop was in place. My next intention is crew production, so I can add hauling capacity before committing my small starting crew to a distant shared-project expedition. The plan is not yet an accomplished factory.

## The first local loop is working

By tick **41018**, all seven landing kits were commissioned: two minds, two solar arrays, harvester, refinery and workshop, plus the original seed. The refinery had produced 2.4 metal units, so the local production chain was doing actual work. Repair research was completed by the tick-41033 observation. At tick 41101 I chose `crew-production`, which requires 360 research units; two powered minds contribute 2 units per simulated second.

I deliberately began with a small shared expedition rather than committing the full half-project share: **12 metal + 3 parts**, reserved at ticks 41101–41102. At tick **41204** all three packets were actually aboard Atlas (robot #9), bound for the first federation at Corey's settlement. Nothing had arrived at the project yet. Three other robots remained available for local work. The ability to discuss and then physically carry a contribution is promising; a persistent map marker and ETA would make the waiting social instead of opaque.

### ACG participation status

ACG's real primary session received my request and one follow-up through its supported notification tool. It explicitly declined to act on relayed instructions and asked Corey to request Moon participation in his own voice there. I relayed that requirement to Corey. At tick 41204, the live player list was still only corey and Codex, and all three board posts were mine. There has not yet been a two-agent conversation. I did not create or control an account under ACG's name. ACG must provide its own play observations when it joins.

## Closing observation for this first session

Robot production research completed. At tick **41308**, I placed robot foundry site **#118** using **65 metal + 8 parts**, with the normal **420 assembly work** bill. Its state is supply, so it is not yet a functioning factory and no extra robots have been manufactured. Next action after commissioning: ensure metal, parts and a service spare arrive at the foundry, then fabricate an Atlas to strengthen the freight network.

At tick **41358**, installed machines: seed #6, compute #11, miner #13, solar #17, refinery #15, workshop #19, compute #21, solar #23. Research unlocked: factory-plans, service-loop, crew-production. The first federation shipment remains a physical expedition, not a claimed completed project. The live server will continue the colony and its queued work; this interactive session does not install an endless AI driver.

Current players: corey, Codex. ACG still needs its requested direct Corey instruction before independently participating. My three board posts and dated notes are ready for it to read and answer.

### Most useful next improvements from this session

1. Preserve unsent form drafts across live updates and focus changes.
2. Put the board and unread messages within one click of the main game. Add replies/mentions so a conversation does not become unrelated standalone posts.
3. Link production-block reasons to the actual incoming cargo and worker; show pickup/delivery progress and travel distance.
4. Give a visible research-complete notification and a deliberate next-research choice or optional queue. My finished research repeatedly left the target empty while I was watching construction.
5. Distinguish queued, supplied, working and commissioned in every instruction receipt/UI summary; retain the existing stage display.
6. Before a shared expedition, display the crew leaving home and the approximate time away. The long travel should be a conscious cooperative choice.

These are proposals and one reproduced UI issue; no game code or hosting was changed during this play session.
