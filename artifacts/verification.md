# Verification — September 4, 2026

- **Production build:** passed (`npm run build`). The only bundler advisory is the size of the Three.js-containing JavaScript bundle, approximately 154 KB compressed.
- **Core checks:** 8 passed across geography and simulation. Verified spherical coverage, matching cube-face boundaries, polar/date-line coordinate behavior, real NASA height ranges, resource production, recursive machine manufacturing, power shortages, pause, placement rejection, and save restoration.
- **Browser playthroughs:** 3 passed, no failures or retries. See `browser-results.json`. Actual UI controls built five machine types, produced resources, manufactured a new machine automatically, saved/reloaded the same factory, visited the far side and returned. Additional checks covered globe descent, Tycho regional terrain, region outlines, the south pole, and a 390 × 844 phone viewport.
- **Packaged build smoke check:** passed against `dist/` through a separate temporary local preview. WebGL canvas and orbital controls worked, no browser errors, and development diagnostics were absent. The temporary server was stopped after verification.
- **Visual review:** inspected desktop surface, a working factory, the whole Moon, Tycho, outlined regions, phone controls, and the phone atlas. Final contrast adjustment strengthens interface legibility over bright highland terrain.

The playable development server runs at `http://localhost:4173/`. Tests use isolated browser contexts and do not seed the user's browser with a prebuilt factory.

Useful captures: `production-surface.png`, `replicating-factory.png`, `orbit.png`, `tycho-region.png`, `stitched-regions.png`, `mobile.png`, `mobile-atlas.png`.
