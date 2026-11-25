/** Petra's real workspace: anatomical cook + actual graded equipment.
 *  Boot-only parallel load of the four GLBs; everything here hangs off
 *  one Suspense boundary in KitchenScene so the title never waits. */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import PetraCook from "./PetraCook";
import { Flames, FallingPans, StationShelf } from "./Stations";
import { useGame } from "../game/state";
import { COPPER, INK, PETROL, VERMILION } from "./artDirection";
import StaticMerge from "./StaticMerge";
import bodyURL from "../../assets/meshy/petra-pilot/runtime-hold.glb?url";
import tongsURL from "../../assets/props/tongs/prepared.glb?url";
import panURL from "../../assets/props/skillet/prepared.glb?url";
import cookerURL from "../../assets/props/cooker/prepared.glb?url";

// frozen actor-local placements from the contact study / tool fit
const COOKER_C = [0.1966936038755368, 0.01, 0.4553063961244632] as const;
const PAN_C = [0.04669360387553681, 0.91, 0.2933063961244632] as const;

function PetraStation({ x, pan, cooker }: { x: number; pan: GLTF; cooker: GLTF }) {
  const cook = useGame((s) => s.cooks[0]);
  const smotherFire = useGame((s) => s.smotherFire);
  const heat = useRef<Mesh>(null);

  const panClone = useMemo(() => {
    const c = pan.scene.clone(true);
    c.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return c;
  }, [pan]);
  const cookerClone = useMemo(() => {
    const c = cooker.scene.clone(true);
    c.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return c;
  }, [cooker]);

  useFrame(() => {
    // same overloadT glow as the legacy heat bloom, but on the real bowl
    if (heat.current) {
      const c = useGame.getState().cooks[0];
      const h = c && !c.walkedOut ? Math.min(1, c.overloadT / 8) : 0;
      const m = heat.current.material as MeshStandardMaterial;
      m.opacity = h * 0.34;
      m.emissiveIntensity = 0.4 + h * 2.2;
      heat.current.visible = h > 0.02;
    }
  });

  return (
    <>
      {/* actual equipment: actor-local coords under Petra's station root */}
      <group position={[x, 0, -4.03]}>
        <primitive object={cookerClone} position={[...COOKER_C]} dispose={null} />
        <primitive object={panClone} position={[...PAN_C]} rotation={[0, Math.PI / 4, 0]} dispose={null} />
        {/* charcoal support pad under the range */}
        <mesh position={[COOKER_C[0], 0.005, COOKER_C[2]]} receiveShadow>
          <boxGeometry args={[0.62, 0.01, 0.62]} />
          <meshStandardMaterial color="#2a2522" roughness={0.9} />
        </mesh>
        {/* grease fire sits on the actual pan: Flames' 1.35 offset lands
            at pan level through this scaled carrier */}
        {cook?.burning && (
          <group position={[PAN_C[0], PAN_C[1] - 1.35 * 0.65, PAN_C[2]]} scale={[0.18, 0.65, 0.18]}>
            <Flames />
          </group>
        )}
        {/* heat bloom on the real bowl rim */}
        <mesh ref={heat} position={[PAN_C[0], PAN_C[1] + 0.045, PAN_C[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <circleGeometry args={[0.12, 24]} />
          <meshStandardMaterial
            color="#ff5a1a"
            emissive="#ff4a0a"
            emissiveIntensity={0.4}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        {/* smother target over the actual range */}
        <mesh
          position={[COOKER_C[0], 1.05, COOKER_C[2]]}
          visible={false}
          userData={{ interact: { kind: "station", index: 0 } }}
          onClick={(e) => {
            e.stopPropagation();
            smotherFire(0);
          }}
          onPointerOver={() => {
            if (useGame.getState().cooks[0]?.burning) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          <boxGeometry args={[0.85, 1.1, 0.85]} />
        </mesh>
      </group>
      {/* legacy shelf + falling pans keep their original world placement */}
      <group position={[x, 0, -3.2]}>
        <StationShelf index={0} />
        <FallingPans cookId={0} />
      </group>
      {/* prep trolley, not the old solid counter block */}
      <group position={[x + 1.05, 0, -3.0]}>
        <StaticMerge>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.04, 0.7]} />
          <meshStandardMaterial color="#e8dcbe" roughness={0.65} />
        </mesh>
        {[[-0.38, -0.28], [0.38, -0.28], [-0.38, 0.28], [0.38, 0.28]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.44, lz]}>
            <boxGeometry args={[0.03, 0.88, 0.03]} />
            <meshStandardMaterial color="#8a8f92" metalness={0.75} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.78, 0.025, 0.58]} />
          <meshStandardMaterial color={PETROL} metalness={0.4} roughness={0.6} />
        </mesh>
        {/* folded striped tea cloth on the rear edge, clear of the plate */}
        <group position={[0.33, 0.93, -0.25]}>
          <mesh>
            <boxGeometry args={[0.18, 0.02, 0.13]} />
            <meshStandardMaterial color="#efe9dd" roughness={1} />
          </mesh>
          <mesh position={[0, 0.011, 0]}>
            <boxGeometry args={[0.18, 0.002, 0.02]} />
            <meshStandardMaterial color={VERMILION} roughness={1} />
          </mesh>
          <mesh position={[0, 0.011, 0.03]}>
            <boxGeometry args={[0.18, 0.002, 0.012]} />
            <meshStandardMaterial color={INK} roughness={1} />
          </mesh>
        </group>
        </StaticMerge>
      </group>
    </>
  );
}

export default function PetraKitchen({ x, onReady }: { x: number; onReady: (ready: boolean) => void }) {
  const [body, tool, pan, cooker] = useGLTF([bodyURL, tongsURL, panURL, cookerURL]);
  useLayoutEffect(() => { onReady(true); return () => onReady(false); }, [onReady]);
  return (
    <group name="PetraWorkspace">
      <PetraCook x={x} gltf={body as unknown as GLTF} tool={tool as unknown as GLTF} />
      <PetraStation x={x} pan={pan as unknown as GLTF} cooker={cooker as unknown as GLTF} />
    </group>
  );
}
