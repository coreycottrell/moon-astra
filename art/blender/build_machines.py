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
OUT=ROOT/'public/models/industrial-01'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'art/blender'; SOURCE.mkdir(parents=True,exist_ok=True)
RENDERS=ROOT/'artifacts/machines'; RENDERS.mkdir(parents=True,exist_ok=True)
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

def seed():
    # Retains the seed's octagonal body, gold insulation, antenna and paired wings.
    base(6,6)
    cylinder('Octagonal service module',(0,0,1.85),2.1,2.7,'gold',8,radius2=2.05)
    for i in range(8):
        a=i*math.pi/4;x,y=2.0*math.sin(a),2.0*math.cos(a)
        panel=cube('Segmented thermal blanket',(x,y,1.8),(1.42,.13,2.35),'gold',.04,rotation=(0,0,-a))
        beam('Blanket seam',(x*.99,y*.99,.7),(x*.99,y*.99,2.9),.045,'copper')
    cylinder('Ceramic crown',(0,0,3.27),2.16,.4,'ceramic',8)
    cylinder('Habitat pressure cap',(0,0,3.8),2.0,.72,'ceramic',8,radius2=1.25)
    cylinder('Cap service flange',(0,0,4.18),1.28,.14,'graphite',24)
    cylinder('Hatch',(0,0,4.29),.73,.16,'steel',24);torus('Hatch seal',(0,0,4.38),.67,.035,'rubber')
    cube('Mission plate',(0,-2.04,2.5),(2,.1,.7),'ceramic',.06);label('MOON / 01',(0,-2.106,2.44),.24)
    instrument((0,-2.08,1.6),1.4,.58)
    for x in [-1,1]:
        for y in [-1,1]:
            a=(x*1.4,y*1.4,2);b=(x*2.65,y*2.65,.35)
            beam('Landing hydraulic ram',a,b,.14,'steel');beam('Landing brace',(x*1.7,y*1.7,.7),b,.09,'graphite')
            cylinder('Landing foot',(b[0],b[1],.11),.48,.17,'graphite',12)
        wing=rig('Lander_wing_'+str(x),(x*2.4,0,2.4))
        pv_panel(wing,x*1.12,0,2.15,3.4);beam('Wing deployment link',(0,0,0),(x*2,0,0),.08,'steel',wing)
        keys(wing,'rotation_euler',[(1,(0,x*.14,0)),(145,(0,x*.20,0)),(289,(0,x*.14,0))])
    beam('Comms mast',(1,.5,4),(1,.5,5.5),.06)
    dish=rig('Comms_scan',(1,.5,5.5));cylinder('Dish backing',(0,0,0),.62,.18,'graphite',24,dish,radius2=.48)
    sphere('Parabolic reflector',(0,0,.12),(.65,.65,.14),'ceramic',dish)
    for a in [0,2.094,4.189]:beam('Feed support',(.5*math.cos(a),.5*math.sin(a),.18),(0,0,.55),.022,'steel',dish)
    sphere('Antenna feed',(0,0,.54),(.09,.09,.1),'orange',dish)
    keys(dish,'rotation_euler',[(1,(.65,0,-.55)),(145,(.65,0,.55)),(289,(.65,0,-.55))])
    radiator((0,1.85,1.65),1.1,1.5)

def solar():
    base(4.5,3.7)
    cube('Power conditioning cabinet',(0,0,1.06),(1.9,2.6,1.1),'ceramic',.15)
    radiator((0,-1.34,1.05),1.5,.8,8);instrument((0,-1.43,1.68),.9,.35)
    cylinder('Azimuth turntable',(0,0,1.8),.82,.32,'graphite',32)
    torus('Turntable race',(0,0,1.98),.7,.055,'copper')
    beam('Tracking mast',(0,0,1.9),(0,0,3.3),.25,'steel')
    tracker=rig('Solar_tracking',(0,0,3.3))
    cube('Tracking yoke',(0,0,0),(1.4,.48,.3),'orange',.07,tracker)
    for x in [-1,1]:
        pv_panel(tracker,x*2.6,0,4.65,5.5)
        beam('Truss spar',(0,0,-.15),(x*4.9,0,-.15),.08,'graphite',tracker)
        for y in [-2,2]:beam('Wing brace',(x*.4,0,-.5),(x*3.8,y,-.14),.055,'steel',tracker)
    keys(tracker,'rotation_euler',[(1,(.21,.06,-.08)),(145,(.28,-.06,.08)),(289,(.21,.06,-.08))])
    for x in [-1,1]:tube('Power umbilical',[(x*.25,0,3.1),(x*.75,.4,2.8),(x*.7,.9,1.5)],.07,'copper')
    label('HELIOS / 12',(0,-1.42,.78),.2,'ceramic')

