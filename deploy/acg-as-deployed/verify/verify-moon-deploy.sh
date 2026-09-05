#!/usr/bin/env bash
# verify-moon-deploy.sh — prove a MOON deploy actually worked.
#
# Written by ACG (fleet-lead) 2026-09-05 from the RUNNING system, then run
# against it. Every check below either passed or was removed; nothing here is
# aspirational.
#
# DESIGN RULE, and the reason this file exists at all: every check ships a
# CONTROL that can go red. A probe that cannot fail is not evidence. Three of
# the checks in this script exist ONLY as controls for the check above them.
#
# Exit 0 = every check passed. Non-zero = the count of failed checks.
# Run it from the workstation. SSH checks are skipped (not failed, and said so)
# when the host is unreachable, so the public-surface half still runs anywhere.
#
#   ./verify-moon-deploy.sh              # production
#   ./verify-moon-deploy.sh --staging    # staging world
#
# Exit codes are captured directly from each command, never through a pipe:
# `curl ... | grep` reports grep's status and will happily call a 502 a pass.

set -u

HOST_SSH="${MOON_SSH:-root@87.99.131.49}"
API="${MOON_API:-https://moon-astra-api.ai-civ.com}"
SITE="https://ai-civ.com/moon-astra"
UNIT="moon-astra"
PORT=4180
ORIGIN="https://ai-civ.com"
LABEL="PRODUCTION"

if [ "${1:-}" = "--staging" ]; then
  API="${MOON_API:-https://moon-astra-api-staging.ai-civ.com}"
  UNIT="moon-astra-staging"
  PORT=4181
  ORIGIN="https://deploy-moon-astra--aiciv-inc.netlify.app"
  LABEL="STAGING"
fi

FAIL=0
SKIP=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAIL=$((FAIL+1)); }
skip() { printf '  SKIP  %s\n' "$1"; SKIP=$((SKIP+1)); }
section() { printf '\n== %s\n' "$1"; }

printf '=== MOON deploy verification — %s (%s) ===\n' "$LABEL" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---------------------------------------------------------------------------
section "1. Service is enabled and active on the host"
# WHY enabled AND active: `active` alone survives a manual start and dies at the
# next reboot. `enabled` is the boot-persistence claim.
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$HOST_SSH" true 2>/dev/null; then
  ssh "$HOST_SSH" "systemctl is-enabled $UNIT" >/dev/null 2>&1
  [ $? -eq 0 ] && pass "$UNIT is enabled (survives reboot)" || fail "$UNIT is NOT enabled — it will not come back after a reboot"

  ssh "$HOST_SSH" "systemctl is-active $UNIT" >/dev/null 2>&1
  [ $? -eq 0 ] && pass "$UNIT is active" || fail "$UNIT is NOT active"

  # CONTROL: the same two commands against a unit that does not exist must fail.
  # Without this, a broken ssh/systemctl that always exits 0 reads as a green deploy.
  ssh "$HOST_SSH" "systemctl is-active moon-astra-does-not-exist" >/dev/null 2>&1
  [ $? -ne 0 ] && pass "CONTROL: is-active goes red on a nonexistent unit" || fail "CONTROL BROKEN: is-active returned 0 for a unit that does not exist — every result above is meaningless"

  section "2. The process is actually LISTENING (a started service is not a serving one)"
  # THE DEFECT THIS CATCHES is the one that cost us the first deploy: launched
  # through the `current` symlink WITHOUT --preserve-symlinks-main, the entrypoint
  # guard is false, the process exits 0 in ~50ms, and systemd reports a clean
  # start for a server that never bound a port. `is-active` was GREEN for it.
  ssh "$HOST_SSH" "ss -lnt | grep -q '127.0.0.1:$PORT'" >/dev/null 2>&1
  [ $? -eq 0 ] && pass "listening on 127.0.0.1:$PORT" || fail "NOTHING is listening on 127.0.0.1:$PORT — the classic silent no-op start"

  ssh "$HOST_SSH" "ss -lnt | grep -q '127.0.0.1:59999'" >/dev/null 2>&1
  [ $? -ne 0 ] && pass "CONTROL: the listener probe goes red on an unused port" || fail "CONTROL BROKEN: probe claims an unused port is listening"

  section "3. ExecStart names an interpreter that EXISTS on this host"
  # /usr/bin/node does not exist on aiciv-hub. A unit naming it fails at exec
  # (status=203/EXEC), not at runtime — the service never starts at all.
  EXECPATH=$(ssh "$HOST_SSH" "systemctl show $UNIT -p ExecStart --value" 2>/dev/null | grep -o '/[^ ]*/node' | head -1)
  if [ -n "$EXECPATH" ]; then
    ssh "$HOST_SSH" "test -x '$EXECPATH'" >/dev/null 2>&1
    [ $? -eq 0 ] && pass "interpreter $EXECPATH exists and is executable" || fail "interpreter $EXECPATH does NOT exist on the host"
    ssh "$HOST_SSH" "test -x /usr/bin/node" >/dev/null 2>&1
    [ $? -ne 0 ] && pass "CONTROL: /usr/bin/node correctly absent (this is why the template path was wrong)" || skip "/usr/bin/node now exists — someone installed a distro node; re-check which one the unit uses"
  else
    fail "could not read ExecStart for $UNIT"
  fi

  section "4. --preserve-symlinks-main is present"
  ssh "$HOST_SSH" "systemctl show $UNIT -p ExecStart --value | grep -q -- --preserve-symlinks-main" >/dev/null 2>&1
  [ $? -eq 0 ] && pass "--preserve-symlinks-main is on the ExecStart line" || fail "--preserve-symlinks-main MISSING — this unit will start, exit 0, log nothing, and serve nothing"
