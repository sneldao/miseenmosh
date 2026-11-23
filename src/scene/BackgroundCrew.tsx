/**
 * The rest of the brigade.
 *
 * The three cooks were the only movers in a kitchen built for a dozen: the
 * commis and the porter ran BEHIND the player's back, and the two runners'
 * event jobs fire on deliveries, so mid-service the room read as three
 * bodies and a wall. This is the background cast that fills the back-of-house
 * strip the restage opened up behind the line — the pot-wash bay on the left
 * flank, the prep bench behind the plates, the crate corner on the right.
 *
 * Three rules, all of them consequences of where these bodies stand:
 *
 *  1. Amplitude is set by distance, not by taste. A figure at 7 m is 0.0022
 *     rad per pixel, so a gesture under ~0.15 m of travel lands under 8 px and
 *     reads as a still. Guests do ±0.12 rad on a 0.3 m shoulder at 10 m —
 *     about 1.6 px, which is why they were reported as "completely static".
 *     Every motion here moves a hand or a shoulder by 0.15–0.45 m.
 *  2. No shared metronome. Periods are deliberately coprime (2.6 s scrub,
 *     1.45 s chop, 7.3 s crate) and each body starts at its own phase, so the
 *     room never pulses together — a room breathing in unison is more
 *     obviously fake than a still one.
 *  3. They are life, not state. Nothing here reads the game; they freeze with
 *     a pause, freeze under reduced motion, and never jump on resume. Their
 *     own clocks advance on frame delta, so they keep working while the
 *     service clock waits on the player.
 */

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, Color } from "three";
import { useGame } from "../game/state";
import { CREAM, INK, useReducedMotion } from "./artDirection";
import { hash01 } from "./idleLoops";

const SKIN = ["#c99772", "#a9754f", "#8a5a3c", "#d8a882"];
const CLOTH = ["#dcd2bc", "#c8d4cc", "#e2cfae", "#cfc6d8"];

/** Body masses only — no rig, no GLB. At 6–8 m these read as people because
 *  of silhouette and cadence, and they cost one draw call per material. */
function Figure({
  shirt,
  skin,
  apron,
  height = 1.72,
  build = 1,
}: {
  shirt: string;
  skin: string;
  apron: string;
  height?: number;
  build?: number;
}) {
  const s = height / 1.72;
  return (
    <group scale={[s * build, s, s * build]}>
      {/* legs */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.36, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.5, 4, 8]} />
          <meshStandardMaterial color={INK} roughness={0.95} />
        </mesh>
      ))}
      {/* torso */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.42, 4, 12]} />
        <meshStandardMaterial color={shirt} roughness={0.9} />
      </mesh>
      {/* apron panel */}
      <mesh position={[0, 0.86, 0.17]}>
        <boxGeometry args={[0.34, 0.56, 0.03]} />
        <meshStandardMaterial color={apron} roughness={0.95} />
      </mesh>
      {/* head + cloth cap */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.125, 14, 12]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.52, -0.01]}>
        <cylinderGeometry args={[0.115, 0.125, 0.09, 12]} />
        <meshStandardMaterial color={CREAM} roughness={1} />
      </mesh>
    </group>
  );
}

