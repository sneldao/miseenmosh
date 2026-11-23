/** A real brigade body: Meshy T2.5/N1 pilot mesh with the approved collage
 *  portrait socketed on the head bone — the same runtime pattern as Petra,
 *  parameterised per cook. Tool props are procedural and ride bone-local
 *  sockets measured against the Work clip (assets/meshy/probe-sockets.mjs).
 *
 *  All body motion comes from the GLB clips — the service clock drives the
 *  mixer, so pause, out-of-service and reduced-motion all behave like the
 *  rest of the kitchen. Gaze/reaction are small additive offsets on top.
 *
 *  Between tickets the body does not freeze on Work's first frame: it plays a
 *  neutral window cut from that same clip (see `idleLoops.ts`), slowed and
 *  staggered, with its board/knife beats fired from here — the beat timing
 *  lives in the loop, so the calls live with the loop. `Cook.mood` (Dev 3)
 *  drives the slump/brace/tremble offsets and the tempo, so the body is the
 *  gauge, not a second reading of the simulation. */

import { Fragment, useEffect, useMemo, useRef } from "react";
import { useFrame, createPortal } from "@react-three/fiber";
import {
  AnimationMixer,
  AnimationUtils,
  Group,
  MathUtils,
  Vector3,
  Bone,
  Object3D,
  Quaternion,
  SkinnedMesh,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
  type Material,
  type MeshStandardMaterial,
} from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useGame } from "../game/state";
import { sfx } from "../game/sound";
import { useReducedMotion, INK } from "./artDirection";
import { PortraitHead } from "./IllustratedCook";
import {
  applyMoodPose,
  breathAt,
  buildIdleClips,
  idleRate,
  makeIdleDrive,
  moodPose,
  workTimeScale,
  type IdleDrive,
} from "./idleLoops";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const REQUIRED_CLIPS = ["Work", "Walking", "Running"] as const;

/** Bone-local socket spec: position + euler on the named bone, measured so
 *  the tool's working end reaches its target mid-clip. */
interface SocketSpec {
  bone: string;
  position: [number, number, number];
  rotation: [number, number, number];
  prop: "spoon" | "whisk" | "bowl";
}

export interface BrigadeConfig {
  cookId: number;
  /** world x of the station centre */
  x: number;
  sockets: SocketSpec[];
  /** PortraitHead is tuned for the illustrated bodies; the real bodies need
   *  per-cook scale so the collage face reads at head size */
  portraitScale: number;
}

export const BRIGADE: Record<number, { glb: string; config: Omit<BrigadeConfig, "cookId" | "x"> }> = {
  1: {
    glb: "runtime-dimitri",
    config: {
      portraitScale: 0.52,
      sockets: [
        { bone: "mixamorigRightHand", position: [0, 0, 0.04], rotation: [-1.384, -0.115, 0.202], prop: "spoon" },
      ],
    },
  },
  2: {
    glb: "runtime-anwar",
    config: {
      portraitScale: 0.82,
      sockets: [
        { bone: "mixamorigRightHand", position: [0, 0, 0.04], rotation: [-2.302, -0.462, 0.845], prop: "whisk" },
        { bone: "mixamorigLeftForeArm", position: [0.036, 0.364, 0.096], rotation: [-1.815, -0.525, 1.682], prop: "bowl" },
      ],
    },
  },
};

function findBone(root: Object3D, ...names: string[]): Bone | null {
  const want = names.map((n) => n.replace(/:/g, ""));
  let hit: Bone | null = null;
  root.traverse((o) => {
    if (!hit && (o as Bone).isBone && want.includes(o.name.replace(/:/g, ""))) hit = o as Bone;
  });
  return hit;
}

/** Procedural station tools, modelled on the illustrated cook's toolkit:
 *  ink handles, wood spoon, steel whisk wires, cream bowl. Built along -Y
 *  from the socket origin so the probe-measured sockets aim the working
 *  end, not the grip. */
