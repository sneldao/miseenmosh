#!/usr/bin/env node
/** Finds the neutral windows inside each pilot's Work clip that can be cut
 *  into a looping idle-prep subclip (Dev 1 lane, living-kitchen plan v4.1).
 *
 *  The pilot ships no idle clip, so the idle loop is a *neutral segment* of
 *  Work: a window whose pose repeats closely at the seam (so the loop does
 *  not pop), carries visible motion inside (so it does not read frozen),
 *  keeps the hands down over the pot/board (so prep never reads as the
 *  plating reach), and sits near the clip's mean pose (counter stance, not
 *  an extreme). Everything is measured off the shipped GLB, not eyeballed:
 *
 *    seam      pose distance between window start and window end (lower better)
 *    motion    mean per-frame pose change inside the window (higher = livelier)
 *    neutral   mean distance of the window's poses from the clip mean pose
 *    handY     mean right-hand world height (low = down at the board)
 *    handZ     mean right-hand world forward reach (low = not presenting)
 *    hipsX     hips travel range (high = walking/turning, not prep)
 *
 *  Score = motion / (1 + seam*SEAM_W + neutral*NEUTRAL_W + reach*REACH_W)
 *  with reach = max(0, handZ - HAND_Z_FREE) + hipsX.
 *
 *  Usage: node assets/meshy/probe-idle-windows.mjs [--json]
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const MODELS = [
  { key: "dimitri", file: "assets/meshy/dimitri-pilot/runtime-dimitri.glb", clip: "Work", maxLen: 1.6 },
  { key: "anwar", file: "assets/meshy/anwar-pilot/runtime-anwar.glb", clip: "Work", maxLen: 1.6 },
  { key: "petra", file: "assets/meshy/petra-pilot/runtime.glb", clip: "PetraWork", maxLen: 2.0 },
  { key: "commis", file: "assets/meshy/commis-pilot/runtime-commis.glb", clip: "Work", maxLen: 1.6 },
  { key: "porter", file: "assets/meshy/porter-pilot/runtime-porter.glb", clip: "Work", maxLen: 1.6 },
];

const SEAM_W = 6;
const NEUTRAL_W = 1.2;
const REACH_W = 8;
const HAND_Z_FREE = 0.28; // metres of forward hand reach that are still "at the board"
const WINDOW_SAMPLES = 16;

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const NUM = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

function readGLB(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a GLB`);
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
  return { data: out, count: acc.count, n, times: null };
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
  const t0 = times[lo];
  const t1 = times[hi];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  const a = data.subarray(lo * n, lo * n + n);
  const b = data.subarray(hi * n, hi * n + n);
  const out = new Array(n);
  for (let c = 0; c < n; c++) out[c] = a[c] + (b[c] - a[c]) * f;
  if (n === 4) {
    const m = Math.hypot(out[0], out[1], out[2], out[3]) || 1;
    for (let c = 0; c < 4; c++) out[c] /= m;
  }
  return out;
}

function qdist(a, b) {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
}

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

function mulMat4(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

/** Forward kinematics over the GLB node tree: where the hands and hips
 *  actually are at time t, so "hands over the pot" can be measured instead
 *  of hoped for. */
function makeFK(json, bin, clip) {
  const parent = new Array(json.nodes.length).fill(-1);
  json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => (parent[c] = i)));
  const over = new Map();
  for (const ch of clip.channels) {
    const e = over.get(ch.target.node) ?? {};
    e[ch.target.path] = clip.samplers[ch.sampler];
    over.set(ch.target.node, e);
  }
  const idxOf = (re) => json.nodes.findIndex((n) => n.name && re.test(n.name));
  const targets = { rightHand: idxOf(/RightHand$/), leftHand: idxOf(/LeftHand$/), hips: idxOf(/Hips$/), head: idxOf(/Head$/) };

  const localMat = (i, t) => {
    const n = json.nodes[i];
    const o = over.get(i) ?? {};
    const T = o.translation ? sample(json, bin, o.translation, t) : (n.translation ?? [0, 0, 0]);
    const R = o.rotation ? sample(json, bin, o.rotation, t) : (n.rotation ?? [0, 0, 0, 1]);
    const S = o.scale ? sample(json, bin, o.scale, t) : (n.scale ?? [1, 1, 1]);
    return mat4(T, R, S);
  };
  const worldMat = (i, t, cache) => {
    if (i < 0) return IDENT;
    if (cache.has(i)) return cache.get(i);
    const m = mulMat4(localMat(i, t), parent[i] >= 0 ? worldMat(parent[i], t, cache) : IDENT);
    cache.set(i, m);
    return m;
  };
  const posOf = (name, t) => {
    const i = targets[name];
    if (i < 0) return null;
    const m = worldMat(i, t, new Map());
    return [m[12], m[13], m[14]];
  };
  return { posOf, targets };
}

