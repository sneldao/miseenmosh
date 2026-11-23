globalThis.self = globalThis;
globalThis.document = { createElementNS: () => new Proxy({}, { get: () => () => {}, set: () => true }) };
globalThis.window = globalThis;
import { readFileSync } from "node:fs";
import { AnimationMixer, AnimationClip, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// reuse stripGlb
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
  const jpad = new Uint8Array(j.length + ((4 - (j.length % 4)) % 4)); jpad.set(j); jpad.fill(0x20, j.length);
  const bpad = new Uint8Array(bin.length + ((4 - (bin.length % 4)) % 4)); bpad.set(bin);
  const out = new ArrayBuffer(12 + 8 + jpad.length + 8 + bpad.length);
  const dv = new DataView(out);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.byteLength, true);
  dv.setUint32(12, jpad.length, true); dv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out).set(jpad, 20);
  dv.setUint32(20 + jpad.length, bpad.length, true); dv.setUint32(24 + jpad.length, 0x004e4942, true);
  new Uint8Array(out).set(bpad, 28 + jpad.length);
  return out;
}

const gltf = await new GLTFLoader().parseAsync(stripGlb(process.argv[2]), "");
let skinned; gltf.scene.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
let clip;
if (process.argv[3].endsWith(".json")) clip = AnimationClip.parse(JSON.parse(readFileSync(process.argv[3], "utf8")));
else clip = gltf.animations.find(a => a.name === process.argv[3]);
if (!clip) throw new Error("clip not found: " + process.argv[3]);
console.log("clip:", clip.name, clip.duration.toFixed(2) + "s", clip.tracks.length, "tracks");

const bonesPre = {};
gltf.scene.traverse(o => { if (o.isBone) bonesPre[o.name] = o; });
skinned.skeleton.pose(); gltf.scene.updateMatrixWorld(true);
const q = new Vector3();
for (const n of ["mixamorigHips","mixamorigLeftHand","mixamorigRightHand","mixamorigHead","mixamorigLeftFoot"])
  { bonesPre[n].getWorldPosition(q); console.log("rest", n, [q.x,q.y,q.z].map(v=>+v.toFixed(2))); }
// armature ancestry of hips
let node = bonesPre["mixamorigHips"];
while (node) { console.log("chain:", node.name || node.type, "pos", node.position.toArray().map(v=>+v.toFixed(2)), "quat", node.quaternion.toArray().map(v=>+v.toFixed(2)), "scale", node.scale.toArray().map(v=>+v.toFixed(2))); node = node.parent; }
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(clip).play();
const bones = {};
gltf.scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
const p = new Vector3();
const wp = n => { bones[n].getWorldPosition(p); return [p.x,p.y,p.z].map(x=>+x.toFixed(2)); };
for (const t of [0, 1.5, 3, 4.5, 5.9]) {
  mixer.setTime(t); gltf.scene.updateMatrixWorld(true);
  console.log(`t=${t.toFixed(1)} hips:${JSON.stringify(wp("mixamorigHips"))} Lwrist:${JSON.stringify(wp("mixamorigLeftHand"))} Rwrist:${JSON.stringify(wp("mixamorigRightHand"))}`);
}
