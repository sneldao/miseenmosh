# Tool-contact fit for the brigade pilots: place simple proxy props on the
# pose bones of the runtime GLBs each Work-clip frame and render, so the grip
# offsets can be tuned visually before they're frozen into the component.
#
#   blender -b --python fit-brigade-tools.py -- --name dimitri --spoon "px,py,pz,rx,ry,rz"
#   blender -b --python fit-brigade-tools.py -- --name anwar --whisk ".." --bowl ".."
#
# Each transform is bone-local: position metres, euler radians.

import bpy, math, os, sys
from mathutils import Vector, Euler, Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
def opt(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
NAME = opt("--name", "dimitri")
OUT = os.path.abspath("docs/devlog/media/kitchen-production")
os.makedirs(OUT, exist_ok=True)

def parse(spec):
    p = [float(v) for v in spec.split(",")]
    return Matrix.Translation(Vector(p[:3])) @ Euler(p[3:6]).to_matrix().to_4x4()

GLB = os.path.abspath(f"assets/meshy/{NAME}-pilot/runtime-{NAME}.glb")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
def pbone(suffix):
    for b in arm.pose.bones:
        if b.name.replace(":", "").endswith(suffix):
            return b
    raise RuntimeError(f"bone {suffix} missing")

import bmesh

def cyl_mesh(name, radius, depth, loc):
    m = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=radius, radius2=radius, depth=depth)
    bm.transform(Matrix.Translation(loc)); bm.to_mesh(m); bm.free()
    return m

def root_obj(name, parts):
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    for i, (m, mat) in enumerate(parts):
        if mat is not None:
            mm = bpy.data.materials.new(name + str(i)); mm.diffuse_color = mat
            m.materials.append(mm)
        o = bpy.data.objects.new(f"{name}_{i}", m)
        bpy.context.scene.collection.objects.link(o)
        o.parent = root
    return root

STEEL = (0.7, 0.7, 0.75, 1); WOOD = (0.42, 0.29, 0.19, 1); CREAM = (0.91, 0.87, 0.77, 1)

def spoon(name):
    h = cyl_mesh(name + "_h", 0.012, 0.24, (0, -0.12, 0))
    b = bpy.data.meshes.new(name + "_b")
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.035)
    bm.transform(Matrix.Diagonal((0.8, 1.4, 0.5)).to_4x4() @ Matrix.Translation((0, -0.27, 0)))
    bm.to_mesh(b); bm.free()
    return root_obj(name, [(h, STEEL), (b, WOOD)])

def whisk(name):
    h = cyl_mesh(name + "_h", 0.015, 0.11, (0, -0.055, 0))
    parts = [(h, WOOD)]
    for i in range(4):
        w = bpy.data.meshes.new(f"{name}_w{i}")
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.004, radius2=0.002, depth=0.2)
        bm.transform(Euler((0.24 * (1 if i % 2 == 0 else -1), (i // 2) * math.pi, 0)).to_matrix().to_4x4()
                     @ Matrix.Translation((0, -0.2, 0)))
        bm.to_mesh(w); bm.free()
        parts.append((w, STEEL))
    return root_obj(name, parts)

def bowl(name):
    m = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.15)
    bm.transform(Matrix.Diagonal((1, 0.62, 1)).to_4x4())
    bm.to_mesh(m); bm.free()
    return root_obj(name, [(m, CREAM)])

def pot(name):
    m = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.13, radius2=0.11, depth=0.14)
    bm.to_mesh(m); bm.free()
    return root_obj(name, [(m, (0.25, 0.22, 0.2, 1))])

# (prop_object, bone, local_matrix)
props = []
if NAME == "dimitri":
    props.append((spoon("Spoon"), "RightHand", parse(opt("--spoon", "0,0.04,0, 1.45,0,0"))))
    # reference sauce pot where the stir actually reaches — counter prop,
    # not bone-mounted (world position from the hand probe at stir frames)
    p = pot("Pot")
    p.location = (-0.19, 0.78, 0.33)
elif NAME == "anwar":
    props.append((whisk("Whisk"), "RightHand", parse(opt("--whisk", "0,0.04,0, 1.45,0,0"))))
    props.append((bowl("Bowl"), "LeftForeArm", parse(opt("--bowl", "0,0.16,0.03, 0,0,0"))))

arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.get("Work")
scn = bpy.context.scene
try:
    scn.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    scn.render.engine = "BLENDER_EEVEE"
scn.render.resolution_x = scn.render.resolution_y = 512
scn.world = bpy.data.worlds.new("w"); scn.world.color = (0.04, 0.04, 0.04)

ld = bpy.data.lights.new("key", "SUN"); ld.energy = 4
lo = bpy.data.objects.new("key", ld); scn.collection.objects.link(lo)
lo.rotation_euler = (0.9, 0.2, 0.6)

cam = bpy.data.cameras.new("c"); cam.lens = 60
co = bpy.data.objects.new("c", cam); scn.collection.objects.link(co); scn.camera = co

VIEWS = {
    "front": ((0.4, -3.2, 1.2), (math.radians(80), 0, 0)),
    "quarter": ((2.3, -2.3, 1.5), (math.radians(75), 0, math.radians(45))),
    "side": ((3.0, -0.3, 1.2), (math.radians(80), 0, math.radians(85))),
}
dg = bpy.context.evaluated_depsgraph_get()
for f in [0, 30, 60, 90]:
    scn.frame_set(f)
    dg.update()
    for obj, bsuffix, local in props:
        pb = pbone(bsuffix)
        # pose bone matrix is in armature space; prop local under that bone
        obj.matrix_world = arm.matrix_world @ pb.matrix @ local
    for vn, (loc, rot) in VIEWS.items():
        co.location = loc; co.rotation_euler = rot
        scn.render.filepath = os.path.join(OUT, f"{NAME}-toolfit-{f:03d}-{vn}.png")
        bpy.ops.render.render(write_still=True)
print("FIT DONE")
