# MOON deployment runbook — the procedure AS EXECUTED

Every fact below was read off the running system on 2026-09-05 between 18:28Z and
18:40Z, not from the handoff document and not from memory. Where a command is
shown, it was run; where an output is shown, that is what came back.

Host: `aiciv-hub`, Hetzner CPX31, Ubuntu 24.04.3 LTS, `root@87.99.131.49`.
Two services, two worlds, one box:

| | production | staging |
|---|---|---|
| unit | `moon-astra.service` | `moon-astra-staging.service` |
| loopback | `127.0.0.1:4180` | `127.0.0.1:4181` |
| public | `https://moon-astra-api.ai-civ.com` | `https://moon-astra-api-staging.ai-civ.com` |
| world DB | `/var/lib/moon-astra/world.sqlite` | `/var/lib/moon-astra-staging/world.sqlite` |
| trusted origin | `https://ai-civ.com` | `https://deploy-moon-astra--aiciv-inc.netlify.app` |
| releases | `/srv/moon-astra/releases/<rev>` | `/srv/moon-astra-staging/releases/<rev>` |
| backed up | yes, hourly, verified | **no — deliberately** |

---

## 0. Read this first: the two things the handoff got wrong on the real host

Both are already fixed in this repo at `9822f9a`, so a fresh reader of the current
templates will not hit them. They are recorded because **each one produces a green
that is a lie**, and that shape recurs.

### 0.1 `/usr/bin/node` does not exist on this host

The original template said `ExecStart=/usr/bin/node ...`. Verified live, 18:33Z:

```
$ ssh root@87.99.131.49 'ls -l /usr/bin/node'
ls: cannot access '/usr/bin/node': No such file or directory     # exit 2
$ ssh root@87.99.131.49 'ls -l /usr/local/bin/node'
lrwxrwxrwx  /usr/local/bin/node -> /opt/node-v24.20.0-linux-x64/bin/node
$ ssh root@87.99.131.49 '/usr/local/bin/node --version'
v24.20.0                                                          # exit 0
```

This fails at **exec**, not at runtime: systemd refuses with
`Failed to find executable /usr/bin/node: No such file or directory` and
`status=203/EXEC`. The service never starts at all.

The instructive part is *why it looked right*: the path had been verified — on the
**workstation**, where `/usr/bin/node` does exist. The right test aimed at the
wrong machine. Aim every interpreter check at the host that will run the unit.

### 0.2 The unit started nothing and exited 0

The bigger one, because it is silent. `server/world-server.mjs` guards its
entrypoint by comparing `path.resolve(process.argv[1])` with
`fileURLToPath(import.meta.url)`. Node resolves symlinks in the module URL but
`path.resolve` does **not** resolve them in `argv`. Launch through the prescribed
`/srv/moon-astra/current` symlink and the two strings differ, the guard is false,
and the process exits **0** in about 50ms — no listener, no error, no log line.

`systemctl is-active` returns **active**. `systemctl status` looks clean. The
deploy reads as green and nothing is serving.

Cure: `--preserve-symlinks-main` on the ExecStart line. It was chosen over
hardcoding the release path **specifically so the switch-symlink-and-restart
rollback in §5 keeps working** — hardcoding also fixes the guard, and silently
breaks rollback.

**This is why §4 check 2 exists.** Never accept `is-active` as proof a server is
serving. Ask whether anything is *listening*.

---

## 1. Prerequisites on a fresh host

```bash
# Node from the upstream tarball, exposed through a stable symlink.
# The symlink is the supported shape: upgrades repoint it, the unit never changes.
ssh root@HOST 'ls -l /usr/local/bin/node && /usr/local/bin/node --version'
# expect v24.13.1 or newer — package.json pins "engines": { "node": ">=24.13.1" }

# System user. Not a login account.
ssh root@HOST 'id moon-astra'
# uid=996(moon-astra) gid=987(moon-astra) groups=987(moon-astra)
```

