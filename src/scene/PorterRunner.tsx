/** The porter — pot wash. Real Meshy body (wiry older build, mustard work
 *  shirt, long petrol rubber bib apron) who collects sent-back plates into
 *  a grey bus tub and hauls them off toward wash-up on the left edge.
 *
 *  Route: stands by the pass' far end, walks to the pickup point when a
 *  send-back lands, bends to grab the tub (the Work clip's set-down dip
 *  reads as a pick-up), hauls it left out of frame (carry subclip), then
 *  returns empty-handed (Walking clip) and waits again. Game position is
 *  code-driven — the GLB's root X/Z is pinned in prep. */

import { useMemo, useRef, useState } from "react";
import { useFrame, createPortal } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  AnimationUtils,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  SkinnedMesh,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useGame } from "../game/state";
import { useReducedMotion } from "./artDirection";
import { PortraitHead } from "./IllustratedCook";
import FoodModel from "./FoodModel";
import porterURL from "../../assets/meshy/porter-pilot/runtime-porter.glb?url";

const IVORY = "#f2ead6";
const TUB = "#6f7a74";

/** Mirrored to the commis: the pass' left end, exit left toward wash-up. */
const PICKUP_X = -1.0;
const STANDBY_X = -3.3;
const EXIT_X = -9.6;
const ROUTE_Z = 3.05;
const WALK_SPEED = 1.45;
const HAUL_SPEED = 1.05;

type Phase = "idle" | "toPickup" | "grab" | "out" | "through" | "back";

function findBone(root: Object3D, ...names: string[]): Bone | null {
  const want = names.map((n) => n.replace(/:/g, ""));
  let hit: Bone | null = null;
  root.traverse((o) => {
    if (!hit && (o as Bone).isBone && want.includes(o.name.replace(/:/g, ""))) hit = o as Bone;
  });
  return hit;
}

type SendbackPlate = {
  dish: string;
  quality: number;
};

/** Grey bus tub with the rejected plate and a small stack of dirties. */
function BusTub({ plate }: { plate: SendbackPlate | null }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.56, 0.24, 0.38]} />
        <meshStandardMaterial color={TUB} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* tub rim */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.6, 0.035, 0.42]} />
        <meshStandardMaterial color={TUB} roughness={0.65} metalness={0.05} />
      </mesh>
      {/* stacked dirty plates */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.12, 0.14 + i * 0.018, 0]} rotation={[0.12, 0, 0.1]}>
          <cylinderGeometry args={[0.14, 0.12, 0.012, 20]} />
          <meshStandardMaterial color={IVORY} roughness={0.5} />
        </mesh>
      ))}
      {plate && (
        <group position={[0.1, 0.16, 0]} rotation={[0.15, 0.3, -0.1]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.13, 0.012, 20]} />
            <meshStandardMaterial color={IVORY} roughness={0.5} />
          </mesh>
          <group position={[0, 0.008, 0]}>
            <FoodModel dish={plate.dish} quality={plate.quality} scale={0.3} />
          </group>
        </group>
      )}
    </group>
  );
}