else
  skip "host $HOST_SSH unreachable — sections 1-4 and 9 not run (skipped, NOT passed)"
fi

# ---------------------------------------------------------------------------
section "5. Health over public HTTPS, and the world is ADVANCING"
# A frozen tick is a dead simulation answering 200. Two reads, three seconds apart.
C1=$(curl -sS -m 15 -o "$TMP/h1.json" -w '%{http_code}' "$API/api/v1/health" 2>/dev/null)
RC=$?
if [ $RC -eq 0 ] && [ "$C1" = "200" ]; then
  pass "GET $API/api/v1/health -> 200"
else
  fail "health did not return 200 (curl rc=$RC http=$C1)"
fi
T1=$(python3 -c "import json,sys;print(json.load(open('$TMP/h1.json'))['tick'])" 2>/dev/null)
sleep 3
curl -sS -m 15 -o "$TMP/h2.json" "$API/api/v1/health" >/dev/null 2>&1
T2=$(python3 -c "import json,sys;print(json.load(open('$TMP/h2.json'))['tick'])" 2>/dev/null)
if [ -n "$T1" ] && [ -n "$T2" ] && [ "$T2" -gt "$T1" ] 2>/dev/null; then
  pass "tick advancing $T1 -> $T2 (simulation is alive, not just the HTTP layer)"
else
  fail "tick did NOT advance ($T1 -> $T2) — the server answers but the world is frozen"
fi

section "6. Catalog reports the economy ruleset the client was built against"
# The failure this catches is the expensive one: every check green, about the
# WRONG REVISION. A stale backend serves 200s all day.
curl -sS -m 15 -o "$TMP/cat.json" "$API/api/v1/catalog" >/dev/null 2>&1
python3 - "$TMP/cat.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
want={"economyVersion":2}
prod=d.get("production",{}); mind=d.get("mind",{})
checks=[("economyVersion",d.get("economyVersion"),2),
        ("production.refinery",prod.get("refinery"),100),
        ("production.standardHarvester",prod.get("standardHarvester"),300),
        ("production.bulkHarvester",prod.get("bulkHarvester"),400),
        ("production.rockPerMetal",prod.get("rockPerMetal"),2),
        ("mind.capacityPerNode",mind.get("capacityPerNode"),4),
        ("mind.costs.replicator",(mind.get("costs") or {}).get("replicator"),4)]
