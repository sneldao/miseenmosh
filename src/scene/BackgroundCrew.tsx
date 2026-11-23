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
 * Rules, all of them consequences of where these bodies stand:
 *
 *  1. Amplitude is set by distance, not by taste. A figure at 7 m is 0.0022
 *     rad per pixel, so a gesture under ~0.15 m of travel lands under 8 px and
 *     reads as a still. Guests do ±0.12 rad on a 0.3 m shoulder at 10 m —
 *     about 1.6 px, which is why they were reported as "completely static".
 *     Every motion here moves a hand or a shoulder by 0.15–0.45 m.
 *  2. No shared metronome. Periods are deliberately coprime (2.6 s scrub,
 *     3.4 s shelf, 5.1 s carry, 7.3 s crate) and each body starts at its own
 *     phase, so the room never pulses together — a room breathing in unison is
 *     more obviously fake than a still one.
 *  3. They are life, not state. Nothing here reads the game; they freeze with
 *     a pause, freeze under reduced motion, and never jump on resume. Their
 *     own clocks advance on frame delta, so they keep working while the
 *     service clock waits on the player. The one exception is the pass bell:
 *     a body looking up when a plate leaves the pass costs one number and buys
 *     a room that notices the player.
 *  4. Three meshes and a prop per body, not eleven. Each figure's static mass
 *     is merged into one vertex-coloured geometry (one draw call), the head
 *     and the two arms stay separate because they move, and nothing here casts
 *     a shadow — these bodies stand behind the line, where their shadows would
 *     land on the backs of counters and cost 40 more draws a frame to not be
 *     seen.
 */

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  SphereGeometry,
  BoxGeometry,
  CapsuleGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useGame } from "../game/state";
import { CREAM, INK, useReducedMotion } from "./artDirection";
import { hash01 } from "./idleLoops";

const SKIN = ["#c99772", "#a9754f", "#8a5a3c", "#d8a882"];

type Kind = "wash" | "stock" | "crate" | "carry";

/** One body's look. Silhouette does the work at 6–8 m: a cap or a bun, a
 *  stocky build against a thin one, sleeves rolled or not, and an apron that
 *  crosses at the back. Colour alone reads as a palette; shape reads as people. */
interface Look {
  height: number;
  build: number;
  shirt: string;
  apron: string;
  trouser: string;
  hair: "cap" | "bun" | "crop" | "bandana";
  rolledSleeves: boolean;
}

interface WorkerSpec {
  kind: Kind;
  x: number;
  z: number;
  /** A body's front is its local +z, so yaw 0 faces the player and yaw PI has
   *  it working with its back to the room — which is how you stand at a sink. */
  yaw: number;
  seed: number;
  look: Look;
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
  {
    kind: "wash", x: -6.0, z: -3.55, yaw: Math.PI, seed: 11,
    look: { height: 1.64, build: 1.16, shirt: "#cdd6cf", apron: "#8f9c92", trouser: "#2f3338", hair: "cap", rolledSleeves: true },
  },
  // the gap left of centre, at the back bench — carrying a stack of pans in
  // profile, which is the one silhouette the three cooks never make
  {
    kind: "carry", x: -2.6, z: -4.2, yaw: 1.4, seed: 41,
    look: { height: 1.78, build: 0.94, shirt: "#dccfb2", apron: "#3f5f63", trouser: "#33302c", hair: "bun", rolledSleeves: false },
  },
  // the back-bar shelf on the right: reach up, set a bottle down, straighten.
  // The shelf is real geometry, so these hands have something to work on.
  {
    kind: "stock", x: 3.3, z: -3.55, yaw: Math.PI - 0.15, seed: 67,
    look: { height: 1.70, build: 1.0, shirt: "#e3d7bd", apron: "#9aa2a8", trouser: "#2b2e33", hair: "bandana", rolledSleeves: true },
  },
  // the crate corner, right flank — slow lift, set down, straighten
  {
    kind: "crate", x: 6.05, z: -3.25, yaw: -0.6, seed: 37,
    look: { height: 1.84, build: 1.1, shirt: "#c9c3b4", apron: "#7c6a52", trouser: "#33302a", hair: "crop", rolledSleeves: false },
  },
];

/** one geometry part, colour baked into vertex colours so a whole body is one
 *  draw call instead of eleven */
function part(
  geo: BufferGeometry,
  color: string,
  at: [number, number, number],
  rot?: [number, number, number],
): BufferGeometry {
  const g = geo.clone();
  if (rot) {
    if (rot[0]) g.rotateX(rot[0]);
    if (rot[1]) g.rotateY(rot[1]);
    if (rot[2]) g.rotateZ(rot[2]);
  }
  g.translate(at[0], at[1], at[2]);
  const c = new Color(color);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  return g;
}

