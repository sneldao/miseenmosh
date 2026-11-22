import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useGame } from "../game/state";
import { COPPER, useReducedMotion } from "./artDirection";
import { SAUCE_CENTRE } from "./FoodModel";

/** The chef's hand and whisk working a split sauce back together — shared by
 *  the world plate and the first-person held plate.
 *
 *  foodScale places the working tip in FoodModel local units (the caller's
 *  food group already applies the plate's own scale, so multiply positions by
 *  the same factor as <FoodModel scale>). toolScale sizes the hand/whisk
 *  itself — in first person the tool must read against the bigger hand props,
 *  not against the 0.27-scaled plate.
 *
 *  The ellipse is a pure function of service time: a paused service freezes
 *  mid-stroke; reduced motion holds the contact pose. */
export default function PlateCorrection({
  foodScale,
  toolScale = foodScale,
}: {
  foodScale: number;
  toolScale?: number;
}) {
  const g = useRef<Group>(null);
  const reduced = useReducedMotion();
  useFrame(() => {
    if (!g.current) return;
    const s = useGame.getState();
    const e = Math.max(0, s.serviceTime - (s.correction?.startedAt ?? s.serviceTime));
    if (reduced) {
      g.current.position.set(SAUCE_CENTRE[0] * foodScale, 0.012 * foodScale, SAUCE_CENTRE[1] * foodScale);
    } else {
      g.current.position.set(
        (SAUCE_CENTRE[0] + Math.cos(e * 7) * 0.025) * foodScale,
        0.012 * foodScale,
        (SAUCE_CENTRE[1] + Math.sin(e * 7) * 0.025) * foodScale
      );
    }
  });
  return (
    <group>
      <group ref={g} position={[SAUCE_CENTRE[0] * foodScale, 0.012 * foodScale, SAUCE_CENTRE[1] * foodScale]}>
        <group scale={toolScale}>
        {/* handle rises .22 from the sauce to the mitten above it */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
          <meshStandardMaterial color={COPPER} roughness={0.4} />
        </mesh>
        {/* wire whisk basket at the working end */}
        {[0, 1, 2].map((j) => (
          <mesh key={j} position={[0, 0.025, 0]} rotation={[0, (j * Math.PI) / 3, 0]}>
            <torusGeometry args={[0.024, 0.0035, 4, 12]} />
            <meshStandardMaterial color={COPPER} roughness={0.35} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.235, 0.01]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color="#c99772" roughness={0.85} />
        </mesh>
          <mesh position={[0, 0.285, 0.015]}>
            <cylinderGeometry args={[0.048, 0.055, 0.05, 10]} />
            <meshStandardMaterial color="#f2ead6" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