def miner():
    base(5.7,5.3)
    cube('Rover belly',(0,.3,.85),(3.55,3.8,.7),'graphite',.22)
    cube('Excavator hull',(0,.5,1.65),(3.45,3.45,1.25),'ceramic',.19)
    cube('Hull shoulder',(0,.55,2.36),(3.35,3.28,.2),'orange',.055)
    cube('Service hatch seal',(-.65,.7,2.49),(1.45,1.45,.05),'rubber',.08)
    cube('Service hatch',(-.65,.7,2.54),(1.32,1.32,.06),'ceramic',.06);bolts((-.65,.7),(1.08,1.08),2.59)
    for i in range(7):cube('Motor cooling louver',(.65,.45+i*.19,2.52),(.65,.075,.09),'graphite',.018)
    tube('Hatch grab handle',[(-.95,.8,2.59),(-.95,.8,2.74),(-.4,.8,2.74),(-.4,.8,2.59)],.035,'steel')
    for x in [-1,1]:
        for y in [-.25,1.25]:cube('Hull panel seam',(x*1.729,y,1.88),(.018,.027,.6),'graphite',0)
        cube('Tool cassette',(x*1.76,.5,1.95),(.14,.9,.5),'graphite',.05)
    for x in [-1,1]:
        cube('Stationary crawler',(x*1.98,.3,.96),(.66,4.25,1.03),'rubber',.28)
        for j in range(15):
            y=.3+(j-7)*.265
            cube('Track top cleat',(x*1.99,y,1.46),(.75,.12,.12),'steel',.02)
            cube('Track bottom cleat',(x*1.99,y,.47),(.75,.12,.1),'graphite',.02)
        for y in [-1.22,-.3,.65,1.58]:
            cylinder('Drive hub',(x*2.33,y,.98),.36,.12,'steel',20,rotation=(0,math.pi/2,0))
            cylinder('Drive hub cap',(x*2.41,y,.98),.14,.09,'orange',12,rotation=(0,math.pi/2,0))
    cube('Ore intake',(0,-1.3,1.63),(2.05,.7,.9),'graphite',.12)
    for i in range(8):beam('Intake grate',((i-3.5)*.24,-1.7,1.22),((i-3.5)*.24,-1.7,2.03),.035)
    label('REGOLITH / H-01',(0,-1.05,2.51),.2,'ink',rotation=(0,0,0))
    # A rigid drilling mast behind the intake; all motion remains inside the pad.
    for x in [-.68,.68]:beam('Drill mast',(x,-1.94,.55),(x,-1.94,4.65),.12,'graphite')
    cube('Mast cap',(0,-1.94,4.65),(1.55,.6,.3),'orange',.08)
    carriage=rig('Drill_carriage',(0,-1.94,2.8))
    cube('Servo carriage',(0,0,0),(1.32,.85,.7),'ceramic',.1,carriage)
    cylinder('Drill drive',(0,0,-.58),.4,.58,'copper',24,carriage)
    drill=rig('Auger_rotation',(0,0,-.98),carriage)
    cylinder('Auger shaft',(0,0,-.55),.12,1.6,'steel',16,drill)
    points=[]
    for i in range(100):
        a=i/99*math.pi*6;points.append((.32*math.cos(a),.32*math.sin(a),.12-i/99*1.6))
    tube('Helical cutting flight',points,.075,'steel',drill)
    cylinder('Carbide drill point',(0,0,-1.56),.02,.32,'graphite',12,drill,radius2=.25)
    rotate_loop(drill,2,6)
    keys(carriage,'location',[(1,(0,-1.94,2.8)),(145,(0,-1.94,2.5)),(217,(0,-1.94,3.0)),(289,(0,-1.94,2.8))])
    tube('Hydraulic hose',[(-.7,-.2,2.5),(-1.15,-.7,3.6),(-1.0,-1.8,4.2),(-.55,-2.1,3.4)],.065,'rubber')
    radiator((0,2.29,1.75),2.7,.8,7)
    sensor=rig('Survey_head',(.85,.3,2.85));cube('Lidar housing',(0,0,0),(.65,.7,.38),'graphite',.08,sensor);instrument((0,-.37,0),.45,.23,sensor)
    keys(sensor,'rotation_euler',[(1,(0,0,-.5)),(145,(0,0,.5)),(289,(0,0,-.5))])

