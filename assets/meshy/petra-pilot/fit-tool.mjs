// Contact-space study; no model changes and no acceptance score.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix4, Quaternion, Vector3 } from "three";
const dir = dirname(fileURLToPath(import.meta.url));
const loop = process.argv.includes("--loop");
const study = JSON.parse(readFileSync(join(dir, loop ? "contact-study-loop.json" : "contact-study-grip.json")));
const v = a => new Vector3().fromArray(a);
const q = a => new Quaternion().fromArray(a);
const reference = study.frames[loop ? 0 : 12]; // Original source 20%: approach to the food.
const hand = reference.hands.Right;
const panGrip = new Vector3(.18, loop ? .957 : .947, .16);
const panYaw = Math.PI / 4;
const panGripOffset = new Vector3(.18852371335029602, .047, 0)
  .applyAxisAngle(new Vector3(0, 1, 0), panYaw);
const panCenter = panGrip.clone().sub(panGripOffset);
const pickup = panCenter.clone().add(new Vector3(-.07, .041, 0));
const tip = new Vector3(0, -.015, .26); // grip x=-.105, jaw contact x=.155.
const forward = pickup.clone().sub(v(hand.grip)).normalize();
const thumb = v(hand.joints.HandThumb4.p);
const fingers = v(hand.joints.HandIndex4.p).add(v(hand.joints.HandMiddle4.p)).multiplyScalar(.5);
const up = thumb.sub(fingers);
up.addScaledVector(forward, -up.dot(forward)).normalize();
const right = up.clone().cross(forward).normalize();
up.copy(forward).cross(right).normalize();
const basis = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, forward));
const tipAxis = new Quaternion().setFromUnitVectors(new Vector3(0,0,1), tip.clone().normalize());
const world = basis.multiply(tipAxis.invert());
const relative = loop
  ? q(JSON.parse(readFileSync(join(dir, "tool-fit-study.json"))).tongs_rotation_in_right_hand)
  : q(hand.joints.Hand.q).invert().multiply(world);
const report = {
  source_sha256: study.source_sha256,
  candidate_tongs_grip_source: [-.105,.024,0],
  candidate_jaw_contact_source: [.155,.009,0],
  hand_grip_local: study.grip_local_m,
  tongs_rotation_in_right_hand: relative.toArray(),
  calibration_phase: .2,
  pan: { grip: panGrip.toArray(), center: panCenter.toArray(), yaw: panYaw },
  pickup: pickup.toArray(),
  frames: study.frames.map(f => {
    const h = f.hands.Right;
    const worldQ = q(h.joints.Hand.q).multiply(relative);
    const p = tip.clone().applyQuaternion(worldQ).add(v(h.grip));
    return {
      phase: f.fraction,
      tip: p.toArray(),
      radial_distance_from_pan: Math.hypot(p.x-panCenter.x, p.z-panCenter.z),
      tip_height_over_pan_base: p.y-panCenter.y,
      left_grip_correction: panGrip.clone().sub(v(f.hands.Left.grip)).toArray(),
      left_grip_correction_length: panGrip.distanceTo(v(f.hands.Left.grip)),
      tool_world_q: worldQ.toArray(),
    };
  }),
};
writeFileSync(join(dir, loop ? "tool-fit-loop.json" : "tool-fit-study.json"), JSON.stringify(report, null, 2) + "\n");
console.log("Pan",report.pan,"relative tool rotation",report.tongs_rotation_in_right_hand);
for (const f of report.frames.filter((_,i)=>i%((study.frames.length-1)/10)===0)) console.log(
  f.phase, f.tip.map(n=>+n.toFixed(4)), "pan radius",+f.radial_distance_from_pan.toFixed(3),
  "height",+f.tip_height_over_pan_base.toFixed(3),"left correction",+f.left_grip_correction_length.toFixed(3));