const CAPSULE = (r: number, len: number) => new CapsuleGeometry(r, len, 4, 10);
const BOX = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const SPHERE = (r: number) => new SphereGeometry(r, 14, 12);
const CYL = (rt: number, rb: number, h: number, seg = 12) => new CylinderGeometry(rt, rb, h, seg);

const HAIR: Record<Look["hair"], string> = {
  cap: "#efe6d2",
  bun: "#4a3a2e",
  crop: "#2e2620",
  bandana: "#b8483c",
};

/** The static mass of one body: legs, torso, apron with its crossed ties,
 *  collar, hair. Arms and head are built separately because they move. */
function buildBody(look: Look): BufferGeometry {
  const s = look.height / 1.72;
  const b = look.build;
  const legs = [-0.11 * b, 0.11 * b].map((x) =>
    part(CAPSULE(0.085, 0.5), look.trouser, [x, 0.42, 0]),
  );
  const torso = part(CAPSULE(0.2 * b, 0.42), look.shirt, [0, 0.98, 0]);
  const chest = part(BOX(0.34 * b, 0.2, 0.26 * b), look.shirt, [0, 1.14, 0]);
  const apronPanel = part(BOX(0.32 * b, 0.52, 0.02), look.apron, [0, 0.9, 0.16]);
  const apronSkirt = part(BOX(0.3 * b, 0.3, 0.022), look.apron, [0, 0.6, 0.15]);
  // the cross on the back is what makes a uniform read from behind
  const strapA = part(BOX(0.035, 0.42, 0.02), look.apron, [0.07, 1.12, -0.15], [0, 0, 0.34]);
  const strapB = part(BOX(0.035, 0.42, 0.02), look.apron, [-0.07, 1.12, -0.15], [0, 0, -0.34]);
  const waistTie = part(BOX(0.3 * b, 0.038, 0.03), look.apron, [0, 0.86, -0.16]);
  const collar = part(CYL(0.075, 0.075, 0.04, 10), CREAM, [0, 1.31, 0]);
  const hair =
    look.hair === "cap"
      ? part(CYL(0.115, 0.125, 0.095, 12), HAIR.cap, [0, 1.52, -0.005])
      : look.hair === "bandana"
        ? part(CYL(0.122, 0.126, 0.055, 12), HAIR.bandana, [0, 1.51, -0.005])
        : look.hair === "bun"
          ? mergeGeometries([
              part(SPHERE(0.125), HAIR.bun, [0, 1.47, -0.01]),
              part(SPHERE(0.062), HAIR.bun, [0, 1.47, -0.13]),
            ])!
          : part(SPHERE(0.122), HAIR.crop, [0, 1.47, -0.01]);
  const merged = mergeGeometries(
    [legs[0], legs[1], torso, chest, apronPanel, apronSkirt, strapA, strapB, waistTie, collar, hair],
  )!;
  merged.scale(s, s, s);
  return merged;
}

/** one arm as a shoulder pivot so its whole swing is one rotation */
function buildArm(look: Look, skin: string): BufferGeometry {
  const s = look.height / 1.72;
  const sleeve = look.rolledSleeves ? 0.11 : 0.2;
  const upper = part(CAPSULE(0.058, sleeve), look.shirt, [0, -0.1, 0]);
  const fore = part(CAPSULE(0.05, 0.16), skin, [0, -0.34 + (look.rolledSleeves ? 0.03 : 0), 0]);
  const hand = part(SPHERE(0.046), skin, [0, -0.45, 0]);
  const merged = mergeGeometries([upper, fore, hand])!;
  merged.scale(s, s, s);
  return merged;
}

function buildHead(look: Look, seed: number): BufferGeometry {
  const s = look.height / 1.72;
  const head = part(SPHERE(0.125), SKIN[(seed >> 2) % SKIN.length], [0, 0, 0]);
  head.scale(s, s, s);
  return head;
}

