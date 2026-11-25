import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
import { useReducedMotion } from "./artDirection";
import { Group, Mesh, MeshStandardMaterial } from "three";
import CharacterGLB from "./CharacterGLB";
import { modelUrl } from "./modelUrl";
import StaticMerge from "./StaticMerge";

/** Eveningwear: warm and cool so guests never read as brigade whites. */
const COATS = ["#6e2f3a", "#33505f", "#6d5a2c", "#463463", "#2d5346"];

/** Silhouette table: five same-shaped bodies read as staff even at different
 *  seat heights — the eye needs different *proportions*. Shoulders, torso,
 *  head, hair and arm thickness all vary per guest; one wears a hat instead
 *  of a hair cap so the row holds an unmistakable non-uniform head. */
const SHAPES = [
  { shoulder: 0.46, torsoR: 0.17, torsoL: 0.3, head: 0.115, hairH: 0.62, armR: 0.045, hat: false },
  { shoulder: 0.56, torsoR: 0.19, torsoL: 0.24, head: 0.105, hairH: 0.45, armR: 0.052, hat: false },
  { shoulder: 0.38, torsoR: 0.145, torsoL: 0.36, head: 0.125, hairH: 0.78, armR: 0.04, hat: false },
  { shoulder: 0.5, torsoR: 0.16, torsoL: 0.3, head: 0.115, hairH: 0.62, armR: 0.045, hat: true },
  { shoulder: 0.42, torsoR: 0.2, torsoL: 0.26, head: 0.1, hairH: 0.55, armR: 0.05, hat: false },
];

/** Guests beyond the pass-through window. The tell: the guest raises a
 *  phone and flashes — the critic does it often, civilians rarely.
 *  Click a guest to flag them (one shot). */
