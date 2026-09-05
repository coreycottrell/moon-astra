# MOON operations

Project: `/home/corey/projects/moon-civilization`, branch `development/shared-world`.

The maintained runbook is [dev-ops.md](dev-ops.md). This is its operations entrypoint; keep procedures in that file so they stay consistent. Release coordination lives in the [shared notepad](SHARED-NOTEPAD.md).

| Use | Address or command |
| --- | --- |
| Local game | http://localhost:4175 |
| Same Wi-Fi | http://192.168.6.34:4175 — address verified September 5, 2026 |
| Animated equipment gallery | http://192.168.6.34:4175/machines.html |
| Public game | https://ai-civ.com/moon-astra/ |
| Local server console | `tmux attach -t moon-server`; detach with Ctrl+B, then D |
| Local health | `curl --fail --silent http://127.0.0.1:4175/api/v1/health` |
| Local server logs | `tmux capture-pane -p -t moon-server -S -80` |
| Current source package | `/home/corey/moon-releases/LATEST.json` |

At the September 5, 18:42 UTC review, the local game had Blender art revision `412eef1`; the public game still served its earlier `index-BRsLgszM.js` bundle, and the public gallery returned 404. Both public production and staging health endpoints reported economy version 2. Treat these as dated observations; consult the shared note and endpoints before a release.

The Blender update changes the client and prepared models. The current economy-v2 backend and saved worlds remain compatible. The tower's game, production and staging have separate databases and browser identities; export a player's token to reconnect to the same world elsewhere.

For restart and recovery, follow [the runbook](dev-ops.md#runtime-and-commands). For the next website release, read the [Blender deployment instructions](art/README.md#deploy-with-acg), [hosting handoff](docs/ACG-HOSTING-ai-civ.com.md), and [operations review for ACG](docs/ACG-OPS-REVIEW-2026-09-05.md). Run one world process per database. Preserve the current worlds during this art release.
