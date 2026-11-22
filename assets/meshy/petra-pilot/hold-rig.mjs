// Lead-owned contact derivative. Preserve the measured equipment path;
// put handles between the fingers, with forearm pronation, not through palms.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const dir = dirname(fileURLToPath(import.meta.url));
const sha = b => createHash("sha256").update(b).digest("hex");
const bytes = readFileSync(join(dir,"runtime-contact.glb"));
const n = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20,20+n)), bin = bytes.subarray(28+n);
// The captured apron swept 40.65mm into the range's rear cabinet. Move
// the stance back55mm, preserving the equipment path with arm contact.
const stanceOffset=new Vector3(0,0,-.055);
const sceneDef=doc.scenes[doc.scene??0];
const stanceNode=doc.nodes.length;
doc.nodes.push({name:"WorkStance",translation:stanceOffset.toArray(),children:[...sceneDef.nodes]});
sceneDef.nodes=[stanceNode];
function glb(d,b) {
  const s=Buffer.from(JSON.stringify(d)),j=Buffer.alloc(Math.ceil(s.length/4)*4,32);s.copy(j);
  const h=Buffer.alloc(20),bh=Buffer.alloc(8);
  h.write("glTF");h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+b.length,8);
  h.writeUInt32LE(j.length,12);h.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(b.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([h,j,bh,b]);
}
const geometryDoc=structuredClone(doc);
geometryDoc.materials=[{}];geometryDoc.images=[];geometryDoc.textures=[];
const geometry=glb(geometryDoc,bin);
const {scene}=await new GLTFLoader().parseAsync(
  geometry.buffer.slice(geometry.byteOffset,geometry.byteOffset+geometry.byteLength),"");