function Guest({
  id,
  x,
  z,
  y = 0,
  scale = 1,
  venue = 0,
  visible = true,
}: {
  id: number;
  x: number;
  z: number;
  /** seat height offset — used to break the row of level heads (see mount) */
  y?: number;
  scale?: number;
  venue?: number;
  /** hide the capsule body when a Rodin-pipeline GLB stands in for it */
  visible?: boolean;
}) {
  // 101 migrates up with the room: wobbly corner → window → center stage
  const hundredOne = [14, 12, 10][Math.min(2, venue ?? 0)];
  const guests = useGame((s) => s.guests);
  const flagGuest = useGame((s) => s.flagGuest);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const g = guests.find((g) => g.id === id);
  const body = useRef<Group>(null);
  const companion = useRef<Group>(null);
  const saltArm = useRef<Group>(null);
  const phone = useRef<Group>(null);
  const notebook = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const flame = useRef<Mesh>(null);
  const motionTime = useRef(0);
  const reduced = useReducedMotion();
  useFrame((_, dt) => {
    const st = useGame.getState();
    // guests are ambient life: they don't animate off the service clock,
    // but they do freeze with a pause and never jump on resume
    if (st.paused || st.phase !== "service") return;
    if (!reduced) motionTime.current += Math.min(dt, 0.05);
    const t = motionTime.current;
    if (body.current) {
      // Idle life: breathe, weight-shift, and a slow sip-cycle per guest.
      // These amplitudes are set by the distance, not by taste. A guest is
      // ~10.4 m out, where the frame spends ~0.0023 rad per pixel: the old
      // ±0.045 rad weight-shift was 0.7 px, i.e. nothing, which is why the row
      // behind the pass was read as "completely static". At 3x the number still
      // isn't the point — what reads at 10 m is only the big lever (a head
      // tilt of ±0.16 rad swings the top of a 1.45-scaled head ~3 px) — so the
      // beats below carry the motion and the sip is deliberately deep.
      body.current.rotation.y = reduced ? 0 : Math.sin(t * 0.5 + id) * 0.3;
      const sipCycle = (t * 0.07 + id * 0.37) % 1;
      const sip = !reduced && sipCycle > 0.88 ? Math.sin((sipCycle - 0.88) / 0.12 * Math.PI) : 0;
      body.current.rotation.x = sip * 0.3;
      body.current.rotation.z = reduced ? 0 : Math.sin(t * 0.34 + id * 2.1) * 0.15;
      body.current.position.y = (reduced ? 0 : Math.sin(t * 1.1 + id * 1.7) * 0.03) + sip * 0.05;
    }
    if (flame.current) {
      const f = reduced ? 1 : 0.8 + Math.sin(t * 7.3 + id * 2.1) * 0.22;
      flame.current.scale.set(1, f, 1);
      (flame.current.material as MeshStandardMaterial).emissiveIntensity = 3.4 * f;
    }
    if (!g) return;
    // the tell is what the critic actually does: notebook, phone, or a
    // lean over the place setting — identity stays hidden until flagged.
    const telling = g.tellAt >= 0 && st.serviceTime - g.tellAt < 3.5;
    if (phone.current) phone.current.visible = telling && g.tellKind === "phone";
    if (notebook.current) notebook.current.visible = telling && g.tellKind === "notebook";
    // modest forward lean: reading the notebook, or studying the setting
    const leaning = telling && (g.tellKind === "notebook" || g.tellKind === "inspect");
    if (body.current) body.current.rotation.x += leaning ? 0.2 : 0;
    const snapping = telling && g.tellKind === "phone" && (reduced ? true : t % 0.8 < 0.1);
    if (flash.current) {
      (flash.current.material as MeshStandardMaterial).emissiveIntensity = snapping ? (reduced ? 0.7 : 6) : 0;
    }
    // pair tables get a second body with a life of its own: the couple
    // fights and makes up on its COUPLE_FIGHT beats, the regulars lean
    // in together, and somebody occasionally passes the salt
    if (companion.current) {
      const cp = companion.current;
      cp.rotation.y = reduced ? 0 : Math.sin(t * 0.44 + id + 1.9) * 0.11;
      cp.rotation.x = reduced ? 0 : Math.sin(t * 0.62 + id * 1.3) * 0.03;
      cp.rotation.z = 0;
      cp.position.x = -0.62;
      cp.position.y = reduced ? 0 : Math.sin(t * 1.05 + id * 2.3) * 0.011;
      // the beat rides tellAt — every couple line lands as a gesture too
      const age = st.serviceTime - g.tellAt;
      const b = !reduced && age >= 0 && age < 5
        ? Math.sin(Math.min(1, age / 0.9) * Math.PI * 0.5) * Math.min(1, Math.max(0, (5 - age) / 0.9))
        : 0;
      if (body.current && b > 0) {
        if (g.kind === "couple") {
          // read the beat itself: the freshest line this table actually
          // said — fighting/crying pulls them apart, "made up" draws them
          // back. Falls back to parity when the line was suppressed.
          let fight = g.tells % 2 === 1;
          const feed = st.feed;
          for (let i = feed.length - 1; i >= 0; i--) {
            const f = feed[i].text;
            if (!f.startsWith(`Table ${g.table} `)) continue;
            if (f.includes("fighting") || f.includes("crying")) fight = true;
            else if (f.includes("made up")) fight = false;
            else continue; // walk-outs/photo lines share the Table-T prefix
            break;
          }
          if (fight) {
            body.current.rotation.y += 0.5 * b;
            cp.rotation.y -= 0.6 * b;
            cp.rotation.z = Math.sin(t * 8.5) * 0.05 * b;
            body.current.rotation.z += Math.sin(t * 9.3 + 1) * 0.04 * b;
          } else {
            body.current.rotation.y -= 0.35 * b;
            cp.rotation.y += 0.42 * b;
            cp.position.x += 0.1 * b;
            cp.rotation.x += 0.12 * b;
          }
        } else {
          // Mara & June, twenty years in: a nod and a lean on their beat
          body.current.rotation.y -= 0.2 * b;
          cp.rotation.y += 0.25 * b;
          cp.rotation.x += 0.1 * b;
        }
      }
      // the salt pass — one reach across the table on a long slow cycle
      if (saltArm.current) {
        const sc = (t * 0.05 + id * 0.53) % 1;
        const reach = !reduced && sc > 0.9 ? Math.sin(((sc - 0.9) / 0.1) * Math.PI) : 0;
        saltArm.current.rotation.x = 0.7 + reach * 0.85;
        saltArm.current.rotation.y = -reach * 0.55;
      }
    }
    // delivery lean-in: food lands, the room tips toward it — hardest at
    // the table it actually lands on
    const dlv = st.lastDelivery;
    if (!reduced && dlv && body.current) {
      const dAge = st.serviceTime - dlv.at;
      if (dAge >= 0 && dAge < 2.6) {
        const lean = Math.sin(Math.min(1, dAge / 0.5) * Math.PI * 0.5) * Math.min(1, Math.max(0, 2.6 - dAge));
        const amp = dlv.table === g.table ? 0.24 : 0.09;
        body.current.rotation.x += lean * amp;
        if (companion.current) companion.current.rotation.x += lean * amp;
      }
    }
  });
  if (!g) return null;
  const coat = criticFlagged && g.isCritic ? "#8a3ac0" : COATS[id % COATS.length];
  const shape = SHAPES[id % SHAPES.length];
  // the couple and the regulars are two-tops — Mara & June's subplot
  // plays on the COUPLE_FIGHT beats at whatever table they've taken
  const paired = g.kind === "couple" || g.kind === "regulars";
  const coat2 = COATS[(id + 2) % COATS.length];
  const shape2 = SHAPES[(id + 3) % SHAPES.length];
  return (
    <group
      position={[x, y, z]}
      userData={{ interact: { kind: "guest", id } }}
      onClick={(e) => {
        e.stopPropagation();
        flagGuest(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      {/* Collage scale: these people are drawn slightly too big, which is
          the only way a face reads from the far side of the pass. */}
      <group ref={body} scale={scale * 1.45} visible={visible}>
        {/* fat invisible hit proxy — a head is a hard target from this camera */}
        <mesh position={[0, 0.95, 0]} visible={false}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
        {/* seated diner: you see shoulders and head over the table edge */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[shape.shoulder, 0.16, 0.3]} />
          <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <capsuleGeometry args={[shape.torsoR, shape.torsoL, 6, 10]} />
          <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (shape.shoulder / 2 + 0.01), 0.72, 0.14]} rotation={[0.7, 0, s * 0.16]}>
            <capsuleGeometry args={[shape.armR, 0.24, 4, 8]} />
            <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 1.18, 0]}>
          <sphereGeometry args={[shape.head, 14, 14]} />
          <meshStandardMaterial color="#cf9d7c" emissive="#2a1c16" roughness={0.8} />
        </mesh>
        {/* hair — a dark cap so heads separate from the brigade toques;
            one guest wears a hat: the only unmistakable head in the row */}
        {shape.hat ? (
          <group position={[0, 1.26, -0.01]}>
            <mesh>
              <cylinderGeometry args={[shape.head * 1.5, shape.head * 1.6, 0.015, 14]} />
              <meshStandardMaterial color="#2a2018" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[shape.head * 0.75, shape.head * 0.85, 0.09, 12]} />
              <meshStandardMaterial color="#33261c" roughness={0.9} />
            </mesh>
          </group>
        ) : (
          <mesh position={[0, 1.24, -0.02]}>
            <sphereGeometry args={[shape.head * 0.97, 12, 10, 0, Math.PI * 2, 0, Math.PI * shape.hairH]} />
            <meshStandardMaterial color={id % 2 ? "#241a18" : "#4a3424"} roughness={0.95} />
          </mesh>
        )}
        {/* the tell: phone raised to face, screen lit — only while a phone tell is live */}
        <group ref={phone} position={[0.17, 1.05, 0.22]} visible={false}>
          <mesh>
            <boxGeometry args={[0.07, 0.12, 0.015]} />
            <meshStandardMaterial color="#111" roughness={0.4} />
          </mesh>
          <mesh ref={flash} position={[0, 0, 0.012]}>
            <boxGeometry args={[0.055, 0.1, 0.004]} />
            <meshStandardMaterial
              color="#bcd0ff"
              emissive="#bcd0ff"
              emissiveIntensity={0}
            />
          </mesh>
        </group>
        {/* the other tell: a cream notebook raised over the table, pen out */}
        <group ref={notebook} position={[-0.12, 0.98, 0.26]} rotation={[-0.55, 0, 0.12]} visible={false}>
          <mesh>
            <boxGeometry args={[0.24, 0.018, 0.17]} />
            <meshStandardMaterial color="#2e2016" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.014, 0]}>
            <boxGeometry args={[0.21, 0.008, 0.145]} />
            <meshStandardMaterial color="#efe6d0" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.019, 0]}>
            <boxGeometry args={[0.005, 0.002, 0.145]} />
            <meshStandardMaterial color="#7a6a50" roughness={0.9} />
          </mesh>
          <mesh position={[0.15, 0.026, 0.02]} rotation={[0.5, 0, 0.5]}>
            <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} />
            <meshStandardMaterial color="#1c1610" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* the second chair — pair tables get a body with its own idle
          life; gestures ride this guest's tell clock in useFrame */}
      {paired && (
        <group ref={companion} position={[-0.62, 0, -0.14]} scale={scale * 1.32}>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[shape2.shoulder, 0.16, 0.28]} />
            <meshStandardMaterial color={coat2} emissive="#0d0b12" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <capsuleGeometry args={[shape2.torsoR, shape2.torsoL, 6, 10]} />
            <meshStandardMaterial color={coat2} emissive="#0d0b12" roughness={0.9} />
          </mesh>
          {/* the reach arm — the one that passes the salt */}
          <group ref={saltArm} position={[0.24, 0.72, 0.14]} rotation={[0.7, 0, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <capsuleGeometry args={[0.045, 0.24, 4, 8]} />
              <meshStandardMaterial color={coat2} emissive="#0d0b12" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.28, 0.04]}>
              <cylinderGeometry args={[0.018, 0.022, 0.06, 8]} />
              <meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
          <mesh position={[-0.24, 0.72, 0.14]} rotation={[0.7, 0, -0.16]}>
            <capsuleGeometry args={[0.045, 0.24, 4, 8]} />
            <meshStandardMaterial color={coat2} emissive="#0d0b12" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.18, 0]}>
            <sphereGeometry args={[shape2.head, 14, 14]} />
            <meshStandardMaterial color="#c08a62" emissive="#2a1c16" roughness={0.8} />
          </mesh>
          {/* hair — the regulars went grey in this room */}
          <mesh position={[0, 1.24, -0.02]}>
            <sphereGeometry args={[shape2.head * 0.97, 12, 10, 0, Math.PI * 2, 0, Math.PI * shape2.hairH]} />
            <meshStandardMaterial color={g.kind === "regulars" ? "#b8b0a4" : "#241a18"} roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* table — the top sits above the sill, so the room reads as a room */}
      <mesh position={[0, 0.8, 0.62]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.05, 18]} />
        <meshStandardMaterial color="#d9cdb6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, 0.62]}>
        <cylinderGeometry args={[0.5, 0.5, 0.34, 18, 1, true]} />
        {/* the flagship starches 101's cloth — white, pressed, no excuses */}
        <meshStandardMaterial color={g?.table === hundredOne && venue >= 2 ? "#f7f2e6" : "#efe6d2"} roughness={1} side={2} />
      </mesh>
      {/* candle = visibility anchor */}
      <mesh position={[0.2, 0.86, 0.62]}>
        <cylinderGeometry args={[0.022, 0.026, 0.12, 8]} />
        <meshStandardMaterial color="#f0e4c8" roughness={0.9} />
      </mesh>
      <mesh ref={flame} position={[0.2, 0.955, 0.62]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffb04a" emissiveIntensity={3} />
      </mesh>
      {/* 101 wobbles: table 14 sits a degree off — until the flagship fixes it */}
      {g?.table === hundredOne && venue < 2 && (
        <mesh position={[0, 0.44, 0.62]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.1, 0.02, 0.1]} />
          <meshStandardMaterial color="#7a2a1a" roughness={0.9} />
        </mesh>
      )}
      {/* plate + glass, read as table setting at a glance */}
      <mesh position={[-0.14, 0.828, 0.66]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.5} />
      </mesh>
      <mesh position={[-0.3, 0.87, 0.5]}>
        <cylinderGeometry args={[0.028, 0.02, 0.1, 8]} />
        <meshStandardMaterial color="#3a1a20" roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}

