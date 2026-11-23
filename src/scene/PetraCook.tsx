/** The real Petra body: Meshy T2.5/N1 pilot mesh, skeleton and bundled
 *  clips, with the approved collage portrait socketed on the head bone.
 *
 *  All body motion comes from the GLB clips — the service clock drives the
 *  mixer, so pause, out-of-service and reduced-motion all behave like the
 *  rest of the kitchen. Gaze/reaction are small additive offsets on top.
 *
 *  Between tickets she does not freeze: a measured neutral window of
 *  PetraWork loops as prep (see `idleLoops.ts`) with her knife beats fired
 *  from the loop, and the fillet leaves her tongs to rest in the pan — food
 *  follows the work, not the idle. `Cook.mood` (Dev 3) sets the slump, brace,
 *  tremble and tempo, so the body is the gauge. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import {
  AnimationMixer,
  Matrix4,
  Vector3,
  Bone,
  Group,
  MathUtils,
  Object3D,
  Quaternion,
  SkinnedMesh,
  type AnimationAction,
  type AnimationClip,
  type Material,
  type MeshStandardMaterial,
} from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { LoopRepeat } from "three";
import { useGame } from "../game/state";
import { useReducedMotion } from "./artDirection";
import { PortraitHead } from "./IllustratedCook";
import SearingFillet, { FILLET_IN_TOOL } from "./SearingFillet";
import { sfx } from "../game/sound";
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

const REQUIRED_CLIPS = ["PetraReady", "PetraWork", "Walking", "Running"] as const;

/** where the fillet rests when she is not plating: in the pan by her hand,
 *  the same spot the walkout drop uses. Baked as offsets, never re-cloned in
 *  the frame loop. */
const PARK_X = 0.04669360387553681;
const PARK_Y = 0.951;
const PARK_Z = -4.03 + 0.2933063961244632;
const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();
const _home = new Vector3();
const _IDENTITY = new Quaternion();

function findBone(root: Object3D, ...names: string[]): Bone | null {
  const want = names.map((n) => n.replace(/:/g, ""));
  let hit: Bone | null = null;
  root.traverse((o) => {
    if (!hit && (o as Bone).isBone && want.includes(o.name.replace(/:/g, ""))) hit = o as Bone;
  });
  return hit;
}