function analyse(model) {
  const { json, bin } = readGLB(join(ROOT, model.file));
  const clip = json.animations.find((a) => a.name === model.clip);
  if (!clip) throw new Error(`${model.file}: clip ${model.clip} missing`);

  const rotChannels = [];
  const posChannels = [];
  for (const ch of clip.channels) {
    const node = json.nodes[ch.target.node];
    if (ch.target.path === "rotation") rotChannels.push({ sampler: clip.samplers[ch.sampler] });
    else if (ch.target.path === "translation" && /Hips$/.test(node.name)) posChannels.push({ sampler: clip.samplers[ch.sampler] });
  }

  const duration = Math.max(
    ...clip.samplers.map((s) => {
      const acc = json.accessors[s.input];
      return acc.max ? acc.max[0] : 0;
    })
  );

  const poseAt = (t) => [
    ...rotChannels.map((c) => sample(json, bin, c.sampler, t)),
    ...posChannels.map((c) => sample(json, bin, c.sampler, t)),
  ];
  const dist = (a, b) => {
    let s = 0;
    let i = 0;
    for (let k = 0; k < rotChannels.length; k++, i++) s += qdist(a[i], b[i]) ** 2;
    for (let k = 0; k < posChannels.length; k++) {
      const pa = a[i + k];
      const pb = b[i + k];
      s += ((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2) * 40;
    }
    return Math.sqrt(s);
  };

  const STEPS = 60;
  const gridded = [];
  for (let i = 0; i <= STEPS; i++) gridded.push(poseAt((duration * i) / STEPS));
  const meanPose = gridded[0].map((_, k) => {
    const first = gridded[0][k];
    if (Array.isArray(first)) return first.map((__, c) => gridded.reduce((s, p) => s + p[k][c], 0) / gridded.length);
    return gridded.reduce((s, p) => s + p[k], 0) / gridded.length;
  });

  const fk = makeFK(json, bin, clip);

  // whole-clip reference numbers, for the "prep is calmer than plating" claim
  let wholeMotion = 0;
  let wholeReach = 0;
  for (let i = 1; i <= STEPS; i++) wholeMotion += dist(gridded[i - 1], gridded[i]);
  wholeMotion /= STEPS;
  for (let i = 0; i <= STEPS; i++) {
    const h = fk.posOf("rightHand", (duration * i) / STEPS);
    if (h) wholeReach = Math.max(wholeReach, h[2]);
  }

  const candidates = [];
  const lengths = [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0].filter((l) => l <= model.maxLen && duration >= l + 0.1);
  for (let start = 0; start + Math.min(...lengths) <= duration; start = +(start + 0.1).toFixed(2)) {
    for (const len of lengths) {
      const end = start + len;
      if (end > duration) continue;
      const seam = dist(poseAt(start), poseAt(end));
      let motion = 0;
      let neutral = 0;
      let handY = 0;
      let handZ = 0;
      let handZmax = -Infinity;
      let hipsMin = Infinity;
      let hipsMax = -Infinity;
      let prev = poseAt(start);
      let samples = 0;
      for (let i = 0; i <= WINDOW_SAMPLES; i++) {
        const t = start + (len * i) / WINDOW_SAMPLES;
        const p = poseAt(t);
        if (i > 0) {
          motion += dist(prev, p);
          prev = p;
        }
        neutral += dist(p, meanPose);
        const h = fk.posOf("rightHand", t);
        if (h) {
          handY += h[1];
          handZ += h[2];
          handZmax = Math.max(handZmax, h[2]);
        }
        const hp = fk.posOf("hips", t);
        if (hp) {
          hipsMin = Math.min(hipsMin, hp[0]);
          hipsMax = Math.max(hipsMax, hp[0]);
        }
        samples++;
      }
      motion /= WINDOW_SAMPLES;
      neutral /= samples;
      handY /= samples;
      handZ /= samples;
      const hipsX = hipsMax - hipsMin;
      const reach = Math.max(0, handZ - HAND_Z_FREE) + hipsX;
      const score = motion / (1 + seam * SEAM_W + neutral * NEUTRAL_W + reach * REACH_W);
      candidates.push({
        start: +start.toFixed(2),
        len,
        seam: +seam.toFixed(3),
        motion: +motion.toFixed(4),
        neutral: +neutral.toFixed(3),
        handY: +handY.toFixed(3),
        handZ: +handZ.toFixed(3),
        handZmax: +handZmax.toFixed(3),
        hipsX: +hipsX.toFixed(3),
        score: +score.toFixed(4),
      });
    }
  }
  // an idle window must never contain the work clip's presenting reach —
  // that reach is the plating read, and prep must stay visibly distinct
  const reachCap = wholeReach > 0.3 ? wholeReach - 0.1 : Infinity;
  candidates.sort((a, b) => b.score - a.score);
  const filtered = candidates.filter((c) => c.seam <= 0.8 && c.handZmax <= reachCap);
  const use = filtered.length >= 2 ? filtered : candidates;

  const picks = [];
  for (const c of use) {
    // variants are alternate loops, so they may overlap — but they must not
    // be the same beat twice (starts within 0.4 s read as one loop)
    if (picks.every((p) => Math.abs(c.start - p.start) >= 0.4)) picks.push(c);
    if (picks.length === 2) break;
  }

  return {
    key: model.key,
    clip: model.clip,
    duration: +duration.toFixed(2),
    whole: { motion: +wholeMotion.toFixed(4), reach: +wholeReach.toFixed(3) },
    picks,
    top: candidates.slice(0, 6),
    reachCap: +reachCap.toFixed(3),
    filteredOut: candidates.length - filtered.length,
    channels: { rot: rotChannels.length, hips: posChannels.length },
  };
}

const asJson = process.argv.includes("--json");
const results = MODELS.map((m) => {
  try {
    return analyse(m);
  } catch (e) {
    return { key: m.key, error: e.message };
  }
});

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) {
    if (r.error) {
      console.log(`${r.key.padEnd(8)} ERROR ${r.error}`);
      continue;
    }
    console.log(`\n${r.key} — ${r.clip} ${r.duration}s  (${r.channels.rot} rot, ${r.channels.hips} hips)  whole clip: motion ${r.whole.motion}, reach ${r.whole.reach}m`);
    console.log(`  reach cap ${r.reachCap}m (whole clip ${r.whole.reach}m), ${r.filteredOut} windows dropped`);
    console.log("  pick  start   len   seam   motion  neutral  handY  handZ  hZmax  hipsX");
    r.picks.forEach((p, i) => {
      console.log(
        `  #${i + 1}    ${String(p.start).padStart(5)}  ${String(p.len).padEnd(4)}  ${String(p.seam).padStart(5)}  ${String(p.motion).padStart(6)}  ${String(p.neutral).padStart(6)}  ${String(p.handY).padStart(5)}  ${String(p.handZ).padStart(5)}  ${String(p.handZmax).padStart(5)}  ${String(p.hipsX).padStart(5)}`
      );
    });
    console.log(`  others: ${r.top.map((p) => `${p.start}+${p.len}(s${p.seam} z${p.handZmax} ${p.score})`).join(", ")}`);
  }
}
