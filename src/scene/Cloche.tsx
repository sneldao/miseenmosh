import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3, Mesh, MeshStandardMaterial } from "three";
import { useGame } from "../game/state";

/** The ceremonial cloche on the pass — Meshy meshy-t2.5, baked GLB.
 *  Hops and spins when a fresh plate lands for judging. */
export default function Cloche() {
  const { scene } = useGLTF("/models/cloche.glb");
  const g = useRef<Group>(null);
  const lastPlate = useRef(-1);
  const born = useRef(0);

  // normalize: centre it, sit its base at y=0, stand ~0.5 tall
  const model = useMemo(() => {
    const m = scene.clone(true);
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    m.position.set(-c.x, -box.min.y, -c.z);
    const s = 0.5 / Math.max(size.x, size.y, size.z);
    const wrap = new Group();
    wrap.add(m);
    wrap.scale.setScalar(s);
    // untextured preview — dress it as tarnished silver ourselves
    wrap.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        mat.color?.set("#b8bcc2");
        mat.metalness = 0.9;
        mat.roughness = 0.32;
        mat.needsUpdate = true;
      }
    });
    return wrap;
  }, [scene]);

  useFrame(({ clock }) => {
    const s = useGame.getState();
    const el = g.current;
    if (!el) return;
    const plate = s.tickets.find((t) => t.state === "pass");
    if (plate && plate.id !== lastPlate.current) {
      lastPlate.current = plate.id;
      born.current = clock.elapsedTime;
    }
    if (!plate) lastPlate.current = -1;
    const p = clock.elapsedTime - born.current;
    const hop = p < 0.7 ? Math.sin(p * 9) * 0.11 * (1 - p / 0.7) : 0;
    el.position.y = 1.16 + Math.max(0, hop);
    el.rotation.y = p < 0.7 ? p * 4 : el.rotation.y;
  });

  return (
    <group ref={g} position={[2.7, 1.16, 2.15]}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/models/cloche.glb");
