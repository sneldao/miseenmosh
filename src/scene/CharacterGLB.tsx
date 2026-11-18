import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";

/** Drop-in for generated rigged models (Idol Max / Meshy GLBs).
 *  Plays the first clip found; override `clip` to pick one. */
export default function CharacterGLB({
  url,
  clip,
  ...props
}: { url: string; clip?: string } & React.ComponentProps<"group">) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  useEffect(() => {
    const name = clip ?? animations[0]?.name;
    if (name) actions[name]?.reset().fadeIn(0.3).play();
    return () => {
      if (name) actions[name]?.fadeOut(0.2);
    };
  }, [actions, animations, clip]);
  return (
    <group ref={group} {...props}>
      <primitive object={scene} />
    </group>
  );
}
