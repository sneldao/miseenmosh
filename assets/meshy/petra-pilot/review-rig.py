"""Petra pilot: render the ACTUAL rigged.glb and its bundled Walking/Running
clips for visual review. Preview-only duplicate + bone-attached portrait;
nothing is exported and rigged.glb stays byte-identical."""

import math
import sys
import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

ROOT = "/Users/udingethe/Dev/miseenmosh"
CANDIDATES = "--candidates" in sys.argv
SERVICE = "--service" in sys.argv
COOKED = "--cooked" in sys.argv
RIGGED = (f"{ROOT}/assets/meshy/petra-pilot/cooked.glb" if COOKED
          else f"{ROOT}/assets/meshy/petra-pilot/service-source.glb" if SERVICE
          else f"{ROOT}/assets/meshy/petra-pilot/motions.glb" if CANDIDATES
          else f"{ROOT}/assets/meshy/petra-pilot/rigged.glb")
BLEND = (f"{ROOT}/assets/meshy/petra-pilot/cooked-review.blend" if COOKED
         else f"{ROOT}/assets/meshy/petra-pilot/service-review.blend" if SERVICE
         else f"{ROOT}/assets/meshy/petra-pilot/motion-review.blend" if CANDIDATES
         else f"{ROOT}/assets/meshy/petra-pilot/rig-review.blend")
OUT_DIR = f"{ROOT}/docs/devlog/media/kitchen-production"
FACE_TEX = f"{ROOT}/assets/recraft/playable/petra.webp"

bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=RIGGED)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
assert armatures, "no armature imported from rigged.glb"
arm = armatures[0]

# ---- studio (same construction as prepare.py) ----
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

def area(name, loc, energy, size):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.shape = "DISK"
    ld.size = size
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
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = scene.render.resolution_y = 1024
scene.render.fps = 30

cam = bpy.data.cameras.new("Cam")
cam.type = "ORTHO"
camob = bpy.data.objects.new("Cam", cam)
bpy.context.scene.collection.objects.link(camob)
scene.camera = camob

def render(name, loc, target, ortho, azimuth):
    cam.ortho_scale = ortho
    camob.location = loc
    camob.rotation_euler = (Vector(target) - camob.location).to_track_quat("-Z", "Y").to_euler()
    place_lights(azimuth)
    scene.render.filepath = f"{OUT_DIR}/{name}.png"
    bpy.ops.render.render(write_still=True)

# ---- PREVIEW ONLY: head-less duplicate, armature + weights kept ----
orig = meshes[0]
dup = orig.copy()
dup.data = orig.data.copy()
dup.name = "PetraRigPreview"
bpy.context.scene.collection.objects.link(dup)
for m in dup.modifiers:
    if m.type == "ARMATURE":
        m.object = arm

bm = bmesh.new()
bm.from_mesh(dup.data)
bm.verts.ensure_lookup_table()
doomed = [v for v in bm.verts if (dup.matrix_world @ v.co).z > 1.61]
bmesh.ops.delete(bm, geom=doomed, context="VERTS")
bm.to_mesh(dup.data)
bm.free()
dup.data.update()
orig.hide_render = True

# ---- portrait construction (verbatim from root-edited prepare.py) ----
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
    faces.append(tuple(tri))                             # back cap (+Y normal)
    faces.append(tuple(i + n for i in reversed(tri)))     # front cap (-Y normal)
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
bsdf = inkmat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = INK
bsdf.inputs["Roughness"].default_value = 0.85
slab_mesh.materials.append(inkmat)
bev = slab.modifiers.new("Bevel", "BEVEL")
bev.width = 0.012
bev.segments = 2

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

pmat = bpy.data.materials.new("PortraitPrint")
pmat.use_nodes = True
pmat.use_backface_culling = True
nt = pmat.node_tree
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
fmesh.materials.append(pmat)

# ---- attach the portrait to the actual head bone ----
head_name = next(
    (b.name for b in arm.data.bones
     if b.name in ("mixamorig:Head", "mixamorigHead")),
    None)
