/**
 * Phase C — morning confessionals. One card per cook per morning, written
 * over their cast portrait in the kitchen book. Every line is gated on a
 * recorded fact — a card can only say what the career log can prove —
 * and the first matching rule wins, so the sharpest truth speaks first.
 */
import type { Career, Cook } from "./state";
import { lowestMoraleCook } from "./nightArc";

export interface Confessional {
  cookId: number;
  speaker: string;
  line: string;
  /** the recorded fact that gated this line — tests pin each one */
  fact: string;
}

interface Facts {
  career: Career;
  cook: Cook;
  cooks: Cook[];
  lastNight: number;
}

type Rule = (f: Facts) => Confessional | null;

const card = (f: Facts, line: string, fact: string): Confessional => ({
  cookId: f.cook.id,
  speaker: f.cook.name,
  line,
  fact,
});

const walkedOut: Rule = (f) =>
  f.cook.walkedOut ? card(f, "You watched me throw it. The door swings both ways — remember that.", "walkedOut") : null;

const openingMemory: Rule = (f) => {
  const memory = f.career.openingMemory;
  if (f.cook.name !== "PETRA" || memory?.night !== f.lastNight) return null;
  const line = memory.firstVerdict === "serve"
    ? "You served what you saw. No blind eye. I remember, chef."
    : memory.firstVerdict === "sendback"
      ? "You sent the fault back and named it. No excuses. I remember."
      : "You saw the fault and chose the tiles. Honest call, chef.";
  return card(f, line, "openingMemory");
};

const sauceOutcome: Rule = (f) => {
  const outcome = f.career.lastSauceOutcome;
  if (f.cook.name !== "DIMITRI" || outcome?.night !== f.lastNight || outcome.cookName !== f.cook.name) return null;
  const line = outcome.result === "saved"
    ? `You brought my ${outcome.dish} back. Thank you, chef. That stays between us.`
    : outcome.result === "split"
      ? `The ${outcome.dish} split on my watch. That one is mine.`
      : `You sent my ${outcome.dish} back and gave me a second turn. I will not waste it.`;
  return card(f, line, "lastSauceOutcome");
};

const grudge: Rule = (f) =>
  f.cook.grudge ? card(f, `Still not forgiven — ${f.cook.grudge}. The pass remembers, and so do I.`, "grudge") : null;

const sauceSaved: Rule = (f) => {
  const help = f.career.lastSauceHelp;
  return help?.night === f.lastNight && help.cookName === f.cook.name
    ? card(f, `You brought my ${help.dish} back. That stays between us.`, "lastSauceHelp")
    : null;
};

const honored: Rule = (f) =>
  f.cook.honored ? card(f, "Twice praised. I noticed who noticed.", "honored") : null;

const scarred: Rule = (f) =>
  f.cook.trauma > 0 ? card(f, "Nights like that leave marks. Mine have marks.", "trauma") : null;

const revised = (who: string): Rule => (f) => {
  const last = f.career.recipeHistory?.[f.career.recipeHistory.length - 1];
  return last && last.contributor === who && last.night === f.lastNight
    ? card(f, "I touched the Wellington. Let it prove itself tonight before you judge it.", "recipeRevision")
    : null;
};

const recipeCredit: Rule = (f) => {
  const credit = f.career.recipeCredit;
  if (credit?.night !== f.lastNight || f.cook.station !== 0) return null;
  if (credit.credit === "shared") {
    return credit.contributor === f.cook.name
      ? card(f, `The Wellington is signed ${credit.contributor}. Shared with the house, not taken by it.`, "recipeCredit")
      : null;
  }
  return card(f, `The Wellington is credited to ${credit.contributor}. This apron did the work. Not shared.`, "recipeCredit");
};

const recovery: Rule = (f) => {
  const memory = f.career.recovery;
  if (memory?.night !== f.lastNight || memory.cookId !== f.cook.id || memory.cookName !== f.cook.name) return null;
  return card(f, memory.choice === "push"
    ? "You pushed me before the last stretch. I heard you, chef."
    : "You protected me before the last stretch. I needed that.", "recovery");
};

