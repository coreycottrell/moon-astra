# MOON / The work of becoming

An illustrated, interactive design whitepaper prepared for Corey and ACG. This is a separate static publication. It does not modify the game, its rules, or its persistent world.

The completed edition contains **24 chapters, 10,705 words, eight model studies, and a 37-page PDF**. The 3D studies include six existing animated Blender assets and two report-only mobile-machine concepts. Browser checks cover desktop/mobile layouts, model loading and motion, keyboard controls, reduced motion, local review-note export, calculator behavior, missing-model fallback, no-JavaScript reading, and root/subpath hosting.

Project directory: `/home/corey/projects/moon-civilization/docs/moon-whitepaper-v2`.

The editable design is `whitepaper.md`. `src/` contains the reading experience and model viewer; `public/` contains the existing project images, six animated Blender models, and authored diagrams. Proposed builder and tunneler models are illustrative geometry authored in `src/viewer.js`. The gallery labels their proposed status.

Build from the game repository with its existing dependencies and Node 24:

```bash
node docs/moon-whitepaper-v2/build.mjs
```

The build also uses Python 3.12 with Python-Markdown. Output is `site/`, with relative asset links and no external runtime/CDN dependency. Serve the directory through HTTP; WebGL module/GLB loading is not supported by double-clicking a `file://` URL.

```bash
python3 -m http.server 4190 --bind 0.0.0.0 --directory docs/moon-whitepaper-v2/site
```

Read `HOSTING-ACG.md` for publication, and `verification/checks.json` for the latest checks. The verification script also exports the print edition and captures the report's views. `site/whitepaper.pdf` is produced by verification, after the HTML build.

After verification, `python3 docs/moon-whitepaper-v2/package.py` (run from the game repository) creates a checksummed publication ZIP under `~/moon-releases/`. It uses `pdfinfo` to record the print edition's page count. `MOON_PUBLICATION_OUT` can override the output directory. This package is separate from the game's release archive and does not change its `LATEST.json` pointer.

Only the contents of `site/` belong at the public route. The report has no live game API client, analytics, account access, or external model calls. Its construction and growth calculators are explicitly simplified design illustrations, not simulations of the current live economy.
