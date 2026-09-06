# Moon v2 deployment

Public game: https://ai-civ.com/moon-astra-v2/ . Build with `MOON_BASE_PATH=/moon-astra-v2/ npm run build:aiciv`; publish only `dist-aiciv/` inside the website's `moon-astra-v2/` directory. Git push to a reviewed branch, verify its Netlify branch deploy, then fast-forward main. Never use `netlify deploy` on this multi-project website.

## Independent worlds

| Setting | Production | Staging |
| --- | --- | --- |
| systemd user/service | moon-astra-v2 | moon-astra-v2-staging |
| Loopback port | 4182 | 4183 |
| Release root | /srv/moon-astra-v2 | /srv/moon-astra-v2-staging |
| SQLite | /var/lib/moon-astra-v2/world.sqlite | /var/lib/moon-astra-v2-staging/world.sqlite |
| Browser origin | https://ai-civ.com | https://deploy-moon-astra-v2--aiciv-inc.netlify.app |

The `current` symlink targets an immutable release containing server/, src/, public/data/ and dist/. Node 24 starts with `--preserve-symlinks-main` because the entrypoint detects direct execution. StateDirectory creates each database directory privately. An absent database initializes Foundry schema 3; never supply a Neighbors database.

Production Netlify route:

```
/moon-astra-v2/api/* https://moon-astra-api.ai-civ.com/api/moon-astra-v2/:splat 200!
/moon-astra-v2 /moon-astra-v2/index.html 200
```

The existing Netlify branch/deploy-preview build command rewrites the API hostname to moon-astra-api-staging.ai-civ.com. Preserve that command and its npm-ci prefix. The two nginx snippets map only the new API prefix to the new loopback ports. Include the production snippet inside the existing production API TLS server and the staging snippet inside the existing staging API TLS server. Preserve their old includes and certificates. Run nginx -t before a graceful reload; never restart the old Moon services.

## Verify and recover

Check `/moon-astra-v2/api/v1/health` for ruleset moon-foundry-1, economyVersion 3 and advancing ticks. Use disposable identities only on staging to test placement, assembly, proxy writes, scoped tokens, retries and persistence. Verify compiled assets and the gallery at the actual Netlify branch URL. Verify original /moon-astra/, review and whitepaper bytes before and after promotion.

Before a release, use SQLite Connection.backup() on both affected worlds, validate integrity plus the actual world row, and copy backups off the VPS. Preserve nginx configuration and the deployed website Git revision. Keep backups private and outside web roots. Deployment evidence and initial backups live under `/home/corey/moon-deployments/`; V2-IN-PROGRESS.json points to the active run. Previous full source recovery copies are on Expansion.

To remove this edition from publication, revert only the v2 addition commit in the website (preserving subsequent unrelated commits), push main, and verify the deployment. Leave its world and service intact pending diagnosis. To remove v2 API routing, remove only the two new include lines, test nginx, then reload. Do not restore the entire old nginx tree over newer unrelated changes. For a backend rollback, stop only the selected v2 service, save its database/WAL recovery set, select a compatible schema-3 source and verified snapshot, then restart and verify. Never roll v2 back to Neighbors code or reset either original Moon world.
