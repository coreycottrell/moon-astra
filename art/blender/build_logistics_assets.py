"""Rover elevator and six-bay depot apron. Blender source, metres, Z-up.

The elevator clip is supplied for the collection viewer. The game drives its
named Lift_platform rig from authoritative lift depth, including empty returns.
"""
from pathlib import Path
helpers=Path(__file__).with_name('build_foundry_assets.py').read_text().split('BUILDERS=')[0]
exec(compile(helpers,str(Path(__file__).with_name('build_foundry_assets.py')),'exec'))
OUT=ROOT/'public/models/logistics-01';OUT.mkdir(parents=True,exist_ok=True)
RENDERS=ROOT/'artifacts/logistics';RENDERS.mkdir(parents=True,exist_ok=True)
END=193

def elevator():
    # Open centre: the platform can visibly disappear into the dark shaft.
    for x in [-1,1]:
        cube('Shaft rim side',(x*2.15,0,.06),(.3,4.6,.12),'graphite',.045)
        cube('Safety stripe',(x*2.15,0,.13),(.18,4.35,.025),'orange',.006)
        for y in [-1,1]:
            cube('Lift guide',(x*1.98,y*1.98,-3.5),(.14,.14,8.4),'steel',.025)
            cylinder('Guide cap',(x*1.98,y*1.98,.75),.15,.16,'gold',16)
            cylinder('Anchor',(x*2.15,y*2.15,.08),.16,.1,'steel',6)
    for y in [-1,1]:
        cube('Approach sill',(0,y*2.15,.065),(4,.3,.13),'steel',.025)
        for x in range(-4,5):cube('Threshold chevron',(x*.38,y*2.15,.14),(.19,.22,.022),'orange',.005,rotation=(0,0,.35))
    platform=rig('Lift_platform',(0,0,0))
    cube('Elevator deck',(0,0,.045),(3.8,3.8,.09),'steel',.035,platform)
    for x in [-1,1]:cube('Wheel guidance',(x*1.35,0,.095),(.055,3.5,.025),'orange',.004,platform)
    for y in range(-9,10):cube('Deck grip',(0,y*.18,.095),(3.55,.028,.012),'graphite',.002,platform)
    for x in [-1,1]:
        for y in [-1,1]:bolts((x*1.55,y*1.55),(.28,.28),.11,parent=platform)
    keys(platform,'location',[(1,(0,0,0)),(49,(0,0,-8)),(97,(0,0,-8)),(145,(0,0,0)),(193,(0,0,0))])
    cube('Control cabinet',(2.48,.75,.52),(.45,.72,.95),'ceramic',.07)
    cube('Service hatch',(2.72,.75,.55),(.025,.48,.55),'graphite',.012)
    cylinder('Signal stem',(2.48,.75,1.2),.045,.45,'steel',12)
    cylinder('Lift signal',(2.48,.75,1.44),.105,.15,'light',20)
    label('LIFT',(0,-2.31,.055),.24,'ceramic',rotation=(0,0,0))
    for y in [-1,1]:tube('Hydraulic loop',[(2.04,y*1.5,.2),(2.45,y*1.5,.25),(2.45,y*.8,.32),(2.18,y*.8,.4)],.035,'copper')

def apron():
    # Six spokes and an open centre preserve the existing depot model.
    for n in range(6):
        a=n*math.pi/3;x,y=math.cos(a),math.sin(a)
        cube('Graded access spoke',(x*9,y*9,-.04),(9,4.9,.08),'graphite',.035,rotation=(0,0,a))
        for side in [-1,1]:
            for step in range(5):
                d=6.4+step*1.2;px,py=x*d-y*side*2.15,y*d+x*side*2.15
                cube('Apron lane mark',(px,py,.014),(.6,.065,.018),'gold',.003,rotation=(0,0,a))
        px,py=x*13,y*13
        for side in [-1,1]:
            cube('Future bay boundary',(px-y*side*2.8,py+x*side*2.8,.02),(5.6,.07,.025),'steel',.004,rotation=(0,0,a))
        label(str(n+1),(x*16.4,y*16.4,.035),.9,'gold',rotation=(0,0,a-math.pi/2))
        cylinder('Reflective stake',(x*17.2,y*17.2,.38),.055,.76,'steel',12)
        cylinder('Stake reflector',(x*17.2,y*17.2,.69),.067,.12,'orange',12)
    indicator=rig('Idle_apron_signal',(0,-5.2,.8));cylinder('Apron signal',(0,0,0),.13,.12,'light',20,indicator)
    keys(indicator,'scale',[(1,(1,1,1)),(97,(1,1,.8)),(193,(1,1,1))])
    label('PORT / SIX TERMINALS',(0,-6,.04),.4,'ceramic',rotation=(0,0,0))

scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=END
manifest={'version':'logistics-01','source':'art/blender/build_logistics_assets.py','units':'meters','models':{}}
roots={};collections={}
for kind,builder in {'lift':elevator,'depot-apron':apron}.items():
    PARTS=[];RIGS=[];current=bpy.data.objects.new(kind+'_ROOT',None);scene.collection.objects.link(current);roots[kind]=current
    before=set(bpy.data.objects);builder();members=[current]+[o for o in bpy.data.objects if o not in before]
    # Batch static geometry by material/rig while retaining animated rig names.
    groups=defaultdict(list)
    for o in PARTS:
        if o.type=='MESH':groups[(o.parent,o.data.materials[0])].append(o)
    for (parent,mat),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=parent.name+'__'+mat.name.replace(' ','_')
    members=[current]+[o for o in bpy.data.objects if o not in before]
    clips=[]
    for o in RIGS:
        if not o.animation_data or not o.animation_data.action:continue
        clip='Elevator' if o.name=='Lift_platform' else 'Idle';action=o.animation_data.action;action.name=kind+'_'+clip
        track=o.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);o.animation_data.action=None;clips.append(clip)
    coll=bpy.data.collections.new(kind);scene.collection.children.link(coll);collections[kind]=coll
    for o in members:
        for c in list(o.users_collection):c.objects.unlink(o)
        coll.objects.link(o)
    scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT')
    for o in members:o.select_set(True)
    file=OUT/(kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=True,export_yup=True,export_cameras=False,export_lights=False)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in members if o.type=='MESH')
    manifest['models'][kind]={'file':file.name,'triangles':triangles,'clips':clips,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    print('MODEL_COMPLETE',kind,triangles,flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.045,.065,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,energy,color,size in [('Key',(4,-9,12),2400,(1,.87,.72),8),('Rim',(-8,8,10),3200,(.5,.8,1),8)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.color=color;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Logistics camera');camera=bpy.data.objects.new('Logistics camera',cd);scene.collection.objects.link(camera);scene.camera=camera;cd.type='ORTHO'
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX';scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'moon-logistics-collection.blend'))
if '--render' in sys.argv:
    for kind in roots:
        for k,c in collections.items():c.hide_render=k!=kind
        camera.location=(7,-9,9) if kind=='lift' else (24,-30,40);target=Vector((0,0,-.1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();cd.ortho_scale=8 if kind=='lift' else 39
        scene.render.filepath=str(RENDERS/(kind+'-blender.png'));bpy.ops.render.render(write_still=True)
print('LOGISTICS_ASSETS_READY',flush=True)
