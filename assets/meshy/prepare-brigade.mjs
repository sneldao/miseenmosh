// Brigade runtime prep for Dimitri and Anwar, following the Petra cook-rig
// recipe but generalised: apron verts are found by connected-shell analysis
// (no hand-authored mask file), reweighted off the thighs onto a hinged
// Apron joint whose forward swing is baked per clip; the generated guide
// head is cut at the neck so the approved portrait can mount; a
// PortraitSocket node is added under the head bone; the station work clip
// is renamed to "Work". Geometry, UVs, textures and existing motion
// tracks are preserved. Inspect the derivative before game import.
// Usage: node prepare-brigade.mjs dimitri|anwar
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AnimationMixer, LoopOnce, Matrix4, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const WHO = process.argv[2];
const SPEC = {
  dimitri: {
    workClip: "Dimitri___sauce_stir_and_taste",
    hinge: [0, 0.98, 0.15],   // apron waistband from shell audit
    cutY: 1.44,               // neck bind 1.379 + collar margin
    socket: [0, 1.40, 0.05],  // portrait base at collar line
  },
  anwar: {
    workClip: "Anwar___bowl_whisk_and_check",
    hinge: [0, 1.08, 0.12],
    cutY: 1.44,
    socket: [0, 1.40, 0.05],
  },
  commis: {
    workClip: "Commis___tray_carry_and_present",
    hinge: [0, 0.95, 0.13],
    cutY: 1.44,
    socket: [0, 1.40, 0.05],
    // the carry clip travels with baked root motion; the game drives
    // position itself, so strip horizontal root translation (keep Y bob)
    stripRootXZ: true,
  },
}[WHO];
if (!SPEC) throw new Error("Usage: node prepare-brigade.mjs dimitri|anwar|commis");
// Apron reweighting is OFF for the pilot: shell/distance analysis could not
// separate hanging apron from trouser surface cleanly (distribution is a
// continuum), and a partial reweight produced ragged splits worse than the
// original Meshy thigh weights. --apron retries it behind a review gate.
const DO_APRON = process.argv.includes("--apron");

const dir = join(dirname(fileURLToPath(import.meta.url)), `${WHO}-pilot`);
const sha = b => createHash("sha256").update(b).digest("hex");
function readGlb(path) {
  const bytes = readFileSync(path);
  if (bytes.toString("ascii", 0, 4) !== "glTF" || bytes.readUInt32LE(4) !== 2) throw new Error("Expected GLB2");
  const chunks = new Map();
  for (let o = 12; o < bytes.length;) {
    const n = bytes.readUInt32LE(o);
    chunks.set(bytes.readUInt32LE(o + 4), bytes.subarray(o + 8, o + 8 + n));
    o += n + 8;
  }
  return { bytes, doc: JSON.parse(chunks.get(0x4e4f534a)), bin: chunks.get(0x004e4942) };
}
function glbBytes(doc, bin) {
  const text = Buffer.from(JSON.stringify(doc));
  const json = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20);
  text.copy(json);
  const header = Buffer.alloc(20);
  header.write("glTF"); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, bh, bin]);
}
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const formats = {
  5121: [Uint8Array, 1, "readUInt8"],
  5123: [Uint16Array, 2, "readUInt16LE"],
  5125: [Uint32Array, 4, "readUInt32LE"],
  5126: [Float32Array, 4, "readFloatLE"],
};
function values(asset, id) {
  const a = asset.doc.accessors[id], v = asset.doc.bufferViews[a.bufferView];
  if (a.sparse || v.buffer !== 0 || a.normalized) throw new Error("Unsupported accessor encoding");
  const [Ctor, size, getter] = formats[a.componentType];
  const width = widths[a.type], out = new Ctor(a.count * width);
  const stride = v.byteStride ?? width * size;
  const base = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < width; c++) {
    out[i * width + c] = asset.bin[getter](base + i * stride + c * size);
  }
  return out;
}
const canonical = name => name.replaceAll(":", "");

const source = readGlb(join(dir, `rigged-${WHO}.glb`));
const doc = source.doc;
if (doc.meshes.length !== 1 || doc.meshes[0].primitives.length !== 1 || doc.skins.length !== 1) {
  throw new Error("Unexpected source structure");
}
const primitive = doc.meshes[0].primitives[0];
const geometryDoc = structuredClone(doc);
geometryDoc.materials = [{}]; geometryDoc.images = []; geometryDoc.textures = [];
const geometryGlb = glbBytes(geometryDoc, source.bin);
const { scene, animations } = await new GLTFLoader().parseAsync(
  geometryGlb.buffer.slice(geometryGlb.byteOffset, geometryGlb.byteOffset + geometryGlb.byteLength), "");
