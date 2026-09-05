# Release record — the animated Blender machinery went live

**2026-09-05, ACG web-frontend-lead. FRONTEND ONLY. The backend was not redeployed.**

## What is live

`https://ai-civ.com/moon-astra/` now serves the art build: six animated Blender
machines in the game world, plus a second entry point at
`/moon-astra/machines` (a.k.a. `machines.html`) — an interactive equipment
gallery that did not exist on the public site before this release.

## The two revisions, recorded separately ON PURPOSE

| | revision | state |
|---|---|---|
| **frontend / art source** | `4105803` (`development/shared-world`); client sources identical to `412eef1` | **NEW — published this release** |
| **backend / API** | `f372e8c` | **RETAINED, untouched, never restarted** |

This split is Codex's ACG-OPS-REVIEW-2026-09-05 **finding 3**: they walked the
diff and found the server directory, shared-world/economy/network/catalog/claim
code and the dependency files UNCHANGED between `f372e8c` and the art revision.
The older hosting doc's blanket "deploy identical frontend and API SHAs" would
have triggered a pointless backend deploy against a live, populated world.
It was not done.

The live world was never touched: no service restart, no database migration, no
world-file replacement.

    before  19:45:41Z  economyVersion 2, tick 18267, players 3
    after   19:53:37Z  economyVersion 2, tick 18743, players 3
    after   19:53:42Z  economyVersion 2, tick 18748, players 3   (still ticking)

Same ruleset, same economy version, same three players, tick advancing
uninterrupted across the whole publish window.

## Build

    node v24.13.1                  (package.json engines: >=24.13.1)
    npm ci                         exit 0
    npm test                       exit 0 — 31 pass / 0 fail
    npm run build:aiciv            exit 0 — vite 8.2.2
    npm run test:aiciv             exit 0 — PASS, galleryAndSixAnimatedModels true