const table101Memory: Rule = (f) => {
  const memory = f.career.table101Memory;
  if (f.cook.name !== "ANWAR" || memory?.night !== f.lastNight) return null;
  const turns = `${memory.turns} turn${memory.turns === 1 ? "" : "s"}`;
  const ritual = `${memory.seating} at 101, ${memory.moved ? "moved" : "stayed"}, ${turns}.`;
  const feature = memory.featuredDish ? ` ${memory.featuredDish} was featured.` : "";
  const honor = memory.featuredDish === "Soufflé (weeping)" && memory.turns >= 2
    ? " Two turns for my soufflé. An honor."
    : " That is the ritual on record.";
  return card(f, `${ritual}${feature}${honor}`, "table101Memory");
};

const ORIGINAL_STATIONS: Record<string, number> = { PETRA: 0, DIMITRI: 1, ANWAR: 2 };

const rivalReplacement = (f: Facts, departedName: string): Cook | undefined => {
  const departed = f.cooks.find((c) => c.name === departedName);
  if (departed) return f.cooks.find((c) => c.id !== departed.id && c.station === departed.station);
  const station = ORIGINAL_STATIONS[departedName];
  if (station !== undefined) return f.cooks.find((c) => c.station === station && c.name !== departedName);
  const gone = new Set(f.career.departedCooks ?? []);
  const replacements = f.cooks.filter((c) => !gone.has(c.name) && ORIGINAL_STATIONS[c.name] === undefined);
  return replacements.length === 1 ? replacements[0] : undefined;
};

const rivalOffer: Rule = (f) => {
  const offer = f.career.rivalOffer;
  if (offer?.night !== f.lastNight) return null;
  if (offer.kept) {
    return f.cook.name === offer.cookName
      ? card(f, "BEEFCAKES came for me. You matched the offer. I am still here.", "rivalOffer")
      : null;
  }
  const replacement = rivalReplacement(f, offer.cookName);
  return replacement === f.cook
    ? card(f, `I am ${f.cook.name}. ${offer.cookName} took BEEFCAKES' offer. Station ${f.cook.station} has new hands.`, "rivalOffer")
    : null;
};

const hospitality: Rule = (f) => {
  const review = f.career.lastReview;
  const score = review?.avgHospitality;
  if (f.career.attentionNight !== 4 || !review || review.night !== f.lastNight || typeof score !== "number" || !Number.isFinite(score)) return null;
  const attention = f.career.attention ?? "brigade";
  const speaker = attention === "brigade"
    ? lowestMoraleCook(f.cooks)
    : f.cooks.find((c) => c.station === 0 && !c.walkedOut);
  if (speaker !== f.cook) return null;
  const lead = attention === "brigade"
    ? "The brigade had your eyes before doors."
    : attention === "critic"
      ? "The inspector had our attention before doors."
      : "The regulars had our attention before doors.";
  return card(f, `${lead} Hospitality averaged ${score.toFixed(1)}.`, "hospitality");
};

// Dimitri carries the house rule: Petra's N2 card is always the opening
// verdict, so the rule echo needs a cook with no competing N1 payoff.
const houseRule: Rule = (f) => {
  if (f.cook.name !== "DIMITRI" || f.lastNight !== 1 || !f.career.mutator) return null;
  const line = f.career.mutator === "double_runners"
    ? "Double shift. You chose it, chef. Broom's by the door."
    : f.career.mutator === "no_bin"
      ? "No bin. You chose it. Everything gets cooked."
      : "Short fuse. You chose it. We move.";
  return card(f, line, "houseRule");
};

// the meal echo goes to whoever felt it most — never Petra, whose N2 card
// is always the opening verdict when she cooked the first plate.
const firstMeal: Rule = (f) => {
  const meal = f.career.lastMeal;
  if (f.lastNight !== 1 || meal?.night !== 1) return null;
  if (meal.choice === 1 && meal.lowName) {
    return f.cook.name === meal.lowName
      ? card(f, "The crispy bit came to me last night. I won't forget who passed it.", "firstMeal")
      : null;
  }
  const candidates = f.cooks.filter((c) => c.name !== "PETRA" && !c.walkedOut);
  const speaker = lowestMoraleCook(candidates.length ? candidates : f.cooks);
  if (speaker !== f.cook) return null;
  return card(
    f,
    meal.choice === 2
      ? "Eaten standing up, in silence. Yesterday stays yesterday."
      : "You called us the best kitchen you'll ever run. We almost believed you.",
    "firstMeal",
  );
};

