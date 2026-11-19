import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3, Mesh, MeshStandardMaterial } from "three";
import { useGame } from "../game/state";

type Tint = { color: string; metalness: number; roughness: number };

/** A Meshy-generated prop (meshy-t2.5 smart-topology preview, untextured GLB)
 *  normalized to `height` and re-materialled to match the kitchen grade.
 *  `wobble: "scream"` makes it rattle while the scream pulse is hot. */
export default function MeshyProp({
  url,
  height,
  position,
  rotation = 0,
  tint,
  wobble,
}: {
  url: string;
  height: number;
  position: [number, number, number];
  rotation?: number;
  tint: Tint;
  wobble?: "scream";
}) {
  const { scene } = useGLTF(url);
  const g = useRef<Group>(null);

  const model = useMemo(() => {
    const m = scene.clone(true);
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    m.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new Group();
    wrap.add(m);
    wrap.scale.setScalar(height / Math.max(size.x, size.y, size.z));
    wrap.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        mat.color?.set(tint.color);
        mat.metalness = tint.metalness;
        mat.roughness = tint.roughness;
        mat.needsUpdate = true;
      }
    });
    return wrap;
  }, [scene, height, tint]);

  useFrame(() => {
    const el = g.current;
    if (!el || wobble !== "scream") return;
    const p = useGame.getState().screamAt
      ? (performance.now() - useGame.getState().screamAt) / 1200
      : Infinity;
    const hot = p < 1 ? (1 - p) * 0.06 : 0;
    el.rotation.z = Math.sin(performance.now() / 55) * hot;
    el.position.x = position[0] + Math.sin(performance.now() / 40) * hot * 0.5;
  });

  return (
    <group ref={g} position={position} rotation={[0, rotation, 0]}>
      <primitive object={model} />
    </group>
  );
}