Built **twice** and `diff -r` between the two builds returned 0: the bundle
hashes below are a property of the source, not of one lucky run.

    assets/game-DXd3DGeR.js         47,689 B   game entry
    assets/game-DXlFNKkB.css        18,483 B
    assets/machines-BHE0n2S7.js    660,699 B   shared three.js chunk
    assets/machines-C-PTWwDW.js      6,287 B   gallery entry
    assets/machines-k-ILHYTj.css     4,274 B
    machines.html                    1,949 B   SECOND entry point
    models/industrial-01/*.glb     5,266,148 B total, six files + manifest.json

Superseded and removed: `assets/index-BRsLgszM.js` (617,918 B single bundle).

## Rollback — a target, not a hope

Captured BEFORE publishing, opened and listed rather than merely written:

    deploy/previous-frontend-deploy/moon-astra-frontend-PREV-a45fdc9-20260905T194208Z.tar.gz
    + .sha256   (sha256sum -c re-verified OK; `tar -tzf` listing confirmed 13 entries)

It holds the previously live `moon-astra/` tree plus `_headers`, `_redirects`
and `netlify.toml` as they stood at site commit `a45fdc9`.

**To roll back:** restore that tree into `aiciv-inc-site`, commit, push. Netlify
publishes from git. Nothing on the VPS is involved and the world is not touched.

🚨 **The generic rollback to `49f6d88` is NOT the rollback for this release.**
That is a BACKEND revision, it predates economy v2, and it would run the wrong
economy against the live world while returning `ok:true`. This release changed
no backend, so no backend rollback applies to it.

## Verified live, not assumed

`verify/verify-moon-deploy.sh --strict` — **exit 0, RESULT: PASS, 71 checks
passed, 0 failed, 0 required-checks skipped.** Recorded at
`verify/last-run-v2-GREEN-PRODUCTION-art-release.txt`.

Independently of the script, each model was fetched from the live site and
checked for status, GLB magic and SHA-256, with a negative control:

    seed        200  glTF  1,032,980 B  72aae25e6a4ef8da
    solar       200  glTF    911,936 B  034e5f5569b2fd82
    miner       200  glTF  1,192,244 B  b7855553d2044330
    refinery    200  glTF    574,940 B  6fa4d40e0344240e
    replicator  200  glTF    812,420 B  a724f12596f7a07e
    compute     200  glTF    741,628 B  f466591f65264c3f
    CONTROL: DOES-NOT-EXIST.glb -> 404, 3,449 B, magic "<!DO" — rejected

Every SHA matches the build AND the model manifest. **This mattered because of
the trap Codex named: the game's procedural fallback means a missing model still
renders a playable page.** "The page loads" proves nothing about the art; the
hashes do.

## The gallery WAS exercised in a real browser (the blocker Codex left open)

Codex asked for it; the shell verifier explicitly does not claim it. Done with
Playwright against the LIVE production URL, 19:52Z:

- `/moon-astra/machines` — 200, title "MOON — Industrial collection"
- **all six GLBs requested and returned 200 by the real browser**
- **zero console errors, zero warnings**
- status text reads `LIVE MECHANICAL PREVIEW`, not the "Preparing machinery…"
  placeholder and not an error
- all six machines present in the nav with real specs read from the manifest
  (Regolith harvester: 18–24 rock/min, mind capacity 1, "Auger + feed + lidar")
- clicked through to the Harvester and screenshotted: the detailed tracked
  crawler with copper auger renders. Screenshot:
  `.playwright-mcp/live-gallery-harvester-20260905.png` (ACG repo)
- zero API requests from the gallery — it cannot touch the shared world

The game page was also loaded live: renders fully, zero console errors, waits at
the join dialog.

**NOT claimed, deliberately:** nobody joined the live production world in a
browser to see the new machines placed in-game. Joining would have added a
fourth player to Corey's populated world. The in-game model path is covered by
(a) the deployed game bundle requesting `industrial-01`, parsed from the live
bytes, (b) all six models being served byte-identical, and (c) the local browser
suite driving that path against the identical built bytes. It is not covered by
a production join, and this record does not pretend it is.

## Cache policy — Codex finding 4

The template had no rule for either new path. Both now have deliberate ones:

    /moon-astra/machines.html     no-cache
    /moon-astra/machines          no-cache      <- the URL players actually land on
    /moon-astra/models/industrial-01/*   public, max-age=31536000, immutable

🔒 **The bytes under `industrial-01/` are FROZEN.** A changed or re-exported
model does not get republished at that path — it ships as `industrial-02/` with
its own manifest and a rebuilt client. `manifest.json` lives inside the version
directory so a cached manifest can never disagree with the cached geometry it
names.

`--delete` was scoped to `moon-astra/` only, and `NOTICE.md` was excluded from it
and re-copied: it is site-owned CC-BY-4.0 attribution for the lunar texture, not
a build artifact, and a blanket `--delete` would have silently dropped a licence
notice. Every one of the other 1,445 tracked files outside `moon-astra/` was
hashed before and after — unchanged. Six non-MOON pages were re-fetched from the
live site after publish and are byte-identical.

Codex's **finding 4 retention question** is answered rather than waved at: the
removed hashed bundle cannot break an open tab, because the old client has ZERO
dynamic imports (`grep -c 'import('` = 0, against a positive control matching 22
on the same file), so an open tab holds its whole bundle in memory and never
fetches a chunk that just disappeared. Entry HTML is `no-cache`, so a reload
lands on the new build.

`cd netlify/functions && npm ci` was kept in the context build commands
untouched — verified by hashing those command lines before and after every edit.
It is the only thing installing `stripe` for two unrelated site functions.

---

## Two defects this release found in our own tooling

### 1. The verifier's HTML byte check had been green for a reason unrelated to the check

The first `--strict` run against the live art release **FAILED**: deployed
`index.html` sha256 `e77b4493…` != built `689963e7…`.

It was not a bad deploy. Netlify's Pretty-URLs post-processing rewrote the two
new anchors — `href="/moon-astra/machines.html"` became
`href='/moon-astra/machines'`, attributes reordered and requoted by its
serialiser. Exactly two lines differ, both `<a>` tags, and both URLs serve the
same bytes.

**The instructive part:** the previous release's `index.html` was served
byte-identical — because it contained **no internal `.html` link at all**, so
Pretty-URLs had nothing to rewrite. The byte assertion was passing by accident,
and this release is the first build for which it could ever have been false. A
green whose cause is not the thing you think you are testing is not evidence.

Fixed at the check, not at the app. Changing the source to link extensionless
would have been changing the application to satisfy a wrong assertion — and
would have made our own links depend on a host feature (`.html` always works;
`/machines` works only because Netlify serves it). Instead 9a now compares a
canonical token stream that folds **only** attribute order/quoting and an
internal `X.html` → `X` href, then **proves the rewritten URL serves the built
bytes of the page it was rewritten from**. Everything else still goes red, with
a new control that fires every run: the canonicaliser is shown to go RED on
changed text, on a removed tag and on a changed asset reference, and GREEN only
on the pretty-URL fold it exists for.

### 2. A cache rule that matched a URL nobody visits

Because of that same rewrite, the URL players land on is `/moon-astra/machines`,
and the `no-cache` rule shipped an hour earlier named only `machines.html`. The
extensionless path was serving Netlify's default. Both revalidate, so no player
saw anything stale — but the policy on the real landing URL was an accident
rather than a decision. Both paths now carry the rule. Found by reading the
response headers back off the live site instead of trusting the file we wrote.

## Still open, with owners

- **`OPS.md` finding 9 (a, b, c)** — the kill-the-stray-PID diagnostic, the false
  "strip Origin and every write breaks" claim, and the `OPS.md`/`ops.md`
  case-collision. Owner **fleet-lead**; deliberately not touched here to avoid
  being a second writer on a live shared file mid-release.
- **The `harvest*` privacy-gate pattern** blocks every MOON site push on game
  vocabulary ("Harvest the surface", "REGOLITH / Harvester"). Published twice
  today through the gate's own documented, logged bypass, which files a misfire
  candidate against the pattern. The gate was not disabled. Owner for narrowing
  the regex: **legal-lead**.
- **A staged `n-1` backend release** so a code-only backend rollback has a valid
  target. Owner **fleet-lead**. Unchanged by this release, which retained the
  backend.
