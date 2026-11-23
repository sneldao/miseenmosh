// Compare rest-pose world orientations: cook GLB skin vs SMPLH FBX body.
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Vector3, Quaternion } from "three";

globalThis.self = globalThis;
globalThis.document = { createElementNS: () => new Proxy({}, { get: () => () => {}, set: () => true }) };
globalThis.window = globalThis;

// strip textures so GLTFLoader doesn't touch images
function stripGlb(path) {
  const buf = readFileSync(path);
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = body; else if (type === 0x004e4942) bin = body;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  const g = JSON.parse(new TextDecoder().decode(json));
  delete g.images; delete g.textures; delete g.samplers;
  for (const m of g.materials ?? []) { delete m.pbrMetallicRoughness; delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; }
  const j = new TextEncoder().encode(JSON.stringify(g));
  const jpad = new Uint8Array(j.length + ((4 - (j.length % 4)) % 4));
  jpad.set(j); jpad.fill(0x20, j.length);
  const bpad = new Uint8Array(bin.length + ((4 - (bin.length % 4)) % 4));
  bpad.set(bin);
  const total = 12 + 8 + jpad.length + 8 + bpad.length;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jpad.length, true); dv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out).set(jpad, 20);
  dv.setUint32(20 + jpad.length, bpad.length, true); dv.setUint32(24 + jpad.length, 0x004e4942, true);
  new Uint8Array(out).set(bpad, 28 + jpad.length);
  return out;
}

const gltf = await new GLTFLoader().parseAsync(stripGlb(process.argv[2]), "");
const skinned = (() => { let s; gltf.scene.traverse(o => { if (o.isSkinnedMesh && !s) s = o; }); return s; })();
skinned.skeleton.pose();
gltf.scene.updateMatrixWorld(true);

const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
const fbx = new FBXLoader().parse(readFileSync(process.argv[3]).buffer, "");
let fmesh; fbx.traverse(o => { if (o.isSkinnedMesh && !fmesh) fmesh = o; });
fmesh.skeleton.pose();
fbx.updateMatrixWorld(true);

function worldPos(root, name, aliases = []) {
  let b;
  root.traverse(o => { if ((o.isBone || o.type === "Bone") && (o.name === name || aliases.includes(o.name))) b = o; });
  if (!b) return null;
  const v = new Vector3(); b.getWorldPosition(v); return v;
}
function dir(root, a, b) {
  const pa = worldPos(root, a), pb = worldPos(root, b);
  if (!pa || !pb) return null;
  return pb.sub(pa).normalize().toArray().map(x => +x.toFixed(3));
}
const dump = []; gltf.scene.traverse(o => { if (o.isBone) dump.push(o.name); });
console.log("cook bones:", dump.length, dump.slice(0, 14).join(", "));
const fdump = []; fbx.traverse(o => { if (o.isBone) fdump.push(o.name); });
const PAIRS = [
  ["upperarm L", ["mixamorigLeftArm", "L_Shoulder"], ["mixamorigLeftForeArm", "L_Elbow"]],
  ["forearm L",  ["mixamorigLeftForeArm", "L_Elbow"], ["mixamorigLeftHand", "L_Wrist"]],
  ["thigh L",    ["mixamorigLeftUpLeg", "L_Hip"], ["mixamorigLeftLeg", "L_Knee"]],
  ["shin L",     ["mixamorigLeftLeg", "L_Knee"], ["mixamorigLeftFoot", "L_Ankle"]],
  ["spine",      ["mixamorigHips", "Pelvis"], ["mixamorigSpine2", "Spine3"]],
  ["head",       ["mixamorigNeck", "Neck"], ["mixamorigHead", "Head"]],
];
for (const [label, [ga, fa], [gb, fb]] of PAIRS) {
  console.log(label.padEnd(10), "cook:", JSON.stringify(dir(gltf.scene, ga, gb)), " fbx:", JSON.stringify(dir(fbx, fa, fb)));
}
console.log("hip height  cook:", worldPos(gltf.scene, "Hips")?.y.toFixed(3), " fbx:", worldPos(fbx, "Pelvis")?.y.toFixed(3));
console.log("head height cook:", worldPos(gltf.scene, "Head")?.y.toFixed(3), " fbx:", worldPos(fbx, "Head")?.y.toFixed(3));
