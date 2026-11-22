// Petra-specific, non-destructive cloth preparation. Source geometry, UVs,
// textures and existing motion tracks are preserved. Inspect the derivative
// before importing it into the game.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AnimationMixer, LoopOnce, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const dir = dirname(fileURLToPath(import.meta.url));
const sha = data => createHash("sha256").update(data).digest("hex");
const maskBytes = readFileSync(join(dir, "cloth-mask.json"));
const acceptedMask = "2aff13a305b6c9b6bfed122e5b51452173175053080315d28149fe8d1efea79a";
if (sha(maskBytes) !== acceptedMask) throw new Error("Cloth selection needs fresh visual approval");
const mask = JSON.parse(maskBytes);
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
  header.write("glTF");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
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
const source = readGlb(join(dir, "service-source.glb"));
const baseline = readGlb(join(dir, "motions.glb"));
if (sha(baseline.bytes) !== mask.sha256) throw new Error("Mask baseline changed");
const doc = source.doc;
if (doc.meshes.length !== 1 || doc.meshes[0].primitives.length !== 1 || doc.skins.length !== 1) {
  throw new Error("Unexpected source structure");
}
const primitive = doc.meshes[0].primitives[0];
const basePrimitive = baseline.doc.meshes[0].primitives[0];
for (const key of ["POSITION", "NORMAL", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0", "indices"]) {
  const a = values(source, key === "indices" ? primitive.indices : primitive.attributes[key]);
  const b = values(baseline, key === "indices" ? basePrimitive.indices : basePrimitive.attributes[key]);
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) throw new Error(`Mask/source mismatch: ${key}`);
}
const canonical = name => name.replaceAll(":", "");
const names = asset => asset.doc.skins[0].joints.map(i => canonical(asset.doc.nodes[i].name));
if (JSON.stringify(names(source)) !== JSON.stringify(names(baseline))) throw new Error("Joint order changed");
// Only the in-memory geometry loader omits images; the output keeps the
// original material and embedded image bytes.
const geometryDoc = structuredClone(doc);
geometryDoc.materials = [{}];
geometryDoc.images = [];
geometryDoc.textures = [];
const geometryGlb = glbBytes(geometryDoc, source.bin);
const { scene, animations } = await new GLTFLoader().parseAsync(
  geometryGlb.buffer.slice(geometryGlb.byteOffset, geometryGlb.byteOffset + geometryGlb.byteLength), "",
);
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
if (process.argv.includes("--contacts")) {
  const clip = animations.find(a => a.name === "Petra___sear_and_turn");
  if (!clip) throw new Error("Cooking clip missing");
  const mixer = new AnimationMixer(scene);
  const action = mixer.clipAction(clip);
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const selected = skeleton.bones.filter(b => /(Hips|Head|Hand|ForeArm|Hand(Thumb|Index|Middle)1|Foot)$/.test(b.name));
  const phases = [0, .2, .4, .6, .8, 1].map(fraction => {
    action.paused = false;
    mixer.setTime(clip.duration * fraction);
    scene.updateMatrixWorld(true);
    return { fraction, time_s: clip.duration * fraction,
      bones: selected.map(b => ({ name: b.name,
        position: b.getWorldPosition(new Vector3()).toArray(),
        quaternion: b.getWorldQuaternion(new Quaternion()).toArray() })) };
  });
  writeFileSync(join(dir, "work-contacts.json"), JSON.stringify({
    source_sha256: sha(source.bytes), clip: clip.name, phases,
  }, null, 2) + "\n");
  console.log(JSON.stringify(phases.map(p => ({ fraction: p.fraction,
    hands: p.bones.filter(b => /Hand$/.test(b.name)) })), null, 2));
  process.exit(0);
}
const hips = bone("Hips");
const headBind = bone("Head").matrixWorld.clone();
const handBinds = new Map(["Left", "Right"].map(side => [
  `mixamorig${side}Hand`, bone(`${side}Hand`).quaternion.clone(),
]));
const hipsBind = hips.matrixWorld.clone();
const hipsBindRotation = hips.getWorldQuaternion(new Quaternion());
// The separate lower panel begins at y=1.0394; the gold waistband above it
// belongs to the body mesh and must not be dragged with the loose panel.
const hingeWorld = new Matrix4().makeTranslation(0, 1.04, 0.15);
const hingeLocal = hipsBind.clone().invert().multiply(hingeWorld);
const lp = new Vector3(), lq = new Quaternion(), ls = new Vector3();
hingeLocal.decompose(lp, lq, ls);
if (Math.max(...ls.toArray().map(v => Math.abs(v - 1))) > 1e-5) throw new Error("Unexpected rig scale");
const skin = doc.skins[0];
const hipIndex = skin.joints.find(i => canonical(doc.nodes[i].name) === "mixamorigHips");
const apronNode = doc.nodes.length, apronJoint = skin.joints.length;
if (doc.nodes.some(n => n.name === "Apron")) throw new Error("Already cooked");
doc.nodes.push({ name: "Apron", translation: lp.toArray(), rotation: lq.toArray(), scale: ls.toArray() });
(doc.nodes[hipIndex].children ??= []).push(apronNode);

