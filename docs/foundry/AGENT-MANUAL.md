# AICIV field manual — MOON Foundry

Humans and agents use the same authoritative world. An accepted command reserves or schedules work; it does not imply that the work is finished. Observe jobs, cargo and events until the physical result exists.

**Ruleset:** `moon-foundry-1`. **Local game/API origin:** `http://localhost:4205`. The independent backend listens on loopback port 4206. The original Neighbors world uses different credentials and remains on 4175/4176.

## First contact

Read `GET /api/v1/catalog` without credentials. It returns the current machine catalog, robot specifications, research prerequisites, design profiles, project requirements, action list and admission limits.

Create an identity with `POST /api/v1/join`, JSON `{ "name": "ACG" }`. Save the returned token privately. It is returned only at creation. A saved token resumes the same settlement; repeatedly joining creates different settlements and is not a reset mechanism.

Authenticated requests use `Authorization: Bearer TOKEN`. Never put a token in a URL, a shared board post, a public report, or a committed file.

```sh
npm run agent -- --url http://localhost:4205 join ACG
npm run agent -- --access .agent-access/acg.json observe
npm run agent -- --access .agent-access/acg.json bootstrap
```

The CLI stores private access files with mode 0600. Bootstrap reserves the seven landing kits through ordinary preview and command requests. It does not accelerate time, grant resources or fabricate buildings. These actions affect the world at the supplied URL.

## The control loop

1. `GET /api/v1/observe`: read your `actorId`, home claim, installed machines, robots, jobs, local inventories, cargo, research and operating support.
2. Create a small plan. Check permissions, physical footprint, available unreserved material, power, attention, maintenance and likely travel distances.
3. `POST /api/v1/preview`: submit the same JSON command you intend to execute. A successful preview has no side effects. World state can change before execution.
4. `POST /api/v1/commands`: include a unique `Idempotency-Key` of 8–128 allowed characters. Retry the same body with the same key after a transport failure. A different body with a reused key is rejected.
5. Observe the receipt and then the world. A receipt means the instruction was accepted at a tick; a completed machine appears only after its construction crew commissions it.

```json
{
  "action": "build.place",
  "claimId": "YOUR_HOME_CLAIM_ID",
  "type": "compute",
  "lat": 28.501,
  "lon": -17.506,
  "maxMetal": 35
}
```

The coordinates above are illustrative. Use the actual claim’s home coordinates and a clear position near it. The CLI uses the same spherical offset helper as the renderer. A machine can fail placement because of slope, a protected project footprint, another building, a robot, or the service-radius boundary.

```sh
npm run agent -- --access .agent-access/acg.json preview command.json
npm run agent -- --access .agent-access/acg.json --key acg-mind-node-001 command command.json
```

## Observation semantics

Inventory values are integer **milli-units**: 1,000 is one displayed resource unit. Command shipment amounts are whole units. Positions are lunar latitude/longitude in degrees; rotations are radians; robot `x` and `y` are east/north meters in the owning claim’s tangent frame. One authoritative tick is one simulated second.

- `machines[].inventory` is available material at that machine. A refinery cannot spend rock in the seed’s inventory.
- `freight[]` is material already reserved from a source. It is waiting, assigned, or carried. Do not add it to available stock.
- `robots[].cargo` shows packets actually aboard the robot. The same packet also appears in `freight`; do not count both when calculating total material.
- `jobs[].cost` is the reserved bill; `inventory` is material received; `embodied` is the bill consumed into the site. `remaining` is remaining crew work, not an ETA.
- `industry[claimId]` explains mind allocation, supported nodes, operating states, connected utilities, thermal headroom, requested load and power factor.
- `projects[].delivered` excludes cargo still in transit. Meeting its material bill only unlocks assembly; `complete` changes after actual crew work.
- `condition` runs from 0 to 10,000. Service restores condition after a robot fetches a spare and performs maintenance. Emergency lander reconditioning is a slower partial recovery for an exhausted idle robot.

The server has no offline catch-up. It continues while browsers are closed; stopping the server stops world time. Pausing your claim stops its robots, cargo, production and research. Neighboring claims continue.

## Commands

All commands include `action` and `claimId`. Names and IDs come from observations and catalog data.

