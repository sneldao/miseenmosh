import { beforeEach, describe, expect, it } from "vitest";
import {
  ROOM_PUFFS,
  ROOM_SOURCES,
  STEAM_DRAW_CAP,
  STEAM_EQUIPMENT_PUFFS,
  STEAM_MAX_SLOTS,
  STEAM_PUFF_CAP,
  clearRegisteredSteam,
  registerSteam,
  registeredSteamCount,
  steamDraws,
  steamSources,
  unregisterSteam,
  updateSteamLevel,
  type SteamSource,
} from "./steamBudget";

/**
 * The steam budget, as a gate rather than a comment.
 *
 * This file exists because the previous cap — "≤ 12 sprites on screen total
 * across ALL equipment" — was prose in a doc comment, and `STEAM_TOTAL` was
 * computed from it and then read by nothing. The room drifted to 25 puffs paid
 * as 11 draws while the written rule said 12, and nobody could tell whether
 * that was a breach. A budget nothing checks is a wish.
 */

const src = (over: Partial<SteamSource> = {}): SteamSource => ({
  x: 0, y: 1, z: -1,
  rise: 1, drift: 0.1, size0: 0.1, size1: 0.3,
  life: 4, puffs: 2, alpha: 0.5, station: -1, level: 1,
  ...over,
});

describe("steam budget", () => {
  it("costs one draw for the whole room", () => {
    expect(steamDraws()).toBe(1);
    expect(steamDraws()).toBeLessThanOrEqual(STEAM_DRAW_CAP);
  });

  it("fits inside the puff cap, plumes and equipment together", () => {
    // the number that would have caught the drift: puffs are the fill-rate
    // unit, and they are the only thing that grows when someone adds a plume
    expect(ROOM_PUFFS + STEAM_EQUIPMENT_PUFFS).toBeLessThanOrEqual(STEAM_PUFF_CAP);
  });

  it("allocates geometry for every source it can ever have", () => {
    // a source registered past the last slot would silently not draw, which is
    // the failure mode this constant exists to make impossible
    expect(ROOM_PUFFS + STEAM_EQUIPMENT_PUFFS).toBeLessThanOrEqual(STEAM_MAX_SLOTS);
    // and there is headroom, because equipment registers on mount and a scene
    // can hold more than one instance of a station while streaming in
    expect(STEAM_MAX_SLOTS).toBeGreaterThan(ROOM_PUFFS + STEAM_EQUIPMENT_PUFFS);
  });

  it("declares one source per plume, each with a non-zero puff count", () => {
    expect(ROOM_SOURCES.length).toBeGreaterThan(0);
    for (const s of ROOM_SOURCES) {
      expect(s.puffs).toBeGreaterThan(0);
      expect(s.life).toBeGreaterThan(0);
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.size0).toBeGreaterThan(0);
      expect(s.size1).toBeGreaterThanOrEqual(s.size0);
    }
  });

  it("puts every room plume somewhere in the room", () => {
    // a typo in a z is invisible in review and invisible on screen if the plume
    // ends up inside a counter — so the bounds are asserted, not eyeballed
    for (const s of ROOM_SOURCES) {
      expect(Math.abs(s.x)).toBeLessThan(9);
      expect(s.z).toBeGreaterThan(-5.2);
      expect(s.z).toBeLessThan(2);
      expect(s.y).toBeGreaterThan(0.5);
      expect(s.y).toBeLessThan(2);
    }
  });
});

describe("steam registry", () => {
  beforeEach(() => clearRegisteredSteam());

  it("starts with only the room's own plumes", () => {
    expect(steamSources()).toHaveLength(ROOM_SOURCES.length);
    expect(registeredSteamCount()).toBe(0);
  });

  it("adds a mounted equipment field after the room plumes", () => {
    const id = registerSteam(src({ puffs: 4 }));
    expect(id).toBeGreaterThan(0);
    const all = steamSources();
    expect(all).toHaveLength(ROOM_SOURCES.length + 1);
    expect(all[all.length - 1].puffs).toBe(4);
  });

  it("does not let one mount shadow another", () => {
    const a = registerSteam(src({ x: 1 }));
    const b = registerSteam(src({ x: 2 }));
    expect(a).not.toBe(b);
    const xs = steamSources().slice(ROOM_SOURCES.length).map((s) => s.x);
    expect(xs).toEqual([1, 2]);
  });

  it("removes a source on unmount", () => {
    const id = registerSteam(src());
    unregisterSteam(id);
    expect(steamSources()).toHaveLength(ROOM_SOURCES.length);
    expect(registeredSteamCount()).toBe(0);
  });

  it("ignores an unmount for an id that is already gone", () => {
    const id = registerSteam(src());
    unregisterSteam(id);
    expect(() => unregisterSteam(id)).not.toThrow();
    expect(registeredSteamCount()).toBe(0);
  });

  it("clamps a pushed level into 0..1", () => {
    const id = registerSteam(src({ level: 0.5 }));
    updateSteamLevel(id, 4);
    expect(steamSources().slice(ROOM_SOURCES.length)[0].level).toBe(1);
    updateSteamLevel(id, -3);
    expect(steamSources().slice(ROOM_SOURCES.length)[0].level).toBe(0);
  });

  it("ignores a level push for a stale id", () => {
    const id = registerSteam(src());
    unregisterSteam(id);
    expect(() => updateSteamLevel(id, 1)).not.toThrow();
  });

  it("never mutates the room's own sources through the registry", () => {
    registerSteam(src());
    updateSteamLevel(1, 0);
    // the room plumes are shared constants; a registry write must not reach them
    expect(ROOM_SOURCES.every((s) => s.level === 1)).toBe(true);
  });
});
