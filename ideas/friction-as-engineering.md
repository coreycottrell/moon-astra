# Friction as engineering

Corey’s standing design principle, 7 September 2026: when in-game friction appears, first consider a gamified solution as if we really lived there.

Make the problem observable, offer an immediate limited response, then let research and physical construction produce a much better solution. Players should recognize the infrastructure they built as the reason life got easier.

## Tunnel progression

Already live: basic lines carry one robot; researched convoys carry three in one direction; passing-bay lines carry four with direction limits; twin tunnels carry eight. All share physical elevator constraints. Depot connection bays progress from two to four to six. The excavation bore, corridor and terminal elevators are distinct machines/infrastructure: a large bore model does not mean a wide travel tunnel.

Proposed next progression, not yet built:

| Pressure players encounter | Immediate agency | Research and construction response |
| --- | --- | --- |
| A single occupied line | Choose another route or wait with an honest queue indicator | Existing convoy and passing-bay upgrades |
| Opposing traffic | Schedule departures by direction | Existing twin tunnels, followed by automated dispatch |
| Elevator bottleneck | Close new entry, clear arriving robots, use a holding area | Larger platforms, multiple shafts and separate arrival/departure lifts |
| A circular wait | Manual traffic-controller recovery: stop entry, release stale bookings and back a robot out physically | Observatory-informed dispatch and automated deadlock avoidance |
| Large freight volumes | Batch cargo and separate busy producers | Freight trains, conveyors/pipelines for suitable materials, parallel corridors |
| Networks too busy to manage manually | Inspect route utilization and incomplete deliveries | Federation traffic control, predictive reservations and expandable trunk routes |

The endgame can feel effectively unlimited relative to an early colony, while staying finite and measurable. Widen lanes, shafts and loading capacity together; otherwise a huge tunnel merely moves its queue to one tiny elevator. Late-game bottlenecks can shift toward power, heat, maintenance, regional production and coordination. Do not grant literal infinite robot capacity or waive cargo conservation.

## Retrofitting an occupied route

The current API rejects upgrades on occupied routes. A future player-visible retrofit plan therefore needs: stop new admission → drain arrivals → recover a blocked vehicle if necessary → close the route → deliver materials → perform the retrofit → commission and reopen. Every phase should show its reason, workers and remaining physical work. Cargo, positions and progress survive a restart; recovery does not delete a paid delivery.

Manual safe recovery should be available before expensive research. Automatic dispatch is the earned convenience. A player with a frozen economy must not need that frozen economy to manufacture their only escape.

The observed September 7 depot deadlock is a useful scenario for this progression, but it also exposes a basic correctness defect: far-away entrance waiters reserve all destination loading bays, preventing local robots from clearing the lift exit. Releasing those premature reservations cleared the copied-world queue. Preserving normal congestion does not require preserving permanent circular waits. No traffic-rule change is deployed by this document.

## Apply the principle beyond traffic

- Maintenance friction can reveal the value of spare caches, mobile workshops and more durable designs.
- Variable resources can motivate surveys, specialized harvesters, refining chains and regional cooperation.
- Thermal limits can lead to radiator geography, heat transport and improved computing designs.
- Attention limits can motivate observatories, learned operating procedures and supervised automation.
- Difficult construction can motivate staging yards, graded roads and prefabricated modules.

For each proposal ask: can players see the cause, act before the research unlock, measure improvement, and recognize a new capability after commissioning? Interface panels collapsing during an update fail at the first step and should simply be repaired.
