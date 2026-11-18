import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PointLight, Mesh, MeshStandardMaterial } from "three";
import { useGame } from "../game/state";

const STEEL = "#8a8d91";
const DARK = "#2c2620";

/** Grease fire: three jittering cones + a flickering light. */
function Flames() {
  const g = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 5 + Math.sin(t * 23) * 2 + Math.sin(t * 41) * 1.2;
    g.current?.children.forEach((m, i) => {
      const p = t * (5 + i * 1.7) + i * 2.1;
      m.scale.set(1 + Math.sin(p) * 0.25, 1 + Math.abs(Math.sin(p * 1.3)) * 0.6, 1);
      (m as Mesh & { material: MeshStandardMaterial }).material.opacity =
        0.65 + Math.sin(p * 1.7) * 0.2;
    });
  });
  return (
    <group position={[0, 1.35, 0]}>
      <group ref={g}>
        {[-0.5, 0, 0.45].map((x, i) => (
          <mesh key={i} position={[x, 0.28, 0.1 * i]}>
            <coneGeometry args={[0.22 - i * 0.04, 0.55 - i * 0.1, 7]} />
            <meshStandardMaterial
              color={i === 1 ? "#ff9a2a" : "#ff5a1a"}
              emissive="#ff6a1a"
              emissiveIntensity={1.6}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.6, 0.3]} color="#ff7a2a" intensity={5} distance={5} />
    </group>
  );
}

/** Pans clatter off the shelf when a cook walks out. */
function FallingPans({ cookId }: { cookId: number }) {
  const pans = useRef<(Mesh | null)[]>([null, null]);
  const mats = useRef<(MeshStandardMaterial | null)[]>([null, null]);
  useFrame(() => {
    const s = useGame.getState();
    const c = s.cooks[cookId];
    if (!c || c.walkoutAt < 0) return;
    const p = s.serviceTime - c.walkoutAt - 0.25;
    if (p < 0 || p > 4.5) {
      pans.current.forEach((m) => m && (m.visible = false));
      return;
    }
    const fall = Math.max(0.05, 2.72 - 4.9 * p * p);
    const bounce =
      p > 0.75 ? 0.05 + Math.abs(Math.sin((p - 0.75) * 5)) * 0.55 * Math.exp(-(p - 0.75) * 2.4) : fall;
    pans.current.forEach((m, i) => {
      if (!m) return;
      m.visible = true;
      m.position.set(-0.5 + i * 1.1 + p * (i ? 0.5 : -0.35), Math.max(0.05, bounce), 0.1 + i * 0.15);
      m.rotation.set(p * 7 + i, p * 3, p * 5);
      const mat = mats.current[i];
      if (mat) mat.opacity = p > 3.4 ? Math.max(0, 1 - (p - 3.4)) : 1;
    });
  });
  return (
    <group>
      {[0, 1].map((i) => (
        <mesh key={i} visible={false} ref={(m) => { pans.current[i] = m; }}>
          <cylinderGeometry args={[0.16, 0.13, 0.045, 14]} />
          <meshStandardMaterial
            ref={(m) => { mats.current[i] = m; }}
            color="#b06030"
            metalness={0.85}
            roughness={0.35}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

function Station({
  x,
  flame,
  color,
  index,
}: {
  x: number;
  flame?: boolean;
  color: string;
  index: number;
}) {
  const cook = useGame((s) => s.cooks[index]);
  const smotherFire = useGame((s) => s.smotherFire);
  return (
    <group position={[x, 0, -3.2]}>
      {/* counter */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.1, 1.2]} />
        <meshStandardMaterial color={DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <boxGeometry args={[3.3, 0.06, 1.3]} />
        <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* accent stripe */}
      <mesh position={[0, 0.9, 0.62]}>
        <boxGeometry args={[3.2, 0.16, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* pans / flame */}
      {flame && (
        <>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.3, 0.26, 0.1, 16]} />
            <meshStandardMaterial color="#1c1c1c" metalness={0.6} roughness={0.5} />
          </mesh>
          <pointLight position={[0, 1.5, 0]} color="#ff7a2a" intensity={3} distance={3} />
        </>
      )}
      {cook?.burning && <Flames />}
      <FallingPans cookId={index} />
      {/* smother target — fat invisible box so the click always lands */}
      <mesh
        position={[0, 1.3, 0]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          smotherFire(index);
        }}
        onPointerOver={() => {
          if (useGame.getState().cooks[index]?.burning) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[3.4, 1.8, 1.6]} />
      </mesh>
      {/* shelving above */}
      <mesh position={[0, 2.6, -0.2]}>
        <boxGeometry args={[3, 0.05, 0.5]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.4} />
      </mesh>
      {/* hanging copper pans */}
      {[-1, -0.3, 0.5].map((px, i) => (
        <group key={i} position={[px, 2.32, -0.15]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.26]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, i * 0.4]}>
            <cylinderGeometry args={[0.14, 0.12, 0.03, 14]} />
            <meshStandardMaterial color="#b06030" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.18, 0.16]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
            <meshStandardMaterial color="#b06030" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* bottles on the shelf */}
      {[-1.2, -0.9, 0.9, 1.25].map((px, i) => (
        <mesh key={i} position={[px, 2.72, -0.2]}>
          <cylinderGeometry args={[0.04, 0.05, 0.22 + (i % 2) * 0.08, 8]} />
          <meshStandardMaterial
            color={["#2a5a3a", "#6a2a1a", "#3a4a6a", "#5a4a2a"][i]}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Stations() {
  return (
    <group>
      <Station x={-3.6} color="#a8322a" flame index={0} /> {/* grill */}
      <Station x={0} color="#b07a2a" index={1} />          {/* sauté */}
      <Station x={3.6} color="#3a6a9a" index={2} />        {/* pastry */}
    </group>
  );
}
