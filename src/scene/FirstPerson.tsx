import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Euler,
  Group,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { useGame, type Ticket } from "../game/state";
import FoodModel from "./FoodModel";
import PlateCorrection from "./PlateCorrection";
import { INK, useReducedMotion } from "./artDirection";
import { canStartOrder } from "../game/culinary";

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
const MENU_Y = 3.6;
const MENU_Z = 7.3;
const YAW_MAX = 1.15; // ~66° each way — the room, not a free-look camera
const PITCH_MIN = -0.82;
const PITCH_MAX = 0.55;
const FOV_MENU = 40;
const FOV_FP = 66;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Interact =
  | { kind: "station"; index: number }
  | { kind: "guest"; id: number }
  | { kind: "ticket"; id: number }
  | { kind: "plate"; id: number };

/** A docket can only be started when its own station slot is free —
 *  a held pass plate doesn't block a fresh call. */
const canPullTicket = (g: { tickets: Pick<Ticket, "id" | "station" | "state">[] }, id: number) =>
  canStartOrder(g.tickets, id);

const SKIN = "#c99772";
const SLEEVE = "#2a2320";
const CUFF = "#f2ead6";

export default function FirstPerson() {
  const { camera, scene, gl } = useThree();
  const hands = useRef<Group>(null);
  const plate = useRef<Group>(null);

  const yaw = useRef(0);
  const pitch = useRef(0);
  const strafe = useRef(0);
  const lean = useRef(0);
  const blend = useRef(0);
  const inspBlend = useRef(0);
  const introFocus = useRef(0);
  const lift = useRef(0);
  const locked = useRef(false);
  const aimTick = useRef(0);
  const keys = useRef({ left: false, right: false, fwd: false, back: false });
  const reduced = useReducedMotion();

  const scratch = useRef({
    inspPos: new Vector3(0, 2.6, 4.3),
    qInsp: new Quaternion(),
    menuPos: new Vector3(),
    fpPos: new Vector3(),
    camPos: new Vector3(),
    qMenu: new Quaternion(),
    focusPos: new Vector3(-3.15, 2.1, -1.8),
    qFocus: new Quaternion(),
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
      const g = useGame.getState();
      if (g.inspecting) {
        g.turnPlate(e.movementX * 0.015);
        return;
      }
      yaw.current = clamp(yaw.current - e.movementX * 0.0022, -YAW_MAX, YAW_MAX);
      pitch.current = clamp(pitch.current - e.movementY * 0.002, PITCH_MIN, PITCH_MAX);
    };

    const fireAtCentre = () => {
      s.ray.setFromCamera(s.centre, camera);
      const hits = s.ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o: Object3D | null = h.object;
        while (o) {
          const it = o.userData?.interact as Interact | undefined;
          if (it) {
            const g = useGame.getState();
            if (it.kind === "station") {
              // a real fire smothers first; otherwise take that station's
              // ready plate, else aim and fire whatever it's cooking
              if (g.cooks[it.index]?.burning) g.smotherFire(it.index);
              else {
                const ready = g.tickets.find((t) => t.station === it.index && t.state === "ready");
                if (ready) g.collectPlate(ready.id);
                else {
                  const cooking = g.tickets.find((t) => t.station === it.index && t.state === "plating");
                  if (cooking) {
                    g.selectTicket(cooking.id);
                    g.firePlate(cooking.id);
                  }
                }
              }
            } else if (it.kind === "guest") g.flagGuest(it.id);
            else if (it.kind === "plate") {
              const pt = g.tickets.find((t) => t.id === it.id);
              if (pt?.state === "ready") g.collectPlate(it.id);
              else if (pt?.state === "pass") g.setInspecting(!g.inspecting);
            } else if (it.kind === "ticket") g.plateToPass(it.id);
            return;
          }
          o = o.parent;
        }
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button === 2) {
        useGame.getState().setInspecting(true);
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;
      const g = useGame.getState();
      if (g.phase !== "service" || g.paused || !g.firstPerson) return;
      if (document.pointerLockElement !== canvas) {
        try {
          const lock = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
          lock?.catch?.(() => {
            const g = useGame.getState();
            if (g.firstPerson) g.toggleFirstPerson();
          });
        } catch {
          const g = useGame.getState();
          if (g.firstPerson) g.toggleFirstPerson();
        }
        return;
      }
      fireAtCentre();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 2) useGame.getState().setInspecting(false);
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
    const onBlur = () => useGame.getState().setInspecting(false);
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);

    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", onBlur);
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
    const shake = reduced
      ? 0
      : (sinceScream < 700 ? (1 - sinceScream / 700) * 0.16 : 0) +
        (sinceSmash < 450 ? (1 - sinceSmash / 450) * 0.09 : 0);

    // --- menu camera: the old diorama shot
    sc.menuPos.set(0, MENU_Y, MENU_Z + shake * 0.4);
    sc.menuPos.x = Math.sin(t * 55) * shake;
    sc.menuPos.y = MENU_Y + Math.cos(t * 47) * shake * 0.6;
    sc.dummy.position.copy(sc.menuPos);
    sc.dummy.lookAt(0, 1.35, -1.4);
    sc.qMenu.copy(sc.dummy.quaternion);

    // --- opening close view: the first called order leans the menu camera
    // into Petra's workspace so the action teaches itself; collect /
    // send-back / endintro / manual FP all release it. Mouse stays free.
    const focusWanted =
      s.phase === "service" &&
      !s.firstPerson &&
      s.openingStep === "judge" &&
      s.tickets.some((t) => t.station === 0 && (t.state === "plating" || t.state === "ready")) &&
      !!scene.getObjectByName("PetraWorkspace");
    if (!s.paused)
      introFocus.current = reduced
        ? focusWanted ? 1 : 0
        : introFocus.current + ((focusWanted ? 1 : 0) - introFocus.current) * (1 - Math.exp(-d * 3.5));
    sc.dummy.position.copy(sc.focusPos);
    sc.dummy.lookAt(-3.42, 1.5, -3.64);
    sc.qFocus.copy(sc.dummy.quaternion);
    sc.menuPos.lerp(sc.focusPos, introFocus.current);
    sc.qMenu.slerp(sc.qFocus, introFocus.current);

    // --- first-person camera: eye level at the pass, breathing + bob
    const live = s.tickets.filter((x) => x.state !== "done").length;
    const amped = s.serviceTime < s.adrenalineTil;
    const bobSpeed = 2.1 + (amped ? 2.2 : 0) + Math.min(2.4, live * 0.22);
    const bobAmt = 0.006 + Math.min(0.012, live * 0.0014);
    const bob = reduced
      ? 0
      : Math.sin(t * bobSpeed) * bobAmt + Math.sin(t * bobSpeed * 2.13) * bobAmt * 0.4;
    sc.fpPos.set(
      strafe.current + Math.sin(t * 55) * shake * 0.5,
      EYE + bob + Math.cos(t * 47) * shake * 0.35,
      STAND_Z + lean.current + shake * 0.2
    );
    const roll = Math.sin(t * 61) * shake * 0.5;
    sc.euler.set(pitch.current, yaw.current, roll);
    sc.qFp.setFromEuler(sc.euler);

    // --- inspection framing: over the shoulder, down at the held plate
    inspBlend.current += ((s.inspecting ? 1 : 0) - inspBlend.current) * (1 - Math.exp(-d * 6));
    const ib = inspBlend.current;
    sc.dummy.position.copy(sc.inspPos);
    sc.dummy.lookAt(0, 1.25, 2.2);
    sc.qInsp.copy(sc.dummy.quaternion);

    // --- commit
    sc.camPos.copy(sc.menuPos).lerp(sc.fpPos, blend.current).lerp(sc.inspPos, ib);
    camera.position.copy(sc.camPos);
    camera.quaternion.copy(sc.qMenu).slerp(sc.qFp, blend.current).slerp(sc.qInsp, ib);

    const pc = camera as PerspectiveCamera;
    const fovMenu = FOV_MENU + (50 - FOV_MENU) * introFocus.current;
    const fov =
      (fovMenu + (FOV_FP - fovMenu) * blend.current) * (1 - ib) + 40 * ib;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }

    // --- hands ride the camera, always slightly below the eyeline
    lift.current += ((s.inspecting ? 1 : 0) - lift.current) * (1 - Math.exp(-d * 9));
    const lv = lift.current;
    const h = hands.current;
    if (h) {
      h.visible = blend.current > 0.15;
      h.position.copy(camera.position);
      h.quaternion.copy(camera.quaternion);
      h.translateY(-0.26 + lv * 0.05 - (1 - blend.current) * 0.5);
      h.translateZ(-0.55);
      h.rotateX(-0.04 + (reduced ? 0 : Math.sin(t * bobSpeed) * 0.008));
      h.rotateZ(reduced ? 0 : Math.sin(t * 1.7) * 0.006);
    }

    // --- the plate in hand: hold RMB to raise it and turn it to your eye
    const pg = plate.current;
    if (pg) {
      const has = s.phase === "service" && s.tickets.some((x) => x.state === "pass");
      pg.visible = has;
      // frame-time ease: the lift moves at the same speed at any fps, and a
      // paused frame (d=0) stops the plate dead instead of creeping
      const poseEase = 1 - Math.exp(-18 * d);
      const ty = 0.04 + lv * 0.11;
      const tz = -0.3 + lv * 0.04;
      pg.position.y += (ty - pg.position.y) * poseEase;
      pg.position.z += (tz - pg.position.z) * poseEase;
      pg.rotation.x += (0.12 + lv * 0.72 - pg.rotation.x) * poseEase;
      pg.rotation.y += ((s.inspecting ? s.inspectionTurn : 0) - pg.rotation.y) * poseEase;
      const sc2 = pg.scale.x + (1 + lv * 0.18 - pg.scale.x) * poseEase;
      pg.scale.setScalar(sc2);
      // palms ride up with the rim as the plate lifts — a small fixed offset,
      // not a stretched hand
      supportHands.current?.position.set(
        0,
        Math.max(0, pg.position.y - 0.04) * (0.065 / 0.11),
        Math.max(0, pg.position.z + 0.3) * 0.5
      );
    }

    // --- what the reticle is on: fires, guests, or plain counter
    aimTick.current += d;
    if (aimTick.current >= 0.08) {
      aimTick.current = 0;
      let kind: "fire" | "guest" | "ticket" | "station" | "ready" | "held" | "cooking" | null = null;
      if (s.phase === "service" && s.firstPerson && !s.paused) {
        camera.updateMatrixWorld();
        sc.ray.setFromCamera(sc.centre, camera);
        const hits = sc.ray.intersectObjects(scene.children, true);

        search: for (const hit of hits) {
          let o: Object3D | null = hit.object;
          while (o) {
            const it = o.userData?.interact as Interact | undefined;
            if (it) {
              if (it.kind === "station") {
                kind = s.cooks[it.index]?.burning
                  ? "fire"
                  : s.tickets.some((x) => x.station === it.index && x.state === "ready")
                    ? "ready"
                    : s.tickets.some((x) => x.station === it.index && x.state === "plating")
                      ? "cooking"
                      : "station";
              } else if (it.kind === "guest") {
                if (!s.criticFlagged) kind = "guest";
              } else if (it.kind === "plate") {
                const pt = s.tickets.find((x) => x.id === it.id);
                kind = pt?.state === "ready" ? "ready" : pt?.state === "pass" ? "held" : null;
              } else if (it.kind === "ticket") {
                // a docket is only actionable while its own station slot is free
                kind = canPullTicket(s, it.id) ? "ticket" : "station";
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
  const correction = useGame((s) => s.correction);
  const correcting = !!pass && correction?.ticketId === pass.id;
  const supportHands = useRef<Group>(null);

  return (
    <group ref={hands} visible={false}>
      <group ref={supportHands}>
        <Hand side={-1} />
        {!correcting && <Hand side={1} />}
      </group>

      {/* the pass plate, held level until you raise it */}
      <group ref={plate} position={[0, 0.04, -0.3]} rotation={[0.12, 0, 0]} visible={false}>
        <mesh castShadow>
          <cylinderGeometry args={[0.148, 0.13, 0.016, 26]} />
          <meshStandardMaterial color="#f2ead6" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.011, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.128, 0.005, 6, 28]} />
          <meshStandardMaterial color="#286e70" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.009, 0]}>
          <cylinderGeometry args={[0.112, 0.112, 0.006, 26]} />
          <meshStandardMaterial color="#f8f0dc" roughness={0.65} />
        </mesh>
        {pass && (
          <group
            position={[0, 0.014, 0]}
            userData={{ interact: { kind: "plate", id: pass.id } }}
            onClick={(e) => {
              e.stopPropagation();
              if (document.pointerLockElement) return; // centre-ray already handled it
              useGame.getState().setInspecting(!useGame.getState().inspecting);
            }}
          >
            <FoodModel dish={pass.dish} quality={pass.quality} sauce={pass.sauce} condition={pass.condition} scale={0.27} />
            {correcting && <PlateCorrection foodScale={0.27} toolScale={0.55} />}
          </group>
        )}
      </group>
    </group>
  );
}

/** A hand and forearm coming up from the bottom of frame, under the plate.
 *  Mitten palm + separate thumb + shaped cuff — closed surfaces, ink cuffs. */
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
      {/* shaped cuff: ink band inside folded cream */}
      <mesh position={[0, -0.055, 0]} scale={[1.1, 1, 1.05]}>
        <cylinderGeometry args={[0.058, 0.062, 0.055, 12]} />
        <meshStandardMaterial color={CUFF} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.028, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.012, 12]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      {/* forearm */}
      <mesh position={[0, 0.045, 0]} castShadow>
        <capsuleGeometry args={[0.041, 0.1, 4, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* mitten palm: a curved pad under the rim, thumb separate */}
      <group position={[0, 0.12, -0.01]} rotation={[0.3, 0, side * -0.1]}>
        <mesh scale={[1, 0.42, 1.2]} castShadow>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        {/* finger pad folded over the rim — one curved mass, no blocks */}
        <mesh position={[side * -0.01, 0.008, -0.06]} rotation={[0.9, 0, 0]} scale={[1.05, 0.5, 0.9]}>
          <sphereGeometry args={[0.042, 10, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
      </group>
      {/* separate thumb, wrapped */}
      <mesh position={[side * -0.05, 0.125, -0.02]} rotation={[0.4, side * 0.5, side * 1.05]} scale={[1, 1, 1.15]}>
        <capsuleGeometry args={[0.016, 0.05, 4, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
    </group>
  );
}
