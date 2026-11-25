/** Scene-level living equipment — everything that stands on the floor
 *  or hangs off the room rather than on a station bench: grill line
 *  (hood, pilot flame, shimmer), the pastry oven in the gap, the
 *  stockpot that rattles on fire calls, the wash-up corner on the left
 *  flank (where the porter is actually headed — his literal exit is
 *  off-frame), crates and floor flour. Mounted once in KitchenScene.
 *
 *  Budget rules honoured: steam costs 1 draw for the whole room (see
 *  ../steamBudget.ts — the cap is in draws, not sprites, because a sprite
 *  is one draw each), flame/shimmer emissive-only — zero dynamic lights,
 *  no per-frame allocation, reduced-motion suppresses every animation. */

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Group, Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import { useGame } from "../../game/state";
import { sfx } from "../../game/sound";
import { COPPER, INK, LINE_SHIFT, MUSTARD, PETROL, signTexture, useReducedMotion } from "../artDirection";
import GrillLine from "./GrillLine";
import SteamField, { STEAM } from "./Steam";
import RodinProp from "../RodinProp";
import PropBoundary from "../PropBoundary";
import { modelUrl } from "../modelUrl";
import StaticMerge from "../StaticMerge";

const STEEL = "#8f979c";
const STEEL_DARK = "#4a4d52";
const TUB = "#6f7a74";

/** The pastry oven stands in the gap between sauce and pastry — its
 *  door glows amber while a soufflé is actually plating, so the room
 *  reacts to real game state, not a loop. */
function Oven() {
  const souffle = useGame((s) =>
    s.tickets.some((t) => t.station === 2 && t.state === "plating" && t.dish === "Soufflé (weeping)")
  );
  const glow = useRef<Mesh>(null);
  useFrame((_, dt) => {
    const m = glow.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const target = souffle ? 2.4 : 0.12;
    m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 6);
  });
  return (
    <group position={[1.75, 0, -4.4]}>
      <StaticMerge>
      {/* carcass */}
      {[0.32, -0.32].map((px, i) => (
        <mesh key={i} position={[px, 0.05, 0.22]}>
          <cylinderGeometry args={[0.025, 0.03, 0.1, 8]} />
          <meshStandardMaterial color={INK} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 1.46, 0.6]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.45} />
      </mesh>
      {/* backguard with the knob row */}
      <mesh position={[0, 1.62, -0.24]}>
        <boxGeometry args={[0.86, 0.32, 0.08]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.55} roughness={0.5} />
      </mesh>
      {[-0.24, -0.08, 0.08, 0.24].map((px, i) => (
        <mesh key={i} position={[px, 1.64, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.03, 10]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      ))}
      {/* two burners on top — the oven works as a range too */}
      {[-0.2, 0.2].map((px, i) => (
        <mesh key={i} position={[px, 1.52, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.09, 0.13, 18]} />
          <meshStandardMaterial color={INK} metalness={0.5} roughness={0.55} />
        </mesh>
      ))}
      {/* the door: dark glass with the fire inside it */}
      <mesh position={[0, 0.72, 0.302]}>
        <planeGeometry args={[0.68, 0.78]} />
        <meshStandardMaterial color="#171512" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh ref={glow} position={[0, 0.72, 0.306]} userData={{ staticMerge: false }}>
        <planeGeometry args={[0.56, 0.6]} />
        <meshStandardMaterial color="#3a2410" emissive="#ff9a3a" emissiveIntensity={0.12} />
      </mesh>
      {/* rack silhouettes over the glow */}
      {[0.58, 0.72, 0.86].map((py, i) => (
        <mesh key={i} position={[0, py, 0.31]}>
          <planeGeometry args={[0.56, 0.014]} />
          <meshStandardMaterial color="#141110" roughness={0.8} />
        </mesh>
      ))}
      {/* copper door handle */}
      <mesh position={[0, 1.22, 0.33]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.6, 8]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* vent steam off the top rear — its budget share */}
      <group userData={{ staticMerge: false }}>
        <SteamField count={STEAM.ovenVent} position={[0.28, 1.56, -0.18]} rise={0.5} drift={0.06} size={0.08} level={souffle ? 1 : 0.3} opacity={0.2} />
      </group>
      </StaticMerge>
    </group>
  );
}

/** The stockpot lives in the left gap: always simmering, and its lid
 *  rattles when the pass calls a fire — equipment that answers the
 *  game, not a loop. */