/** Something on the far wall, so the window has depth rather than a void. */
const VENUE_DRESS = [
  { wall: "#4a3548", floor: "#221a22", wash: "#6a7ab8" as const, washI: 34, sconce: 9, sconceC: "#ffab5e" as const },
  { wall: "#54404a", floor: "#2a2024", wash: "#b08a5a" as const, washI: 40, sconce: 13, sconceC: "#ffab5e" as const },
  { wall: "#5f4a3a", floor: "#33262a", wash: "#ffd9a0" as const, washI: 46, sconce: 17, sconceC: "#ffd9a0" as const },
];

/** The one body in the room that *moves through* space: a waiter crossing
 *  the floor between the tables and the far wall, tray up, pausing at
 *  tables. Guests breathe — but at 8 m their stillness is the read; a
 *  crossing body is the proof the room is inhabited. Render clock, so it
 *  never desyncs; pause-gated like every other ambient mover. */
function Waiter() {
  const g = useRef<Group>(null);
  const tray = useRef<Group>(null);
  const clock = useRef(0);
  const reduced = useReducedMotion();
  // motion state: walk clip between tables, standing idle during the serve
  // dwell. Flips are edge-detected so setState fires twice per loop, not
  // every frame.
  const [moving, setMoving] = useState(true);
  const movingRef = useRef(true);
  // waypoint walk: sweep the floor behind the seated row, pausing to serve
  // at whatever x the guests actually sit. The path returns on itself so
  // the loop wraps on the far side, never teleports across the window.
  const stops = [-4.25, -1.7, 0.45, 2.65, 4.35, 2.65, 0.45, -1.7];
  useFrame((_, dt) => {
    const st = useGame.getState();
    if (st.paused || st.phase !== "service" || !g.current) return;
    if (!reduced) clock.current += Math.min(dt, 0.05);
    const t = clock.current;
    // ~45s loop across the whole floor: a walk leg, then a short serve
    const SEG = 45 / (stops.length - 1);
    const pos = (t % 45) / SEG;
    const leg = Math.min(stops.length - 2, Math.floor(pos));
    const frac = pos - leg;
    // ease each leg, and dwell ~20% of it standing at the table
    const move = Math.min(1, frac / 0.8);
    const e = move * move * (3 - 2 * move);
    const x = stops[leg] + (stops[leg + 1] - stops[leg]) * e;
    const walking = frac < 0.8 && e > 0.02 && e < 0.98;
    if (walking !== movingRef.current) {
      movingRef.current = walking;
      setMoving(walking);
    }
    g.current.position.x = x;
    g.current.position.y = reduced ? 0 : Math.abs(Math.sin(t * 7)) * 0.035 * (walking ? 1 : 0);
    g.current.rotation.y = walking ? (stops[leg + 1] > stops[leg] ? Math.PI / 2 : -Math.PI / 2) * 0.9 : Math.PI;
    // tray rides steady: high and level while walking, dips on the serve
    if (tray.current) {
      const serve = walking ? 0 : Math.sin(Math.min(1, (frac - 0.8) / 0.2) * Math.PI);
      tray.current.rotation.x = reduced ? 0 : -serve * 0.4;
      tray.current.position.y = reduced ? 1.18 : 1.18 - serve * 0.12;
    }
  });
  return (
    <group ref={g} position={[-4.25, 0, -8.4]}>
      {/* Rodin-pipeline body: walk clip between tables, standing idle during
          the serve dwell. The tray arm and code-driven path stay — the GLB
          replaces only the capsule body. */}
      <CharacterGLB
        url={modelUrl("characters/waiter.glb")}
        clip={moving ? "human_000089" : "human_000090"}
        fade={0.35}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={1.0}
      />
      {/* tray arm: raised, flat, carrying the room's proof of service */}
      <group ref={tray} position={[0.26, 1.18, 0.1]}>
        <mesh position={[0, -0.14, 0]} rotation={[0.9, 0, 0]}>
          <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
          <meshStandardMaterial color="#e8e2d4" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.02, 0.06]}>
          <cylinderGeometry args={[0.16, 0.16, 0.018, 16]} />
          <meshStandardMaterial color="#3a3630" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.06, 0.06]}>
          <cylinderGeometry args={[0.02, 0.015, 0.07, 8]} />
          <meshStandardMaterial color="#7a2a3a" roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[-0.24, 0.95, 0]} rotation={[0.4, 0, 0.2]}>
        <capsuleGeometry args={[0.04, 0.26, 4, 8]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FarWall({ venue = 0 }: { venue?: number }) {
  const d = VENUE_DRESS[Math.min(2, venue)];
  const sconces = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    // ambient scheduler: each sconce breathes on its own slow timer with an
    // occasional dip — candle-grade flicker, never strobe. Urgent channel
    // (phone flash, fire, dying tickets) stays fast + bright by contrast.
    const t = clock.elapsedTime;
    sconces.current.forEach((g, i) => {
      if (!g) return;
      const dipCycle = (t * 0.05 + i * 0.61) % 1;
      const dip = dipCycle > 0.92 ? Math.sin((dipCycle - 0.92) / 0.08 * Math.PI) * 0.25 : 0;
      g.scale.setScalar(1 + Math.sin(t * 1.3 + i * 2.4) * 0.02 - dip * 0.06);
    });
  });
  return (
    <group position={[0, 0, -9.6]}>
      <StaticMerge>
      <mesh position={[0, 2.4, 0]} receiveShadow>
        <boxGeometry args={[17, 5, 0.3]} />
        <meshStandardMaterial color={d.wall} roughness={0.92} />
      </mesh>
      {/* a dado rail and a few framed prints */}
      <mesh position={[0, 1.05, 0.18]}>
        <boxGeometry args={[17, 0.08, 0.06]} />
        <meshStandardMaterial color="#2a1d28" roughness={0.9} />
      </mesh>
      {[-2.6, -0.9, 0.9, 2.6].map((x, i) => (
        <group key={x} position={[x, 2.2 + (i % 2) * 0.16, 0.19]}>
          <mesh>
            <boxGeometry args={[0.62, 0.8, 0.04]} />
            <meshStandardMaterial color="#8a6a34" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.52, 0.7, 0.01]} />
            <meshStandardMaterial color={i % 2 ? "#3d4a3a" : "#5a3a3a"} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* sconces: warm points that tell you the room continues */}
      {[-4.2, 4.2].map((x, i) => (
        <group key={x} position={[x, 2.5, 0.25]} ref={(g) => { sconces.current[i] = g; }} userData={{ staticMerge: false }}> 
          <mesh>
            <cylinderGeometry args={[0.04, 0.05, 0.24, 8]} />
            <meshStandardMaterial color="#c9a24a" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb04a" emissiveIntensity={2.4} />
          </mesh>
        </group>
      ))}
      </StaticMerge>
    </group>
  );
}

