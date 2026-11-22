// Lead-owned skin cross-sections, not a score or a pose modifier.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnimationMixer, DoubleSide, LoopOnce, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const dir = dirname(fileURLToPath(import.meta.url));
const bytes = readFileSync(join(dir, "runtime-contact.glb"));
const n = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20,20+n)), bin = bytes.subarray(28+n);
doc.materials = [{}]; doc.images = []; doc.textures = [];
const text = Buffer.from(JSON.stringify(doc));
const json = Buffer.alloc(Math.ceil(text.length/4)*4,32); text.copy(json);
const header = Buffer.alloc(20), bh = Buffer.alloc(8);
header.write("glTF"); header.writeUInt32LE(2,4);
header.writeUInt32LE(28+json.length+bin.length,8);
header.writeUInt32LE(json.length,12); header.writeUInt32LE(0x4e4f534a,16);
bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942,4);
const raw = Buffer.concat([header,json,bh,bin]);
const { scene, animations } = await new GLTFLoader().parseAsync(
  raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),"");
let mesh;
scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
mesh.material.side = DoubleSide;
const mixer = new AnimationMixer(scene);
const action = mixer.clipAction(animations.find(a => a.name === "PetraWork")).setLoop(LoopOnce,1);
action.clampWhenFinished = true;
const ray = new Raycaster();
ray.far = .30;
const report = { source_sha256: createHash("sha256").update(bytes).digest("hex"), frames: [] };
for (const t of [0,2.4]) {
  action.reset().play(); mixer.setTime(t);
  scene.updateMatrixWorld(true); mesh.skeleton.update();
  mesh.computeBoundingBox(); mesh.computeBoundingSphere();
  const frame = { t, hands: {} };
  for (const side of ["Left","Right"]) {
    const hand = mesh.skeleton.bones.find(b => b.name.replaceAll(":","") === `mixamorig${side}Hand`);
    const inv = hand.matrixWorld.clone().invert();
    const centreX = side === "Left" ? -.0053780645 : .0055071733;
    const sections = [];
    for (const dx of [-.01,0,.01]) for (const y of [.055,.065,.075,.085,.095,.105,.115,.125,.135,.145]) {
      const x = centreX+dx;
      ray.set(new Vector3(x,y,-.15).applyMatrix4(hand.matrixWorld),
        new Vector3(0,0,1).transformDirection(hand.matrixWorld));
      const zs = ray.intersectObject(mesh,false).map(h => h.point.applyMatrix4(inv).z).sort((a,b)=>a-b);
      const unique = zs.filter((v,i)=>i===0 || v-zs[i-1] > 1e-6);
      sections.push({ x, y, skin_crossings_z: unique });
      if (dx===0) console.log(t,side,y,unique.map(v=>+v.toFixed(5)));
    }
    frame.hands[side] = sections;
  }
  report.frames.push(frame);
}
writeFileSync(join(dir,"grip-surface-study.json"),JSON.stringify(report,null,2)+"\n");
