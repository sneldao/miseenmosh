import { describe, expect, it } from "vitest";
import { buildEnding } from "./ending";
import type { Career, Cook } from "./state";

function cook(over: Partial<Cook> = {}): Cook {
  return {
    id: 0, name: "PETRA", station: 0, skill: 0.7, morale: 75, walkedOut: false,
    trauma: 0, overloadT: 0, burning: false, walkoutAt: -1,
    fave: "Beef Wellington", grudge: null, smoked: false, ...over,
  };
}

function career(over: Partial<Career> = {}): Career {
  return {
    night: 9, cash: 20, stars: 10, venue: 2, gear: 0, defections: 0, aggro: 0,
    culinaryTotal: 80 * 20, culinaryCount: 20,
    hospitalityTotal: 75 * 20, hospitalityCount: 20,
    totalWalkouts: 0, ...over,
  };
}

describe("relationship-aware ending", () => {
  it("ten stars are not enough without food, hospitality, people and solvency", () => {
    const ending = buildEnding(career({ culinaryTotal: 60 * 20 }), [cook()]);
    expect(ending.won).toBe(false);
    expect(ending.avgCulinary).toBe(60);
  });

  it("names the recipe author and shared credit", () => {
    const ending = buildEnding(career({
      recipeHistory: [{ dish: "Beef Wellington", finish: "herb", contributor: "PETRA", night: 3, credit: "shared" }],
    }), [cook()]);
    expect(ending.won).toBe(true);
    expect(ending.title).toBe("A HOUSE, NOT A HERO");
    expect(ending.signature).toContain("PETRA");
    expect(ending.signature).toContain("shared credit");
  });

  it("distinguishes an appropriated house signature", () => {
    const ending = buildEnding(career({
      recipeHistory: [{ dish: "Beef Wellington", finish: "classic", contributor: "THE HOUSE", night: 3, credit: "house" }],
    }), [cook()]);
    expect(ending.signature).toContain("house voice is yours");
    expect(ending.title).toBe("THE ROOM SAYS YES, CHEF");
  });

  it("names honor, scars, grudges and permanent departures", () => {
    const ending = buildEnding(career({ departedCooks: ["DIMITRI"], defections: 1 }), [
      cook({ honored: true, trauma: 2, grudge: "credit taken" }),
    ]);
    expect(ending.brigade).toContain("PETRA");
    expect(ending.brigade).toContain("honor");
    expect(ending.brigade).toContain("scars");
    expect(ending.brigade).toContain("credit taken");
    expect(ending.brigade).toContain("DIMITRI did not come back");
  });

  it("reports the actual rival, recovery, opening and Table 101 memories", () => {
    const ending = buildEnding(career({
      openingMemory: { night: 1, firstVerdict: "sendback", faultUnderstood: true, quality: 44 },
      rivalOffer: { night: 8, cookName: "ANWAR", kept: false },
      departedCooks: ["ANWAR"],
      beefcakesTruce: true,
      recovery: { night: 6, choice: "protect", cookId: 0, cookName: "PETRA" },
      table101Memory: { night: 7, seating: "regulars", turns: 2, moved: true },
    }), [cook()]);
    expect(ending.memory).toContain("sent the fault back");
    expect(ending.memory).toContain("lost ANWAR");
    expect(ending.memory).toContain("truce held");
    expect(ending.memory).toContain("protected");
    expect(ending.memory).toContain("moved; 2 turns");
  });

  it("cash failure overrides a strong review and legend status", () => {
    const ending = buildEnding(career({ cash: -61, totalEgo: 250 }), [cook()]);
    expect(ending.won).toBe(false);
    expect(ending.legend).toBe(false);
    expect(ending.title).toBe("THE TILL IS EMPTY");
  });
});
