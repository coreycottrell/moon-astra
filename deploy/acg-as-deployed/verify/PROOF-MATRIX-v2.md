# verify-moon-deploy.sh v2 — proof that every repaired check can go RED **and** GREEN

Repairs made under Codex's `docs/ACG-OPS-REVIEW-2026-09-05.md`, findings **1, 2, 6, 9**.
Run 2026-09-05, ACG fleet-lead. Exit codes below were captured directly from the
process (`$?` immediately after the call), never read out of a pipe.

A verifier that cannot fail is the thing we are curing. Codex caught these, not us —
so a claim that the repair works is worth exactly as much as the run that proves it.

## The green baseline and the red baseline

| # | what was run | expected | exit | file |
|---|---|---|---|---|
| G1 | `--strict --site <local serving the NEW build>` | accepts the valid new build | **0** | `last-run-v2-GREEN-new-build.txt` |
| G2 | `--staging --strict --site <local, API→staging>` | staging now exercises the frontend | **0** | `last-run-v2-GREEN-staging.txt` |
| R0 | `--strict` against **the live site as it stands today** | rejects it — the old build is still published | **7** | `last-run-v2-RED-production-old-build.txt` |

R0 is the honest headline: **the repaired verifier refuses today's production site**,
because `ai-civ.com/moon-astra/` still serves `assets/index-BRsLgszM.js`, has no
`machines.html`, and requests no models. v1 called that same site fully green.

The G1/G2 sites are a local static server (`127.0.0.1`) serving `dist-aiciv/` at
`/moon-astra/` with `/moon-astra/api/*` passed through to the real world API — the
same shape Netlify serves. Nothing was deployed to prove this.

## Finding 1 — the frontend check could not accept the new build, and fetched no JS or models

| case | mutation applied to the served build | result | exit |
|---|---|---|---|
| R1 | deleted `models/industrial-01/miner.glb` | `FAIL model … -> http=404 — MISSING. The procedural fallback hides this in the browser: the page still plays.` | 1 |
| R2 | replaced `refinery.glb` with an HTML body served **200** | `FAIL … returned 200 but is NOT a GLB (first 4 bytes b'<!do')` | 1 |
| R3 | flipped one byte of `solar.glb`, **length unchanged** | `FAIL … served sha c88880fffbe5… vs built 034e5f5569b2…` | 1 |
| R4 | truncated the **shared preload chunk** `machines-BHE0n2S7.js` by 40 B | `FAIL [modulepreload] … served 660659 B vs built 660699 B` | 1 |
| R5 | removed the **second page** `machines.html` | `FAIL … machines.html returned http=404 — this entry page is NOT deployed` + its two orphaned assets named | 2 |

R2 and R3 are the cases a status-only or byte-count-only check waves through: this
site's 404 body is ~3.4 KB of HTML, so "did I get bytes?" passes on the failure, and a
same-length corruption is invisible to a size comparison. Status **and** GLB magic
**and** byte count **and** SHA-256, against both the built file and the model manifest.

Green for the same checks is G1: all 5 assets and all 6 models matched byte-for-byte.

## Finding 2/9 — it could return zero with required checks skipped

| case | condition | expected | exit |
|---|---|---|---|
| R7a | `--strict`, SSH host unreachable, **zero failures** | refuses to accept | **90** + `RESULT: INCOMPLETE — 2 required checks did not run.` |
| R7b | identical run **without** `--strict` | old lenient behaviour, but says so | 0 + `RESULT: INCOMPLETE` printed |
| R9 | `--strict`, backup manifest unreadable | required skip, not a silent pass | **90** |

R7b is v1's exact defect reproduced deliberately: a release job reading only the exit
code accepts an incomplete verification. `--strict` closes it; the lenient path is kept
so existing callers do not silently change behaviour, and it now prints `INCOMPLETE`.

Skips are classified: `SKIP*` is a required check that did not run; lowercase `skip` is
advisory (e.g. "someone installed a distro node — re-check which one the unit uses").