let mesh;
scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
const skeleton = mesh.skeleton;
skeleton.pose();
scene.updateMatrixWorld(true);
skeleton.update();
const bone = name => {
  const found = skeleton.bones.find(b => canonical(b.name) === `mixamorig${name}`);
  if (!found) throw new Error(`Missing bone ${name}`);
  return found;
};
const hips = bone("Hips");
const headBind = bone("Head").matrixWorld.clone();
const hipsBind = hips.matrixWorld.clone();
const hipsBindRotation = hips.getWorldQuaternion(new Quaternion());

// ---- apron vertex selection: connected shells hanging in front below the
// waistband that are dominated by thigh weights (Petra's original defect) ----
const positions = values(source, primitive.attributes.POSITION);
const oldJoints = values(source, primitive.attributes.JOINTS_0);
const oldWeights = values(source, primitive.attributes.WEIGHTS_0);
const sourceIndices = values(source, primitive.indices);
const vCount = positions.length / 3;

// union-find over the index buffer
const parent = Uint32Array.from({ length: vCount }, (_, i) => i);
const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
for (let i = 0; i < sourceIndices.length; i += 3) {
  const a = find(sourceIndices[i]);
  parent[find(sourceIndices[i + 1])] = a;
  parent[find(sourceIndices[i + 2])] = a;
}
const shells = new Map();
for (let i = 0; i < vCount; i++) {
  const r = find(i);
  if (!shells.has(r)) shells.set(r, []);
  shells.get(r).push(i);
}
const legJoint = i => /(Left|Right)(UpLeg|Leg|Foot|Toe)/.test(skeleton.bones[i].name);
const thighWeight = i => {
  let w = 0;
  for (let c = 0; c < 4; c++) if (legJoint(oldJoints[i * 4 + c])) w += oldWeights[i * 4 + c];
  return w;
};
const worldY = i => mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld).y;
const worldZ = i => mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld).z;
const waistY = SPEC.hinge[1];
const apronVerts = [];
const shellReport = [];
for (const verts of shells.values()) {
  if (verts.length < 20) continue;
  const tw = verts.reduce((s, i) => s + thighWeight(i), 0) / verts.length;
  const mz = verts.reduce((s, i) => s + worldZ(i), 0) / verts.length;
  const yMax = Math.max(...verts.map(worldY));
  const yMin = Math.min(...verts.map(worldY));
  shellReport.push({ verts: verts.length, thighW: +tw.toFixed(3), meanZ: +mz.toFixed(3), y: [+yMin.toFixed(2), +yMax.toFixed(2)] });
  // hanging front cloth only: thigh-influenced but not rigid (tw<0.95 kills
  // trouser/shoe shells), clearly in front of the body plane, and never
  // reaching the shin — missing fringe shells are safer than grabbing legs
  if (tw > 0.3 && tw < 0.95 && mz > 0.07 && yMin > 0.5 && yMax < waistY + 0.25) {
    apronVerts.push(...verts);
  }
}
if (DO_APRON && !apronVerts.length) throw new Error("No apron shell found — check selection thresholds");

const blocks = [source.bin];
let length = source.bin.length;
function append(data, type, componentType, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
  bytes.copy(padded);
  const vi = doc.bufferViews.length;
  doc.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target ? { target } : {}) });
  blocks.push(padded);
  length += padded.length;
  const ai = doc.accessors.length;
  doc.accessors.push({ bufferView: vi, componentType, count: data.length / widths[type], type });
  return ai;
}
const joints = new Uint16Array(oldJoints), weights = new Float32Array(oldWeights);

