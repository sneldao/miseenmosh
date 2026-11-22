"""Diagnostic apron selection; does not change source geometry or weights.

Red = proposed apron/tie region. Inspect the 3D mask before using it to paint
weights. Thresholds are specific to this reviewed orange/gold/teal costume.
"""
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = ROOT / "motions.glb"
raw = source.read_bytes()
assert raw[:4] == b"glTF"
chunks = {}
offset = 12
while offset < len(raw):
    length, kind = struct.unpack_from("<II", raw, offset)
    chunks[kind] = raw[offset + 8:offset + 8 + length]
    offset += 8 + length
doc = json.loads(chunks[0x4E4F534A])
binary = chunks[0x004E4942]
types = {5121: "B", 5123: "H", 5125: "I", 5126: "f"}
widths = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

def accessor(index):
    a = doc["accessors"][index]
    assert "sparse" not in a
    v = doc["bufferViews"][a["bufferView"]]
    fmt = "<" + types[a["componentType"]] * widths[a["type"]]
    start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = v.get("byteStride", struct.calcsize(fmt))
    return [struct.unpack_from(fmt, binary, start + i * stride) for i in range(a["count"])]

assert len(doc["meshes"]) == 1 and len(doc["meshes"][0]["primitives"]) == 1
p = doc["meshes"][0]["primitives"][0]
positions = accessor(p["attributes"]["POSITION"])
indices = [row[0] for row in accessor(p["indices"])]
parents = list(range(len(positions)))

def root(i):
    while parents[i] != i:
        parents[i] = parents[parents[i]]
        i = parents[i]
    return i

def join(a, b):
    parents[root(b)] = root(a)

aliases = {}
for i, xyz in enumerate(positions):
    key = tuple(math.floor(x * 1e6 + 0.5) for x in xyz)
    aliases.setdefault(key, []).append(i)
for group in aliases.values():
    for i in group:
        join(group[0], i)
for i in range(0, len(indices), 3):
    a, b, c = indices[i:i+3]
    join(a, b)
    join(a, c)
shells = {}
for i in range(len(positions)):
    shells.setdefault(root(i), []).append(i)
shells = {min(g): g for g in shells.values()}

selected = set()
# Only the separate knot, loops, tails and lower apron panel. Colour alone
# also selects hidden trouser vertices painted gold beneath the real apron.
cloth_shells = (1766, 1914, 1938, 2128, 3444, 3487)
for first in cloth_shells:
    assert first in shells, f"Missing expected clothing shell {first}"
    selected.update(shells[first])
# UV aliases at the same point must receive identical treatment.
for group in aliases.values():
    if any(i in selected for i in group):
        selected.update(group)

report = {
    "input": str(source),
    "sha256": hashlib.sha256(raw).hexdigest(),
    "status": "diagnostic_selection_requires_visual_review",
    "selected_vertices": len(selected),
    "vertex_indices": sorted(selected),
    "bind_positions_gltf": [positions[i] for i in sorted(selected)],
    "included_shells": cloth_shells,
}
(ROOT / "cloth-mask.json").write_text(json.dumps(report, indent=2) + "\n")
colours = b"".join(struct.pack("<fff", *((1.0, 0.02, 0.02) if i in selected else (0.16, 0.18, 0.20)))
                    for i in range(len(positions)))
view_index = len(doc["bufferViews"])
doc["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(colours), "target": 34962})
attr_index = len(doc["accessors"])
doc["accessors"].append({"bufferView": view_index, "componentType": 5126,
                         "count": len(positions), "type": "VEC3"})
p["attributes"]["COLOR_0"] = attr_index
doc["materials"] = [{"doubleSided": True, "pbrMetallicRoughness": {"metallicFactor": 0, "roughnessFactor": 1}}]
p["material"] = 0
doc["images"] = []
doc["textures"] = []
binary += colours
doc["buffers"][0]["byteLength"] = len(binary)
text = json.dumps(doc, separators=(",", ":")).encode()
text += b" " * ((-len(text)) % 4)
out = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(text) + 8 + len(binary))
out += struct.pack("<II", len(text), 0x4E4F534A) + text
out += struct.pack("<II", len(binary), 0x004E4942) + binary
(ROOT / "cloth-mask.glb").write_bytes(out)
print(json.dumps({k: v for k, v in report.items() if k not in ("vertex_indices", "bind_positions_gltf")}, indent=2))
