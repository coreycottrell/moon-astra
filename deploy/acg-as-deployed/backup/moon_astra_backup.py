#!/usr/bin/env python3
"""
moon_astra_backup.py — off-machine snapshots of the LIVE MOON world (Hub VPS 87.99.131.49).

WHY THIS EXISTS
    The live MOON world service (systemd `moon-astra`) writes
    /var/lib/moon-astra/world.sqlite on the Hub VPS. It accumulates real, irreversible
    player state (identities, claims, machines, jobs, the shared federation project).
    Until 2026-09-05 it had ZERO backups: /var/backups/moon-astra did not exist.

DIRECTION OF "OFF-MACHINE" — THE POINT THAT IS EASY TO GET BACKWARDS
    ACG's git durability spine backs the workstation UP TO aiciv-hub
    (`aiciv-hub:~/acg-backups/`). For THIS store the origin machine IS aiciv-hub,
    so a copy into ~/acg-backups would be a SAME-MACHINE copy wearing the word
    "off-machine". The off-machine direction here is reversed: hub -> workstation.
    A host-local snapshot in /var/backups/moon-astra is kept as the fast-restore
    tier, but it is NOT the durability claim. Two physical machines, or it does not count.

WHY THE ONLINE BACKUP API AND NOT §8's STOP-FIRST PROCEDURE
    docs/ACG-HOSTING-ai-civ.com.md §8 says: stop the service, tar the whole
    persistent dir, restart. That is correct for a PRE-UPDATE snapshot taken by a
    human/agent who is about to change the release -- and it is what took the first
    snapshot (world-20260905T151053Z.tgz). It is the WRONG shape for an unattended
    hourly lane: it would stop a live world with players in it, every hour, forever.
    sqlite's online backup API takes a transactionally consistent snapshot of a
    LIVE database, folding committed WAL content in, without disturbing the writer.
    That satisfies §8's actual requirement -- "do not copy an active database file
    by itself" -- because this is not a file copy at all. The service is never stopped.

VERIFICATION (a backup is a claim until it is opened)
    1. remote snapshot via sqlite online backup API (never a cp of a live db)
    2. remote OPEN: integrity_check + per-table row counts, on the hub
    3. gzip, checksum on the hub
    4. scp hub -> workstation
    5. local sha256 must EQUAL the hub's (proves the bytes landed)
    6. local OPEN: integrity_check + row counts must EQUAL the hub's (proves the
       bytes are still a database, not merely the same bytes)
    "scp exited 0" is not verification and is never accepted as such.

FAIL-LOUD
    Any failure -> non-zero exit, a RED line in data/durability/moon_astra_manifest.jsonl,
    and data/durability/MOON-ASTRA-BACKUP-FAILED.flag. Per
    memory/doctrine_git_backup_is_canon.md rule 3, a silent backup failure is the
    exact rot this spine exists to kill.

THREE OUTCOMES, NOT TWO -- AND WHY THE THIRD HAD TO BE ADDED
    result=GREEN    a snapshot landed and was verified end to end
    result=SKIPPED  none was needed; names the GREEN it deferred to
    (no row at all) the slot did not run -- a real absence, and the dangerous one
    Until 2026-09-05 the skip path returned 0 while writing NOTHING, so a healthy
    skip and a DEAD SLOT were the same observation, and the Chronos deliverer logged
    truth=DELIVERED / delivery_proven=true for a 39ms run that took no snapshot.
    A SKIPPED row is never counted by last_green(), so skips cannot chain off each
    other -- every skip stays anchored to the last REAL snapshot.

FIRE-AHEAD vs THE FRESHNESS GUARD -- READ BEFORE RAISING --min-fresh-hours
    The deliverer may fire an occurrence up to LOOKAHEAD_SECONDS=600 EARLY or
    LOOKBACK_SECONDS=900 LATE, so consecutive fires can be as close as
    3600-1500 = 2100s. With a 0.9h (3240s) guard, ONE skip is therefore reachable
    -- and was observed on the slot's first fire (15:47:09Z for a 15:53:00Z
    occurrence, 5m51s early). It CANNOT become permanent: after a skip the next
    fire is ~2h from the last real GREEN (worst case 5696.5s = 1.582h), far above
    the guard, so a snapshot is forced. Verified two independent ways that agree --
    closed-form worst-case algebra and a 20,000-hour randomized simulation: max
    consecutive skips = 1, worst-case GREEN-to-GREEN gap ~2.42h rather than 1h.
    THE CEILING: chaining begins the moment the guard exceeds 1.582h. Any
    --min-fresh-hours at or above ~1.6h lets an hourly slot skip twice in a row and
    starts a real drift. Keep it below that, or shorten the cadence with it.

ONE SCHEDULER
    Fired by Chronos kind=script (evt_moon_astra_world_backup_hourly). Never a cron,
    on this machine or on the host.

Owner: fleet-lead (Hub VPS + the kind=script lane).
Design of record: docs/ACG-HOSTING-ai-civ.com.md §8 + memory/doctrine_git_backup_is_canon.md
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEST_DIR = REPO / "data" / "durability" / "moon-astra"
MANIFEST = REPO / "data" / "durability" / "moon_astra_manifest.jsonl"
FAIL_FLAG = REPO / "data" / "durability" / "MOON-ASTRA-BACKUP-FAILED.flag"

DEFAULT_HOST = "aiciv-hub"
REMOTE_DB = "/var/lib/moon-astra/world.sqlite"
REMOTE_BACKUP_DIR = "/var/backups/moon-astra"
SERVICE = "moon-astra"
HEALTH_URL = "http://127.0.0.1:4180/api/v1/health"
LABEL = "moon-astra-world"

# Shipped to the hub over stdin so no script has to live on the far side.
# Takes a consistent snapshot of the LIVE db, then OPENS it and reports what it sees.
REMOTE_SNAPSHOT = r'''
import gzip, hashlib, json, os, shutil, sqlite3, sys, tempfile

src, out_gz = sys.argv[1], sys.argv[2]
tmpdir = tempfile.mkdtemp(prefix="moonsnap.")
snap = os.path.join(tmpdir, "world.sqlite")
try:
    # 1. online backup API: consistent snapshot of a LIVE db, writer undisturbed.
    con = sqlite3.connect("file:%s?mode=ro" % src, uri=True, timeout=30)
    try:
        out = sqlite3.connect(snap)
        try:
            con.backup(out)
        finally:
            out.close()
    finally:
        con.close()

    # 2. OPEN the snapshot on this side and report. Existence is not validity.
    c = sqlite3.connect("file:%s?mode=ro" % snap, uri=True)
    integrity = c.execute("PRAGMA integrity_check").fetchall()
    integrity = integrity[0][0] if len(integrity) == 1 else json.dumps(integrity)
    tables = [r[0] for r in c.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    counts = {t: c.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0] for t in tables}
    tick = None
    if "world" in tables:
        row = c.execute("SELECT data FROM world LIMIT 1").fetchone()
        if row:
            try:
                tick = json.loads(row[0]).get("tick")
            except Exception:
                tick = None
    c.close()

    # 3. compress into place, checksum the artifact that will actually travel.
    os.makedirs(os.path.dirname(out_gz), mode=0o700, exist_ok=True)
    with open(snap, "rb") as fi, gzip.open(out_gz, "wb", compresslevel=9) as fo:
        shutil.copyfileobj(fi, fo)
    os.chmod(out_gz, 0o600)
    h = hashlib.sha256()
    with open(out_gz, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)

    print(json.dumps({
        "integrity": integrity,
        "counts": counts,
        "tick": tick,
        "sha256": h.hexdigest(),
        "size_bytes": os.path.getsize(out_gz),
        "raw_bytes": os.path.getsize(snap),
        "path": out_gz,
    }))
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)
'''

# Opens a LOCAL gzipped snapshot and reports the same fields, for cross-machine comparison.
LOCAL_PROBE = r'''
import gzip, json, os, shutil, sqlite3, sys, tempfile

gz = sys.argv[1]
tmpdir = tempfile.mkdtemp(prefix="moonprobe.")
try:
    raw = os.path.join(tmpdir, "world.sqlite")
    with gzip.open(gz, "rb") as fi, open(raw, "wb") as fo:
        shutil.copyfileobj(fi, fo)
    c = sqlite3.connect("file:%s?mode=ro" % raw, uri=True)
    integrity = c.execute("PRAGMA integrity_check").fetchall()
    integrity = integrity[0][0] if len(integrity) == 1 else json.dumps(integrity)
    tables = [r[0] for r in c.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    counts = {t: c.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0] for t in tables}
    tick = None
    if "world" in tables:
        row = c.execute("SELECT data FROM world LIMIT 1").fetchone()
        if row:
            try:
                tick = json.loads(row[0]).get("tick")
            except Exception:
                tick = None
    c.close()
    print(json.dumps({"integrity": integrity, "counts": counts, "tick": tick}))
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)
'''


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def sh(cmd: list[str], timeout: int = 300, stdin: str | None = None):
    return subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=timeout)


def record(row: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST.open("a") as f:
        f.write(json.dumps(row, sort_keys=True) + "\n")


def fail(msg: str, **extra) -> int:
    row = {"ts": now(), "label": LABEL, "result": "RED", "error": msg}
    row.update(extra)
    record(row)
    FAIL_FLAG.parent.mkdir(parents=True, exist_ok=True)
    FAIL_FLAG.write_text(f"{now()} moon-astra world backup FAILED: {msg}\n")
    print(f"MOON-ASTRA BACKUP RED: {msg}", file=sys.stderr)
    return 1


def last_green() -> dict | None:
    if not MANIFEST.exists():
        return None
    best = None
    for line in MANIFEST.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get("result") == "GREEN" and d.get("label") == LABEL:
            best = d
    return best


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--keep", type=int, default=168,
                    help="snapshots retained on EACH side (default 168 = 7 days hourly)")
    ap.add_argument("--min-fresh-hours", type=float, default=0.0,
                    help="skip (records result=SKIPPED, exit 0) if the last GREEN is newer "
                         "than this. CEILING FOR AN HOURLY SLOT: 1.58h -- see the "
                         "fire-ahead note in the module docstring before raising it.")
    ap.add_argument("--drill", action="store_true",
                    help="restore drill: open the newest LOCAL copy and prove it is a database")
    a = ap.parse_args()
    t_start = time.time()

    DEST_DIR.mkdir(parents=True, exist_ok=True)

    if a.drill:
        copies = sorted(DEST_DIR.glob(f"{LABEL}-*.sqlite.gz"))
        if not copies:
            print("DRILL RED: no local copy to restore", file=sys.stderr)
            return 1
        newest = copies[-1]
        r = sh([sys.executable, "-c", LOCAL_PROBE, str(newest)])
        if r.returncode != 0:
            print(f"DRILL RED: {newest.name} did not open: {r.stderr[-300:]}", file=sys.stderr)
            return 1
        p = json.loads(r.stdout)
        ok = p["integrity"] == "ok"
        print(json.dumps({"drill": "PASS" if ok else "FAIL", "file": newest.name, **p}))
        return 0 if ok else 1

    if a.min_fresh_hours > 0:
        lg = last_green()
        if lg:
            age_h = (time.time() - datetime.strptime(
                lg["ts"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()) / 3600.0
            if age_h < a.min_fresh_hours:
                # A SKIP IS A DISTINCT OUTCOME AND MUST BE WRITTEN DOWN AS ONE.
                # It used to `return 0` silently, writing nothing here. That is the
                # false-green shape this organ exists to prevent, sitting inside the
                # organ: the run exits 0 in ~39ms, the Chronos deliverer classifies
                # exit 0 as OK and logs truth=DELIVERED / delivery_proven=true, and
                # an operator reading hourly sees "proven" for an hour in which NO
                # SNAPSHOT WAS TAKEN. Witnessed on the slot's first real fire,
                # 2026-09-05T15:47:09Z. Nothing was wrong with the SKIP -- skipping a
                # 0.50h-old GREEN is correct -- what was wrong was that the ledger
                # could not tell it from a backup that landed.
                #
                # Three states now, not two, and they are distinguishable at a glance:
                #   result=GREEN    a snapshot landed and was verified end to end
                #   result=SKIPPED  none was needed; names the GREEN it deferred to
                #   (no row)        the slot did not run at all -- a real absence
                # The third is the one that used to be indistinguishable from the
                # second, and it is the dangerous one: a dead slot and a healthy
                # skipping slot both wrote nothing.
                #
                # Deliberately NOT counted as a GREEN: last_green() filters on
                # result == "GREEN", so a SKIPPED row can never satisfy the freshness
                # guard for the NEXT run. Skips can therefore never chain off each
                # other -- every skip stays anchored to the last REAL snapshot.
                row = {
                    "ts": now(),
                    "label": LABEL,
                    "result": "SKIPPED",
                    "reason": "fresh-green-within-window",
                    "deferred_to_green_ts": lg["ts"],
                    "deferred_to_file": lg.get("file"),
                    "last_green_age_h": round(age_h, 4),
                    "min_fresh_hours": a.min_fresh_hours,
                    "snapshot_taken": False,
                    "offmachine_confirmed": False,
                    "duration_s": round(time.time() - t_start, 3),
                }
                record(row)
                print(f"SKIP: last GREEN is {age_h:.2f}h old (< {a.min_fresh_hours}h)")
                print(json.dumps(row, sort_keys=True))
                return 0

    t0 = time.time()
    st = stamp()
    fname = f"{LABEL}-{st}.sqlite.gz"
    remote_path = f"{REMOTE_BACKUP_DIR}/{fname}"

    # -- 0. the service must be up; a snapshot of a dead world is a finding, not a backup.
    #    `systemctl is-active` returns non-zero for BOTH "inactive" and "ssh could not
    #    reach the host", and the two need different humans. Separate them explicitly:
    #    a RED that names the wrong cause sends the operator to the wrong machine.
    probe = sh(["ssh", "-o", "ConnectTimeout=20", a.host, f"systemctl is-active {SERVICE}"])
    service_state = probe.stdout.strip()
    if not service_state:
        return fail(
            f"UNREACHABLE: ssh {a.host} produced no service state "
            f"(rc={probe.returncode}): {probe.stderr.strip()[-200:]}",
            failed_leg="ssh-reachability")
    if service_state != "active":
        return fail(f"service {SERVICE} is {service_state!r}, not active",
                    service_state=service_state, failed_leg="service-state")

    # -- 1+2+3. remote online snapshot, remote OPEN, compress, checksum
    r = sh(["ssh", "-o", "ConnectTimeout=20", a.host,
            f"python3 - {shlex.quote(REMOTE_DB)} {shlex.quote(remote_path)}"],
           timeout=600, stdin=REMOTE_SNAPSHOT)
    if r.returncode != 0:
        return fail(f"remote snapshot failed: {r.stderr.strip()[-400:]}")
    try:
        rp = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception as e:
        return fail(f"could not parse remote snapshot output ({e}): {r.stdout[-300:]}")
    if rp["integrity"] != "ok":
        return fail(f"remote snapshot integrity_check={rp['integrity']}")

    # -- 4. ship hub -> workstation (the actual off-machine leg)
    local_path = DEST_DIR / fname
    r = sh(["scp", "-q", f"{a.host}:{remote_path}", str(local_path)], timeout=900)
    if r.returncode != 0:
        return fail(f"scp hub->workstation failed: {r.stderr.strip()[-300:]}")

    # -- 5. bytes landed intact
    import hashlib
    h = hashlib.sha256()
    with local_path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    local_sha = h.hexdigest()
    if local_sha != rp["sha256"]:
        return fail(f"CHECKSUM MISMATCH hub={rp['sha256']} local={local_sha}")

    # -- 6. and the bytes are still a DATABASE on this side
    r = sh([sys.executable, "-c", LOCAL_PROBE, str(local_path)], timeout=300)
    if r.returncode != 0:
        return fail(f"local copy did not open: {r.stderr.strip()[-300:]}")
    lp = json.loads(r.stdout.strip())
    if lp["integrity"] != "ok":
        return fail(f"local copy integrity_check={lp['integrity']}")
    if lp["counts"] != rp["counts"]:
        return fail(f"ROW COUNT MISMATCH hub={rp['counts']} local={lp['counts']}")

    # -- 7. rotate BOTH sides, oldest first, never the one just written
    rotated_remote = 0
    r = sh(["ssh", "-o", "ConnectTimeout=20", a.host,
            f"ls -1t {REMOTE_BACKUP_DIR}/{LABEL}-*.sqlite.gz 2>/dev/null | tail -n +{a.keep + 1}"],
           timeout=120)
    victims = [v for v in r.stdout.split() if v and v != remote_path]
    if victims:
        q = " ".join(shlex.quote(v) for v in victims)
        rr = sh(["ssh", "-o", "ConnectTimeout=20", a.host, f"rm -f {q}"], timeout=120)
        if rr.returncode == 0:
            rotated_remote = len(victims)

    rotated_local = 0
    local_copies = sorted(DEST_DIR.glob(f"{LABEL}-*.sqlite.gz"))
    if len(local_copies) > a.keep:
        for old in local_copies[:len(local_copies) - a.keep]:
            if old != local_path:
                old.unlink(missing_ok=True)
                rotated_local += 1

    if FAIL_FLAG.exists():
        FAIL_FLAG.unlink()

    row = {
        "ts": now(),
        "label": LABEL,
        "result": "GREEN",
        "mode": "sqlite-online-backup",
        "service_state": service_state,
        "source_host": a.host,
        "source_path": REMOTE_DB,
        "remote_path": remote_path,
        "local_path": str(local_path.relative_to(REPO)),
        "file": fname,
        "sha256": local_sha,
        "sha256_match": True,
        "size_bytes": rp["size_bytes"],
        "raw_bytes": rp["raw_bytes"],
        "integrity": lp["integrity"],
        "row_counts": lp["counts"],
        "row_counts_match": True,
        "world_tick": lp["tick"],
        "remote_opened": True,
        "local_opened": True,
        "offmachine_confirmed": True,
        "keep": a.keep,
        "rotated_out_remote": rotated_remote,
        "rotated_out_local": rotated_local,
        "duration_s": round(time.time() - t0, 2),
    }
    record(row)
    print(json.dumps(row, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # never exit 0 on an unexpected path
        sys.exit(fail(f"unhandled: {type(e).__name__}: {e}"))
