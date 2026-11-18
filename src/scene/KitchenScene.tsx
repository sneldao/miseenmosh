import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "../game/state";
import Stations from "./Stations";
import DiningRoom from "./DiningRoom";
import { Group } from "three";

const STEEL = "#8a8d91";
const STEEL_DARK = "#4a4d52";
const WARM = "#ffb066";

function PassCounter() {
  return (
    <group position={[0, 0, 2.2]}>
      {/* counter body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 1.1, 0.9]} />
        <meshStandardMaterial color="#3a2415" roughness={0.8} />
      </mesh>
      {/* steel top */}
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.3, 0.06, 1.1]} />
        <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* ticket rail */}
      <mesh position={[0, 2.35, -0.15]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[11, 0.08, 0.3]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* heat lamps */}
      {[-3.2, 0, 3.2].map((x) => (
        <group key={x} position={[x, 1.9, 0]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.5]} />
            <meshStandardMaterial color={STEEL_DARK} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <coneGeometry args={[0.28, 0.3, 16, 1, true]} />
            <meshStandardMaterial color="#7a1f12" emissive={WARM} emissiveIntensity={0.6} side={2} />
          </mesh>
          <pointLight position={[0, -0.5, 0.2]} color={WARM} intensity={4} distance={4} />
        </group>
      ))}
    </group>
  );
}

function BrigadeFigure({ x, stationHue }: { x: number; stationHue: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      // busy-work bob + slight turn toward station
      ref.current.position.y = Math.abs(Math.sin(t * 3 + x)) * 0.03;
      ref.current.rotation.y = Math.sin(t * 0.7 + x) * 0.15;
    }
  });
  return (
    <group ref={ref} position={[x, 0, -2.4]}>
      {/* body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.75, 6, 12]} />
        <meshStandardMaterial color="#e8e2d5" roughness={0.9} />
      </mesh>
      {/* apron stripe = station color coding */}
      <mesh position={[0, 0.75, 0.19]}>
        <boxGeometry args={[0.28, 0.5, 0.02]} />
        <meshStandardMaterial color={stationHue} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#d9a877" />
      </mesh>
      {/* toque */}
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.22, 12]} />
        <meshStandardMaterial color="#f4efe4" />
      </mesh>
    </group>
  );
}

function Room() {
  return (
    <group>
      {/* floor: checker-ish dark tile */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#181410" roughness={0.95} />
      </mesh>
      {/* back wall with pass-through window hole (two segments) */}
      <mesh position={[0, 0.5, -5]}>
        <boxGeometry args={[20, 1.0, 0.3]} />
        <meshStandardMaterial color="#241d16" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.65, -5]}>
        <boxGeometry args={[20, 2.9, 0.3]} />
        <meshStandardMaterial color="#241d16" roughness={0.9} />
      </mesh>
      {/* window sill / pass shelf */}
      <mesh position={[0, 1.02, -4.9]}>
        <boxGeometry args={[8.4, 0.1, 0.6]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} />
      </mesh>
      {/* side walls */}
      <mesh position={[-9, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[14, 6, 0.3]} />
        <meshStandardMaterial color="#1e1813" roughness={0.9} />
      </mesh>
      <mesh position={[9, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[14, 6, 0.3]} />
        <meshStandardMaterial color="#1e1813" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CameraShake() {
  const screamAt = useGame((s) => s.screamAt);
  const { camera } = useThree();
  const base = useRef({ x: 0, y: 4.6, z: 7.2 });
  useFrame(({ clock }) => {
    const dt = performance.now() - screamAt;
    if (screamAt && dt < 600) {
      const k = (1 - dt / 600) * 0.14;
      camera.position.x = base.current.x + Math.sin(clock.elapsedTime * 55) * k;
      camera.position.y = base.current.y + Math.cos(clock.elapsedTime * 47) * k * 0.6;
    } else {
      camera.position.x = base.current.x;
      camera.position.y = base.current.y;
    }
    camera.lookAt(0, 1.6, -2);
  });
  return null;
}

export default function KitchenScene() {
  const tick = useGame((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return (
    <>
      <color attach="background" args={["#0d0b09"]} />
      <fog attach="fog" args={["#0d0b09", 14, 30]} />
      <ambientLight intensity={0.25} color="#3a4050" />
      {/* warm key over the kitchen */}
      <spotLight position={[0, 7, 2]} angle={0.9} penumbra={0.5} intensity={80} color={WARM} castShadow />
      {/* steel fill */}
      <directionalLight position={[-5, 6, -1]} intensity={0.4} color="#9fb4d8" />
      <Room />
      <Stations />
      <PassCounter />
      <DiningRoom />
      {/* brigade: one figure per station, color-coded */}
      <BrigadeFigure x={-3.6} stationHue="#a8322a" />
      <BrigadeFigure x={0} stationHue="#b07a2a" />
      <BrigadeFigure x={3.6} stationHue="#3a6a9a" />
      <CameraShake />
    </>
  );
}
