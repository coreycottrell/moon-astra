"""MOON industrial collection. Blender 4.0+, no external asset downloads.

Run: blender -b --python art/blender/build_machines.py
Add -- --render for the six studio portraits (Cycles CPU).
All measurements are meters. Blender Z-up exports as glTF Y-up.
"""
import bpy, math, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
from collections import defaultdict

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/foundry-01'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'art/blender'; SOURCE.mkdir(parents=True,exist_ok=True)
RENDERS=ROOT/'artifacts/foundry'; RENDERS.mkdir(parents=True,exist_ok=True)
FPS=24; END=289
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials): bpy.data.materials.remove(data)

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,color,metal=0,rough=.45,emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    rgb=tuple(linear(((color>>s)&255)/255) for s in (16,8,0))
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    m.diffuse_color=(*rgb,1);return m
M={
 'ceramic':material('01 Ivory ceramic',0xE1DED2,.25,.34),
 'graphite':material('02 Graphite chassis',0x28333D,.72,.33),
 'rubber':material('03 Carbon seals',0x101820,.05,.65),
 'copper':material('04 Burnished copper',0xC77A45,.78,.3),
 'gold':material('05 Gold thermal blanket',0xD6AD62,.85,.38),
 'orange':material('06 Mission orange',0xE38B45,.25,.34),
 'steel':material('07 Machined titanium',0xB3BDC0,.85,.24),
 'solar':material('08 Photovoltaic indigo',0x123750,.7,.19),
 'teal':material('09 Instrument glass',0x174A51,.65,.22),
 'light':material('status_light',0x85F2DB,.25,.24,3),
 'hot':material('process_glow',0xFF9F4A,.3,.3,2),
 'ink':material('12 Stencil ink',0x27343A,.1,.6),
}
PARTS=[]; RIGS=[]; current=None
def finish(o,name,mat='ceramic',parent=None):
    o.name=name;o.parent=parent or current
    if o.type=='MESH':o.data.materials.clear();o.data.materials.append(M[mat])
    PARTS.append(o);return o
def cube(name,loc,size,mat='ceramic',bevel=.04,parent=None,rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rotation:o.rotation_euler=rotation
    if bevel:
        b=o.modifiers.new('Machined edge','BEVEL');b.width=bevel;b.segments=2
        bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,mat,parent)
def cylinder(name,loc,radius,depth,mat='steel',verts=24,parent=None,radius2=None,rotation=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=radius,radius2=radius if radius2 is None else radius2,depth=depth,location=loc)
    o=bpy.context.object
    if rotation:o.rotation_euler=rotation
    for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
    return finish(o,name,mat,parent)
def sphere(name,loc,scale,mat='steel',parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,parent)
def torus(name,loc,radius,tube=.055,mat='steel',parent=None,rotation=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=tube,major_segments=32,minor_segments=6,location=loc)
    o=bpy.context.object
    if rotation:o.rotation_euler=rotation
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,parent)
def beam(name,a,b,r=.06,mat='steel',parent=None):
    a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,mat,12,parent)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def tube(name,points,r=.045,mat='copper',parent=None):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=r;curve.bevel_resolution=2
    s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,mat,parent)
def label(text,loc,size=.24,mat='ink',parent=None,rotation=(math.pi/2,0,0)):
    curve=bpy.data.curves.new('Stencil '+text,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.extrude=.001;curve.resolution_u=3
    o=bpy.data.objects.new('Stencil '+text,curve);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rotation
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,'Stencil '+text,mat,parent)
def rig(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent or current;RIGS.append(o);return o
def keys(o,prop,values):
    for frame,value in values:setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=frame)
    for fc in o.animation_data.action.fcurves:
        for kp in fc.keyframe_points:kp.interpolation='LINEAR'
def rotate_loop(o,axis=2,turns=1):
    values=[]
    for frame in range(1,END+1,12):
        rot=[0,0,0];rot[axis]=2*math.pi*turns*(frame-1)/(END-1);values.append((frame,rot))
    keys(o,'rotation_euler',values)
