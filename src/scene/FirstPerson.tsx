import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Euler,
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { useGame, tierOf } from "../game/state";
import { DishDecal, DISH_SPRITE } from "./DishSprite";

/**
 * Phase 1 — the first-person pass.
 *
 * The chef stands behind the pass at eye level. Mouse-look is constrained
 * to a working arc, arrows shimmy along the line, the plate lives in your
 * hands, and clicks raycast from the centre of the screen instead of the
 * cursor. Menus keep the cinematic camera; service dollies in.
 */
const EYE = 1.74;
const STAND_Z = 3.6;
const MENU_Y = 4.6;
const MENU_Z = 7.2;
const YAW_MAX = 1.15; // ~66° each way — the room, not a free-look camera
const PITCH_MIN = -0.82;
const PITCH_MAX = 0.55;
const FOV_MENU = 46;
const FOV_FP = 66;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const SKIN = "#c99772";
const SLEEVE = "#2a2320";
const CUFF = "#e8e2d5";
const STEEL = "#d8d4cc";

export default function FirstPerson() {
  const { camera, scene, gl } = useThree();
  const hands = useRef<Group>(null);
  const plate = useRef<Group>(null);
  const lump = useRef<Mesh>(null);

  const yaw = useRef(0);
  const pitch = useRef(0);
  const strafe = useRef(0);
  const lean = useRef(0);
  const blend = useRef(0);
  const inspect = useRef(false);
  const lift = useRef(0);
  const locked = useRef(false);
  const aimTick = useRef(0);
  const keys = useRef({ left: false, right: false, fwd: false, back: false });

  const scratch = useRef({
    menuPos: new Vector3(),
    fpPos: new Vector3(),
    camPos: new Vector3(),
    qMenu: new Quaternion(),
    qFp: new Quaternion(),
    euler: new Euler(0, 0, 0, "YXZ"),
    // a camera dummy: Object3D.lookAt points +Z at the target, cameras look -Z
    dummy: new PerspectiveCamera(),
    ray: new Raycaster(),
    centre: new Vector2(0, 0),
    target: new Vector3(),
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const s = scratch.current;
    s.dummy.up.set(0, 1, 0);

    const onLock = () => {
      locked.current = document.pointerLockElement === canvas;
      document.body.classList.toggle("pointer-locked", locked.current);
    };

    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current = clamp(yaw.current - e.movementX * 0.0022, -YAW_MAX, YAW_MAX);
      pitch.current = clamp(pitch.current - e.movementY * 0.002, PITCH_MIN, PITCH_MAX);
    };

    const fireAtCentre = () => {
      s.ray.setFromCamera(s.centre, camera);
      const hits = s.ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o: Object3D | null = h.object;
        while (o) {
          const it = o.userData?.interact as
            | { kind: "station"; index: number }
            | { kind: "guest"; id: number }
            | undefined;
          if (it) {
            const g = useGame.getState();
            if (it.kind === "station") g.smotherFire(it.index);
            else if (it.kind === "guest") g.flagGuest(it.id);
            return;
          }
          o = o.parent;
        }
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button === 2) {
        inspect.current = true;
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;
      const g = useGame.getState();
      if (g.phase !== "service" || g.paused || !g.firstPerson) return;
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
        return;
      }
      fireAtCentre();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 2) inspect.current = false;
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowLeft") keys.current.left = down;
      else if (k === "ArrowRight") keys.current.right = down;
      else if (k === "ArrowUp") keys.current.fwd = down;
      else if (k === "ArrowDown") keys.current.back = down;
      else return;
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);

    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      document.body.classList.remove("pointer-locked");
    };
  }, [camera, gl, scene]);

  useFrame(({ clock }, dt) => {
    const s = useGame.getState();
    const d = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const sc = scratch.current;

    // --- shimmy along the pass; arrows only, so S/B/X stay verbs
    const k = keys.current;
    strafe.current = clamp(
      strafe.current + ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * d * 1.25,
      -1.5,
      1.5
    );
    lean.current = clamp(
      lean.current + ((k.back ? 1 : 0) - (k.fwd ? 1 : 0)) * d * 0.6,
      -0.35,
      0.55
    );

    // --- blend: dolly in on service, back out on the review card
    const want = s.phase === "service" && s.firstPerson ? 1 : 0;
    blend.current += (want - blend.current) * (1 - Math.exp(-d * 4.5));
    if (blend.current < 0.002) blend.current = 0;
    if (blend.current > 0.998) blend.current = 1;

    // --- shake reads in both cameras
    const sinceScream = s.screamAt ? performance.now() - s.screamAt : Infinity;
    const sinceSmash = s.smashAt ? performance.now() - s.smashAt : Infinity;
    const shake =
      (sinceScream < 700 ? (1 - sinceScream / 700) * 0.16 : 0) +
      (sinceSmash < 450 ? (1 - sinceSmash / 450) * 0.09 : 0);

    // --- menu camera: the old diorama shot
    sc.menuPos.set(0, MENU_Y, MENU_Z + shake * 0.4);
    sc.menuPos.x = Math.sin(t * 55) * shake;
    sc.menuPos.y = MENU_Y + Math.cos(t * 47) * shake * 0.6;
    sc.dummy.position.copy(sc.menuPos);
    sc.dummy.lookAt(0, 1.6, -2);
    sc.qMenu.copy(sc.dummy.quaternion);

    // --- first-person camera: eye level at the pass, breathing + bob
    const live = s.tickets.filter((x) => x.state !== "done").length;
    const amped = s.serviceTime < s.adrenalineTil;
    const bobSpeed = 2.1 + (amped ? 2.2 : 0) + Math.min(2.4, live * 0.22);
    const bobAmt = 0.006 + Math.min(0.012, live * 0.0014);
    const bob = Math.sin(t * bobSpeed) * bobAmt + Math.sin(t * bobSpeed * 2.13) * bobAmt * 0.4;
    sc.fpPos.set(
      strafe.current + Math.sin(t * 55) * shake * 0.5,
      EYE + bob + Math.cos(t * 47) * shake * 0.35,
      STAND_Z + lean.current + shake * 0.2
    );
    const roll = Math.sin(t * 61) * shake * 0.5;
    sc.euler.set(pitch.current, yaw.current, roll);
    sc.qFp.setFromEuler(sc.euler);

    // --- commit
    sc.camPos.copy(sc.menuPos).lerp(sc.fpPos, blend.current);
    camera.position.copy(sc.camPos);
    camera.quaternion.copy(sc.qMenu).slerp(sc.qFp, blend.current);

    const pc = camera as PerspectiveCamera;
    const fov = FOV_MENU + (FOV_FP - FOV_MENU) * blend.current;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }

    // --- hands ride the camera, always slightly below the eyeline
    lift.current += ((inspect.current ? 1 : 0) - lift.current) * (1 - Math.exp(-d * 9));
    const lv = lift.current;
    const h = hands.current;
    if (h) {
      h.visible = blend.current > 0.15;
      h.position.copy(camera.position);
      h.quaternion.copy(camera.quaternion);
      h.translateY(-0.26 + lv * 0.05 - (1 - blend.current) * 0.5);
      h.translateZ(-0.55);
      h.rotateX(-0.04 + Math.sin(t * bobSpeed) * 0.008);
      h.rotateZ(Math.sin(t * 1.7) * 0.006);
    }

    // --- the plate in hand: hold RMB to raise it and turn it to your eye
    const pg = plate.current;
    if (pg) {
      const has = s.phase === "service" && s.tickets.some((x) => x.state === "pass");
      pg.visible = has;
      const ty = 0.04 + lv * 0.11;
      const tz = -0.3 + lv * 0.04;
      pg.position.y += (ty - pg.position.y) * 0.3;
      pg.position.z += (tz - pg.position.z) * 0.3;
      pg.rotation.x += (0.12 + lv * 0.72 - pg.rotation.x) * 0.3;
      const sc2 = pg.scale.x + (1 + lv * 0.18 - pg.scale.x) * 0.3;
      pg.scale.setScalar(sc2);
    }

    // --- what the reticle is on: fires, guests, or plain counter
    aimTick.current += d;
    if (aimTick.current >= 0.08) {
      aimTick.current = 0;
      let kind: "fire" | "guest" | "station" | null = null;
      if (s.phase === "service" && s.firstPerson && !s.paused) {
        camera.updateMatrixWorld();
        sc.ray.setFromCamera(sc.centre, camera);
        const hits = sc.ray.intersectObjects(scene.children, true);
        search: for (const hit of hits) {
          let o: Object3D | null = hit.object;
          while (o) {
            const it = o.userData?.interact as
              | { kind: "station"; index: number }
              | { kind: "guest"; id: number }
              | undefined;
            if (it) {
              if (it.kind === "station") {
                kind = s.cooks[it.index]?.burning ? "fire" : "station";
              } else if (!s.criticFlagged) {
                kind = "guest";
              }
              break search;
            }
            o = o.parent;
          }
        }
      }
      s.setAim(kind);
    }
  });

  // The dish on the hand plate follows the current pass ticket.
  const pass = useGame((s) => s.tickets.find((x) => x.state === "pass"));
  const tier = pass ? tierOf(pass.quality) : "serviceable";

  return (
    <group ref={hands} visible={false}>
      <Hand side={-1} />
      <Hand side={1} />

      {/* the pass plate, held level until you raise it */}
      <group ref={plate} position={[0, 0.04, -0.3]} rotation={[0.12, 0, 0]} visible={false}>
        <mesh castShadow>
          <cylinderGeometry args={[0.148, 0.13, 0.016, 26]} />
          <meshStandardMaterial color="#cfcac0" roughness={0.45} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.009, 0]}>
          <cylinderGeometry args={[0.112, 0.112, 0.006, 26]} />
          <meshStandardMaterial color="#e6dfd0" roughness={0.65} />
        </mesh>
        {pass && DISH_SPRITE[pass.dish] && tier !== "criminal" ? (
          <DishDecal
            url={DISH_SPRITE[pass.dish]}
            dim={tier === "serviceable"}
            size={0.235}
            lift={0.022}
            crop={0.8}
          />
        ) : (
          <mesh ref={lump} position={[0, 0.04, 0]}>
            {tier === "criminal" ? (
              <sphereGeometry args={[0.055, 10, 8]} />
            ) : (
              <cylinderGeometry args={[0.065, 0.085, 0.035, 14]} />
            )}
            <meshStandardMaterial
              color={tier === "criminal" ? "#1a120c" : tier === "pristine" ? "#c9803a" : "#8a6a44"}
              roughness={0.75}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** A hand and forearm coming up from the bottom of frame, under the plate. */
function Hand({ side }: { side: -1 | 1 }) {
  return (
    <group
      position={[side * 0.17, -0.05, -0.1]}
      rotation={[-1.15, 0, side * 0.22]}
    >
      {/* sleeve, off the bottom of the frame */}
      <mesh position={[0, -0.21, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.26, 4, 10]} />
        <meshStandardMaterial color={SLEEVE} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.057, 0.057, 0.05, 12]} />
        <meshStandardMaterial color={CUFF} roughness={0.9} />
      </mesh>
      {/* forearm */}
      <mesh position={[0, 0.045, 0]} castShadow>
        <capsuleGeometry args={[0.041, 0.1, 4, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* palm under the rim */}
      <mesh position={[0, 0.125, 0]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[0.095, 0.026, 0.11]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* thumb */}
      <mesh position={[side * -0.052, 0.132, -0.032]} rotation={[0, 0, side * 0.9]}>
        <capsuleGeometry args={[0.015, 0.045, 4, 6]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* fingers over the rim */}
      {[-0.03, 0, 0.03].map((fx) => (
        <mesh key={fx} position={[fx, 0.135, -0.062]} rotation={[-1.35, 0, 0]}>
          <capsuleGeometry args={[0.011, 0.05, 4, 6]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
