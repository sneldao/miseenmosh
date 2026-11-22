// Geometry/skin diagnostics only; materials are omitted in memory so this
// local audit needs neither an image decoder nor a browser. No source edits.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AnimationMixer, Box3, LoopOnce, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const input = process.argv[2];
const output = process.argv[3];
const onlyClip = process.argv[4];
if (!input || !output) throw new Error("Usage: node audit-rig.mjs input.glb output.json");
const raw = readFileSync(input);
if (raw.toString("ascii", 0, 4) !== "glTF" || raw.readUInt32LE(4) !== 2) {
  throw new Error("Expected GLB 2");
}
const chunks = [];
for (let offset = 12; offset < raw.length;) {
  const length = raw.readUInt32LE(offset);
  chunks.push({ type: raw.readUInt32LE(offset + 4), data: raw.subarray(offset + 8, offset + 8 + length) });
  offset += 8 + length;
}
const doc = JSON.parse(chunks.find(c => c.type === 0x4e4f534a).data.toString());
if (doc.buffers.some(b => b.uri)) throw new Error("External buffers are not supported");
doc.materials = (doc.materials ?? []).map(() => ({}));
doc.images = [];
doc.textures = [];
const text = Buffer.from(JSON.stringify(doc));
const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20);
text.copy(padded);
chunks.find(c => c.type === 0x4e4f534a).data = padded;
const payload = Buffer.concat(chunks.flatMap(c => {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(c.data.length, 0);
  header.writeUInt32LE(c.type, 4);
  return [header, c.data];
}));
const header = Buffer.alloc(12);
header.write("glTF");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + payload.length, 8);
const glb = Buffer.concat([header, payload]);
const { scene, animations } = await new GLTFLoader().parseAsync(
  glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "",
);
const meshes = [];
scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
if (meshes.length !== 1) throw new Error(`Expected one skinned mesh, got ${meshes.length}`);
const mesh = meshes[0];
const skeleton = mesh.skeleton;
skeleton.pose();
scene.updateMatrixWorld(true);
skeleton.update();
const geometry = mesh.geometry;
const count = geometry.attributes.position.count;
const positions = () => Array.from({ length: count }, (_, i) =>
  mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld));
const rest = positions();
const weights = geometry.attributes.skinWeight;
const sums = Array.from({ length: count }, (_, i) =>
  weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i));