def bolts(center,size,z,mat='steel',parent=None):
    x,y=center;w,d=size
    for dx in [-1,1]:
        for dy in [-1,1]:cylinder('Captive hex bolt',(x+dx*w/2,y+dy*d/2,z),.065,.05,mat,6,parent)
def base(w=4.6,d=4.6):
    cube('Foundation frame',(0,0,.22),(w,d,.35),'graphite',.16)
    cube('Floating deck',(0,0,.43),(w-.22,d-.22,.15),'steel',.06)
    for x in [-1,1]:
        for y in [-1,1]:
            px,py=x*(w/2-.32),y*(d/2-.32)
            cylinder('Ground anchor',(px,py,.07),.3,.15,'graphite',12)
            cylinder('Anchor lock',(px,py,.52),.12,.06,'orange',8)
    for i in range(7):cube('Deck groove',((i-3)*.45,-d/2+.32,.52),(.28,.3,.025),'rubber',0)
    bolts((0,0),(w-.85,d-.85),.535)
def radiator(center,w=1.5,h=2,count=12,parent=None):
    x,y,z=center;cube('Radiator frame',(x,y,z),(w,.18,h),'graphite',.04,parent)
    for i in range(count):cube('Radiator fin',(x,y-.13,z+(i-(count-1)/2)*(h-.15)/count),(w-.12,.12,.045),'steel',.01,parent)
def pv_panel(parent,x,y,w,d):
    cube('PV wing frame',(x,y,0),(w,d,.12),'steel',.025,parent)
    cube('PV backsheet',(x,y,.075),(w-.1,d-.1,.04),'rubber',.01,parent)
    nx,ny=5,8
    for i in range(nx):
        for j in range(ny):
            px=x+(i-(nx-1)/2)*(w-.18)/nx;py=y+(j-(ny-1)/2)*(d-.18)/ny
            cube('Photovoltaic cell',(px,py,.108),((w-.18)/nx-.025,(d-.18)/ny-.025,.022),'solar',.016,parent)
    for i in range(nx):cube('Silver bus bar',(x+(i-(nx-1)/2)*(w-.18)/nx,y,.123),(.012,d-.2,.008),'steel',0,parent)
    for j in [-1,1]:cube('PV edge rail',(x,y+j*(d/2-.06),.14),(w,.065,.05),'graphite',.01,parent)
def instrument(loc,w=1,h=.55,parent=None):
    x,y,z=loc;cube('Instrument bezel',loc,(w,.14,h),'graphite',.04,parent)
    cube('Instrument face',(x,y-.08,z),(w-.1,.025,h-.1),'teal',.018,parent)
    for i in range(3):cube('Readout bar',(x-w*.3+i*w*.23,y-.098,z),(.08,.012,h*.5),'light',.005,parent)

# Foundry collection: geometry is authored in meters, with real articulated rigs.
def wheel(parent,x,y,z,r=.23):
    axle=rig('Drive_wheel',(x,y,z),parent)
    cylinder('Carbon tire',(0,0,0),r,.14,'rubber',24,axle,rotation=(0,math.pi/2,0))
    for sign in [-1,1]:
        cylinder('Machined wheel hub',(sign*.073,0,0),r*.72,.028,'steel',16,axle,rotation=(0,math.pi/2,0))
        cylinder('Orange axle cap',(sign*.093,0,0),r*.28,.035,'orange',12,axle,rotation=(0,math.pi/2,0))
    for i in range(12):
        a=i*math.pi/6;cube('Dust traction rib',(0,math.sin(a)*r,math.cos(a)*r),(.17,.045,.045),'graphite',.009,axle,rotation=(a,0,0))
    rotate_loop(axle,0,2)

