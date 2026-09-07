# Moon development log

## 2026-09-06 — rover driving and collaborative play release

Active source: `/home/corey/projects/moon-rover-motion`, branch `development/rover-motion`. Preserve the old local Foundry preview at `/home/corey/projects/moon-foundry` and the original Neighbors game. User authorized isolated V2 deployment with backups and no save reset.

Runtime source `5967fc43848f3f5a399f6676d5722ce490077776` is installed on both V2 services. Production restored the exact saved world at tick 46783, with three players. Original Moon services retained PIDs 4007567 and 4007979. Website source `4bde237d3fcbb3cc54ed30761889a96b9c0f9a49` published via the full Git build at 13:52:58 UTC, Netlify deploy `6a9d6fddc54eb200089db74f`. No root website configuration or unrelated files changed. Production browser and file verification are running at this entry.

Features: continuous rover motion with distance-driven wheels and terrain alignment; bounded local regolith tracks; mind used/free HUD; threaded board replies with drafts preserved; simple AI help dropdowns (neighbor, request, build/resource/role/project option, quantity, whose supplies). Help requests create directed board threads and await a response; they do not silently spend supplies or grant construction access. Advanced token controls are collapsed.

Validation completed before promotion: 67 Node tests, all seven browser tests, final compiled hosting smoke, all 42 preview files, actual hosted rover driving/terrain, board replies and help form. Screenshots and test records: `/home/corey/moon-deployments/rover-motion-20260906T124824Z`.

Fresh production and staging SQLite backups passed integrity checks, exact-state restoration, and off-host hash verification. Production backup: `/var/backups/moon-astra-v2/before-20260906-5967fc43848f-moon-astra-v2`; matching copy is in the tower evidence directory. Application rollback must preserve the current schema-3 database. Never restore an old save merely to revert client code.

### Next user request, after this deployment finishes

Corey reports his replicator and robot foundry show **OFF** despite apparently sufficient power/mind. Inspect his actual public game state read-only, trace the allocation and operation reasons, and make every OFF status explain its cause (including mind/power, paused colony, missing inputs or no queued work as applicable). Show actual used/free capacity; do not guess or change his colony configuration. Finish current deployment before this follow-up, as he explicitly requested.

### Persistent player follow-through

Watcher and bounded separate Codex planner are implemented in `scripts/moon-watch.mjs` and `scripts/lib/bounded-player.mjs`; instructions in `docs/foundry/PLAYER-WORKFLOW.md`. Not started at this entry. Planned dedicated session `moon-player-codex`, private config/logs `/home/corey/moon-player/`; max six total turns, four normal game commands per turn, ten-minute cooldown, no dev/ACG pane injection. Confirm a real run before claiming it is active.

ACG has now joined independently and left a federation proposal in board post 1162; read `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md` for its actual notes. Do not fabricate ACG play or inject its primary session. Append the final release and player-workflow handoff to that shared note.

Production checks finished: all 42 files verified; original five public pages unchanged; browser landing, both crew galleries, documents and mobile passed. The initial rollout is complete.

At tick 47001 Corey had 9 total / 5 used / 4 free mind slots and 80 supplied / 16 demanded power. Replicator #996 had mode `off`; foundry #966 had no queue. Neither was disabled or capacity-blocked. The frontend follow-up now explains every allocation state in the inspector and Industry list, including exact local input shortages and mind requirements. Regression checks and a no-write replay of this actual observation passed. No simulation change or backend restart is needed. Publishing this follow-up together with the public review devlog entry is in progress.

The dedicated `moon-player-codex` session is running. First actual plan completed at 13:59:10 UTC: two recovery previews returned ROBOT_BUSY and made no change; freight-network research was accepted and a real reply #1933 was posted under ACG thread #1162. Notes and receipts are in `/home/corey/moon-player/codex/last-player-run.json`. Guarded rejections are not completed repairs. Five of six turns remain, with ten-minute cooldown.

### New request — MiniMax in-game guide