const index = geometry.index.array;
const edgeKeys = new Set();
for (let i = 0; i < index.length; i += 3) {
  for (const [a, b] of [[index[i], index[i + 1]], [index[i + 1], index[i + 2]], [index[i + 2], index[i]]]) {
    edgeKeys.add(Math.min(a, b) * count + Math.max(a, b));
  }
}
const edges = [...edgeKeys].map(k => {
  const a = Math.floor(k / count), b = k % count;
  return [a, b, rest[a].distanceTo(rest[b])];
}).filter(([, , length]) => length > 1e-7);
const seams = new Map();
for (let i = 0; i < count; i++) {
  const p = geometry.attributes.position;
  const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e6)).join(",");
  if (!seams.has(key)) seams.set(key, []);
  seams.get(key).push(i);
}
const seamGroups = [...seams.values()].filter(g => g.length > 1);
// This band crosses this figure's belt. Measure in the moving lower-spine
// frame so simply turning the torso cannot masquerade as waist compression.
const waistBand = [1.14, 1.18];
const waist = rest.flatMap((p, i) => p.y >= waistBand[0] && p.y <= waistBand[1] ? [i] : []);
if (waist.length < 8) throw new Error("Insufficient vertices in the stated waist band");
const spine = skeleton.bones.find(b => b.name.replace(":", "") === "mixamorigSpine");
if (!spine) throw new Error("Lower spine not found");
const lateral = new Vector3(1, 0, 0).applyQuaternion(spine.getWorldQuaternion(new Quaternion()).invert());
function waistWidth(points) {
  const inv = spine.matrixWorld.clone().invert();
  const xs = waist.map(i => points[i].clone().applyMatrix4(inv).dot(lateral));
  return Math.max(...xs) - Math.min(...xs);
}
const bindWaist = waistWidth(rest);
// Connected shells, with coincident UV-seam vertices joined, help locate
// clothing islands before any deliberate weight edits. This does not edit them.
const parents = Array.from({ length: count }, (_, i) => i);
function root(i) {
  if (parents[i] !== i) parents[i] = root(parents[i]);
  return parents[i];
}
function join(a, b) { parents[root(b)] = root(a); }
for (const group of seamGroups) for (const i of group) join(group[0], i);
for (const [a, b] of edges) join(a, b);
const components = new Map();
for (let i = 0; i < count; i++) {
  const key = root(i);
  if (!components.has(key)) components.set(key, []);
  components.get(key).push(i);
}
const skinIndices = geometry.attributes.skinIndex;
const thighIds = new Set(skeleton.bones.flatMap((b, i) => /UpLeg$/.test(b.name) ? [i] : []));
function thighWeight(i) {
  let sum = 0;
  for (let c = 0; c < 4; c++) if (thighIds.has(skinIndices.getComponent(i, c))) sum += weights.getComponent(i, c);
  return sum;
}
const jointNames = /^(mixamorig:?)?(Hips|Head|Neck|Spine2|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm|LeftHand|RightHand|LeftLeg|RightLeg|LeftFoot|RightFoot)$/;
const report = {
  input, sha256: createHash("sha256").update(raw).digest("hex"),
  skin_weight_sum_range: [Math.min(...sums), Math.max(...sums)],
  indexed_edges_measured: edges.length,
  degenerate_edges_ignored: edgeKeys.size - edges.length,
  coincident_position_tolerance_m: 1e-6,
  waist_band_bind_world_y_m: waistBand,
  waist_band_vertices: waist.length,
  bind_waist_width_m: bindWaist,
  connected_shells: [...components.values()].filter(g => g.length >= 12).map(g => {
    const box = new Box3().setFromPoints(g.map(i => rest[i]));
    return { first_vertex: Math.min(...g), vertices: g.length,
      min: box.min.toArray(), max: box.max.toArray(),
      mean_thigh_weight: g.reduce((sum, i) => sum + thighWeight(i), 0) / g.length };
  }),
  rest_joints: skeleton.bones.filter(b => jointNames.test(b.name)).map(b => ({
    name: b.name, position: b.getWorldPosition(new Vector3()).toArray(),
  })),
  clips: [],
};
const mixer = new AnimationMixer(scene);
for (const clip of animations.filter(c => !onlyClip || c.name === onlyClip)) {
  mixer.stopAllAction();
  skeleton.pose();
  const action = mixer.clipAction(clip).reset();
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const keys = [...new Set(clip.tracks.flatMap(t => Array.from(t.times)))].sort((a, b) => a - b);
  const times = [...keys, ...keys.slice(1).map((t, i) => (t + keys[i]) / 2)].sort((a, b) => a - b);
  let minRatio = Infinity, maxRatio = 0, maxSeam = 0, worstTime = 0;
  let maxOutsideBand = 0, minWaistRatio = Infinity, minWaistTime = 0;
  let minEdge = null, maxEdge = null;
  for (const t of times) {
    action.paused = false;
    mixer.setTime(t);
    scene.updateMatrixWorld(true);
    skeleton.update();
    const posed = positions();
    const widthRatio = waistWidth(posed) / bindWaist;
    if (widthRatio < minWaistRatio) { minWaistRatio = widthRatio; minWaistTime = t; }
    let outside = 0;
    for (const [a, b, length] of edges) {
      const ratio = posed[a].distanceTo(posed[b]) / length;
      if (ratio < minRatio) {
        minRatio = ratio;
        minEdge = { indices: [a, b], time_s: t, bind_midpoint: rest[a].clone().add(rest[b]).multiplyScalar(0.5).toArray() };
      }
      if (ratio > maxRatio) {
        maxRatio = ratio; worstTime = t;
        maxEdge = { indices: [a, b], time_s: t, rest: [rest[a].toArray(), rest[b].toArray()],
          weights: [a, b].map(i => Array.from({ length: 4 }, (_, c) => ({
            bone: skeleton.bones[skinIndices.getComponent(i, c)].name,
            weight: weights.getComponent(i, c),
          })).filter(w => w.weight > 0)) };
      }
      if (ratio > 3 || ratio < 0.25) outside++;
    }
    maxOutsideBand = Math.max(maxOutsideBand, outside);
    for (const group of seamGroups) {
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          maxSeam = Math.max(maxSeam, posed[group[a]].distanceTo(posed[group[b]]));
        }
      }
    }
  }
  report.clips.push({
    name: clip.name, duration_s: clip.duration,
    sampling: "Every stored key time and every adjacent-key midpoint",
    samples: times.length,
    indexed_edge_length_ratio_range: [minRatio, maxRatio],
    max_edges_outside_0_25_to_3x_bind: maxOutsideBand,
    max_fraction_edges_outside_0_25_to_3x_bind: maxOutsideBand / edges.length,
    min_waist_width_ratio: minWaistRatio,
    min_waist_time_s: minWaistTime,
    most_compressed_edge: minEdge,
    most_stretched_edge: maxEdge,
    max_stretch_time_s: worstTime,
    max_coincident_rest_position_separation_m: maxSeam,
  });
}
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
