# ACG handoff: host MOON at ai-civ.com/moon-astra

**Deploy the current civilization fork at `https://ai-civ.com/moon-astra/`.** Its source directory is `/home/corey/projects/moon-civilization`, branch `development/shared-world`. The URL name `moon-astra` does not mean deploying the preserved `/home/corey/projects/moon-astra` prototype. Keep that original project and its localhost:4173 game playable.

This document prepares the deployment for ACG. No website publication, DNS change, remote service installation, or message to ACG was performed while writing it. The remaining host-specific values are the chosen Linux server, its SSH destination, the HTTPS API hostname, and the actual system-wide Node binary path.

## 1. Use the existing site's deployment process

The site checkout is `/home/corey/projects/aiciv-inc-site`. Its README identifies the production site as Netlify `aiciv-inc`, connected to Git `main`, publishing the repository root. It explicitly requires **Git-based deployment** and prohibits `netlify deploy` for this site because prior partial uploads removed unrelated content. Follow the site's existing review and Git-publish workflow; do not replace the whole site with this game's build.

The checkout has unrelated local changes. Stage this addition in a clean worktree and leave those changes alone. The README's statement that `_redirects` was removed is stale: an actual `_redirects` file exists and contains current routes. Inspect both `_redirects` and `netlify.toml` before editing. Netlify evaluates `_redirects` before TOML rules, so place the new API rule before broader matching rules in `_redirects`. [Netlify processing order](https://docs.netlify.com/manage/routing/redirects/overview/#rule-processing-order).

The main site's documented build/runtime setup may use an older Node version. Keep its settings intact: build Moon separately with Node 24, then commit only the compiled client to the site's new `moon-astra/` directory.

## 2. Hosting layout

```text
Browser or AICIV
    https://ai-civ.com/moon-astra/
        ├─ index.html, assets/, data/  → existing Netlify static site
        └─ api/v1/*                  → Netlify HTTPS proxy
                                           ↓
                              https://<chosen-api-host>/api/v1/*
                                           ↓ TLS reverse proxy
                                   127.0.0.1:4180
                                           ↓ one Node world process
                              /var/lib/moon-astra/world.sqlite
```

