// Compute bone-local tool socket matrices: at a reference Work frame, aim the
// tool's -Y (business end) at the station target, then express that desired
// world transform in the bone's local space.
import { readFileSync } from "node:fs";
import { AnimationMixer, Euler, Matrix4, Quaternion, Vector3 } from "three";
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
const canon = s => s.replaceAll(":", "");
function find(scene, suffix) {
  let out; scene.traverse(o => { if (canon(o.name ?? "").endsWith(suffix)) out = o; });
  return out;
}
function aimSocket(boneWorld, grip, targetDir, rollAxis = new Vector3(0, -1, 0)) {
  // desired world: tool root at grip, local -Y along targetDir
  const dir = targetDir.clone().normalize();
  const q = new Quaternion().setFromUnitVectors(rollAxis, dir);
  return new Matrix4().compose(grip, q, new Vector3(1, 1, 1));
}

// per-actor spec: refFrame (fraction of Work), bone, grip offset along hand
// fwd, aim target (world), and a bowl entry for anwar.
const SPECS = {
  dimitri: [
    { key: "spoon", bone: "RightHand", ref: 0.5, gripAlongFwd: 0.04, target: new Vector3(-0.19, 0.85, 0.33) },
  ],
  anwar: [
    { key: "whisk", bone: "RightHand", ref: 0.5, gripAlongFwd: 0.04, target: new Vector3(0.06, 0.88, 0.27) },
    { key: "bowl", bone: "LeftForeArm", ref: 0.5, place: new Vector3(0.06, 0.93, 0.28) },
  ],
};

for (const [who, specs] of Object.entries(SPECS)) {
  const { scene, animations } = await load(`assets/meshy/${who}-pilot/runtime-${who}.glb`);
  const clip = animations.find(a => a.name === "Work");
  const mixer = new AnimationMixer(scene);
  mixer.clipAction(clip).play();
  console.log(`=== ${who}`);
  for (const spec of specs) {
    mixer.setTime(spec.ref * clip.duration);
    scene.updateMatrixWorld(true);
    const bone = find(scene, spec.bone);
    const bw = bone.matrixWorld.clone();
    const bp = bone.getWorldPosition(new Vector3());
    let desired;
    if (spec.place) {
      desired = new Matrix4().makeTranslation(...spec.place.toArray());
    } else {
      const fwd = new Vector3(0, 0, 1).applyQuaternion(bone.getWorldQuaternion(new Quaternion()));
      const grip = bp.clone().add(fwd.clone().multiplyScalar(spec.gripAlongFwd));
      desired = aimSocket(bw, grip, spec.target.clone().sub(grip));
    }
    const local = bw.clone().invert().multiply(desired);
    const p = new Vector3(), q = new Quaternion(), s = new Vector3();
    local.decompose(p, q, s);
    const e = new Euler().setFromQuaternion(q);
    console.log(` ${spec.key} @${spec.bone}: pos ${p.toArray().map(v=>v.toFixed(3))} eul ${e.toArray().slice(0,3).map(v=>v.toFixed(3))}`);
  }
}
