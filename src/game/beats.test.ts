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

function hospitalityReview(avgHospitality?: number): NonNullable<Career["lastReview"]> {
  return { night: 4, headline: "ROOM ON RECORD", incident: "service", consequence: "morning", avgHospitality };
}

const brigade = (over: Partial<Cook>[] = []) => [
  cook({ id: 0, name: "PETRA", station: 0, ...over[0] }),
  cook({ id: 1, name: "DIMITRI", station: 1, ...over[1] }),
  cook({ id: 2, name: "ANWAR", station: 2, ...over[2] }),
];

describe("morningCards — fact-gated confessionals", () => {
  it("one card per cook, always a line", () => {
    const cooks = brigade();
    const cards = morningCards(career(), cooks);
    expect(cards).toHaveLength(cooks.length);
    expect(cards.map((c) => c.cookId)).toEqual(cooks.map((c) => c.id));
    expect(new Set(cards.map((c) => c.cookId)).size).toBe(cooks.length);
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

  it("Petra names each honest opening verdict without inventing a misunderstanding", () => {
    const verdicts = ["serve", "sendback", "smash"] as const;
    const phrases = ["served what you saw", "sent the fault back", "chose the tiles"];
    const lines = verdicts.map((firstVerdict) => {
      const cards = morningCards(career({
        night: 2,
        openingMemory: { night: 1, firstVerdict, faultUnderstood: true, quality: 44 },
      }), brigade([{ grudge: "the pass" }]));
      expect(cards[0].fact).toBe("openingMemory");
      expect(cards[0].speaker).toBe("PETRA");
      return cards[0].line;
    });
    expect(new Set(lines).size).toBe(3);
    lines.forEach((line, i) => {
      expect(line).toContain(phrases[i]);
      expect(line).not.toMatch(/misunderstood|misread|thought/i);
    });
  });

  it("a walkout still outranks a fresh opening memory", () => {
    const cards = morningCards(career({
      night: 2,
      openingMemory: { night: 1, firstVerdict: "smash", faultUnderstood: true, quality: 44 },
    }), brigade([{ walkedOut: true, grudge: "the tiles" }]));
    expect(cards[0].fact).toBe("walkedOut");
  });

  it("Dimitri distinguishes saved, split and remade sauce outcomes", () => {
    const results = ["saved", "split", "remade"] as const;
    const phrases = ["Thank you, chef", "on my watch", "second turn"];
    const lines = results.map((result) => {
      const cards = morningCards(career({
        night: 3,
        lastSauceOutcome: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)", result },
      }), brigade([{}, { grudge: "the rail", honored: true }, {}]));
      expect(cards).toHaveLength(3);
      expect(cards[1].fact).toBe("lastSauceOutcome");
      expect(cards[1].line).toContain("Lamb sauce (missing)");
      return cards[1].line;
    });
    expect(new Set(lines).size).toBe(3);
    lines.forEach((line, i) => expect(line).toContain(phrases[i]));
  });

  it("the authored saved outcome thanks the chef even when sauce help is also recorded", () => {
    const cards = morningCards(career({
      night: 3,
      lastSauceHelp: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)" },
      lastSauceOutcome: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)", result: "saved" },
    }), brigade());
    expect(cards[1].fact).toBe("lastSauceOutcome");
    expect(cards[1].line).toContain("Thank you, chef");
  });

  it("a sauce outcome ignores a stale night or another cook's name", () => {
    const stale = morningCards(career({
      night: 4,
      lastSauceOutcome: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)", result: "split" },
    }), brigade());
    expect(stale[1].fact).not.toBe("lastSauceOutcome");
    const other = morningCards(career({
      night: 3,
      lastSauceOutcome: { night: 2, cookName: "ANWAR", dish: "Lamb sauce (missing)", result: "split" },
    }), brigade());
    expect(other[1].fact).not.toBe("lastSauceOutcome");
  });

  it("shared Wellington credit names the recorded station-0 contributor", () => {
    const cards = morningCards(career({
      night: 4,
      recipeCredit: { night: 3, credit: "shared", contributor: "RUE" },
    }), brigade([{ name: "RUE" }]));
    expect(cards[0]).toMatchObject({ cookId: 0, speaker: "RUE", fact: "recipeCredit" });
    expect(cards[0].line).toContain("RUE");
    expect(cards[0].line).toContain("Shared");
  });

  it("house appropriation is spoken by the station-0 cook above their grudge", () => {
    const cards = morningCards(career({
      night: 4,
      recipeCredit: { night: 3, credit: "house", contributor: "THE HOUSE" },
    }), brigade([{ name: "RUE", grudge: "credit taken" }]));
    expect(cards[0]).toMatchObject({ speaker: "RUE", fact: "recipeCredit" });
    expect(cards[0].line).toContain("THE HOUSE");
    expect(cards[0].line).toContain("Not shared");
  });

  it("shared credit does not let a different station-0 cook claim authorship", () => {
    const cards = morningCards(career({
      night: 4,
      recipeCredit: { night: 3, credit: "shared", contributor: "DIMITRI" },
    }), brigade());
    expect(cards[0].fact).not.toBe("recipeCredit");
  });

  it.each([
    { attention: "brigade", cookId: 1, phrase: "brigade" },
    { attention: "critic", cookId: 0, phrase: "inspector" },
    { attention: "regulars", cookId: 0, phrase: "regulars" },
  ] as const)("N4 hospitality is factual and spoken by the relevant $attention cook", ({ attention, cookId, phrase }) => {
    const cards = morningCards(career({
      night: 5,
      attention,
      attentionNight: 4,
      lastReview: hospitalityReview(73.2),
    }), brigade([{}, { morale: 25 }, {}]));
    const speaker = cards.find((c) => c.cookId === cookId)!;
    expect(speaker.fact).toBe("hospitality");
    expect(speaker.line).toContain(phrase);
    expect(speaker.line).toContain("73.2");
    expect(speaker.line).not.toMatch(/applaud|complaint|tipped|walked|smiled/i);
    expect(cards.filter((c) => c.fact === "hospitality")).toHaveLength(1);
  });

  it("hospitality needs last night's review, its score and the N4 attention gate", () => {
    const variants: Career[] = [
      career({ night: 5, attention: "brigade", attentionNight: 4, lastReview: hospitalityReview() }),
      career({ night: 5, attention: "brigade", attentionNight: 4, lastReview: { ...hospitalityReview(80), night: 3 } }),
      career({ night: 5, attention: "brigade", attentionNight: 3, lastReview: hospitalityReview(80) }),
    ];
    for (const c of variants) {
      expect(morningCards(c, brigade()).some((card) => card.fact === "hospitality")).toBe(false);
    }
  });

  it.each(["push", "protect"] as const)("only the named recovery cook speaks about %s on N7", (choice) => {
    const cards = morningCards(career({
      night: 7,
      recovery: { night: 6, choice, cookId: 1, cookName: "DIMITRI" },
    }), brigade([{}, { honored: true }, {}]));
    expect(cards[1]).toMatchObject({ cookId: 1, speaker: "DIMITRI", fact: "recovery" });
    expect(cards[1].line).toContain(choice);
    expect(cards.filter((c) => c.fact === "recovery")).toHaveLength(1);
  });

  it("recovery ignores a stale night or a mismatched cook identity", () => {
    const stale = morningCards(career({
      night: 8,
      recovery: { night: 6, choice: "push", cookId: 1, cookName: "DIMITRI" },
    }), brigade());
    expect(stale[1].fact).not.toBe("recovery");
    const wrongCook = morningCards(career({
      night: 7,
      recovery: { night: 6, choice: "protect", cookId: 1, cookName: "ANWAR" },
    }), brigade());
    expect(wrongCook.some((c) => c.fact === "recovery")).toBe(false);
  });

  it.each([
    { seating: "press", moved: true, turns: 2, featuredDish: "Soufflé (weeping)", honor: true },
    { seating: "regulars", moved: false, turns: 1, featuredDish: "Soufflé (weeping)", honor: false },
    { seating: "walkin", moved: true, turns: 2, featuredDish: "Tart of the day", honor: false },
    { seating: "press", moved: false, turns: 0, featuredDish: undefined, honor: false },
  ] as const)("Anwar reports the actual 101 ritual: $seating, $turns turns", ({ seating, moved, turns, featuredDish, honor }) => {
    const cards = morningCards(career({
      night: 8,
      table101Memory: { night: 7, seating, moved, turns, featuredDish },
    }), brigade([{}, {}, { honored: true }]));
    const line = cards[2].line;
    expect(cards[2].fact).toBe("table101Memory");
    expect(line).toContain(seating);
    expect(line).toContain(moved ? "moved" : "stayed");
    expect(line).toContain(`${turns} turn${turns === 1 ? "" : "s"}`);
    if (featuredDish) expect(line).toContain(featuredDish);
    else expect(line).not.toContain("featured");
    if (honor) expect(line).toContain("An honor");
    else expect(line).not.toMatch(/honor|applause|rose|success|perfect/i);
  });

  it("the 101 memory does not fire stale or give Anwar's voice to a replacement", () => {
    const stale = morningCards(career({
      night: 9,
      table101Memory: { night: 7, seating: "regulars", moved: false, turns: 2, featuredDish: "Soufflé (weeping)" },
    }), brigade());
    expect(stale[2].fact).not.toBe("table101Memory");
    const replacement = morningCards(career({
      night: 8,
      table101Memory: { night: 7, seating: "regulars", moved: false, turns: 2, featuredDish: "Soufflé (weeping)" },
    }), brigade([{}, {}, { name: "RUE" }]));
    expect(replacement[2].fact).not.toBe("table101Memory");
  });

  it("the retained cook owns the kept rival-offer line", () => {
    const cards = morningCards(career({
      night: 9,
      rivalOffer: { night: 8, cookName: "RUE", kept: true },
    }), brigade([{}, { name: "RUE", honored: true }, {}]));
    expect(cards[1]).toMatchObject({ cookId: 1, speaker: "RUE", fact: "rivalOffer" });
    expect(cards[1].line).toContain("BEEFCAKES");
    expect(cards[1].line).toContain("matched the offer");
    expect(cards.filter((c) => c.fact === "rivalOffer")).toHaveLength(1);
  });

  it("a departed cook's replacement speaks at that station without claiming the old identity", () => {
    const cards = morningCards(career({
      night: 9,
      departedCooks: ["ANWAR"],
      rivalOffer: { night: 8, cookName: "ANWAR", kept: false },
    }), brigade([{}, {}, { name: "RUE" }]));
    expect(cards).toHaveLength(3);
    expect(cards[2]).toMatchObject({ cookId: 2, speaker: "RUE", fact: "rivalOffer" });
    expect(cards[2].line).toContain("I am RUE");
    expect(cards[2].line).toContain("ANWAR took BEEFCAKES' offer");
    expect(cards[2].line).toContain("Station 2");
    expect(cards[2].line).not.toContain("I am ANWAR");
    expect(cards.some((c) => c.speaker === "ANWAR")).toBe(false);
  });

  it("a replacement at the wrong station does not claim the departed cook's offer", () => {
    const cards = morningCards(career({
      night: 9,
      departedCooks: ["ANWAR"],
      rivalOffer: { night: 8, cookName: "ANWAR", kept: false },
    }), brigade([{ name: "RUE" }, {}, {}]));
    expect(cards.some((c) => c.fact === "rivalOffer")).toBe(false);
  });

  it.each([
    { flag: "beefcakesTruce", phrase: "runners stood down" },
    { flag: "beefcakesWar", phrase: "runners came doubled" },
  ] as const)("N5 gets one concise brigade line for $flag", ({ flag, phrase }) => {
    const cards = morningCards(career({ night: 6, feudDone: 5, [flag]: true }), brigade());
    const lines = cards.filter((c) => c.fact === "beefcakesTruce" || c.fact === "beefcakesWar");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ cookId: 1, speaker: "DIMITRI", fact: flag });
    expect(lines[0].line).toContain(phrase);
  });

  it("the N5 brigade line never overrides a sharper personal fact", () => {
    const cards = morningCards(career({
      night: 6,
      feudDone: 5,
      beefcakesTruce: true,
      lastSauceOutcome: { night: 5, cookName: "DIMITRI", dish: "Lamb sauce (missing)", result: "split" },
    }), brigade());
    expect(cards[1].fact).toBe("lastSauceOutcome");
    expect(cards.some((c) => c.fact === "beefcakesTruce" || c.fact === "beefcakesWar")).toBe(false);
  });

  it("all authored facts stay silent once their night is stale", () => {
    const cards = morningCards(career({
      night: 10,
      openingMemory: { night: 1, firstVerdict: "serve", faultUnderstood: true, quality: 80 },
      lastSauceHelp: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)" },
      lastSauceOutcome: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)", result: "remade" },
      recipeCredit: { night: 3, credit: "shared", contributor: "PETRA" },
      recipeHistory: [{ dish: "Beef Wellington", finish: "classic", contributor: "PETRA", night: 3 }],
      lastReview: hospitalityReview(80),
      attention: "brigade",
      attentionNight: 4,
      recovery: { night: 6, choice: "protect", cookId: 1, cookName: "DIMITRI" },
      table101Memory: { night: 7, seating: "regulars", moved: true, turns: 2, featuredDish: "Soufflé (weeping)" },
      rivalOffer: { night: 8, cookName: "ANWAR", kept: false },
      departedCooks: ["ANWAR"],
      feudDone: 5,
      beefcakesTruce: true,
      beefcakesWar: true,
    }), brigade());
    expect(cards.map((c) => c.fact)).toEqual(["morale", "morale", "morale"]);
    expect(new Set(cards.map((c) => c.cookId)).size).toBe(3);
  });

  it("a cook outside the named arcs still gets a card", () => {
    const cards = morningCards(career({ night: 4 }), [cook({ id: 3, name: "ODILE", station: 0 })]);
    expect(cards).toHaveLength(1);
    expect(cards[0].speaker).toBe("ODILE");
  });
});
