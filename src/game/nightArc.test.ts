import { describe, expect, it } from "vitest";
import {
  NIGHT_CONTRACTS, chefCoverMultiplier, lowestMoraleCook, nightContract,
  recoveryCorrectionBonus, retentionTarget,
} from "./nightArc";
import type { Career, Cook } from "./state";

function cook(id: number, name: string, over: Partial<Cook> = {}): Cook {
  return {
    id, name, station: id, skill: 0.6, morale: 60, walkedOut: false,
    trauma: 0, overloadT: 0, burning: false, walkoutAt: -1,
    fave: "Soufflé (weeping)", grudge: null, smoked: false, ...over,
  };
}

function career(over: Partial<Career> = {}): Career {
  return { night: 6, cash: 100, stars: 0, venue: 0, gear: 0, defections: 0, aggro: 0, ...over };
}

describe("authored night contract", () => {
  it("gives all nine nights a distinct playable condition and payoff", () => {
    expect(NIGHT_CONTRACTS).toHaveLength(9);
    expect(NIGHT_CONTRACTS.map((contract) => contract.night)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(NIGHT_CONTRACTS.map((contract) => contract.name)).size).toBe(9);
    expect(new Set(NIGHT_CONTRACTS.map((contract) => contract.dilemma)).size).toBe(9);
    for (const contract of NIGHT_CONTRACTS) {
      expect(contract.condition.length).toBeGreaterThan(40);
      expect(contract.payoff.length).toBeGreaterThan(40);
    }
  });

  it("clamps lookups without inventing a tenth night", () => {
    expect(nightContract(0).night).toBe(1);
    expect(nightContract(9).night).toBe(9);
    expect(nightContract(10).night).toBe(9);
  });
});

describe("brigade decisions", () => {
  const brigade = [
    cook(0, "PETRA", { skill: 0.8, morale: 35 }),
    cook(1, "DIMITRI", { skill: 0.7, morale: 25 }),
    cook(2, "ANWAR", { skill: 0.9, morale: 75, honored: true }),
    cook(3, "RUE", { skill: 1, morale: 100, walkedOut: true }),
  ];

  it("targets the lowest live morale for recovery", () => {
    expect(lowestMoraleCook(brigade)?.name).toBe("DIMITRI");
  });

  it("targets the strongest relationship rather than the weakest cook", () => {
    expect(retentionTarget(brigade)?.name).toBe("ANWAR");
  });

  it("late-night trauma makes chef cover slower", () => {
    const strained = brigade.map((item) => ({ ...item, trauma: 2 }));
    expect(chefCoverMultiplier(career(), strained)).toBeGreaterThan(chefCoverMultiplier(career({ night: 5 }), strained));
  });

  it("protection improves the chosen cook's correction reliability", () => {
    const target = brigade[1];
    const protectedCareer = career({
      recovery: { night: 6, choice: "protect", cookId: target.id, cookName: target.name },
    });
    expect(recoveryCorrectionBonus(protectedCareer, target)).toBeCloseTo(0.12 - target.trauma * 0.06);
    expect(recoveryCorrectionBonus(protectedCareer, brigade[0])).toBe(0);
    expect(recoveryCorrectionBonus(career({ recovery: { night: 6, choice: "push", cookId: target.id, cookName: target.name } }), target)).toBe(0);
  });
});
