"""Brigade pilot: render rigged Dimitri/Anwar GLBs and their bundled clips for
visual review. Same studio construction as petra-pilot/review-rig.py, minus the
portrait composite (generated guide heads are replaced by approved crops in
game — this review only checks body deformation and work poses).
Usage: blender -b -P review-brigade.py -- --name dimitri|anwar
Nothing is exported; source GLBs stay byte-identical."""

import math
import sys
import bpy
from mathutils import Vector

ROOT = "/Users/udingethe/Dev/miseenmosh"
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAME = argv[argv.index("--name") + 1] if "--name" in argv else "dimitri"
assert NAME in ("dimitri", "anwar", "commis", "porter"), NAME

RUNTIME = "--runtime" in argv
RIGGED = (f"{ROOT}/assets/meshy/{NAME}-pilot/runtime-{NAME}.glb" if RUNTIME
          else f"{ROOT}/assets/meshy/{NAME}-pilot/rigged-{NAME}.glb")
BLEND = f"{ROOT}/assets/meshy/{NAME}-pilot/rig-review.blend"
OUT_DIR = f"{ROOT}/docs/devlog/media/kitchen-production"
WORK_CLIP = ("Work" if RUNTIME else
             {"dimitri": "Dimitri___sauce_stir_and_taste",
              "anwar": "Anwar___bowl_whisk_and_check",
              "commis": "Commis___tray_carry_and_present",
              "porter": "Porter___bus_tub_haul_and_set_down"}[NAME])

bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=RIGGED)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
assert armatures, "no armature imported"
arm = armatures[0]

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

ad = arm.animation_data if arm.animation_data else arm.animation_data_create()

def play(action):
    ad.action = action
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
SIDE = ((5, 0, 1.25), math.pi / 2)
TARGET = (0, 0, 1.15)
print("ACTIONS", [a.name for a in bpy.data.actions])

work = next((a for a in bpy.data.actions if a.name == WORK_CLIP), None)
assert work, f"{WORK_CLIP} not found in {[a.name for a in bpy.data.actions]}"
play(work)
for frac in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0):
    at_fraction(work, frac)
    for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
        render(f"{NAME}-work-{int(frac * 100):02d}-{camname}", loc, TARGET, 2.6, az)

for cname in ("Walking", "Running"):
    act = next((a for a in bpy.data.actions if a.name.lower().startswith(cname.lower())), None)
    assert act, f"{cname} not found"
    play(act)
    for frac in (0.0, 0.25, 0.5, 0.75):
        at_fraction(act, frac)
        for camname, (loc, az) in (("front", FRONT), ("quarter", QUARTER)):
            render(f"{NAME}-{cname.lower()}-{int(frac * 100):02d}-{camname}", loc, TARGET, 2.6, az)

# rest/standing reference
play(work)
at_fraction(work, 0.0)
render(f"{NAME}-work-00-side", SIDE[0], TARGET, 2.6, SIDE[1])

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
