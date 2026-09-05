# ACG handoff — MOON design whitepaper v2

Corey requested a detailed illustrated HTML whitepaper with rotating 3D objects, prepared for ACG to host on ai-civ.com. The publication is complete static content. Publish the report as a separate page; publication does not authorize adopting its proposed game rules.

## Locations and recommended URL

- Authoring directory: `/home/corey/projects/moon-civilization/docs/moon-whitepaper-v2`
- Ready-to-publish directory: the `site/` subdirectory.
- Recommended public URL: **`https://ai-civ.com/moon-astra-whitepaper/`**.
- Local preview: `http://192.168.6.34:4190/moon-astra-whitepaper/` while the tower's `moon-whitepaper` tmux server is running.
- Transfer archive: `/home/corey/moon-releases/moon-whitepaper-v2-20260905.zip`.
- Adjacent `.sha256` verifies the archive. `PUBLICATION.json` and `CHECKSUMS.sha256` inside the archive identify and verify its included files. The archive does not replace the game source archive selected by `/home/corey/moon-releases/LATEST.json`.

## What readers get

24 chapters; more than 10,000 words; existing gameplay pictures; clean machine renders; authored SVG diagrams; six existing animated Blender machines; proposed Mason builder and Mole tunneler concepts; a capability atlas; construction-time and exponential-growth explorers; an operator-dashboard design study; browser-local review notes with Markdown/JSON export; editable manuscript; and a print PDF.

Proposals, illustrative calculations, existing source behavior, and art-only demonstrations are distinguished. The report makes no game API calls. The 3D viewer loads its own local scripts and model files, with no CDN or API key. The six GLBs are the current industrial art collection. The two new concept models are procedural code bundled into the report, not additional game assets or implemented mechanics.

## Publish through the existing website workflow

1. Verify the archive SHA-256, then extract into a new temporary directory. Run `sha256sum -c CHECKSUMS.sha256` there before using any content.
2. In the website checkout `/home/corey/projects/aiciv-inc-site`, work on a suitable isolated branch or worktree and preserve unrelated edits. Copy **the contents of the archive's `site/` directory** into a dedicated `moon-astra-whitepaper/` directory. Retain every included image, GLB, script, stylesheet, diagram, notice, manuscript and PDF. Do not copy the authoring tree into the public route.
3. Use the existing Netlify deployment workflow. The publication needs **no npm install, application server, API proxy, VPS restart, database migration, or game rebuild on the host**. `site/` is already built. Its JavaScript and CSS filenames are hashed, and every asset URL is relative to the report directory.
4. Ensure the extensionless route redirects to a trailing slash: `/moon-astra-whitepaper` → `/moon-astra-whitepaper/` (301). Let the static directory serve `index.html`. Avoid an SPA catch-all or rewrite that returns HTML for missing GLB/JS requests. Put any necessary redirect ahead of unrelated catch-alls, and inspect the site's existing rules rather than replacing them.
5. Preview the publication, run the checks below, then publish according to the website's existing approved workflow. Preserve `/moon-astra/` and `/moon-astra-review`; they are separate experiences. An optional navigation link can say “MOON design whitepaper.”

The report's own review notebook is **browser-local**, not a shared backend. Readers use Export to send notes to ACG. The page labels this explicitly; hosting it does not synchronize its notes across browsers.

## Acceptance on the actual preview and public URLs

- HTML renders at the trailing-slash route and its title is `MOON — The work of becoming · Design whitepaper v2`.
- All 24 chapters, figure images and internal chapter links work. The manuscript and PDF download successfully; PDF begins with `%PDF-`, not an HTML error page.
- The two JavaScript bundles (entry and lazy viewer) and stylesheet referenced by the generated HTML/imports return their real bytes. The viewer is roughly 650 KB uncompressed and loads only when needed. A static picture alone does not prove the 3D bundle works.
- Select all eight machine studies. The six GLBs under `models/` return `model/gltf-binary` or another suitable binary MIME type, begin with `glTF`, and match the package. Builder and tunneler load from bundled concept code.
- Drag, keyboard orbit, pause/resume, reset and trim controls work. Auto-rotation is disabled for reduced-motion users until they choose to resume. A missing model displays its static poster and a retry control. Test one deliberately missing URL and require an actual 404.
- Construction controls reveal the four-position assembly limit; prefabricated parts remove fabrication time. Growth controls update the printed formula's outputs. Both widgets remain labeled illustrative.
- A review note survives a page reload in the same browser and exports to Markdown/JSON. Do not expect server-side storage or access to another reader's notes.
- At 390px width, the body does not scroll horizontally; wide tables/atlas have their own scroll regions. The contents menu opens and closes. The manuscript remains readable with JavaScript disabled.
- Browser network inspection shows no report requests to game APIs or third-party CDNs. Existing game and review routes still respond normally.

Keep the preview and public verification results separate. The bundled `verification/checks.json` is **local publication evidence**, not proof of a Netlify deployment.

## Headers and caching

The page uses self-hosted module scripts, dynamic imports, images, SVG, video and same-origin GLB fetches. It also uses inline `style` attributes for trim swatches and calculated chart layout, and an inert JSON data block. Review the site's CSP: blocking inline styles can break these controls; blocking all `connect-src` can prevent same-origin GLB loading. No inline executable script, third-party font, analytics service or external inference service is required.

Use short/revalidated caching for the HTML and unversioned images/models, or version the whole publication directory. Hashed JS/CSS can be immutable. Keep accurate MIME types and compression for text assets. A refresh must not mix a new HTML file with missing hashed chunks. Preserve the game site's existing API and security headers.

## Rebuild and local verification

From the Moon repository, using its installed Node 24 dependencies and Python 3.12 with Python-Markdown:

```bash
node docs/moon-whitepaper-v2/build.mjs
node docs/moon-whitepaper-v2/verify.mjs
```

The verifier starts a disposable loopback HTTP server, uses Playwright/Chromium, renders clean posters, exercises the report at root and subpath URLs, checks controls/fallbacks/mobile/no-JS, verifies static bytes, and writes `site/whitepaper.pdf` plus `verification/checks.json`. Override `MOON_CHROMIUM_PATH` if Chromium is installed elsewhere. The build clears `site/`; verification recreates the PDF after a build.

For a persistent local preview:

```bash
node docs/moon-whitepaper-v2/serve.mjs
```

The default port is 4190. `MOON_PAPER_PORT` can select another port. This server is for reviewing a static publication; Netlify only needs its already-built files.

## Rollback

Revert only this publication's website commit or restore its previous complete directory. A report rollback must not touch the game backend, world database, game frontend or original review. Retain the corresponding complete hashed asset set with the HTML. Existing browser-local notes remain in their browsers under the v2 edition key.