// the walk echo: only when nobody has anything sharper — presence, not praise
const walkedLine: Rule = (f) => {
  const walk = f.career.lastWalk;
  if (walk?.night !== f.lastNight) return null;
  const candidates = f.cooks.filter((c) => c.name !== "PETRA" && !c.walkedOut);
  const speaker = lowestMoraleCook(candidates.length ? candidates : f.cooks);
  if (speaker !== f.cook) return null;
  const furthest = walk.stops.includes("room") ? "room" : walk.stops.includes("sinks") ? "sinks" : "sauce";
  return card(
    f,
    furthest === "room"
      ? "You came out to the room. We saw your shoes."
      : furthest === "sinks"
        ? "You took the tubs with the porter. Hands, chef."
        : "You took the pan yourself. Noted.",
    "walkedLine",
  );
};

const PAYOFFS: Rule[] = [
  openingMemory,
  sauceOutcome,
  sauceSaved,
  recipeCredit,
  recovery,
  table101Memory,
  rivalOffer,
  hospitality,
  firstMeal,
  houseRule,
  walkedLine,
];

const morale = (low: string, mid: string): Rule => (f) =>
  card(f, f.cook.morale < 40 ? low : mid, f.cook.morale < 40 ? "morale-low" : "morale");

const beefcakes: Rule = (f) => {
  if (f.lastNight !== 5 || f.career.feudDone !== 5) return null;
  const speaker = f.cooks.find((c) => c.station === 1 && !c.walkedOut) ?? lowestMoraleCook(f.cooks);
  if (speaker !== f.cook) return null;
  if (f.career.beefcakesTruce) return card(f, "Two kitchens ate as one. BEEFCAKES' runners stood down. About time.", "beefcakesTruce");
  if (f.career.beefcakesWar) return card(f, "We undercut BEEFCAKES. His runners came doubled. Broom is by the door.", "beefcakesWar");
  return null;
};

const RULES: Record<string, Rule[]> = {
  PETRA: [
    walkedOut,
    ...PAYOFFS,
    (f) =>
      f.career.night === 1
        ? card(f, "My tongs. My hands. That is the whole rule.", "night1-rule")
        : null,
    (f) =>
      f.career.night === 3
        ? card(f, "You want to know about the tongs? Three stars. The dish wasn't right. I walked.", "night3-reveal")
        : null,
    revised("PETRA"),
    grudge,
    scarred,
    honored,
    beefcakes,
    morale(
      "I am counting the services left, same as you.",
      "The grill is honest. Everything else is negotiable.",
    ),
  ],
  DIMITRI: [
    walkedOut,
    ...PAYOFFS,
    revised("DIMITRI"),
    grudge,
    scarred,
    honored,
    beefcakes,
    morale(
      "On the boats you learn the sauce or you drown. Here I only drown quietly.",
      "A sauce is a promise kept warm. I keep mine.",
    ),
  ],
  ANWAR: [
    walkedOut,
    ...PAYOFFS,
    (f) =>
      f.career.night === 7
        ? card(f, "Seven nights. The soufflé is still for her — it only has to rise once more.", "night7-souffle")
        : null,
    revised("ANWAR"),
    grudge,
    scarred,
    honored,
    beefcakes,
    morale(
      "Grandmother made it rise for forty years. I am still learning her patience.",
      "The soufflé is not a dessert. It is an appointment.",
    ),
  ],
};

/** one card per cook per morning — the same fact can only speak for one line */
export function morningCards(career: Career, cooks: Cook[]): Confessional[] {
  const lastNight = career.night - 1;
  const cards: Confessional[] = [];
  for (const cook of cooks) {
    const rules = RULES[cook.name] ?? [
      walkedOut,
      ...PAYOFFS,
      grudge,
      scarred,
      beefcakes,
      morale("New apron, same burns.", "Still here. Still learning the pass."),
    ];
    const f = { career, cook, cooks, lastNight };
    for (const rule of rules) {
      const c = rule(f);
      if (c) {
        cards.push(c);
        break;
      }
    }
  }
  return cards;
}