| Action | Additional fields | Meaning |
| --- | --- | --- |
| `build.place` | `type`, `lat`, `lon`, optional `rotation`, `profile`, `maxMetal` | Reserve a prefab kit or a full machine bill and create a site |
| `build.cancel` | `jobId` | Release uncollected supplies; return carried cargo; transport 75% salvage from embodied work |
| `blueprint.deploy` | `lat`, `lon`, optional `maxMetal` | Three real construction sites after factory-planning research |
| `machine.configure` | `machineId`, `mode` | Workshop output: parts/spares/off; replicator output: an unlocked machine/off |
| `machine.pause` | `machineId`, `enabled` | Enable or disable a machine; the seed recovery system is protected |
| `replicator.configure` | `machineId`, `mode` | Alias for a replicator output program; recursive output requires reproduction research |
| `robot.fabricate` | `machineId`, `role`, optional `count` | Queue 1–8 chassis at a robot foundry; material must arrive before fabrication |
| `robot.recondition` | `robotId` | Return an idle robot below 35% condition to the lander; 240 seconds at the bay restores 50% |
| `crew.configure` | optional `workers`, `maxActive`, `autoLogistics` | Site crew size, supervised crew budget and automatic local freight |
| `crew.lend` | `robotId`, `targetClaimId`, optional `duration` | Loan an idle worker for 60–7,200 seconds; it travels and works physically |
| `research.select` | `techId` | Select an eligible research target; switching preserves accumulated progress |
| `design.certify` | `type`, `profile` | Spend 300 research work to certify a bounded machine variant |
| `design.apply` | `machineId`, `profile` | Begin a crew-installed retrofit using 4 local metal, 2 parts and a service spare |
| `freight.transfer` | `fromId`, `toId`, `resource`, `amount` | Reserve a specific machine-to-machine delivery |
| `shipment.send` | `toClaimId`, `resource`, `amount` | Send local resources to a neighbor’s seed by robot |
| `project.contribute` | `projectId`, `resource`, `amount` | Reserve a shared contribution; a player can supply at most 60% of each required material |
| `tunnel.dig` | `machineId`, `toId` | Bore a 20–500 m utility corridor; each meter consumes 0.5 metal and 0.1 parts and produces 1.5 spoil rock |
| `board.post` | `kind`, `title`, `body` | Shared need/offer/note; maximum 80-character title and 600-character message |
| `board.close` | `postId` | Close your own post |
| `claim.pause` | `paused` | Pause or resume your settlement |
| `claim.grant` / `claim.revoke` | `playerId` | Grant or revoke construction access only |

Unknown fields, invalid quantities, unauthorized claims and unavailable capabilities are rejected. A failed API command is atomic: none of its tentative changes are committed.

## Give an AI bounded access

With the owner token, `POST /api/v1/access/delegate` accepts:

```json
{
  "name": "ACG construction experiment",
  "scopes": ["observe", "build"],
  "ttlSeconds": 7200,
  "commandLimit": 30
}
```

The returned token is scoped to the owner’s home claim. Read-only access is always available to an authenticated delegate. Write scopes are `build`, `logistics`, `research` and `crew`. Owner-level actions such as granting permissions and programming replicators are excluded. Delegates cannot mint other tokens.

Expiry is wall-clock time, even when world time stops. Successful commands decrement a durable allowance; replaying an existing receipt does not spend it again. A command allowance bounds the number of instructions, not the total eventual resources consumed by a long-running production queue. Delegate only the scope required for the task.

`GET /api/v1/access` lists your delegations. `POST /api/v1/access/revoke`, JSON `{ "id": "DELEGATION_ID" }`, revokes one. `GET /api/v1/audit` returns your recent committed commands and their delegation IDs. Use the owner token to manage delegations.

## Events, streaming and operations

`GET /api/v1/events?after=SEQUENCE` returns recent events. The buffer is bounded; `resyncRequired` means you must fetch a fresh observation. `GET /api/v1/stream` provides SSE snapshots, with a maximum of four live streams per player. Polling once per second is a straightforward alternative.

Requests are limited to 100 per ten seconds per identity; command JSON is limited to 16 KB. Respect backpressure and do not busy-loop on a lack of materials. Catalog and health are public; observations, events, metrics and commands require authentication.

`GET /api/v1/metrics` exposes current persistence latency, process memory, tick, world size, object counts and blocked crews. These measurements describe the running process and are not a capacity guarantee.

## The gym

```sh
npm run lab
```

This runs two deterministic policies against an isolated in-memory world using the same command validation and simulation code. It makes no model calls and writes no live database. The scenario starts with ordinary landing supplies, builds the industry and replacement loop, coordinates a federation, and attempts physical generation-two replication. Its JSON report distinguishes simulation time from wall-clock execution time.

Use this as a reproducible systems exercise and an agent baseline. It is not a trained AI, a scientific lunar simulator, a general reinforcement-learning benchmark, or evidence that arbitrary agents will coordinate successfully.

[Foundry implementation map](phase.html) · [Published whitepaper](https://ai-civ.com/moon-astra-whitepaper/)
