// Probe: hand/head bone world positions through the Work clip, to place
// station props and hand-tool sockets for the brigade pilots.
import { readFileSync } from "node:fs";
import { AnimationMixer, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

async function load(path) {
  const b = readFileSync(path);
  const n = b.readUInt32LE(12);
  const doc = JSON.parse(b.subarray(20, 20 + n).toString());
  const bin = b.subarray(28 + n);
  doc.materials = [{}]; doc.images = []; doc.textures = [];
  const t = Buffer.from(JSON.stringify(doc));
  const j = Buffer.alloc(Math.ceil(t.length / 4) * 4, 32); t.copy(j);
  const h = Buffer.alloc(20);
  h.write("glTF"); h.writeUInt32LE(2, 4); h.writeUInt32LE(28 + j.length + bin.length, 8);
  h.writeUInt32LE(j.length, 12); h.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([h, j, bh, bin]);
  return new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "");
}

for (const who of ["dimitri", "anwar"]) {
  const { scene, animations } = await load(`assets/meshy/${who}-pilot/runtime-${who}.glb`);
  const canon = s => s.replaceAll(":", "");
  let handR, handL, head;
  scene.traverse(o => {
    const n = canon(o.name ?? "");
    if (n === "mixamorigRightHand") handR = o;
    if (n === "mixamorigLeftHand") handL = o;
    if (n === "mixamorigHead") head = o;
  });
  const clip = animations.find(a => a.name === "Work");
  const mixer = new AnimationMixer(scene);
  const act = mixer.clipAction(clip); act.play();
  console.log(`=== ${who} (dur ${clip.duration.toFixed(2)})`);
  for (const f of [0, .15, .3, .5, .7, .85, 1]) {
    mixer.setTime(f * clip.duration);
    scene.updateMatrixWorld(true);
    const r = handR.getWorldPosition(new Vector3());
    const l = handL.getWorldPosition(new Vector3());
    const rq = handR.getWorldQuaternion(new Quaternion());
    const fwd = new Vector3(0, 0, 1).applyQuaternion(rq);
    const hd = head.getWorldPosition(new Vector3());
    console.log(` t${f}: R ${r.toArray().map(v=>v.toFixed(2))} fwd ${fwd.toArray().map(v=>v.toFixed(2))} | L ${l.toArray().map(v=>v.toFixed(2))} | head ${hd.toArray().map(v=>v.toFixed(2))}`);
  }
}
