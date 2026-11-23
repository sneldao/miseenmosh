/** Pastry-station identity (station 2): a cooling rack of tarts and a
 *  working scale on the counter — station-local, mounted inside
 *  Station's squashed group. (The oven is scene-level: it stands in
 *  the gap beside Anwar, not on his bench.) */

const STEEL = "#8f979c";
const BRASS = "#c9a24a";

export default function PastryStation() {
  return (
    <group>
      {/* tart rack: a little wire cooling rack, today's tarts on it */}
      <group position={[1.15, 1.15, -0.35]}>
        {[[-0.16, -0.1], [0.16, -0.1], [-0.16, 0.1], [0.16, 0.1]].map(([px, pz], i) => (
          <mesh key={i} position={[px, 0.09, pz]}>
            <cylinderGeometry args={[0.008, 0.008, 0.18, 6]} />
            <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
        {[0.02, 0.16].map((py, i) => (
          <mesh key={i} position={[0, py, 0]}>
            <boxGeometry args={[0.36, 0.008, 0.24]} />
            <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.4} transparent opacity={0.75} />
          </mesh>
        ))}
        {/* tarts: dark shells, bright fillings — read at distance */}
        {[[-0.09, "#c04030"], [0.07, "#dfaa3c"]].map(([px, fill], i) => (
          <group key={i} position={[Number(px), 0.028, i * 0.06 - 0.03]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.045, 0.022, 12]} />
              <meshStandardMaterial color="#8a5c2c" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.045, 12]} />
              <meshStandardMaterial color={fill as string} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.05, 0.168, 0.02]}>
          <cylinderGeometry args={[0.05, 0.042, 0.02, 12]} />
          <meshStandardMaterial color="#8a5c2c" roughness={0.8} />
        </mesh>
      </group>
      {/* the scale — pastry is weighed, never guessed */}
      <group position={[0.72, 1.15, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.025, 0.12]} />
          <meshStandardMaterial color={BRASS} metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.012, 0.02, 0.07, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.55} roughness={0.4} />
        </mesh>
        {/* dial face reading the room */}
        <mesh position={[0, 0.062, 0.035]} rotation={[-0.3, 0, 0]}>
          <circleGeometry args={[0.028, 14]} />
          <meshStandardMaterial color="#f2ead6" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.066, 0.042]} rotation={[-0.3, 0, -0.7]}>
          <boxGeometry args={[0.002, 0.018, 0.002]} />
          <meshStandardMaterial color="#302c2b" roughness={0.6} />
        </mesh>
        {/* pan on top with a dust of flour on it */}
        <mesh position={[0, 0.105, 0]}>
          <cylinderGeometry args={[0.055, 0.04, 0.014, 14]} />
          <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.113, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.038, 12]} />
          <meshStandardMaterial color="#f6efe0" roughness={0.95} />
        </mesh>
      </group>
      {/* flour dust on the bench — pastry lives powdered */}
      <mesh position={[0.95, 1.157, -0.05]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <circleGeometry args={[0.16, 14]} />
        <meshStandardMaterial color="#f6efe0" roughness={1} transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}
