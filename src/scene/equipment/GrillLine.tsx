/** Grill identity (station 0): the extraction hood over Petra's real
 *  range, the gas pilot under her skillet, and a painted heat shimmer.
 *  All ambient — emissive-only, no dynamic lights (the design doc
 *  reserves real light for meaningful events). */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Group, Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import { useGame } from "../../game/state";
import { INK, useReducedMotion } from "../artDirection";

const STEEL = "#8f979c";
const STEEL_DARK = "#4a4d52";

/** Extraction canopy: a broad steel pyramid with a grease lip and a
 *  duct climbing out of frame. Static — the under-lip strip glows by
 *  material, never by a light. */
function Hood({ x }: { x: number }) {
  return (
    <group position={[x, 0, -3.6]}>
      <mesh position={[0, 2.42, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.92, 0.62, 4]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.45} />
      </mesh>
      {/* grease lip around the canopy mouth */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[1.44, 0.07, 1.14]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* dark underside so the canopy reads hollow */}
      <mesh position={[0, 2.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.34, 1.04]} />
        <meshStandardMaterial color="#171512" roughness={0.9} side={2} />
      </mesh>
      {/* warm under-lip strip — emissive only */}
      <mesh position={[0, 2.055, 0.4]} rotation={[0.6, 0, 0]}>
        <planeGeometry args={[1.2, 0.05]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffb46a" emissiveIntensity={0.9} />
      </mesh>
      {/* duct to the ceiling void */}
      <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 1.6, 4]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* hanging rail under the lip's front edge */}
      <mesh position={[0, 1.98, 0.52]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 1.2, 8]} />
        <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
      </mesh>
      {[-0.4, 0.05, 0.42].map((px, i) => (
        <group key={i} position={[px, 1.86, 0.52]}>
          <mesh>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
            <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, i * 0.7]}>
            <cylinderGeometry args={[0.07 + i * 0.02, 0.055 + i * 0.015, 0.02, 12]} />
            <meshStandardMaterial color="#b5703f" metalness={0.75} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Gas under the skillet: blue cones, deliberately small — a burner,
 *  never the grease-fire event (orange is reserved for emergency).
 *  Flickers on the service clock; freezes rather than dies when reduced. */
function PilotFlame({ x }: { x: number }) {
  const g = useRef<Group>(null);
  const reduced = useReducedMotion();
  const phase = useGame((s) => s.phase);
  useFrame(({ clock }) => {
    if (reduced || phase !== "service" || !g.current || useGame.getState().paused) return;
    const t = clock.elapsedTime;
    g.current.children.forEach((m, i) => {
      const p = t * (9 + i * 1.3) + i * 2.6;
      m.scale.set(1 + Math.sin(p) * 0.2, 1 + Math.abs(Math.sin(p * 1.4)) * 0.35, 1);
      ((m as Mesh).material as MeshStandardMaterial).opacity = 0.55 + Math.sin(p * 1.8) * 0.15;
    });
  });
  return (
    <group position={[x, 0.885, -3.74]}>
      {/* burner ring the flame sits on */}
      <mesh position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.085, 18]} />
        <meshStandardMaterial color={INK} metalness={0.5} roughness={0.6} />
      </mesh>
      <group ref={g} visible={phase === "service"}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.052, 0.028, Math.sin(a) * 0.052]}>
              <coneGeometry args={[0.014, 0.055, 6]} />
              <meshStandardMaterial color="#7fa0ff" emissive="#5a7eff" emissiveIntensity={2.6} transparent opacity={0.6} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.04, 0]}>
          <coneGeometry args={[0.012, 0.07, 6]} />
          <meshStandardMaterial color="#dfe8ff" emissive="#aabcff" emissiveIntensity={2.8} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

let shimmerTex: CanvasTexture | null = null;
/** Heat shimmer as a still: wavy translucent streaks painted once and
 *  hung over the skillet — the plan's static texture, zero per-frame
 *  material writes. Hidden outside service (a cold line has no haze). */
function shimmerTexture() {
  if (shimmerTex) return shimmerTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = `rgba(255,250,235,${0.2 - i * 0.02})`;
    g.lineWidth = 2.4 - i * 0.2;
    g.beginPath();
    const x0 = 8 + i * 8;
    g.moveTo(x0, 122);
    for (let y = 112; y >= 8; y -= 16) {
      const w = ((y / 16 + i) % 2 === 0 ? 1 : -1) * (4 + (i % 3));
      g.quadraticCurveTo(x0 + w, y - 8, x0 + w * 0.6, y - 16);
    }
    g.stroke();
  }
  shimmerTex = new CanvasTexture(c);
  shimmerTex.colorSpace = SRGBColorSpace;
  return shimmerTex;
}

function GrillShimmer({ x }: { x: number }) {
  const phase = useGame((s) => s.phase);
  const tex = useMemo(() => shimmerTexture(), []);
  if (phase !== "service") return null;
  return (
    <mesh position={[x, 1.3, -3.72]}>
      <planeGeometry args={[0.5, 0.62]} />
      <meshBasicMaterial map={tex} transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

/** Station x is the actor's anchor; the range sits +0.197 right of it,
 *  the pan +0.047 (frozen placements from the contact study). */
export default function GrillLine({ x }: { x: number }) {
  return (
    <group>
      <Hood x={x + 0.15} />
      <PilotFlame x={x + 0.047} />
      <GrillShimmer x={x + 0.05} />
    </group>
  );
}
