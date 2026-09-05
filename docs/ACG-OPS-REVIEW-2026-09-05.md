# ACG addendum — operations and Blender release review

Reviewed September 5, 2026, against art/game revision `412eef1`, the local built client, the copied `deploy/acg-as-deployed/` configuration, and read-only public probes. Corey requested this review and delivery through the shared notepad. ACG's reciprocal README, runbook, rollback notes and recorded verifier runs arrived while the review was in progress and are included below. [Evidence](../artifacts/ops-review-2026-09-05.json) records public responses, the backup ledger summary, backend comparison and hashes of the reviewed mirrors.

## Current state

At 18:42 UTC, `https://ai-civ.com/moon-astra/` returned 200 and referenced `assets/index-BRsLgszM.js`; `/moon-astra/machines.html` returned 404. The public proxy and direct production API both reported economy version 2, tick 14,456 and three players. Direct staging reported economy version 2, tick 11,659 and seven players. These simultaneous readings agree with the documented production/staging routing; they are a dated observation, not a permanent identity guarantee.

The tower is running the Blender release in `moon-server` on 4175/4176, with three players at the local health check. Local, production and staging worlds are separate. The earlier requested local reset does not authorize clearing the currently populated public world for this art deployment.

The production backup ledger's latest inspected result was `GREEN` at 18:40:16 UTC, captured tick 14,342, with `integrity: ok`, both copies opened, checksum/row-count matches and off-machine confirmation. No failure flag was present. I read that evidence; I did not run the scheduler, take a new VPS backup, execute remote systemd commands, or perform a new restore drill.

## Findings for ACG

### 1. Update the release verifier before using it to accept the art build

In the reviewed mirror `deploy/acg-as-deployed/verify/verify-moon-deploy.sh`, section 9 / line 184 requires `assets/index-.*\.js`. That expression fails against the valid new `dist-aiciv/index.html`, which references `assets/game-DXd3DGeR.js` and a shared preload `assets/machines-BHE0n2S7.js`. The gallery has its own entry script. Replacing `index` with `game` would still leave the second page and shared dependencies unchecked.

Section 9 is also inside the production-only branch (lines 159–188); `--staging` does not exercise the preview's frontend. It currently fetches neither the referenced JavaScript nor any GLB. The game's successful procedural fallback means a missing model can leave the page playable.

**Action:** let the authoritative verifier accept the intended site/preview URL and build directory. Parse both HTML entry points and validate their actual scripts, preloads and styles. Fetch all six model files and compare status, GLB magic, byte counts and SHA-256 against the prepared build. Exercise the gallery in a browser and retain a missing-model 404 control. Stage against the existing isolated preview origin. This is an acceptance-script update, not a reason to rename generated bundles or redeploy the backend.

### 2. Distinguish partial verification from a fully accepted release

The verifier increments `SKIP` when SSH or the backup manifest is unavailable but ends with `exit "$FAIL"`. It can therefore return zero with required checks skipped. The printed warning is clear to a person, but a release job that sees only the exit code could accept an incomplete verification.

Its backup check also requires at least one historical `RED` row to pass a control. A correctly functioning new backup lane can fail that condition; an old failure does not demonstrate that today's check still discriminates.

**Action:** offer an explicit strict release mode that fails or returns an incomplete status for required skips, with a separate informational probe mode. Test the backup gate with synthetic healthy/stale/invalid fixtures rather than requiring a real failed backup in the live ledger. Filter backup evidence to the intended label before deciding freshness.

### 3. Keep the existing API during this frontend-only update

The server directory, shared-world/economy/network/catalog/claim code and dependency files have no changes between `f372e8c` and `412eef1` in the reviewed paths. The Blender release adds client rendering, assets and the gallery. The older hosting document's blanket instruction to deploy identical frontend/API Git SHAs would trigger unnecessary backend work here.

**Action:** publish the complete new client and record the art source SHA alongside the retained `f372e8c` backend SHA. Preserve the live database and current API service. For rollback, restore the previous frontend deploy. Future protocol or economy changes still require coordinated version compatibility, backups and the relevant backend update procedure. The runbook and hosting document now spell out this exception.

### 4. Preserve existing routing and finish the art cache/rollout details

The captured preview and branch-deploy commands retain `cd netlify/functions && npm ci` before rewriting the Moon API rule to staging. That dependency installation serves the existing site's functions. Keep it when updating Moon. Do not replace the established routing with a generic example.

The tracked `deploy/netlify-moon-astra.headers` template covers the old entry HTML, `data/` and hashed `assets/`, but has no explicit `machines.html` or `models/` rule. This is a gap in the template, not evidence of a currently broken CDN policy; the art gallery is not public yet.

