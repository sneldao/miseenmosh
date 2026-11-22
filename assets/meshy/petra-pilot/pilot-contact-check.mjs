// Lead-owned geometric checks. Samples are evidence, not visual acceptance.
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {AnimationMixer,LoopOnce,Quaternion,Vector3} from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
const dir=dirname(fileURLToPath(import.meta.url)),root=join(dir,"../../..");
const hashes={};
async function load(path) {
  const b=readFileSync(join(root,path));hashes[path]=createHash("sha256").update(b).digest("hex");
  const n=b.readUInt32LE(12),d=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  d.materials=d.materials.map(m=>({name:m.name}));d.images=[];d.textures=[];
  const s=Buffer.from(JSON.stringify(d)),j=Buffer.alloc(Math.ceil(s.length/4)*4,32);s.copy(j);
  const h=Buffer.alloc(20),bh=Buffer.alloc(8);
  h.write("glTF");h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+bin.length,8);
  h.writeUInt32LE(j.length,12);h.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  const raw=Buffer.concat([h,j,bh,bin]);
  return new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),"");
}
const cooker=await load("assets/props/cooker/prepared.glb");
cooker.scene.updateMatrixWorld(true);
let rear=Infinity;
cooker.scene.traverse(o=>{
  if(!o.isMesh)return;
  for(let i=0;i<o.geometry.attributes.position.count;i++){
    const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld);
    if(p.y>.2&&p.y<.85&&Math.abs(p.x)<.28)rear=Math.min(rear,p.z);
  }
});
rear+=.4553063961244632;
const actor=await load("assets/meshy/petra-pilot/runtime-hold.glb");
let mesh;actor.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
const mixer=new AnimationMixer(actor.scene),action=mixer.clipAction(actor.animations.find(c=>c.name==="PetraWork")).setLoop(LoopOnce,1);
action.clampWhenFinished=true;
let clearance={metres:Infinity};
for(let frame=0;frame<=240;frame++){
  const t=frame/60;
  action.reset().play();mixer.setTime(t);actor.scene.updateMatrixWorld(true);mesh.skeleton.update();
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
    const p=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);
    if(p.y>.2&&p.y<.85&&Math.abs(p.x-.1966936038755368)<.29&&rear-p.z<clearance.metres)
      clearance={metres:rear-p.z,time_s:t,vertex:i,position:p.toArray()};
  }
}
const tool=await load("assets/props/tongs/prepared.glb");
const carry=JSON.parse(readFileSync(join(dir,"food-carry-study.json")));
const study=JSON.parse(readFileSync(join(dir,"contact-study-loop.json")));
const fit=JSON.parse(readFileSync(join(dir,"tool-fit-study.json")));
const foodCentre=new Vector3(0,-.015,.26).add(new Vector3().fromArray(carry.offset_in_tool));
const toolQ0=new Quaternion().fromArray(study.frames[0].hands.Right.joints.Hand.q)
  .multiply(new Quaternion().fromArray(fit.tongs_rotation_in_right_hand));
const jaws=[];
for(const half of[.14,.115,.095,.07]){
  const distances={half_angle:half};
  for(const [side,sign]of[["Upper",1],["Lower",-1]]){
    const pivot=tool.scene.getObjectByName(`Tongs${side}`);
    pivot.rotation.z=sign*half;
    tool.scene.updateMatrixWorld(true);
    let closest=Infinity;
    pivot.traverse(o=>{
      if(!o.isMesh||!o.material.name.toLowerCase().includes("silicone"))return;
      for(let i=0;i<o.geometry.attributes.position.count;i++){
        const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i)
          .applyMatrix4(o.matrixWorld).sub(foodCentre).applyQuaternion(toolQ0);
        const dx=p.x-Math.max(-.055,Math.min(.055,p.x));
        closest=Math.min(closest,Math.hypot(dx,p.y,p.z)-.035);
      }
    });
    distances[`${side.toLowerCase()}_min_vertex_capsule_distance_m`]=closest;
  }
  jaws.push(distances);
}
const report={hashes,body_sample_hz:60,cabinet_rear_actor_z:rear,cabinet_clearance:clearance,
  cabinet_negative_control:{description:"Undo the55mm stance offset on the sampled drawn vertex",clearance_m:clearance.metres-.055,caught:clearance.metres-.055<0},
  jaw_distance_note:"Minimum silicone vertex distance to .035radius/.11straight capsule; negative means penetration of the conservative capsule, not a complete triangle contact test.",
  jaws};
writeFileSync(join(dir,"pilot-contact-check.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
