"""Render the proposed apron/cloth vertex mask for review. Bind pose only;
no mesh/weight edits, no exports."""

import math
import bpy
from mathutils import Vector

ROOT = "/Users/udingethe/Dev/miseenmosh"
MASK = f"{ROOT}/assets/meshy/petra-pilot/cloth-mask.glb"
OUT_DIR = f"{ROOT}/docs/devlog/media/kitchen-production"

bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=MASK)

for arm in [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]:
    arm.data.pose_position = "REST"
    if arm.animation_data:
        arm.animation_data.action = None
        for tr in arm.animation_data.nla_tracks:
            tr.mute = True

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

cam = bpy.data.cameras.new("Cam")
cam.type = "ORTHO"
camob = bpy.data.objects.new("Cam", cam)
bpy.context.scene.collection.objects.link(camob)
scene.camera = camob

def render(name, loc, azimuth):
    cam.ortho_scale = 2.3
    camob.location = loc
    camob.rotation_euler = (Vector((0, 0, 0.95)) - camob.location).to_track_quat("-Z", "Y").to_euler()
    place_lights(azimuth)
    scene.render.filepath = f"{OUT_DIR}/{name}.png"
    bpy.ops.render.render(write_still=True)

render("cloth-mask-front", (0, -5, 1.05), 0)
render("cloth-mask-quarter", (3, -5, 1.05), math.atan2(3, 5))