/** Rodin-pipeline guest body with state-driven clips: the base clip loops
 *  normally; while this guest's tell is live the reaction clip crossfades in
 *  (restless jiggle, nervous foot, dejected slump — whatever the cast sheet
 *  picked for them). Reads the same guest state the capsule body uses. */
function GuestGLB({
  id, file, base, tell, ...props
}: { id: number; file: string; base: string; tell: string } & Omit<React.ComponentProps<typeof CharacterGLB>, "url" | "clip">) {
  const guest = useGame((s) => s.guests.find((g) => g.id === id));
  const telling = !!guest && guest.tellAt >= 0
    && useGame.getState().serviceTime - guest.tellAt < 3.5;
  return (
    <CharacterGLB
      url={modelUrl(`characters/${file}.glb`)}
      clip={telling ? tell : base}
      fade={0.45}
      {...props}
    />
  );
}

export default function DiningRoom() {
  const venue = useGame((s) => s.career.venue);
  const d = VENUE_DRESS[Math.min(2, venue)];
  return (
    <group position={[0, 0.26, 0]}>
      {/* dining room floor: the stars repaint it — stall concrete to flagship boards */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8.4]} receiveShadow>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial color={d.floor} roughness={0.95} />
      </mesh>
      <FarWall venue={venue} />
      <Waiter />
      {/* ceiling wash warms as the room moves up — gold by the flagship */}
      <pointLight position={[0, 4.2, -8.2]} color={d.wash} intensity={d.washI} distance={14} />
      {/* window-side wash: the pass needs faces to read at 10m */}
      <pointLight position={[0, 2.4, -6.2]} color="#ffc08a" intensity={18} distance={6} />
      {/* Seated at different heights, not on one shelf. Five heads level to
          within a few centimetres is a row of staff; the eye reads a line, not
          a room. Each body gets its own seat height so the silhouette has a
          rhythm and the pass window stops looking like a second brigade. */}
      {/* Evenly spaced and evenly deep is the whole reason five guests still
          read as a brigade row: the eye gets a grid and a grid is staff. The
          tables are now set at intervals that do not repeat and at depths from
          6.0 to 7.9 m, so perspective alone gives three apparent sizes and the
          window stops looking like a second line-up. */}
      {/* Rodin-pipeline cast: generated → rigged → decimated (scripts/rodin/).
          Each guest plays a distinct clip set so the row reads as people, not
          a chorus line, and crossfades to a reaction clip while their tell is
          live. Capsule bodies stay mounted (hidden) for hit proxies and
          per-guest state; only the visible body is swapped. */}
      <group position={[-4.25, 0, -6.5]} scale={1.02}>
        <GuestGLB id={0} file="guest-a" base="human_000025" tell="human_000056" position={[0, 0.26, 0]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </group>
      <group position={[-1.7, 0, -7.85]} scale={0.9}>
        <GuestGLB id={1} file="guest-b" base="human_000085" tell="human_000080" position={[0, 0.26, -0.3]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </group>
      <group position={[0.45, 0, -6.05]} scale={1.1}>
        <GuestGLB id={2} file="guest-c" base="human_000085" tell="human_000080" position={[0, 0.26, 0.06]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </group>
      <group position={[2.65, 0, -7.9]} scale={0.86}>
        <GuestGLB id={3} file="guest-d" base="human_000041" tell="human_000025" position={[0, 0.26, -0.34]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </group>
      <group position={[4.35, 0, -6.6]} scale={1.05}>
        <GuestGLB id={4} file="guest-e" base="human_000085" tell="human_000050" position={[0, 0.26, -0.12]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </group>
      <Guest id={0} x={-4.25} z={-6.5} y={0} scale={1.02} venue={venue} visible={false} />
      <Guest id={2} x={0.45} z={-6.05} y={0.06} scale={1.1} venue={venue} visible={false} />
      <Guest id={3} x={2.65} z={-7.9} y={-0.34} scale={0.86} venue={venue} visible={false} />
      <Guest id={4} x={4.35} z={-6.6} y={-0.12} scale={1.05} venue={venue} visible={false} />
    </group>
  );
}
