/**
 * Ambient steam on the living equipment — published, not drawn.
 *
 * This file used to render ten `THREE.Sprite`s: the bain-marie's four, the
 * stockpot's four, the oven vent's two. Ten draws for ten puffs, because a
 * sprite is one draw each, against a documented budget of "≤ 12 sprites on
 * screen total across ALL equipment" that nothing actually checked. Meanwhile
 * the pass-side plume carried fifteen puffs in a single merged quad mesh: one
 * draw.
 *
 * So the cap was written in the wrong unit, and `STEAM_TOTAL` was computed and
 * then read by nobody. Both are fixed: the caps live in `../steamBudget.ts` where
 * `steamBudget.test.ts` can assert them, and this component now *publishes a source*
 * to the one renderer instead of drawing anything of its own. Ten draws became
 * zero, and the room still has every plume it had.
 *
 * The props are unchanged on purpose. `SauceStation`, `GrillLine` and the
 * `KitchenEquipment` pieces call this with a local position inside their own
 * group; that is exactly what a mount point should look like, and it means the
 * consolidation did not have to touch a file owned by another lane. The world
 * position is resolved here, once, from the parent's matrix — the renderer has
 * no idea where a bain-marie is and should not have to learn.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { Group, Vector3 } from "three";
import {
  registerSteam,
  unregisterSteam,
  updateSteamLevel,
} from "../steamBudget";

// the per-source puff counts did not move; only where they are declared did.
// Re-exported so the three station files keep their existing imports.
export { STEAM, STEAM_EQUIPMENT_PUFFS } from "../steamBudget";

let scratch: Vector3 | null = null;

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
  const anchor = useRef<Group>(null);
  const id = useRef(-1);

  // geometry-ish props decide the registration; `level` is pushed separately
  // because it changes every time a station gets busy and re-registering on
  // that would churn the source list several times a second
  useLayoutEffect(() => {
    const g = anchor.current;
    if (!g) return;
    scratch = scratch ?? new Vector3();
    g.updateWorldMatrix(true, false);
    g.getWorldPosition(scratch);
    // a sprite's scale is its full width; a quad's size is a half extent
    id.current = registerSteam({
      x: scratch.x,
      y: scratch.y,
      z: scratch.z,
      rise,
      drift,
      size0: size * 0.275,
      size1: size * 1.025,
      life: 1 / Math.max(0.02, speed),
      puffs: count,
      alpha: opacity * 1.35,
      station: -1,
      level,
    });
    return () => {
      if (id.current >= 0) unregisterSteam(id.current);
      id.current = -1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, position[0], position[1], position[2], rise, drift, size, opacity, speed]);

  useEffect(() => {
    if (id.current >= 0) updateSteamLevel(id.current, level);
  }, [level]);

  // an empty transform: this component exists to say *where*, and to keep the
  // parent's matrix alive long enough to be read
  return <group ref={anchor} position={position} />;
}
