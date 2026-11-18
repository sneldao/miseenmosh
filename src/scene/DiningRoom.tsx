import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
import { Group, Mesh, MeshStandardMaterial } from "three";

/** Guests beyond the pass-through window. The critic's tell: a periodic
 *  camera-flash pulse. Click a guest to flag them (one shot). */
function Guest({ id, table, x }: { id: number; table: number; x: number }) {
  const guests = useGame((s) => s.guests);
  const flagGuest = useGame((s) => s.flagGuest);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const g = guests.find((g) => g.id === id);
  const body = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (body.current) body.current.rotation.y = Math.sin(t * 0.5 + id) * 0.2;
    if (flash.current && g) {
      const phase = (t % Math.max(4, g.tellClock)) - 0;
      const on = g.isCritic && phase > 0 && phase < 0.12;
      (flash.current.material as MeshStandardMaterial).emissiveIntensity = on ? 8 : 0;
    }
  });
  if (!g) return null;
  return (
    <group
      position={[x, 0, -8.6]}
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
        {/* seated figure: dark eveningwear silhouette */}
        <mesh position={[0, 0.62, 0]}>
          <capsuleGeometry args={[0.2, 0.5, 6, 10]} />
          <meshStandardMaterial
            color={criticFlagged && g.isCritic ? "#5a1f8a" : "#3a3a48"}
            emissive={criticFlagged && g.isCritic ? "#3a1060" : "#000000"}
          />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshStandardMaterial color="#c49a78" />
        </mesh>
        {/* the tell: a tiny camera flash */}
        <mesh ref={flash} position={[0.12, 1.05, 0.2]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#ffffff" emissiveIntensity={0} />
        </mesh>
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
      <pointLight position={[0, 0.7, 0.75]} color="#ff9a4a" intensity={5} distance={2.6} />
    </group>
  );
}

export default function DiningRoom() {
  return (
    <group>
      {/* dining room floor: cooler, dimmer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -9]} receiveShadow>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial color="#1a1420" roughness={0.95} />
      </mesh>
      {/* back wall behind the guests */}
      <mesh position={[0, 3, -12]}>
        <boxGeometry args={[16, 6, 0.3]} />
        <meshStandardMaterial color="#201828" roughness={0.9} />
      </mesh>
      {/* cool ceiling wash + warm sconces so guests read through the window */}
      <pointLight position={[0, 4.5, -9]} color="#6a7ab8" intensity={40} distance={16} />
      {[-3.4, 0, 3.4].map((x) => (
        <pointLight key={x} position={[x, 2.8, -11.6]} color="#ff9a4a" intensity={8} distance={7} />
      ))}
      <Guest id={0} table={10} x={-3.4} />
      <Guest id={1} table={11} x={-1.7} />
      <Guest id={2} table={12} x={0} />
      <Guest id={3} table={13} x={1.7} />
      <Guest id={4} table={14} x={3.4} />
    </group>
  );
}
