"""Contact proof: runtime-contact.glb PetraWork + prepared tongs/skillet/cooker.
Tool roots are placed from the FROZEN contact-study-loop.json glTF world
coords (grip + Hand.q), conjugated into Blender space via C(x,-z,y) — no
bone-tail guessing. Original portrait rides the head bone as in review-rig.
Sources stay byte-identical; nothing exported."""

import math
import json
import sys
import bpy
import numpy as np
from mathutils import Matrix, Vector, Quaternion
from mathutils.geometry import tessellate_polygon

ROOT = "/Users/udingethe/Dev/miseenmosh"
HOLD = "--hold" in sys.argv
RIG = f"{ROOT}/assets/meshy/petra-pilot/{'runtime-hold' if HOLD else 'runtime-contact'}.glb"
PREFIX = "hold" if HOLD else "contact"
STUDY = f"{ROOT}/assets/meshy/petra-pilot/contact-study-loop.json"
TONGS = f"{ROOT}/assets/props/tongs/prepared.glb"
SKILLET = f"{ROOT}/assets/props/skillet/prepared.glb"
COOKER = f"{ROOT}/assets/props/cooker/prepared.glb"
OUT_DIR = f"{ROOT}/docs/devlog/media/kitchen-production"
FACE_TEX = f"{ROOT}/assets/recraft/playable/petra.webp"

# glTF-space placements (frozen data)
PAN_CENTRE = [0.04669360387553681, 0.91, 0.2933063961244632]
PAN_YAW = math.pi / 4
COOKER_CENTRE = [0.1966936038755368, 0.01, 0.4553063961244632]
TONGS_REL_Q = [0.35044971223293764, -0.16289807253775473,
               -0.922293017451233, -0.004985244121610527]   # xyzw

TIMES_FULL = (0.0, 0.8, 1.6, 2.4, 3.2, 4.0)
TIMES_CLOSE = (0.0, 1.6, 2.4, 3.2)
JAW = {0.0: 0.14, 0.8: 0.095, 1.6: 0.095, 2.4: 0.095, 3.2: 0.14, 4.0: 0.14}

C4 = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], dtype=float)

def q_mat(q):  # glTF xyzw -> 4x4
    x, y, z, w = q
    m = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w), 0],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w), 0],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y), 0],
        [0, 0, 0, 1]], dtype=float)
    return m

def q_mul(a, b):  # glTF xyzw quaternion product a*b
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw,
        aw*bw - ax*bx - ay*by - az*bz]

def compose(t, q):
    m = q_mat(q)
    m[:3, 3] = t
    return m

def to_blender(M_gltf):
    return Matrix((C4 @ M_gltf @ C4.T).tolist())

# ---------- load + import ----------
study = json.load(open(STUDY))
study_frames = study["frames"]

def study_at(t):
    return min(study_frames, key=lambda f: abs(f["time_s"] - t))

bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def import_glb(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.context.scene.objects if o not in before]

rig_objs = import_glb(RIG)
meshes = [o for o in rig_objs if o.type == "MESH"]
arm = next(o for o in rig_objs if o.type == "ARMATURE")
body = rig_objs  # actor-local origin already

tongs_objs = import_glb(TONGS)
tongs_root = next(o for o in tongs_objs if o.name.startswith("AssetRoot"))
tup = next(o for o in tongs_objs if o.name.startswith("TongsUpper"))
tlo = next(o for o in tongs_objs if o.name.startswith("TongsLower"))

skillet_objs = import_glb(SKILLET)
skillet_root = next(o for o in skillet_objs if o.name.startswith("AssetRoot"))

cooker_objs = import_glb(COOKER)
cooker_root = next(o for o in cooker_objs if o.name.startswith("AssetRoot"))

# ---------- studio (same conventions as review-rig.py) ----------
world = bpy.data.worlds.new("StudioWorld")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.6, 0.6, 0.6, 1)
bg.inputs[1].default_value = 0.5
bpy.context.scene.world = world

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.003))
ground = bpy.context.active_object
gm = bpy.data.materials.new("Ground")
gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.92, 0.88, 0.80, 1)
gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
ground.data.materials.append(gm)

# charcoal support pad under cooker: .62 x .01 x .62, top at glTF y=.01
bpy.ops.mesh.primitive_cube_add(size=1, location=(COOKER_CENTRE[0], -COOKER_CENTRE[2], 0.005))
pad = bpy.context.active_object
pad.scale = (0.62, 0.62, 0.01)
pmat = bpy.data.materials.new("Pad")
pmat.use_nodes = True
pmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.05, 0.05, 1)
pmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
pad.data.materials.append(pmat)

def area(name, loc, energy, size):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy; ld.shape = "DISK"; ld.size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    return ob

key = area("Key", (-3, -4, 5), 350, 4)
fill = area("Fill", (3, -2, 3), 100, 3)
KEY_BASE, FILL_BASE = Vector((-3, -4, 5)), Vector((3, -2, 3))
LIGHT_TARGET = Vector((0, 0, 1))

