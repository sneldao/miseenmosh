import type { Career, Cook } from "./state";

export type Attention = "regulars" | "critic" | "brigade";
export type RecipeCredit = "shared" | "house";
export type RecoveryChoice = "push" | "protect";

export interface NightContract {
  night: number;
  name: string;
  dilemma: string;
  condition: string;
  brigadeOpportunity: string;
  payoff: string;
}

export const NIGHT_CONTRACTS: readonly NightContract[] = [
  {
    night: 1,
    name: "Earn the pass",
    dilemma: "Trust the evidence, or protect Petra from a truthful correction?",
    condition: "Two Wellingtons tonight. The second one comes up overdone — see it before you call it. Waiting costs nothing.",
    brigadeOpportunity: "Send the overdone Wellington back, serve it knowingly, or smash it; Petra answers immediately.",
    payoff: "Petra's response and the opening verdict are remembered in the ending.",
  },
  {
    night: 2,
    name: "Standard under pace",
    dilemma: "Whisk the sauce now, or send the plate back and risk the remake?",
    condition: "Dimitri's first sauce will split mid-rush. Whisk it yourself or make him take it back — either way, you decide.",
    brigadeOpportunity: "Whisk the sauce, send it back for a real remake, or let it go out broken.",
    payoff: "Dimitri distinguishes help, humiliation and silence the next morning.",
  },
  {
    night: 3,
    name: "Own the signature",
    dilemma: "Share credit for the Wellington, or make the house voice entirely yours?",
    condition: "How you call the Wellington tonight is how this house cooks it from here. Pick a finish, pick whose name goes on it.",
    brigadeOpportunity: "Shared credit strengthens the contributor; taking it costs morale and leaves a grudge.",
    payoff: "The next service names the contributor, and Petra remembers whose voice it became.",
  },
  {
    night: 4,
    name: "The room outside",
    dilemma: "Spend attention on regulars, the critic or the failing brigade?",
    condition: "One table asks for the pass before the rush. Whoever you feed first, the room remembers the order.",
    brigadeOpportunity: "Brigade attention steadies the weakest cook; room attention improves the chosen table's outcome.",
    payoff: "The morning card reports the actual hospitality evidence, not just the star total.",
  },
  {
    night: 5,
    name: "Rival terms",
    dilemma: "Buy peace with Beefcakes, or buy momentum and accept the runners?",
    condition: "Beefcakes wants terms. Peace costs coin and keeps his runners home; war costs tickets and doubles him.",
    brigadeOpportunity: "The choice changes how much attention the brigade must spend away from the pass.",
    payoff: "The truce or war is named in the next briefing and persists through the ending.",
  },
  {
    night: 6,
    name: "Recovery",
    dilemma: "Push an exhausted cook, or protect the person needed tomorrow?",
    condition: "Someone is running on fumes. Push them harder tonight and pay in morale, or rest them and keep tomorrow.",
    brigadeOpportunity: "The recovery choice changes real skill, morale, trauma and later correction reliability.",
    payoff: "The chosen cook speaks about being pushed or protected before the final stretch.",
  },
  {
    night: 7,
    name: "A place at the table",
    dilemma: "Keep Table 101's ritual, or make the room easier to run?",
    condition: "Table 101 sits on a shorter fuse. Where you seat them — and whether you move them mid-rush — changes everything.",
    brigadeOpportunity: "Featuring Anwar's soufflé and turning 101 twice can earn his honor.",
    payoff: "The seating, move, turns and feature are remembered in Anwar's next morning card.",
  },
  {
    night: 8,
    name: "Who stays",
    dilemma: "Keep a trusted cook, or take the rival's offer and the safer numbers?",
    condition: "Beefcakes is buying people now. Keep the cook you trust and pay for it, or sell them and start someone new.",
    brigadeOpportunity: "Honor, morale and grudges determine who is targeted and what the final brigade can cover.",
    payoff: "The kept cook or their replacement speaks on the final morning; the ending names the departure.",
  },
  {
    night: 9,
    name: "Open the doors",
    dilemma: "Protect the signature, the people, or the room's reputation?",
    condition: "Last service. Everything you built — the recipe, the people, the room's name — walks through the door with you.",
    brigadeOpportunity: "The house, brigade or star vow decides which success is preserved after service.",
    payoff: "The ending names the recipe author, the people kept or lost, and the price of the residency.",
  },
];

export function nightContract(night: number): NightContract {
  return NIGHT_CONTRACTS[Math.max(0, Math.min(NIGHT_CONTRACTS.length - 1, Math.floor(night) - 1))];
}

export function lowestMoraleCook(cooks: readonly Cook[]): Cook | undefined {
  const live = cooks.filter((cook) => !cook.walkedOut);
  return live.reduce<Cook | undefined>((low, cook) => !low || cook.morale < low.morale ? cook : low, undefined);
}

export function retentionTarget(cooks: readonly Cook[]): Cook | undefined {
  const live = cooks.filter((cook) => !cook.walkedOut);
  return live.reduce<Cook | undefined>((best, cook) => {
    if (!best) return cook;
    const rank = (c: Cook) => (c.honored ? 100 : 0) + c.morale - (c.grudge ? 20 : 0) + c.skill * 25;
    return rank(cook) > rank(best) ? cook : best;
  }, undefined);
}

export function chefCoverMultiplier(career: Career, cooks: readonly Cook[]): number {
  if (career.night < 6) return 1.8;
  const strain = cooks
    .filter((cook) => !cook.walkedOut)
    .reduce((sum, cook) => sum + cook.trauma * 0.12 + (cook.morale < 35 ? 0.12 : 0), 0);
  return 1.8 * (1 + Math.min(0.6, strain));
}

export function recoveryCorrectionBonus(career: Career, cook: Cook): number {
  let bonus = career.night >= 6 ? -cook.trauma * 0.06 : 0;
  if (career.recovery?.night === 6 && career.recovery.choice === "protect" && career.recovery.cookId === cook.id) {
    bonus += 0.12;
  }
  return bonus === 0 ? 0 : bonus;
}
