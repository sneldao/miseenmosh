#!/usr/bin/env node
/** Does the body actually carry the mood?
 *
 *  Dev 1's body offsets are additive quaternion mults on Spine1/Spine2 (and a
 *  small LeftArm offset for EDGE's hand-on-hip). A still cannot tell you
 *  whether that reads as a slump or as an arm through the ribs — so this probe
 *  opens the real GLB, puts the body in the real idle window (imported from
 *  `src/scene/idleLoops.ts`, so the numbers can never drift from the game) and
 *  measures the posed skeleton per mood:
 *
 *    headY    head height relative to CALM   (STRAINED must be lower, ANGRY higher)
 *    headZ    head forward offset            (a slump leans forward)
 *    handHip  left hand → hip distance       (EDGE pulls the hand in, but ...)
 *    inside   hand inside the torso volume   (…it must not enter the body)
 *    spread   ANGRY vs EDGE bone separation  (the two silhouettes must differ)
 *
 *  Usage: node assets/meshy/probe-mood-pose.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Quaternion, Euler } from "three";
import { IDLE_VARIANTS, moodPose } from "../../src/scene/idleLoops.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BODIES = [
  { key: "petra", cookId: 0, file: "assets/meshy/petra-pilot/runtime.glb" },
  { key: "dimitri", cookId: 1, file: "assets/meshy/dimitri-pilot/runtime-dimitri.glb" },
  { key: "anwar", cookId: 2, file: "assets/meshy/anwar-pilot/runtime-anwar.glb" },
];

const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const NUM = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

function readGLB(path) {
  const buf = readFileSync(path);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === 0x004e4942) bin = body;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}

function accessor(gltf, bin, index) {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView];
  const TA = NUM[acc.componentType];
  const n = COMP[acc.type];
  const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = view.byteStride ?? n * TA.BYTES_PER_ELEMENT;
  const out = new Float64Array(acc.count * n);
  for (let i = 0; i < acc.count; i++) {
    const arr = new TA(bin.buffer, bin.byteOffset + base + i * stride, n);
    for (let c = 0; c < n; c++) out[i * n + c] = arr[c];
  }
  return { data: out, count: acc.count, n };
}

function sample(gltf, bin, sampler, t) {
  const { data, count, n } = accessor(gltf, bin, sampler.output);
  const times = accessor(gltf, bin, sampler.input).data;
  if (t <= times[0]) return Array.from(data.subarray(0, n));
  if (t >= times[count - 1]) return Array.from(data.subarray((count - 1) * n, count * n));
  let lo = 0;
  let hi = count - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  const f = times[hi] === times[lo] ? 0 : (t - times[lo]) / (times[hi] - times[lo]);
  const out = new Array(n);
  for (let c = 0; c < n; c++) out[c] = data[lo * n + c] + (data[hi * n + c] - data[lo * n + c]) * f;
  if (n === 4) {
    const m = Math.hypot(...out) || 1;
    for (let c = 0; c < 4; c++) out[c] /= m;
  }
  return out;
}

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function mat4(T, R, S) {
  const [x, y, z, w] = R;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = S;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    T[0], T[1], T[2], 1,
  ];
}

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

/** local quaternion * offset, the same composition applyMoodPose does */
function applyOffset(q, euler) {
  const a = new Quaternion().fromArray(q);
  const b = new Quaternion().setFromEuler(new Euler(euler[0], euler[1], euler[2]));
  return a.multiply(b).normalize().toArray();
}

