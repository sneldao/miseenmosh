/**
 * Phase C — morning confessionals. One card per cook per morning, written
 * over their cast portrait in the kitchen book. Every line is gated on a
 * recorded fact — a card can only say what the career log can prove —
 * and the first matching rule wins, so the sharpest truth speaks first.
 */
import type { Career, Cook } from "./state";

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

const grudge: Rule = (f) =>
  f.cook.grudge ? card(f, `Still not forgiven — ${f.cook.grudge}. The pass remembers, and so do I.`, "grudge") : null;

const sauceSaved = (who: string): Rule => (f) =>
  f.career.lastSauceHelp?.night === f.lastNight && f.career.lastSauceHelp.cookName === who
    ? card(f, `You brought my ${f.career.lastSauceHelp.dish} back. That stays between us.`, "lastSauceHelp")
    : null;

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

const morale = (low: string, mid: string): Rule => (f) =>
  card(f, f.cook.morale < 40 ? low : mid, f.cook.morale < 40 ? "morale-low" : "morale");

const RULES: Record<string, Rule[]> = {
  PETRA: [
    walkedOut,
    (f) =>
      f.career.night === 1
        ? card(f, "My tongs. My hands. That is the whole rule.", "night1-rule")
        : null,
    (f) =>
      f.career.night === 3
        ? card(f, "You want to know about the tongs? Three stars. The dish wasn't right. I walked.", "night3-reveal")
        : null,
    sauceSaved("PETRA"),
    revised("PETRA"),
    grudge,
    scarred,
    honored,
    morale(
      "I am counting the services left, same as you.",
      "The grill is honest. Everything else is negotiable.",
    ),
  ],
  DIMITRI: [
    walkedOut,
    sauceSaved("DIMITRI"),
    revised("DIMITRI"),
    grudge,
    scarred,
    honored,
    morale(
      "On the boats you learn the sauce or you drown. Here I only drown quietly.",
      "A sauce is a promise kept warm. I keep mine.",
    ),
  ],
  ANWAR: [
    walkedOut,
    (f) =>
      f.career.night === 7
        ? card(f, "Seven nights. The soufflé is still for her — it only has to rise once more.", "night7-souffle")
        : null,
    sauceSaved("ANWAR"),
    revised("ANWAR"),
    grudge,
    scarred,
    honored,
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
      grudge,
      scarred,
      morale("New apron, same burns.", "Still here. Still learning the pass."),
    ];
    const f = { career, cook, lastNight };
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
