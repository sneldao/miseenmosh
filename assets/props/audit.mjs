// Independent Three.js import/geometry audit of the prepared equipment.
// Uses the real loader and compares indexed attributes with the licensed
// source after the declared normalization. No conversion code is imported.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix3, Matrix4, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const dir = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(dir, "preparation.json")));
const hash = b => createHash("sha256").update(b).digest("hex");
async function load(path) {
  const bytes = readFileSync(path), chunks = new Map();
  for (let p=12;p<bytes.length;) {
    const n=bytes.readUInt32LE(p);
    chunks.set(bytes.readUInt32LE(p+4),bytes.subarray(p+8,p+8+n));p+=8+n;
  }
  const doc=JSON.parse(chunks.get(0x4e4f534a)), bin=chunks.get(0x004e4942);
  const original=structuredClone(doc);
  doc.materials=doc.materials.map(m=>({name:m.name}));
  doc.images=[];doc.textures=[];delete doc.extensionsRequired;delete doc.extensionsUsed;
  const text=Buffer.from(JSON.stringify(doc)),j=Buffer.alloc(Math.ceil(text.length/4)*4,32);
  text.copy(j);
  const h=Buffer.alloc(20), bh=Buffer.alloc(8);
  h.write("glTF");h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+bin.length,8);
  h.writeUInt32LE(j.length,12);h.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  const data=Buffer.concat([h,j,bh,bin]);
  const gltf=await new GLTFLoader().parseAsync(
    data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),"");
  gltf.scene.updateMatrixWorld(true);
  const primitives=[];
  gltf.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    let node=mesh, association;
    while(node && (association=gltf.parser.associations.get(node))?.nodes===undefined)node=node.parent;
    if(!node)throw new Error("Missing node association");
    const raw=original.nodes[association.nodes];
    primitives.push({mesh,name:raw.name,parts:raw.extras?.parts,material:mesh.material.name});
  });
  return {gltf,doc:original,bytes,primitives};
}
function indexed(p, transform) {
  const g=p.mesh.geometry, world=transform.clone().multiply(p.mesh.matrixWorld);
  const normal=new Matrix3().getNormalMatrix(world), result=[];
  for(let i=0;i<g.index.count;i++) {
    const v=g.index.getX(i),uv=g.attributes.uv;
    const pos=new Vector3().fromBufferAttribute(g.attributes.position,v).applyMatrix4(world);
    const n=new Vector3().fromBufferAttribute(g.attributes.normal,v).applyMatrix3(normal).normalize();
    result.push([...pos.toArray(),...n.toArray(),uv.getX(v),uv.getY(v)]);
  }
  return result;
}
const report={tolerance_m:3e-6,tolerance_normal_uv:3e-6,assets:{}};
for(const name of ["tongs","skillet","cooker"]) {
  const source=await load(join(dir,name,"source.glb"));
  const prepared=await load(join(dir,name,"prepared.glb"));
  if(hash(source.bytes)!==config[name].source_sha256)throw new Error("Source hash mismatch");
  const normalization=new Matrix4();
  if(name==="tongs") normalization.makeRotationY(config.tongs.root_rotation_y)
    .multiply(new Matrix4().makeTranslation(...config.tongs.grip_source.map(x=>-x)));
  if(name==="skillet")normalization.makeTranslation(...config.skillet.bowl_center_source.map(x=>-x));
  const result={source_sha256:hash(source.bytes),prepared_sha256:hash(prepared.bytes),
    triangles:0,draw_primitives:prepared.primitives.length,max_position_error:0,max_normal_error:0,max_uv_error:0};
  let matchedSourceTriangles=0;
  for(const p of prepared.primitives) {
    if(!p.parts)throw new Error(`${name}/${p.name}: missing semantic parts`);
    const src=source.primitives.filter(s=>p.parts.includes(s.name)&&s.material===p.material);
    const expected=src.flatMap(s=>indexed(s,normalization));
    const actual=indexed(p,new Matrix4());
    if(expected.length!==actual.length)throw new Error(`${name}/${p.name}: index count changed`);
    matchedSourceTriangles+=expected.length/3;result.triangles+=actual.length/3;
    actual.forEach((a,i)=>a.forEach((v,c)=>{
      const error=Math.abs(v-expected[i][c]);
      const key=c<3?"max_position_error":c<6?"max_normal_error":"max_uv_error";
      result[key]=Math.max(result[key],error);
      if(error>3e-6)throw new Error(`${name}/${p.name}/${p.material}: attribute ${c}, delta ${error}`);
    }));
  }
  const sourceTriangles=source.primitives.reduce((n,p)=>n+p.mesh.geometry.index.count/3,0);
  if(sourceTriangles!==matchedSourceTriangles)throw new Error(`${name}: lost/duplicated source triangles`);
  report.assets[name]=result;
}
writeFileSync(join(dir,"geometry-audit.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
