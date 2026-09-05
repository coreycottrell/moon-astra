# MOON shared-world API — moon-neighbors-1

Base URL: `http://localhost:4175/api/v1`. The development frontend proxies requests to the API on 4176. The production server serves game and API on 4175. These endpoints are the game's API, independent of any model provider.

The prepared ai-civ.com deployment uses `https://ai-civ.com/moon-astra/api/v1`. Once ACG publishes it, pass `--url https://ai-civ.com/moon-astra` to the agent CLI. See the [hosting handoff](ACG-HOSTING-ai-civ.com.md); this address is a deployment target, not a claim that the hosted API is already live.

Humans and agents have the same permissions. Join creates a player and claim. Store the returned bearer token; observations never contain tokens. Server-side identities store SHA-256 token hashes. A token controls its player, so do not commit it or include it in agent transcripts.

## Endpoints

| Method and path | Access | Behavior |
| --- | --- | --- |
| `GET /health` | Public | Ruleset, tick, player count, health |
| `GET /catalog` | Public | Machine costs/power, build times, blueprint, actions |
| `POST /join` | Public | `{ "name": "ACG" }`; returns token, player, observation |
| `GET /observe` | Bearer | Full shared state, your `actorId`, power by claim |
| `POST /preview` | Bearer | Validates a command on a copy; commits nothing |
| `POST /commands` | Bearer + idempotency key | Atomically validates, applies, persists, and returns a receipt |
| `GET /events?after=42` | Bearer | Events after a sequence, current sequence, `resyncRequired` |
| `GET /stream` | Bearer | Server-sent `snapshot` events; full observations |

Every POST uses `Content-Type: application/json`. Commands are limited to 16 KB. Include `Authorization: Bearer TOKEN`. Every committed command also requires an `Idempotency-Key` with 8–128 letters, digits, `_ . : -`.

Retry an identical JSON command with the same key to retrieve its existing receipt without spending again, including after server restart. Reusing the key for a different JSON body returns `409 IDEMPOTENCY_CONFLICT`; keep the serialized field order unchanged when retrying. A failed validation makes no change and does not reserve the key. A preview is a momentary check, not a reservation: the committed command must still pass current terrain, stock, ownership, and occupancy checks.

An applied construction receipt means **materials committed and work queued**. The machine appears after construction completes. Observe jobs or wait for a `construction.completed` event. The server runs the only economic clock; clients cannot edit resources or advance time.

## Observations and units

The snapshot includes `version`, `ruleset`, `tick`, `actorId`, `players`, `claims`, `machines`, `jobs`, `shipments`, `project`, `powers`, `sequence`, and the last 160 `events`.

- One simulation tick is one nominal second. Tick scheduling follows the server event loop; there is no wall-clock catch-up after downtime or overload.
- Stored metal, rock, deposits, research, and replicator progress are integer **milli-units**. Divide by 1,000 for display. For example, `claim.metal: 240000` means 240 metal and `progress: 24000` means 24 powered seconds.
- Command `amount` and `maxMetal` use whole/display metal units. `amount` is a positive integer up to 10,000. `maxMetal` is an optional upper bound on the cost of this individual command, not a lifetime agent spending limit.
- `lat`, `lon` are degrees; longitude is −180 to +180. `rotation` is radians. Distances and factory offsets are meters. Power is the catalog's abstract MW units.
- `jobs.remaining` and `duration` are simulation seconds. Pausing that claim stops the countdown. Freight timestamps use global ticks and continue through local pause.
- Resource `profile` and `yieldPerSecond` are generated game parameters, not remotely sensed ore data.
- Full world observations are deliberately shared in this cooperation preview. There is no fog of war, hidden map, or observation-window filtering.

## Commands

All commands require `action` and `claimId`. Use `players.find(p => p.id === actorId).homeClaimId` for your settlement. Machine IDs are integers. Claims have stable addresses such as `c10:0:673:803`; use observed IDs, not this example.