Use a persistent Linux host for the backend. It runs a simulation clock and writes SQLite between requests; this implementation does not run as a Netlify Function or a static page alone. The browser polls observations once per second. Keep this short-request path for the launch: Netlify documents a 26-second proxy timeout, so an indefinitely open SSE stream is unsuitable through that proxy. [Netlify rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

The backend hostname used below, **`moon-astra-api.ai-civ.com`**, is a proposed value, not an existing service verified by this handoff. ACG should provision that hostname with HTTPS on an appropriate host, or substitute an existing dedicated HTTPS endpoint. Port 4180 is also a suggested private port: check that it is free on the chosen server. No new paid service is required if an existing host can run this process and retain its data.

## 3. Build and verify the client locally

From the current fork, using Node 24.13+ in the 24.x series. The repository now pins this: `.nvmrc` selects 24.13.1 (`nvm use` reads it) and `package.json` declares `"engines": {"node": ">=24.13.1"}`, so `npm` prints a loud `EBADENGINE` warning naming the required and current versions if the shell is on an older Node. That warning is advisory by default; run `npm install --engine-strict` to make it a hard failure.

```bash
cd /home/corey/projects/moon-civilization
nvm use            # reads .nvmrc; or otherwise put Node 24.13+ on PATH
node --version
npm ci
npm test
npm run build:aiciv
npm run test:aiciv
```

`build:aiciv` creates **`dist-aiciv/`**, with Vite's base path fixed to `/moon-astra/`. It leaves the normal local `dist/` build intact. The app's image, terrain, API, home-link, and exported access URLs now use that path. Vite supports a nested public base through its build configuration. [Vite public base path](https://vite.dev/guide/build#public-base-path).

`test:aiciv` uses a disposable local world and a reverse proxy with different frontend/backend origins. It checks the complete prefixed asset load, WebGL, browser join and mutation, CLI bootstrap, exported access URL, unrelated-Origin rejection, and preservation of the site's root. Evidence: `artifacts/aiciv-hosting-results.json` and `artifacts/aiciv-subpath.png`. It verifies our routing model locally; ACG must still check real Netlify forwarding in staging.

The preserved backup/tag `first-federation-v0.2.0` predates these hosting fixes. Use the current branch containing `scripts/build-aiciv.mjs`, `src/urls.js`, and this handoff. Deploy the frontend and API from the same source revision.

## 4. Install the persistent API on the selected host

Prepare this layout outside the Netlify publish directory:

```text
/srv/moon-astra/releases/<source-revision>/
    server/
    src/
    public/data/
    package.json
    package-lock.json
    NOTICE.md
/srv/moon-astra/current → releases/<source-revision>
/var/lib/moon-astra/world.sqlite
```

The API reads `public/data/moon-height.u16.gz` for foundation validation. Include the prepared data alongside the source. Keep the release readable by the service user and writable only by the deployer. Do not copy local `.world/`, `.agent-access/`, `.git/`, test databases, or browser credentials into the public site. A new online world starts empty; local games remain local. If migration is later desired, stop and back up the source server before moving its database deliberately.

On the Linux host, create a dedicated `moon-astra` system user if it does not already exist. Install a system-wide Node 24.13+ binary, or locate an existing suitable one. Shell `nvm` activation is not loaded by systemd. The API entrypoint's imports use only built-in Node modules and local source; it needs no npm install on the API host unless ACG also chooses to build/test there.

The supplied [systemd unit](../deploy/moon-astra.service) runs **`/usr/local/bin/node`**, not `/usr/bin/node`. On the ai-civ.com host there is no `/usr/bin/node` at all — Node is installed from the upstream tarball under `/opt` and exposed as a symlink. A unit naming a missing interpreter does not fail at runtime, it fails at exec: systemd refuses with `Failed to find executable /usr/bin/node: No such file or directory` and the service never starts. With `ProtectHome=true`, the runtime must live outside any user's home, so an nvm path cannot be used here.

**Prove the interpreter before installing the unit — do not assume it:**

```bash
ls -l /usr/local/bin/node          # expect a symlink into /opt/node-vXX.YY.Z-linux-x64/bin/node
/usr/local/bin/node --version      # expect v24.13.0 or newer; a non-zero exit means STOP
```

If it is missing, create it once (adjust the version directory to what is installed):

```bash
sudo ln -sfn /opt/node-v24.20.0-linux-x64/bin/node /usr/local/bin/node
```

The symlink is the supported shape: Node upgrades repoint it and `ExecStart` never changes. Point `current` at the prepared release, then install the reviewed unit:

> **Do not remove `--preserve-symlinks-main` from `ExecStart`.** It is required by the symlink layout above, not a stylistic flag. `server/world-server.mjs` decides whether it is the program being run by comparing `resolve(process.argv[1])` with `fileURLToPath(import.meta.url)`. Node resolves symlinks in the module URL but `path.resolve` does **not** resolve them in `argv`, so when the unit launches the server through `current`, `argv[1]` is the symlink path while `import.meta.url` is the real `releases/<revision>` path. The two never match, the entrypoint block is skipped, and **the process exits 0 in well under a second having opened no socket, logged no line, and raised no error** — `systemctl start` succeeds and `systemctl status` looks clean for a server that never started. Reproduced and fixed on 2026-09-05: without the flag the process exited 0 in 47 ms with no listener; with it the same command served `/api/v1/health` 200. The wrong alternative is hardcoding `/srv/moon-astra/releases/<revision>/server/world-server.mjs` into `ExecStart`: that also matches, but it pins the unit to one release and breaks the section 8 rollback, which works by repointing `current` and restarting. Keep the symlink; keep the flag. Always confirm a start with the health curl below, never with the exit status alone.

```bash
# On the chosen host, after creating the service user and release paths:
sudo install -m 0644 /path/to/release/deploy/moon-astra.service /etc/systemd/system/moon-astra.service
sudo systemctl daemon-reload
sudo systemctl enable --now moon-astra
sudo systemctl status moon-astra --no-pager
curl --fail http://127.0.0.1:4180/api/v1/health
```

Copy `deploy/` too if using the install command above, or transfer the unit separately. `StateDirectory=moon-astra` creates the persistent `/var/lib/moon-astra` directory with the configured ownership. The unit runs **one** process, resumes the database on restart, and logs to journald. SQLite persistence failures pause world advancement; a running PID alone does not establish health. Monitor the health endpoint's HTTP status and advancing `tick` as well as disk space.

Required environment, already in the template:

```ini
MOON_HOST=127.0.0.1
MOON_PORT=4180
MOON_DB=/var/lib/moon-astra/world.sqlite
MOON_PUBLIC_ORIGIN=https://ai-civ.com
```

`MOON_PUBLIC_ORIGIN` allows the exact browser origin through a proxy whose upstream Host header differs. It is an **origin**, without `/moon-astra` appended. Do not substitute `*`, disable the origin check, or rewrite every Origin header to a trusted value. Browser and AI mutations still need their player bearer token. No CORS configuration is needed when browsers use the same-origin `/moon-astra/api/` path.

## 5. Give the API a working HTTPS endpoint

Use the host's existing reverse proxy and certificate management. For Nginx, [deploy/nginx-moon-astra-api.conf](../deploy/nginx-moon-astra-api.conf) is a **location snippet for a dedicated HTTPS virtual host**, not a complete replacement for `nginx.conf`. Set up DNS and a valid certificate for the chosen API hostname first; include the snippet inside that host's TLS server block. If ACG uses Caddy or another proxy, reproduce the same mapping and headers there.

The mapping preserves `/api/v1/...` to `127.0.0.1:4180`. Forward `Authorization`, `Idempotency-Key`, and the original `Origin`; keep caching off. In the Nginx snippet, `proxy_pass` has no URI suffix, so the request path remains intact. [Nginx proxy_pass reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Validate/reload only the reviewed host configuration. Check the HTTPS origin before changing Netlify:

```bash
curl --fail https://moon-astra-api.ai-civ.com/api/v1/health
```

Use the hostname ACG actually provisioned. Keep port 4180 loopback-only; the TLS proxy is the external entry point. This game's current admission is open registration with a 24-account cap, not an invitation or identity-recovery service. Use a fresh online playtest world and monitor enrollment. Any external access gate must also support the AI clients' existing bearer Authorization header; Basic Auth would conflict with that header.

## 6. Stage the site addition without disturbing existing content

An example clean worktree on Corey's machine:

```bash
site_source=/home/corey/projects/aiciv-inc-site
site_work=/home/corey/projects/aiciv-inc-site-moon-astra

git -C "$site_source" worktree add -b deploy/moon-astra "$site_work" main
mkdir -p "$site_work/moon-astra"
rsync -a --delete /home/corey/projects/moon-civilization/dist-aiciv/ "$site_work/moon-astra/"
cp /home/corey/projects/moon-civilization/NOTICE.md "$site_work/moon-astra/NOTICE.md"
```

Choose an unused worktree path/branch if those already exist. The `--delete` target is **only the game subdirectory**, never the site root. If ACG already has a release worktree, use its established workflow instead. The resulting public files are `moon-astra/index.html`, `moon-astra/assets/`, `moon-astra/data/`, and the attribution notice.

Merge [deploy/netlify-moon-astra.redirects](../deploy/netlify-moon-astra.redirects) into the worktree's existing `_redirects`, before any broader match. With the proposed API hostname, the API rule is:

```text
/moon-astra/api/*  https://moon-astra-api.ai-civ.com/api/:splat  200!
/moon-astra  /moon-astra/index.html  200
```

The first rule is a proxy rewrite: `/moon-astra/api/v1/observe` reaches upstream `/api/v1/observe`. The second serves the entry page with or without a trailing slash. Do not add a redirect from `/moon-astra` to `/moon-astra/`: Netlify normalizes trailing slashes when matching rules, which can create loops. Do not add a global SPA fallback. [Netlify trailing-slash behavior](https://docs.netlify.com/manage/routing/redirects/redirect-options/#trailing-slash).

Merge [deploy/netlify-moon-astra.headers](../deploy/netlify-moon-astra.headers) into the site's `_headers` if present, or create that file with only these scoped rules. It permits long caching for hashed assets, revalidates unversioned terrain files, and revalidates the entry HTML. API responses already specify `Cache-Control: no-store`; verify that the proxy preserves it. Keep the site's other headers intact. [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/).

Do not set `Content-Encoding: gzip` globally or decompress/modify the prepared height file during upload. The loader already handles raw gzip bytes and correctly advertised automatic decompression. Keep the file unchanged so its recorded asset hash remains valid.

Review only the intended site diff:

```bash
git -C "$site_work" status --short
git -C "$site_work" add moon-astra _redirects _headers
git -C "$site_work" diff --cached --stat
git -C "$site_work" diff --cached -- _redirects _headers
```

If the site already uses TOML for scoped headers, merge there instead and stage that file rather than a nonexistent `_headers`. Follow the site's normal commit/review/merge-to-main process. **Do not run `netlify deploy`, change the publish directory to Moon, or change the main site's Node/build settings for this addition.**

## 7. Verify through Netlify, then complete the release

Use an isolated staging backend/database for a deploy-preview test, with its `MOON_PUBLIC_ORIGIN` set to that preview's exact HTTPS origin. Point the preview's scoped API rewrite at the staging backend. The public production origin remains `https://ai-civ.com`. A preview domain is not automatically trusted by the production world; a rejected preview join should not be fixed by broadening production origins.

Check these paths on the staged site and again at production after the normal site release:

| Check | Expected |
| --- | --- |
| `/moon-astra` and `/moon-astra/` | Game entry; no redirect loop |
| `/moon-astra/data/sources.json` | JSON terrain metadata, not the homepage HTML |
| `/moon-astra/data/moon-height.u16.gz` | Successful complete download; lunar terrain loads |
| `/moon-astra/assets/<actual-built-name>.js` | JavaScript with the correct MIME type |
| `/moon-astra/api/v1/health` | JSON, `ok: true`, `moon-neighbors-1`, advancing tick |
| `/moon-astra/api/v1/observe` without a token | 401 JSON, not a cached player's world |
| Existing `/`, blog, and existing Moon pages | Same content/routing as before |

Then join with a browser, place a machine, reload, and confirm the same identity/world. Join a **separate** player using the CLI and confirm it appears as a neighbor:

```bash
cd /home/corey/projects/moon-civilization
npm run agent -- --url https://ai-civ.com/moon-astra --access .agent-access/acg-online.json join ACG
npm run agent -- --url https://ai-civ.com/moon-astra --access .agent-access/acg-online.json bootstrap
npm run agent -- --url https://ai-civ.com/moon-astra --access .agent-access/acg-online.json observe
```

These commands create an actual online account and spend its in-game resources, so run them as ACG's intended playtest identity or use disposable names in staging. Do not paste tokens into deployment reports. Reuse the access file for that player instead of joining again. During staging, retry one identical command using the same idempotency key and verify it returns the prior receipt rather than creating duplicate work.

Confirm browser network requests stay under `/moon-astra/`; none should escape to root `/api/v1/` or `/data/`. Confirm browser POSTs work through real Netlify header forwarding, API responses stay uncached, and closing browsers leaves the server ticking. ACG's final deployment record should include the site commit/deploy identifier, backend revision, host/service/database location, tested URLs, and rollback target.

## 8. Updates, backup, and rollback

Keep the frontend and API on the same game ruleset. Before backend updates, record the release path and stop the single world service gracefully. Take a backup of the entire persistent directory, then switch the `current` symlink and restart. Never start a second production worker against the same SQLite database. Health 503 after a conflicting writer requires stopping the competing processes and restarting one, not deleting the database.

Example backend backup on the host:

```bash
sudo systemctl stop moon-astra
sudo install -d -m 0700 /var/backups/moon-astra
moon_backup_stamp=$(date -u +%Y%m%dT%H%M%SZ)
sudo tar -C /var/lib -czf "/var/backups/moon-astra/world-$moon_backup_stamp.tgz" moon-astra
sudo chmod 0600 "/var/backups/moon-astra/world-$moon_backup_stamp.tgz"
sudo systemctl start moon-astra
```

Check each command's exit status and verify archive contents/checksum before relying on it. Preserve any SQLite WAL/SHM companions with the database; do not copy an active database file by itself. Copy verified backups to ACG's existing separate backup storage. Browser access tokens require separate player exports; the database stores their hashes. The local Expansion-drive ZIP in the README is a development snapshot, not a backup of the hosted world.

For a bad site release, restore the prior good Netlify deploy through the site's existing rollback process or revert the scoped site commit. For a bad backend release, stop the service, restore the previous code revision, and use a database backup only if needed for ruleset compatibility; record any lost progress. Code rollback alone does not undo world simulation. Keep backend release and snapshot pairs, and retain the last working public asset set during rollout so older open tabs can be reloaded safely.

## Troubleshooting

| Symptom | First check |
| --- | --- |
| Blank page / root asset 404 | Was `build:aiciv` used, and its contents placed inside `moon-astra/`? |
| Terrain load reports bad data | Is the response the gzip file rather than an HTML fallback? |
| Join says `ORIGIN_REJECTED` | Exact `MOON_PUBLIC_ORIGIN`; actual forwarded Origin and Host; service restarted after config change |
| API returns 404 / site HTML | `_redirects` precedence and the `/api/:splat` upstream suffix |
| API returns 502 / 504 | TLS API health, Node service, proxy target/port, response duration |
| World resets on update | Is `MOON_DB` outside the release folder on persistent storage? |
| Player disappears on another URL | Browser storage belongs to its origin; use exported token and the same hosted world |
| Service is active but health is 503 | Journald, free disk space, SQLite errors, or another writer |
| `systemctl start` succeeds but nothing listens; journald shows no error and no ready line; unit sits inactive/exited with status 0 | Is `--preserve-symlinks-main` still in `ExecStart`? Launched through the `current` symlink without it, the entrypoint guard is false and the process exits 0 in milliseconds without starting. See the note in section 4. Confirm with `ss -ltn 'sport = :4180'` and the health curl, not the exit status |
| `systemctl start` fails immediately; journald shows `Failed to find executable ... No such file or directory` and `status=203/EXEC` | The `ExecStart` interpreter path does not exist on this host. This host has **no `/usr/bin/node`**; the binary is `/usr/local/bin/node`. Run the two verification commands in section 4 before installing the unit |
| Node import error for `node:sqlite` | Actual service binary version, not the deploy shell's `node --version`. `.nvmrc`/`engines` pin the build shell but **cannot** constrain the systemd unit, which runs an absolute binary path |

The launch remains the first shared-world preview: 24 accounts, 1,000 machines/jobs, full shared observations, and no account-recovery UI. The complete game design remains in the proposal; this hosting handoff does not change that scope.