def refinery():
    base(5.8,5.6)
    cube('Process deck',(0,0,.93),(5.05,4.8,.75),'ceramic',.14)
    cube('Service fascia',(0,-2.44,1.0),(4.4,.1,.48),'orange',.02);label('FRACTION / R-02',(0,-2.504,.94),.22)
    for x,z in [(-1.22,3.0),(1.15,2.6)]:
        height=3.0 if x<0 else 2.2
        cylinder('Reaction vessel',(x,.55,z),.8,height,'ceramic',32)
        sphere('Pressure dome',(x,.55,z+height/2),(.8,.8,.32),'steel')
        for dz in [-height*.44,0,height*.44]:torus('Vessel thermal band',(x,.55,z+dz),.81,.09,'copper')
        for a in [0,math.pi/2,math.pi,math.pi*1.5]:
            px,py=x+.84*math.sin(a),.55+.84*math.cos(a);beam('Vessel stiffener',(px,py,z-height/2),(px,py,z+height/2),.032,'graphite')
        tube('Process return',[(x+.65,.2,1.3),(x+1,.0,1.8),(x+1,.0,z+.4),(x+.6,.2,z+.65)],.065,'copper')
        for i in range(5):cube('Insulation segment',(x,-.26,z+(i-2)*.31),(.47,.06,.22),'gold',.025)
    tube('Primary hot manifold',[(-1.22,.55,4.8),(-1.22,1.7,4.8),(1.15,1.7,4.0),(1.15,.55,4.0)],.13,'copper')
    tube('Sealed feed line',[(-2.3,-1.1,1.1),(-2.3,-1.1,2.4),(-1.22,-.3,2.6)],.17,'steel')
    furnace=rig('Induction_rotor',(0,-1.25,1.92))
    cylinder('Induction drum',(0,0,0),.68,1.8,'graphite',32,furnace,rotation=(0,math.pi/2,0))
    for x in [-.7,-.4,0,.4,.7]:torus('Copper induction coil',(x,0,0),.71,.075,'copper',furnace,rotation=(0,math.pi/2,0))
    for a in range(8):
        angle=a*math.pi/4;cube('Drum inspection strip',(0,.7*math.cos(angle),.7*math.sin(angle)),(.28,.035,.07),'hot',.01,furnace,rotation=(angle,0,0))
    rotate_loop(furnace,0,1)
    instrument((1.95,-2.2,1.75),.65,.48)
    radiator((-2.4,.8,2.5),.65,1.8,12)
    for x in [-1,1]:
        beam('Safety stanchion',(x*2.45,-2.3,1.1),(x*2.45,-2.3,2.1),.045,'orange')
    beam('Safety rail',(-2.45,-2.3,2.1),(2.45,-2.3,2.1),.04,'steel')

