import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";

/** A Rodin-generated prop with baked PBR kept intact (unlike MeshyProp's
 *  grade tint — these ship textured, so re-tinting would trash the maps).
 *  Normalized to `size` on its widest horizontal axis, grounded on min-Y.
 *  `flat` lays a vertically-generated relief down onto a table top. */
export default function RodinProp({
  url,
  size,
  position,
  rotation = 0,
  flat = false,
}: {
  url: string;
  size: number;
  position: [number, number, number];
  rotation?: number;
  flat?: boolean;
}) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const m = scene.clone(true);
    // lay the relief down first so the grounding math sees final orientation
    if (flat) m.rotation.x = -Math.PI / 2;
    m.updateMatrixWorld(true);
    const box = new Box3().setFromObject(m);
    const dims = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    m.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new Group();
    wrap.add(m);
    const span = flat ? Math.max(dims.x, dims.z) : Math.max(dims.x, dims.y, dims.z);
    wrap.scale.setScalar(size / span);
    return wrap;
  }, [scene, size, flat]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={model} />
    </group>
  );
}
