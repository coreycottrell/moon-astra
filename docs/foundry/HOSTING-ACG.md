# Hosting Foundry without replacing Neighbors

Corey requested an isolated next phase and preservation of the current playable game. Foundry is an incompatible new world, not an in-place backend upgrade.

Source: `/home/corey/projects/moon-foundry`, branch `development/physical-industry`. Start from the release revision and package described in RELEASE.md. The canonical shared note remains `/home/corey/projects/moon-civilization/SHARED-NOTEPAD.md`.

## Recommended deployment shape

Use a separate hostname such as `moon-foundry.ai-civ.com` for the simplest deployment: one Node 24 process serves the built static site and its API behind HTTPS. Alternatively, host the client at `/moon-foundry/` with a dedicated backend and explicit API proxy. Keep `https://ai-civ.com/moon-astra/` and its current API unchanged.

For the standalone hostname:

```sh
npm ci
npm run build
MOON_HOST=127.0.0.1 MOON_PORT=4206 \
MOON_DB=/srv/moon-foundry-data/world.sqlite \
MOON_PUBLIC_ORIGIN=https://moon-foundry.ai-civ.com \
npm start
```

Create the data directory for the service user with mode 0700. Do not copy either local or production Neighbors credentials or world into it. An absent path initializes a new Foundry world; an existing empty/incompatible SQLite file is rejected. Configure the process manager to send SIGTERM and give the server time to close its database.

Reverse-proxy both `/` and `/api/` to the new process. Preserve Host and normal forwarding headers; disable proxy buffering for `/api/v1/stream`. Keep the upstream loopback-only. Set `MOON_PUBLIC_ORIGIN` to the browser origin (no path). The backend rejects cross-origin browser writes except its configured origin or the same Host.

For a site subpath, build with `MOON_BASE_PATH=/moon-foundry/ npm run build:aiciv`. Copy **only** `dist-aiciv/` to the corresponding website directory. Proxy `/moon-foundry/api/v1/*` to the dedicated backend’s `/api/v1/*`; order that rule before static fallbacks. Set the backend public origin to `https://ai-civ.com`. Do not reuse the Neighbors API proxy. Serve the GLBs as binary files without SPA fallback and preserve the compiled base path. Test both `machines.html` and host-canonicalized extensionless URLs.

## Verification before publishing the link

- The health endpoint says `moon-foundry-1`, economy 3, with an advancing tick.
- Two disposable test callsigns create adjacent settlements in a staging Foundry world.
- A kit is carried and assembled. Pause/resume, a local material delivery, and a board post work through the deployed proxy.
- A delegated read-only token cannot build; a one-command building token cannot spend a second instruction; retries return the original receipt.
- Restart the dedicated process and verify identities, jobs, cargo and tokens survive.
- Inspect Mason and a new building in the gallery; check the 390 px mobile settlement dialog.
- Confirm the existing Neighbors game and API still report their own ruleset and world. Confirm the published whitepaper still loads.
- Verify a restore into a separate staging database before trusting the backup procedure.

Source checks and the local browser test report are in the release notes. These checks establish local behavior; they do not certify a new proxy, VPS configuration or production capacity.

## Whitepaper cross-reference

The fork links the published whitepaper at `https://ai-civ.com/moon-astra-whitepaper/`. The new `phase.html` page gives a feature-by-feature **available now / coming later** comparison, with actual Blender portraits. It is safe to host as a static companion page after verifying its relative links at the chosen mount.

Suggested website wording: “Foundry development preview: physical robot crews, local freight, maintenance, shared construction and supported machine replication. The existing Moon game remains available.” Link the full whitepaper separately. Do not describe the planetary computronium endgame, freeform AI-designed machinery, or closed semiconductor manufacturing as implemented.

## Rollback and backup

Roll back the Foundry source and its matching database as a pair. Do not substitute an old Neighbors backend. Keep full private backups outside the web root; publish only the verified hosting payload. Use SQLite online backup for the dedicated Foundry world, validate its schema and world row, and retain old snapshots. See `ops.md`.