const canon=s=>s.replaceAll(":","");
const objects=new Map();
let mesh;
scene.traverse(o=>{objects.set(canon(o.name),o);if(o.isSkinnedMesh)mesh=o;});
const bone=s=>objects.get(`mixamorig${s}`);
const node=s=>doc.nodes.findIndex(o=>canon(o.name??"")===s);
const widths={SCALAR:1,VEC3:3,VEC4:4};
function values(id) {
  const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],w=widths[a.type];
  if(a.componentType!==5126||a.sparse||a.normalized||v.byteStride)throw Error("Unexpected animation encoding");
  const result=new Float32Array(a.count*w),base=(v.byteOffset??0)+(a.byteOffset??0);
  for(let i=0;i<result.length;i++)result[i]=bin.readFloatLE(base+i*4);
  return result;
}
const parts=[bin];let length=bin.length;
function append(a,type) {
  const b=Buffer.from(a.buffer,a.byteOffset,a.byteLength),padded=Buffer.alloc(Math.ceil(b.length/4)*4);
  b.copy(padded);
  const view=doc.bufferViews.length;
  doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length});
  parts.push(padded);length+=padded.length;
  const id=doc.accessors.length;
  doc.accessors.push({bufferView:view,componentType:5126,type,count:a.length/widths[type]});
  return id;
}
const oldStudy=JSON.parse(readFileSync(join(dir,"contact-study-loop.json")));
if(oldStudy.source_sha256!==sha(bytes))throw Error("Frozen contact study/model mismatch");
const oldToolQ=new Quaternion().fromArray(JSON.parse(readFileSync(join(dir,"tool-fit-study.json"))).tongs_rotation_in_right_hand);
const toolContact=new Vector3(0,-.006,.055); // 87mm from hinge, down the existing handles.
const panContact=new Vector3(.18,.957,.16);
const panAxis=new Vector3(1,0,0).applyAxisAngle(new Vector3(0,1,0),Math.PI/4);
const socketNodes={};
for(const side of ["Left","Right"]) {
  const parent=node(`mixamorig${side}Hand`);
  const id=doc.nodes.length;
  doc.nodes.push({name:`${side}GripSurface`});
  (doc.nodes[parent].children??=[]).push(id);
  socketNodes[side]=id;
}
const toolSocket=doc.nodes.length;
doc.nodes.push({name:"RightToolSocket"});
doc.nodes[node("mixamorigRightHand")].children.push(toolSocket);
const pos=o=>o.getWorldPosition(new Vector3());
const worldQ=o=>o.getWorldQuaternion(new Quaternion());
function pointBone(o,from,to) {
  const desired=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(worldQ(o));
  o.quaternion.copy(worldQ(o.parent).invert().multiply(desired)).normalize();
  o.updateWorldMatrix(false,true);
}
const report={source_sha256:sha(bytes),body_stance_offset_m:stanceOffset.toArray(),tool_contact_local_m:toolContact.toArray(),grips:{},frames:[]};
const graspPose=new Map();
for(const anim of doc.animations.filter(a=>["PetraReady","PetraWork"].includes(a.name))) {
  const times=values(anim.samplers[0].input);
  const tracks=anim.channels.map(ch=>{
    const s=anim.samplers[ch.sampler],Track=ch.target.path==="rotation"?QuaternionKeyframeTrack:VectorKeyframeTrack;
    const name=canon(doc.nodes[ch.target.node].name??"");
    if(!objects.has(name))throw Error(`Missing ${name}`);
    return{object:objects.get(name),path:ch.target.path,sample:new Track("pose",values(s.input),values(s.output)).createInterpolant()};
  });
  const changed=new Map();
  for(const side of ["Left","Right"])for(const suffix of ["Arm","ForeArm","Hand",...["Index","Middle","Ring","Pinky"].map(f=>`Hand${f}1`)]) {
    const name=`mixamorig${side}${suffix}`;
    changed.set(name,new Float32Array(times.length*4));
  }
  const socketP=new Float32Array(times.length*3),socketQ=new Float32Array(times.length*4);
  times.forEach((t,frame)=>{
    mesh.skeleton.pose();
    for(const tr of tracks) {
      const a=tr.sample.evaluate(t);
      if(tr.path==="rotation")tr.object.quaternion.fromArray(a);
      else if(tr.path==="translation")tr.object.position.fromArray(a);
      else if(tr.path==="scale")tr.object.scale.fromArray(a);
      else throw Error("Unexpected channel");
    }
    scene.updateMatrixWorld(true);
    const oldHand=bone("RightHand");
    const toolQ=worldQ(oldHand).multiply(oldToolQ);
    const toolP=oldHand.localToWorld(new Vector3().fromArray(oldStudy.grip_local_m.Right)).sub(stanceOffset);
    const frameReport={clip:anim.name,t,hands:{}};
    for(const side of ["Left","Right"]) {
      const hand=bone(`${side}Hand`),upper=bone(`${side}Arm`),fore=bone(`${side}ForeArm`);
      const originalHandQ=worldQ(hand),originalHandLocal=hand.quaternion.clone();
      const oldWrist=pos(hand),shoulder=pos(upper),capturedElbow=pos(fore);
      const a=shoulder.distanceTo(capturedElbow),b=capturedElbow.distanceTo(oldWrist);
      const curl=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),(side==="Left"?50:30)*Math.PI/180);
      for(const f of ["Index","Middle","Ring","Pinky"])bone(`${side}Hand${f}1`).quaternion.premultiply(curl).normalize();
      scene.updateMatrixWorld(true);
      const tips=pos(bone(`${side}HandIndex4`)).add(pos(bone(`${side}HandMiddle4`))).multiplyScalar(.5);
      const grip=hand.worldToLocal(tips.add(pos(bone(`${side}HandThumb4`))).multiplyScalar(.5));
      if(!report.grips[side])report.grips[side]=grip.toArray();
      if(grip.distanceTo(new Vector3().fromArray(report.grips[side]))>1e-5)throw Error("Finger hold varied");
      const target=side==="Left"?panContact.clone():toolContact.clone().applyQuaternion(toolQ).add(toolP);
      const axis=side==="Left"?panAxis.clone():new Vector3(0,0,1).applyQuaternion(toolQ);
      axis.applyQuaternion(originalHandQ.clone().invert());
      let roll=Math.atan2(-axis.z,axis.x);
      if(roll>Math.PI/2)roll-=Math.PI;
      if(roll< -Math.PI/2)roll+=Math.PI;
      let desiredHand=originalHandQ.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),roll));
      const worldAxis=side==="Left"?panAxis.clone():new Vector3(0,0,1).applyQuaternion(toolQ);
      // Fixed iterations keep the contact solution continuous between keys.
      // Relax excess wrist swing toward the forearm, retaining shaft tangency
      // to the palm rather than tipping a shaft through the back of the hand.
      for(let iteration=0;iteration<6;iteration++) {
        const wrist=target.clone().sub(grip.clone().applyQuaternion(desiredHand));
        const direction=wrist.clone().sub(shoulder),d=direction.length();
        if(d>.98*(a+b)||d<Math.abs(a-b)+1e-5)throw Error(`${side} unreachable ${anim.name} t${t}`);
        direction.normalize();
        const pole=capturedElbow.clone().sub(shoulder);
        pole.addScaledVector(direction,-pole.dot(direction)).normalize();
        const along=(a*a+d*d-b*b)/(2*d);
        const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)));
        pointBone(upper,pos(fore).sub(shoulder),elbow.sub(shoulder));
        const e=pos(fore);pointBone(fore,pos(hand).sub(e),wrist.clone().sub(e));
        // Pronation belongs in the forearm about its wrist direction.
        const preferredFore=desiredHand.clone().multiply(originalHandLocal.clone().invert());
        const delta=worldQ(fore).invert().multiply(preferredFore);
        const twistAxis=hand.position.clone().normalize();
        const projection=twistAxis.multiplyScalar(new Vector3(delta.x,delta.y,delta.z).dot(twistAxis));
        const twist=new Quaternion(projection.x,projection.y,projection.z,delta.w).normalize();
        fore.quaternion.multiply(twist).normalize();fore.updateWorldMatrix(false,true);
        hand.quaternion.copy(worldQ(hand.parent).invert().multiply(desiredHand)).normalize();
        hand.updateWorldMatrix(false,true);
        if(iteration<5) {
          const fwd=pos(hand).sub(pos(fore)).normalize();
          const palm=pos(bone(`${side}HandMiddle1`)).sub(pos(hand)).normalize();
          const angle=Math.acos(Math.max(-1,Math.min(1,fwd.dot(palm))));
          const amount=Math.min(.35,Math.max(0,(angle-20*Math.PI/180)/Math.max(angle,1e-6))*.6);
          const correction=new Quaternion().slerp(new Quaternion().setFromUnitVectors(palm,fwd),amount);
          const y=new Vector3(0,1,0).applyQuaternion(desiredHand).applyQuaternion(correction).normalize();
          const oldNormal=new Vector3(0,0,1).applyQuaternion(desiredHand);
          const z=worldAxis.clone().cross(y).normalize();
          if(z.dot(oldNormal)<0)z.negate();
          const x=y.clone().cross(z).normalize();
          desiredHand=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
        }
      }
      const error=hand.localToWorld(grip.clone()).distanceTo(target);
      const foreDirection=pos(hand).sub(pos(fore)).normalize();
      const palmDirection=pos(bone(`${side}HandMiddle1`)).sub(pos(hand)).normalize();
      const angle=Math.acos(Math.max(-1,Math.min(1,foreDirection.dot(palmDirection))))*180/Math.PI;
      const shift=pos(hand).distanceTo(oldWrist);
      frameReport.hands[side]={palm_axis_deg:angle,wrist_shift_m:shift,grip_error_m:error,pronation_deg:roll*180/Math.PI};
      if(error>1e-5||angle>25||shift>.1)throw Error(JSON.stringify(frameReport));
    }
    for(const [name,data]of changed)data.set(objects.get(name).quaternion.toArray(),frame*4);
    const right=bone("RightHand");
    socketP.set(right.worldToLocal(toolP.clone()).toArray(),frame*3);
    socketQ.set(worldQ(right).invert().multiply(toolQ).toArray(),frame*4);
    if(anim.name==="PetraReady"&&frame===0) {
      doc.nodes[toolSocket].translation=Array.from(socketP.subarray(0,3));
      doc.nodes[toolSocket].rotation=Array.from(socketQ.subarray(0,4));
      for(const side of["Left","Right"])for(const finger of["Thumb","Index","Middle","Ring","Pinky"])for(let joint=1;joint<=4;joint++) {
        const name=`mixamorig${side}Hand${finger}${joint}`;
        graspPose.set(name,objects.get(name).quaternion.toArray());
      }
    }
    report.frames.push(frameReport);
  });
  for(const [name,data]of changed) {
    const ch=anim.channels.find(ch=>ch.target.path==="rotation"&&canon(doc.nodes[ch.target.node].name??"")===name);
    if(!ch)throw Error(`Rotation track missing ${name}`);
    anim.samplers[ch.sampler].output=append(data,"VEC4");
  }
  for(const [path,data,type]of[["translation",socketP,"VEC3"],["rotation",socketQ,"VEC4"]]) {
    const sampler=anim.samplers.length;
    anim.samplers.push({input:anim.samplers[0].input,output:append(data,type),interpolation:"LINEAR"});
    anim.channels.push({sampler,target:{node:toolSocket,path}});
  }
}
// Walking/running keep the proven grasp while the captured arms and body
// move. They use the socket's Ready transform rather than an identity socket
// at the wrist. Each new sampler is private; never mutate a shared sampler.
for(const anim of doc.animations.filter(a=>["Walking","Running"].includes(a.name))) {
  const duration=Math.max(...anim.samplers.map(s=>{const ts=values(s.input);return ts[ts.length-1];}));
  const input=append(new Float32Array([0,duration]),"SCALAR");
  doc.accessors[input].min=[0];doc.accessors[input].max=[duration];
  for(const [name,q]of graspPose) {
    const target=node(name);
    const ch=anim.channels.find(ch=>ch.target.node===target&&ch.target.path==="rotation");
    const sampler=anim.samplers.length;
    anim.samplers.push({input,output:append(new Float32Array([...q,...q]),"VEC4"),interpolation:"LINEAR"});
    if(ch)ch.sampler=sampler;
    else anim.channels.push({sampler,target:{node:target,path:"rotation"}});
  }
}
for(const side of["Left","Right"])doc.nodes[socketNodes[side]].translation=report.grips[side];
doc.buffers[0].byteLength=length;
const output=glb(doc,Buffer.concat(parts));
writeFileSync(join(dir,"runtime-hold.glb"),output);
report.sha256=sha(output);
report.status="candidate_requires_skin_and_motion_review";
writeFileSync(join(dir,"runtime-hold-manifest.json"),JSON.stringify(report,null,2)+"\n");
console.log("Wrote runtime-hold",report.grips);