if (DO_APRON) {
// ---- new Apron joint hinged at the waistband, child of Hips ----
const hingeWorld = new Matrix4().makeTranslation(...SPEC.hinge);
const hingeLocal = hipsBind.clone().invert().multiply(hingeWorld);
const lp = new Vector3(), lq = new Quaternion(), ls = new Vector3();
hingeLocal.decompose(lp, lq, ls);
if (Math.max(...ls.toArray().map(v => Math.abs(v - 1))) > 1e-5) throw new Error("Unexpected rig scale");
const skin = doc.skins[0];
const hipNodeIndex = doc.nodes.findIndex(n => canonical(n.name ?? "") === "mixamorigHips");
if (hipNodeIndex < 0) throw new Error("Hips node missing");
const apronNode = doc.nodes.length, apronJoint = skin.joints.length;
if (doc.nodes.some(n => n.name === "Apron")) throw new Error("Already prepared");
doc.nodes.push({ name: "Apron", translation: lp.toArray(), rotation: lq.toArray(), scale: ls.toArray() });
(doc.nodes[hipNodeIndex].children ??= []).push(apronNode);

const oldInverse = values(source, skin.inverseBindMatrices);
const inverse = new Float32Array(oldInverse.length + 16);
inverse.set(oldInverse);
inverse.set(hingeWorld.clone().invert().elements, oldInverse.length);
skin.inverseBindMatrices = append(inverse, "MAT4", 5126);
skin.joints.push(apronNode);

const hipJoint = skeleton.bones.indexOf(hips);
for (const i of apronVerts) {
  const y = worldY(i);
  const x = Math.max(0, Math.min(1, (waistY - y) / 0.10));
  const blend = x * x * (3 - 2 * x);
  let retained = [];
  for (let c = 0; c < 4; c++) {
    const j = oldJoints[i * 4 + c], w = oldWeights[i * 4 + c];
    if (w > 0 && !legJoint(j)) retained.push([j, w]);
  }
  if (!retained.length) retained = [[hipJoint, 1]];
  const sum = retained.reduce((s, [, w]) => s + w, 0);
  retained = retained.map(([j, w]) => [j, w / sum * (1 - blend)]);
  retained.push([apronJoint, blend]);
  retained = retained.filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = retained.reduce((s, [, w]) => s + w, 0);
  for (let c = 0; c < 4; c++) {
    joints[i * 4 + c] = retained[c]?.[0] ?? 0;
    weights[i * 4 + c] = (retained[c]?.[1] ?? 0) / total;
  }
}
for (let i = 0; i < weights.length; i += 4) {
  if (Math.abs(weights[i] + weights[i+1] + weights[i+2] + weights[i+3] - 1) > 2e-6) throw new Error("Bad weight sum");
}
primitive.attributes.JOINTS_0 = append(joints, "VEC4", 5123, 34962);
primitive.attributes.WEIGHTS_0 = append(weights, "VEC4", 5126, 34962);

// ---- bake the apron's modest forward swing into every clip (cook-rig recipe) ----
const legs = [["LeftUpLeg", "LeftLeg"], ["RightUpLeg", "RightLeg"]].map(pair => pair.map(bone));
const mixer = new AnimationMixer(scene);
const axis = new Vector3(1, 0, 0);
for (const clip of animations) {
  mixer.stopAllAction();
  skeleton.pose();
  const action = mixer.clipAction(clip).reset();
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const sampleTimes = [];
  for (let t = 0; t < clip.duration - 1e-6; t += 1 / 60) sampleTimes.push(Math.fround(t));
  sampleTimes.push(Math.fround(clip.duration));
  const times = Float32Array.from(new Set(sampleTimes));
  const n = times.length;
  const angles = [];
  for (const t of times) {
    action.paused = false;
    mixer.setTime(t);
    scene.updateMatrixWorld(true);
    const inv = hips.getWorldQuaternion(new Quaternion()).invert();
    const forward = legs.map(([upper, knee]) => {
      const v = knee.getWorldPosition(new Vector3()).sub(upper.getWorldPosition(new Vector3()));
      v.applyQuaternion(inv).applyQuaternion(hipsBindRotation);
      return Math.atan2(v.z, -v.y);
    });
    angles.push(Math.min(1.45, Math.max(0, ...forward) * 1.1));
  }
  const qs = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const taps = [1, 4, 6, 4, 1];
    const angle = taps.reduce((s, w, k) => s + w * angles[Math.max(0, Math.min(n-1, i+k-2))], 0) / 16;
    const q = lq.clone().multiply(new Quaternion().setFromAxisAngle(axis, -angle)).normalize();
    qs.set(q.toArray(), i * 4);
  }
  const animation = doc.animations.find(a => a.name === clip.name);
  if (!animation) throw new Error(`Missing raw clip ${clip.name}`);
  const input = append(times, "SCALAR", 5126);
  doc.accessors[input].min = [0];
  doc.accessors[input].max = [clip.duration];
  const output = append(qs, "VEC4", 5126);
  const sampler = animation.samplers.length;
  animation.samplers.push({ input, output, interpolation: "LINEAR" });
  animation.channels.push({ sampler, target: { node: apronNode, path: "rotation" } });
}
}