def rover(width=.82,length=1.1):
    body=rig('Suspended_chassis',(0,0,.43))
    cube('Pressure sealed chassis',(0,0,0),(width,length,.35),'graphite',.11,body)
    cube('Ceramic shell',(0,0,.19),(width*.88,length*.9,.22),'ceramic',.1,body)
    for x in [-1,1]:
        for y in [-1,0,1]:
            wheel(current,x*(width*.5+.065),y*length*.4,.24)
            beam('Suspension arm',(x*width*.25,y*length*.4,.48),(x*width*.5,y*length*.4,.24),.035,'copper')
    for y in [-1,1]:
        cube('Impact rail',(0,y*(length*.5+.05),.43),(width,.055,.11),'orange',.018)
        for x in [-1,1]:cube('Navigation light',(x*width*.28,y*(length*.5+.085),.6),(.13,.025,.06),'light',.008)
    for i in range(5):cube('Chassis radiator',((i-2)*.12,0,.76),(.065,length*.56,.03),'graphite',.006)
    tube('Exposed power loom',[(-width*.38,-.2,.49),(-width*.5,0,.61),(-width*.38,.2,.72)],.018,'copper')
    return body

def arm(parent,basepos=(0,0,.8),scale=1,tool='welder'):
    swivel=rig('Work_shoulder',basepos,parent)
    cylinder('Shoulder bearing',(0,0,0),.16*scale,.12*scale,'steel',24,swivel)
    upper=rig('Work_upper_arm',(0,0,.1*scale),swivel)
    cube('Upper arm',(0,0,.23*scale),(.13*scale,.17*scale,.46*scale),'orange',.035,upper)
    for x in [-1,1]:beam('Hydraulic ram',(x*.08*scale,0,.05*scale),(x*.08*scale,0,.42*scale),.025*scale,'steel',upper)
    elbow=rig('Work_forearm',(0,0,.48*scale),upper)
    cylinder('Elbow joint',(0,0,0),.105*scale,.19*scale,'graphite',20,elbow,rotation=(math.pi/2,0,0))
    cube('Forearm',(0,0,.19*scale),(.105*scale,.12*scale,.36*scale),'ceramic',.025,elbow)
    if tool=='welder':
        cylinder('Welding nozzle',(0,0,.44*scale),.045*scale,.2*scale,'copper',16,elbow)
        sphere('Weld tip',(0,0,.55*scale),(.022*scale,)*3,'hot',elbow)
    else:
        for side in [-1,1]:cube('Service pincer',(side*.075*scale,0,.43*scale),(.04*scale,.055*scale,.23*scale),'steel',.012,elbow,rotation=(0,side*.18,0))
    tube('Flexible service hose',[(0,.13*scale,0),(.04*scale,.16*scale,.23*scale),(0,.13*scale,.48*scale)],.022*scale,'copper',upper)
    keys(swivel,'rotation_euler',[(1,(0,0,-.35)),(145,(0,0,.35)),(289,(0,0,-.35))])
    keys(upper,'rotation_euler',[(1,(0,-.75,0)),(145,(0,-1.1,0)),(289,(0,-.75,0))])
    keys(elbow,'rotation_euler',[(1,(0,1.5,0)),(145,(0,1.9,0)),(289,(0,1.5,0))])

def sensor(loc=(0,-.25,.85),size=1):
    pan=rig('Idle_sensor',loc)
    cylinder('Sensor neck',(0,0,.07*size),.06*size,.14*size,'copper',16,pan)
    cube('Lidar housing',(0,0,.17*size),(.32*size,.19*size,.15*size),'ceramic',.04,pan)
    for x in [-1,1]:cylinder('Stereoscopic optic',(x*.095*size,-.103*size,.17*size),.047*size,.03*size,'light',16,pan,rotation=(math.pi/2,0,0))
    keys(pan,'rotation_euler',[(1,(0,0,-.4)),(145,(0,0,.4)),(289,(0,0,-.4))])

