import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial } from "three";
import { useGame } from "../game/state";
import { CREAM, INK, MUSTARD, PETROL, VERMILION, signTexture } from "./artDirection";
import type { Mood } from "../game/mood";

/**
 * The mood gauge, painted in ink above each station — mounted by the
 * room lane (Dev 2) at the station top (~y 2.3), facing the pass. Reads
 * `Cook.mood` — the one field every consumer shares — so the word here
 * can never disagree with the HUD or the body.
 *
 * Shows nothing for CALM or a walked-out cook: absence is the calm read.
 * Fades on change rather than flickering; colour does the distance read
 * — STRAINED mustard, ANGRY vermilion, EDGE petrol.
 */

const STYLE: Record<Mood, { fg: string }> = {
  CALM: { fg: CREAM },
  FOCUSED: { fg: CREAM },
  STRAINED: { fg: MUSTARD },
  ANGRY: { fg: VERMILION },
  EDGE: { fg: PETROL },
};

const textures = new Map<Mood, ReturnType<typeof signTexture>>();
function glyphTexture(mood: Mood) {
  let t = textures.get(mood);
  if (!t) {
    t = signTexture(mood, { w: 256, h: 64, bg: INK, fg: STYLE[mood].fg, size: 38 });
    textures.set(mood, t);
  }
  return t;
}

export function MoodGlyph({ index, position = [0, 2.3, 0] }: { index: number; position?: [number, number, number] }) {
  const mood = useGame((s) => s.cooks[index]?.mood);
  const walkedOut = useGame((s) => s.cooks[index]?.walkedOut ?? true);
  const mesh = useRef<Mesh>(null);
  const shown = !walkedOut && mood !== undefined && mood !== "CALM";

  useFrame((_, dt) => {
    const m = mesh.current?.material as MeshBasicMaterial | undefined;
    if (!m) return;
    // fade/change, never flicker: opacity glides toward its target
    const target = shown ? 1 : 0;
    m.opacity += (target - m.opacity) * Math.min(1, dt * 6);
    if (mesh.current) mesh.current.visible = m.opacity > 0.02;
  });

  const tex = useMemo(() => glyphTexture(mood ?? "FOCUSED"), [mood]);
  return (
    <group position={position}>
      <mesh ref={mesh} visible={false}>
        <planeGeometry args={[1.15, 0.29]} />
        <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
