/** A real brigade workspace: the anatomical cook plus the station-specific
 *  hero props their Work clip actually reaches (Dimitri's sauce pot sits
 *  where the spoon dips; Anwar's bowl is carried in the arm's cradle).
 *  One Suspense boundary per station in KitchenScene keeps boot fast and
 *  a failed GLB falls back to the illustrated cook + legacy counter. */

import { useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import BrigadeCook, { BRIGADE } from "./BrigadeCook";
import { COPPER, INK } from "./artDirection";
import StaticMerge from "./StaticMerge";
import dimitriURL from "../../assets/meshy/dimitri-pilot/runtime-dimitri.glb?url";
import anwarURL from "../../assets/meshy/anwar-pilot/runtime-anwar.glb?url";

const BODY_URL = { 1: dimitriURL, 2: anwarURL } as const;

/** Dimitri's sauce pot on the squashed counter, centred where the spoon
 *  dips mid-clip (probe: stir at local (-0.19, ~0.95, 0.33)). */
function SaucePot({ x }: { x: number }) {
  // actor-local stir point -> counter-local (actor z -3.95, counter z -3.2)
  const px = x - 0.19, pz = -3.62;
  return (
    <group position={[px, 0, pz]}>
      <StaticMerge>
      {/* low burner block lifting the pot to spoon height */}
      <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.07, 0.5]} />
        <meshStandardMaterial color="#2a2522" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.97, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.16, 18]} />
        <meshStandardMaterial color={INK} metalness={0.55} roughness={0.45} />
      </mesh>
      {/* the sauce itself — deep purée gloss */}
      <mesh position={[0, 1.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.135, 18]} />
        <meshStandardMaterial color="#7a4a22" roughness={0.35} />
      </mesh>
      {/* side handle toward the steadying left hand */}
      <mesh position={[0.2, 0.99, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.013, 0.013, 0.12, 6]} />
        <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-0.19, 0.99, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.013, 0.013, 0.1, 6]} />
        <meshStandardMaterial color={COPPER} metalness={0.6} roughness={0.4} />
      </mesh>
      </StaticMerge>
    </group>
  );
}

/** Anwar's pastry scatter on the squashed counter: ramekins + flour dust,
 *  small so his carried bowl stays the hero. */
function PastryScatter({ x }: { x: number }) {
  return (
    <group position={[x - 0.35, 0, -3.55]}>
      <StaticMerge>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[i * 0.16, 0.925, (i % 2) * 0.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.045, 12]} />
            <meshStandardMaterial color="#efe9dd" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.042, 12]} />
            <meshStandardMaterial color={["#efe0b8", "#d8a04a", "#caa050"][i]} roughness={0.6} />
          </mesh>
        </group>
      ))}
      </StaticMerge>
    </group>
  );
}

export default function BrigadeKitchen({
  index,
  x,
  onReady,
}: {
  index: 1 | 2;
  x: number;
  onReady: (ready: boolean) => void;
}) {
  const [body] = useGLTF([BODY_URL[index]]);
  useLayoutEffect(() => { onReady(true); return () => onReady(false); }, [onReady]);
  const entry = BRIGADE[index];
  return (
    <group name={`${entry.glb}-workspace`}>
      <BrigadeCook x={x} cookId={index} gltf={body as unknown as GLTF} config={entry.config} />
      {index === 1 ? <SaucePot x={x} /> : <PastryScatter x={x} />}
    </group>
  );
}