def mason():
    rover();arm(current,(.14,.22,.79));sensor((-.18,-.26,.74),.8)
    cube('Tool magazine',(.24,-.15,.84),(.28,.38,.14),'gold',.04)
    label('MASON', (0,-.57,.49),.11,'ceramic')
    for i in range(3):cylinder('Tool cartridge',(.15+i*.08,-.18,.95),.025,.14,'steel',12)

def atlas():
    rover(1.25,1.85)
    cube('Load bed',(0,.05,.83),(1.12,1.5,.14),'steel',.035)
    for x in [-1,1]:cube('Cargo retention frame',(x*.55,.05,1.02),(.06,1.55,.37),'orange',.02)
    cargo=rig('Payload_crate',(0,.14,.91))
    cube('Stackable freight cassette',(0,0,.22),(.9,1.18,.44),'ceramic',.07,cargo)
    for x in [-1,1]:cube('Cargo strap',(x*.31,0,.46),(.065,1.2,.022),'graphite',.008,cargo)
    for y in [-1,1]:cube('Container clasp',(0,y*.6,.22),(.22,.025,.15),'copper',.015,cargo)
    sensor((0,-.78,.75),.9);label('ATLAS / 20', (0,-.98,.43),.12,'ceramic')

def suture():
    rover(.94,1.22);arm(current,(.22,.1,.82),.8,'gripper');sensor((-.2,-.36,.78),.8)
    for i in range(3):
        cube('Replaceable service cassette',((i-1)*.23,.35,.92),(.18,.36,.3),'teal',.025)
        cube('Service cassette handle',((i-1)*.23,.35,1.1),(.1,.13,.03),'copper',.006)
    cube('Service cross horizontal',(-.22,-.19,.87),(.29,.07,.02),'light',.005)
    cube('Service cross vertical',(-.22,-.19,.88),(.07,.29,.02),'light',.005)
    label('SUTURE', (0,-.64,.5),.11,'ceramic')

def titan():
    rover(1.65,2.1);arm(current,(.3,.38,.86),1.8,'gripper');sensor((-.4,-.66,.78),1.3)
    for x in [-1,1]:
        cube('Outrigger rail',(x*.9,0,.63),(.14,1.65,.13),'orange',.025)
        for y in [-1,1]:cylinder('Stabilizer foot',(x*.91,y*.72,.16),.19,.14,'graphite',16)
    cube('Power module',(-.36,.43,.96),(.65,.66,.5),'gold',.07)
    label('TITAN', (0,-1.1,.49),.18,'ceramic')

def depot():
    base(7,6)
    for x in [-1,1]:
        cube('Storage rack column',(x*2.65,1.05,2.3),(.18,3.2,3.8),'graphite',.035)
        for z in [1,2.2,3.4]:
            cube('Cassette shelf',(x*1.85,1.1,z),(1.6,3.25,.13),'steel',.03)
            for y in [0,1.7]:
                cube('Freight container',(x*1.85,y,z+.46),(1.3,1.35,.82),'ceramic',.07)
                cube('Container band',(x*1.85,y-.69,z+.5),(1.32,.04,.15),'orange',.008)
    carriage=rig('Work_stock_lift',(0,.7,1))
    cube('Lift platform',(0,0,0),(1.5,2,.18),'copper',.025,carriage)
    keys(carriage,'location',[(1,(0,.7,1)),(97,(0,.7,3.4)),(193,(0,-1.1,3.4)),(289,(0,.7,1))])
    for x in [-1,1]:beam('Lift guide',(x*.78,1.5,.6),(x*.78,1.5,4.3),.065,'steel')
    cube('Dock canopy',(0,-1.9,3.7),(6.2,1.4,.18),'ceramic',.055)
    label('PORT / FREIGHT', (0,-2.62,3.63),.32,'ink');instrument((2.65,-2.3,1.2),.7,.5)
    for i in range(6):cube('Arrival guidance',((i-2.5)*.8,-2.65,.56),(.4,.12,.025),'light',.008)

