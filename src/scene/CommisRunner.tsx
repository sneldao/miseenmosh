/** The commis — our plate runner. Real Meshy body (slight build, oversized
 *  jacket, petrol waist apron) carrying the pass' finished plates out toward
 *  the dining room and coming back empty-handed. Replaces the floating
 *  mitten tray that stayed below frame.
 *
 *  Route: stands by the pass' near end, walks to the pickup point on a new
 *  delivery, lifts the tray (Work clip's present gesture), carries it right
 *  at chest height (carry subclip), steps out of frame, returns empty
 *  (Walking clip) and stands ready again. Game position is code-driven —
 *  the GLB's root X/Z is pinned in prep so the mixer never fights the route. */

import { useMemo, useRef } from "react";
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
import { sfx } from "../game/sound";
import { useReducedMotion, COPPER } from "./artDirection";
import { PortraitHead } from "./IllustratedCook";
import FoodModel from "./FoodModel";
import commisURL from "../../assets/meshy/commis-pilot/runtime-commis.glb?url";

const IVORY = "#f2ead6";

/** The pass run: pickup end near the kitchen line, exit toward the dining
 *  room's right edge, standby spot just inside frame. */
const PICKUP_X = 1.0;
const STANDBY_X = 3.3;
const EXIT_X = 9.6;
const ROUTE_Z = 3.05;
const WALK_SPEED = 1.7;
const CARRY_SPEED = 1.25;

type Phase = "idle" | "toPickup" | "lift" | "out" | "through" | "back";

function findBone(root: Object3D, ...names: string[]): Bone | null {
  const want = names.map((n) => n.replace(/:/g, ""));
  let hit: Bone | null = null;
  root.traverse((o) => {
    if (!hit && (o as Bone).isBone && want.includes(o.name.replace(/:/g, ""))) hit = o as Bone;
  });
  return hit;
}

/** The copper tray and the service's real plates — shared with the fallback
 *  floating tray so the carried plates are identical either way. */
type TrayPlate = NonNullable<ReturnType<typeof useGame.getState>["lastDelivery"]>["plates"][number];