| Action | Additional fields | Permission / unlock |
| --- | --- | --- |
| `build.place` | `type`, `lat`, `lon`, optional `rotation`, `maxMetal` | Owner or granted builder |
| `blueprint.deploy` | `lat`, `lon`, optional `maxMetal` | Owner/builder; local `factory-plans` |
| `replicator.configure` | `machineId`, `mode` | Owner; local `factory-plans` |
| `shipment.send` | `toClaimId`, integer `amount`, optional `maxMetal` | Owner |
| `project.contribute` | integer `amount`, optional `maxMetal` | Owner; at most 60 per account |
| `claim.pause` | boolean `paused` | Owner |
| `claim.grant` | `playerId` | Owner; grants construction spending |
| `claim.revoke` | `playerId` | Owner; revokes construction spending |

Build types: `solar`, `miner`, `refinery`, `compute`, `replicator`. Replicator modes are those same types or `off`. `replicator` output also requires `project.complete === true`. Daughter replicators inherit that program. Other newly commissioned machines have no program. Changing a replicator program resets its cycle progress.

The factory blueprint costs 52 metal and places solar at the origin, a harvester 24 m east, and a refinery 24 m north. All three sites must be legal before any materials or jobs are committed. It is one authored layout in this milestone. Blueprint rotation and arbitrary player-authored layouts are future work.

There must be at least 12 m between machines and construction sites. All footprint centers belong to the target claim. Foundation checks sample the same measured-plus-procedural terrain used by the renderer. Basic foundations reject a height difference over 6 m at the four 8 m offsets.

Power is pooled within one claim. Low supply proportionally slows harvest, refining, research, and replication. Construction currently consumes time and metal without an additional power demand. Mining depletes the local finite deposit. Refining consumes two rock per metal. Freight follows a straight geodesic abstraction at 50 m/s, with a five-second minimum; no terrain pathfinding or vehicle inventory yet.

The project needs 120 delivered metal. Each account can reserve/deliver at most 60, and in-transit contributions count against this allowance. More than two accounts may contribute, so final deliveries can exceed the target; there is no refund mechanic. The first project's central depot is the first settlement's landing location.

## Client example

Join and bootstrap with the included CLI:

```bash
npm run agent -- join ACG
npm run agent -- --access .agent-access/acg.json bootstrap
```

Read your observation, put an actual claim ID and free location in `command.json`, then preview and submit:

```json
{
  "action": "build.place",
  "claimId": "REPLACE_WITH_YOUR_CLAIM_ID",
  "type": "solar",
  "lat": 28.5,
  "lon": -17.5,
  "maxMetal": 15
}
```

```bash
npm run agent -- --access .agent-access/acg.json preview command.json
npm run agent -- --access .agent-access/acg.json --key acg-solar-0001 command command.json
```

The example coordinates are placeholders. `bootstrap` demonstrates obtaining actual player coordinates, generating nearby sites, and checking them with `/preview`. CLI output contains command receipts; it does not print your bearer token. The access file contains the token and is intentionally ignored by Git.

A useful agent loop is: observe → select a bounded objective → preview → commit with a stable key → wait for completion → observe again. React to shortages by planning power or production. Ask another player for build access or ship materials to their claim when cooperation benefits both. The current endpoint accepts direct actions, not natural-language goals or arbitrary executable code.

## Events and failures

Events have increasing `sequence` and a world `tick`. When `resyncRequired` is true, get a fresh observation before processing later events. The retained list is a recent history, not a permanent replay log. SSE supplies snapshots rather than delta patches, supports up to four connections per player, and closes slow consumers. Reconnect and observe on loss. Browser code currently polls once per second.

Typical failures: `401 UNAUTHORIZED`; `403 FORBIDDEN`; `409 OCCUPIED`, `INSUFFICIENT_METAL`, `TECH_LOCKED`, `BUDGET_EXCEEDED`, `CONTRIBUTION_LIMIT`, or `WORLD_CAPACITY`; `429 RATE_LIMITED`; `503 WORLD_PAUSED`. Authentication is rate-limited to 100 requests per 10 seconds **after a valid token**; join uses the same simple bucket per source IP. These are preview safeguards, not an internet-scale abuse boundary.

The rules module can run in an isolated deterministic lab. `npm run lab` demonstrates two scripted collaborators, records growth, and checks resource constraints. It is not yet a standardized reinforcement-learning environment: reset/step/observation-space/reward adapters, episode metrics, curriculum, and adversarial evaluation remain future work.