Corey wants an AI he can talk to inside the game, using MiniMax, with an excellent view of state, conditions and systems so it can explain problems and suggest next steps. He will provide a dedicated API key. Finish the OFF-status publication first. Then build an authenticated, read-only guide with comprehensive server-derived context: machine reasons, resource locations, cargo, crew tasks/condition, power/mind/thermal allocation, queued construction, research prerequisites and shared projects. Keep the key server-side in a private environment file, never client source or logs. No key received at this entry; do not invent a working provider connection. Request/activate the credential only after a concrete implementation is reviewable. Test with a mock provider before any paid calls. Record usage limits and give answers the observation tick so stale advice is recognizable.

Remaining operator work: finish OFF-status publication; implement the requested MiniMax guide; update this log and release record; push source fork; save an incremental recovery bundle plus ops notes to Expansion. Preserve all existing local previews, Corey's save, and ACG's dirty canonical website checkout.

## 2026-09-06 14:19 UTC — status update live; MiniMax guide implementation

Machine status follow-up is live and all 42 production files verified. Site main `aa2d3783e8e0390fc29e8b66b96114db28b38c9c`, Netlify `6a9d74cd20a757000824d28c` published 14:13:33 UTC. Original five pages remain byte-identical; runtime remains 5967fc4. Public review devlog was separated because the existing full-page privacy scan spent several minutes at full CPU without completing. Only that task's scan was stopped; no gate was bypassed. Draft is private evidence `review-with-new-devlog.html`; local log and shared ACG note are updated.

Corey's metal question was answered from tick 47974: 240 landed + 230.9 refined = 202 installed buildings + 232 workshop metal at its observed parts recipe (116 parts) + 24 federation delivered + 7.7 reserved cargo + 5.2 available. Exact conservation residual zero. He independently switched the workshop off and queued a robot. Both harvesters were full and the refinery awaited physical rock delivery. No changes to his colony were made by this developer.

User supplied the dedicated MiniMax credential and explicitly asked us to install it. It is saved privately at `/home/corey/moon-secrets/minimax.env` (0600, directory 0700). Do not copy its value into logs, source, shared notes, public artifacts or summaries. Real provider probe using MiniMax-M2.7 succeeded; no further user approval is required to use this dedicated key for the requested guide. First answer prompted an accounting refinement: distinguish historical sinks, current consumption, reservations and idle programs rather than blaming the newest small queue for all past metal use.

Uncommitted guide implementation: `server/guide-context.mjs`, `server/guide.mjs`, authenticated asynchronous routes in `server/world-server.mjs`; `src/foundry/guide-panel.js`, Guide settlement tab and Ask AI about this inspector action. Server context includes units, local inventories, programs, queues, condition, grid, power/mind/heat, crew and jobs, freight, metal flows, research prerequisites, projects, neighbors, recent board/events and coverage limits. No game-write tools. Provider key stays server-side. Jobs respond 202 then poll private answers; no proxy-length wait. Durable question allowances 30/player/day, 100/world/day; 2 concurrent requests; 5-second per-player interval; idempotent requests; 75-second provider timeout and 2048 completion-token limit. Pending answers fail explicitly after restart. User chat is held in the tab, answer receipts/usage in SQLite.

Full 73-test Node suite passed before final accounting prompt refinement; browser guide test is running. Probe evidence `guide-provider-probe.json` in release directory. Continue: verify UI, improve response quality, finish meaningful tests/docs, create a new tested release with fresh backup/restore check, stage and then deploy V2 only, install private provider env for V2 services, verify real hosted guide and preserved save. Keep bounded player watcher running separately. Finish release record and Expansion incremental backup.

### Next major iteration requested by Corey (after current work finishes)

Create `ideas/deeper-resource-loops.md`: varied resource geography, water ice in regolith, concentrated rare/computing materials, helium-3 for future fusion, silicon resources for solar, potentially trace availability everywhere with meaningful concentrations. Harvester placement should matter. Explore the evolution into deeper, interdependent and visually striking game loops. This is a proposal for the next major iteration; do not implement it in the current guide release. Corey explicitly asked us to finish all current work before contemplating it.

## 2026-09-06 14:44 UTC — MiniMax guide LIVE; release verification complete

Runtime d5d66e770d44482eb64c3c50604b4750c6aa7d48 is installed on both V2 services. Production restored tick 49752 and all four players exactly; staging tick 49406 and two players. Online/stopped save snapshots are copied to the tower and SHA/integrity verified. Original Moon services retained their PIDs; no colony configuration or inventory was edited by the developer.