def replicator():
    base(7.8,7.5)
    cube('Machine bed',(0,0,.85),(7.15,6.9,.7),'ceramic',.2)
    cube('Build chamber',(0,0,1.24),(5.4,5.35,.16),'graphite',.05)
    for i in range(13):cube('Precision build slat',((i-6)*.38,0,1.35),(.29,5.1,.07),'steel',.016)
    for x in [-1,1]:
        for y in [-1,1]:
            cube('Gantry column',(x*3.08,y*2.7,3.03),(.6,.66,3.65),'graphite',.08)
            cube('Column shield',(x*3.08,y*2.99,3.01),(.38,.12,2.8),'ceramic',.03)
            cube('Column status',(x*3.08,y*3.065,3.8),(.055,.025,.78),'light',.005)
        cube('Linear rail',(x*3.08,0,4.96),(.75,6.55,.34),'orange',.06)
        beam('Linear guide',(x*3.08,-3,5.17),(x*3.08,3,5.17),.085,'steel')
        for i in range(21):cube('Cable carrier link',(x*3.46,(i-10)*.285,5.03),(.19,.22,.2),'graphite',.025)
        beam('Column diagonal',(x*3.15,2.7,1.55),(x*3.15,-2.7,4.55),.075,'steel')
    gantry=rig('Fabrication_bridge',(0,-1.3,5.32))
    cube('Moving bridge',(0,0,0),(6.55,.72,.42),'ceramic',.065,gantry)
    for y in [-.3,.3]:beam('Tool guide',(-2.8,y,.19),(2.8,y,.19),.055,'steel',gantry)
    tool=rig('Fabrication_tool',(-1.6,0,-.55),gantry)
    cube('Tool carriage',(0,0,0),(.85,.93,.83),'orange',.11,tool)
    cylinder('Print head',(0,0,-.63),.26,.6,'graphite',24,tool,radius2=.35)
    cylinder('Ceramic nozzle',(0,0,-1.03),.07,.28,'ceramic',16,tool,radius2=.18)
    cylinder('Active melt tip',(0,0,-1.19),.07,.055,'hot',16,tool)
    tube('Tool coolant',[(.32,0,.1),(.6,.3,-.1),(.45,.4,-.8),(.2,.15,-.8)],.045,'copper',tool)
    keys(gantry,'location',[(1,(0,-1.3,5.32)),(73,(0,-1.3,5.32)),(145,(0,1.3,5.32)),(217,(0,1.3,5.32)),(289,(0,-1.3,5.32))])
    keys(tool,'location',[(1,(-1.6,0,-.55)),(73,(1.6,0,-.55)),(145,(1.6,0,-.8)),(217,(-1.6,0,-.8)),(289,(-1.6,0,-.55))])
    work=rig('Manufactured_part',(0,0,1.4));cube('Growing machine chassis',(0,0,.65),(2.3,2,1.3),'gold',.16,work)
    for x in [-1,1]:cube('Part ribs',(x*.8,0,.72),(.14,2.05,1.15),'graphite',.025,work)
    for z in [.18,.36,.54,.72,.90,1.08]:cube('Fabricated layer seam',(0,-1.005,z),(2.05,.024,.025),'copper',.004,work)
    keys(work,'scale',[(1,(1,1,.12)),(241,(1,1,1)),(265,(1,1,1)),(289,(1,1,.12))])
    cube('Operator pedestal',(-3,-3.27,1.7),(1.18,.6,1.45),'ceramic',.1);instrument((-3,-3.6,2.02),.95,.58)
    label('GENESIS / M-04',(0,-3.49,.88),.32)
    for i in range(9):cube('Caution marking',((i-4)*.42,-3.35,1.25),(.21,.3,.018),'orange',0,rotation=(0,0,-.5))
    for x in [-1,1]:tube('Energy umbilical',[(x*3.25,2.5,1.2),(x*3.55,2.7,2.5),(x*3.3,2.5,4.6)],.085,'copper')

def compute():
    base(5.5,5.5)
    cylinder('Hexagonal plinth',(0,0,.83),2.5,.67,'graphite',6)
    cylinder('Core lower crown',(0,0,1.32),2.05,.22,'copper',12)
    for i in range(6):
        a=i*math.pi/3;x,y=1.84*math.sin(a),1.84*math.cos(a)
        cube('Compute blade',(x,y,2.62),(.76,.75,2.4),'ceramic',.12,rotation=(0,0,-a))
        # Radial bus and cooling are visible between the compute blades.
        for z in [1.8,2.0,2.2,2.4,2.6,2.8,3.0,3.2]:
            o=cube('Blade heat sink',(x*1.12,y*1.12,z),(.57,.22,.065),'graphite',.012,rotation=(0,0,-a))
        beam('Optical backbone',(x*.8,y*.8,1.65),(x*.8,y*.8,3.62),.038,'light')
        tube('Cryogenic return',[(x*.9,y*.9,1.1),(x*1.22,y*1.22,1.5),(x*1.22,y*1.22,3.6),(x,y,3.9)],.045,'copper')
    cylinder('Upper lattice crown',(0,0,3.97),2.14,.24,'graphite',12)
    torus('Crown copper ring',(0,0,4.12),1.9,.075,'copper')
    core=rig('Mind_core',(0,0,2.7))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.8,location=(0,0,0));finish(bpy.context.object,'Optical compute crystal','light',core)
    rotate_loop(core,2,1)
    for name,rot,turns in [('Inner_gimbal',(math.pi/2,0,0),1),('Outer_gimbal',(.55,.7,0),-1)]:
        pivot=rig(name,(0,0,2.7));torus('Optical routing hoop',(0,0,0),1.04 if turns>0 else 1.25,.065,'steel',pivot,rot)
        for i in range(4):
            a=i*math.pi/2;sphere('Photon coupler',(math.cos(a)*1.04,math.sin(a)*1.04,0),(.12,.12,.12),'light',pivot)
        rotate_loop(pivot,2,turns)
    for z in [1.55,3.73]:torus('Core bearing',(0,0,z),.6,.1,'copper')
    cylinder('Crown sensor',(0,0,4.3),.28,.3,'ceramic',16)
    label('NOUS / C-04',(0,-2.68,.59),.24,'ceramic')
    instrument((0,-2.42,1.15),1.1,.35)