function Stockpot() {
  const lid = useRef<Group>(null);
  const known = useRef<Set<number>>(new Set());
  const rattleUntil = useRef(-1);
  const rangAt = useRef(-10);
  const reduced = useReducedMotion();
  useFrame(() => {
    const s = useGame.getState();
    // a fire call lands as a new plating ticket — the pot answers the
    // pass. The scan mutates the known set in place: no per-frame alloc.
    if (s.phase === "service" && !s.paused) {
      let fresh = false, count = 0;
      for (const t of s.tickets) {
        if (t.state !== "plating") continue;
        count++;
        if (!known.current.has(t.id)) fresh = true;
      }
      if (fresh || count !== known.current.size) {
        if (fresh) {
          rattleUntil.current = s.serviceTime + 0.85;
          if (s.serviceTime - rangAt.current > 1.2) {
            rangAt.current = s.serviceTime;
            sfx("rattle", { pan: -0.2, vol: 0.32 });
          }
        }
        known.current.clear();
        for (const t of s.tickets) if (t.state === "plating") known.current.add(t.id);
      }
    }
    if (!lid.current) return;
    if (reduced) return;
    const p = s.serviceTime - (rattleUntil.current - 0.85);
    const on = p >= 0 && p < 0.85;
    const decay = on ? 1 - p / 0.85 : 0;
    lid.current.position.y = on ? Math.abs(Math.sin(p * 22)) * 0.022 * decay : 0;
    lid.current.rotation.z = on ? Math.sin(p * 17) * 0.07 * decay : 0;
  });
  return (
    <group position={[-2.0, 0, -4.35]}>
      <StaticMerge>
      {/* low burner block */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#2a2522" roughness={0.85} />
      </mesh>
      {/* the pot — stock never lies */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.27, 0.44, 18]} />
        <meshStandardMaterial color={STEEL} metalness={0.65} roughness={0.4} />
      </mesh>
      {[-0.33, 0.33].map((px, i) => (
        <mesh key={i} position={[px, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* the lid that rattles on fire calls */}
      <group ref={lid} position={[0, 0.89, 0]} userData={{ staticMerge: false }}>
        <mesh>
          <cylinderGeometry args={[0.29, 0.31, 0.035, 18]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      </group>
      {/* stock simmer — its budget share */}
      <group userData={{ staticMerge: false }}>
        <SteamField count={STEAM.stockpot} position={[0.1, 0.94, 0.05]} rise={0.7} drift={0.1} size={0.11} level={0.7} />
      </group>
      </StaticMerge>
    </group>
  );
}

/** Wash-up on the left flank, where the porter's haul actually goes:
 *  sink table, stacked bus tubs, the painted WASH-UP sign on the back
 *  wall. (His literal exit at x −9.6 is off-frame; the flank is where
 *  the camera can see the corner he works toward.) */
function WashUp() {
  const sign = useMemo(() => signTexture("WASH-UP", { w: 384, h: 96, bg: INK, fg: "#f3e6c8", size: 52 }), []);
  return (
    <group position={[-6.0, 0, -4.3]}>
      <StaticMerge>
      {/* the sign on the back wall above the station */}
      <mesh position={[0, 2.15, -0.52]}>
        <planeGeometry args={[1.5, 0.38]} />
        <meshStandardMaterial map={sign} roughness={0.8} />
      </mesh>
      {/* sink table */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.06, 0.6]} />
        <meshStandardMaterial color={STEEL} metalness={0.65} roughness={0.4} />
      </mesh>
      {[[-0.58, -0.24], [0.58, -0.24], [-0.58, 0.24], [0.58, 0.24]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.44, pz]}>
          <boxGeometry args={[0.04, 0.88, 0.04]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* the basin — dark recess with a water skin */}
      <mesh position={[-0.3, 0.905, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.45]} />
        <meshStandardMaterial color="#3d4447" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-0.3, 0.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.52, 0.37]} />
        <meshStandardMaterial color="#2c4a50" roughness={0.1} metalness={0.3} />
      </mesh>
      {/* faucet */}
      <mesh position={[-0.3, 1.08, -0.24]}>
        <cylinderGeometry args={[0.016, 0.016, 0.34, 8]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[-0.3, 1.24, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.26, 8]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* drying rack on the right half: a clean stack waiting to go back */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.34, 0.94 + i * 0.025, 0.05]} rotation={[0, i * 0.35, 0.08]}>
          <cylinderGeometry args={[0.14, 0.12, 0.02, 14]} />
          <meshStandardMaterial color="#f2ead6" roughness={0.5} />
        </mesh>
      ))}
      {/* the tub rack under the bench — the porter's own shelves */}
      {[0.18, 0.44].map((py, i) => (
        <group key={i}>
          <mesh position={[0, py, 0]}>
            <boxGeometry args={[1.2, 0.03, 0.5]} />
            <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.55} />
          </mesh>
          <mesh position={[-0.28 + i * 0.5, py + 0.12, 0]}>
            <boxGeometry args={[0.42, 0.18, 0.34]} />
            <meshStandardMaterial color={TUB} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* the wet floor — a sheen the mop never quite wins */}
      <mesh position={[0.1, 0.006, 0.55]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[1.1, 0.7]} />
        <meshStandardMaterial color="#2c4a50" roughness={0.08} metalness={0.4} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      </StaticMerge>
      {/* the porter's backlog: two hauled-in bus tubs stacked on the floor
          beside the sink table, waiting their turn. Real Rodin geometry —
          the procedural rack tubs below stay, these are the dirty arrivals. */}
      <PropBoundary fallback={null}>
        <Suspense fallback={null}>
          <RodinProp url={modelUrl("bustub.glb")} size={0.5} position={[1.0, 0, 0.35]} rotation={0.25} />
          <RodinProp url={modelUrl("bustub.glb")} size={0.5} position={[1.0, 0.21, 0.35]} rotation={-0.12} />
        </Suspense>
      </PropBoundary>
    </group>
  );
}

