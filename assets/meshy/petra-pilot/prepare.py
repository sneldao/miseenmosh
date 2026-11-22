"""Petra pilot: normalize the downloaded Meshy body and render a neutral
studio review. Run full prep once; afterwards `-- --render-only` re-imports
the frozen prepared.glb and re-renders without touching it or source.glb."""

import sys
import bpy
from mathutils import Matrix, Vector

ROOT = "/Users/udingethe/Dev/miseenmosh"
SOURCE = f"{ROOT}/assets/meshy/petra-pilot/source.glb"
PREPARED = f"{ROOT}/assets/meshy/petra-pilot/prepared.glb"
BLEND = f"{ROOT}/assets/meshy/petra-pilot/review.blend"
OUT_DIR = f"{ROOT}/docs/devlog/media/kitchen-production"
FACE_TEX = f"{ROOT}/assets/recraft/playable/petra.webp"

RENDER_ONLY = "--render-only" in sys.argv

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=PREPARED if RENDER_ONLY else SOURCE)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not RENDER_ONLY:
    points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    normalizer = Matrix.Scale(1.85 / (hi.z - lo.z), 4) @ Matrix.Translation(-origin)
    for o in meshes:
        o.matrix_world = normalizer @ o.matrix_world

    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(filepath=PREPARED, use_selection=True, export_yup=True, export_format="GLB")

# ---- studio: built after the export so nothing leaks into prepared.glb ----
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

import math

def area(name, loc, energy, size):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.shape = "DISK"
    ld.size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    return ob

# lights rotate with the camera azimuth so every view is lit like the front
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

# the same three views, but each lit relative to its camera
render("front", (0, -4.7, 1.05), (0, 0, 0.95), 2.3, 0)
render("side", (4.7, 0, 1.05), (0, 0, 0.95), 2.3, math.pi / 2)
render("back", (0, 4.7, 1.05), (0, 0, 0.95), 2.3, math.pi)

# ---- PREVIEW ONLY: approved Petra portrait on a head-less duplicate ----
# nothing in this block is exported; source.glb / prepared.glb untouched
import bmesh
from mathutils.geometry import tessellate_polygon

orig = meshes[0]
dup = orig.copy()
dup.data = orig.data.copy()
dup.name = "PetraFaceFitPreview"
bpy.context.scene.collection.objects.link(dup)

bm = bmesh.new()
bm.from_mesh(dup.data)
bm.verts.ensure_lookup_table()
doomed = [v for v in bm.verts if v.co.z > 1.61]
bmesh.ops.delete(bm, geom=doomed, context="VERTS")
bm.to_mesh(dup.data)
bm.free()
dup.data.update()

orig.hide_render = True

# exact outline from src/scene/IllustratedCook.tsx PORTRAITS[0] (petra)
OUTLINE = [
    [426,54],[457,38],[484,40],[499,47],[510,35],[534,40],
    [552,57],[558,78],[555,100],[568,119],[556,151],[538,166],
    [534,204],[524,223],[539,241],[508,263],[486,251],[476,260],
    [449,248],[428,223],[413,209],[412,186],[409,173],[408,145],
    [413,119],[434,108],[422,93],[425,71]]
BOUNDS = (408, 35, 568, 263)  # x0,y0,x1,y1 of the source crop
K = 0.70 / 228               # portrait height / source pixel height

def sxz(p):
    sx, sy = p
    return ((sx - 476) * K, 1.58 + (263 - sy) * K)  # (x, z) in Blender space

def srgb(c):
    return tuple((((v / 255 + 0.055) / 1.055) ** 2.4 if (v / 255) > 0.04045 else (v / 255) / 12.92) for v in c[:3]) + (1.0,)
INK = srgb((0x30, 0x2C, 0x2B))

# --- ink paper extrusion: back at Y=-0.02, front at Y=-0.12
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
mesh = bpy.data.meshes.new("PortraitSlab")
mesh.from_pydata(verts, [], faces)
mesh.update()
slab = bpy.data.objects.new("PortraitSlab", mesh)
bpy.context.scene.collection.objects.link(slab)

inkmat = bpy.data.materials.new("PortraitInk")
inkmat.use_nodes = True
bsdf = inkmat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = INK
bsdf.inputs["Roughness"].default_value = 0.85
mesh.materials.append(inkmat)
bev = slab.modifiers.new("Bevel", "BEVEL")
bev.width = 0.012
bev.segments = 2

# --- printed front: the frozen crop on a cutout sliver at Y=-0.133
fverts = [(x, -0.133, z) for x, z in pts]
ffaces = [tuple(reversed(tri)) for tri in cap]  # front face, -Y normal
fmesh = bpy.data.meshes.new("PortraitPrint")
fmesh.from_pydata(fverts, [], ffaces)
fmesh.update()
uvl = fmesh.uv_layers.new(name="UVMap")
for loop in fmesh.loops:
    co = fmesh.vertices[loop.vertex_index].co
    # invert sxz: sx = x/K + 476 ; sy = 263 - (z-1.58)/K
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
img = bpy.data.images.load(FACE_TEX)
tex.image = img
emis = nt.nodes.new("ShaderNodeEmission")
trans = nt.nodes.new("ShaderNodeBsdfTransparent")
nt.links.new(tex.outputs["Color"], emis.inputs["Color"])
nt.links.new(tex.outputs["Alpha"], mix.inputs[0])
nt.links.new(trans.outputs[0], mix.inputs[1])
nt.links.new(emis.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs["Surface"])
fmesh.materials.append(pmat)

render("petra-face-fit-front", (0, -5, 1.25), (0, 0, 1.15), 2.6, 0)
render("petra-face-fit-three-quarter", (3, -5, 1.25), (0, 0, 1.15), 2.6,
       math.atan2(3, 5))

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
