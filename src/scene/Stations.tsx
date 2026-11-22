import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { useGame } from "../game/state";
import { COPPER, INK, MUSTARD, PETROL, VERMILION, signTexture, useReducedMotion } from "./artDirection";

const STONE = "#e8dcbe";
const STONE_DARK = "#cbbd9c";
const STATION_PANEL = [PETROL, MUSTARD, VERMILION] as const;
const PLAQUES = ["GRILL", "SAUCE", "PASTRY"] as const;

/** Grease fire: three jittering cones — material carries the light now. */
export function Flames() {
  const g = useRef<Group>(null);
  const reduced = useReducedMotion();
  const phase = useGame((s) => s.phase);
  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    g.current?.children.forEach((m, i) => {
      const p = t * (5 + i * 1.7) + i * 2.1;
      m.scale.set(1 + Math.sin(p) * 0.25, 1 + Math.abs(Math.sin(p * 1.3)) * 0.6, 1);
      (m as Mesh & { material: MeshStandardMaterial }).material.opacity =
        0.65 + Math.sin(p * 1.7) * 0.2;
    });
  });
  // yesterday's grease fire never carried into title or the next briefing
  if (phase === "title" || phase === "briefing") return null;
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
    </group>
  );
}

/** Pans clatter off the shelf when a cook walks out. */
export function FallingPans({ cookId }: { cookId: number }) {
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
            color={COPPER}
            metalness={0.85}
            roughness={0.35}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

/** A bunch of hanging herbs — stems tied, leaves as small droplets. */
function HerbBunch({ x, y, z, hue }: { x: number; y: number; z: number; hue: string }) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 5]} />
        <meshStandardMaterial color="#7a6a48" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[(i - 2) * 0.025, -0.12 - (i % 3) * 0.045, (i % 2 - 0.5) * 0.05]}>
          <sphereGeometry args={[0.028 - (i % 3) * 0.005, 7, 6]} />
          <meshStandardMaterial color={hue} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Braided garlic: pale bulbs down a cord. */
function GarlicBraid({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.006, 0.006, 0.3, 5]} />
        <meshStandardMaterial color="#8a7a58" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[i % 2 ? 0.03 : -0.03, -0.1 - i * 0.075, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.045, 9, 8]} />
          <meshStandardMaterial color="#efe6d0" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Enamel prep bowl with an ingredient colour inside — lower hemisphere,
 *  rim sitting on its opening so the base rests on the worktop. */