function ToolProp({ kind }: { kind: SocketSpec["prop"] }) {
  if (kind === "spoon") {
    return (
      <group>
        <mesh position={[0, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.22, 8]} />
          <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.245, 0]} scale={[0.8, 1.4, 0.55]} castShadow>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#6a4a30" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  if (kind === "whisk") {
    return (
      <group>
        <mesh position={[0, -0.05, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
          <meshStandardMaterial color="#6a4a30" roughness={0.7} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0.28 * (i % 2 === 0 ? 1 : -1), (i >> 1) * Math.PI, 0]} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.0035, 0.002, 0.2, 4]} />
            <meshStandardMaterial color={INK} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      <mesh scale={[1, 0.62, 1]} castShadow>
        <sphereGeometry args={[0.15, 16, 10]} />
        <meshStandardMaterial color="#e8ddc4" roughness={0.7} />
      </mesh>
      {/* batter surface inside the cradled bowl */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 16]} />
        <meshStandardMaterial color="#efe0b8" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function BrigadeCook({ x, cookId, gltf, config }: { x: number; cookId: number; gltf: GLTF; config: Omit<BrigadeConfig, "cookId" | "x"> }): JSX.Element {
  const root = useRef<Group>(null);
  const reduced = useReducedMotion();

  const rig = useMemo(() => {
    const scene = skeletonClone(gltf.scene);
    const socket = scene.getObjectByName("PortraitSocket") ?? null;
    const head = findBone(scene, "mixamorig:Head", "mixamorigHead");
    const spine1 = findBone(scene, "mixamorig:Spine1", "mixamorigSpine1");
    const spine2 = findBone(scene, "mixamorig:Spine2", "mixamorigSpine2");
    const leftArm = findBone(scene, "mixamorig:LeftArm", "mixamorigLeftArm");
    if (!socket) throw new Error(`${BRIGADE[cookId].glb}.glb: PortraitSocket node missing`);
    if (!head) throw new Error(`${BRIGADE[cookId].glb}.glb: head bone missing`);

    const clips = new Map<string, AnimationClip>();
    for (const c of gltf.animations) clips.set(c.name, c);
    for (const name of REQUIRED_CLIPS) {
      if (!clips.has(name)) throw new Error(`${BRIGADE[cookId].glb}.glb: clip ${name} missing`);
    }
    // the pilot ships no idle clip — Ready is the Work clip's settled frame
    // (reduced motion and the pre-first-ticket hold park on it), and the idle
    // loops are measured neutral windows of the same clip
    clips.set("Ready", AnimationUtils.subclip(clips.get("Work")!, "Ready", 0, 1, 30));
    for (const idleClip of buildIdleClips(clips, cookId)) clips.set(idleClip.name, idleClip);

    // tool sockets: Groups hard-parented to bones at the measured local
    // transforms so the props ride the hands through the whole clip
    const sockets = config.sockets.map((spec) => {
      const bone = findBone(scene, `mixamorig:${spec.bone.replace("mixamorig", "")}`, spec.bone);
      if (!bone) throw new Error(`${BRIGADE[cookId].glb}.glb: bone ${spec.bone} missing`);
      const g = new Group();
      g.name = `Socket_${spec.prop}`;
      g.position.set(...spec.position);
      g.rotation.set(...spec.rotation);
      bone.add(g);
      return g;
    });

    const owned: Material[] = [];
    scene.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh || (o as SkinnedMesh).isMesh) {
        const m = o as SkinnedMesh;
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
      }
    });

    const mixer = new AnimationMixer(scene);
    const actions = new Map<string, AnimationAction>();
    for (const [name, clip] of clips) {
      const a = mixer.clipAction(clip);
      a.setLoop(LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      actions.set(name, a);
    }
    const ready = actions.get("Ready")!;
    ready.reset().play();
    mixer.update(0);
    scene.updateMatrixWorld(true);

    const spineBind = spine2 ? spine2.scale.clone() : null;
    return { scene, socket, head, spine1, spine2, spineBind, leftArm, clips, mixer, actions, ownedMaterials: owned, sockets };
  }, [gltf, cookId, config]);

  useEffect(() => {
    for (const [name, clip] of rig.clips) {
      const a = rig.mixer.clipAction(clip);
      a.reset();
      a.setLoop(LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      rig.actions.set(name, a);
    }
    const ready = rig.actions.get("Ready")!;
    ready.reset().play();
    rig.mixer.update(0);
    current.current = ready;
    headRaw.current.copy(rig.head.quaternion);
    return () => {
      rig.mixer.stopAllAction();
      rig.mixer.uncacheRoot(rig.scene);
      rig.ownedMaterials.forEach((m) => m.dispose());
      const skeletons = new Set<SkinnedMesh["skeleton"]>();
      rig.scene.traverse((o) => {
        if ((o as SkinnedMesh).isSkinnedMesh) skeletons.add((o as SkinnedMesh).skeleton);
      });
      skeletons.forEach((sk) => sk.dispose());
    };
  }, [rig]);

  const previousServiceTime = useRef(0);
  const lastNight = useRef<number | null>(null);
  const lastEvent = useRef<unknown>(undefined);
  const react = useRef<{ kind: string; at: number } | null>(null);
  const outAt = useRef<number | null>(null);
  const wasService = useRef(false);
  const current = useRef<AnimationAction | null>(null);
  const headRaw = useRef(rig.head.quaternion.clone());
  const gaze = useRef({ yaw: 0, pitch: 0 });
  const time = useRef(0);
  const outElapsed = useRef(0);
  /** the idle loop state for this body: window, phase, beats */
  const idle = useRef<IdleDrive | null>(null);

  const crossfade = (next: AnimationAction) => {
    if (current.current === next) return;
    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();
    if (current.current) {
      next.crossFadeFrom(current.current, 0.28, false);
    }
    current.current = next;
  };

  useFrame((_, frameDelta) => {
    const g = root.current;
    if (!g) return;
    const s = useGame.getState();
    const cook = s.cooks[cookId];

    // --- new night, retry or a backwards clock: reset everything local
    if (s.career.night !== lastNight.current || s.serviceTime < previousServiceTime.current) {
      lastNight.current = s.career.night;
      previousServiceTime.current = s.serviceTime;
      lastEvent.current = undefined;
      react.current = null;
      outAt.current = null;
      outElapsed.current = 0;
      wasService.current = false;
      time.current = 0;
      idle.current = null;
      gaze.current.yaw = 0;
      gaze.current.pitch = 0;
      g.visible = true;
      g.position.set(x, 0, -3.95);
      g.rotation.set(0, 0, 0);
      rig.mixer.stopAllAction();
      const ready = rig.actions.get("Ready")!;
      ready.reset().play();
      rig.mixer.update(0);
      current.current = ready;
      headRaw.current.copy(rig.head.quaternion);
      if (rig.spine2 && rig.spineBind) rig.spine2.scale.copy(rig.spineBind);
      rig.scene.updateMatrixWorld(true);
    }

    // --- exit tail: a walked-out cook still gets their leave during
    // review/ending; nobody else animates off the service clock
    const exitTail = !!cook?.walkedOut && (s.phase === "review" || s.phase === "ending");

    if (s.phase !== "service" && !exitTail) {
      if (wasService.current) {
        wasService.current = false;
        react.current = null;
      }
      return;
    }
    wasService.current = true;
    if (s.paused) return;

    const serviceDelta = Math.max(0, Math.min(0.1, s.serviceTime - previousServiceTime.current));
    // the service clock stops while it waits on the player (the opening hold,
    // and the moment the player is deciding). The room must not stop with it:
    // the body breathes and preps on frame time whenever the clock is stalled.
    // Animation reads it; nothing in the simulation does.
    const delta = exitTail
      ? Math.max(0, Math.min(0.1, frameDelta))
      : serviceDelta > 0
        ? serviceDelta
        : Math.min(0.1, frameDelta);
    previousServiceTime.current = s.serviceTime;
    time.current += delta;
    const t = time.current;

    // --- event tail: plate verdicts and whisk help aimed at this cook
    const tail = s.events[s.events.length - 1] ?? null;
    if (lastEvent.current === undefined) {
      lastEvent.current = tail;
    } else if (tail !== lastEvent.current) {
      const idx = lastEvent.current === null ? -1 : s.events.indexOf(lastEvent.current as never);
      const start = lastEvent.current === null ? 0 : idx >= 0 ? idx + 1 : Math.max(0, s.events.length - 1);
      for (let i = start; i < s.events.length; i++) {
        const e = s.events[i];
        if (e.kind === "plate" && cook && e.cookName === cook.name) {
          react.current = { kind: e.verdict, at: t };
        }
        if (e.kind === "intervention" && e.action === "whisk" && cook && e.cookName === cook.name) {
          react.current = { kind: "serve", at: t };
        }
      }
      lastEvent.current = tail;
    }
    const rp = react.current ? Math.min(1, (t - react.current.at) / 1.4) : 1;
    if (rp >= 1) react.current = null;
    const reacting = react.current;

    // --- walkout: Running clip, same wall-hugging exit Petra takes
    if (cook?.walkedOut) {
      if (outAt.current === null) {
        outAt.current = s.serviceTime;
        crossfade(rig.actions.get("Running")!);
        outElapsed.current = Math.max(0, s.serviceTime - (cook.walkoutAt ?? s.serviceTime));
      }
      outElapsed.current += delta;
      const elapsed = outElapsed.current;
      if (rig.spine2 && rig.spineBind) rig.spine2.scale.copy(rig.spineBind);
      g.rotation.y = MathUtils.damp(g.rotation.y, -Math.PI / 2, 12, delta);
      g.position.x = x - 2.8 * Math.max(0, Math.min(elapsed, 2.2) - 0.2);
      g.position.z = -3.95;
      g.visible = g.position.x > -8.5;
      if (!g.visible && elapsed >= 2.2) return;
      rig.head.quaternion.copy(headRaw.current);
      rig.mixer.update(delta);
      headRaw.current.copy(rig.head.quaternion);
      return;
    }
    outAt.current = null;
    g.visible = true;
    g.position.x = x;
    g.position.z = -3.95;
    g.rotation.y = 0;

    // --- work vs idle: one whole performance per active ticket, sped to fit
    // the ticket's real plating duration — and between tickets the idle prep
    // loop, never a frozen frame
    const active = s.tickets.find((tk) => tk.station === cook?.station && tk.state === "plating");
    const readyTicket = s.tickets.some((tk) => tk.station === cook?.station && (tk.state === "ready" || tk.state === "pass"));
    const working = !!active;
    const mood = cook?.mood;
    const pose = moodPose(mood);
    const work = rig.actions.get("Work")!;

    if (!working && !reduced) {
      // the loop is the body's whole idle life: its own tempo, its own
      // window per loop, its own beats — and the beats are what Dev 3
      // published the SFX names for
      if (!idle.current) idle.current = makeIdleDrive(cookId, mood);
      const d = idle.current;
      if (d) {
        const beats = d.step(cookId, delta, mood, true);
        for (const b of beats) sfx(b.sound, { pan: MathUtils.clamp(x / 8, -1, 1), vol: b.vol });
        const next = rig.actions.get(d.variant.id);
        if (next) {
          if (current.current !== next) {
            // resume the window where the loop actually is, so swapping
            // variants never restarts a gesture from its first frame
            crossfade(next);
            next.time = Math.min(d.t, Math.max(0, next.getClip().duration - 1e-3));
          }
          next.setEffectiveTimeScale(idleRate(cookId, d.variant, d.loop, mood));
        } else {
          crossfade(rig.actions.get("Ready")!);
        }
      } else {
        crossfade(rig.actions.get("Ready")!);
      }
    } else {
      crossfade(working ? work : rig.actions.get("Ready")!);
      if (working) {
        work.setEffectiveTimeScale(workTimeScale(active!.plateDur, rig.clips.get("Work")!.duration, mood));
        // the next idle stretch starts on a fresh window and phase
        idle.current = null;
      }
    }

    // --- head: restore last raw pose, let the clip write, gaze on top
    rig.head.quaternion.copy(headRaw.current);
    rig.mixer.update(delta);
    headRaw.current.copy(rig.head.quaternion);

    const damp = 1 - Math.exp(-delta / 0.12);
    let wantYaw = 0;
    let wantPitch = 0;
    if (!reduced) {
      // a ready/pass plate pulls the cook's attention toward the chef
      if (readyTicket && !working) wantYaw = MathUtils.clamp(-x * 0.05, -0.2, 0.2);
      if (!working && !readyTicket) wantYaw = Math.sin(t * 0.33 + cookId * 1.7) * 0.05;
      if (reacting?.kind === "serve" || reacting?.kind === "whisk") {
        wantPitch += 0.12 * Math.sin(rp * Math.PI);
      }
      if (reacting?.kind === "sendback") wantPitch += 0.14 * (1 - rp);
      if (reacting?.kind === "smash") wantYaw += (cookId % 2 ? -1 : 1) * 0.18 * (1 - rp);
    }
    gaze.current.yaw += (wantYaw - gaze.current.yaw) * damp;
    gaze.current.pitch += (wantPitch - gaze.current.pitch) * damp;
    const gy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), gaze.current.yaw);
    const gp = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), gaze.current.pitch);
    rig.head.quaternion.multiply(gy).multiply(gp);

    // --- the body carries the mood: additive offsets on top of the clip's
    // own pose, dropped entirely under reduced motion
    applyMoodPose({ spine1: rig.spine1, spine2: rig.spine2, leftArm: rig.leftArm }, pose, t, reduced);

    // --- breathing while not plating: absolute from bind scale, never accrues
    if (rig.spine2 && rig.spineBind) {
      const b = breathAt(t, cookId, pose, working, reduced);
      rig.spine2.scale.set(
        rig.spineBind.x * (1 + b),
        rig.spineBind.y,
        rig.spineBind.z * (1 + b)
      );
    }
  });

  return (
    <group ref={root} position={[x, 0, -3.95]}>
      <primitive object={rig.scene} dispose={null} />
      {createPortal(
        <group scale={config.portraitScale}>
          <PortraitHead cookId={cookId} />
        </group>,
        rig.socket
      )}
      {rig.sockets.map((sock, i) => (
        <Fragment key={i}>{createPortal(<ToolProp kind={config.sockets[i].prop} />, sock)}</Fragment>
      ))}
    </group>
  );
}