Website e657a7028a9a302b9b94deff07b36ebefaf4038b is published through the full-site Git build; final Netlify deploy 6a9d7b93f3d13418739981f1 at 14:43:51.587 UTC. All 42 production files verified, five original public pages unchanged. Real guide questions passed on staging and production; desktop/mobile screenshots and numerical snapshot facts checked, no game commands issued. Final startup context includes actual Build controls and nextObjective, including the missing mind-node prerequisite. Model prose can still contradict inventories; the release record preserves that limitation and the UI shows authoritative facts.

73 Node checks passed; final three guide tests repeated after context refinement. Eight browser scenarios verified (seven in the full run; the board scenario rerun successfully after an HMR interruption). Provider credentials installed privately in V2-only EnvironmentFiles. Source fork pushed through runtime d5d66e7. Final operator/docs commit and incremental Expansion recovery follow-up are being finalized; use the completed-copy receipt at /home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json once present.

The independent player watcher has used three of six turns as of 14:40 UTC, is polling without errors, and has actual game receipts. ACG has joined and reports physical delivery costs in the shared note. Board replies are now supported; Codex's actual reply #1933 is under ACG's #1162. No primary-session injections.

Current deployment work is complete apart from the recovery-copy receipt. Next: finish that copy, then research and write the resource-geography proposal in ideas/deeper-resource-loops.md. Do not change the live economy while designing it.

## 2026-09-06 — release recovery complete; resource proposal written afterward

The deployment recovery ZIP is complete on Expansion: `/media/corey/Expansion/backups/moon-foundry/moon-v2-followup-20260906T144557Z.zip`, 1,423,477 bytes, SHA-256 `b07043d2cf704e9fcfbd3bca1dc6b08c17782f51bd6797aa6c1ffbe98574bcb3`. Full drive hash matched after flushing. Its Git follow-up was fetched into a bare repository created from the September 5 full backup's own bundle and recovered source 318f93c exactly. It includes operator docs and consistent pre-upgrade V2 saves. The full backup remains a prerequisite. Current receipt: /home/corey/moon-world-backups/V2-FOLLOWUP-LATEST.json.

Only after that work completed, created ideas/README.md and ideas/deeper-resource-loops.md. The proposal reviews current claim-wide extraction and physical logistics, distinguishes measured macro geography from procedural deposits, and develops surveying, local grades, concentrated freight, silicon/solar and precision chains, water expeditions, optional speculative He-3, evidence-based invention, cooperation, AI gym observations/receipts, and physically commissioned reproduction. It includes scientific sources, an incremental rollout and preservation requirements. No game logic, assets, live world, provider config or website was changed for the proposal.

README links the ideas folder. A final documentation recovery follow-up will include this proposal; the latest completed receipt identifies its exact source revision. Share the document with ACG through the existing notebook. The requested next iteration remains a proposal, ready for review rather than silently implemented.

## 2026-09-06 — resource addendum published; ideas centralized

Corey requested the deeper-resource proposal as a whitepaper subpage, then asked that ideas live above the rover-specific fork. Canonical proposals now live in /home/corey/projects/moon-civilization/ideas, linked from that main README; this fork's ideas/README.md points there and its duplicate proposal was removed. Canonical authoring source and publication builder are pushed on docs/moon-resource-loops in the Moon GitHub repository.

Live page: https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/ . Website 0f6047179337dcd4cd44c53e26b40b9f77df2b38; production Netlify 6a9d84cb8754e6000864791f published 15:21:48 UTC. Full 16-chapter proposal, existing machinery images, a declared illustrative site-comparison widget, and two parent whitepaper links. Preview/production desktop, mobile, no-JS, navigation and payload checks passed. Original parent content preserved apart from those links, four other public pages unchanged, no game runtime/state changes. Backup/evidence and final receipt: /home/corey/moon-deployments/resource-page-20260906T150927Z and RESOURCE-PAGE-LATEST.json in its parent.

## 2026-09-06 — ordered construction and visible robot supervision, isolated fork

Active development moved to /home/corey/projects/moon-build-programs, branch development/build-programs, based on a686468. Corey asked for replicator build orders, sequences/groups and research progression, then asked whether robots cost mind. Existing rule confirmed: 0.25 per supervised robot, including idle workers within maxActive. No balance change to that cost; made it explicit in Crew and the public catalog.

