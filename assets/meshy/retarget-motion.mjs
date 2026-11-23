// Retarget a Meshy SMPLH text-to-motion FBX onto a cook's mixamorig rig.
// Both rigs rest in the same world-space T-pose (verified in rest-audit),
// so the transfer is a world-rotation delta per mapped bone:
//   tgtWorldQ(t) = srcWorldQ(t) * srcRestWorldQ^-1 * tgtRestWorldQ
// baked to local quaternions at 30fps; hips also get a scaled position
// track. Output: AnimationClip JSON the runtime plays on the cook mixer.
// Usage: node retarget-motion.mjs <cook.glb> <clip.fbx> <ClipName> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AnimationClip, AnimationMixer, Quaternion, Vector3,
  QuaternionKeyframeTrack, VectorKeyframeTrack,
} from "three";

globalThis.self = globalThis;
globalThis.document = { createElementNS: () => new Proxy({}, { get: () => () => {}, set: () => true }) };
globalThis.window = globalThis;

const [glbPath, fbxPath, clipName, outPath] = process.argv.slice(2);
if (!glbPath || !fbxPath || !clipName || !outPath)
  throw new Error("usage: retarget-motion.mjs <glb> <fbx> <ClipName> <out.json>");

const SIDE = (m, s) => ({
  [`mixamorig${m}Shoulder`]: `${s}_Collar`,
  [`mixamorig${m}Arm`]: `${s}_Shoulder`,
  [`mixamorig${m}ForeArm`]: `${s}_Elbow`,
  [`mixamorig${m}Hand`]: `${s}_Wrist`,
  [`mixamorig${m}UpLeg`]: `${s}_Hip`,
  [`mixamorig${m}Leg`]: `${s}_Knee`,
  [`mixamorig${m}Foot`]: `${s}_Ankle`,
  [`mixamorig${m}ToeBase`]: `${s}_Foot`,
  ...Object.fromEntries(["Index","Middle","Ring","Pinky","Thumb"].flatMap(f =>
    [1,2,3].map(n => [`mixamorig${m}Hand${f}${n}`, `${s}_${f}${n}`]))),
});
const NAMES = {
  mixamorigHips: "Pelvis",
  mixamorigSpine: "Spine1",
  mixamorigSpine1: "Spine2",
  mixamorigSpine2: "Spine3",
  mixamorigNeck: "Neck",
  mixamorigHead: "Head",
  ...SIDE("Left", "L"), ...SIDE("Right", "R"),
};

function stripGlb(path) {
  const buf = readFileSync(path);
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = body; else if (type === 0x004e4942) bin = body;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  const g = JSON.parse(new TextDecoder().decode(json));
  delete g.images; delete g.textures; delete g.samplers;
  for (const m of g.materials ?? []) { delete m.pbrMetallicRoughness; delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; }
  const j = new TextEncoder().encode(JSON.stringify(g));
  const jpad = new Uint8Array(j.length + ((4 - (j.length % 4)) % 4)); jpad.set(j); jpad.fill(0x20, j.length);
  const bpad = new Uint8Array(bin.length + ((4 - (bin.length % 4)) % 4)); bpad.set(bin);
  const out = new ArrayBuffer(12 + 8 + jpad.length + 8 + bpad.length);
  const dv = new DataView(out);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.byteLength, true);
  dv.setUint32(12, jpad.length, true); dv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out).set(jpad, 20);
  dv.setUint32(20 + jpad.length, bpad.length, true); dv.setUint32(24 + jpad.length, 0x004e4942, true);
  new Uint8Array(out).set(bpad, 28 + jpad.length);
  return out;
}

const FPS = 30;
const EPS = 1e-8;

const gltf = await new GLTFLoader().parseAsync(stripGlb(glbPath), "");
let skinned; gltf.scene.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
skinned.skeleton.pose();
gltf.scene.updateMatrixWorld(true);
const tgtBones = {};
gltf.scene.traverse(o => { if (o.isBone) tgtBones[o.name] = o; });

const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
const fbx = new FBXLoader().parse(readFileSync(fbxPath).buffer, "");
let fmesh; fbx.traverse(o => { if (o.isSkinnedMesh && !fmesh) fmesh = o; });
const srcBones = {};
fmesh.skeleton.bones.forEach(b => { srcBones[b.name] = b; });