/** Produce crates on the right flank — the dead zone earns its keep. */
function Crates() {
  return (
    <group>
      <StaticMerge>
      {[[5.8, -4.3, 0], [5.75, -4.28, 1], [6.35, -3.8, 0.4]].map(([cx, cz, ry], i) => (
        <group key={i} position={[cx, i === 1 ? 0.34 : 0.17, cz]} rotation={[0, ry + i * 0.14, 0]}>
          {/* slatted crate: frame + darker hollow top */}
          <mesh castShadow>
            <boxGeometry args={[0.56, 0.34, 0.42]} />
            <meshStandardMaterial color="#8a6a44" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.171, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.48, 0.34]} />
            <meshStandardMaterial color="#4a3823" roughness={0.95} />
          </mesh>
          {/* the produce — colour reads before shape at this distance */}
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[-0.14 + j * 0.13, 0.185, (j % 2) * 0.1 - 0.05]}>
              <sphereGeometry args={[0.055, 8, 7]} />
              <meshStandardMaterial color={["#b0402a", "#4a7a3a", "#caa050"][(i + j) % 3]} roughness={0.75} />
            </mesh>
          ))}
          {/* slat lines */}
          {[-0.09, 0.09].map((sy) => (
            <mesh key={sy} position={[0, sy, 0.211]}>
              <planeGeometry args={[0.54, 0.03]} />
              <meshStandardMaterial color="#6a5236" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      </StaticMerge>
    </group>
  );
}

let dustTex: CanvasTexture | null = null;
/** Floor flour — a few soft overlapping hand-painted blobs, drawn once. */
function dustTexture() {
  if (dustTex) return dustTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 96;
  const g = c.getContext("2d")!;
  const blobs: [number, number, number, number, number][] = [
    [52, 50, 34, 22, 0.5],
    [82, 42, 22, 15, 0.35],
    [34, 62, 18, 12, 0.4],
    [68, 66, 14, 9, 0.3],
    [96, 58, 10, 7, 0.25],
  ];
  for (const [x, y, rx, ry, a] of blobs) {
    const grad = g.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
    grad.addColorStop(0, `rgba(246,239,224,${a})`);
    grad.addColorStop(1, "rgba(246,239,224,0)");
    g.fillStyle = grad;
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  dustTex = new CanvasTexture(c);
  dustTex.colorSpace = SRGBColorSpace;
  return dustTex;
}

function FlourDust() {
  const tex = useMemo(() => dustTexture(), []);
  return (
    <group>
      {/* trailed flour out the back of Anwar's bench */}
      <mesh position={[4.7, 0.01, -4.0]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <planeGeometry args={[1.0, 0.72]} />
        <meshBasicMaterial map={tex} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* and a scuff nearer the pass — flour travels on boots */}
      <mesh position={[5.1, 0.01, -2.4]} rotation={[-Math.PI / 2, 0, -0.7]}>
        <planeGeometry args={[0.6, 0.44]} />
        <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function KitchenEquipment() {
  return (
    <group>
      <GrillLine x={-3.6} />
      <Oven />
      <Stockpot />
      {/* the pot-wash bay is back-of-house, not the line: cancel the line
          shift so it stays where it was built — which is exactly the strip
          the restage opened behind the cooks, and where the washer works */}
      <group position={[0, 0, -LINE_SHIFT]}>
        <WashUp />
      </group>
      <Crates />
      <FlourDust />
    </group>
  );
}
