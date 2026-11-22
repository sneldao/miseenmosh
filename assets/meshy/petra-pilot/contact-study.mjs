// Lead-owned contact measurements. Does not modify any model or motion.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AnimationMixer, LoopOnce, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const dir = dirname(fileURLToPath(import.meta.url));
const variant = process.argv.includes("--hold") ? "runtime-hold" : process.argv.includes("--contact") ? "runtime-contact"
  : process.argv.includes("--grip") ? "runtime-grip" : "runtime";
const bytes = readFileSync(join(dir, `${variant}.glb`));
const chunks = new Map();
for (let p = 12; p < bytes.length;) {
  const length = bytes.readUInt32LE(p);
  chunks.set(bytes.readUInt32LE(p + 4), bytes.subarray(p + 8, p + 8 + length));
  p += 8 + length;
}
const doc = JSON.parse(chunks.get(0x4e4f534a));
const bin = chunks.get(0x004e4942);
doc.materials = [{}]; doc.images = []; doc.textures = [];
for (const mesh of doc.meshes) for (const primitive of mesh.primitives) primitive.material = 0;
const text = Buffer.from(JSON.stringify(doc));
const json = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
text.copy(json);
const header = Buffer.alloc(20), bh = Buffer.alloc(8);
header.write("glTF"); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
const geometry = Buffer.concat([header, json, bh, bin]);
const { scene, animations } = await new GLTFLoader().parseAsync(
  geometry.buffer.slice(geometry.byteOffset, geometry.byteOffset + geometry.byteLength), "",
);
const bones = new Map();
scene.traverse(n => { if (n.isBone) bones.set(n.name.replaceAll(":", ""), n); });
const bone = name => {
  const b = bones.get(`mixamorig${name}`);
  if (!b) throw new Error(`Missing bone ${name}`);
  return b;
};
const clip = animations.find(c => c.name === "PetraWork");
const mixer = new AnimationMixer(scene);
const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
action.clampWhenFinished = true;
const grips = {};
for (const side of ["Left", "Right"]) {
  const hand = bone(`${side}Hand`), middle = bone(`${side}HandMiddle1`), thumb = bone(`${side}HandThumb1`);
  if (middle.parent !== hand || thumb.parent !== hand) throw new Error("Unexpected finger hierarchy");
  grips[side] = variant === "runtime-hold"
    ? hand.getObjectByName(`${side}GripSurface`).position.clone()
    : middle.position.clone().multiplyScalar(.45).addScaledVector(thumb.position, .1);
}
const report = {
  source_sha256: createHash("sha256").update(bytes).digest("hex"),
  clip: clip.name, duration_s: clip.duration,
  grip_definition: variant === "runtime-hold" ? "Embedded GripSurface nodes, in Hand space"
    : ".45*Middle1.localPosition + .1*Thumb1.localPosition, in Hand space",
  grip_local_m: Object.fromEntries(Object.entries(grips).map(([k,v]) => [k,v.toArray()])),
  bind_hands: {},
  frames: [],
};
scene.traverse(n => { if (n.isSkinnedMesh) n.skeleton.pose(); });
scene.updateMatrixWorld(true);
for (const side of ["Left", "Right"]) {
  const hand = bone(`${side}Hand`);
  const hp = hand.getWorldPosition(new Vector3());
  const fore = hp.clone().sub(bone(`${side}ForeArm`).getWorldPosition(new Vector3())).normalize();
  const palm = bone(`${side}HandMiddle1`).getWorldPosition(new Vector3()).sub(hp).normalize();
  report.bind_hands[side] = {
    local_q: hand.quaternion.toArray(),
    forearm_palm_axis_angle_deg: Math.acos(Math.max(-1, Math.min(1, fore.dot(palm)))) * 180 / Math.PI,
  };
}
const dense = process.argv.includes("--dense");
const steps = dense ? 240 : 60;
for (let i = 0; i <= steps; i++) {
  const fraction = i / steps, time = fraction * clip.duration;
  action.reset().play(); mixer.setTime(time); scene.updateMatrixWorld(true);
  const frame = { fraction, time_s: time, hands: {} };
  if (variant === "runtime-hold") {
    const socket = scene.getObjectByName("RightToolSocket");
    frame.tool = { p: socket.getWorldPosition(new Vector3()).toArray(), q: socket.getWorldQuaternion(new Quaternion()).toArray() };
  }
  for (const side of ["Left", "Right"]) {
    const hand = bone(`${side}Hand`);
    const joint = {};
    for (const suffix of ["Arm", "ForeArm", "Hand", ...["Thumb","Index","Middle","Ring","Pinky"].flatMap(f =>
      [1,2,3,4].map(n => `Hand${f}${n}`))]) {
      const b = bone(`${side}${suffix}`);
      joint[suffix] = {
        p: b.getWorldPosition(new Vector3()).toArray(),
        q: b.getWorldQuaternion(new Quaternion()).toArray(),
        ...(suffix === "Hand" ? { local_q: b.quaternion.toArray() } : {}),
      };
    }
    const fore = new Vector3().fromArray(joint.Hand.p).sub(new Vector3().fromArray(joint.ForeArm.p)).normalize();
    const palm = new Vector3().fromArray(joint.HandMiddle1.p).sub(new Vector3().fromArray(joint.Hand.p)).normalize();
    frame.hands[side] = {
      grip: hand.localToWorld(grips[side].clone()).toArray(),
      forearm_palm_axis_angle_deg: Math.acos(Math.max(-1, Math.min(1, fore.dot(palm)))) * 180 / Math.PI,
      joints: joint,
    };
  }
  report.frames.push(frame);
}
const reportBase = variant === "runtime" ? "contact-study" : variant === "runtime-grip" ? "contact-study-grip"
  : variant === "runtime-hold" ? "contact-study-hold" : "contact-study-loop";
const reportName = `${reportBase}${dense ? "-dense" : ""}`;
writeFileSync(join(dir, `${reportName}.json`), JSON.stringify(report, null, 2) + "\n");
console.log("Grip offsets", report.grip_local_m);
console.log("Bind hands", report.bind_hands);
for (const frame of report.frames.filter((_, i) => i % (steps/5) === 0)) {
  console.log(frame.fraction, Object.fromEntries(Object.entries(frame.hands).map(([side,h]) =>
    [side, { grip: h.grip.map(x => +x.toFixed(4)), palmAxisAngle: +h.forearm_palm_axis_angle_deg.toFixed(1) }])));
}