const blocks = [source.bin];
let length = source.bin.length;
function append(data, type, componentType, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (length % 4 || bytes.length % 4) throw new Error("Unaligned accessor");
  const vi = doc.bufferViews.length;
  doc.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target ? { target } : {}) });
  blocks.push(bytes);
  length += bytes.length;
  const ai = doc.accessors.length;
  doc.accessors.push({ bufferView: vi, componentType, count: data.length / widths[type], type });
  return ai;
}
const oldInverse = values(source, skin.inverseBindMatrices);
const inverse = new Float32Array(oldInverse.length + 16);
inverse.set(oldInverse);
inverse.set(hingeWorld.clone().invert().elements, oldInverse.length);
skin.inverseBindMatrices = append(inverse, "MAT4", 5126);
skin.joints.push(apronNode);

const oldJoints = values(source, primitive.attributes.JOINTS_0);
const oldWeights = values(source, primitive.attributes.WEIGHTS_0);
const joints = new Uint16Array(oldJoints), weights = new Float32Array(oldWeights);
const legJoint = i => /(Left|Right)(UpLeg|Leg|Foot|Toe)/.test(skeleton.bones[i].name);
const hipJoint = skeleton.bones.indexOf(hips);
for (const i of mask.vertex_indices) {
  const p = mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld);
  const x = Math.max(0, Math.min(1, (1.04 - p.y) / 0.10));
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

// A single apron flap follows the pelvis, rather than being pulled apart by
// separate thighs. Bake a modest forward swing into each existing motion.
// The bend fades into the original pelvis weights over the upper 10 cm.
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
    // Symmetric 5-tap smoothing, with held endpoints; no frame-delay drift.
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
doc.buffers[0].byteLength = length;
const out = glbBytes(doc, Buffer.concat(blocks));
writeFileSync(join(dir, "cooked.glb"), out);
writeFileSync(join(dir, "cook-manifest.json"), JSON.stringify({
  status: "derivative_requires_pose_review",
  source_sha256: sha(source.bytes), mask_sha256: sha(maskBytes), output_sha256: sha(out),
  selected_vertices: mask.vertex_indices.length, joint_count: skin.joints.length,
  geometry_uv_material_preserved: true,
  hinge_bind_world_m: [0, 1.04, 0.15],
  upper_blend_y_m: [0.94, 1.04],
  cloth_swing: { sample_hz: 60, max_radians: 1.45, leg_angle_factor: 1.1, smoothing: [1,4,6,4,1] },
}, null, 2) + "\n");
console.log(`Wrote cooked.glb (${out.length} bytes); pose/penetration review is still required.`);

