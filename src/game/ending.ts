import { currentWellingtonRecipe, WELLINGTON_FINISHES } from "./culinary";
import { residencyWon } from "./serviceScore";
import type { Career, Cook } from "./state";

export interface RollCallEntry {
  name: string;
  line: string;
  gone: boolean;
}

export interface EndingResult {
  won: boolean;
  broke: boolean;
  legend: boolean;
  title: string;
  quote: string;
  signature: string;
  brigade: string;
  costs: string;
  memory: string;
  /** the curtain call: one fate line per cook, in station order */
  rollCall: RollCallEntry[];
  avgCulinary: number;
  avgHospitality: number;
}

function names(cooks: readonly Cook[]): string {
  return cooks.map((cook) => cook.name).join(", ");
}

export function buildEnding(career: Career, cooks: readonly Cook[]): EndingResult {
  const avgCulinary = (career.culinaryCount ?? 0) > 0 ? (career.culinaryTotal ?? 0) / career.culinaryCount! : 0;
  const avgHospitality = (career.hospitalityCount ?? 0) > 0 ? (career.hospitalityTotal ?? 0) / career.hospitalityCount! : 0;
  const won = residencyWon({
    stars: career.stars,
    avgCulinary,
    avgHospitality,
    defections: career.defections,
    totalWalkouts: career.totalWalkouts ?? 0,
    cash: career.cash,
  });
  const broke = career.cash < -60;
  const legend = won && (career.totalEgo ?? 0) >= 200;
  const recipe = currentWellingtonRecipe(career.recipeHistory);
  const live = cooks.filter((cook) => !cook.walkedOut);
  const honored = live.filter((cook) => cook.honored);
  const grudged = live.filter((cook) => cook.grudge);
  const scarred = live.filter((cook) => cook.trauma > 0);
  const walked = cooks.filter((cook) => cook.walkedOut);
  const departed = [...new Set([...(career.departedCooks ?? []), ...walked.map((cook) => cook.name)])];
  const shared = !!recipe && recipe.contributor !== "THE HOUSE";

  let title: string;
  let quote: string;
  if (broke) {
    title = "THE TILL IS EMPTY";
    quote = "The suppliers stopped answering. The lights stayed on out of pity. It's over.";
  } else if (legend) {
    title = shared ? "THE HOUSE HAS A NAME" : "THE CHEF HAS A NAME";
    quote = "The alley chants it. The brigade answers. Whatever happens next, this room existed because you refused to close it.";
  } else if (won && shared) {
    title = "A HOUSE, NOT A HERO";
    quote = "The guide praises the Wellington. The brigade knows whose hands are in it. That is the better review.";
  } else if (won) {
    title = "THE ROOM SAYS YES, CHEF";
    quote = "The food, the room and the brigade held. You are the venue now — with everything that cost still attached.";
  } else if (departed.length > 0) {
    title = "THE EMPTY STATIONS REMAIN";
    quote = "Nine nights of sweat and shouting. The guide remembers the plates; the kitchen remembers who did not come back.";
  } else {
    title = "A FOOTNOTE, STILL WARM";
    quote = "Nine nights did not make a legend. They made a kitchen that knows itself, and a chef who knows what remains.";
  }

  const signature = recipe
    ? `${recipe.contributor}'s ${WELLINGTON_FINISHES[recipe.finish].name.toLowerCase()} Wellington is the house signature${shared ? " — shared credit, not borrowed glory" : " — the house voice is yours"}.`
    : "No Wellington revision survived the residency. The first honest plate remains the house standard.";

  const brigadeParts = [
    live.length ? `${names(live)} stayed for the last service` : "Nobody stayed for the last service",
    honored.length ? `${names(honored)} carry the house's honor` : null,
    scarred.length ? `${names(scarred)} still carry the scars` : null,
    grudged.length ? `${names(grudged)} leave with something unforgiven: ${grudged.map((cook) => `${cook.name} — ${cook.grudge}`).join("; ")}` : null,
    departed.length ? `${departed.join(", ")} did not come back` : null,
  ].filter(Boolean);

  const costs = [
    `£${career.cash} in the till`,
    career.defections ? `${career.defections} defection${career.defections === 1 ? "" : "s"}` : "no defections",
    `${career.totalWalkouts ?? 0} service walkout${(career.totalWalkouts ?? 0) === 1 ? "" : "s"}`,
    (career.debt ?? 0) > 0 ? `£${career.debt} debt already settled off the top` : null,
  ].filter(Boolean).join(" · ");

  const memories = [
    career.openingMemory?.night === 1
      ? `Petra remembers the first honest verdict: ${career.openingMemory.firstVerdict === "sendback" ? "you sent the fault back" : career.openingMemory.firstVerdict === "smash" ? "you chose the tiles" : "you served what you saw"}.`
      : null,
    career.rivalOffer
      ? career.rivalOffer.kept
        ? `You kept ${career.rivalOffer.cookName} when Beefcakes came calling.`
        : `You took Beefcakes' offer and lost ${career.rivalOffer.cookName}.`
      : null,
    career.beefcakesTruce
      ? "The truce held: his runners stopped coming."
      : career.beefcakesWar
        ? "The rivalry held: his runners kept coming."
        : null,
    career.recovery
      ? `${career.recovery.cookName} remembers being ${career.recovery.choice === "protect" ? "protected before the last push" : "pushed before the last push"}.`
      : null,
    career.table101Memory
      ? `Table 101 ${career.table101Memory.moved ? "moved" : "stayed"}; ${career.table101Memory.turns} turn${career.table101Memory.turns === 1 ? "" : "s"} reached the room.`
      : null,
  ].filter(Boolean);

  // the curtain call: the brigade faces the room one last time. The line is
  // what the residency did to them — honored above scars, scars above mood.
  const walkedOutIds = new Set(walked.map((cook) => cook.id));
  const departedNames = new Set(departed);
  const liveNames = new Set(live.map((cook) => cook.name));
  const rollCall: RollCallEntry[] = cooks
    .filter((cook) => !cook.name.toLowerCase().includes("commis"))
    .map((cook) => {
      // walked out by identity; departed by name, but only when no standing
      // cook carries the same name (a replacement inherits the name, not the exit)
      const gone = walkedOutIds.has(cook.id) || (departedNames.has(cook.name) && !liveNames.has(cook.name));
      let line: string;
      if (gone) line = "did not come back for the last service.";
      else if (cook.honored) line = "carries the house's honor — and earned it.";
      else if (cook.grudge) line = `leaves with ${cook.grudge} unforgiven.`;
      else if (cook.trauma > 0) line = "still carries the scars. Stays anyway.";
      else line = "stayed every service, and it showed.";
      return { name: cook.name, line, gone };
    });

  return {
    won,
    broke,
    legend,
    title,
    quote,
    signature,
    brigade: brigadeParts.join(". ") + ".",
    costs,
    memory: memories.join(" "),
    rollCall,
    avgCulinary,
    avgHospitality,
  };
}
