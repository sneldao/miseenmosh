import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
import { Group, Mesh, MeshStandardMaterial } from "three";

/** Guests beyond the pass-through window. The tell: the guest raises a
 *  phone and flashes — the critic does it often, civilians rarely.
 *  Click a guest to flag them (one shot). */
function Guest({ id, table, x }: { id: number; table: number; x: number }) {
  const guests = useGame((s) => s.guests);
  const flagGuest = useGame((s) => s.flagGuest);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const g = guests.find((g) => g.id === id);
  const body = useRef<Group>(null);
  const phone = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const st = useGame.getState();
    if (body.current) body.current.rotation.y = Math.sin(t * 0.5 + id) * 0.2;
    if (!g) return;
    const telling = g.tellAt >= 0 && st.serviceTime - g.tellAt < 3.5;
    if (phone.current) {
      // phone slides up to face height while telling
      const target = telling ? 1.3 : 0.74;
      phone.current.position.y += (target - phone.current.position.y) * 0.15;
    }
    if (flash.current) {
      const on = telling && g.isCritic && t % 0.8 < 0.1;
      (flash.current.material as MeshStandardMaterial).emissiveIntensity = on ? 8 : 0;
    }
  });
  if (!g) return null;
  return (
    <group
      position={[x, 0, -7.0]}
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
      <group ref={body}>
        {/* fat invisible hit proxy — the capsule is a hard target from this camera */}
        <mesh position={[0, 0.9, 0]} visible={false}>
          <sphereGeometry args={[0.55, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
        {/* seated figure: dark eveningwear silhouette */}
        <mesh position={[0, 0.72, 0]}>
          <capsuleGeometry args={[0.2, 0.5, 6, 10]} />
          <meshStandardMaterial
            color={criticFlagged && g.isCritic ? "#8a3ac0" : "#7a7a92"}
            emissive={criticFlagged && g.isCritic ? "#3a1060" : "#16161f"}
          />
        </mesh>
        <mesh position={[0, 1.26, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshStandardMaterial color="#c49a78" emissive="#241a16" />
        </mesh>
        {/* the tell: phone raised to face, screen lit */}
        <group ref={phone} position={[0.16, 0.74, 0.22]}>
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
      {/* table */}
      <mesh position={[0, 0.42, 0.75]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 16]} />
        <meshStandardMaterial color="#e8ddc8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0.75]}>
        <cylinderGeometry args={[0.05, 0.08, 0.42, 8]} />
        <meshStandardMaterial color="#3a3a42" />
      </mesh>
      {/* candle = visibility anchor */}
      <pointLight position={[0, 0.7, 0.75]} color="#ff9a4a" intensity={11} distance={3.4} />
    </group>
  );
}

export default function DiningRoom() {
  return (
    <group position={[0, 0.26, 0]}>
      {/* dining room floor: cooler, dimmer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -9]} receiveShadow>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial color="#1a1420" roughness={0.95} />
      </mesh>
      {/* back wall behind the guests */}
      <mesh position={[0, 3, -12]}>
        <boxGeometry args={[16, 6, 0.3]} />
        <meshStandardMaterial color="#3a2f3e" roughness={0.9} />
      </mesh>
      {/* cool ceiling wash + warm sconces so guests read through the window */}
      <pointLight position={[0, 4.5, -9]} color="#6a7ab8" intensity={40} distance={16} />
      {/* window-side wash: the pass needs faces to read at 12m */}
      <pointLight position={[0, 2.4, -6.4]} color="#ffc08a" intensity={30} distance={7} />
      {[-3.4, 0, 3.4].map((x) => (
        <pointLight key={x} position={[x, 2.8, -11.6]} color="#ff9a4a" intensity={8} distance={7} />
      ))}
      <Guest id={0} table={10} x={-3.9} />
      <Guest id={1} table={11} x={-2.2} />
      <Guest id={2} table={12} x={0} />
      <Guest id={3} table={13} x={2.2} />
      <Guest id={4} table={14} x={3.9} />
    </group>
  );
}