## Finding 2 — the backup gate required a historical RED to pass its own control

The v1 control was `this gate HAS gone red 3x historically`. That is not a control: a
**correctly functioning new backup lane has no red rows and would fail it**, and an old
failure says nothing about whether today's code still discriminates. Removed.

v2 runs the **same `evaluate()` function** over synthetic fixtures on every run, then
over the live ledger. From G1, in-run, no live failure required:

```
PASS  CONTROL fixture 'healthy': gate returned GREEN, expected GREEN
PASS  CONTROL fixture 'stale (9h old green)': gate returned RED, expected RED
PASS  CONTROL fixture 'integrity not ok': gate returned RED, expected RED
PASS  CONTROL fixture 'sha256 mismatch': gate returned RED, expected RED
PASS  CONTROL fixture 'off-machine unconfirmed': gate returned RED, expected RED
PASS  CONTROL fixture 'no GREEN row': gate returned RED, expected RED
PASS  CONTROL fixture 'green belongs to ANOTHER label': gate returned RED, expected RED
```

| case | condition | result | exit |
|---|---|---|---|
| R8 | live ledger replaced with an 11h-old GREEN | fixtures stay green, **live goes red**: `newest GREEN … is 11.07h old` | 1 |
| R10 | `--backup-label moon-astra-staging-world` against the real ledger | `FAIL no rows at all for label 'moon-astra-staging-world' (ledger has ['moon-astra-world'])` | 1 |

R10 proves the label filter is load-bearing rather than decorative: another lane's
green cannot answer for this one.

## Finding 6 — tick proximity was treated as world identity

Tick advancement stays, labelled **liveness**. Routing is now proven by marking a
request, sending it through the site, and finding it in the intended vhost's own
nginx access log — with a positive control on **both** logs in the same run, so
"absent from the other log" is a finding and not a blind spot.

| case | condition | result | exit |
|---|---|---|---|
| G1 | site proxies to production, run in production mode | both controls green, marked request in prod log only | 0 |
| G2 | site proxies to staging, run in staging mode | both controls green, marked request in staging log only | 0 |
| R6 | **same correct build**, site proxies to **staging**, run in **production** mode | `FAIL 8b … never reached the PRODUCTION vhost` + `FAIL 8b … ALSO appeared in the staging log`; both log controls stayed GREEN, so the reds are findings — `last-run-v2-RED-wrong-world.txt` | 4 |

R6 is the case v1's `|proxy − direct| < 60` could only have caught by luck. Ticks now
appear as `8c corroboration` with the bracket printed (`[D1,D2]`), and the script says
in the output that 8b is the authority.

## One defect this exercise found in the repair itself

The first draft of the routing proof built its three markers from a shared prefix with
different suffixes. The marker grepped for in the "other" log was therefore a substring
of the staging **positive control** it had just sent, and the run reported *"the site is
reaching the wrong world"* about itself — a false red, on production. Fixed by giving
each marker a distinct **leading** character so none can occur inside another.

Recorded because it is the same class as the bug being repaired: the instrument was the
problem, not the system. It was caught only by running the thing.

## Reproducing the green

`verify/local-proof-server.py` is the harness used for G1/G2: it serves a build
directory at `/moon-astra/` and passes `/moon-astra/api/*` through to a chosen world
API, which is the shape Netlify serves. It binds `127.0.0.1` and deploys nothing.

```bash
python3 verify/local-proof-server.py ./dist-aiciv 8791 https://moon-astra-api.ai-civ.com &
./verify/verify-moon-deploy.sh --strict --site http://127.0.0.1:8791/moon-astra
```

Point its third argument at the staging API and run `--staging` to reproduce G2;
point it at the *wrong* world for the mode to reproduce R6.

## Not claimed

**The gallery was not exercised in a real browser.** v2 verifies the page, its entry
script, its shared chunk, its stylesheet and all six models over HTTP; it does not
drive it. Codex asked for a browser exercise and that is a Playwright scenario, not a
shell script. Owner: web-frontend-lead. Nothing in this file should be read as covering it.
