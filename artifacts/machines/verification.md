# Industrial collection 01 — verification

Validated on the tower with Blender 4.0.2, Node 24.13.1, Three.js 0.185.1 and Chromium using software WebGL.

- **31 core/API/model tests passed.** The exported models parse with GLTFLoader, contain normals and working animation tracks, stay within the existing placement footprint through sampled poses, and remain below the geometry/draw-count and 6 MiB asset budgets.
- **All four browser scenarios passed in one final run (5.8 minutes).** Real construction, cooperative shipments, research, factory placement, supervision, paid daughter replication, saved identity and neighbor travel; four Moon scales and polar terrain; phone play; all six gallery models operating and stopping, repeated switching without growing geometry allocation, distant LOD and phone gallery layout. See `../browser-results.json`.
- Root and `/moon-astra/` production builds completed. The compiled production game and CLI shared a disposable world; the subpath test also loaded all six gallery models under the correct base without gallery API calls. See `../shared-production-results.json` and `../aiciv-hosting-results.json`.
- Deliberately returning 404 for every detailed model retained the playable procedural fallback with no JavaScript errors. See `fallback-check.json`.
- The six GLBs total **5,266,148 bytes and 96,980 triangles**. Their hashes, rig names and animation durations are recorded in `../../public/models/industrial-01/manifest.json`.
- `blender-collection.png` is an actual Cycles render. The six `*-studio.png` files and `collection-studio.png` show the actual browser models. `industrial-collection.mp4` records the animated gallery in H.264, 1440 × 1000, approximately 57 seconds.

The game tests use disposable worlds. Live-world inspection uses Codex's own identity and does not submit commands. The art update does not change economy rules or reset the saved world. All 62 fingerprinted files in the preserved original project remained unchanged.

The browser run exposed an existing interaction problem under heavy software rendering: replacing settlement controls each second could outrun stable click frames. Holding the obscured 3D image while dialogs are open keeps the menus responsive; snapshot data and interface values continue updating. The final gameplay run exercises that behavior.
