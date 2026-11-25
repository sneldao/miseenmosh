import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";

/** Drop-in for generated rigged models (Rodin / Meshy GLBs).
 *  Plays the first clip found; override `clip` to pick one.
 *  `clip` may change at runtime: the old action fades out while the new
 *  fades in, so state-driven crossfades (walk → serve → idle) are smooth. */
export default function CharacterGLB({
  url,
  clip,
  fade = 0.3,
  ...props
}: { url: string; clip?: string; fade?: number } & React.ComponentProps<"group">) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string | null>(null);
  useEffect(() => {
    const name = clip ?? animations[0]?.name ?? null;
    const prev = current.current;
    if (name === prev) return;
    if (prev && actions[prev]) actions[prev].fadeOut(fade);
    if (name && actions[name]) actions[name].reset().fadeIn(fade).play();
    current.current = name;
    return () => {
      // only fade out on unmount, not on clip change (the next effect owns it)
      if (name && current.current === name) {
        actions[name]?.fadeOut(0.2);
        current.current = null;
      }
    };
  }, [actions, animations, clip, fade]);
  return (
    <group ref={group} {...props}>
      <primitive object={scene} />
    </group>
  );
}