if (process.argv.includes("--runtime")) {
  // Runtime derivative: the original portrait replaces the neutral generated
  // head. This is an NPC asset edit, never a camera-dependent visibility trick.
  const runtime = structuredClone(doc);
  const workingBin = Buffer.concat(blocks);
  const current = { doc, bin: workingBin };
  const p = runtime.meshes[0].primitives[0];
  const positions = values(current, p.attributes.POSITION);
  const sourceIndices = values(current, p.indices);
  const kept = [];
  for (let i = 0; i < sourceIndices.length; i += 3) {
    const tri = Array.from(sourceIndices.subarray(i, i + 3));
    if (tri.every(v => positions[v * 3 + 1] <= 1.615)) kept.push(...tri);
  }
  const used = [...new Set(kept)].sort((a, b) => a - b);
  const vertexMap = new Map(used.map((old, i) => [old, i]));
  const newBlocks = [workingBin];
  let newLength = workingBin.length;
  function add(data, type, componentType, target) {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    const view = runtime.bufferViews.length;
    runtime.bufferViews.push({ buffer: 0, byteOffset: newLength, byteLength: bytes.length,
      ...(target ? { target } : {}) });
    newBlocks.push(padded);
    newLength += padded.length;
    const accessor = runtime.accessors.length;
    runtime.accessors.push({ bufferView: view, componentType, type, count: data.length / widths[type] });
    return accessor;
  }
  for (const [key, id] of Object.entries(p.attributes)) {
    const a = doc.accessors[id], sourceValues = values(current, id), width = widths[a.type];
    const data = new sourceValues.constructor(used.length * width);
    used.forEach((old, i) => data.set(sourceValues.subarray(old * width, (old + 1) * width), i * width));
    p.attributes[key] = add(data, a.type, a.componentType, 34962);
    if (key === "POSITION") {
      const a2 = runtime.accessors[p.attributes[key]];
      a2.min = [0,1,2].map(c => Math.min(...used.map(i => positions[i * 3 + c])));
      a2.max = [0,1,2].map(c => Math.max(...used.map(i => positions[i * 3 + c])));
    }
  }
  p.indices = add(Uint16Array.from(kept, i => vertexMap.get(i)), "SCALAR", 5123, 34963);
  const headIndex = runtime.nodes.findIndex(n => canonical(n.name ?? "") === "mixamorigHead");
  const socket = runtime.nodes.length;
  runtime.nodes.push({ name: "PortraitSocket",
    matrix: headBind.clone().invert().multiply(new Matrix4().makeTranslation(0, 1.58, .02)).toArray() });
  (runtime.nodes[headIndex].children ??= []).push(socket);

  const original = doc.animations.find(a => a.name === "Petra___sear_and_turn");
  const sourceDuration = animations.find(a => a.name === original.name).duration;
  const contactLoop = process.argv.includes("--contact-loop");
  const duration = contactLoop ? 4 : sourceDuration;
  const smooth = v => { const x = Math.max(0, Math.min(1, v)); return x*x*x*(x*(x*6-15)+10); };
  const times = [];
  for (let t = 0; t < duration - 1e-6; t += 1/30) times.push(Math.fround(t));
  times.push(Math.fround(duration));
  const workTimes = add(Float32Array.from(new Set(times)), "SCALAR", 5126);
  runtime.accessors[workTimes].min = [0];
  runtime.accessors[workTimes].max = [duration];
  const idleTimes = add(new Float32Array([0,4]), "SCALAR", 5126);
  runtime.accessors[idleTimes].min = [0];
  runtime.accessors[idleTimes].max = [4];
  const work = { name: "PetraWork", samplers: [], channels: [] };
  const idle = { name: "PetraReady", samplers: [], channels: [] };
  const contactGrip = contactLoop || process.argv.includes("--contact-grip");
  // The source work action holds the wrists 38–56 degrees away from the
  // forearm/palm axis; the neutral bind measures 3–4 degrees. Preserve the
  // captured arm performance and wrist roll, but bound wrist swing relative
  // to bind. This candidate is reviewed separately before replacing runtime.
  function gripRotation(array, node) {
    const bind = handBinds.get(canonical(doc.nodes[node].name ?? ""));
    if (!contactGrip || !bind) return Array.from(array);
    const delta = bind.clone().invert().multiply(new Quaternion().fromArray(array)).normalize();
    if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
    const twist = new Quaternion(0, delta.y, 0, delta.w).normalize();
    const swing = delta.clone().multiply(twist.clone().invert()).normalize();
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, swing.w)));
    const swingLimit = 15 * Math.PI / 180;
    if (angle > swingLimit) swing.copy(new Quaternion().slerp(swing, swingLimit / angle));
    const twistAngle = 2 * Math.atan2(twist.y, twist.w);
    const limitedTwist = Math.max(-85 * Math.PI / 180, Math.min(85 * Math.PI / 180, twistAngle));
    twist.setFromAxisAngle(new Vector3(0, 1, 0), limitedTwist);
    return bind.clone().multiply(swing).multiply(twist).normalize().toArray();
  }
  for (const channel of original.channels) {
    const sampler = original.samplers[channel.sampler];
    if ((sampler.interpolation ?? "LINEAR") !== "LINEAR") throw new Error("Unexpected motion interpolation");
    const input = values(current, sampler.input), output = values(current, sampler.output);
    const rotation = channel.target.path === "rotation", width = rotation ? 4 : 3;
    const Track = rotation ? QuaternionKeyframeTrack : VectorKeyframeTrack;
    const interpolant = new Track("sample", input, output).createInterpolant();
    const startPose = contactLoop ? interpolant.evaluate(sourceDuration * .2) : output.subarray(0, width);
    const first = rotation ? gripRotation(startPose, channel.target.node) : Array.from(startPose);
    const data = new Float32Array(times.length * width);
    times.forEach((t, i) => {
      const sourceTime = contactLoop
        ? sourceDuration * (t <= .45 ? .2 : t < 2.75
          ? .2 + .3 * smooth((t-.45)/2.3)
          : .5)
        : t;
      const rawPose = interpolant.evaluate(sourceTime);
      const pose = rotation ? gripRotation(rawPose, channel.target.node) : rawPose;
      const w = contactLoop ? 1-smooth((t-2.75)/.6)
        : Math.min(smooth(t/.25), smooth((duration-t)/.45));
      const result = rotation
        ? new Quaternion().fromArray(first).slerp(new Quaternion().fromArray(pose), w).toArray()
        : first.map((v, c) => v + (pose[c]-v)*w);
      data.set(result, i * width);
    });
    for (const [clip, inputId, outputData] of [
      [work, workTimes, data], [idle, idleTimes, new Float32Array([...first, ...first])],
    ]) {
      const index = clip.samplers.length;
      clip.samplers.push({ input: inputId, output: add(outputData, rotation ? "VEC4" : "VEC3", 5126), interpolation: "LINEAR" });
      clip.channels.push({ sampler: index, target: { ...channel.target } });
    }
  }
  runtime.animations = [idle, work, ...runtime.animations.filter(a => ["Walking","Running"].includes(a.name))];
  let contactBake;
  if (contactLoop) {
    // Finish the captured performance at a fixed pan handle. The wrists keep
    // their captured, bounded LOCAL rotation; the two-bone correction changes
    // only the upper arm and forearm, using the captured elbow side.
    const asset = { doc: runtime, bin: Buffer.concat(newBlocks) };
    const objects = new Map();
    scene.traverse(o => objects.set(canonical(o.name), o));
    const upper = bone("LeftArm"), fore = bone("LeftForeArm"), hand = bone("LeftHand");
    const palm = bone("LeftHandMiddle1").position.clone().multiplyScalar(.45)
      .addScaledVector(bone("LeftHandThumb1").position, .1);
    const target = new Vector3(.18, .957, .16);
    contactBake = { target_grip_m: target.toArray(), max_palm_error_m: 0, max_capture_correction_m: 0 };
    const worldPosition = o => o.getWorldPosition(new Vector3());
    const pointBone = (o, from, to) => {
      const delta = new Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
      const desired = delta.multiply(o.getWorldQuaternion(new Quaternion()));
      o.quaternion.copy(o.parent.getWorldQuaternion(new Quaternion()).invert().multiply(desired)).normalize();
      o.updateWorldMatrix(false, true);
    };
    for (const clip of [idle, work]) {
      const clipTimes = values(asset, clip.samplers[0].input);
      const tracks = clip.channels.flatMap(ch => {
        const nodeName = canonical(runtime.nodes[ch.target.node].name ?? "");
        const object = objects.get(nodeName);
        if (!object && ch.target.node === apronNode) return [];
        if (!object) throw new Error(`Contact bake target missing: ${nodeName}`);
        const s = clip.samplers[ch.sampler];
        const Track = ch.target.path === "rotation" ? QuaternionKeyframeTrack : VectorKeyframeTrack;
        return [{ object, path: ch.target.path, sampler: new Track("pose",
          values(asset, s.input), values(asset, s.output)).createInterpolant() }];
      });
      const rotations = new Map([upper, fore].map(o => [o, new Float32Array(clipTimes.length*4)]));
      skeleton.pose();
      clipTimes.forEach((t, frame) => {
        // Assign every channel explicitly: mixer cache must not skip a
        // constant source value after the previous frame's contact correction.
        for (const tr of tracks) {
          const value = tr.sampler.evaluate(t);
          if (tr.path === "rotation") tr.object.quaternion.fromArray(value);
          else if (tr.path === "translation") tr.object.position.fromArray(value);
          else if (tr.path === "scale") tr.object.scale.fromArray(value);
          else throw new Error(`Unsupported contact channel ${tr.path}`);
        }
        scene.updateMatrixWorld(true);
        contactBake.max_capture_correction_m = Math.max(contactBake.max_capture_correction_m,
          hand.localToWorld(palm.clone()).distanceTo(target));
        const shoulder = worldPosition(upper), capturedElbow = worldPosition(fore);
        const a = shoulder.distanceTo(capturedElbow), b = capturedElbow.distanceTo(worldPosition(hand));
        for (let iteration = 0; iteration < 8; iteration++) {
          const wrist = target.clone().sub(palm.clone().applyQuaternion(hand.getWorldQuaternion(new Quaternion())));
          const direction = wrist.clone().sub(shoulder), d = direction.length();
          if (d > .98*(a+b) || d < Math.abs(a-b)+1e-5)
            throw new Error(`Pan handle unreachable in ${clip.name} t=${t}: ${d}/${a+b}`);
          direction.normalize();
          const pole = capturedElbow.clone().sub(shoulder);
          pole.addScaledVector(direction, -pole.dot(direction));
          if (pole.lengthSq() < 1e-10) throw new Error("Captured elbow pole degenerate");
          pole.normalize();
          const along = (a*a+d*d-b*b)/(2*d);
          const elbow = shoulder.clone().addScaledVector(direction, along)
            .addScaledVector(pole, Math.sqrt(Math.max(0,a*a-along*along)));
          pointBone(upper, worldPosition(fore).sub(shoulder), elbow.clone().sub(shoulder));
          const e = worldPosition(fore);
          pointBone(fore, worldPosition(hand).sub(e), wrist.clone().sub(e));
        }
        const error = hand.localToWorld(palm.clone()).distanceTo(target);
        contactBake.max_palm_error_m = Math.max(contactBake.max_palm_error_m, error);
        if (error > .001) throw new Error(`Contact did not converge: ${clip.name} t=${t}, error=${error}`);
        for (const [o, data] of rotations) data.set(o.quaternion.toArray(), frame*4);
      });
      for (const [o, data] of rotations) {
        const ch = clip.channels.find(ch => ch.target.path === "rotation"
          && canonical(runtime.nodes[ch.target.node].name ?? "") === canonical(o.name));
        if (!ch) throw new Error(`No rotation channel for ${o.name}`);
        clip.samplers[ch.sampler].output = add(data, "VEC4", 5126);
      }
    }
  }
  // Repack only referenced accessors/views. This drops rejected clips, old
  // weights and hidden head vertices instead of shipping orphaned buffers.
  const refs = new Set();
  for (const m of runtime.meshes) for (const pr of m.primitives) {
    Object.values(pr.attributes).forEach(a => refs.add(a));
    refs.add(pr.indices);
  }
  runtime.skins.forEach(s => refs.add(s.inverseBindMatrices));
  runtime.animations.forEach(a => a.samplers.forEach(s => { refs.add(s.input); refs.add(s.output); }));
  const accessorMap = new Map([...refs].map((old, i) => [old, i]));
  const accessors = [...refs].map(i => runtime.accessors[i]);
  const viewRefs = new Set(accessors.map(a => a.bufferView));
  runtime.images.forEach(i => viewRefs.add(i.bufferView));
  const viewMap = new Map([...viewRefs].map((old, i) => [old, i]));
  const beforePack = Buffer.concat(newBlocks), packed = [];
  let offset = 0;
  const views = [...viewRefs].map(i => {
    const old = runtime.bufferViews[i];
    const data = beforePack.subarray(old.byteOffset ?? 0, (old.byteOffset ?? 0) + old.byteLength);
    const pad = Buffer.alloc(Math.ceil(data.length / 4) * 4);
    data.copy(pad); packed.push(pad);
    const result = { ...old, byteOffset: offset };
    offset += pad.length;
    return result;
  });
  accessors.forEach(a => { a.bufferView = viewMap.get(a.bufferView); });
  runtime.images.forEach(i => { i.bufferView = viewMap.get(i.bufferView); });
  for (const m of runtime.meshes) for (const pr of m.primitives) {
    for (const k of Object.keys(pr.attributes)) pr.attributes[k] = accessorMap.get(pr.attributes[k]);
    pr.indices = accessorMap.get(pr.indices);
  }
  runtime.skins.forEach(s => { s.inverseBindMatrices = accessorMap.get(s.inverseBindMatrices); });
  runtime.animations.forEach(a => a.samplers.forEach(s => {
    s.input = accessorMap.get(s.input); s.output = accessorMap.get(s.output);
  }));
  runtime.accessors = accessors; runtime.bufferViews = views; runtime.buffers[0].byteLength = offset;
  const bytes = glbBytes(runtime, Buffer.concat(packed));
  const outputName = contactLoop ? "runtime-contact" : contactGrip ? "runtime-grip" : "runtime";
  writeFileSync(join(dir, `${outputName}.glb`), bytes);
  writeFileSync(join(dir, `${outputName}-manifest.json`), JSON.stringify({
    source_sha256: sha(out), sha256: sha(bytes), bytes: bytes.length, vertices: used.length, triangles: kept.length/3,
    clips: runtime.animations.map(a => a.name), portrait_socket_bind_m: [0,1.58,.02],
    head_replacement_plane_y_m: 1.615, loop_blend_in_s: .25, loop_blend_out_s: .45,
    ...(contactGrip ? { wrist_swing_relative_bind_max_deg: 15, wrist_twist_relative_bind_max_deg: 85 } : {}),
    ...(contactLoop ? {
      source_fraction_range: [.2, .5], work_duration_s: 4,
      sear_hold_until_s: .45, source_motion_ends_s: 2.75, return_ends_s: 3.35,
      left_hand_contact: contactBake,
    } : {}),
    status: "requires_runtime_and_contact_review",
  }, null, 2) + "\n");
  console.log(`Wrote ${outputName}.glb: ${bytes.length} bytes, ${kept.length/3} triangles.`);
}