export function TrayBoard({ plates }: { plates: TrayPlate[] }) {
  const w = Math.max(1.1, 0.34 * (plates.length - 1) + 0.35);
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[w, 0.025, 0.5]} />
        <meshStandardMaterial color={COPPER} roughness={0.4} metalness={0.5} />
      </mesh>
      {plates.map((p, i) => (
        <group key={i} position={[(i - (plates.length - 1) / 2) * 0.34, 0.02, 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.13, 0.012, 20]} />
            <meshStandardMaterial color={IVORY} roughness={0.5} />
          </mesh>
          <group position={[0, 0.008, 0]}>
            <FoodModel
              dish={p.dish}
              quality={p.quality}
              condition={p.condition}
              finish={p.recipeFinish as "classic" | "herb" | undefined}
              scale={0.32}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

export default function CommisRunner() {
  const gltf = useGLTF(commisURL);
  const delivery = useGame((s) => s.lastDelivery);
  const reduced = useReducedMotion();
  const root = useRef<Group>(null);

  const rig = useMemo(() => {
    const scene = skeletonClone(gltf.scene);
    const socket = scene.getObjectByName("PortraitSocket") ?? null;
    const spine2 = findBone(scene, "mixamorig:Spine2", "mixamorigSpine2");
    if (!socket) throw new Error("commis: PortraitSocket node missing");
    if (!spine2) throw new Error("commis: spine2 bone missing");

    const clips = new Map<string, AnimationClip>();
    for (const c of gltf.animations) clips.set(c.name, c);
    const work = clips.get("Work");
    const walking = clips.get("Walking");
    if (!work || !walking) throw new Error("commis: required clips missing");
    clips.set("Ready", AnimationUtils.subclip(work, "Ready", 0, 1, 30));
    // carry subclip = the steady walking-with-tray stretch; lift = the
    // closing present gesture, played once at the pass
    clips.set("Carry", AnimationUtils.subclip(work, "Carry", 0, 54, 30));
    clips.set("Lift", AnimationUtils.subclip(work, "Lift", 58, Math.round(work.duration * 30), 30));

    // tray socket: measured in spine2 space at Work frame 0 — chest height,
    // just ahead of the sternum where both hands sit under the tray
    const tray = new Group();
    tray.name = "TraySocket";
    tray.position.set(0.007, -0.204, 0.17);
    spine2.add(tray);

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
    for (const name of ["Ready", "Walking", "Carry", "Lift"]) {
      const a = mixer.clipAction(clips.get(name)!);
      a.setLoop(name === "Lift" ? LoopOnce : LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      actions.set(name, a);
    }
    actions.get("Ready")!.reset().play();
    mixer.update(0);
    scene.updateMatrixWorld(true);
    return { scene, socket, tray, mixer, actions, ownedMaterials: owned };
  }, [gltf]);

  const st = useRef<{
    phase: Phase;
    t: number;
    x: number;
    yaw: number;
    clip: string;
    delivered: typeof delivery;
    queued: boolean;
    stepT: number;
  }>({ phase: "idle", t: 0, x: STANDBY_X, yaw: 0, clip: "Ready", delivered: delivery, queued: false, stepT: 0 });

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

    // footfalls ride his live x so the stereo field sweeps with the route
    const stride = (interval: number, vol: number) => {
      R.stepT += step;
      if (R.stepT >= interval) {
        R.stepT = 0;
        sfx("step", { pan: MathUtils.clamp(R.x / 8, -1, 1), vol });
      }
    };

    // out of service or reduced motion: park him at the standby spot
    if (s.phase !== "service" || reduced) {
      g.visible = false;
      R.phase = "idle";
      R.x = STANDBY_X;
      R.delivered = delivery;
      R.queued = false;
      play("Ready");
      return;
    }
    g.visible = R.phase !== "through";
    g.position.set(R.x, 0, ROUTE_Z);
    g.rotation.y = MathUtils.damp(g.rotation.y, R.yaw, 8, step);

    if (delivery !== R.delivered) {
      R.delivered = delivery;
      if (delivery && R.phase === "idle") R.phase = "toPickup";
      else if (delivery && (R.phase === "out" || R.phase === "back")) R.queued = true;
    }

    switch (R.phase) {
      case "idle":
        play("Ready");
        R.yaw = 0; // faces the dining room — his portrait reads while waiting
        break;
      case "toPickup": {
        play("Walking");
        R.yaw = -Math.PI / 2;
        R.x -= WALK_SPEED * step;
        stride(0.36, 0.5);
        if (R.x <= PICKUP_X) {
          R.x = PICKUP_X;
          R.phase = "lift";
          R.t = 0;
          sfx("clatter", { pan: PICKUP_X / 8, vol: 0.8 });
        }
        break;
      }
      case "lift": {
        play("Lift");
        R.yaw = Math.PI;
        R.t += step;
        if (R.t >= 1.1) {
          R.phase = "out";
          R.t = 0;
        }
        break;
      }
      case "out": {
        play("Carry");
        R.yaw = Math.PI / 2 - 0.55; // angled toward the room — his face reads
        R.x += CARRY_SPEED * step;
        stride(0.5, 0.7);
        if (R.x >= EXIT_X) {
          R.phase = "through";
          R.t = 0;
        }
        break;
      }
      case "through": {
        R.t += step;
        if (R.t >= 0.7) {
          R.phase = R.queued ? "toPickup" : "back";
          R.queued = false;
          R.t = 0;
        }
        break;
      }
      case "back": {
        play("Walking");
        R.yaw = -Math.PI / 2;
        R.x -= WALK_SPEED * step;
        stride(0.36, 0.45);
        if (R.x <= STANDBY_X) {
          R.x = STANDBY_X;
          if (R.queued) {
            R.queued = false;
            R.phase = "toPickup";
          } else {
            R.phase = "idle";
          }
        }
        break;
      }
    }
    rig.tray.visible = R.phase === "out" || R.phase === "lift";
  });

  if (reduced) return null;
  const plates = delivery?.plates.slice(0, 4) ?? [];
  return (
    <group ref={root} position={[STANDBY_X, 0, ROUTE_Z]} visible={false}>
      <primitive object={rig.scene} dispose={null} />
      {createPortal(
        <group scale={0.7}>
          <PortraitHead cookId={3} />
        </group>,
        rig.socket
      )}
      {createPortal(<TrayBoard plates={plates} />, rig.tray)}
    </group>
  );
}