/** one arm as a shoulder pivot so its whole swing is one rotation */
function Arm({
  side,
  shirt,
  skin,
  refCb,
}: {
  side: 1 | -1;
  shirt: string;
  skin: string;
  refCb: (g: Group | null) => void;
}) {
  return (
    <group ref={refCb} position={[side * 0.235, 1.16, 0]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.2, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.34, 0]}>
        <capsuleGeometry args={[0.05, 0.16, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
    </group>
  );
}

type Kind = "wash" | "stock" | "crate" | "carry";

interface WorkerSpec {
  kind: Kind;
  x: number;
  z: number;
  /** A body's front is its local +z, so yaw 0 faces the player and yaw PI has
   *  it working with its back to the room — which is how you stand at a sink. */
  yaw: number;
  seed: number;
}

/**
 * Where a body can actually be seen is a measured question, not a taste one.
 * This strip is 5.3 m deep to the line's backs and its visibility is cut up by
 * three station counters, a pan rack, the pass rail's dockets and the three
 * cooks themselves. Each spot below was picked by sampling a 3×6 grid of points
 * up the body (0.55 m to 1.55 m) and raycasting the live scene: a spot counts
 * as open only where nothing sits between the camera and the body. The centres
 * of the three stations score ~11% (the cooks block them, correctly); the two
 * gaps at x ≈ ±1 and the two flanks score 83–100%. That is why these bodies
 * stand where they do.
 */
const WORKERS: WorkerSpec[] = [
  // the pot-wash bay, left flank. The sink table centre is (-6.0, -4.3), so he
  // stands in front of it facing it: back to the room, hands in the basin.
  { kind: "wash", x: -6.0, z: -3.55, yaw: Math.PI, seed: 11 },
  // the gap left of centre, at the back bench — carrying a stack of pans in
  // profile, which is the one silhouette the three cooks never make
  { kind: "carry", x: -2.6, z: -4.2, yaw: 1.4, seed: 41 },
  // the back-bar shelf on the right: reach up, set a bottle down, straighten.
  // The shelf is real geometry, so these hands have something to work on.
  { kind: "stock", x: 3.3, z: -3.55, yaw: Math.PI - 0.15, seed: 67 },
  // the crate corner, right flank — slow lift, set down, straighten
  { kind: "crate", x: 6.05, z: -3.25, yaw: -0.6, seed: 37 },
];

/** the whole background crew: three bodies, three cadences, no shared clock */
export default function BackgroundCrew() {
  return (
    <group name="background-crew">
      {WORKERS.map((w, i) => (
        <Worker key={i} spec={w} />
      ))}
    </group>
  );
}

function Worker({ spec }: { spec: WorkerSpec }) {
  const reduced = useReducedMotion();
  const shirt = useMemo(() => CLOTH[spec.seed % CLOTH.length], [spec.seed]);
  const skin = useMemo(() => SKIN[(spec.seed >> 2) % SKIN.length], [spec.seed]);
  const apron = useMemo(() => {
    const c = new Color(CLOTH[(spec.seed + 1) % CLOTH.length]);
    return `#${c.offsetHSL(0, 0.05, -0.18).getHexString()}`;
  }, [spec.seed]);

  const root = useRef<Group>(null);
  const setArmR = useCallback((g: Group | null) => { armR.current = g; }, []);
  const setArmL = useCallback((g: Group | null) => { armL.current = g; }, []);
  const armR = useRef<Group | null>(null);
  const armL = useRef<Group | null>(null);
  const prop = useRef<Group>(null);
  const life = useRef(0);
  /** start each body somewhere else in its own cycle */
  const phase0 = useMemo(() => hash01(spec.seed, 7, 13) * 6.283, [spec.seed]);

  useFrame((_, dt) => {
    const st = useGame.getState();
    const g = root.current;
    if (!g) return;
    // their own clock: the service clock stops in the opening hold, these
    // bodies do not. They do freeze with a pause, like the guests.
    if (!st.paused && st.phase !== "title" && !reduced) life.current += Math.min(dt, 0.05);
    const t = life.current + phase0;

    const a1 = armR.current;
    const a2 = armL.current;
    if (!a1 || !a2) return;

    if (spec.kind === "wash") {
      // 2.6 s scrub: shoulders drive, forearms follow, torso pumps with it
      const c = Math.sin(t * 2.42);
      const c2 = Math.sin(t * 2.42 + 1.1);
      a1.rotation.x = -1.18 + c * 0.34;
      a1.rotation.z = -0.2 + c * 0.1;
      a2.rotation.x = -1.05 + c2 * 0.3;
      a2.rotation.z = 0.16 - c2 * 0.08;
      g.rotation.x = 0.06 + Math.max(0, c) * 0.05;
      g.position.y = Math.abs(c) * 0.012;
    } else if (spec.kind === "stock") {
      // 3.4 s stock: reach to the shelf, set the bottle down, come back down.
      // The reach is a whole-body move — heels up, shoulder up, elbow last.
      const cyc = (t / 3.4) % 1;
      const reach =
        cyc < 0.35 ? Math.sin((cyc / 0.35) * Math.PI * 0.5)
        : cyc < 0.55 ? 1
        : cyc < 0.9 ? Math.cos(((cyc - 0.55) / 0.35) * Math.PI * 0.5)
        : 0;
      const elbow = Math.sin(Math.min(1, Math.max(0, (cyc - 0.15) / 0.5)) * Math.PI);
      a1.rotation.x = -0.35 - reach * 1.55;
      a1.rotation.z = -0.16 - elbow * 0.08;
      a2.rotation.x = -0.3 - reach * 1.42;
      a2.rotation.z = 0.14 + elbow * 0.06;
      g.position.y = reach * 0.035;
      g.rotation.x = 0.04 - reach * 0.05;
    } else if (spec.kind === "carry") {
      // 5.1 s carry: both hands under a stack of pans, weight shifting from
      // one foot to the other, the stack taking the sway a beat later
      const sway = Math.sin(t * 1.23);
      const lag = Math.sin(t * 1.23 - 0.5);
      a1.rotation.x = -0.72 + lag * 0.05;
      a1.rotation.z = -0.3 + sway * 0.06;
      a2.rotation.x = -0.72 + lag * 0.05;
      a2.rotation.z = 0.3 - sway * 0.06;
      g.rotation.z = sway * 0.03;
      g.position.y = Math.abs(sway) * -0.012;
      if (prop.current) {
        prop.current.position.y = 1.0 + lag * 0.014;
        prop.current.rotation.z = -sway * 0.05;
      }
    } else {
      // 7.3 s crate cycle: stoop, lift, hold, set down, straighten
      const cyc = (t / 7.3) % 1;
      const stoop = cyc < 0.28 ? Math.sin((cyc / 0.28) * Math.PI * 0.5) : cyc < 0.62 ? 1 : Math.max(0, 1 - (cyc - 0.62) / 0.3);
      g.rotation.x = 0.05 + stoop * 0.42;
      g.position.y = -stoop * 0.16;
      a1.rotation.x = -0.5 - stoop * 0.75;
      a1.rotation.z = -0.18 + stoop * 0.06;
      a2.rotation.x = -0.5 - stoop * 0.75;
      a2.rotation.z = 0.18 - stoop * 0.06;
      if (prop.current) {
        // the crate rides his hands
        prop.current.position.y = 0.62 + stoop * 0.34;
        prop.current.position.z = 0.22 + stoop * 0.08;
        prop.current.rotation.x = stoop * 0.2;
      }
    }
  });

  return (
    <group ref={root} position={[spec.x, 0, spec.z]} rotation={[0, spec.yaw, 0]}>
      <Figure shirt={shirt} skin={skin} apron={apron} height={spec.kind === "crate" ? 1.78 : 1.7} />
      <Arm side={1} shirt={shirt} skin={skin} refCb={setArmR} />
      <Arm side={-1} shirt={shirt} skin={skin} refCb={setArmL} />
      {spec.kind === "crate" && (
        <group ref={prop} position={[0, 0.62, 0.22]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.3, 0.34]} />
            <meshStandardMaterial color="#8a6a3a" roughness={0.95} />
          </mesh>
        </group>
      )}
      {spec.kind === "carry" && (
        // a stack of two pans held out in front, riding the sway
        <group ref={prop} position={[0, 1.0, 0.3]}>
          {[0, 0.07].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} rotation={[0, i * 0.4, 0]}>
              <cylinderGeometry args={[0.17, 0.15, 0.06, 14]} />
              <meshStandardMaterial color="#6a6f74" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
      {spec.kind === "wash" && (
        // a pan in the basin, tilted — reads as "there is work in his hands".
        // Local +z is the way he faces, so it sits in the sink in front of him.
        <mesh position={[0.06, 0.9, 0.34]} rotation={[0.4, 0.2, 0.1]}>
          <cylinderGeometry args={[0.13, 0.11, 0.06, 14]} />
          <meshStandardMaterial color="#6a6f74" metalness={0.5} roughness={0.42} />
        </mesh>
      )}
    </group>
  );
}

/** Kept for the mood/glyph work: a body's colours are its only identity here,
 *  so the palette lives in one place. */
export const CREW_PALETTE = { SKIN, CLOTH };
