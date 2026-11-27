import { describe, expect, it } from "vitest";
import { residencyWon, resolveSideOrder, scoreService } from "./serviceScore";

const solid = {
  served: 12,
  avgQuality: 88,
  avgHospitality: 82,
  misses: 0,
  complaints: 0,
  walkouts: 0,
};

describe("service scoring", () => {
  it("awards five stars only for food, hospitality and a held brigade", () => {
    expect(scoreService(solid)).toEqual({
      stars: 5, foodStars: 3, hospitalityStars: 1, brigadeStars: 1, penalties: 0,
    });
  });

  it("starts at zero and maps culinary quality to at most three stars", () => {
    expect(scoreService({ ...solid, served: 0, avgQuality: 0, avgHospitality: 0 }).stars).toBe(0);
    expect(scoreService({ ...solid, avgQuality: 85 }).foodStars).toBe(3);
    expect(scoreService({ ...solid, avgQuality: 72 }).foodStars).toBe(2);
    expect(scoreService({ ...solid, avgQuality: 58 }).foodStars).toBe(1);
    expect(scoreService({ ...solid, avgQuality: 57 }).foodStars).toBe(0);
  });

  it("does not turn hospitality into culinary quality", () => {
    const poorFood = scoreService({ ...solid, avgQuality: 50, avgHospitality: 100 });
    expect(poorFood.foodStars).toBe(0);
    expect(poorFood.hospitalityStars).toBe(1);
    expect(poorFood.stars).toBe(2);
  });

  it("caps service-loss penalties at two stars", () => {
    expect(scoreService({ ...solid, misses: 4, walkouts: 3 })).toMatchObject({
      stars: 2, brigadeStars: 0, penalties: 2,
    });
  });

  it("does not award a brigade star for a short or complaint-ridden service", () => {
    expect(scoreService({ ...solid, served: 7 }).brigadeStars).toBe(0);
    expect(scoreService({ ...solid, complaints: 1 }).brigadeStars).toBe(0);
  });

  it("ten stars alone cannot guarantee the residency", () => {
    const earned = { stars: 10, avgCulinary: 80, avgHospitality: 75, defections: 0, totalWalkouts: 1, cash: 20 };
    expect(residencyWon(earned)).toBe(true);
    expect(residencyWon({ ...earned, avgCulinary: 60 })).toBe(false);
    expect(residencyWon({ ...earned, avgHospitality: 50 })).toBe(false);
    expect(residencyWon({ ...earned, defections: 3 })).toBe(false);
  });
});

describe("nightly side orders", () => {
  it("pays each night's challenge on its own evidence", () => {
    expect(resolveSideOrder(1, { walkouts: 0, sauceOutcomeSaved: false, goldenServed: false, requestFastLanded: false, runnerShooed: false, anyBurned: true, moved101: false, table101Turns: 0, comped: false, served: 4, screams: 3 })?.order.pay).toBe(6);
    expect(resolveSideOrder(2, { walkouts: 2, sauceOutcomeSaved: true, goldenServed: false, requestFastLanded: false, runnerShooed: false, anyBurned: false, moved101: false, table101Turns: 0, comped: false, served: 4, screams: 2 })?.line).toMatch(/SIDE ORDER HELD/);
    expect(resolveSideOrder(3, { walkouts: 0, sauceOutcomeSaved: false, goldenServed: true, requestFastLanded: false, runnerShooed: false, anyBurned: false, moved101: false, table101Turns: 0, comped: false, served: 8, screams: 0 })?.order.id).toBe("n3_golden");
  });

  it("stays quiet when the ask wasn't met", () => {
    expect(resolveSideOrder(6, { walkouts: 0, sauceOutcomeSaved: false, goldenServed: false, requestFastLanded: false, runnerShooed: false, anyBurned: true, moved101: false, table101Turns: 0, comped: false, served: 6, screams: 0 })).toBeNull();
    expect(resolveSideOrder(9, { walkouts: 0, sauceOutcomeSaved: false, goldenServed: false, requestFastLanded: false, runnerShooed: false, anyBurned: false, moved101: false, table101Turns: 0, comped: false, served: 7, screams: 0 })).toBeNull();
  });
});
