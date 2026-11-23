// Inspect skeletons/clips: node inspect-motion.mjs <glb> [fbx]
import { readFileSync } from "node:fs";

function readGLB(path) {
  const buf = readFileSync(path);
  let off = 12, json = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) { json = JSON.parse(new TextDecoder().decode(buf.subarray(off + 8, off + 8 + len))); break; }
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return json;
}

const g = readGLB(process.argv[2]);
const joints = g.skins?.[0]?.joints?.map(j => g.nodes[j].name) ?? g.nodes.filter(n => n.name?.includes("mixamorig")).map(n => n.name);
console.log("GLB", process.argv[2].split("/").pop(), "joints:", joints.length);
console.log(joints.slice(0, 15).join(", "));
console.log("clips:", (g.animations ?? []).map(a => a.name).join(" | "));

if (process.argv[3]) {
  globalThis.self = globalThis;
  globalThis.document = { createElementNS: () => new Proxy({}, { get: () => () => {}, set: () => true }) };
  globalThis.window = globalThis;
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const fbx = new FBXLoader().parse(readFileSync(process.argv[3]).buffer, "");
  const f = new Set(); const all = [];
  fbx.traverse(o => { all.push(`${o.type}:${o.name}`); if (o.isBone) f.add(o.name); });
  console.log("FBX", process.argv[3].split("/").pop(), "bones:", f.size, "nodes:", all.length);
  console.log("bones:", [...f].slice(0, 15).join(", "));
  console.log("non-bone:", all.filter(x => !x.startsWith("Bone")).slice(0, 10).join(", "));
  console.log("clips:", (fbx.animations ?? []).map(a => `${a.name}(${a.duration.toFixed(1)}s,${a.tracks.length}t)`).join(" | "));
  console.log("tracks:", fbx.animations?.[0]?.tracks.slice(0, 4).map(t => t.name));
}
