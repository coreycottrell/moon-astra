# The units as RUNNING, diffed against the repo template

Every statement here was produced by pulling the unit off the host with
`ssh root@87.99.131.49 cat /etc/systemd/system/<unit>` and running `diff` against
the file in this repository. Nothing was reconstructed from memory or from the
handoff document.

Pulled 2026-09-05 18:29Z. Both units re-verified running at 18:38Z.

---

## Headline, and it is the opposite of what we expected

**The production unit has ZERO delta against the repo template. It is byte-identical.**

```
diff -u deploy/moon-astra.service  <running /etc/systemd/system/moon-astra.service>
  exit 0
```

That is not a null result — it is the good outcome, and it is worth stating
plainly because we set out expecting to find a drift. The two corrections ACG
made while deploying (interpreter path, symlink flag) were committed **back into
this repository** at `9822f9a`, which is an ancestor of `f372e8c`. So they are
already inside the archive named by `moon-releases/LATEST.json`:

```
tar -xzf moon-civilization-f372e8c184d1.tar.gz moon-civilization/deploy/moon-astra.service
diff -u <that file>  <running unit>
  exit 0
```

**Control, so the above is not a broken-instrument green:** the same `diff`
against the pre-correction template (`deploy/moon-astra.service.bak.20260905T151110Z`,
Codex's original) returns **exit 1**. The comparison can go red; it did not.

So for production there is nothing to hand back. The loop already closed.

## Where a real delta exists

### 1. `moon-astra-staging.service` — does not exist in this repo at all

This is the genuinely new artifact. ACG wrote it while building the isolated
preview world, and it was never contributed back. It is in `units/` here.

It differs from the production unit in five places, and each one is load-bearing:

| Field | production | staging | why |
|---|---|---|---|
| `ExecStart` interpreter | `/usr/local/bin/node` | `/opt/node-v24.20.0-linux-x64/bin/node` | see the caveat below — this one is a wart, not a design |
| `MOON_PORT` | 4180 | 4181 | two worlds, two loopback ports |
| `MOON_DB` | `/var/lib/moon-astra/world.sqlite` | `/var/lib/moon-astra-staging/world.sqlite` | separate stores |
| `StateDirectory` | `moon-astra` | `moon-astra-staging` | with `ProtectSystem=strict` this is the ONLY writable path, so staging **cannot** reach the production world file even by accident |
| `MOON_PUBLIC_ORIGIN` | `https://ai-civ.com` | `https://deploy-moon-astra--aiciv-inc.netlify.app` | `world-server.mjs` does `new URL(...).origin` — this is ONE origin, never a list. A second cannot be appended. It fails **closed** (`ORIGIN_REJECTED`) for everything else, by design |

**Caveat we are flagging against ourselves rather than quietly shipping:** the
staging unit hardcodes `/opt/node-v24.20.0-linux-x64/bin/node` instead of using
the `/usr/local/bin/node` symlink that production uses and that the production
unit's own comment block argues for at length. That is an inconsistency, not a
decision. A Node upgrade repoints the symlink and production follows it; staging
would keep executing a version directory that may no longer exist. It works today
(`test -x` passes, verified 18:38Z) so it is not urgent, but if you take over this
deployment, changing that line to `/usr/local/bin/node` is a free improvement.
Owner if we keep it: fleet-lead.

### 2. The nginx **vhost wrappers** — this repo only ever had the location block

`deploy/nginx-moon-astra-api.conf` in this repo is a *location snippet*, and its
own first line says so: *"Include INSIDE the dedicated HTTPS server block for the
API hostname. DNS and a working TLS certificate belong to ACG's existing hosting
setup."*

That was the right division of labour, and it means the server blocks that
actually terminate TLS were never written down anywhere you can read. They are in
`nginx/` here.

**The snippet itself is byte-identical to this repo's template** (`diff` exit 0,
same control as above), so it was installed verbatim as intended. What is new is
the wrapper: `server_name`, the ACME challenge location, the 80→443 redirect, the
certificate paths, and the per-vhost log files.

### 3. `moon-astra-staging-api.conf` + its snippet — new

Same shape as production, upstream `4181` instead of `4180`. The comment at the
top of the file is the guard rail: pointing this vhost at 4180 would put two
writers on one SQLite database.

## What is NOT redacted, and why

These units contain no secrets — ports, filesystem paths, and two public origins.
There is nothing to strip. Credential locations elsewhere on that host are named
in `inventory/moon-service-inventory.json` **as locations only, never as values**.

Player access tokens live in the `identities` table of the world database and are
not in this package in any form.