def place_lights(azimuth):
    for ob, base in ((key, KEY_BASE), (fill, FILL_BASE)):
        x = base.x * math.cos(azimuth) - base.y * math.sin(azimuth)
        y = base.x * math.sin(azimuth) + base.y * math.cos(azimuth)
        ob.location = (x, y, base.z)
        ob.rotation_euler = (LIGHT_TARGET - ob.location).to_track_quat("-Z", "Y").to_euler()

scene = bpy.context.scene
scene.view_settings.view_transform = "Standard"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 24
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.render.resolution_x = scene.render.resolution_y = 1024

cam = bpy.data.cameras.new("Cam"); cam.type = "ORTHO"
camob = bpy.data.objects.new("Cam", cam)
bpy.context.scene.collection.objects.link(camob)
scene.camera = camob

def Cv(v):  # glTF point -> Blender
    return (v[0], -v[2], v[1])

def render(name, gltf_loc, gltf_target, ortho):
    cam.ortho_scale = ortho
    camob.location = Cv(gltf_loc)
    tgt = Vector(Cv(gltf_target))
    camob.rotation_euler = (tgt - camob.location).to_track_quat("-Z", "Y").to_euler()
    place_lights(math.atan2(camob.location.x, -camob.location.y))
    scene.render.filepath = f"{OUT_DIR}/{name}.png"
    bpy.ops.render.render(write_still=True)
    print("rendered", name)

# ---------- portrait (verbatim construction from review-rig.py) ----------
OUTLINE = [
    [426,54],[457,38],[484,40],[499,47],[510,35],[534,40],
    [552,57],[558,78],[555,100],[568,119],[556,151],[538,166],
    [534,204],[524,223],[539,241],[508,263],[486,251],[476,260],
    [449,248],[428,223],[413,209],[412,186],[409,173],[408,145],
    [413,119],[434,108],[422,93],[425,71]]
BOUNDS = (408, 35, 568, 263)
K = 0.70 / 228

def sxz(p):
    sx, sy = p
    return ((sx - 476) * K, 1.58 + (263 - sy) * K)

def srgb(c):
    return tuple((((v / 255 + 0.055) / 1.055) ** 2.4 if (v / 255) > 0.04045 else (v / 255) / 12.92) for v in c[:3]) + (1.0,)
INK = srgb((0x30, 0x2C, 0x2B))

pts = [sxz(p) for p in OUTLINE]
n = len(pts)
verts = [(x, -0.02, z) for x, z in pts] + [(x, -0.12, z) for x, z in pts]
faces = []
cap = tessellate_polygon([[Vector((x, 0, z)) for x, z in pts]])
for tri in cap:
    faces.append(tuple(tri))
    faces.append(tuple(i + n for i in reversed(tri)))
for i in range(n):
    j = (i + 1) % n
    faces.append((j, i, i + n, j + n))
slab_mesh = bpy.data.meshes.new("PortraitSlab")
slab_mesh.from_pydata(verts, [], faces)
slab_mesh.update()
slab = bpy.data.objects.new("PortraitSlab", slab_mesh)
bpy.context.scene.collection.objects.link(slab)
inkmat = bpy.data.materials.new("PortraitInk")
inkmat.use_nodes = True
inkmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = INK
inkmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
slab_mesh.materials.append(inkmat)
bev = slab.modifiers.new("Bevel", "BEVEL")
bev.width = 0.012; bev.segments = 2

fverts = [(x, -0.133, z) for x, z in pts]
ffaces = [tuple(reversed(tri)) for tri in cap]
fmesh = bpy.data.meshes.new("PortraitPrint")
fmesh.from_pydata(fverts, [], ffaces)
fmesh.update()
uvl = fmesh.uv_layers.new(name="UVMap")
for loop in fmesh.loops:
    co = fmesh.vertices[loop.vertex_index].co
    sx = co.x / K + 476
    sy = 263 - (co.z - 1.58) / K
    uvl.data[loop.index].uv = ((sx - BOUNDS[0]) / 160.0, (263 - sy) / 228.0)
printob = bpy.data.objects.new("PortraitPrint", fmesh)
bpy.context.scene.collection.objects.link(printob)
pmatp = bpy.data.materials.new("PortraitPrint")
pmatp.use_nodes = True
pmatp.use_backface_culling = True
nt = pmatp.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
mix = nt.nodes.new("ShaderNodeMixShader")
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(FACE_TEX)
emis = nt.nodes.new("ShaderNodeEmission")
trans = nt.nodes.new("ShaderNodeBsdfTransparent")
nt.links.new(tex.outputs["Color"], emis.inputs["Color"])
nt.links.new(tex.outputs["Alpha"], mix.inputs[0])
nt.links.new(trans.outputs[0], mix.inputs[1])
nt.links.new(emis.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs["Surface"])
fmesh.materials.append(pmatp)