if head_name is None:
    raise RuntimeError(f"head bone not found; bones: {[b.name for b in arm.data.bones][:12]}")
bind_world = arm.matrix_world @ arm.data.bones[head_name].matrix_local

drv = bpy.data.objects.new("HeadDriver", None)
bpy.context.scene.collection.objects.link(drv)
con = drv.constraints.new("COPY_TRANSFORMS")
con.target = arm
con.subtarget = head_name
con.target_space = "WORLD"
con.owner_space = "WORLD"

for ob in (slab, printob):
    ob.parent = drv
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_basis = bind_world.inverted()

# ---- actions: pick the imported Walking / Running clips ----
def find_action(prefix):
    return next((a for a in bpy.data.actions
                 if a.name.lower().startswith(prefix.lower())), None)

ad = arm.animation_data if arm.animation_data else arm.animation_data_create()

def play(action):
    ad.action = action
    # Blender 4.5 layered actions: resolve the OBJECT slot explicitly
    if hasattr(ad, "action_slot") and hasattr(action, "slots"):
        for slot in action.slots:
            if getattr(slot, "target_idtype", None) == "OBJECT":
                ad.action_slot = slot
                break

def at_fraction(action, frac):
    start, end = action.frame_range
    frame = start + frac * (end - start)
    base = math.floor(frame)
    scene.frame_set(base, subframe=frame - base)

FRONT = ((0, -5, 1.25), 0)
QUARTER = ((3, -5, 1.25), math.atan2(3, 5))
TARGET = (0, 0, 1.15)
print("ACTIONS", [a.name for a in bpy.data.actions], "HEAD", head_name)

if COOKED:
    SIDE = ((5, 0, 1.25), math.pi / 2)
    sear = next((a for a in bpy.data.actions if a.name == "Petra___sear_and_turn"), None)
    if sear is None:
        raise RuntimeError(f"Petra___sear_and_turn not found in {[a.name for a in bpy.data.actions]}")
    play(sear)
    for frac in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0):
        at_fraction(sear, frac)
        for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
            render(f"cooked-work-{int(frac * 100)}-{camname}", loc, TARGET, 2.6, az)
    for cname in ("Walking", "Running"):
        act = find_action(cname)
        if act is None:
            raise RuntimeError(f"{cname} not found in {[a.name for a in bpy.data.actions]}")
        play(act)
        for frac in (0.0, 0.25, 0.5, 0.75):
            at_fraction(act, frac)
            for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER), ("side", SIDE)):
                render(f"cooked-{cname}-{int(frac * 100)}-{camname}", loc, TARGET, 2.6, az)
elif CANDIDATES or SERVICE:
    for cname in (("Petra___sear_and_turn",) if SERVICE else
                  ("Idle", "Agree_Gesture", "Checkout_Gesture",
                   "Female_Stand_Pick_Fruit_Basket")):
        act = next((a for a in bpy.data.actions if a.name == cname), None)
        if act is None:
            raise RuntimeError(f"candidate action {cname!r} not found in {[a.name for a in bpy.data.actions]}")
        play(act)
        for frac in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0):
            at_fraction(act, frac)
            for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
                prefix = "service-source" if SERVICE else "motion"
                render(f"{prefix}-{cname}-{int(frac * 100)}-{camname}", loc, TARGET, 2.6, az)
else:
    walk = find_action("Walking")
    run = find_action("Running")
    assert walk, f"Walking action not found in {[a.name for a in bpy.data.actions]}"
    assert run, f"Running action not found in {[a.name for a in bpy.data.actions]}"
    play(walk)
    for frac, tag in ((0.0, "0"), (0.25, "25"), (0.5, "50"), (0.75, "75")):
        at_fraction(walk, frac)
        for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
            render(f"rig-walk-{tag}-{camname}", loc, TARGET, 2.6, az)

    play(run)
    at_fraction(run, 0.5)
    for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
        render(f"rig-run-50-{camname}", loc, TARGET, 2.6, az)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
