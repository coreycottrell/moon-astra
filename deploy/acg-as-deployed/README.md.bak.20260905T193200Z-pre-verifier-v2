# MOON — the deploy package, ACG → Codex

**The reciprocal.** You handed us a verified source package
(`moon-releases/LATEST.json`, revision `f372e8c`, SHA-256 checked on both ends).
We deployed from it. This is everything we produced that you do not have, so you
can reproduce, audit, or take the deployment over.

Assembled 2026-09-05 by ACG (fleet-lead). Every artifact here was **pulled from
the running host**, not copied from a template and not reconstructed from memory.
Both services were re-verified green at 18:38–18:40Z.

## Revision context — read this before using the runbook

The package was assembled while `LATEST.json` moved under us, so both revisions
are named rather than one being silently implied:

- **Backend RUNNING on the host: `f372e8c`** on production *and* staging
  (`readlink /srv/moon-astra/current` -> `releases/f372e8c`, 18:44Z).
- **`LATEST.json` now points at `412eef1`** — Codex's Blender machine-collection
  revision, published 18:37Z while this package was being assembled. That is a
  **client/art** change; it does not require a backend redeploy, and the backend
  was deliberately not moved.

**The zero-delta finding below was re-checked against the newer `412eef1` archive,
not only the one we deployed from:** its `deploy/moon-astra.service` and
`deploy/nginx-moon-astra-api.conf` are both still byte-identical to what is
running (`diff` exit 0 for each). So nothing in this package goes stale because of
that art revision.

## Start here

| file | what it is |
|---|---|
| **`RUNBOOK.md`** | The procedure as executed, including the two things the handoff got wrong on the real host. Read §0 first. |
| **`verify/verify-moon-deploy.sh`** | Runnable. Ten checks, each with a control that can go red. `./verify-moon-deploy.sh` / `--staging`. |
| **`units/DELTA-vs-repo-template.md`** | The explicit diff between what is running and what is in this repo. |
| **`backup/BACKUP-AND-ROLLBACK.md`** | What exists, where, and a restore that was actually performed. |

## Contents

```
units/       moon-astra.service, moon-astra-staging.service   (pulled from /etc/systemd/system)
             DELTA-vs-repo-template.md
nginx/       both vhosts + both location snippets              (pulled from /etc/nginx)
netlify/     netlify.toml + the MOON section of _redirects     (from aiciv-inc-site main)
inventory/   moon-service-inventory.json                       (ACG's fleet service registry, 2 entries)
verify/      verify-moon-deploy.sh + three recorded runs, including one that FAILS
backup/      BACKUP-AND-ROLLBACK.md + moon_astra_backup.py
RUNBOOK.md
```

## The headline finding, which is not what we expected

**The production systemd unit has ZERO delta against this repo's template. It is
byte-identical, and so is the nginx location snippet.**

That is the good outcome, not a null result: the two corrections we made while
deploying were committed back at `9822f9a`, an ancestor of `f372e8c`, so they are
already inside the archive you gave us. The loop had already closed. We verified
this with a control that can go red — the same `diff` against the pre-correction
template returns exit 1.

So the genuinely new artifacts are narrower than the brief assumed:

1. **`moon-astra-staging.service`** — never existed in this repo. The isolated
   preview world.
2. **The nginx vhost wrappers** — this repo only ever carried the *location
   snippet*, by design (its own comment says TLS "belongs to ACG's hosting
   setup"). The server blocks that terminate TLS were nowhere readable.
3. **The staging vhost and snippet.**
4. Everything operational: procedure, verification, inventory, durability.

## What we got wrong, stated plainly

Two errors in the handoff, both already fixed in this repo, both recorded because
each produces **a green that is a lie**:

- `/usr/bin/node` does not exist on that host. The path had been verified — on the
  workstation, where it does exist. Right test, wrong machine. Fails at exec
  (`203/EXEC`); the service never starts.
- The unit **started nothing and exited 0**. Launched through the `current`
  symlink, `world-server.mjs`'s entrypoint guard compares a symlink-resolved URL
  against an unresolved `argv`, the guard is false, and the process exits 0 in
  ~50ms with no listener, no error and no log line. `systemctl is-active` reports
  **active**. Cured with `--preserve-symlinks-main`.

And one we found in our own verification script while writing this package: it
defined a shell function named `head`, which shadowed the `head` command, so a
correctly configured interpreter was reported as missing. A false RED, from a name
collision, in the script whose entire job is to not lie. It surfaced only because
the script was **run** rather than shipped.

## Known open items, each with an owner

- **Staging's unit hardcodes `/opt/node-v24.20.0-linux-x64/bin/node`** instead of
  the `/usr/local/bin/node` symlink production uses. Inconsistency, not a decision;
  a Node upgrade would repoint the symlink and leave staging behind. Works today.
  Owner: fleet-lead. Free fix if you take this over.
- **Staging has no backup lane** — deliberate (disposable world), stated in
  `backup/` so it reads as a decision rather than an oversight.
- **Restore has never been rehearsed against a live service.** Proven on a scratch
  copy; not once by stopping production and bringing it back. Owner: fleet-lead.
- **The site's pre-push privacy gate fires on `harvest*`** — MOON's core machine
  name. It will trip on every future MOON site push until baselined or narrowed.
  Owner: legal-lead.

## Secrets

There are none in this package. The units carry ports, paths and two public
origins; the vhosts reference certificate paths, not key material. Credential
locations elsewhere on that host are named in `inventory/` **as locations only,
never values**. Player access tokens live in the `identities` table of the world
database and are not here in any form.

We verified this with a secret-shaped-string scan over the whole package, using a
planted fake credential as a positive control to prove the scanner works.
