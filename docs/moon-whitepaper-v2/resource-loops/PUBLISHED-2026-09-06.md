# Resource loops addendum — published September 6, 2026

Live: https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/ . Linked from the main whitepaper's introductory addendum card and contents sidebar.

Canonical manuscript: `/home/corey/projects/moon-civilization/ideas/deeper-resource-loops.md`. The ideas folder sits at the main project root and is linked from its README. The rover fork holds a pointer; it no longer maintains a second proposal. Rebuild instructions are in README.md beside this record.

Website commit `0f6047179337dcd4cd44c53e26b40b9f77df2b38`. Netlify production `6a9d84cb8754e6000864791f`, published **2026-09-06T15:21:48.417Z**. Reviewed preview `6a9d842b2aaf0341683c9f43` used the same commit. Canonical authoring source `e5c8f3413bff48475a5be4fcdaff66a3d9cba53b`, pushed on `docs/moon-resource-loops`; rover pointer source `1a4123572f3d4ce1538286ee07b4253fdd19f37d` on `development/rover-motion`.

The six-file website change adds the child HTML, its small JS/CSS, public Markdown and provenance, plus two navigation additions to the parent HTML. All original parent content matches exactly after removing those two additions; parent assets, models, PDF and scripts are unchanged. The canonical website checkout and unrelated ACG work were preserved. No game server, database, configuration or routing changes.

Verification passed locally, on preview, and on production: all 16 new chapters, all 24 parent chapters, comparison calculations/controls, desktop and 390px mobile, table containment, navigation, no-JavaScript reading, actual payload bytes, extensionless/slash URLs, and missing-asset 404s. Browser tests issued no game API requests and had no page errors or failed resources. Separate read-only production health showed four players at tick 52331. Homepage, both games and original review matched prior public hashes. The normal privacy gate passed all four affected public text surfaces with zero hits; no bypass.

Evidence and pre-change snapshots: `/home/corey/moon-deployments/resource-page-20260906T150927Z`. The scoped source/publication backup and its completed Expansion copy receipt are indexed at `/home/corey/moon-deployments/RESOURCE-PAGE-LATEST.json`. Retain the previous full project/site backups: the child reuses parent assets, so the scoped ZIP is not a standalone full-site deploy.

Rollback: review later website work and revert only the scoped website commit through the normal full-site Git workflow. Before-change parent HTML is archived. Do not reset the whole site, upload a partial Netlify site, or touch game services for a report rollback.