export default function PetraCook({ x, gltf, tool }: { x: number; gltf: GLTF; tool: GLTF }): JSX.Element {
  const root = useRef<Group>(null);
  const food = useRef<Group>(null);
  const worldScene = useThree((st) => st.scene);
  const reduced = useReducedMotion();

  const rig = useMemo(() => {
    const scene = skeletonClone(gltf.scene);
    const byName = new Map<string, Object3D>();
    scene.traverse((o) => byName.set(o.name, o));

    const socket =
      byName.get("PortraitSocket") ??
      scene.getObjectByName("PortraitSocket") ??
      null;
    const head = findBone(scene, "mixamorig:Head", "mixamorigHead");
    const spine1 = findBone(scene, "mixamorig:Spine1", "mixamorigSpine1");
    const spine2 = findBone(scene, "mixamorig:Spine2", "mixamorigSpine2");
    const leftArm = findBone(scene, "mixamorig:LeftArm", "mixamorigLeftArm");
    const handL = findBone(scene, "mixamorig:LeftHand", "mixamorigLeftHand");
    const handR = findBone(scene, "mixamorig:RightHand", "mixamorigRightHand");
    if (!socket) throw new Error("runtime.glb: PortraitSocket node missing");
    if (!head) throw new Error("runtime.glb: head bone missing");

    const toolScene = tool.scene.clone(true);
    toolScene.traverse((o) => {
      const m = o as SkinnedMesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const toolSocket = scene.getObjectByName("RightToolSocket");
    const upper = toolScene.getObjectByName("TongsUpper");
    const lower = toolScene.getObjectByName("TongsLower");
    if (!toolSocket) throw new Error("runtime.glb: RightToolSocket node missing");
    if (!upper || !lower) throw new Error("tongs prepared.glb: jaw pivots missing");
    // jaws start in the ready closed-open pose; service work pinches them
    upper.rotation.z = 0.14;
    lower.rotation.z = -0.14;

    const clips = new Map<string, AnimationClip>();
    for (const c of gltf.animations) clips.set(c.name, c);
    for (const name of REQUIRED_CLIPS) {
      if (!clips.has(name)) throw new Error(`runtime.glb: clip ${name} missing`);
    }
    // idle prep = measured neutral windows of PetraWork, seam-blended so the
    // loop closes without a pop
    for (const idleClip of buildIdleClips(clips, 0)) clips.set(idleClip.name, idleClip);

    // graded cloth/skin materials: cloned so the cached GLB stays pristine
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

    // first frame must already be the Ready pose, never the T-pose bind
    const ready = actions.get("PetraReady")!;
    ready.reset().play();
    mixer.update(0);
    scene.updateMatrixWorld(true);

    // spine2 bind scale: breathing is absolute-relative, never accumulated
    const spineBind = spine2 ? spine2.scale.clone() : null;

    return { scene, socket, head, spine1, spine2, spineBind, leftArm, handL, handR, clips, mixer, actions, ownedMaterials: owned, toolScene, toolSocket, upper, lower };
  }, [gltf, tool]);

  // setup/cleanup: action bindings are recreated every mount (StrictMode
  // replays the effect); geometry and maps stay cached, only owned
  // materials and the cloned skeletons are released
  useEffect(() => {
    for (const [name, clip] of rig.clips) {
      const a = rig.mixer.clipAction(clip);
      a.reset();
      a.setLoop(LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      rig.actions.set(name, a);
    }
    const ready = rig.actions.get("PetraReady")!;
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
  const foodMatrix = useRef(new Matrix4());
  /** the idle prep loop for this body: window, phase, beats */
  const idle = useRef<IdleDrive | null>(null);
  /** 0 = fillet in the tongs, 1 = fillet resting in the pan */
  const parkAmt = useRef(1);
  const drop = useRef<{ p: number; pos: Vector3; q: Quaternion } | null>(null);
  const outElapsed = useRef(0);

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

  // jaw pinch follows the WORK clip's real weight — an unplayed action would
  // report weight 1 and clamp the tongs shut at bind. Hoisted out of the frame
  // loop so the render path allocates nothing.
  const syncJaws = () => {
    const work = rig.actions.get("PetraWork")!;
    const w = work.isRunning() ? work.getEffectiveWeight() : 0;
    const h = MathUtils.lerp(0.14, 0.115, w);
    rig.upper.rotation.z = h;
    rig.lower.rotation.z = -h;
  };
  // the fillet is food: it rides the tongs only while she is plating, and
  // rests in the pan between tickets — no float, no detach, no drift
  const syncFood = (working: boolean, delta: number) => {
    const f = food.current;
    if (!f) return;
    const want = working ? 0 : 1;
    parkAmt.current += (want - parkAmt.current) * (1 - Math.exp(-Math.min(0.1, delta) / 0.16));
    if (parkAmt.current > 0.995) {
      parkAmt.current = 1;
      f.position.set(x + PARK_X, PARK_Y, PARK_Z);
      f.quaternion.identity();
      return;
    }
    rig.toolSocket.updateWorldMatrix(true, false);
    foodMatrix.current.multiplyMatrices(rig.toolSocket.matrixWorld, FILLET_IN_TOOL);
    foodMatrix.current.decompose(_pos, _quat, _scale);
    _home.set(x + PARK_X, PARK_Y, PARK_Z);
    const k = parkAmt.current;
    f.position.lerpVectors(_pos, _home, k);
    // a short arc, so the hand-off reads as putting it down / taking it up
    f.position.y += Math.sin(Math.PI * k) * 0.06;
    f.quaternion.slerpQuaternions(_quat, _IDENTITY, k);
  };

  useFrame((_, frameDelta) => {
    const g = root.current;
    if (!g) return;
    const s = useGame.getState();
    const cook = s.cooks[0];

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
      parkAmt.current = 1;
      gaze.current.yaw = 0;
      gaze.current.pitch = 0;
      g.visible = true;
      g.position.set(x, 0, -4.03);
      g.rotation.set(0, 0, 0);
      rig.mixer.stopAllAction();
      const ready = rig.actions.get("PetraReady")!;
      ready.reset().play();
      rig.mixer.update(0);
      current.current = ready;
      headRaw.current.copy(rig.head.quaternion);
      if (rig.spine2 && rig.spineBind) rig.spine2.scale.copy(rig.spineBind);
      drop.current = null;
      syncJaws();
      rig.scene.updateMatrixWorld(true);
      syncFood(false, 0);
    }

    // --- exit tail: a walked-out cook still gets their leave during
    // review/ending; nobody else animates off the service clock
    const exitTail = !!cook?.walkedOut && (s.phase === "review" || s.phase === "ending");

    // --- out of service: clear once, hold the pose
    if (s.phase !== "service" && !exitTail) {
      if (wasService.current) {
        wasService.current = false;
        react.current = null;
      }
      return;
    }
    wasService.current = true;
    if (s.paused) return;

    // --- service-clock delta: the mixer follows the kitchen clock only;
    // the exit tail runs on bounded UI time once service has ended
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

    // --- event tail: plate verdicts and whisk help aimed at PETRA
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

    // --- walkout: Running clip, routed behind the station along the wall
    if (cook?.walkedOut) {
      if (outAt.current === null) {
        outAt.current = s.serviceTime;
        crossfade(rig.actions.get("Running")!);
        outElapsed.current = Math.max(0, s.serviceTime - (cook.walkoutAt ?? s.serviceTime));
        // freeze the fillet where the hand last carried it, before the
        // actor turns and runs — it goes back into the pan, not on her jog
        if (food.current) {
          drop.current = { p: 0, pos: food.current.position.clone(), q: food.current.quaternion.clone() };
        }
      }
      outElapsed.current += delta;
      {
        const f = food.current;
        const dr = drop.current;
        if (f && dr) {
          const target = new Vector3(x + 0.04669360387553681, 0.951, -4.03 + 0.2933063961244632);
          dr.p = Math.min(1, outElapsed.current / 0.35);
          const e = dr.p * dr.p * (3 - 2 * dr.p);
          f.position.lerpVectors(dr.pos, target, e);
          if (dr.pos.distanceTo(target) > 0.005) {
            f.position.y += 0.04 * Math.sin(Math.PI * e);
          }
          f.quaternion.slerpQuaternions(dr.q, new Quaternion(), Math.min(1, 1.8 * dr.p));
        }
      }
      const elapsed = outElapsed.current;
      if (rig.spine2 && rig.spineBind) rig.spine2.scale.copy(rig.spineBind);
      g.rotation.y = MathUtils.damp(g.rotation.y, -Math.PI / 2, 12, delta);
      // absolute exit path: a late-loading model never reappears at start
      g.position.x = x - 2.8 * Math.max(0, Math.min(elapsed, 2.2) - 0.2);
      g.position.z = -4.03;
      g.visible = g.position.x > -8.5;
      // fully gone and the fillet already home — nothing left to animate
      if (!g.visible && elapsed >= 2.2 && (drop.current?.p ?? 1) >= 1) return;
      // head restore/update still applies so the last pose doesn't pop
      rig.head.quaternion.copy(headRaw.current);
      rig.mixer.update(delta);
      headRaw.current.copy(rig.head.quaternion);
      syncJaws();
      return;
    }
    outAt.current = null;
    g.visible = true;
    g.position.x = x;
    g.position.z = -4.03;
    g.rotation.y = 0;

    // --- work vs idle: one whole performance per active ticket, sped to fit
    // the ticket's real plating duration (no mid-return cut-off) — and between
    // tickets a measured neutral window of the same clip loops as prep
    const active = s.tickets.find((tk) => tk.station === cook?.station && tk.state === "plating");
    const working = !!active;
    const mood = cook?.mood;
    const pose = moodPose(mood);
    const work = rig.actions.get("PetraWork")!;

    if (!working && !reduced) {
      if (!idle.current) idle.current = makeIdleDrive(0, mood);
      const d = idle.current;
      if (d) {
        const beats = d.step(0, delta, mood, true);
        for (const b of beats) sfx(b.sound, { pan: MathUtils.clamp(x / 8, -1, 1), vol: b.vol });
        const next = rig.actions.get(d.variant.id);
        if (next) {
          if (current.current !== next) {
            crossfade(next);
            next.time = Math.min(d.t, Math.max(0, next.getClip().duration - 1e-3));
          }
          next.setEffectiveTimeScale(idleRate(0, d.variant, d.loop, mood));
        } else {
          crossfade(rig.actions.get("PetraReady")!);
        }
      } else {
        crossfade(rig.actions.get("PetraReady")!);
      }
    } else {
      crossfade(working ? work : rig.actions.get("PetraReady")!);
      if (working) {
        work.setEffectiveTimeScale(workTimeScale(active!.plateDur, rig.clips.get("PetraWork")!.duration, mood));
        idle.current = null;
      }
    }

    // --- head: restore last raw pose so constant tracks can't drift, then
    // let the clip write, capture it, and add the small gaze on top
    rig.head.quaternion.copy(headRaw.current);
    rig.mixer.update(delta);
    headRaw.current.copy(rig.head.quaternion);
    syncJaws();

    const damp = 1 - Math.exp(-delta / 0.12);
    let wantYaw = 0;
    let wantPitch = 0;
    if (!reduced) {
      if (!working) wantYaw = MathUtils.clamp(-x * 0.035, -0.2, 0.2);
      if (reacting?.kind === "serve" || reacting?.kind === "whisk") {
        wantPitch += 0.12 * Math.sin(rp * Math.PI);
      }
      if (reacting?.kind === "sendback") wantPitch += 0.14 * (1 - rp);
      if (reacting?.kind === "smash") wantYaw += 0.18 * (1 - rp);
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
      const b = breathAt(t, 0, pose, working, reduced);
      rig.spine2.scale.set(
        rig.spineBind.x * (1 + b),
        rig.spineBind.y,
        rig.spineBind.z * (1 + b)
      );
    }
    syncFood(working, delta);
  });

  return (
    <group ref={root} position={[x, 0, -4.03]}>
      <primitive object={rig.scene} dispose={null} />
      {createPortal(<PortraitHead cookId={0} />, rig.socket)}
      {createPortal(<primitive object={rig.toolScene} dispose={null} />, rig.toolSocket)}
      {createPortal(
        <group ref={food} position={[x + 0.04669360387553681, 0.951, -4.03 + 0.2933063961244632]}>
          <SearingFillet />
        </group>,
        worldScene
      )}
    </group>
  );
}
