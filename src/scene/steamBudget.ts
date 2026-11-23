/**
 * Steam, in one place, counted in the unit the frame actually pays.
 *
 * There were two steam systems in this room. Dev 2's `equipment/Steam.tsx`
 * pooled `THREE.Sprite`s on the bain-marie, the stockpot and the oven vent —
 * ten puffs, ten draw calls, because a sprite is one draw each. The pass-side
 * plume (`scene/Steam.tsx`) put fifteen puffs in one merged quad mesh, one
 * draw. The documented cap said "≤ 12 sprites on screen total across ALL
 * equipment", so in the written unit the room was at 25 against a cap of 12,
 * and in the unit that matters it was at 11 draws for the same 25 puffs.
 *
 * Both numbers were wrong in different ways, and the reason is that the cap was
 * prose in a comment: `STEAM_TOTAL` was computed and then never read by
 * anything. A budget that nothing checks is a wish.
 *
 * So: one renderer (the merged quads), one registry (below), and the caps here
 * are the ones `steamBudget.test.ts` asserts. Equipment files keep their call sites —
 * `SteamField` changed from "draw ten sprites" to "publish one source", and no
 * station file had to be touched to get there.
 *
 * This module is deliberately pure JavaScript: no `three`, no React, no DOM.
 * That is what lets the budget be unit-tested instead of being hoped for.
 */

/**
 * The unit the frame pays. Every steam system in the room is the same merged
 * mesh, so the whole room is one draw no matter how many puffs it carries.
 * Raise this only with a measurement, and raise `STEAM_PUFF_CAP` instead if
 * what you actually want is more vapour.
 */
export const STEAM_DRAW_CAP = 1;

/** Draw calls each steam system contributes. One entry, and that is the point. */
export const STEAM_DRAWS = { plume: 1 } as const;

export function steamDraws(): number {
  return Object.values(STEAM_DRAWS).reduce((a, b) => a + b, 0);
}

/** Puff counts on the equipment, compile-time so the budget is greppable. */
export const STEAM = { bainMarie: 4, stockpot: 4, ovenVent: 2 } as const;
export const STEAM_EQUIPMENT_PUFFS = STEAM.bainMarie + STEAM.stockpot + STEAM.ovenVent;

/**
 * Slots allocated in the merged geometry. Every slot is four vertices and the
 * unused ones are written to alpha 0, so headroom is nearly free — but it is
 * still finite, and a source registered past the end of it would silently not
 * draw. That is the failure this constant exists to make impossible.
 */
export const STEAM_MAX_SLOTS = 32;

/** Puffs one merged mesh is allowed to carry: fill rate, not draw calls. */
export const STEAM_PUFF_CAP = 26;

export interface SteamSource {
  x: number;
  y: number;
  z: number;
  /** metres a puff climbs over one life */
  rise: number;
  /** metres of lateral wander at the top of the climb */
  drift: number;
  /** half-extent of a puff at birth and at death, in metres */
  size0: number;
  size1: number;
  /** seconds for one puff, start to gone */
  life: number;
  puffs: number;
  /** peak opacity of a single puff */
  alpha: number;
  /**
   * Station index whose heat drives this plume (0 sauce, 1 range, 2 pastry,
   * 3 the pot-wash bay), or -1 for a source that pushes its own `level` — which
   * is what the equipment does, because its steam answers a soufflé and not a
   * station's overload.
   */
  station: number;
  /** only read when `station` is -1 */
  level: number;
}

/**
 * The line's own plumes, in world coordinates. The station counters sit at
 * z ≈ -1.4 after LINE_SHIFT (+1.6); the wash-up bay is the one thing that
 * stayed back at z -4.0, which is why its plume is smaller and greyer.
 */
export const ROOM_SOURCES: SteamSource[] = [
  // the range, centre station: the tallest plume, aimed at the pale band the
  // pan rail and the bark card both use, because nothing else lives up there
  { x: 0.0, z: -1.42, y: 1.2, rise: 2.45, drift: 0.3, size0: 0.11, size1: 0.42, life: 5.0, puffs: 5, alpha: 0.95, station: 1, level: 1 },
  // sauce, left station: lower and thinner off a pan, not a flattop
  { x: -3.6, z: -1.42, y: 1.16, rise: 1.45, drift: 0.2, size0: 0.09, size1: 0.32, life: 4.3, puffs: 4, alpha: 0.9, station: 0, level: 1 },
  // pastry, right station: a short cold puff — nothing here is boiling
  { x: 3.6, z: -1.42, y: 1.12, rise: 0.85, drift: 0.15, size0: 0.075, size1: 0.25, life: 3.9, puffs: 3, alpha: 0.78, station: 2, level: 1 },
  // the pot-wash bay, back left: dishwater, always going, never dramatic. It
  // reads station 3, which the renderer holds at a constant simmer.
  { x: -6.0, z: -4.02, y: 1.02, rise: 1.05, drift: 0.18, size0: 0.09, size1: 0.3, life: 4.6, puffs: 3, alpha: 0.85, station: 3, level: 1 },
];

export const ROOM_PUFFS = ROOM_SOURCES.reduce((n, s) => n + s.puffs, 0);

/* ------------------------------------------------------------------ registry */

let nextId = 1;
const REGISTRY = new Map<number, SteamSource>();

/**
 * Publish a source. Call once per mount with a world-space origin — the
 * equipment resolves its own parent matrix before calling, because the
 * renderer has no idea where a bain-marie is and should not have to learn.
 */
export function registerSteam(src: SteamSource): number {
  const id = nextId++;
  REGISTRY.set(id, { ...src });
  return id;
}

/** A source whose level is pushed from props (a soufflé rising, a station busy). */
export function updateSteamLevel(id: number, level: number): void {
  const s = REGISTRY.get(id);
  if (s) s.level = Math.max(0, Math.min(1, level));
}

export function unregisterSteam(id: number): void {
  REGISTRY.delete(id);
}

/** Room plumes first, then whatever equipment has mounted. Stable order. */
export function steamSources(): SteamSource[] {
  const out = ROOM_SOURCES.slice();
  for (const s of REGISTRY.values()) out.push(s);
  return out;
}

/** Test seam: equipment registers on mount, so a suite must be able to reset. */
export function clearRegisteredSteam(): void {
  REGISTRY.clear();
}

export function registeredSteamCount(): number {
  return REGISTRY.size;
}