Do **not** substitute an nvm path. systemd does not load shell setup, the unit
sets `ProtectHome=true` (which hides `/home` and `/root`), and it runs as
`moon-astra`, not as you.

**The backend needs no `npm install`.** Verified: there is no `node_modules` in
either release directory and the services have been up since 17:14Z.
`server/world-server.mjs` uses only the Node standard library; the single runtime
dependency (`three`) is a *client* dependency, bundled by Vite at build time.

---

## 2. Deploy a revision

```bash
REV=f372e8c                       # short revision — becomes the directory name
SVC=/srv/moon-astra               # or /srv/moon-astra-staging

# 2.1 Verify the archive BEFORE and AFTER transfer. Both, not one.
sha256sum -c moon-civilization-${REV}*.tar.gz.sha256      # on the workstation
scp moon-civilization-${REV}*.tar.gz root@HOST:/tmp/
ssh root@HOST "cd /tmp && sha256sum -c moon-civilization-${REV}*.tar.gz.sha256"
#            ^ this second one is the point. "scp exited 0" is not integrity.

# 2.2 Extract into a NEW release directory. Never over the live one.
ssh root@HOST "mkdir -p $SVC/releases/$REV && \
  tar -xzf /tmp/moon-civilization-${REV}*.tar.gz -C $SVC/releases/$REV --strip-components=1 && \
  chown -R root:moon-astra $SVC/releases/$REV && chmod -R 750 $SVC/releases/$REV"

# 2.3 SNAPSHOT BEFORE SWITCHING. See section 5 — this is the rollback target.

# 2.4 Flip the symlink and restart.
ssh root@HOST "ln -sfn releases/$REV $SVC/current && systemctl restart moon-astra"
```

The previous release directory **stays on disk**. Both `49f6d88` (32M) and
`f372e8c` (55M) are present on both services right now; that is what makes §5's
one-line code rollback possible.

---

## 3. Install or change a unit / vhost

```bash
scp units/moon-astra.service root@HOST:/etc/systemd/system/
ssh root@HOST 'systemctl daemon-reload && systemctl enable --now moon-astra'

scp nginx/moon-astra-api.conf root@HOST:/etc/nginx/sites-available/
scp nginx/snippets/moon-astra-api-location.conf root@HOST:/etc/nginx/snippets/
ssh root@HOST 'ln -sfn /etc/nginx/sites-available/moon-astra-api.conf \
                       /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx'
#                                                    ^ nginx -t before reload, always
```

TLS is certbot, already issued for both hostnames (ECDSA, expiry 2026-12-04,
`certbot.timer` active — checked 18:36Z). The vhosts reference the certificate
paths; they do not contain key material.

`enable` and `start` are different claims. `enable` is the one that survives a
reboot. §4 check 1 tests both, because a hand-started service passes `is-active`
right up until the next reboot.

---

## 4. Verify — run the script, do not eyeball it

```bash
./verify/verify-moon-deploy.sh              # production
./verify/verify-moon-deploy.sh --staging    # staging
# exit 0 = all green. exit N = N checks failed.
```

Both were run at 18:38–18:40Z: **PRODUCTION 0 failed 0 skipped; STAGING 0 failed
0 skipped.** Full output in `verify/last-run-*.txt`.

Every check ships a control that can go red, and the script itself was proven to
fail: pointed at a host that is not the MOON API it returns **exit 6** with five
named failures. A gate that has never gone red is a false-green waiting to happen.

What the ten checks are actually for:

1. **enabled AND active** — `active` alone dies at the next reboot.
2. **something is LISTENING** — the §0.2 defect. This is the check that would have
   caught it; `is-active` would not.
3. **the ExecStart interpreter exists** — the §0.1 defect. Control asserts
   `/usr/bin/node` is still absent, so the reason stays visible.
4. **`--preserve-symlinks-main` present.**
5. **tick advances across two reads** — a frozen simulation still answers 200.
6. **catalog matches the ruleset the client was built against** — this is the
   expensive failure: every check green, *about the wrong revision*. It is exactly
   what happened on the first deploy, and only reading Codex's notepad caught it.