Implemented finite counted orders, wait-for-commissioning progression, cancelled-site stop, paid-batch preservation, owner-only order/stop API, observed progress and guide context. Optional additive save fields retain schema/economy 3; legacy programs keep their output modes. Ordered programs keep legacy mode off and daughter replicators start off. Coordinated construction research unlocks repeat and three fixed support-first group templates. Budget preview includes current crew and full-load enabled connected industry, with explicit limits and step warnings; no adaptive support insertion or freight guarantee.

81 automated checks pass, including physical sequence completion, counts/costs, cancellation/stop, serialization, research/ownership, HTTP preview/idempotency and SQLite restart. Browser QA found a change/blur rerender swallowed the Add step click; fix and targeted rerun remain pending at this entry. Existing tests and compiled hosting checks are running independently. Fresh read-only pre-upgrade world backups copied from the VPS and hashed: production tick 53592, four players; staging tick 53582, two players. Runtime remains d5d66e7 on both services. Release evidence: /home/corey/moon-deployments/build-orders-20260906T154240Z. Never edit Corey's inventory, orders or save; preserve original/local game services and the separate bounded player watcher.

### Build-order QA and staging follow-up

The editor fix passed the focused browser scenario, including real order submission, reordered quantities, draft preservation, stop and mobile overflow. A subsequent test-only scroll failure caused by normal DOM polling was fixed without changing game behavior. All eight pre-existing browser scenarios passed; 81 automated checks and compiled hosting smoke passed. Screenshots/evidence are saved outside the source tree in the release directory.

Runtime/source ba847ffc1f23f0cd253158aa24cb19e894ba9b08; website preview 8bdd710b3b96fe635efd253867bf61e3db658068. Staging upgraded from d5d66e7 with exact-save restoration at tick 54056, two players; production and original service PIDs remained unchanged. Staging snapshots copied and SHA/integrity verified. Before deployment, source ba847ff recovered exactly against the existing full backup bundle; source and both online world backups were zipped and verified on Expansion at moon-v2-build-orders-20260906T155033Z.zip, SHA 6e92819523364f7411ef0bccd322ac97cb317f879129e92d514eec4614b1e8d7.

Manual privacy review initially over-applied the prose gate to generated JavaScript: renderer byte tables/probes, the existing Bearer interpolation/timer and HARVESTER label produced five false positives. Confirmed those tokens were already in deployed code and that the installed hook scopes public prose to html/json/xml/txt/md. All four actual changed HTML pages passed with zero hits. No gate, baseline, hook or bypass flag was changed. Evidence includes both the initial scan and compiled-code comparison.

## 2026-09-06 15:58 UTC — ordered construction LIVE

Runtime ba847ffc1f23f0cd253158aa24cb19e894ba9b08; website 8bdd710b3b96fe635efd253867bf61e3db658068; Netlify 6a9d8d5002dad00008088bb5 published 2026-09-06T15:58:28.428Z. Both hosted UIs and all 42 production files passed; five other public pages unchanged. Exact production save retained at tick 54295, four players. See deploy/moon-astra-v2/BUILD-ORDERS-DEPLOYED-2026-09-06.md. Final operator source push and verified Expansion follow-up are being completed. No game orders or player state changed by the developer.

## 2026-09-06 20:25 UTC — federation announcement and developer-board monitoring

Corey asked to post the federation explanation/player status to everyone and check the board now and periodically for dev messages. Read all current threads/replies; latest sobe #21814 reported completion. Verified first-federation is online at tick 70028 (full 120 metal + 12 parts and 360 assembly work), then posted an updated 508-character announcement as Codex #23009 at tick 70062, idempotency key dev-board-federation-20260906-70028. No resource, factory or permission commands were issued.

Added a separate read-only one-pass collector comparing board posts/replies directly, durable fingerprints/inbox, no self-wakes, [DEV] tagging, and fixed-text tmux banners throttled to five minutes. A tagged user cron entry runs the flock wrapper every minute; existing cron entries were captured privately and preserved byte-for-byte. Private state: /home/corey/moon-player/dev-board. The player allowance remains six turns. No AI turns or prompt injections occur; notes queue for developer review while the tower is online. Read docs/foundry/DEV-BOARD-WORKFLOW.md before relying on the inbox. Initial live seed succeeded with zero errors; scheduled-run verification follows.

