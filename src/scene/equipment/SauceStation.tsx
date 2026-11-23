/** Sauce-station identity (station 1): a bain-marie holding two sauces
 *  at a simmer, a second pot and the ladle. Authored in station-local
 *  space — mounted inside Station's squashed group so it lands on the
 *  counter whether the bench is squashed for the rig or not. Steam
 *  draws from the shared ambient budget (Steam.tsx) and swells with
 *  how hard Dimitri is actually working. */

import { useGame } from "../../game/state";
import { COPPER, INK } from "../artDirection";
import SteamField, { STEAM } from "./Steam";

const STEEL = "#8f979c";

export default function SauceStation() {
  // equipment reads state through cheap boolean selectors — steam level
  // changes only when Dimitri's working flag or heat crosses a threshold
  const working = useGame((s) => s.tickets.some((t) => t.station === 1 && t.state === "plating"));
  const hot = useGame((s) => (s.cooks[1]?.overloadT ?? 0) > 4);
  const out = useGame((s) => !!s.cooks[1]?.walkedOut);
  const level = out ? 0.12 : (working ? 0.85 : 0.35) + (hot ? 0.15 : 0);
  return (
    <group>
      {/* bain-marie: a steel water bath on the counter's back edge */}
      <group position={[0.35, 1.15, -0.42]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.07, 0.4]} />
          <meshStandardMaterial color={STEEL} metalness={0.65} roughness={0.4} />
        </mesh>
        {/* the bath water — dark gloss under the pots */}
        <mesh position={[0, 0.037, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.66, 0.34]} />
          <meshStandardMaterial color="#2e3a3c" roughness={0.15} metalness={0.3} />
        </mesh>
        {/* two inset sauce pots, tops proud of the bath */}
        {[[-0.18, "#7a4a22"], [0.18, "#a8742c"]].map(([px, sauce], i) => (
          <group key={i} position={[Number(px), 0.05, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.095, 0.085, 0.12, 16]} />
              <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.082, 16]} />
              <meshStandardMaterial color={sauce as string} roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* the ladle, resting across the rim */}
        <group position={[0.28, 0.09, 0.14]} rotation={[0, 0.5, 0.15]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
            <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0.15, -0.015, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.035, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} side={2} />
          </mesh>
        </group>
      </group>
      {/* simmer steam — its share of the ≤12 ambient budget */}
      <SteamField count={STEAM.bainMarie} position={[0.35, 1.3, -0.42]} rise={0.55} drift={0.07} size={0.09} level={level} />
      {/* the second pot — a sauce station never runs one pot */}
      <group position={[-0.95, 1.15, -0.4]}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.11, 0.15, 16]} />
          <meshStandardMaterial color={INK} metalness={0.55} roughness={0.45} />
        </mesh>
        {/* lid ajar — the pot is alive, not stored */}
        <mesh position={[0.02, 0.155, 0]} rotation={[0.12, 0, 0.1]}>
          <cylinderGeometry args={[0.125, 0.125, 0.015, 16]} />
          <meshStandardMaterial color={INK} metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh position={[0.15, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
          <meshStandardMaterial color={COPPER} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
