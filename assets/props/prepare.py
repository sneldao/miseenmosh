#!/usr/bin/env python3
"""Deterministic equipment conversion per preparation.json (verbatim recipe).

Reads each tool's source.glb, bakes complete node world transforms, regroups
geometry by material within functional groups, rebuilds textures per the
configured grades and writes prepared.glb + preparation-receipt.json.
No welding, no decimation, no remeshing; sources stay byte-identical.
"""
import base64, hashlib, io, json, os, re, struct, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "preparation.json")))

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
      5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

def sha(b): return hashlib.sha256(b).hexdigest()

def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)

def linear_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, c * 12.92)

def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i+2], 16) / 255 for i in (0, 2, 4)])

# ---------- GLB read ----------
class Glb:
    def __init__(self, path):
        raw = open(path, "rb").read()
        assert raw[:4] == b"glTF"
        ln = struct.unpack("<I", raw[12:16])[0]
        self.json = json.loads(raw[20:20 + ln])
        off = 20 + ln
        self.bin = b""
        while off < len(raw):
            cl, ct = struct.unpack("<II", raw[off:off + 8])
            if ct == 0x004E4942:
                self.bin = raw[off + 8:off + 8 + cl]
            off += 8 + cl

    def accessor(self, idx):
        a = self.json["accessors"][idx]
        bv = self.json["bufferViews"][a["bufferView"]]
        dt = CT[a["componentType"]]
        n = NCOMP[a["type"]]
        start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = bv.get("byteStride") or n * np.dtype(dt).itemsize
        count = a["count"]
        if stride == n * np.dtype(dt).itemsize:
            out = np.frombuffer(self.bin, dt, count * n, start).reshape(count, n)
        else:
            out = np.zeros((count, n), dt)
            for i in range(count):
                out[i] = np.frombuffer(self.bin, dt, n, start + i * stride)
        return out.copy()

    def image_bytes(self, idx):
        img = self.json["images"][idx]
        bv = self.json["bufferViews"][img["bufferView"]]
        return self.bin[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]]

def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    t = n.get("translation", [0, 0, 0]); r = n.get("rotation", [0, 0, 0, 1]); s = n.get("scale", [1, 1, 1])
    x, y, z, w = r
    rm = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    m[:3, :3] = rm @ np.diag(s)
    m[:3, 3] = t
    return m

def world_matrices(g):
    parent = {}
    for i, n in enumerate(g.json["nodes"]):
        for c in n.get("children", []):
            parent[c] = i
    cache = {}
    def wm(i):
        if i in cache: return cache[i]
        m = node_matrix(g.json["nodes"][i])
        cache[i] = (wm(parent[i]) @ m) if i in parent else m
        return cache[i]
    return [wm(i) for i in range(len(g.json["nodes"]))]

# ---------- textures ----------
def pil_resize(img, w, h):
    return img.resize((w, h), Image.LANCZOS)

def resize_side(img, max_side):
    w, h = img.size
    if max(w, h) <= max_side: return img.copy()
    k = max_side / max(w, h)
    return pil_resize(img, max(1, round(w * k)), max(1, round(h * k)))

def tex_base_color(data, max_side):
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    a = np.asarray(img, dtype=np.float32) / 255.0
    has_alpha = bool(np.any(a[..., 3] < 1.0))
    linear = srgb_to_linear(a[..., :3]).astype(np.float32)
    h, w = linear.shape[:2]
    k = min(1.0, max_side / max(w, h))
    size = (max(1, round(w*k)), max(1, round(h*k)))
    channels = [np.asarray(Image.fromarray(linear[..., c], mode='F').resize(size, Image.Resampling.LANCZOS), dtype=np.float32) for c in range(3)]
    rgb = linear_to_srgb(np.stack(channels, axis=-1))
    if has_alpha:
        alpha = np.asarray(Image.fromarray(a[..., 3], mode='F').resize(size, Image.Resampling.LANCZOS), dtype=np.float32)
        rgb = np.dstack((rgb, np.clip(alpha, 0, 1)))
    out = Image.fromarray(np.rint(np.clip(rgb, 0, 1)*255).astype(np.uint8), 'RGBA' if has_alpha else 'RGB')
    buf = io.BytesIO()
    out.save(buf, 'PNG' if has_alpha else 'JPEG', **({} if has_alpha else {'quality':90}))
    return buf.getvalue(), 'image/png' if has_alpha else 'image/jpeg'