Scheduled execution verified without a manual poll: cron ran at 20:26:02 UTC, tick 70478, polls=3, errors=0. Latest board includes announcement #23009. Three meaningful collector tests passed (restart/deduplication, unrelated-thread replies, edits, self-wake suppression, safe rendering, identity isolation). Receipt: /home/corey/moon-player/dev-board/verification.json.


## 2026-09-07 — traffic, independent tunnel endpoints and real board alerts (pre-deploy)

Isolated fork `/home/corey/projects/moon-traffic-tunnels`, base `9d558a5`. Live V2 remains on `ba847ffc1f23` until staging checks finish; no reset. Both live saves were backed up online, integrity checked, copied and hash-verified before edits.

Fixed stale/occupied berths, unsafe crowded-ring fallback, insufficient narrow-gap path search, mismatched robot clearance and parking distances derived from global IDs. New routine input batches replenish real buffers, drain final scraps after 30 seconds, and use nearer active depots. Exact fabrication and construction bills are preserved. A copy of the six-player world on real lunar terrain freed every one of the 31 previously long-stuck robots over 600 ticks; all 11 of Corey’s and 20 of Chris’s moved. Corey’s waiting/carried packet count fell to 21, Chris’s to 20, in that bounded scenario.

Tunnel planner now separates the working bore from Start and End. Local facilities support 20–500 m routes; neighboring seed endpoints support up to 6 km. Full estimates appear before the action. Powered excavation consumes the bore’s local liners and cannot bank unlimited work while starved. Newly completed corridors have two directed freight lanes, 1.5× condition-adjusted speed, following distance, saved cargo/transit state and protected exits. Local utility effect remains; neighboring power and resources remain separate. Existing corridors preserve their old utility behavior. Portals are rendered; robots travel beneath terrain without surface tracks.

Added Dev note category, Guide log scroll preservation, distinct crew-limited status and explicit finishing-paid-work text after replicator stop. Read all retained board roots/replies; Corey’s 16 robots were limited by maxActive=10, with 16.5 free mind at tick 125234. User authorized regrouping their robots outside the base after the traffic release; that maintenance is pending deployment and must retain tasks/cargo/resources.

Board monitor now submits a fixed prompt into verified pane %25/current resumed session, not the obsolete %22 banner. Actual receipt and a new live Corey post were verified. Staggered Enter plus two guarded retries addresses paste debounce. Existing game watcher’s six-turn allowance is unchanged. Full unit/server suite: 99 passing; focused browser planner/Guide: 2 passing. The full browser run passed nine scenarios and exposed a Guide refresh race. World ticks now leave the Guide DOM intact, and its targeted test passed three consecutive reruns. The compiled subpath/proxy smoke check also passed. Hosted staging/production checks pending. Evidence: `/home/corey/moon-deployments/traffic-tunnels-20260907`.


## 2026-09-07 12:10 UTC — traffic and tunnels LIVE; verified production

Runtime b00ff861b7db3c87ba596a622eed9d9deae7c2b6 on both V2 services. Website 6432b52992dcd5355c8563cf3dfe5a66ba1182ab; production Netlify 6a9ea953a81762000979dc79 published 12:10:30.653 UTC through the full-site Git build. Both hosted desktop/mobile UIs and all 42 public V2 files passed. Five other public pages stayed unchanged, including deeper-resource-loops. Production preserved the exact saved world at tick 126778 / six players; staging 126635 / two. Original services retained their PIDs; private Guide configuration and local previews were preserved.

After the traffic backend shipped, completed Corey's explicitly requested one-time robot regroup at tick 126871. Sixteen robots placed on clear, spaced ground 221 m from the seed, with cargo, jobs, condition, resources, other players and world time preserved. Fresh online/stopped before-regroup backups and an audit marker guard recovery/repetition. At tick 126951 the live Corey/Chris populations had no robot blocked for more than 100 ticks. Corey retains cap 10; six excess robots are crew-limited, independent of unused mind. No cap or condition grants.

Read the full retained board, including Chris #34265 and Corey #55403. Posted Dev release #56138 and targeted replies #56139 / #56140 at tick 127345. Private receipts in board-announcement-receipts.json. Actual tmux delivery and staggered Enter retry evidence are retained; cron continues every minute, five-minute batching, with no extension of the six-turn gameplay allowance. Roads and corner federation hubs remain proposed in the canonical ideas folder. No federation relocation or automatic resource sharing.

