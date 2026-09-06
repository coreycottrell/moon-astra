# Moon Guide

Open **Settlement → Guide**, or select a machine/robot and choose **Ask AI about this**. MiniMax answers from a fresh authoritative observation. Chat survives panel changes and polling in the current tab. New conversation clears local chat history. Answers carry a snapshot tick and numerical facts; the world may advance while the model answers.

The guide can explain and suggest. It has no game-write tools, filesystem, email or host access. Use ordinary game controls to act. Suggestions are not command receipts or completed deliveries.

## State and rules

Context includes machine programs, queues, local inventories, condition and reasons for inactivity; mind allocation and crew reservations; connected power and cooling; robot tasks, cargo and maintenance; construction; freight destinations; research prerequisites; projects with personal contributions distinguished from all players; neighbor summaries and recent board/events. Quantities are converted to whole game units. Costs, recipes and prerequisites come from implemented rules, not the whitepaper.

Metal context separates available stock, reserved cargo, installed-building cost, known refinement counters and workshop recipes. Combined historical workshop output and completed exports are not a complete per-player accounting history; the model must not invent it. Large snapshots include up to 220 local machines (non-operating first), 180 freight records and 100 sites; focused entities are included separately and counts disclose omissions. Other settlements are summaries.

## Private provider configuration

The server reads `MOON_MINIMAX_API_KEY` and optional `MOON_MINIMAX_MODEL` (default `MiniMax-M2.7`). Tower credential file: `/home/corey/moon-secrets/minimax.env`, mode 0600 inside a 0700 directory. The deployed copy is `/etc/moon-astra-v2-guide.env`, mode 0600, loaded by `30-guide.conf` in each V2 service's systemd drop-in directory. Original Moon services do not load it. Never copy provider credentials into source, browser assets, logs or shared notes.

Uses MiniMax's [OpenAI-compatible API](https://platform.minimax.io/docs/api-reference/text-openai-api), fixed endpoint `https://api.minimax.io/v1/chat/completions`, separate reasoning output, maximum 2048 completion tokens. Reasoning is not displayed or stored. The provider key is not in model context. Questions and relevant game state go to MiniMax, as stated beside the chat form.

## Authenticated asynchronous API

- `GET /api/v1/guide/status`: configuration and daily allowance.
- `POST /api/v1/guide/ask`: `{question, history?, machineId?, robotId?}` and unique Idempotency-Key; new requests return 202 with `{id,tick,status:"pending"}`.
- `GET /api/v1/guide/answers/<id>`: owner's pending, complete or failed answer. Other players receive 404.

Owner access or delegated `observe` scope is required. Questions do not consume game command allowances. History: six user/assistant messages, each at most 2000 characters. Question: at most 1200. Same request keys deduplicate before billing. Limits: 30 attempts/player/UTC day, 100/world/day, two concurrent provider requests, one per player, five seconds between questions. Failed provider attempts count since they may incur work. Allowances survive restarts.

Asynchronous jobs avoid website proxy timeouts and do not block world ticks. Provider deadline: 75 seconds. Pending jobs become explicit interrupted failures after restart. The additive SQLite `guide_answers` table stores request digest, answer, usage, owner, tick and time; it does not store questions or supplied conversation history. World schema/economy remains 3. Monitor storage with normal backups.

Tests cover authentication, ownership, idempotency, rejected system-role history, private error handling, durable limits and no game-state changes. Browser tests cover draft retention, tab changes, escaped model text and mobile layout. Check real provider quality on captured state, then the staging proxy. Take and restore-test a fresh save before a V2 runtime update. A client rollback must preserve the live world database.