def workshop():
    base(7,6)
    for x in [-1,1]:
        cube('Service tower',(x*2.5,.5,2.1),(1.1,3.6,3),'ceramic',.14)
        radiator((x*2.5,-1.35,2.2),.85,2,10)
        cube('Tower stripe',(x*2.5,-1.43,3.47),(1.05,.045,.18),'orange',.02)
    cube('Service gantry',(0,.5,3.9),(6.1,.75,.36),'graphite',.08)
    rack=rig('Work_service_head',(0,.5,3.45));cube('Diagnostic carriage',(0,0,0),(.85,.8,.55),'ceramic',.08,rack)
    for x in [-1,1]:beam('Diagnostic probe',(x*.25,0,-.1),(x*.45,0,-1.1),.055,'copper',rack)
    keys(rack,'location',[(1,(-1.4,.5,3.45)),(145,(1.4,.5,3.45)),(289,(-1.4,.5,3.45))])
    cube('Service platen',(0,0,.68),(2.5,3.9,.2),'teal',.05)
    for i in range(5):cube('Diagnostic strip',(0,(i-2)*.58,.79),(2.2,.04,.018),'light',.004)
    for x in [-1,1]:
        for i in range(4):cube('Spares drawer',(x*2.5,1.95,1+i*.5),(.75,.3,.35),'gold',.025)
    label('SUTURE / SERVICE', (0,-2.77,.7),.28,'ceramic')
    instrument((2.5,-1.51,1.2),.8,.5)

def robotfactory():
    base(9,8)
    for x in [-1,1]:
        cube('Foundry frame',(x*3.6,0,2.8),(.65,6.6,4.8),'graphite',.1)
        cube('Process enclosure',(x*3,1.7,2.3),(1.1,2.5,3.5),'ceramic',.12)
        radiator((x*3,3,2.3),.85,2.6,16)
    cube('Tool bridge',(0,1.8,5.3),(7.8,.7,.45),'ceramic',.1)
    for y in [-1.7,0,1.7]:
        cube('Assembly conveyor',(0,y,.9),(4.3,1.4,.4),'steel',.05)
        for i in range(9):cylinder('Conveyor roller',((i-4)*.44,y,1.14),.09,1.2,'graphite',12,rotation=(math.pi/2,0,0))
    arm(current,(-2.45,0,1.15),3.8,'gripper');arm(current,(2.45,1,1.15),3,'welder')
    work=rig('Manufactured_part',(0,0,1.24));cube('New robot chassis',(0,0,.36),(1.12,1.5,.72),'gold',.1,work)
    for x in [-1,1]:cube('Unfinished side module',(x*.62,0,.3),(.22,1.6,.35),'graphite',.04,work)
    keys(work,'scale',[(1,(1,1,.15)),(241,(1,1,1)),(265,(1,1,1)),(289,(1,1,.15))])
    for x in [-1,1]:cube('Bay light',(x*1.65,-3.6,1),(.14,.16,1),'light',.035)
    label('GENESIS / ROBOT FOUNDRY',(0,-3.9,.73),.32,'ceramic')
    instrument((3.65,-3.36,2.2),.85,.8)

def relay():
    base(3.8,3.8);cylinder('Utility hub',(0,0,1.1),1.2,1.3,'ceramic',12)
    for i in range(6):
        a=i*math.pi/3;cube('Power connector',(math.sin(a)*1.15,math.cos(a)*1.15,.93),(.4,.28,.4),'copper',.04,rotation=(0,0,-a))
    cylinder('Signal mast',(0,0,3.15),.13,3.5,'graphite',16)
    for z in [2.1,2.3,2.5,2.7]:torus('Fiber repeater',(0,0,z),.35,.035,'light')
    antenna=rig('Idle_dish',(0,0,4.75));cylinder('Phased array',(0,0,.15),.85,.16,'steel',32,antenna)
    for i in range(12):
        a=i*math.pi/6;sphere('Antenna cell',(math.sin(a)*.62,math.cos(a)*.62,.25),(.065,.065,.035),'solar',antenna)
    keys(antenna,'rotation_euler',[(1,(.3,0,0)),(145,(-.3,.3,1)),(289,(.3,0,0))]);label('NEXUS', (0,-1.91,.37),.2,'ceramic')