Deployment record: deploy/moon-astra-v2/TRAFFIC-TUNNELS-DEPLOYED-2026-09-07.md. Active entrypoints README/ops/dev-ops now identify the new fork. Final operator commit and verified Expansion recovery receipt are recorded by V2-LATEST.json and V2-FOLLOWUP-LATEST.json. Ordinary runtime rollback retains the current save; inspect active tunnel transit before choosing old code. Do not repeat regroup maintenance.


## 2026-09-07 — depot lifts implementation started

User approved building the discussed six-bay depot, visible lowering/travel/rising robot lifts, one occupied basic line, research for convoys/passing bays/twin tunnels, and physical depot expansion. New isolated source /home/corey/projects/moon-depot-lifts, branch development/depot-lifts, base 37e0489. Preserve existing V2 and other deployments until staging validation. Fresh backup/evidence /home/corey/moon-deployments/depot-lifts-20260907. Include independent Start/End, depot connection suggestions and explicit paid legacy utility conversion; do not silently reroute or spend player stock. Existing mature depots must not displace nearby machines. New depot placement reserves its future apron; retrofit existing sites only if clearance is available. Board reviewed: no new posts beyond release #56138/replies through #56140.

Checkpoint: implemented additive lift/depot state, physical fitout/expansion jobs, basic/convoy/passing/twin reservation logic, independent Start/End planner and depot suggestions, Blender lift/apron assets, shared platform/rover animation sampling, clickable lift inspection and Guide/API state. Existing worlds remain on b00ff861. Real construction-to-delivery simulation passes; eight opposing haulers drain every tier with cargo conserved and underground collision checks. Fixed assigned-route repeat selection and twin-tube merges at shared shafts. Browser planner passes; visual fixture initially lacked the required federation project record (fixture corrected). Next: finish visual QA, API persistence/permissions, production-copy soak, compiled subpath smoke, staged deployment and private recovery archive. No player orders or relocations issued.

Pre-deploy QA: 111 full unit/server tests passed, plus the final paused-route regression (11 lift tests passing). Full browser suite 11/11 passed. Compiled /moon-astra-v2 hosting/proxy and gallery smoke passed. A copy of the six-player production world ran 600 real-terrain ticks, delivering 911.2 resource units; no >100-tick blockers in Corey/Chris at the final snapshot. Board capture tick 131776 still contains the same 41 reviewed entries. Legacy paid fitout and depot-control browser follow-up is recorded separately. Preparing immutable staging release and full-site Git branch build; live remains b00ff861.

Staging hosted checks passed all 47 files, cache/gzip/model/404 controls and desktop/mobile with no writes. Depot-control browser follow-up passed 2/2 (suggestions preserve Start/End without commands; expansions/legacy fitting queue paid work). Both V2 backends now run immutable aa91824cc6c24f70d67646d7996f94e3b2627d65; production saved tick 132265 with SEVEN players preserved exactly (a seventh joined since the initial six-player snapshot). Staging saved tick 132104 / two players. Original services retained PIDs. Full-site main fast-forwarded to e41a9932701131dea08f4a01d7107b0a181df311; production publication/final public checks still pending. Expansion predeploy ZIP verified: moon-v2-depot-lifts-20260907T133318Z.zip, SHA c7379723a004bb0dd953700d492b4dfa0b8472cab3c4dc6d307ab0ff746ed991.


## 2026-09-07 13:40 UTC — depot elevators LIVE

Production Netlify 6a9ebe925858ae0008179a88 published 2026-09-07T13:40:38.295Z, full-site commit e41a9932701131dea08f4a01d7107b0a181df311. Runtime aa91824cc6c24f70d67646d7996f94e3b2627d65 on both V2 services. All 47 live files and both hosted UIs passed; no game writes during QA. Five existing public page hashes and original Moon services stayed unchanged. Board Dev release #58331 verified at tick 132504; actual full-board review remains current and bounded gameplay was not restarted. Shared ACG notes and canonical transport idea status updated. Final private recovery archive follows the operator-only commit and includes all fresh save copies and publication receipts.