bad=[(n,g,w) for n,g,w in checks if g!=w]
for n,g,w in checks:
    print(("  PASS  " if g==w else "  FAIL  ")+f"{n} = {g!r} (expect {w!r})")
sys.exit(1 if bad else 0)
PY
[ $? -eq 0 ] || FAIL=$((FAIL+1))

section "7. Origin gate discriminates THREE ways (not just 'it answered')"
# A gate that returns the same thing for every input proves nothing. These two
# probes are non-mutating: neither can create a player.
B=$(curl -sS -m 15 -X POST -H 'Content-Type: application/json' \
      -H 'Origin: https://evil.example.com' -d '{"name":"controlprobe"}' \
      -o "$TMP/o1.json" -w '%{http_code}' "$API/api/v1/join" 2>/dev/null)
[ "$B" = "403" ] && pass "untrusted origin -> 403 (fails CLOSED)" || fail "untrusted origin returned $B, expected 403 — the origin gate is not holding"

N=$(curl -sS -m 15 -X POST -H 'Content-Type: application/json' \
      -H "Origin: $ORIGIN" -d '{"name":""}' \
      -o "$TMP/o2.json" -w '%{http_code}' "$API/api/v1/join" 2>/dev/null)
[ "$N" = "400" ] && pass "trusted origin + invalid name -> 400 (so 403 above was ABOUT THE ORIGIN, not a blanket refusal)" || fail "trusted origin + bad name returned $N, expected 400"

U=$(curl -sS -m 15 -o "$TMP/ob.json" -w '%{http_code}' "$API/api/v1/observe" 2>/dev/null)
[ "$U" = "401" ] && pass "unauthenticated observe -> 401" || fail "unauthenticated observe returned $U, expected 401"

# ---------------------------------------------------------------------------
if [ "$LABEL" = "PRODUCTION" ]; then
section "8. The site proxy reaches PRODUCTION, not staging"
# THE INSTRUMENT NOTE THAT MATTERS: /api/v1/observe returns the identical
# UNAUTHORIZED string on preview, staging and production, so it discriminates
# NOTHING. Tick identity is the only thing that tells the worlds apart.
P=$(curl -sS -m 20 -o "$TMP/p.json" -w '%{http_code}' "$SITE/api/v1/health" 2>/dev/null)
[ "$P" = "200" ] && pass "GET $SITE/api/v1/health -> 200" || fail "proxied health returned $P"
curl -sS -m 15 -o "$TMP/stg.json" "https://moon-astra-api-staging.ai-civ.com/api/v1/health" >/dev/null 2>&1
PT=$(python3 -c "import json;print(json.load(open('$TMP/p.json'))['tick'])" 2>/dev/null)
DT=$(python3 -c "import json;print(json.load(open('$TMP/h2.json'))['tick'])" 2>/dev/null)
ST=$(python3 -c "import json;print(json.load(open('$TMP/stg.json'))['tick'])" 2>/dev/null)
if [ -n "$PT" ] && [ -n "$ST" ] && [ "$PT" != "$ST" ]; then
  pass "proxy tick $PT != staging tick $ST — the site is NOT wired to the staging world"
else
  fail "proxy tick ($PT) matches staging tick ($ST) — the public site may be talking to the staging world"
fi
if [ -n "$PT" ] && [ -n "$DT" ]; then
  D=$(( PT > DT ? PT - DT : DT - PT ))
  [ "$D" -lt 60 ] && pass "proxy tick $PT within ${D}s of direct-API tick $DT — same world" \
                  || fail "proxy tick $PT vs direct $DT differ by $D — different worlds behind one URL"
fi