def tex_normal(data, max_side):
    """raw RGB resize then renormalize the decoded vectors"""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img = resize_side(img, max_side)
    v = np.asarray(img).astype(np.float64) / 255 * 2 - 1
    n = np.linalg.norm(v, axis=2, keepdims=True)
    n[n == 0] = 1
    v = v / n * 0.5 + 0.5
    buf = io.BytesIO()
    Image.fromarray((np.clip(v, 0, 1) * 255 + 0.5).astype(np.uint8)).save(buf, "PNG")
    return buf.getvalue(), "image/png"

def tex_mr(data, max_side, src_rng, tgt_rng):
    """packed MR: resize raw RGB, remap roughness G, preserve R and B"""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img = resize_side(img, max_side)
    a = np.asarray(img).astype(np.float64)
    sl, sh = src_rng; t0, t1 = tgt_rng
    a[..., 1] = 255 * (t0 + np.clip((a[..., 1] - sl) / (sh - sl), 0, 1) * (t1 - t0))
    buf = io.BytesIO()
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").save(buf, "PNG")
    return buf.getvalue(), "image/png"

# ---------- glTF writer ----------
class Writer:
    def __init__(self):
        self.bin = bytearray()
        self.views = []
        self.accessors = []
        self.images = []
        self.textures = []
        self.materials = []
        self.meshes = []
        self.nodes = []
        self.sampler = {"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}

    def pad(self):
        while len(self.bin) % 4: self.bin.append(0)

    def add_view(self, data, target=None):
        self.pad()
        off = len(self.bin)
        self.bin += data
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target: v["target"] = target
        self.views.append(v)
        return len(self.views) - 1

    def add_accessor(self, arr, atype, target=None, minmax=False):
        a = np.asarray(arr)
        data = a.tobytes()
        acc = {"bufferView": self.add_view(data, target), "componentType":
               {np.dtype('float32'): 5126, np.dtype('uint16'): 5123,
                np.dtype('uint32'): 5125, np.dtype('uint8'): 5121}[a.dtype],
               "count": a.shape[0] if a.ndim > 1 else len(a), "type": atype}
        if minmax:
            acc["min"] = a.min(0).tolist(); acc["max"] = a.max(0).tolist()
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def add_image(self, data, mime):
        bv = self.add_view(data)
        self.images.append({"bufferView": bv, "mimeType": mime})
        self.textures.append({"source": len(self.images) - 1, "sampler": 0})
        return len(self.textures) - 1

    def add_mesh(self, prims):
        self.meshes.append({"primitives": prims})
        return len(self.meshes) - 1

    def add_node(self, **kw):
        n = {k: v for k, v in kw.items() if v is not None}
        self.nodes.append(n)
        return len(self.nodes) - 1

    def emit(self, path, scene_roots, extras=None):
        j = {"asset": {"version": "2.0", "generator": "assets/props/prepare.py"},
             "scene": 0, "scenes": [{"nodes": scene_roots}],
             "nodes": self.nodes, "meshes": self.meshes,
             "materials": self.materials, "accessors": self.accessors,
             "bufferViews": self.views,
             "buffers": [{"byteLength": len(self.bin)}]}
        if self.images:
            j["images"] = self.images
            j["textures"] = self.textures
            j["samplers"] = [self.sampler]
        payload = json.dumps(j, separators=(",", ":")).encode()
        while len(payload) % 4: payload += b" "
        binb = bytes(self.bin)
        while len(binb) % 4: binb += b"\0"
        out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(payload) + 8 + len(binb))
        out += struct.pack("<II", len(payload), 0x4E4F534A) + payload
        out += struct.pack("<II", len(binb), 0x004E4942) + binb
        open(path, "wb").write(out)
        return sha(out), len(out)