BUILDERS={'seed':seed,'solar':solar,'miner':miner,'refinery':refinery,'replicator':replicator,'compute':compute}
NAMES={'seed':'PIONEER / Seed lander','solar':'HELIOS / Solar array','miner':'REGOLITH / Harvester','refinery':'FRACTION / Refinery','replicator':'GENESIS / Replicator','compute':'NOUS / Mind node'}
collections={};roots={};manifest={'version':'industrial-01','source':'art/blender/build_machines.py','units':'meters','fps':FPS,'models':{}}
scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=END

def batch_static():
    # Join rigid parts by parent and material; rigs remain articulated.
    groups=defaultdict(list)
    for o in PARTS:
        if o.type=='MESH':groups[(o.parent,o.data.materials[0])].append(o)
    for (parent,mat),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object
        # Move the joined mesh origin to its parent for clean scene transforms.
        o.name=parent.name+'__'+mat.name.replace(' ','_')

for kind,builder in BUILDERS.items():
    PARTS=[];RIGS=[]
    collection=bpy.data.collections.new(kind);scene.collection.children.link(collection);collections[kind]=collection
    current=bpy.data.objects.new(kind+'_ROOT',None);scene.collection.objects.link(current);roots[kind]=current
    before=set(bpy.data.objects);builder();batch_static()
    members=[current]+[o for o in bpy.data.objects if o not in before]
    for o in members:
        for c in list(o.users_collection):c.objects.unlink(o)
        collection.objects.link(o)
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in members:o.select_set(True)
    file=OUT/(kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_animations=True,
        export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='Work',export_force_sampling=True,
        export_frame_range=True,export_optimize_animation_size=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=True)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in members if o.type=='MESH')
    manifest['models'][kind]={'name':NAMES[kind],'file':kind+'.glb','triangles':triangles,'rigs':[o.name for o in RIGS],
        'clip':'Work','cycleSeconds':END/FPS,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    print('MODEL_COMPLETE',kind,triangles,file.stat().st_size,flush=True)

(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Arrange the editable collection in a labeled studio; exports keep local origins.
for i,(kind,root) in enumerate(roots.items()):root.location=((i%3-1)*15,(i//3)*15,0)
world=scene.world or bpy.data.worlds.new('Moon studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.045,.065,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(name,loc,energy,color,size,target=(0,6,0)):
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.color=color;light.shape='DISK';light.size=size
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(5,-10,20),5500,(1,.88,.72),12)
area('Cold rim',(-12,15,15),7000,(.55,.8,1),10)
area('Soft front',(5,-22,8),2600,(.75,.9,1),14)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03));ground=bpy.context.object;ground.name='Studio floor';ground.data.materials.append(material('Studio floor',0x141E26,.2,.55))
camera_data=bpy.data.cameras.new('Studio camera');camera=bpy.data.objects.new('Studio camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera.location=(33,-42,39);camera.rotation_euler=(Vector((0,7,1.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=49
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.render.resolution_x=1800;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene.frame_set(97)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'moon-industrial-collection.blend'))
if '--render' in sys.argv:
    # Six actual Blender renders, no image composites or external textures.
    for kind,root in roots.items():
        for k,c in collections.items():c.hide_render=k!=kind
        old=root.location.copy();root.location=(0,0,0)
        camera.location=(10,-14,10);camera.rotation_euler=(Vector((0,0,2))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=14 if kind in ['solar','replicator','seed'] else 10
        scene.render.resolution_x=1200;scene.render.resolution_y=1000
        scene.render.filepath=str(RENDERS/(kind+'-blender.png'));bpy.ops.render.render(write_still=True);root.location=old
    for c in collections.values():c.hide_render=False
print('COLLECTION_READY',str(OUT/'manifest.json'),flush=True)