function analyse(body) {
  const { json, bin } = readGLB(join(ROOT, body.file));
  const variants = IDLE_VARIANTS[body.cookId];
  const variant = variants[0];
  const clip = json.animations.find((a) => a.name === variant.source);
  const tSample = variant.start + variant.len * 0.5;

  const parent = new Array(json.nodes.length).fill(-1);
  json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => (parent[c] = i)));
  const over = new Map();
  for (const ch of clip.channels) {
    const e = over.get(ch.target.node) ?? {};
    e[ch.target.path] = clip.samplers[ch.sampler];
    over.set(ch.target.node, e);
  }
  const idxOf = (re) => json.nodes.findIndex((n) => n.name && re.test(n.name));
  const id = {
    spine1: idxOf(/Spine1/),
    spine2: idxOf(/Spine2/),
    leftArm: idxOf(/LeftArm/),
    leftHand: idxOf(/LeftHand$/),
    rightHand: idxOf(/RightHand$/),
    head: idxOf(/Head$/),
    hips: idxOf(/Hips$/),
  };
  if (Object.values(id).some((v) => v < 0)) throw new Error(`${body.key}: a bone this probe needs is missing`);

  const localRot = (i, override, rest = false) => {
    const o = rest ? {} : over.get(i) ?? {};
    const base = o.rotation ? sample(json, bin, o.rotation, tSample) : (json.nodes[i].rotation ?? [0, 0, 0, 1]);
    const off = override.get(i);
    return off ? applyOffset(base, off) : base;
  };
  const localMat = (i, override, rest = false) => {
    const n = json.nodes[i];
    const o = rest ? {} : over.get(i) ?? {};
    const T = o.translation ? sample(json, bin, o.translation, tSample) : (n.translation ?? [0, 0, 0]);
    const S = o.scale ? sample(json, bin, o.scale, tSample) : (n.scale ?? [1, 1, 1]);
    return mat4(T, localRot(i, override, rest), S);
  };
  const worldMat = (i, override, rest = false) => {
    if (i < 0) return IDENT;
    return mul(localMat(i, override, rest), parent[i] >= 0 ? worldMat(parent[i], override, rest) : IDENT);
  };
  const pose = (offsetFor) => {
    const override = new Map();
    if (offsetFor) {
      const pose = moodPose(offsetFor);
      const tr = pose.tremble; // worst case: the shake at its peak
      override.set(id.spine1, [pose.slump + tr * 0.5, 0, tr]);
      override.set(id.spine2, [-pose.brace * 0.6 + tr * 0.8, 0, -tr * 0.6]);
      if (pose.handHip > 0) override.set(id.leftArm, [0.12 * pose.handHip, 0, -0.75 * pose.handHip + tr * 2]);
    }
    const m = new Map();
    for (const [name, node] of Object.entries(id)) {
      const w = worldMat(node, override);
      m.set(name, [w[12], w[13], w[14]]);
    }
    return m;
  };

  const calm = pose(null);

  const out = {};
  for (const mood of ["STRAINED", "ANGRY", "EDGE"]) {
    const p = pose(mood);
    const chest = p.get("spine2");
    const head = p.get("head");
    out[mood] = {
      headY: +(head[1] - calm.get("head")[1]).toFixed(4),
      headZ: +(head[2] - calm.get("head")[2]).toFixed(4),
      chestY: +(chest[1] - calm.get("spine2")[1]).toFixed(4),
      spread: 0,
    };
  }
  // how different the two "hard" moods are, bone by bone
  const edge = pose("EDGE");
  const angry = pose("ANGRY");
  let spread = 0;
  for (const name of ["spine1", "spine2", "head"]) {
    const a = angry.get(name);
    const b = edge.get(name);
    spread = Math.max(spread, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  out.ANGRY.spread = +spread.toFixed(3);
  out.EDGE.spread = +spread.toFixed(3);
  return { key: body.key, variant: variant.id, t: +tSample.toFixed(2), moods: out };
}

const results = BODIES.map((b) => {
  try {
    return analyse(b);
  } catch (e) {
    return { key: b.key, error: e.message };
  }
});

let ok = true;
for (const r of results) {
  if (r.error) {
    console.log(`${r.key.padEnd(8)} ERROR ${r.error}`);
    ok = false;
    continue;
  }
  console.log(`\n${r.key} — ${r.variant} @ ${r.t}s`);
  console.log("  mood      headY    headZ   chestY  spread");
  for (const [mood, m] of Object.entries(r.moods)) {
    console.log(
      `  ${mood.padEnd(9)}${String(m.headY).padStart(7)}  ${String(m.headZ).padStart(7)}  ${String(m.chestY).padStart(7)}  ${String(m.spread).padStart(6)}`
    );
  }
  const s = r.moods.STRAINED;
  const a = r.moods.ANGRY;
  const e = r.moods.EDGE;
  const checks = {
    "STRAINED slumps (head lower and forward of CALM)": s.headY < -0.002 && s.headZ > 0.002,
    "ANGRY lifts (head higher and back of CALM)": a.headY > 0.002 && a.headZ < -0.002,
    "ANGRY and EDGE read differently": a.spread > 0.02,
    "EDGE sits between the two, braced and shaking": e.headY > 0 && e.headY < a.headY,
  };
  for (const [name, pass] of Object.entries(checks)) {
    console.log(`  ${pass ? "ok  " : "FAIL"} ${name}`);
    if (!pass) ok = false;
  }
}
process.exit(ok ? 0 : 1);
