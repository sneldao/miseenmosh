import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
import { useReducedMotion } from "./artDirection";
import { Group, Mesh, MeshStandardMaterial } from "three";

/** Eveningwear: warm and cool so guests never read as brigade whites. */
const COATS = ["#6e2f3a", "#33505f", "#6d5a2c", "#463463", "#2d5346"];

/** Guests beyond the pass-through window. The tell: the guest raises a
 *  phone and flashes — the critic does it often, civilians rarely.
 *  Click a guest to flag them (one shot). */
function Guest({
  id,
  x,
  z,
  scale = 1,
  venue = 0,
}: {
  id: number;
  x: number;
  z: number;
  scale?: number;
  venue?: number;
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
      // idle life: breathe, weight-shift, and a slow sip-cycle per guest.
      // small + slow on purpose — the phone flash keeps the urgent channel.
      body.current.rotation.y = reduced ? 0 : Math.sin(t * 0.5 + id) * 0.12;
      const sipCycle = (t * 0.07 + id * 0.37) % 1;
      const sip = !reduced && sipCycle > 0.88 ? Math.sin((sipCycle - 0.88) / 0.12 * Math.PI) : 0;
      body.current.rotation.x = sip * 0.14;
      body.current.rotation.z = reduced ? 0 : Math.sin(t * 0.34 + id * 2.1) * 0.045;
      body.current.position.y = (reduced ? 0 : Math.sin(t * 1.1 + id * 1.7) * 0.012) + sip * 0.02;
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
  // the couple and the regulars are two-tops — Mara & June's subplot
  // plays on the COUPLE_FIGHT beats at whatever table they've taken
  const paired = g.kind === "couple" || g.kind === "regulars";
  const coat2 = COATS[(id + 2) % COATS.length];
  return (
    <group
      position={[x, 0, z]}
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
      <group ref={body} scale={scale * 1.45}>
        {/* fat invisible hit proxy — a head is a hard target from this camera */}
        <mesh position={[0, 0.95, 0]} visible={false}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
        {/* seated diner: you see shoulders and head over the table edge */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.46, 0.16, 0.3]} />
          <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <capsuleGeometry args={[0.17, 0.3, 6, 10]} />
          <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.24, 0.72, 0.14]} rotation={[0.7, 0, s * 0.16]}>
            <capsuleGeometry args={[0.045, 0.24, 4, 8]} />
            <meshStandardMaterial color={coat} emissive="#0d0b12" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.115, 14, 14]} />
          <meshStandardMaterial color="#cf9d7c" emissive="#2a1c16" roughness={0.8} />
        </mesh>
        {/* hair — a dark cap so heads separate from the brigade toques */}
        <mesh position={[0, 1.24, -0.02]}>
          <sphereGeometry args={[0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={id % 2 ? "#241a18" : "#4a3424"} roughness={0.95} />
        </mesh>
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
            <boxGeometry args={[0.44, 0.16, 0.28]} />
            <meshStandardMaterial color={coat2} emissive="#0d0b12" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <capsuleGeometry args={[0.16, 0.3, 6, 10]} />
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
            <sphereGeometry args={[0.115, 14, 14]} />
            <meshStandardMaterial color="#c08a62" emissive="#2a1c16" roughness={0.8} />
          </mesh>
          {/* hair — the regulars went grey in this room */}
          <mesh position={[0, 1.24, -0.02]}>
            <sphereGeometry args={[0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
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
        <group key={x} position={[x, 2.5, 0.25]} ref={(g) => { sconces.current[i] = g; }}> 
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
    </group>
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
      {/* ceiling wash warms as the room moves up — gold by the flagship */}
      <pointLight position={[0, 4.2, -8.2]} color={d.wash} intensity={d.washI} distance={14} />
      {/* window-side wash: the pass needs faces to read at 10m */}
      <pointLight position={[0, 2.4, -6.2]} color="#ffc08a" intensity={18} distance={6} />
      <Guest id={0} x={-4.0} z={-6.7} venue={venue} />
      <Guest id={1} x={-2.0} z={-7.3} venue={venue} />
      <Guest id={2} x={0} z={-6.6} venue={venue} />
      <Guest id={3} x={2.0} z={-7.3} venue={venue} />
      <Guest id={4} x={4.0} z={-6.7} venue={venue} />
    </group>
  );
}
