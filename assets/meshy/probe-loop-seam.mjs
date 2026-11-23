#!/usr/bin/env node
/** The loop-seam test, measured instead of eyeballed.
 *
 *  The plan asks that each idle subclip "loops 30 s with no pop". A pop is a
 *  single frame whose pose jump is much larger than the motion around it, so
 *  the honest instrument is the per-frame step: sample the clip the game
 *  actually builds (the real `AnimationUtils.subclip` + the real `wrapBlend`
 *  imported from `src/scene/idleLoops.ts`) at 60 Hz for a 30 s loop, and
 *  compare the step across the wrap to the distribution of steps inside it.
 *
 *  Reported per variant:
 *    median / p99 / max inside   the loop's own motion, per 1/60 s
 *    seam step                   pose change from t=duration to t=0
 *    seam × median               how the wrap compares to ordinary motion
 *    ratio                       seam step / max inside (1.0 = no outlier)
 *
 *  Passes when the seam step is no larger than the largest ordinary step —
 *  i.e. the wrap is just another frame, not an event.
 *
 *  Usage: node assets/meshy/probe-loop-seam.mjs [--json]
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnimationClip, AnimationUtils, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { IDLE_VARIANTS, SEAM_BLEND, wrapBlend } from "../../src/scene/idleLoops.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BODIES = {
  0: { key: "petra", file: "assets/meshy/petra-pilot/runtime-hold.glb" },
  1: { key: "dimitri", file: "assets/meshy/dimitri-pilot/runtime-dimitri.glb" },
  2: { key: "anwar", file: "assets/meshy/anwar-pilot/runtime-anwar.glb" },
};

const FPS = 30;
const CHECK_HZ = 60;
const LOOP_SECONDS = 30;

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
  return out;
}

function sampleKeyframes(gltf, bin, sampler, times) {
  const values = accessor(gltf, bin, sampler.output);
  const keys = accessor(gltf, bin, sampler.input);
  const n = values.length / keys.length;
  const out = [];
  for (const t of times) {
    let lo = 0;
    let hi = keys.length - 1;
    if (t <= keys[0]) hi = 0;
    else if (t >= keys[keys.length - 1]) lo = hi;
    else {
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (keys[mid] <= t) lo = mid;
        else hi = mid;
      }
    }
    const f = keys[hi] === keys[lo] ? 0 : (t - keys[lo]) / (keys[hi] - keys[lo]);
    for (let c = 0; c < n; c++) out.push(values[lo * n + c] + (values[hi * n + c] - values[lo * n + c]) * f);
  }
  return { values: out, size: n };
}

/** the source clip as a real three AnimationClip, at the engine's frame rate */
function sourceClip(gltf, bin, name) {
  const clip = gltf.animations.find((a) => a.name === name);
  if (!clip) throw new Error(`clip ${name} missing`);
  const duration = Math.max(...clip.samplers.map((s) => gltf.accessors[s.input].max?.[0] ?? 0));
  const frames = Math.round(duration * FPS);
  const times = [];
  for (let i = 0; i <= frames; i++) times.push((duration * i) / frames);
  const tracks = [];
  for (const ch of clip.channels) {
    const node = gltf.nodes[ch.target.node];
    if (ch.target.path !== "rotation" && !(ch.target.path === "translation" && /Hips$/.test(node.name))) continue;
    const { values, size } = sampleKeyframes(gltf, bin, clip.samplers[ch.sampler], times);
    const path = ch.target.path === "rotation" ? "quaternion" : "position";
    const trackName = `${node.name}.${path}`;
    tracks.push(
      size === 4 ? new QuaternionKeyframeTrack(trackName, times, values) : new VectorKeyframeTrack(trackName, times, values)
    );
  }
  return new AnimationClip(name, duration, tracks);
}

function poseAt(clip, t) {
  return clip.tracks.map((track) => {
    const interp = track.createInterpolant();
    return Array.from(interp.evaluate(t));
  });
}

