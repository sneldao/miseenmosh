// Probe: distance from candidate verts to leg-bone segments, to separate
// hanging apron cloth from trouser-hugging surface. Prints a histogram.
import { readFileSync } from "node:fs";
import { Vector3 } from "three";
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
  return GLTFLoader.prototype.parseAsync
    ? null : null, new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "");
}

for (const who of ["dimitri", "anwar"]) {
  const { scene } = await load(`assets/meshy/${who}-pilot/rigged-${who}.glb`);
  let mesh; scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
  const sk = mesh.skeleton; sk.pose(); scene.updateMatrixWorld(true); sk.update();
  const canon = s => s.replaceAll(":", "");
  const bone = n => sk.bones.find(b => canon(b.name) === `mixamorig${n}`);
  const legSegs = [["LeftUpLeg", "LeftLeg"], ["RightUpLeg", "RightLeg"]]
    .map(([a, c]) => [bone(a).getWorldPosition(new Vector3()), bone(c).getWorldPosition(new Vector3())]);
  const pos = mesh.geometry.attributes.position;
  const ji = mesh.geometry.attributes.skinIndex, we = mesh.geometry.attributes.skinWeight;
  const legIdx = new Set(); sk.bones.forEach((b, i) => { if (/(Left|Right)(UpLeg|Leg|Foot|Toe)/.test(b.name)) legIdx.add(i); });
  const hist = {}; const cand = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    if (y < 0.35 || y > 1.2 || z < 0.0) continue;
    let tw = 0;
    for (const c of ["getX","getY","getZ","getW"]) {
      const jj = ji[c](i), ww = we[c](i);
      if (legIdx.has(jj)) tw += ww;
    }
    if (tw < 0.2) continue;
    const p = mesh.getVertexPosition(i, new Vector3());
    let dmin = 1e9;
    for (const [a, bp] of legSegs) {
      const ab = bp.clone().sub(a);
      const tt = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
      dmin = Math.min(dmin, p.clone().sub(a.clone().add(ab.multiplyScalar(tt))).length());
    }
    const bucket = Math.round(dmin * 50) / 50;
    hist[bucket] = (hist[bucket] || 0) + 1;
    if (dmin > 0.085) cand.push(i);
  }
  console.log(who, "hist:", JSON.stringify(hist), "cand>0.085:", cand.length);
}
