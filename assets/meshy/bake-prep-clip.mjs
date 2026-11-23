// Bake a retargeted AnimationClip JSON into a runtime GLB as a new
// animation. Appends Float32 time/value accessors to the BIN chunk and one
// animation block to the JSON — geometry, skins and existing clips untouched.
// Usage: node bake-prep-clip.mjs <runtime.glb> <clip.json> <ClipName>
import { readFileSync, writeFileSync } from "node:fs";

const [glbPath, clipPath, clipName] = process.argv.slice(2);
if (!glbPath || !clipPath || !clipName) throw new Error("usage: bake-prep-clip.mjs <glb> <clip.json> <ClipName>");

// GLB read
const buf = readFileSync(glbPath);
let off = 12, jsonBuf = null, bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  const body = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) jsonBuf = body; else if (type === 0x004e4942) bin = body;
  off += 8 + len + ((4 - (len % 4)) % 4);
}
const g = JSON.parse(new TextDecoder().decode(jsonBuf));
const clip = JSON.parse(readFileSync(clipPath, "utf8"));

// node lookup: runtime bone names are sanitized (mixamorig:Hips -> mixamorigHips)
const nodeBySanitized = new Map();
g.nodes.forEach((n, i) => { if (n.name) nodeBySanitized.set(n.name.replace(/[^a-zA-Z0-9_]/g, ""), i); });

const PATH = { quaternion: ["rotation", 4], vector: ["translation", 3] };
const parts = [bin];
let binLen = bin.length;
const accessors = [], bufferViews = [];
function pushAccessor(f32) {
  const pad = (4 - (binLen % 4)) % 4;
  if (pad) { parts.push(new Uint8Array(pad)); binLen += pad; }
  const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
  bufferViews.push({ buffer: 0, byteOffset: binLen, byteLength: bytes.byteLength, byteStride: undefined });
  parts.push(bytes); binLen += bytes.byteLength;
  const acc = { bufferView: bufferViews.length - 1, componentType: 5126, count: f32.length / (f32.length === undefined ? 1 : 1), type: "SCALAR" };
  accessors.push(acc);
  return accessors.length - 1;
}

const accBase = g.accessors.length, bvBase = g.bufferViews.length;

// first pass: build channels/samplers
const samplers = [], channels = [];
for (const t of clip.tracks) {
  const dot = t.name.lastIndexOf(".");
  const nodeName = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
  const node = nodeBySanitized.get(nodeName);
  const [path, comps] = PATH[t.type] ?? [];
  if (node === undefined || !path) { console.warn("skip", t.name); continue; }
  const times = new Float32Array(t.times);
  const values = new Float32Array(t.values);
  const ti = pushAccessor(times);
  accessors[ti].count = times.length; accessors[ti].type = "SCALAR";
  accessors[ti].min = [Math.min(...times)]; accessors[ti].max = [Math.max(...times)];
  const vi = pushAccessor(values);
  accessors[vi].count = values.length / comps; accessors[vi].type = comps === 4 ? "VEC4" : "VEC3";
  samplers.push({ input: accBase + ti, interpolation: "LINEAR", output: accBase + vi });
  channels.push({ sampler: samplers.length - 1, target: { node, path } });
}
if (!channels.length) throw new Error("no tracks mapped — wrong rig?");

for (const bv of bufferViews) { delete bv.byteStride; g.bufferViews.push(bv); }
for (const a of accessors) { a.bufferView += bvBase; g.accessors.push(a); }
g.animations = g.animations ?? [];
if (g.animations.some(a => a.name === clipName)) throw new Error(`clip ${clipName} already present`);
g.animations.push({ name: clipName, channels, samplers });
g.buffers[0].byteLength = binLen;

// GLB write
const j = new TextEncoder().encode(JSON.stringify(g));
const jpad = new Uint8Array(j.length + ((4 - (j.length % 4)) % 4)); jpad.set(j); jpad.fill(0x20, j.length);
const fullBin = Buffer.concat(parts.map(p => Buffer.from(p.buffer ?? p, p.byteOffset ?? 0, p.byteLength)));
const bpadLen = (4 - (fullBin.length % 4)) % 4;
const total = 12 + 8 + jpad.length + 8 + fullBin.length + bpadLen;
const out = Buffer.alloc(total);
out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
out.writeUInt32LE(jpad.length, 12); out.writeUInt32LE(0x4e4f534a, 16); out.set(jpad, 20);
out.writeUInt32LE(fullBin.length + bpadLen, 20 + jpad.length); out.writeUInt32LE(0x004e4942, 24 + jpad.length);
out.set(fullBin, 28 + jpad.length);
writeFileSync(glbPath, out);
console.log(`${clipName}: ${channels.length} channels into ${glbPath.split("/").pop()} (+${(total - buf.length) / 1024 | 0}KB, ${g.animations.map(a=>a.name).join("|")})`);
