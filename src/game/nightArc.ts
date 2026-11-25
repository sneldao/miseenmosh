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
    condition: "The second Wellington must be inspected and its fault acknowledged before judgment; waiting is free.",
    brigadeOpportunity: "Send the overdone Wellington back, serve it knowingly, or smash it; Petra answers immediately.",
    payoff: "Petra's response and the opening verdict are remembered in the ending.",
  },
  {
    night: 2,
    name: "Standard under pace",
    dilemma: "Whisk the sauce now, or send the plate back and risk the remake?",
    condition: "Dimitri's first sauce is guaranteed to split unless the player intervenes.",
    brigadeOpportunity: "Whisk the sauce, send it back for a real remake, or let it go out broken.",
    payoff: "Dimitri distinguishes help, humiliation and silence the next morning.",
  },
  {
    night: 3,
    name: "Own the signature",
    dilemma: "Share credit for the Wellington, or make the house voice entirely yours?",
    condition: "The chosen finish and credit become the recipe snapshot used in service.",
    brigadeOpportunity: "Shared credit strengthens the contributor; taking it costs morale and leaves a grudge.",
    payoff: "The next service names the contributor, and Petra remembers whose voice it became.",
  },
  {
    night: 4,
    name: "The room outside",
    dilemma: "Spend attention on regulars, the critic or the failing brigade?",
    condition: "A guaranteed early table request makes hospitality a live decision independent of food quality.",
    brigadeOpportunity: "Brigade attention steadies the weakest cook; room attention improves the chosen table's outcome.",
    payoff: "The morning card reports the actual hospitality evidence, not just the star total.",
  },
  {
    night: 5,
    name: "Rival terms",
    dilemma: "Buy peace with Beefcakes, or buy momentum and accept the runners?",
    condition: "Détente removes rival theft; rivalry doubles the runner schedule and raises heat.",
    brigadeOpportunity: "The choice changes how much attention the brigade must spend away from the pass.",
    payoff: "The truce or war is named in the next briefing and persists through the ending.",
  },
  {
    night: 6,
    name: "Recovery",
    dilemma: "Push an exhausted cook, or protect the person needed tomorrow?",
    condition: "Trauma and low morale make chef cover slower; a protected cook is more likely to land a requested correction.",
    brigadeOpportunity: "The recovery choice changes real skill, morale, trauma and later correction reliability.",
    payoff: "The chosen cook speaks about being pushed or protected before the final stretch.",
  },
  {
    night: 7,
    name: "A place at the table",
    dilemma: "Keep Table 101's ritual, or make the room easier to run?",
    condition: "Table 101 has a shorter fuse; seating and moving it change patience and the turns the house can complete.",
    brigadeOpportunity: "Featuring Anwar's soufflé and turning 101 twice can earn his honor.",
    payoff: "The seating, move, turns and feature are remembered in Anwar's next morning card.",
  },
  {
    night: 8,
    name: "Who stays",
    dilemma: "Keep a trusted cook, or take the rival's offer and the safer numbers?",
    condition: "Beefcakes targets the strongest relationship; keeping them costs cash, while selling them adds a defection and a replacement.",
    brigadeOpportunity: "Honor, morale and grudges determine who is targeted and what the final brigade can cover.",
    payoff: "The kept cook or their replacement speaks on the final morning; the ending names the departure.",
  },
  {
    night: 9,
    name: "Open the doors",
    dilemma: "Protect the signature, the people, or the room's reputation?",
    condition: "The final service combines the actual recipe lineage, menu, regulars, honors, grudges, trauma and defections.",
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
