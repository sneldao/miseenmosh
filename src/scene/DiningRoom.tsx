import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
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
  const phone = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const st = useGame.getState();
    if (body.current) body.current.rotation.y = Math.sin(t * 0.5 + id) * 0.12;
    if (flame.current) {
      const f = 0.8 + Math.sin(t * 7.3 + id * 2.1) * 0.22;
      flame.current.scale.set(1, f, 1);
      (flame.current.material as MeshStandardMaterial).emissiveIntensity = 3.4 * f;
    }
    if (!g) return;
    const telling = g.tellAt >= 0 && st.serviceTime - g.tellAt < 3.5;
    if (phone.current) {
      // phone slides up to face height while telling
      const target = telling ? 1.2 : 0.62;
      phone.current.position.y += (target - phone.current.position.y) * 0.15;
    }
    if (flash.current) {
      // the critic strobes; the press flashes too, dimmer, twice as guilty
      const snapping = telling && (g.isCritic || g.kind === "press") && t % 0.8 < 0.1;
      (flash.current.material as MeshStandardMaterial).emissiveIntensity = snapping
        ? g.isCritic ? 8 : 4
        : telling ? 0.9 : 0;
    }
  });
  if (!g) return null;
  const coat = criticFlagged && g.isCritic ? "#8a3ac0" : COATS[id % COATS.length];
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
        {/* the tell: phone raised to face, screen lit */}
        <group ref={phone} position={[0.17, 0.62, 0.22]}>
          <mesh>
            <boxGeometry args={[0.07, 0.12, 0.015]} />
            <meshStandardMaterial color="#111" roughness={0.4} />
          </mesh>
          <mesh ref={flash} position={[0, 0, 0.012]}>
            <boxGeometry args={[0.055, 0.1, 0.004]} />
            <meshStandardMaterial
              color="#bcd0ff"
              emissive="#bcd0ff"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      </group>

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
      <pointLight position={[0.2, 0.99, 0.62]} color="#ff9a4a" intensity={6} distance={3} />
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
      {[-4.2, 4.2].map((x) => (
        <group key={x} position={[x, 2.5, 0.25]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.05, 0.24, 8]} />
            <meshStandardMaterial color="#c9a24a" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb04a" emissiveIntensity={2.4} />
          </mesh>
          <pointLight position={[0, 0.2, 0.3]} color={d.sconceC} intensity={d.sconce} distance={5} />
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
