// What does the SMPLH clip actually do? Pelvis track ranges + world trajectory.
globalThis.self = globalThis;
globalThis.document = { createElementNS: () => new Proxy({}, { get: () => () => {}, set: () => true }) };
globalThis.window = globalThis;
import { readFileSync } from "node:fs";
import { AnimationMixer, Vector3 } from "three";
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const fbx = new FBXLoader().parse(readFileSync(process.argv[2]).buffer, "");
const clip = fbx.animations[0];
console.log("clip:", clip.name, clip.duration.toFixed(2) + "s", clip.tracks.length + " tracks");
const pos = clip.tracks.find(t => t.name.endsWith(".position"));
console.log("pos track:", pos.name, pos.times.length, "keys");
const v = pos.values;
let mn = [9e9,9e9,9e9], mx = [-9e9,-9e9,-9e9];
for (let i = 0; i < v.length; i += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], v[i+c]); mx[c] = Math.max(mx[c], v[i+c]); }
console.log("pos range min:", mn.map(x=>x.toFixed(1)), "max:", mx.map(x=>x.toFixed(1)));

let pelvis, lwrist, rwrist;
fbx.traverse(o => { if (o.isBone) { if (o.name==="Pelvis") pelvis=o; if (o.name==="L_Wrist") lwrist=o; if (o.name==="R_Wrist") rwrist=o; }});
const mixer = new AnimationMixer(fbx);
mixer.clipAction(clip).play();
const p = new Vector3();
for (const t of [0, 1.5, 3, 4.5, 5.9]) {
  mixer.setTime(t); fbx.updateMatrixWorld(true);
  const wp = b => { b.getWorldPosition(p); return [p.x,p.y,p.z].map(x=>+x.toFixed(1)); };
  console.log(`t=${t.toFixed(1)} pelvis:${JSON.stringify(wp(pelvis))} Lwrist:${JSON.stringify(wp(lwrist))} Rwrist:${JSON.stringify(wp(rwrist))}`);
}
