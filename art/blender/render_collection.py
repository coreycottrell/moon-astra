"""Render the editable Blender collection as a single studio plate."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'art/blender/moon-industrial-collection.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.render.resolution_x=1800;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.filepath=str(root/'artifacts/machines/blender-collection.png')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/blender/moon-industrial-collection.blend'))
bpy.ops.render.render(write_still=True)
print('BLENDER_PLATE_READY',scene.render.filepath,flush=True)