export default function PorterRunner() {
  const gltf = useGLTF(porterURL);
  const sentBack = useGame((s) => s.sentBack);
  const reduced = useReducedMotion();
  const root = useRef<Group>(null);
  const [plate, setPlate] = useState<SendbackPlate | null>(null);

  const rig = useMemo(() => {
    const scene = skeletonClone(gltf.scene);
    const socket = scene.getObjectByName("PortraitSocket") ?? null;
    const spine2 = findBone(scene, "mixamorig:Spine2", "mixamorigSpine2");
    if (!socket) throw new Error("porter: PortraitSocket node missing");
    if (!spine2) throw new Error("porter: spine2 bone missing");

    const clips = new Map<string, AnimationClip>();
    for (const c of gltf.animations) clips.set(c.name, c);
    const work = clips.get("Work");
    const walking = clips.get("Walking");
    if (!work || !walking) throw new Error("porter: required clips missing");
    // Work (2.97s@30fps ≈ 89f): 0-48 carry walk · ~46-81 bend+rise · tail = stand
    clips.set("Ready", AnimationUtils.subclip(walking, "Ready", 0, 1, 30));
    clips.set("Carry", AnimationUtils.subclip(work, "Carry", 0, 46, 30));
    clips.set("Grab", AnimationUtils.subclip(work, "Grab", 48, 84, 30));

    // tub socket: measured in spine2 space at the mid-carry frame —
    // belly height, just ahead where both arms wrap the tub
    const tub = new Group();
    tub.name = "TubSocket";
    tub.position.set(0.02, -0.11, 0.1);
    spine2.add(tub);

    const owned: Material[] = [];
    scene.traverse((o) => {
      const m = o as SkinnedMesh;
      if (!m.isSkinnedMesh && !m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const clones = mats.map((mm) => {
        const c = (mm as MeshStandardMaterial).clone();
        c.metalness = 0;
        c.roughness = 0.92;
        owned.push(c);
        return c;
      });
      m.material = Array.isArray(m.material) ? clones : clones[0];
    });

    const mixer = new AnimationMixer(scene);
    const actions = new Map<string, AnimationAction>();
    for (const name of ["Ready", "Walking", "Carry", "Grab"]) {
      const a = mixer.clipAction(clips.get(name)!);
      a.setLoop(name === "Grab" ? LoopOnce : LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      actions.set(name, a);
    }
    actions.get("Ready")!.reset().play();
    mixer.update(0);
    scene.updateMatrixWorld(true);
    return { scene, socket, tub, mixer, actions, ownedMaterials: owned };
  }, [gltf]);

  const st = useRef<{
    phase: Phase;
    t: number;
    x: number;
    yaw: number;
    clip: string;
    seen: number;
    queued: boolean;
  }>({ phase: "idle", t: 0, x: STANDBY_X, yaw: 0, clip: "Ready", seen: sentBack, queued: false });

  useFrame((_, dt) => {
    const s = useGame.getState();
    const g = root.current;
    if (!g) return;
    const R = st.current;
    const step = s.paused ? 0 : Math.min(dt, 0.05);
    rig.mixer.update(step);

    const play = (name: string) => {
      if (R.clip === name) return;
      rig.actions.get(R.clip)?.fadeOut(0.22);
      rig.actions.get(name)!.reset().fadeIn(0.22).play();
      R.clip = name;
    };

    // out of service or reduced motion: park him at the standby spot
    if (s.phase !== "service" || reduced) {
      g.visible = false;
      R.phase = "idle";
      R.x = STANDBY_X;
      R.seen = s.sentBack;
      R.queued = false;
      setPlate(null);
      play("Ready");
      return;
    }
    g.visible = R.phase !== "through";
    g.position.set(R.x, 0, ROUTE_Z);
    g.rotation.y = MathUtils.damp(g.rotation.y, R.yaw, 8, step);

    if (s.sentBack !== R.seen) {
      R.seen = s.sentBack;
      const ev = [...s.events].reverse().find((e) => e.kind === "plate" && e.verdict === "sendback");
      setPlate(ev && ev.kind === "plate" ? { dish: ev.dish, quality: ev.quality } : { dish: "plate", quality: 0 });
      if (R.phase === "idle") R.phase = "toPickup";
      else if (R.phase !== "toPickup" && R.phase !== "grab") R.queued = true;
    }

    switch (R.phase) {
      case "idle":
        play("Ready");
        R.yaw = 0; // faces the room — his portrait reads while waiting
        break;
      case "toPickup": {
        play("Walking");
        R.yaw = Math.PI / 2; // facing +x, toward the pickup
        R.x += WALK_SPEED * step;
        if (R.x >= PICKUP_X) {
          R.x = PICKUP_X;
          R.phase = "grab";
          R.t = 0;
        }
        break;
      }
      case "grab": {
        play("Grab");
        R.yaw = -Math.PI / 2; // faces left — bending at the pass' end
        R.t += step;
        if (R.t >= 1.2) {
          R.phase = "out";
          R.t = 0;
        }
        break;
      }
      case "out": {
        play("Carry");
        R.yaw = -Math.PI / 2 + 0.55; // hauling left, angled toward the room
        R.x -= HAUL_SPEED * step;
        if (R.x <= EXIT_X) {
          R.phase = "through";
          R.t = 0;
        }
        break;
      }
      case "through": {
        R.t += step;
        if (R.t >= 0.7) {
          R.phase = R.queued ? "toPickup" : "back";
          if (!R.queued) setPlate(null);
          R.queued = false;
          R.t = 0;
        }
        break;
      }
      case "back": {
        play("Walking");
        R.yaw = Math.PI / 2;
        R.x += WALK_SPEED * step;
        if (R.x >= STANDBY_X) {
          R.x = STANDBY_X;
          if (R.queued) {
            R.queued = false;
            R.phase = "toPickup";
          } else {
            R.phase = "idle";
            setPlate(null);
          }
        }
        break;
      }
    }
    rig.tub.visible = R.phase === "out" || (R.phase === "grab" && R.t > 0.45);
  });

  if (reduced) return null;
  return (
    <group ref={root} position={[STANDBY_X, 0, ROUTE_Z]} visible={false}>
      <primitive object={rig.scene} dispose={null} />
      {createPortal(
        <group scale={0.7}>
          <PortraitHead cookId={4} />
        </group>,
        rig.socket
      )}
      {createPortal(<BusTub plate={plate} />, rig.tub)}
    </group>
  );
}
