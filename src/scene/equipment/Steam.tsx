/** Ambient steam for living equipment — the plan's hard budget:
 *  ≤ 12 sprites on screen total across ALL equipment. Counts are
 *  compile-time constants so the budget is greppable:
 *  bain-marie 4 · stockpot 4 · oven vent 2 = 10 of 12. */
export const STEAM = { bainMarie: 4, stockpot: 4, ovenVent: 2 } as const;
export const STEAM_TOTAL = STEAM.bainMarie + STEAM.stockpot + STEAM.ovenVent;

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from "three";
import { useGame } from "../../game/state";
import { useReducedMotion } from "../artDirection";

let puff: CanvasTexture | null = null;
/** One shared soft wisp — a painted radial puff, no fetch, drawn once. */
function puffTexture() {
  if (puff) return puff;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 30, 3, 32, 32, 30);
  grad.addColorStop(0, "rgba(255,252,244,0.85)");
  grad.addColorStop(0.55, "rgba(255,252,244,0.3)");
  grad.addColorStop(1, "rgba(255,252,244,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  puff = new CanvasTexture(c);
  puff.colorSpace = SRGBColorSpace;
  return puff;
}

/** A pooled steam field: `count` sprites loop up an authored drift path,
 *  fading at both ends. Nothing allocates per frame; the field unmounts
 *  outside service or under reduced motion. `level` (0..1) lets the room
 *  breathe with the station that owns it — read it from cheap boolean
 *  selectors upstream, never a per-frame number. */
export default function SteamField({
  count,
  position,
  rise = 0.62,
  drift = 0.1,
  size = 0.1,
  level = 1,
  opacity = 0.24,
  speed = 0.16,
}: {
  count: number;
  position: [number, number, number];
  rise?: number;
  drift?: number;
  size?: number;
  level?: number;
  opacity?: number;
  speed?: number;
}) {
  const reduced = useReducedMotion();
  const phase = useGame((s) => s.phase);
  const sprites = useRef<(Sprite | null)[]>([]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => (i * 0.618) % 1), [count]);
  const tex = useMemo(() => puffTexture(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < sprites.current.length; i++) {
      const sp = sprites.current[i];
      if (!sp) continue;
      const p = (t * speed + seeds[i]) % 1;
      const sway = p * drift;
      sp.position.set(
        position[0] + Math.sin(p * 6.28 + i * 1.7) * sway,
        position[1] + p * rise,
        position[2] + Math.cos(p * 4.4 + i * 2.3) * sway * 0.4
      );
      const fade = Math.sin(Math.PI * p);
      (sp.material as SpriteMaterial).opacity = opacity * fade * level;
      sp.scale.setScalar(size * (0.55 + p * 1.5));
    }
  });
  if (reduced || phase !== "service") return null;
  return (
    <group>
      {seeds.map((_, i) => (
        <sprite
          key={i}
          ref={(sp) => { sprites.current[i] = sp; }}
          position={position}
          scale={[size, size, 1]}
        >
          <spriteMaterial map={tex} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}
