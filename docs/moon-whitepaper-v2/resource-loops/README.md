# Resource loops whitepaper addendum

Canonical manuscript: `/home/corey/projects/moon-civilization/ideas/deeper-resource-loops.md`. Edit that project-level document; the rover development fork only links to it.

Public route: `https://ai-civ.com/moon-astra-whitepaper/deeper-resource-loops/`.

Build into an isolated complete website checkout:

```sh
cd /home/corey/projects/moon-civilization
python3 docs/moon-whitepaper-v2/resource-loops/build.py --site-root /home/corey/projects/aiciv-inc-site-moon-v2
```

The builder converts all 16 chapters using Python-Markdown, adds an illustrative site-comparison widget, uses the parent whitepaper's current stylesheet/images/credits, writes a public manuscript and provenance record, and adds two idempotent navigation links to the parent HTML. The parent authoring template also includes those links. After rebuilding the entire original whitepaper, run this builder to include its child publication. No game build, game API call or backend restart is needed.

Only the existing parent `index.html` and the dedicated child directory belong in the website diff. Keep the original parent assets, manuscript, PDF, model viewer and other site pages intact. The child page works without JavaScript; the comparison uses invented rates and never accesses a live world. Browser checks should cover desktop/mobile, the complete manuscript, table overflow, navigation, comparison controls, no-JS reading and missing-asset 404s.

Publish through the website's existing full-site Git preview and main workflow, with the normal privacy gate. Never upload this partial directory as a whole Netlify site. Before publishing, save affected files and the base website revision. Roll back only this scoped publication change while preserving later unrelated edits and all game services.

Deployment evidence for the initial publication: `/home/corey/moon-deployments/resource-page-20260906T150927Z`; consult its final `published.json` for actual deployed status and revision.
