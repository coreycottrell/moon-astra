# MOON industrial collection 01

Six Blender-authored replacements for the original procedural machines. Their silhouettes, meters, machinery roles and ivory/graphite/copper/teal palette come from the playable prototype. The game keeps its existing terrain, placement rules, inventories and production rates.

Open **http://localhost:4175/machines.html** for the interactive equipment gallery after installing this revision. The website build exposes the same gallery at `/moon-astra/machines.html`. It supports orbit/zoom, a six-machine lineup, operating/idle demonstrations, and a phone layout. This gallery never connects to or changes the game world. The game's field guide and machine inspector link to it.

| Game type | Model | Animated mechanisms |
| --- | --- | --- |
| Seed lander | Pioneer | Two power wings and a scanning communications dish |
| Solar array | Helios | Tracking yoke with 80 photovoltaic cells, structural trusses and power umbilicals |
| Harvester | Regolith | Rotating auger, vertical drill feed and surveying sensor head; crawlers stay stationary while extracting |
| Refinery | Fraction | Copper induction assembly and rotating sealed process drum |
| Replicator | Genesis | Travelling bridge, fabrication head and growing workpiece |
| Mind node | Nous | Optical core and two counter-rotating routing rings within six cooled compute blades |

## Editable source and rebuild

- [Editable Blender collection](blender/moon-industrial-collection.blend), with all six collections, animated rigs, materials, camera and studio lights.
- [Deterministic modeling/export script](blender/build_machines.py).
- [Studio plate renderer](blender/render_collection.py).
- Runtime files: `public/models/industrial-01/{seed,solar,miner,refinery,replicator,compute}.glb` plus `manifest.json` containing checksums, sizes, triangle counts and rig names.

Tested with Blender 4.0.2. Blender and its glTF exporter need their normal Python standard library and NumPy. The tower's unrelated standalone Python interfered with `_ctypes`; the supplied launcher explicitly selects the system standard library for `/usr/bin/blender`. The exports require no Draco library, textures from third parties, paid service, or model API.

```bash
bash scripts/build-machine-assets.sh
# Optional: regenerate six Blender studio portraits as well.
bash scripts/build-machine-assets.sh --render
```

All editable dimensions are meters and Blender Z-up; glTF exports Y-up. Each file includes an approximately 12-second `Work` animation. Base shapes and animated parts are batched by material within their rigid parent so the rigs remain movable. The full collection is below 6 MiB. A geometry check enforces normals, exported clips, a 26-mesh-per-model limit and the existing placement footprint through sampled animation poses. The auger intentionally cuts up to 20 cm below the surface.

## Runtime behavior

`src/machine-assets.js` loads the six files once, shares their geometries and static materials between instances, and creates separate animation mixers and status lights for each machine. This follows the [Three.js glTF loader](https://threejs.org/docs/pages/GLTFLoader.html) and [per-object animation mixer](https://threejs.org/docs/pages/AnimationMixer.html) APIs. `src/machines.js` owns instance disposal without destroying the cached geometry when a placement ghost or neighboring view is removed.

Animations use smooth frame time. Pause, lack of supervision, lack of feedstock, Off programs and a disconnected client stop the relevant operating animation. Power shortages slow it. Replicator workpiece height follows the observed cycle progress in the game; the gallery demonstrates it without a simulation. These are mechanical illustrations, not a separate production clock or an engineering model of lunar solar tracking.

The obscured 3D scene holds its last frame while a game dialog is open, keeping settlement buttons responsive on slower renderers. World snapshots and interface values continue updating.

At 260 meters, each machine switches to the original lightweight procedural representation. Missing detailed files fall back to those original models. New artwork does not create collision or simulation entities. The original project at `/home/corey/projects/moon-astra` is untouched.

## Deploy with ACG

Rebuild the client with `npm run build:aiciv` and copy the **entire** `dist-aiciv/` output into the website's `moon-astra/` subdirectory. The build now has two HTML entry points and shared hashed JavaScript chunks; do not copy just `index.html` or assume the previous single-bundle filenames.

Include `machines.html` and `models/industrial-01/` as well as `assets/`, `data/` and the existing notice. The gallery and model requests honor Vite's `/moon-astra/` base. Future released art sets should use a new version folder so existing open tabs can still load their models. No database migration or world reset is part of this art update; keep the current economy-v2 backend and its persistent data.

Run `npm test`, `npm run test:browser`, `npm run build`, `npm run build:aiciv` and `npm run test:aiciv`. The browser suite covers actual game construction with the new models plus gallery animation, pause, instance switching, memory stability and phone layout. Render evidence is in `artifacts/machines/`.