# attach via head bone, else imported PortraitSocket node
head_name = next((b.name for b in arm.data.bones
                  if b.name in ("mixamorig:Head", "mixamorigHead")), None)
drv = bpy.data.objects.new("HeadDriver", None)
bpy.context.scene.collection.objects.link(drv)
if head_name is not None:
    bind_world = arm.matrix_world @ arm.data.bones[head_name].matrix_local
    con = drv.constraints.new("COPY_TRANSFORMS")
    con.target = arm; con.subtarget = head_name
    con.target_space = "WORLD"; con.owner_space = "WORLD"
else:
    sock = next(o for o in rig_objs if o.name.startswith("PortraitSocket"))
    bind_world = sock.matrix_world.copy()
    con = drv.constraints.new("COPY_TRANSFORMS")
    con.target = sock
    con.target_space = "WORLD"; con.owner_space = "WORLD"
for ob in (slab, printob):
    ob.parent = drv
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_basis = bind_world.inverted()

# ---------- action ----------
act = next((a for a in bpy.data.actions if a.name == "PetraWork"), None)
if act is None:
    raise RuntimeError(f"PetraWork not found in {[a.name for a in bpy.data.actions]}")
ad = arm.animation_data if arm.animation_data else arm.animation_data_create()
ad.action = act
if hasattr(ad, "action_slot") and hasattr(act, "slots"):
    for slot in act.slots:
        if getattr(slot, "target_idtype", None) == "OBJECT":
            ad.action_slot = slot
            break
start = act.frame_range[0]
print("ACTIONS", [a.name for a in bpy.data.actions], "HEAD", head_name, "START", start)

def set_time(t):
    fr = start + t * 30
    base = math.floor(fr)
    scene.frame_set(int(base), subframe=fr - base)

def pose_tongs(t):
    """Place tongs from frozen study data at time t; set jaw half-angle."""
    f = study_at(t)
    grip = f["hands"]["Right"]["grip"]
    handq = f["hands"]["Right"]["joints"]["Hand"]["q"]
    q = q_mul(handq, TONGS_REL_Q)
    tongs_root.matrix_world = to_blender(compose(grip, q))
    ang = JAW[t]
    for ob, a in ((tup, ang), (tlo, -ang)):
        ob.rotation_mode = "XYZ"
        # glTF local Z -> Blender local -Y
        ob.rotation_euler[1] = -a
    bpy.context.view_layer.update()
    rootM = compose(grip,q)
    expected_tip = C4 @ rootM @ np.array([0,-.015,.26,1.0])
    tip_socket = next(o for o in tongs_objs if o.name.startswith('socket_tip'))
    assert (tip_socket.matrix_world.translation - Vector(expected_tip[:3])).length < 1e-5, 'Tongs tip transform mismatch'

def place_statics():
    pan = compose(PAN_CENTRE, [0, math.sin(PAN_YAW / 2), 0, math.cos(PAN_YAW / 2)])
    skillet_root.matrix_world = to_blender(pan)
    cooker_root.matrix_world = to_blender(compose(COOKER_CENTRE, [0, 0, 0, 1]))

place_statics()
bpy.context.view_layer.update()
pan_socket = next(o for o in skillet_objs if o.name.startswith('socket_grip'))
assert (pan_socket.matrix_world.translation - Vector(Cv([.18,.957,.16]))).length < 1e-5, 'Pan grip transform mismatch'
assert (skillet_root.matrix_world.to_3x3() @ Vector((0,0,1))).z > .99999, 'Pan is not horizontal'
points = [o.matrix_world @ Vector(c) for o in cooker_objs if o.type=='MESH' for c in o.bound_box]
assert abs(min(p.z for p in points)-.01) < 1e-5, 'Cooker feet wrong height'
assert abs(max(p.z for p in points)-.91) < 1e-5, 'Cooktop wrong height'

FULL_CAM = ([2.4, 2.0, 2.8], [0, 1.0, 0.15], 2.4)
CLOSE_CAM = ([-1.2, 1.55, 1.4], [-0.02, 1.06, 0.23], 0.75)

for t in TIMES_FULL:
    set_time(t)
    pose_tongs(t)
    loc, tgt, o = FULL_CAM
    render(f"{PREFIX}-full-{int(t*10):02d}", loc, tgt, o)
for t in TIMES_CLOSE:
    set_time(t)
    pose_tongs(t)
    loc, tgt, o = CLOSE_CAM
    render(f"{PREFIX}-close-{int(t*10):02d}", loc, tgt, o)
if HOLD:
    PALM_CAM = ([1.2, 1.6, 1.0], [-0.02, 1.06, 0.23], 0.75)
    for t in (0.0, 1.6):
        set_time(t)
        pose_tongs(t)
        loc, tgt, o = PALM_CAM
        render(f"hold-palm-{int(t*10):02d}", loc, tgt, o)

bpy.ops.wm.save_as_mainfile(filepath=f"{ROOT}/assets/meshy/petra-pilot/{PREFIX}-review.blend")