// ---- head cut: drop tris entirely above the collar line ----
const cutY = SPEC.cutY;
const kept = [];
for (let i = 0; i < sourceIndices.length; i += 3) {
  const tri = [sourceIndices[i], sourceIndices[i+1], sourceIndices[i+2]];
  if (tri.every(v => positions[v * 3 + 1] <= cutY)) kept.push(...tri);
}
if (!kept.length) throw new Error("Head cut removed everything");
const used = [...new Set(kept)].sort((a, b) => a - b);
const vertexMap = new Map(used.map((old, i) => [old, i]));
const reindexedSrc = key =>
  DO_APRON ? (key === "JOINTS_0" ? joints : key === "WEIGHTS_0" ? weights : null) : null;
for (const [key, id] of Object.entries(primitive.attributes)) {
  // With --apron, JOINTS_0/WEIGHTS_0 were already replaced by appended
  // accessors pointing past the original bin — read the in-memory arrays.
  // Without it the accessors are untouched and keep their original types.
  const a = doc.accessors[id], width = widths[a.type];
  const src = reindexedSrc(key) ?? values(source, id);
  const data = new src.constructor(used.length * width);
  used.forEach((old, i) => data.set(src.subarray(old * width, (old + 1) * width), i * width));
  primitive.attributes[key] = append(data, a.type, a.componentType, 34962);
  if (key === "POSITION") {
    const na = doc.accessors[primitive.attributes[key]];
    na.min = [0,1,2].map(c => Math.min(...used.map(i => positions[i * 3 + c])));
    na.max = [0,1,2].map(c => Math.max(...used.map(i => positions[i * 3 + c])));
  }
}
primitive.indices = append(Uint32Array.from(kept, i => vertexMap.get(i)), "SCALAR", 5125, 34963);

// ---- PortraitSocket under the head bone (world target from SPEC) ----
const headNodeIndex = doc.nodes.findIndex(n => canonical(n.name ?? "") === "mixamorigHead");
if (headNodeIndex < 0) throw new Error("Head node missing");
const socket = doc.nodes.length;
doc.nodes.push({ name: "PortraitSocket",
  matrix: headBind.clone().invert().multiply(new Matrix4().makeTranslation(...SPEC.socket)).toArray() });
(doc.nodes[headNodeIndex].children ??= []).push(socket);

// ---- strip baked root travel (commis carry clip) — keep the Y bob ----
if (SPEC.stripRootXZ) {
  const hipsIndex = doc.nodes.findIndex(n => canonical(n.name ?? "") === "mixamorigHips");
  if (hipsIndex < 0) throw new Error("Hips node missing");
  let stripped = 0;
  for (const animation of doc.animations) {
    for (const channel of animation.channels) {
      if (channel.target.node !== hipsIndex || channel.target.path !== "translation") continue;
      const sampler = animation.samplers[channel.sampler];
      const out = Float32Array.from(values(source, sampler.output));
      const [x0, , z0] = out;
      for (let i = 0; i < out.length; i += 3) { out[i] = x0; out[i + 2] = z0; }
      sampler.output = append(out, "VEC3", 5126);
      stripped++;
    }
  }
  console.log(`stripRootXZ: ${stripped} channels pinned to frame 0`);
}

// ---- clip names the runtime expects ----
const workAnim = doc.animations.find(a => a.name === SPEC.workClip);
if (!workAnim) throw new Error(`Work clip ${SPEC.workClip} missing`);
workAnim.name = "Work";

doc.buffers[0].byteLength = length;
const out = glbBytes(doc, Buffer.concat(blocks));
const outPath = join(dir, `runtime-${WHO}.glb`);
writeFileSync(outPath, out);
writeFileSync(join(dir, "runtime-manifest.json"), JSON.stringify({
  source_sha256: sha(source.bytes), output_sha256: sha(out),
  apron_reweighted: DO_APRON, apron_vertices: DO_APRON ? apronVerts.length : 0, shells: shellReport,
  hinge_world: SPEC.hinge, head_cut_y: cutY, socket_world: SPEC.socket,
  clips: doc.animations.map(a => a.name),
}, null, 2) + "\n");
console.log(`Wrote ${outPath} (${out.length} bytes); apron verts ${apronVerts.length}; clips ${doc.animations.map(a=>a.name).join(", ")}`);