# ---------- geometry gather ----------
def gather(g):
    """world-baked primitives: {node_name, material_name, pos, nrm, uv, idx}"""
    wms = world_matrices(g)
    out = []
    for ni, n in enumerate(g.json["nodes"]):
        if "mesh" not in n: continue
        m = wms[ni]
        nm = np.linalg.inv(m[:3, :3]).T
        for p in g.json["meshes"][n["mesh"]]["primitives"]:
            pos = g.accessor(p["attributes"]["POSITION"]).astype(np.float64)
            pos = (m[:3, :3] @ pos.T).T + m[:3, 3]
            nrm = np.ones((len(pos), 3)) * np.array([0, 1, 0])
            if "NORMAL" in p["attributes"]:
                nrm = g.accessor(p["attributes"]["NORMAL"]).astype(np.float64)
                nrm = (nm @ nrm.T).T
                nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
            uv = np.zeros((len(pos), 2))
            if "TEXCOORD_0" in p["attributes"]:
                uv = g.accessor(p["attributes"]["TEXCOORD_0"]).astype(np.float64)
            idx = g.accessor(p["indices"]).astype(np.uint32).reshape(-1)
            mat = g.json["materials"][p["material"]] if "material" in p else {"name": "default"}
            out.append({"node": n.get("name", f"node{ni}"), "mat": mat.get("name", "default"),
                        "pos": pos, "nrm": nrm, "uv": uv, "idx": idx})
    return out

def base_name(name):
    return re.sub(r"\.\d{3}$", "", name)

def suffix_num(name):
    m = re.search(r"\.(\d{3})$", name)
    return int(m.group(1)) if m else 0

def merge(prims):
    """append attributes, rebase triangle indices — no welding"""
    pos = np.concatenate([p["pos"] for p in prims])
    nrm = np.concatenate([p["nrm"] for p in prims])
    uv = np.concatenate([p["uv"] for p in prims])
    idx = []
    off = 0
    for p in prims:
        idx.append(p["idx"] + off)
        off += len(p["pos"])
    return pos, nrm, uv, np.concatenate(idx)

# ---------- material rebuild ----------
def build_material(w, name, cfg, g, max_side):
    """returns material dict index; textures processed per config"""
    src = next((m for m in g.json["materials"] if m.get("name") == name), {})
    pbr = dict(src.get("pbrMetallicRoughness", {}))
    mat = {"name": name, "doubleSided": src.get("doubleSided", False),
           "pbrMetallicRoughness": pbr}

    def img_of(texref):
        if texref is None: return None, None
        srcimg = g.json["textures"][texref["index"]]["source"]
        return g.image_bytes(srcimg), srcimg

    # base colour map
    if cfg.get("opaque_srgb_color"):
        pbr.pop("baseColorTexture", None)
        lin = srgb_to_linear(hex_rgb(cfg["opaque_srgb_color"]))
        pbr["baseColorFactor"] = [*lin.tolist(), 1.0]
    elif "baseColorTexture" in pbr:
        data, _ = img_of(pbr["baseColorTexture"])
        data, mime = tex_base_color(data, max_side)
        pbr["baseColorTexture"] = {"index": w.add_image(data, mime)}
    if cfg.get("srgb_tint"):
        lin = srgb_to_linear(hex_rgb(cfg["srgb_tint"]))
        pbr["baseColorFactor"] = [*lin.tolist(), 1.0]

    # metallic-roughness
    if "metallicRoughnessTexture" in pbr:
        data, _ = img_of(pbr["metallicRoughnessTexture"])
        if "roughness_source_g" in cfg:
            data, _ = tex_mr(data, max_side, cfg["roughness_source_g"], cfg["roughness_target"])
            pbr["roughnessFactor"] = 1.0
        else:
            img = Image.open(io.BytesIO(data)).convert("RGB")
            img = resize_side(img, max_side)
            rbuf = io.BytesIO()
            img.save(rbuf, "PNG")
            data, mime = rbuf.getvalue(), "image/png"
        pbr["metallicRoughnessTexture"] = {"index": w.add_image(data, mime if "roughness_source_g" not in cfg else "image/png")}
    if "metalness" in cfg:
        pbr["metallicFactor"] = cfg["metalness"]
    if "roughness" in cfg:
        pbr["roughnessFactor"] = cfg["roughness"]

    # normal map
    if "normalTexture" in src:
        data, _ = img_of(src["normalTexture"])
        data, _ = tex_normal(data, max_side)
        nt = {"index": w.add_image(data, "image/png")}
        if "normal_scale" in cfg: nt["scale"] = cfg["normal_scale"]
        mat["normalTexture"] = nt

    if cfg.get("remove_transmission_and_ior"):
        mat.pop("extensions", None)
        pbr["metallicFactor"] = cfg.get("metalness", 0)
        pbr["roughnessFactor"] = cfg.get("roughness", 0.32)
        mat["alphaMode"] = "OPAQUE"

    w.materials.append(mat)
    return len(w.materials) - 1