/** the whole background crew: four bodies, four cadences, no shared clock */
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
  const bodyGeo = useMemo(() => buildBody(spec.look), [spec.look]);
  const skin = useMemo(() => SKIN[(spec.seed >> 2) % SKIN.length], [spec.seed]);
  const armGeo = useMemo(() => buildArm(spec.look, skin), [spec.look, skin]);
  const headGeo = useMemo(() => buildHead(spec.look, spec.seed), [spec.look, spec.seed]);
  const cloth = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), []);

  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armR = useRef<Group | null>(null);
  const armL = useRef<Group | null>(null);
  const prop = useRef<Group>(null);
  const life = useRef(0);
  const lastServed = useRef(-1);
  const glanceAt = useRef(-10);
  /** start each body somewhere else in its own cycle */
  const phase0 = useMemo(() => hash01(spec.seed, 7, 13) * 6.283, [spec.seed]);

  const setArmR = useCallback((g: Group | null) => { armR.current = g; }, []);
  const setArmL = useCallback((g: Group | null) => { armL.current = g; }, []);

  useFrame((_, dt) => {
    const st = useGame.getState();
    const g = root.current;
    if (!g) return;
    // their own clock: the service clock stops in the opening hold, these
    // bodies do not. They do freeze with a pause, like the guests.
    if (!st.paused && st.phase !== "title" && !reduced) life.current += Math.min(dt, 0.05);
    const t = life.current + phase0;

    // the bell: a plate left the pass, and every body notices for a moment.
    // One number off the store, no simulation — the room acknowledging the
    // player is worth more than the two lines it costs.
    if (st.served !== lastServed.current) {
      if (lastServed.current >= 0) glanceAt.current = life.current;
      lastServed.current = st.served;
    }
    const sinceBell = life.current - glanceAt.current;
    const look = !reduced && sinceBell >= 0 && sinceBell < 1.6
      ? Math.sin((sinceBell / 1.6) * Math.PI)
      : 0;
    // each body's own slow scan of the room, so they are not staring at a wall
    const scan = reduced ? 0 : Math.sin(t * 0.37 + spec.seed) * 0.16;
    if (head.current) {
      // head lags the body a little: secondary motion is most of what makes a
      // still figure look alive at this distance
      const targetY = scan + look * 0.3;
      const targetX = -look * 0.16 - 0.04;
      head.current.rotation.y += (targetY - head.current.rotation.y) * (1 - Math.exp(-7 * dt));
      head.current.rotation.x += (targetX - head.current.rotation.x) * (1 - Math.exp(-7 * dt));
    }
    const a1 = armR.current;
    const a2 = armL.current;
    if (!a1 || !a2) return;
    const damp = 1 - Math.exp(-6 * dt);
    const ease = (node: Group, rx: number, rz: number) => {
      node.rotation.x += (rx - node.rotation.x) * damp;
      node.rotation.z += (rz - node.rotation.z) * damp;
    };

    if (spec.kind === "wash") {
      // 2.6 s scrub: shoulders drive, forearms follow, torso pumps with it
      const c = Math.sin(t * 2.42);
      const c2 = Math.sin(t * 2.42 + 1.1);
      ease(a1, -1.18 + c * 0.34, -0.2 + c * 0.1);
      ease(a2, -1.05 + c2 * 0.3, 0.16 - c2 * 0.08);
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
      ease(a1, -0.35 - reach * 1.55, -0.16 - elbow * 0.08);
      ease(a2, -0.3 - reach * 1.42, 0.14 + elbow * 0.06);
      g.position.y = reach * 0.035;
      g.rotation.x = 0.04 - reach * 0.05;
    } else if (spec.kind === "carry") {
      // 5.1 s carry: both hands under a stack of pans, weight shifting from
      // one foot to the other, the stack taking the sway a beat later
      const sway = Math.sin(t * 1.23);
      const lag = Math.sin(t * 1.23 - 0.5);
      ease(a1, -0.72 + lag * 0.05, -0.3 + sway * 0.06);
      ease(a2, -0.72 + lag * 0.05, 0.3 - sway * 0.06);
      g.rotation.z = sway * 0.03;
      g.position.y = Math.abs(sway) * -0.012;
      if (prop.current) {
        prop.current.position.y = 1.0 + lag * 0.014;
        prop.current.rotation.z = -sway * 0.05;
      }
    } else {
      // 7.3 s crate cycle: stoop, lift, hold, set down, straighten
      const cyc = (t / 7.3) % 1;
      const stoop =
        cyc < 0.28 ? Math.sin((cyc / 0.28) * Math.PI * 0.5)
        : cyc < 0.62 ? 1
        : Math.max(0, 1 - (cyc - 0.62) / 0.3);
      g.rotation.x = 0.05 + stoop * 0.42;
      g.position.y = -stoop * 0.16;
      ease(a1, -0.5 - stoop * 0.75, -0.18 + stoop * 0.06);
      ease(a2, -0.5 - stoop * 0.75, 0.18 - stoop * 0.06);
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
      <mesh geometry={bodyGeo} material={cloth} />
      <group ref={head} position={[0, 1.42 * (spec.look.height / 1.72), 0]}>
        <mesh geometry={headGeo} material={cloth} />
      </group>
      <group ref={setArmL} position={[-0.235 * spec.look.build, 1.16, 0]}>
        <mesh geometry={armGeo} material={cloth} />
      </group>
      <group ref={setArmR} position={[0.235 * spec.look.build, 1.16, 0]}>
        <mesh geometry={armGeo} material={cloth} />
      </group>
      {spec.kind === "crate" && (
        <group ref={prop} position={[0, 0.62, 0.22]}>
          <mesh>
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
export const CREW_PALETTE = { SKIN, HAIR, INK };