7. **origin gate discriminates three ways** — untrusted origin → 403, trusted
   origin + bad name → 400, no token → 401. One probe proves nothing; the second
   is what proves the 403 was *about the origin* and not a blanket refusal.
   Both are non-mutating: neither can create a player.
8. **the site proxy reaches production, not staging** — compared by **tick**, not
   by response body. Recorded instrument note: `/api/v1/observe` returns the
   identical `UNAUTHORIZED` string on preview, staging and production, so it
   discriminates **nothing**. It was tried and discarded. Tick identity is the
   only thing that separates the worlds.
9. **a missing asset 404s** — proves no SPA fallback is quietly serving
   `index.html` in place of a broken build.
10. **the backup lane is alive** — freshness of the newest GREEN, not merely that
    greens exist. A stopped instrument reports its last reading forever.

**A defect this script found in itself, kept because it is the same class of bug:**
the first draft defined a shell function named `head`, which shadowed the `head`
command, so `... | head -1` returned nothing and check 3 reported a real, correctly
configured interpreter as missing. A false RED, from a name collision, in the
script whose whole job is to not lie. It only surfaced because the script was run
instead of shipped. **Run your runbook.**

---

## 5. Backup and rollback

See `backup/BACKUP-AND-ROLLBACK.md` for the full state, including a snapshot that
was actually restored and opened rather than merely written.

Two rollback targets, and they are independent:

```bash
# CODE ONLY — world untouched. Both release dirs are still on disk.
ssh root@HOST 'ln -sfn releases/49f6d88 /srv/moon-astra/current && systemctl restart moon-astra'

# CODE + WORLD — only if the world itself is damaged. Destroys play since the snapshot.
ssh root@HOST 'systemctl stop moon-astra && \
  tar -xzf /var/backups/moon-astra/pre-f372e8c-20260905T171404Z.tgz -C /var/lib && \
  ln -sfn releases/49f6d88 /srv/moon-astra/current && systemctl start moon-astra'
```

Take the code-only path first. It is reversible; the world restore is not.

---

## 6. Client / site side

The client is built from the *same* revision as the backend, and the site is a
separate repository (`aiciv-inc-site`, Netlify).

```bash
npm ci && npm test && npm run build:aiciv && npm run test:aiciv   # all must exit 0
```

Routing is in `netlify/` here. The one non-obvious piece, verified against
Netlify's own documentation rather than assumed:

- `_redirects` rules are processed **before** `netlify.toml` rules, first match
  wins — so a `netlify.toml` `[[redirects]]` block can never override the
  `_redirects` line for the same path.
- Redirects and headers are **global** and cannot be scoped to a deploy context,
  no matter where they are declared. `[build].command` **can** be.

⇒ The production/staging API swap is done by a **context-scoped build command**
that rewrites the one API line in `_redirects` before publish, then asserts the
rewrite took and exits non-zero if it did not. Fail-closed: if that command ever
stops running, no rule matches `/moon-astra/api/*` and preview API calls 404
rather than silently mutating the real shared world.

⚠️ **A context `command` REPLACES the site build command, it does not append.**
The first branch deploy failed (`exit code 2`) because the context block displaced
the site's stored `cd netlify/functions && npm ci`, which is the only thing that
installs `stripe` for two unrelated Netlify functions. The sed half was correct in
isolation; the defect was in the command that was **erased**. Any context command
inherits the duty of everything the site-level command was doing.

⚠️ **The site's pre-push privacy gate fires on `harvest*`**, which is MOON's core
machine name and appears in the objective copy. It is a false positive against
that rule's stated intent (OSINT optics). Published via the gate's documented,
logged `PRIVACY_GATE_BYPASS` escape — the gate was **not** disabled. **It will
trip on every future MOON site push** until someone baselines the file or narrows
the regex. Owner: legal-lead (per the gate script's own comment).