def emit_prims(w, groups, g):
    """groups: {node_label: [(mat_name, pos, nrm, uv, idx)]} → node mesh refs"""
    out = {}
    for label, prims in groups.items():
        by_mat = {}
        for (mn, pos, nrm, uv, idx) in prims:
            by_mat.setdefault(mn, []).append((pos, nrm, uv, idx))
        ps = []
        for mn, items in by_mat.items():
            pos = np.concatenate([i[0] for i in items])
            nrm = np.concatenate([i[1] for i in items])
            uv = np.concatenate([i[2] for i in items])
            idx = np.concatenate([i[3] + off for i, off in
                                  zip(items, np.cumsum([0] + [len(i[0]) for i in items[:-1]]))])
            ps.append({"attributes": {
                           "POSITION": w.add_accessor(pos.astype(np.float32), "VEC3", 34962, True),
                           "NORMAL": w.add_accessor(nrm.astype(np.float32), "VEC3", 34962),
                           "TEXCOORD_0": w.add_accessor(uv.astype(np.float32), "VEC2", 34962)},
                       "indices": w.add_accessor(idx.astype(np.uint32), "SCALAR", 34963),
                       "material": by_mat_index[mn],
                       "mode": 4})
        out[label] = w.add_mesh(ps) if ps else None
    return out

receipt = {"config": CFG, "tools": {}}
MAX = CFG.get("texture_max_side")

def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]])

def trs_matrix(t, r=None, s=None):
    m = np.eye(4)
    m[:3, 3] = t
    return m

# ============ TONGS ============
def do_tongs():
    global by_mat_index
    cfg = CFG["tongs"]; name = "tongs"
    src_path = os.path.join(HERE, name, "source.glb")
    src_raw = open(src_path, "rb").read()
    assert sha(src_raw) == cfg["source_sha256"], "tongs source hash mismatch"
    g = Glb(src_path)
    prims = gather(g)
    grip = np.array(cfg["grip_source"]); hinge = np.array(cfg["hinge_source"])
    jaw = np.array(cfg["jaw_contact_source"])
    M = rot_y(cfg["root_rotation_y"]) @ trs_matrix(-grip)

    upper = set(cfg["upper_parts"]); lower = set(cfg["lower_parts"])
    groups = {"fixed": [], "upper": [], "lower": []}
    sem = {"fixed": [], "upper": [], "lower": []}
    for p in prims:
        if p["node"] in upper: k = "upper"
        elif p["node"] in lower: k = "lower"
        else: k = "fixed"
        groups[k].append(p); sem[k].append(p["node"])

    w = Writer()
    by_mat_index = {mn: build_material(w, mn, cfg["materials"][mn], g, cfg["texture_max_side"])
                    for mn in sorted({p["mat"] for p in prims})}

    roots = []
    asset = w.add_node(name="AssetRoot"); roots.append(asset)
    grip_node = w.add_node(name="TongsGrip", matrix=(M.T).flatten().tolist(), children=[])
    # fixed parts keep SOURCE-frame verts/normals; parent TongsGrip applies M once.
    per = {"fixed": {}, "upper": {}, "lower": {}}
    for p in groups["fixed"]:
        per["fixed"].setdefault(p["mat"], []).append((p["pos"], p["nrm"], p["uv"], p["idx"]))
    for key in ("upper", "lower"):
        for p in groups[key]:
            per[key].setdefault(p["mat"], []).append(
                (p["pos"] - hinge, p["nrm"], p["uv"], p["idx"]))

    def mesh_for(key):
        ps = []
        for mn, items in per[key].items():
            pos = np.concatenate([i[0] for i in items])
            nrm = np.concatenate([i[1] for i in items])
            uv = np.concatenate([i[2] for i in items])
            offs = np.cumsum([0] + [len(i[0]) for i in items[:-1]])
            idx = np.concatenate([i[3] + o for i, o in zip(items, offs)])
            ps.append({"attributes": {
                "POSITION": w.add_accessor(pos.astype(np.float32), "VEC3", 34962, True),
                "NORMAL": w.add_accessor(nrm.astype(np.float32), "VEC3", 34962),
                "TEXCOORD_0": w.add_accessor(uv.astype(np.float32), "VEC2", 34962)},
                "indices": w.add_accessor(idx.astype(np.uint32), "SCALAR", 34963),
                "material": by_mat_index[mn], "mode": 4})
        return w.add_mesh(ps) if ps else None

    fixed_mesh = mesh_for("fixed")
    if fixed_mesh is not None:
        grip_children_nodes = [w.add_node(mesh=fixed_mesh, name="TongsFixed",
                                          extras={"parts": sem["fixed"]})]
    else:
        grip_children_nodes = []
    for key, pname in (("upper", "TongsUpper"), ("lower", "TongsLower")):
        pn = w.add_node(name=pname, translation=hinge.tolist(), mesh=mesh_for(key),
                        extras={"parts": sem[key], "axis": "local Z"})
        grip_children_nodes.append(pn)
    w.nodes[grip_node]["children"] = grip_children_nodes
    w.nodes[asset]["children"] = [
        grip_node,
        w.add_node(name="socket_grip"),
        w.add_node(name="socket_tip", translation=(M[:3,:3] @ jaw + M[:3,3]).tolist()),
    ]

    out = os.path.join(HERE, name, "prepared.glb")
    h, sz = w.emit(out, roots)
    receipt["tools"][name] = {"source_sha256": cfg["source_sha256"], "prepared_sha256": h,
        "bytes": sz, "ops": ["bake world transforms", "Ry(-pi/2)*T(-grip) root",
        "merge by material within fixed/upper/lower", "pivots at hinge, verts hinge-relative",
        "sockets grip/tip", "texture resize+MR G remap+normal renormalize"]}

