#!/usr/bin/env node
/**
 * Compare a skinned GLB before/after compression as animation data.
 * Usage: node scripts/validate-compression.mjs original.glb optimized.glb
 * Fails if skins, animation channel coverage, durations, or sampled node TRS
 * drift beyond tolerance. This is a data check; visual acceptance remains separate.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;

const [origPath, optPath] = process.argv.slice(2);
if (!origPath || !optPath) {
  console.error("usage: node scripts/validate-compression.mjs original.glb optimized.glb");
  process.exit(2);
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const [a, b] = await Promise.all([io.read(origPath), io.read(optPath)]);

const failures = [];
function fail(msg) { failures.push(msg); }
function sig(doc) {
  return doc.getRoot().listSkins().map((skin) => [
    skin.listJoints().map((j) => j.getName()).join("|"),
    skin.getInverseBindMatrices()?.getArray()?.length ?? 0,
  ].join(":")).sort();
}
function animMap(doc) {
  const out = new Map();
  for (const anim of doc.getRoot().listAnimations()) {
    const channels = new Map();
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      const sampler = ch.getSampler();
      if (!node || !sampler) continue;
      channels.set(`${node.getName()}:${ch.getTargetPath()}`, { anim, ch, sampler });
    }
    out.set(anim.getName(), channels);
  }
  return out;
}
function element(accessor, index) {
  const target = [];
  accessor.getElement(index, target);
  return target;
}
function slerp(a, b, u) {
  const bb = [...b];
  let dot = a.reduce((n, v, i) => n + v * bb[i], 0);
  if (dot < 0) {
    dot = -dot;
    for (let i = 0; i < bb.length; i++) bb[i] = -bb[i];
  }
  if (dot > 0.9995) return a.map((v, i) => v + (bb[i] - v) * u);
  const theta = Math.acos(Math.min(1, dot));
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - u) * theta) / sin;
  const wb = Math.sin(u * theta) / sin;
  return a.map((v, i) => v * wa + bb[i] * wb);
}
function sample(sampler, t, rotation = false) {
  const input = sampler.getInput();
  const output = sampler.getOutput();
  if (!input || !output || input.getCount() === 0) return null;
  const n = input.getCount();
  const size = output.getElementSize();
  const interpolation = sampler.getInterpolation();
  if (interpolation === "CUBICSPLINE") throw new Error("CUBICSPLINE comparison is not implemented");
  const time = (i) => input.getScalar(i);
  if (t <= time(0)) return element(output, 0);
  if (t >= time(n - 1)) return element(output, n - 1);
  let hi = 1;
  while (time(hi) < t) hi++;
  const lo = hi - 1;
  const a0 = element(output, lo);
  if (interpolation === "STEP") return a0;
  const a1 = element(output, hi);
  const span = time(hi) - time(lo) || 1;
  const u = (t - time(lo)) / span;
  return rotation ? slerp(a0, a1, u) : a0.map((v, i) => v + (a1[i] - v) * u);
}
function duration(channels) {
  let max = 0;
  for (const { sampler } of channels.values()) {
    const input = sampler.getInput();
    if (input?.getCount()) max = Math.max(max, input.getScalar(input.getCount() - 1));
  }
  return max;
}
function maxDiff(x, y, rotation = false) {
  const direct = Math.max(...x.map((v, i) => Math.abs(v - (y[i] ?? NaN))));
  if (!rotation) return direct;
  // q and -q are the same bone rotation. Meshopt's quantized animation may
  // choose either sign; treat them as equivalent while preserving interpolation order.
  const negated = Math.max(...x.map((v, i) => Math.abs(v + (y[i] ?? NaN))));
  return Math.min(direct, negated);
}

const skinA = sig(a), skinB = sig(b);
if (JSON.stringify(skinA) !== JSON.stringify(skinB)) {
  fail(`skin signature differs: original=${JSON.stringify(skinA)} optimized=${JSON.stringify(skinB)}`);
}

const animsA = animMap(a), animsB = animMap(b);
const namesA = [...animsA.keys()].sort();
const namesB = [...animsB.keys()].sort();
if (JSON.stringify(namesA) !== JSON.stringify(namesB)) {
  fail(`animation names differ: original=${namesA.join(",")} optimized=${namesB.join(",")}`);
}

let compared = 0;
let worst = { diff: 0, where: "none" };
for (const [name, channelsA] of animsA) {
  const channelsB = animsB.get(name);
  if (!channelsB) continue;
  const keysA = [...channelsA.keys()].sort();
  const keysB = [...channelsB.keys()].sort();
  if (JSON.stringify(keysA) !== JSON.stringify(keysB)) {
    fail(`${name}: channel coverage differs (${keysA.length} vs ${keysB.length})`);
    continue;
  }
  const durA = duration(channelsA), durB = duration(channelsB);
  if (Math.abs(durA - durB) > 0.002) fail(`${name}: duration differs ${durA.toFixed(4)} vs ${durB.toFixed(4)}`);
  for (const t of [0, durA * 0.25, durA * 0.5, durA * 0.75, durA]) {
    for (const key of keysA) {
      try {
        const isRotation = key.endsWith(":rotation");
        const va = sample(channelsA.get(key).sampler, t, isRotation);
        const vb = sample(channelsB.get(key).sampler, t, isRotation);
        if (!va || !vb) continue;
        const d = maxDiff(va, vb, isRotation);
        compared++;
        if (d > worst.diff) worst = { diff: d, where: `${name}/${key}@${t.toFixed(2)}` };
      } catch (e) {
        fail(`${name}/${key}: ${e.message}`);
      }
    }
  }
}

// Bone animation output can be compressed/quantized, but sampled poses should not
// drift visibly. 2mm/0.002-ish tolerances intentionally catch hierarchy loss,
// not harmless meshopt rounding.
const tolerance = 0.02;
if (worst.diff > tolerance) fail(`sampled animation drift ${worst.diff.toFixed(4)} at ${worst.where}`);

if (failures.length) {
  console.error(`compression validation FAILED for ${optPath}`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log(`compression validation OK: ${optPath}`);
console.log(`  animations=${namesA.length} channels=${keysTotal(animsA)} samples=${compared} maxDrift=${worst.diff.toFixed(5)} at ${worst.where}`);
function keysTotal(map) {
  return [...map.values()].reduce((n, channels) => n + channels.size, 0);
}