def tunnel():
    base(8,9)
    for x in [-1,1]:
        cube('Bore stabilizer',(x*3.15,0,1.1),(1.3,7.7,1.2),'graphite',.12)
        for i in range(8):cube('Crawler shoe',(x*3.15,(i-3.5)*.8,.48),(1.4,.59,.16),'steel',.025)
    cylinder('Shield barrel',(0,.1,2.7),2.3,5.2,'ceramic',48,rotation=(math.pi/2,0,0))
    for y in [-1.8,1.7]:torus('Shield reinforcement',(0,y,2.7),2.31,.13,'copper',rotation=(math.pi/2,0,0))
    cutter=rig('Work_cutterhead',(0,-2.6,2.7))
    cylinder('Cutter face',(0,0,0),2.18,.26,'graphite',48,cutter,rotation=(math.pi/2,0,0))
    for ring,n in [(1.75,16),(1.1,10),(.45,5)]:
        for i in range(n):
            a=i*math.pi*2/n;x,z=math.sin(a)*ring,math.cos(a)*ring
            cylinder('Disc cutter',(x,-.23,z),.16,.14,'copper',16,cutter,rotation=(math.pi/2,0,a))
            cube('Spoil aperture',(x*.83,-.15,z*.83),(.23,.03,.36),'rubber',.02,cutter,rotation=(0,-a,0))
    rotate_loop(cutter,1,1)
    cube('Spoil conveyor',(0,3.35,1.3),(1.5,2.6,.35),'orange',.06)
    for i in range(8):cube('Conveyor flight',(0,2.3+i*.3,1.51),(1.4,.08,.1),'steel',.016)
    for x in [-1,1]:tube('Hydraulic service loop',[(x*1.9,2,1.2),(x*2.7,2.4,2),(x*2.5,0,3.1),(x*2.2,-1.6,2.9)],.095,'copper')
    label('MOLE / UTILITY BORE',(0,2.74,3.7),.32,'ink',rotation=(math.pi/2,0,math.pi))
    sensor((0,.5,5.03),2)

def radiator_field():
    base(8,7)
    cube('Thermal exchange block',(0,0,1),(2.3,4.5,1),'ceramic',.14)
    for x in [-1,1]:
        hinge=rig('Idle_thermal_wing',(x*1.4,0,1.1))
        cube('Radiator wing',(x*1.5,0,1.5),(2.8,.2,3.1),'graphite',.06,hinge)
        for i in range(18):cube('Heat rejection fin',(x*1.5,-.15,.12+i*.16),(2.65,.09,.055),'steel',.01,hinge)
        for z in [.15,2.85]:tube('Coolant manifold',[(x*.2,-.22,z),(x*1.5,-.22,z),(x*2.75,-.22,z)],.055,'copper',hinge)
        keys(hinge,'rotation_euler',[(1,(0,x*.14,0)),(145,(0,x*.22,0)),(289,(0,x*.14,0))])
        tube('Thermal trunk',[(x*.6,-1.7,1.2),(x*1.3,-1.7,1.6),(x*1.5,-.2,1.6)],.1,'copper')
    pump=rig('Work_pump',(0,-1.6,1.64));torus('Thermal pulse',(0,0,0),.34,.06,'light',pump);rotate_loop(pump,2,2)
    label('UMBRA / THERMAL',(0,-2.4,.82),.29,'ink');instrument((0,-2.28,1.3),1.2,.4)

