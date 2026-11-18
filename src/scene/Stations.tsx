const STEEL = "#8a8d91";
const DARK = "#2c2620";

function Station({
  x,
  flame,
  color,
}: {
  x: number;
  flame?: boolean;
  color: string;
}) {
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
      <Station x={-3.6} color="#a8322a" flame /> {/* grill */}
      <Station x={0} color="#b07a2a" />          {/* sauté */}
      <Station x={3.6} color="#3a6a9a" />        {/* pastry */}
    </group>
  );
}