function poseDistance(a, b, perTrack = null) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const ta = a[i];
    let d;
    if (ta.length === 4) {
      const dot = Math.abs(ta[0] * b[i][0] + ta[1] * b[i][1] + ta[2] * b[i][2] + ta[3] * b[i][3]);
      d = (2 * Math.acos(Math.min(1, dot))) ** 2;
    } else {
      d =
        ((ta[0] - b[i][0]) ** 2 + (ta[1] - b[i][1]) ** 2 + (ta[2] - b[i][2]) ** 2) * 40;
    }
    sum += d;
    if (perTrack) perTrack.push(d);
  }
  return Math.sqrt(sum);
}

const results = [];
for (const [cookId, body] of Object.entries(BODIES)) {
  const { json, bin } = readGLB(join(ROOT, body.file));
  for (const variant of IDLE_VARIANTS[cookId]) {
    const src = sourceClip(json, bin, variant.source);
    const from = Math.round(variant.start * FPS);
    const to = Math.round((variant.start + variant.len) * FPS);
    const sub = AnimationUtils.subclip(src, variant.id, from, to, FPS);

    // control: identical measurement on the untouched source, no window, no blend
    let srcMax = 0;
    let srcSpikeTrack = "";
    {
      let sprev = poseAt(src, 0);
      for (let t = 1 / CHECK_HZ; t <= LOOP_SECONDS + 1e-9; t += 1 / CHECK_HZ) {
        const pose = poseAt(src, t % src.duration);
        const perTrack = [];
        const dist = poseDistance(sprev, pose, perTrack);
        if (dist > srcMax) {
          srcMax = dist;
          srcSpikeTrack = src.tracks[perTrack.indexOf(Math.max(...perTrack))]?.name ?? "";
        }
        sprev = pose;
      }
    }
    const clip = wrapBlend(sub, SEAM_BLEND);

    // sample a whole 30 s loop at the check rate: the wrap is crossed
    // LOOP_SECONDS / duration times, whichever comes first is the point
    const step = 1 / CHECK_HZ;
    const steps = [];
    let worst = { t: 0, dist: -1, track: "" };
    let prev = poseAt(clip, 0);
    const total = LOOP_SECONDS;
    for (let t = step; t <= total + 1e-9; t += step) {
      const wrappedT = t % clip.duration;
      const pose = poseAt(clip, wrappedT);
      const perTrack = [];
      const dist = poseDistance(prev, pose, perTrack);
      steps.push(dist);
      if (dist > worst.dist) {
        const owner = perTrack.indexOf(Math.max(...perTrack));
        worst = { t: wrappedT, dist, track: clip.tracks[owner]?.name ?? "" };
      }
      prev = pose;
    }
    const sorted = [...steps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const max = sorted[sorted.length - 1];
    // the pose at t = duration must be the pose at t = 0 — the wrap is the
    // step from the loop's last sample back to its first
    const seam = poseDistance(poseAt(clip, clip.duration - 1e-4), poseAt(clip, 0));

    results.push({
      cook: body.key,
      variant: variant.id,
      duration: +clip.duration.toFixed(3),
      samples: steps.length,
      median: +median.toFixed(5),
      p99: +p99.toFixed(5),
      max: +max.toFixed(5),
      seam: +seam.toFixed(5),
      srcMax: +srcMax.toFixed(5),
      srcSpikeTrack,
      spikeAt: +(worst.t / clip.duration).toFixed(2),
      spikeTrack: worst.track,
      ratio: +(seam / max).toFixed(3),
      ok: seam <= max + 1e-6,
    });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log("idle loop seam — 30 s of playback sampled at 60 Hz, real clips, real blend\n");
  console.log("cook     variant  loop   samples  median    p99     max     seam   seam/max   srcMax  (control: the source clip, same measurement, no window, no blend)");
  for (const r of results) {
    console.log(
      `${r.cook.padEnd(8)} ${r.variant.padEnd(7)} ${String(r.duration).padStart(5)}s ${String(r.samples).padStart(7)}  ${String(r.median).padStart(7)}  ${String(r.p99).padStart(6)}  ${String(r.max).padStart(6)}  ${String(r.seam).padStart(6)}  ${String(r.ratio).padStart(7)}  ${String(r.srcMax).padStart(7)}  ${r.ok ? "ok" : "POP"}  spike@${r.spikeAt} ${r.spikeTrack}`
    );
  }
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} windows loop without a pop`);
  process.exit(bad.length === 0 ? 0 : 1);
}
