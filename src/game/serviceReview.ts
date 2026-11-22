import { criticAssessment, type CriticPersona } from "./critics";
import type { ServiceEvent, FolkloreOutcome } from "./serviceEvents";

export interface ReviewFacts {
  night: number;
  stars: number;
  served: number;
  sentBack: number;
  screams: number;
  smashed: number;
  misses: number;
  complaints: number;
  walkoutNames: string[];
  spotted: boolean;
  criticServed: number;
  criticAvg: number;
  events: readonly ServiceEvent[];
  folkloreOutcome: FolkloreOutcome | null;
  persona: CriticPersona;
  isFinalNight: boolean;
}

export interface ServiceStory {
  headline: string;
  incident: string;
  consequence: string;
  criticVerdict: string;
  folkloreLine?: string;
  cover?: string;
}

export function buildServiceStory(f: ReviewFacts): ServiceStory {
  let headline: string, incident: string, consequence: string;
  const rescue = [...f.events].reverse().find((e) => e.kind === "rescue");
  if (f.walkoutNames.length) {
    const names = f.walkoutNames.join(" & ");
    headline = f.stars > 0 ? "THE STARS HAVE A COST" : "THE BRIGADE PAID THE PRICE";
    incident = `${names} walked out before service ended. ${f.served} dishes reached the room; ${f.walkoutNames.length === 1 ? "the empty station belongs" : "the empty stations belong"} in the review too.`;
    consequence = `${names} will carry another trauma scar into tomorrow. Family meal is your first chance to help.`;
  } else if (f.spotted && f.criticServed === 0) {
    headline = "SPOTTED. NEVER SERVED.";
    incident = "You identified the inspector, but no plate reached their table.";
    consequence =
      "Tomorrow, identifying the inspector is only the beginning. Their order still needs a place on the pass.";
  } else if (f.smashed >= 3) {
    headline = "THE CROCKERY MADE THE NEWS";
    incident = `${f.smashed} plates hit the tiles. ${f.served} dishes reached the room, and every cook stayed through service.`;
    consequence = `The breakage bill takes £${f.smashed * 12} from tonight’s takings. That money cannot buy tomorrow’s ingredients.`;
  } else if (rescue?.kind === "rescue") {
    headline = `${rescue.cookName} HELD THE LINE`;
    incident =
      rescue.action === "catch"
        ? `${rescue.cookName} caught the ${rescue.dish ?? "plate"} before it hit the floor.`
        : rescue.action === "whisk"
          ? `${rescue.cookName} saved the ${rescue.dish ?? "sauce"} before it went out split.`
          : `${rescue.cookName} looked at the door, then stayed to finish service.`;
    consequence = `Tomorrow’s coaching is a chance to acknowledge ${rescue.cookName}.`;
  } else if (f.misses > 0) {
    headline = "THE ROOM RAN OUT OF PATIENCE";
    incident = `${f.misses} order${f.misses === 1 ? "" : "s"} expired before delivery. ${f.served} dishes made it through.`;
    consequence = "Tomorrow, watch the oldest docket before adding another order to the pass.";
  } else if (f.screams === 0 && f.served >= 8) {
    headline = "A SERVICE WITHOUT SHOUTING";
    incident = `${f.served} dishes served without a shout. ${
      f.smashed
        ? `${f.smashed} plate${f.smashed === 1 ? "" : "s"} still hit the tiles.`
        : "Every cook stayed to the end."
    }`;
    consequence = "Tomorrow brings another service. The brigade you kept together comes with you.";
  } else {
    headline = f.served > 0 ? "SERVICE, ON THE RECORD" : "A ROOM STILL WAITING";
    incident = `${f.served} dishes served, ${f.sentBack} sent back, ${f.smashed} smashed. ${f.screams} shout${f.screams === 1 ? "" : "s"} from the pass.`;
    consequence = "Before tomorrow’s doors open, check who needs rest and what the kitchen can afford.";
  }
  if (f.isFinalNight)
    consequence = "The residency ends here. Your final accounts include tonight’s service.";
  const o = f.folkloreOutcome;
  const folkloreLine = o
    ? `Table ${o.table}, ${o.test} test: ${
        o.result === "allowed"
          ? "you let them post"
          : o.result === "refired"
            ? "re-fired on the house"
            : o.result === "expired"
              ? "went unanswered"
              : o.result
      }.`
    : undefined;
  return {
    headline,
    incident,
    consequence,
    criticVerdict: criticAssessment(f.persona, f),
    folkloreLine,
    cover: f.stars >= 4 ? `GRIDDLE — NIGHT ${f.night}: ${headline}` : undefined,
  };
}

/** One night's accounts — shared by continueNext (which applies them) and the
 *  review (which needs to know whether tonight is really the last). */
export function nightAccounts(a: {
  covers: number;
  price: number;
  walkedOut: number;
  cooks: number;
  smashed: number;
  betCash: number;
  cash: number;
  debtTake: number;
}): { covers: number; wages: number; breakage: number; net: number; nextCash: number } {
  const covers = a.covers * a.price;
  // walked-out cooks still expect half pay — storming off doesn't kill the bill
  const wages = 30 * (a.cooks - a.walkedOut) + 15 * a.walkedOut;
  const breakage = a.smashed * 12;
  const net = covers - wages - breakage;
  const nextCash = a.cash + net + a.betCash - a.debtTake;
  return { covers, wages, breakage, net, nextCash };
}

/** The story, spoken or pasted: one flat narration of what actually happened. */
export function reviewNarration(review: {
  headline?: string;
  incident: string;
  consequence: string;
  criticVerdict?: string;
  folkloreLine?: string;
  vowLine?: string;
  betLine?: string;
}): string {
  return [
    review.headline,
    review.incident,
    review.consequence,
    review.criticVerdict,
    review.folkloreLine,
    review.vowLine,
    review.betLine,
  ]
    .filter(Boolean)
    .join(" ");
}
