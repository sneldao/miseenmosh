import { describe, it, expect } from "vitest";
import { morningCards } from "./beats";
import type { Career, Cook } from "./state";

function cook(over: Partial<Cook> = {}): Cook {
  return {
    id: 0,
    name: "PETRA",
    station: 0,
    skill: 0.7,
    morale: 80,
    walkedOut: false,
    trauma: 0,
    overloadT: 0,
    burning: false,
    walkoutAt: -1,
    fave: "Beef Wellington",
    grudge: null,
    smoked: false,
    ...over,
  };
}

function career(over: Partial<Career> = {}): Career {
  return { night: 2, cash: 100, stars: 0, venue: 0, gear: 0, defections: 0, aggro: 0, ...over };
}

const brigade = (over: Partial<Cook>[] = []) => [
  cook({ id: 0, name: "PETRA", station: 0, ...over[0] }),
  cook({ id: 1, name: "DIMITRI", station: 1, ...over[1] }),
  cook({ id: 2, name: "ANWAR", station: 2, ...over[2] }),
];

describe("morningCards — fact-gated confessionals", () => {
  it("one card per cook, always a line", () => {
    const cards = morningCards(career(), brigade());
    expect(cards).toHaveLength(3);
    for (const c of cards) expect(c.line.length).toBeGreaterThan(10);
  });

  it("Petra's night-1 rule is the tongs", () => {
    const cards = morningCards(career({ night: 1 }), brigade());
    expect(cards[0].fact).toBe("night1-rule");
    expect(cards[0].line).toContain("tongs");
  });

  it("Petra's night-3 reveal fires only on night 3", () => {
    expect(morningCards(career({ night: 3 }), brigade())[0].fact).toBe("night3-reveal");
    expect(morningCards(career({ night: 4 }), brigade())[0].fact).not.toBe("night3-reveal");
  });

  it("Anwar's night-7 soufflé line fires only on night 7", () => {
    expect(morningCards(career({ night: 7 }), brigade())[2].fact).toBe("night7-souffle");
    expect(morningCards(career({ night: 6 }), brigade())[2].fact).not.toBe("night7-souffle");
  });

  it("a walked-out cook speaks the walkout, above everything else", () => {
    const cards = morningCards(
      career({ night: 3 }),
      brigade([{ walkedOut: true, grudge: "the critic" }, {}, {}]),
    );
    expect(cards[0].fact).toBe("walkedOut");
  });

  it("a grudge is quoted, and only for the cook holding it", () => {
    const cards = morningCards(career({ night: 4 }), brigade([{}, { grudge: "the send-back" }, {}]));
    expect(cards[1].fact).toBe("grudge");
    expect(cards[1].line).toContain("the send-back");
    expect(cards[0].fact).not.toBe("grudge");
  });

  it("last night's saved sauce thanks the right cook only", () => {
    const c = career({ night: 4, lastSauceHelp: { night: 3, cookName: "DIMITRI", dish: "jus" } });
    const cards = morningCards(c, brigade());
    expect(cards[1].fact).toBe("lastSauceHelp");
    expect(cards[1].line).toContain("jus");
    expect(cards[0].fact).not.toBe("lastSauceHelp");
    // the night before, and any other cook, gets nothing
    const stale = morningCards(career({ night: 5, lastSauceHelp: { night: 3, cookName: "DIMITRI", dish: "jus" } }), brigade());
    expect(stale[1].fact).not.toBe("lastSauceHelp");
  });

  it("a cook's own Wellington revision earns the card", () => {
    const c = career({
      night: 4,
      recipeHistory: [{ dish: "Beef Wellington", finish: "classic", contributor: "ANWAR", night: 3 }],
    });
    const cards = morningCards(c, brigade());
    expect(cards[2].fact).toBe("recipeRevision");
    expect(cards[0].fact).not.toBe("recipeRevision");
  });

  it("trauma speaks before the morale default", () => {
    const cards = morningCards(career({ night: 4 }), brigade([{}, {}, { trauma: 2 }]));
    expect(cards[2].fact).toBe("trauma");
  });

  it("keepsake-earned honor speaks before the morale default", () => {
    const cards = morningCards(career({ night: 4 }), brigade([{ honored: true }, {}, {}]));
    expect(cards[0].fact).toBe("honored");
  });

  it("low morale reads as low morale, not something else", () => {
    const cards = morningCards(career({ night: 4 }), brigade([{ morale: 30 }, {}, {}]));
    expect(cards[0].fact).toBe("morale-low");
    expect(cards[1].fact).toBe("morale");
  });

  it("a cook outside the named arcs still gets a card", () => {
    const cards = morningCards(career({ night: 4 }), [cook({ id: 3, name: "ODILE", station: 0 })]);
    expect(cards).toHaveLength(1);
    expect(cards[0].speaker).toBe("ODILE");
  });
});