section "9. Entry page and asset integrity"
E=$(curl -sS -m 20 -o "$TMP/idx.html" -w '%{http_code}' -L "$SITE/" 2>/dev/null)
[ "$E" = "200" ] && pass "$SITE/ -> 200" || fail "$SITE/ returned $E"
grep -q 'assets/index-.*\.js' "$TMP/idx.html" 2>/dev/null
[ $? -eq 0 ] && pass "entry page references a hashed JS bundle" || fail "entry page has no hashed bundle reference"
X=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$SITE/assets/index-DOES-NOT-EXIST.js" 2>/dev/null)
[ "$X" = "404" ] && pass "CONTROL: a missing asset 404s (no SPA fallback masking broken builds)" || fail "CONTROL: missing asset returned $X, not 404 — an SPA fallback is hiding missing assets"
fi

# ---------------------------------------------------------------------------
if [ "$LABEL" = "STAGING" ]; then
section "10. Backup lane — STAGING IS DELIBERATELY NOT BACKED UP"
echo "  NOTE  staging has NO backup lane, by decision, not by oversight: it is a"
echo "        disposable world fed by the Netlify branch-deploy preview. Losing it"
echo "        costs a redeploy, not player state. If that ever stops being true,"
echo "        add a second --label to moon_astra_backup.py pointing at"
echo "        /var/lib/moon-astra-staging/world.sqlite. Owner: fleet-lead."
echo "        The manifest checked in production mode covers the PRODUCTION world"
echo "        ONLY — do not read a green there as cover for this one."
else
section "10. Backup lane is ALIVE, not merely configured"
# A stopped instrument reports its last reading forever. Check the FRESHNESS of
# the newest GREEN, not merely that green rows exist.
MAN="${ACG_REPO:-/home/corey/projects/AI-CIV/ACG}/data/durability/moon_astra_manifest.jsonl"
if [ -r "$MAN" ]; then
  python3 - "$MAN" <<'PY'
import json,sys,datetime
rows=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]
greens=[r for r in rows if r.get("result")=="GREEN"]
if not greens:
    print("  FAIL  no GREEN backup has ever been recorded"); sys.exit(1)
last=greens[-1]
ts=datetime.datetime.strptime(last["ts"],"%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
age=(datetime.datetime.now(datetime.timezone.utc)-ts).total_seconds()/3600
ok=True
print(f"  {'PASS' if age<3 else 'FAIL'}  newest GREEN snapshot is {age:.2f}h old (hourly lane; >3h means it stopped)")
if age>=3: ok=False
for k in ("sha256_match","row_counts_match","offmachine_confirmed","local_opened","remote_opened"):
    v=last.get(k)
    print(f"  {'PASS' if v else 'FAIL'}  {k} = {v}")
    if not v: ok=False
print(f"  {'PASS' if last.get('integrity')=='ok' else 'FAIL'}  restored-copy integrity_check = {last.get('integrity')}")
if last.get("integrity")!="ok": ok=False
reds=[r for r in rows if r.get("result")=="RED"]
print(f"  {'PASS' if reds else 'FAIL'}  CONTROL: this gate HAS gone red {len(reds)}x historically — it is not a false-green")
if not reds: ok=False
sys.exit(0 if ok else 1)
PY
  [ $? -eq 0 ] || FAIL=$((FAIL+1))
  FLAG="${ACG_REPO:-/home/corey/projects/AI-CIV/ACG}/data/durability/MOON-ASTRA-BACKUP-FAILED.flag"
  [ -e "$FLAG" ] && fail "MOON-ASTRA-BACKUP-FAILED.flag is PRESENT — the lane is failing loud, go read it" \
                 || pass "no MOON-ASTRA-BACKUP-FAILED.flag"
else
  skip "backup manifest not readable at $MAN (set ACG_REPO) — section 10 not run"
fi

fi

printf '\n=== %s: %d failed, %d skipped ===\n' "$LABEL" "$FAIL" "$SKIP"
[ "$SKIP" -gt 0 ] && printf 'NOTE: a SKIP is not a PASS. Those checks did not run.\n'
exit "$FAIL"