BUILDERS={'mason':mason,'atlas':atlas,'suture':suture,'titan':titan,'depot':depot,'workshop':workshop,'robotfactory':robotfactory,'relay':relay,'tunnel':tunnel,'radiator':radiator_field}
NAMES={'mason':'MASON / Generalist builder','atlas':'ATLAS / Cargo rover','suture':'SUTURE / Service crew','titan':'TITAN / Heavy constructor','depot':'PORT / Freight depot','workshop':'SUTURE / Service workshop','robotfactory':'GENESIS / Robot foundry','relay':'NEXUS / Utility relay','tunnel':'MOLE / Utility bore','radiator':'UMBRA / Radiator field'}
scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=END
collections={};roots={};manifest={'version':'foundry-01','source':'art/blender/build_foundry_assets.py','units':'meters','fps':FPS,'models':{}}
def batch_static():
    groups=defaultdict(list)
    for o in PARTS:
        if o.type=='MESH':groups[(o.parent,o.data.materials[0])].append(o)
    for (parent,mat),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=parent.name+'__'+mat.name.replace(' ','_')
for kind,builder in BUILDERS.items():
    PARTS=[];RIGS=[];collection=bpy.data.collections.new(kind);scene.collection.children.link(collection);collections[kind]=collection
    current=bpy.data.objects.new(kind+'_ROOT',None);scene.collection.objects.link(current);roots[kind]=current
    before=set(bpy.data.objects);builder();batch_static();members=[current]+[o for o in bpy.data.objects if o not in before]
    clips=set()
    for o in RIGS:
        if not o.animation_data or not o.animation_data.action:continue
        category='Travel' if o.name.startswith('Drive_') else 'Idle' if o.name.startswith('Idle_') else 'Work'
        action=o.animation_data.action;action.name=kind+'_'+category+'_'+o.name
        track=o.animation_data.nla_tracks.new();track.name=category;strip=track.strips.new(category,1,action);o.animation_data.action=None;clips.add(category)
    for o in members:
        for c in list(o.users_collection):c.objects.unlink(o)
        collection.objects.link(o)
    scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT')
    for o in members:o.select_set(True)
    file=OUT/(kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=True,export_optimize_animation_size=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=True)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in members if o.type=='MESH')
    manifest['models'][kind]={'name':NAMES[kind],'file':kind+'.glb','triangles':triangles,'rigs':[o.name for o in RIGS],'clips':sorted(clips),'cycleSeconds':(END-1)/FPS,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    print('MODEL_COMPLETE',kind,triangles,file.stat().st_size,flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for i,(kind,root) in enumerate(roots.items()):root.location=((i%5-2)*13,(i//5)*14,0)
world=scene.world or bpy.data.worlds.new('Foundry studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.045,.065,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,energy,color,size in [('Warm key',(5,-15,20),5000,(1,.87,.72),12),('Cold rim',(-15,15,14),6500,(.5,.8,1),10),('Soft front',(10,-22,7),2500,(.8,.9,1),14)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.color=color;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,5,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));ground=bpy.context.object;ground.name='Studio floor';ground.data.materials.append(material('Studio floor',0x141E26,.2,.55))
cd=bpy.data.cameras.new('Collection camera');camera=bpy.data.objects.new('Collection camera',cd);scene.collection.objects.link(camera);scene.camera=camera
camera.location=(35,-50,42);camera.rotation_euler=(Vector((0,5,1))-camera.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=72
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX'
scene.render.resolution_x=1800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.frame_set(97)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'moon-foundry-collection.blend'))
if '--render' in sys.argv:
    for kind,root in roots.items():
        for k,c in collections.items():c.hide_render=k!=kind
        old=root.location.copy();root.location=(0,0,0)
        robot=kind in ['mason','atlas','suture','titan'];target=Vector((0,0,.65 if robot else 2.1))
        camera.location=target+Vector((4,-6,3) if robot else (10,-15,10));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();cd.ortho_scale=(3.2 if kind!='titan' else 4.5) if robot else (15 if kind in ['tunnel','robotfactory'] else 12)
        scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.filepath=str(RENDERS/(kind+'-blender.png'));bpy.ops.render.render(write_still=True);root.location=old
    for c in collections.values():c.hide_render=False
print('COLLECTION_READY',str(OUT/'manifest.json'),flush=True)