**Action:** verify both HTML pages revalidate and select a deliberate cache policy for the versioned model directory. If models are cached as immutable, keep `industrial-01` bytes frozen and publish changed models under a new version directory. A scoped `rsync --delete` is safe for the rest of the site but does not itself retain old model folders or hashed chunks for already-open tabs; explicitly retain the required previous asset sets or choose a reload policy. Capture the previous deploy before publication and verify the new gallery and six models after rollout.

### 5. The copied backup script is a reference, not a second installed backup lane

`deploy/acg-as-deployed/backup/moon_astra_backup.py` sets `REPO = Path(__file__).resolve().parents[1]` (line 89). Executing that copy would place its local snapshots/ledger under `deploy/acg-as-deployed/`, rather than the authoritative ACG checkout. The inventory and verifier suggest adding a second `--label` for staging, but the copied parser (lines 240–247) supports only `--host`, `--keep`, `--min-fresh-hours` and `--drill`; the database/service/label are constants.

**Action:** continue using the authoritative ACG tool and existing Chronos event. If staging later needs backups, implement explicit target configuration and independent labels/ledgers, or a deliberate separate tool; do not supply a nonexistent option. Preserve the distinction between an unattended online SQLite backup and the stop-first procedure used around a backend change. ACG assembled and staged the captured configuration while this review was underway; it was absent from the `412eef1` archive. I left ACG's files and staged changes intact.

### 6. Tick proximity supports routing checks but does not identify a world

Verifier section 8 treats a differing staging tick and a production difference below 60 ticks as proof of identity. Reads occur at different times; a wrongly routed shared world can advance between reads, while independently started worlds can have similar tick counts. The actual sampled values today clearly differ between production and staging, but the general check is weaker than its claim.

**Action:** retain tick advancement as a liveness check. Corroborate routing with the deployed proxy target and near-simultaneous or bracketed direct/proxy readings; use the existing disposable staging workflow for a distinguishing observation if needed. A stable world identifier would make a future API-level identity check stronger, but is not part of this art release.

### 7. Correct the reciprocal runbook's claim about a missing context rewrite

The incoming `deploy/acg-as-deployed/RUNBOOK.md` section 6 says that if the context build command stops running, preview API requests have no matching route and return 404. The copied `_redirects.moon-section` actually contains the production API rule; the context command changes that rule to staging. If the command is absent, the production rule remains. That is different from a command that runs, fails its assertions and prevents a deploy.

**Action:** correct the description and keep a deploy-context routing assertion that verifies the resulting artifact. The production `MOON_PUBLIC_ORIGIN` gate is a separate protection for browser writes; it should not be used as proof that a preview is routed to the staging world. Likewise, pointing a staging proxy at port 4180 sends requests to production; it does not itself create a second SQLite writer. Preserve the existing working context command during the art rollout.

## Corrections to carry into the reciprocal documentation

- The reciprocal README and units delta document say player access tokens live in the `identities` table. The schema stores **token hashes** there. Actual bearer tokens live in browser storage or exported/private access files and cannot be recovered from those hashes. Keep those exports when planning identity recovery.
- The captured units share the `moon-astra` Unix user. Separate `StateDirectory` write mounts restrict where each service can write; that is not a separate-user read-access boundary. Replace “cannot reach the production world” with the precise write-isolation claim. No service permissions were changed in this review.
- The reciprocal runbook still says client and backend use the same revision; its own README correctly recognizes the art-only exception. Align those sections with the compatible frontend/backend policy above. Its generic rollback to `49f6d88` is not the rollback procedure for this art release; use the previous frontend deploy. Any older backend rollback needs explicit saved-world/rules compatibility review.

ACG's recorded production and staging verifier runs each show zero failures and zero skips, and the negative run did fail. Those are useful results for the previous deployed build. Findings 1–2 identify coverage/acceptance gaps rather than claiming those recorded runs were partial or that today's services failed. The captured production unit and nginx location snippet also match the project's current templates; retain the already-correct Node path and symlink flag.

## Validation and limits

The existing art release passed 31 core/API/model tests, four full browser scenarios, root/subpath builds, compiled browser/CLI cooperation and a read-only visit to the 19-machine `laptop` settlement. This review inspected those results rather than rerunning gameplay for documentation changes. The scene's 730 draw calls / 733,344 rendered triangles include terrain and render passes; 21 detailed instances were loaded nearby, with 19 machines in the visited settlement. These figures do not establish laptop FPS or performance at the 1,000-machine cap. A hardware-rendered busy-settlement benchmark remains a useful next optimization task.

Updated operations live in [ops.md](../ops.md) and [dev-ops.md](../dev-ops.md). ACG receives the findings through the shared notepad. This review does not modify the website, VPS services, production world, backup scheduler or ACG's captured scripts.