function EnamelBowl({ x, z, fill }: { x: number; z: number; fill: string }) {
  return (
    <group position={[x, 1.26, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.11, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#f0e6d2" roughness={0.5} side={2} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.008, 8, 20]} />
        <meshStandardMaterial color={PETROL} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.025, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 14]} />
        <meshStandardMaterial color={fill} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Folded tea towel over the counter edge, striped. */
function TeaTowel({ x }: { x: number }) {
  return (
    <group position={[x, 1.09, 0.56]} rotation={[0.15, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.3, 0.02, 0.26]} />
        <meshStandardMaterial color="#efe9dd" roughness={1} />
      </mesh>
      <mesh position={[0, 0.011, 0]}>
        <boxGeometry args={[0.3, 0.002, 0.05]} />
        <meshStandardMaterial color={VERMILION} roughness={1} />
      </mesh>
      <mesh position={[0, 0.011, 0.07]}>
        <boxGeometry args={[0.3, 0.002, 0.02]} />
        <meshStandardMaterial color={PETROL} roughness={1} />
      </mesh>
    </group>
  );
}

export function Station({ x, index, squash }: { x: number; index: number; squash?: number }) {
  const cook = useGame((s) => s.cooks[index]);
  const smotherFire = useGame((s) => s.smotherFire);
  const heat = useRef<Mesh>(null);
  const panel = STATION_PANEL[index];
  const plaque = useMemo(() => signTexture(PLAQUES[index], { w: 256, h: 80, bg: INK, fg: "#f3e6c8", size: 46 }), [index]);
  useEffect(() => () => plaque.dispose(), [plaque]);
  useFrame(() => {
    // the physics of the rush, made visible: the steel starts to glow
    // as a station drowns, long before the grease actually goes up
    if (heat.current) {
      const c = useGame.getState().cooks[index];
      const h = c && !c.walkedOut ? Math.min(1, c.overloadT / 8) : 0;
      const m = heat.current.material as MeshStandardMaterial;
      m.opacity = h * 0.34;
      m.emissiveIntensity = 0.4 + h * 2.2;
      heat.current.visible = h > 0.02;
    }
  });
  return (
    <group position={[x, 0, -3.2]}>
      {/* real bodies are anatomical — their benches drop to wrist height;
          squashed stations keep the counter and its props aligned to hands */}
      <group scale={[1, squash ?? (index === 0 ? 0.8 : 1), 1]}>
      {/* enamel counter front: painted panel + ink kick */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.1, 1.2]} />
        <meshStandardMaterial color={panel} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0.61]}>
        <boxGeometry args={[3.2, 0.16, 0.03]} />
        <meshStandardMaterial color={INK} roughness={0.9} />
      </mesh>
      {/* panel inset trim */}
      {[-1.15, -0.4, 0.4, 1.15].map((px) => (
        <mesh key={px} position={[px, 0.62, 0.61]}>
          <boxGeometry args={[0.5, 0.6, 0.015]} />
          <meshStandardMaterial color={panel === VERMILION ? "#c04430" : panel === MUSTARD ? "#c99a34" : "#235f61"} roughness={0.75} />
        </mesh>
      ))}
      {/* warm stone work surface, copper lip */}
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.06, 1.3]} />
        <meshStandardMaterial color={STONE} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.1, 0.66]}>
        <boxGeometry args={[3.32, 0.05, 0.05]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* station plaque on the front */}
      <mesh position={[0, 0.82, 0.635]}>
        <planeGeometry args={[0.72, 0.22]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
      {/* heat bloom on the stone — the science before the fire */}
      <mesh ref={heat} position={[0, 1.16, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[3.0, 1.0]} />
        <meshStandardMaterial
          color="#ff5a1a"
          emissive="#ff4a0a"
          emissiveIntensity={0.4}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* honest work on the surface */}
      {index === 0 && (
        <group>
          <mesh position={[0, 1.2, -0.1]} castShadow>
            <cylinderGeometry args={[0.3, 0.26, 0.08, 16]} />
            <meshStandardMaterial color="#3a3028" metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0.36, 1.21, -0.05]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.28, 0.02, 0.03]} />
            <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
          </mesh>
          <EnamelBowl x={-1.15} z={0.15} fill="#c04030" />
        </group>
      )}
      {index === 1 && (
        <group>
          <mesh position={[-0.4, 1.17, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.2, 0.1, 16]} />
            <meshStandardMaterial color="#3a3028" metalness={0.55} roughness={0.45} />
          </mesh>
          {/* cutting board + knife */}
          <mesh position={[0.6, 1.15, 0.15]} castShadow>
            <boxGeometry args={[0.7, 0.025, 0.45]} />
            <meshStandardMaterial color="#c9a26a" roughness={0.8} />
          </mesh>
          <group position={[0.65, 1.17, 0.15]} rotation={[0, 0.6, 0]}>
            <mesh>
              <boxGeometry args={[0.24, 0.008, 0.045]} />
              <meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0.17, 0, 0]}>
              <boxGeometry args={[0.1, 0.025, 0.03]} />
              <meshStandardMaterial color={INK} roughness={0.7} />
            </mesh>
          </group>
          <EnamelBowl x={1.3} z={-0.15} fill="#e2b23a" />
        </group>
      )}
      {index === 2 && (
        <group>
          <EnamelBowl x={-0.5} z={0.1} fill="#efe0b8" />
          {/* rolling pin */}
          <group position={[0.6, 1.16, 0.1]} rotation={[0, 0.4, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.5, 12]} />
              <meshStandardMaterial color="#c9a26a" roughness={0.8} />
            </mesh>
            {[-0.29, 0.29].map((hx) => (
              <mesh key={hx} position={[hx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.09, 8]} />
                <meshStandardMaterial color="#9a7a4a" roughness={0.8} />
              </mesh>
            ))}
          </group>
          <TeaTowel x={1.25} />
        </group>
      )}
      {cook?.burning && <Flames />}
      </group>
      {/* FallingPans stays world-scale: its shelf and drop use kitchen height */}
      <FallingPans cookId={index} />
      {/* smother target — fat invisible box so the click always lands */}
      <mesh
        position={[0, index === 0 ? 1.06 : 1.3, 0]}
        visible={false}
        userData={{ interact: { kind: "station", index } }}
        onClick={(e) => {
          if (!useGame.getState().cooks[index]?.burning) return;
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
      {/* shelving moved to the back wall — clear of hats, behind the cooks */}
      <StationShelf index={index} />
    </group>
  );
}

/** Back-wall shelf shared by the legacy counter and Petra's real range. */
export function StationShelf({ index }: { index: number }) {
  return (
    <group position={[0, 0, -1.4]}>
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[3, 0.05, 0.4]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.7} />
      </mesh>
      {/* hanging copper pans */}
      {[-1, -0.3, 0.5].map((px, i) => (
        <group key={i} position={[px, 2.32, 0]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.26]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, i * 0.4]}>
            <cylinderGeometry args={[0.14, 0.12, 0.03, 14]} />
            <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.18, 0.16]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
            <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* jars on the shelf */}
      {[-1.2, -0.85, 0.85, 1.25].map((px, i) => (
        <mesh key={i} position={[px, 2.72, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.22 + (i % 2) * 0.08, 8]} />
          <meshStandardMaterial
            color={["#4a7a5a", "#a04a30", "#5a7a9a", "#caa050"][i]}
            roughness={0.4}
          />
        </mesh>
      ))}
      <HerbBunch x={1.1} y={2.5} z={0.1} hue="#4a7a3a" />
      {index === 1 && <GarlicBraid x={-0.6} y={2.5} z={0.1} />}
      {index !== 1 && <HerbBunch x={-0.55} y={2.45} z={0.08} hue="#6a8a3a" />}
    </group>
  );
}

export default function Stations({ skipPetra = false, squashIdx = [] }: { skipPetra?: boolean; squashIdx?: number[] }) {
  return (
    <group>
      {!skipPetra && <Station x={-3.6} index={0} />}
      <Station x={0} index={1} squash={squashIdx.includes(1) ? 0.8 : undefined} />
      <Station x={3.6} index={2} squash={squashIdx.includes(2) ? 0.8 : undefined} />
    </group>
  );
}