# ============ SKILLET ============
def do_skillet():
    global by_mat_index
    cfg = CFG["skillet"]; name = "skillet"
    src_path = os.path.join(HERE, name, "source.glb")
    src_raw = open(src_path, "rb").read()
    assert sha(src_raw) == cfg["source_sha256"], "skillet source hash mismatch"
    g = Glb(src_path)
    prims = gather(g)
    bowl = np.array(cfg["bowl_center_source"])
    grip = np.array(cfg["grip_source"])

    w = Writer()
    by_mat_index = {mn: build_material(w, mn, cfg["materials"][mn], g, cfg["texture_max_side"])
                    for mn in sorted({p["mat"] for p in prims})}
    per = {}
    for p in prims:
        per.setdefault(p["mat"], []).append((p["pos"] - bowl, p["nrm"], p["uv"], p["idx"]))
    ps = []
    for mn, items in per.items():
        pos = np.concatenate([i[0] for i in items]); nrm = np.concatenate([i[1] for i in items])
        uv = np.concatenate([i[2] for i in items])
        offs = np.cumsum([0] + [len(i[0]) for i in items[:-1]])
        idx = np.concatenate([i[3] + o for i, o in zip(items, offs)])
        ps.append({"attributes": {
            "POSITION": w.add_accessor(pos.astype(np.float32), "VEC3", 34962, True),
            "NORMAL": w.add_accessor(nrm.astype(np.float32), "VEC3", 34962),
            "TEXCOORD_0": w.add_accessor(uv.astype(np.float32), "VEC2", 34962)},
            "indices": w.add_accessor(idx.astype(np.uint32), "SCALAR", 34963),
            "material": by_mat_index[mn], "mode": 4})
    asset = w.add_node(name="AssetRoot", children=[])
    w.nodes[asset]["children"] = [
        w.add_node(name="Skillet", mesh=w.add_mesh(ps), extras={"parts": sorted({p["node"] for p in prims})}),
        w.add_node(name="socket_grip", translation=(grip - bowl).tolist()),
        w.add_node(name="socket_bowl", translation=[0, 0, 0]),
    ]
    out = os.path.join(HERE, name, "prepared.glb")
    h, sz = w.emit(out, [asset])
    receipt["tools"][name] = {"source_sha256": cfg["source_sha256"], "prepared_sha256": h,
        "bytes": sz, "ops": ["T(-bowl_center)", "merge five meshes by material",
        "sockets grip/bowl", "texture resize+MR G remap+normal renormalize"]}