// source rest world state: pose the animated skeleton, update from fbx root
fmesh.skeleton.pose();
fbx.updateMatrixWorld(true);
const srcRestQ = {}, srcRestP = {};
for (const n in srcBones) {
  srcRestQ[n] = srcBones[n].getWorldQuaternion(new Quaternion());
  srcRestP[n] = srcBones[n].getWorldPosition(new Vector3());
}
// target rest world + local state
const tgtRestQ = {}, tgtRestLocalQ = {}, tgtRestLocalP = {};
for (const n in tgtBones) {
  tgtRestQ[n] = tgtBones[n].getWorldQuaternion(new Quaternion());
  tgtRestLocalQ[n] = tgtBones[n].quaternion.clone();
  tgtRestLocalP[n] = tgtBones[n].position.clone();
}
const restHipWorld = tgtBones.mixamorigHips.getWorldPosition(new Vector3());

// drive the source clip on fmesh — PropertyBinding resolves bone names via
// fmesh.skeleton, so the exact instances in srcBones get animated.
const clip = fbx.animations[0];
const mixer = new AnimationMixer(fmesh);
const action = mixer.clipAction(clip);
action.play();
// The FBX bind pose has pelvis at y=-19 (broken offset) while the motion
// runs at ~93cm — bind position is unusable as a delta reference. Sample
// clip frame 0 as the positional origin instead, and scale by the ratio of
// standing hip heights.
mixer.setTime(0); fbx.updateMatrixWorld(true);
const srcPelvisFrame0 = srcBones.Pelvis.getWorldPosition(new Vector3());
const hipPosScale = restHipWorld.y / srcPelvisFrame0.y;

// world quat of a target bone's parent while we re-pose it frame by frame
const parentWorldQ = new Quaternion();
function tgtParentWorldQ(bone) {
  return bone.parent.getWorldQuaternion(parentWorldQ);
}

const frames = Math.floor(clip.duration * FPS) + 1;
const times = new Float32Array(frames);
const mapped = Object.entries(NAMES).filter(([t, s]) => tgtBones[t] && srcBones[s]);
const quatValues = new Map(mapped.map(([t]) => [t, new Float32Array(frames * 4)]));
const hipPos = new Float32Array(frames * 3);

// pose target to a per-frame computed pose top-down so parent world quats are current
const boneDepth = n => { let d = 0, b = tgtBones[n]; while (b.parent?.isBone) { d++; b = b.parent; } return d; };
const order = mapped.map(([t]) => t).sort((a, b) => boneDepth(a) - boneDepth(b));
const nameToSrc = Object.fromEntries(mapped);

const dq = new Quaternion(), wq = new Quaternion(), lq = new Quaternion(), pv = new Vector3();
for (let f = 0; f < frames; f++) {
  const t = Math.min(clip.duration, f / FPS);
  times[f] = t;
  mixer.setTime(t);
  fbx.updateMatrixWorld(true);
  // reset target to bind each frame so parent worlds are deterministic
  for (const n in tgtBones) { tgtBones[n].quaternion.copy(tgtRestLocalQ[n]); tgtBones[n].position.copy(tgtRestLocalP[n]); }
  gltf.scene.updateMatrixWorld(true);
  for (const tn of order) {
    const sn = nameToSrc[tn];
    const bone = tgtBones[tn];
    srcBones[sn].getWorldQuaternion(dq);                       // srcWorldQ(t)
    dq.multiply(srcRestQ[sn].clone().invert());                // world delta
    wq.copy(dq).multiply(tgtRestQ[tn]);                        // tgt world q
    bone.parent.getWorldQuaternion(lq).invert().multiply(wq);  // to local
    bone.quaternion.copy(lq);
    bone.updateMatrixWorld(true);
    lq.toArray(quatValues.get(tn), f * 4);
  }
  // hip translation: rest + scaled world delta of pelvis
  srcBones.Pelvis.getWorldPosition(pv).sub(srcPelvisFrame0).multiplyScalar(hipPosScale);
  const hp = tgtRestLocalP.mixamorigHips;
  hipPos[f * 3] = hp.x + pv.x; hipPos[f * 3 + 1] = hp.y + pv.y; hipPos[f * 3 + 2] = hp.z + pv.z;
}

const tracks = [];
for (const [tn] of mapped) tracks.push(new QuaternionKeyframeTrack(`${tn}.quaternion`, times, quatValues.get(tn)));
tracks.push(new VectorKeyframeTrack("mixamorigHips.position", times, hipPos));
const out = new AnimationClip(clipName, clip.duration, tracks);
writeFileSync(outPath, JSON.stringify(AnimationClip.toJSON(out)));
console.log(`${clipName}: ${clip.duration.toFixed(2)}s, ${frames} frames, ${tracks.length} tracks (${mapped.length} bones mapped) -> ${outPath}`);
