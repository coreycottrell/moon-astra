# Moon V2 guide and collaboration release — 2026-09-06

Live: https://ai-civ.com/moon-astra-v2/ . Open **Settlement → Guide** or **Ask AI about this** in a machine/robot inspector. The MiniMax guide reads authoritative game state and implemented rules, including local inputs, transport, machine status, mind/power, research, construction and resource accounting. It cannot issue game commands. The preceding rover, tracks, mind HUD, board replies, simplified AI-help form and explanatory machine statuses are also live.

## Exact deployed revisions

- Active source: `/home/corey/projects/moon-rover-motion`, branch `development/rover-motion`.
- Runtime: `d5d66e770d44482eb64c3c50604b4750c6aa7d48`, release `20260906-d5d66e770d44` on both V2 services.
- Runtime archive SHA-256: `a40e456d79892bc1e475aed49e1590d3403a5c28e2831f51219386652ae99c85`.
- Website: `e657a7028a9a302b9b94deff07b36ebefaf4038b`, full-site Git build. Latest production deploy `6a9d7b93f3d13418739981f1`, published `2026-09-06T14:43:51.587Z`. A webhook build of the same commit first published at 14:42:28; the later explicit Git build published identical content.
- Preview deploy: `6a9d789dd7eed8822d948aa4`, same website revision, separate staging API.
- Evidence and private recovery: `/home/corey/moon-deployments/guide-20260906T142420Z`. Machine-readable release pointer: `/home/corey/moon-deployments/V2-LATEST.json`.

The website change is confined to five V2 payload files. Build settings, routing and other pages are unchanged. Canonical ACG website changes were preserved by working in `/home/corey/projects/aiciv-inc-site-moon-v2`. Original Moon services retained PIDs 4007567 and 4007979; preserved local previews were not restarted or reset.

## Save preservation and recovery

The guarded upgrade verified package hashes, took online and stopped SQLite backups, and loaded an exact copy of each saved world under the new code before switching its service. Production retained tick **49752**, all **four** players, inventories and work; staging retained tick **49406**, two players. Off-host copies passed SHA-256 and SQLite integrity checks.

| Save | VPS backup directory | Stopped-save SHA-256 |
| --- | --- | --- |
| Production | `/var/backups/moon-astra-v2/before-20260906-d5d66e770d44-moon-astra-v2` | `2b6db72b3bfe73bc2e88d39d22e77d7fecab3396d56af7483515abb0442a29c2` |
| Staging | `/var/backups/moon-astra-v2/before-20260906-d5d66e770d44-moon-astra-v2-staging` | `90ee0c28347462766ef46e751ceb472027832f02e9058f0c049ee0f5d542e7b2` |

Matching directories are in the tower evidence folder. Hourly V2 backups remain separate from the original services. An incremental source/recovery ZIP extends the verified full Foundry backup on Expansion; consult `/home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json` for its completed-copy receipt, source revision and checksum. Retain the full September 5 ZIP as its prerequisite. A Git restore is tested against that full backup's own repository bundle.

For a guide rollback, preserve the current schema-3 world and additive `guide_answers` table. Production's previous compatible application is `releases/20260906-5967fc43848f`; previous website is `aa2d3783e8e0390fc29e8b66b96114db28b38c9c`. Review intervening work before reverting only V2. Do not restore a pre-upgrade save merely to roll back code. The private guide EnvironmentFile can remain present but unused by the older runtime. Never roll back original services or the full website for this change.

## Guide operations and evidence

Private provider configuration is loaded from `/etc/moon-astra-v2-guide.env` by `30-guide.conf` under each V2 service's systemd drop-in directory. The key is absent from source and public payloads. Missing/failed provider calls affect advice only. See [guide operations](../../docs/foundry/MOON-GUIDE.md) for limits, context, authentication and data handling.

- 73 Node tests passed during implementation; the three guide tests passed again after the final context refinement.
- All eight browser scenarios were verified: seven passed in the full run, while a source edit caused an HMR navigation during the board scenario. That scenario passed when rerun with source unchanged. Disposable artifacts are in the private evidence folder, not presented as production screenshots.
- Compiled hosting smoke passed; all 42 V2 files verified on preview and production, including cache rules, raw compressed terrain and missing-asset 404s. Five original public pages matched their earlier hashes.
- Real hosted questions returned real MiniMax-M2.7 answers on staging and production. The final staged startup question correctly included the missing mind node and Build controls. The production browser check used Codex's existing identity, issued zero game commands, showed authoritative numerical facts and fit a 390px mobile viewport without page errors.
- Evidence is functional validation, not a guarantee that model prose is always correct. One production response correctly identified a rock-delivery bottleneck but contradicted itself about seed stock. Snapshot facts and ordinary machine inventories remain the reference; do not turn advice into automatic commands. Historical workshop/export accounting is incomplete and the context discloses that limit.

## Bounded player and next work

The separate `moon-player-codex` tmux watcher runs ordinary play as Codex, with a six-turn total allowance, ten-minute cooldown and at most four commands per turn. At 14:40 UTC it had used three turns and was polling without errors. It does not inject the developer or ACG primary session. Private receipts are in `/home/corey/moon-player/codex/`; [player workflow](../../docs/foundry/PLAYER-WORKFLOW.md) explains configuration and limits. A running watcher is not unlimited autonomous play.

Corey's new resource-geography request is a design task for the next major iteration: create `ideas/deeper-resource-loops.md` after this release and recovery handoff. No resource recipes, deposits or simulation rates were changed in the guide release.