# ============ COOKER ============
def do_cooker():
    global by_mat_index
    cfg = CFG["cooker"]; name = "cooker"
    src_path = os.path.join(HERE, name, "source.glb")
    src_raw = open(src_path, "rb").read()
    assert sha(src_raw) == cfg["source_sha256"], "cooker source hash mismatch"
    g = Glb(src_path)
    prims = gather(g)

    door_parts = set(cfg["functional_groups"]["OvenDoor"])
    knob_parts = set(cfg["functional_groups"]["ControlKnob0to4"])
    door_pivot = np.array(cfg["door_pivot_source"])
    knob_pivots = [np.array(p) for p in cfg["knob_pivots_source"]]

    groups = {"door": [], "static": [], **{f"knob{i}": [] for i in range(5)}}
    sem = {"door": [], "static": [], **{f"knob{i}": [] for i in range(5)}}
    for p in prims:
        bn = base_name(p["node"])
        if bn in door_parts:
            groups["door"].append(p); sem["door"].append(p["node"])
        elif bn in knob_parts:
            groups[f"knob{suffix_num(p['node'])}"].append(p)
            sem[f"knob{suffix_num(p['node'])}"].append(p["node"])
        else:
            groups["static"].append(p); sem["static"].append(p["node"])

    w = Writer()
    by_mat_index = {mn: build_material(w, mn, cfg["materials"][mn], g, cfg["texture_max_side"])
                    for mn in sorted({p["mat"] for p in prims})}

    def mesh_rel(items, origin):
        per = {}
        for p in items:
            per.setdefault(p["mat"], []).append((p["pos"] - origin, p["nrm"], p["uv"], p["idx"]))
        ps = []
        for mn, its in per.items():
            pos = np.concatenate([i[0] for i in its]); nrm = np.concatenate([i[1] for i in its])
            uv = np.concatenate([i[2] for i in its])
            offs = np.cumsum([0] + [len(i[0]) for i in its[:-1]])
            idx = np.concatenate([i[3] + o for i, o in zip(its, offs)])
            ps.append({"attributes": {
                "POSITION": w.add_accessor(pos.astype(np.float32), "VEC3", 34962, True),
                "NORMAL": w.add_accessor(nrm.astype(np.float32), "VEC3", 34962),
                "TEXCOORD_0": w.add_accessor(uv.astype(np.float32), "VEC2", 34962)},
                "indices": w.add_accessor(idx.astype(np.uint32), "SCALAR", 34963),
                "material": by_mat_index[mn], "mode": 4})
        return w.add_mesh(ps) if ps else None

    asset = w.add_node(name="AssetRoot", children=[])
    kids = []
    sm = mesh_rel(groups["static"], np.zeros(3))
    if sm is not None:
        kids.append(w.add_node(name="Static", mesh=sm,
                               extras={"parts": sorted(set(sem["static"]))}))
    dm = mesh_rel(groups["door"], door_pivot)
    kids.append(w.add_node(name="OvenDoor", mesh=dm, translation=door_pivot.tolist(),
                           extras={"parts": sorted(set(sem["door"])), "axis": "local X"}))
    for i in range(5):
        km = mesh_rel(groups[f"knob{i}"], knob_pivots[i])
        kids.append(w.add_node(name=f"Knob{i}", mesh=km, translation=knob_pivots[i].tolist(),
                               extras={"parts": sorted(set(sem[f"knob{i}"])), "axis": "local Z"}))
    w.nodes[asset]["children"] = kids

    out = os.path.join(HERE, name, "prepared.glb")
    h, sz = w.emit(out, [asset])
    receipt["tools"][name] = {"source_sha256": cfg["source_sha256"], "prepared_sha256": h,
        "bytes": sz, "ops": ["bake node translations", "merge by material within door/knobs/static",
        "door pivot + knob pivots", "enamel linear tint, optical opaque + drop transmission/ior",
        "texture resize to 256"]}

if __name__ == "__main__":
    do_tongs(); do_skillet(); do_cooker()
    receipt["config_sha256"] = sha(json.dumps(CFG, sort_keys=True).encode())
    rp = os.path.join(HERE, "preparation-receipt.json")
    open(rp, "w").write(json.dumps(receipt, indent=1))
    print("wrote", rp)
    for t, r in receipt["tools"].items():
        print(t, r["prepared_sha256"][:16], r["bytes"])
