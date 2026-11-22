import bpy, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/Users/udingethe/Dev/miseenmosh/docs/devlog/media/kitchen-production"
os.makedirs(OUT, exist_ok=True)

def studio():
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = 4
    sc.render.resolution_x = sc.render.resolution_y = 900
    sc.render.film_transparent = False
    w = bpy.data.worlds.new("W"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.52, 0.48, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.3
    sc.world = w
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = 0
    return sc

def lights(az):
    for name, energy, off in (("Key", 300, -0.9), ("Fill", 100, 0.9)):
        L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = 1.2
        lo = bpy.data.objects.new(name, L); bpy.context.collection.objects.link(lo)
        a = az + off
        lo.location = (2.2 * math.sin(a), -2.2 * math.cos(a), 1.6)
        lo.rotation_euler = (Vector((0,0,0.4)) - lo.location).to_track_quat('-Z', 'Y').to_euler()

def apply_pose(pose):
    if not pose: return
    for nm, ang in pose.items():
        ob = bpy.data.objects.get(nm)
        if not ob: raise RuntimeError("missing node " + nm)
        ob.rotation_mode = 'XYZ'
        # glTF local axis -> Blender local: glTF X -> X; glTF Z -> -Y
        if nm == 'OvenDoor': ob.rotation_euler[0] = ang
        else: ob.rotation_euler[1] = -ang
    bpy.context.view_layer.update()

def shot(name, path, cam_dir, pose=None):
    """cam_dir: 'side','quarter','top','rear-quarter' style label -> (offset, )"""
    sc = studio()
    bpy.ops.import_scene.gltf(filepath=path)
    apply_pose(pose)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p[i] for p in pts) for i in range(3)))
    hi = Vector((max(p[i] for p in pts) for i in range(3)))
    centre = (lo + hi) / 2
    diag = (hi - lo).length
    # floor at actual posed world minZ
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, lo.z - 0.001))
    g = bpy.context.active_object
    gm = bpy.data.materials.new("g"); gm.use_nodes = True
    b = gm.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.32, 0.30, 0.27, 1)
    b.inputs["Roughness"].default_value = 0.9
    g.data.materials.append(gm)
    cam_pos, ortho = cam_dir(centre, diag)
    cam = bpy.data.cameras.new("C"); cam.type = 'ORTHO'; cam.ortho_scale = ortho
    co = bpy.data.objects.new("C", cam); bpy.context.collection.objects.link(co)
    co.location = cam_pos
    co.rotation_euler = (centre - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    lights(math.atan2(cam_pos.x, -cam_pos.y))
    sc.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)
    print("rendered", name)

T = os.path.join(HERE, "tongs", "prepared.glb")
S = os.path.join(HERE, "skillet", "prepared.glb")
C = os.path.join(HERE, "cooker", "prepared.glb")

def t_side(c, d):   return (c + Vector((0.85, -0.05, 0.15))), d * 1.6
def t_quarter(c,d): return (c + Vector((0.55, -0.55, 0.4))), d * 1.6
def s_top(c, d):    return (c + Vector((0.05, 0, 1.2))), d * 1.5
def s_quarter(c,d): return (c + Vector((0.55, -0.55, 0.45))), d * 1.5
def s_side(c, d):   return (c + Vector((0, -1.1, 0.12))), d * 1.5
def c_frontq(c,d):  return (c + Vector((1.2, -1.2, 0.55))), d * 1.25
def c_rearq(c,d):   return (c + Vector((1.2, 1.2, 0.55))), d * 1.25

shot("eq-tongs-side.png", T, t_side)
shot("eq-tongs-quarter.png", T, t_quarter)
shot("eq-tongs-open-quarter.png", T, t_quarter,
     pose={"TongsUpper": 0.14, "TongsLower": -0.14})
shot("eq-skillet-top.png", S, s_top)
shot("eq-skillet-quarter.png", S, s_quarter)
shot("eq-skillet-side.png", S, s_side)
shot("eq-cooker-front-quarter.png", C, c_frontq)
shot("eq-cooker-rear-quarter.png", C, c_rearq)
shot("eq-cooker-door-open.png", C, c_frontq, pose={"OvenDoor": math.radians(45)})
