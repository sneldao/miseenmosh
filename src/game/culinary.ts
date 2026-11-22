/**
 * The house's readable standards, not a claim that these are the only valid
 * versions of these dishes. Condition is sampled once when cooking finishes;
 * presentation, correction and food quality all consume that same condition.
 */
export type RecipeFinish = "classic" | "herb";
export type Correction = "technique" | "sauce" | "structure" | "temperature" | "plating";

export interface DishCondition {
  technique: "under" | "right" | "over";
  sauce: "none" | "smooth" | "split";
  structure: "intact" | "collapsed";
  temperature: "hot" | "warm" | "cold";
  plating: "composed" | "hurried";
  recipeFinish: RecipeFinish;
}

interface DishProfile {
  name: string;
  station: number;
  servedHot: boolean;
  hasSauce: boolean;
  ideal: string;
  under: string;
  over: string;
  broken: string;
  standard: string;
}

export const DISH_PROFILES: readonly DishProfile[] = [
  {
    name: "Scallop, one", station: 0, servedHot: true, hasSauce: true,
    ideal: "Caramelised face, pearly centre",
    under: "Pale face, translucent centre",
    over: "Dark crust, tightly shrunken centre",
    broken: "The scallop is torn",
    standard: "A caramelised face and a tender, pearly centre.",
  },
  {
    name: "Beef Wellington", station: 0, servedHot: true, hasSauce: true,
    ideal: "Golden pastry, pink centre",
    under: "Pale pastry, deep-red centre",
    over: "Dark pastry, grey centre",
    broken: "The pastry has broken open",
    standard: "Crisp pastry, a pink centre and an unbroken jus.",
  },
  {
    name: "Red mullet, crying", station: 0, servedHot: true, hasSauce: true,
    ideal: "Crisp skin, moist flakes",
    under: "Pale skin, glassy flesh",
    over: "Dry, curling flakes",
    broken: "The fillet has fallen apart",
    standard: "Crisp skin over moist, gently separating flakes.",
  },
  {
    name: "Risotto (stood up)", station: 1, servedHot: true, hasSauce: false,
    ideal: "Rice settles in a soft wave",
    under: "Hard-looking grains, thin stock",
    over: "The rice holds a stiff mound",
    broken: "Rice and liquid sit apart",
    standard: "Our loose house risotto should settle, with distinct grains.",
  },
  {
    name: "Lamb sauce (missing)", station: 1, servedHot: true, hasSauce: true,
    ideal: "Browned edge, rosy slices",
    under: "Pale edge, deep-red slices",
    over: "Dry, grey slices",
    broken: "The slices are ragged",
    standard: "Browned lamb, a rosy cut and a cohesive sauce.",
  },
  {
    name: "Pommes purée", station: 1, servedHot: true, hasSauce: false,
    ideal: "A smooth, soft ribbon",
    under: "Lumps interrupt the spoon trail",
    over: "A stiff, gluey peak",
    broken: "Butter pools away from the purée",
    standard: "A smooth ribbon that relaxes after the spoon passes.",
  },
  {
    name: "Foie torchon", station: 2, servedHot: false, hasSauce: false,
    ideal: "Chilled, clean-cut medallions",
    under: "Soft, slumped medallions",
    over: "Coarse, crumbling edges",
    broken: "The medallion has crumbled",
    standard: "Chilled medallions with a clean edge and smooth interior.",
  },
  {
    name: "Soufflé (weeping)", station: 2, servedHot: true, hasSauce: false,
    ideal: "A risen, golden crown",
    under: "Pale crown, wet centre",
    over: "A dark, dry crown",
    broken: "The crown has collapsed",
    standard: "A risen crown, a light centre, served promptly.",
  },
  {
    name: "Tart of the day", station: 2, servedHot: false, hasSauce: false,
    ideal: "Golden shell, clean filling",
    under: "Pale, soft shell",
    over: "Dark, brittle shell",
    broken: "The shell has broken",
    standard: "A crisp shell supporting the filling and fruit.",
  },
];

const GENERIC_PROFILE: DishProfile = {
  name: "House dish", station: 0, servedHot: true, hasSauce: false,
  ideal: "Evenly cooked and neatly arranged",
  under: "The centre looks underdone",
  over: "Dry, dark edges",
  broken: "The dish has lost its shape",
  standard: "Even cooking, a composed plate and the right serving temperature.",
};

export function dishProfile(dish: string): DishProfile {
  return DISH_PROFILES.find((profile) => profile.name === dish) ?? GENERIC_PROFILE;
}

export const WARM_AFTER = 18;
export const COLD_AFTER = 35;
export const SAUCE_CORRECTION_SECONDS = 2.4;

/** Culinary assessment only; table timing and guest preferences are separate. */
export function qualityOfCondition(dish: string, condition: DishCondition): number {
  let quality = 88;
  if (condition.technique === "under") quality -= 28;
  if (condition.technique === "over") quality -= 20;
  if (condition.sauce === "split") quality -= 18;
  if (condition.structure === "collapsed") quality -= 34;
  if (dishProfile(dish).servedHot) {
    if (condition.temperature === "warm") quality -= 8;
    if (condition.temperature === "cold") quality -= 24;
  }
  if (condition.plating === "hurried") quality -= 10;
  return Math.max(5, quality);
}

export function applyCorrection(condition: DishCondition, correction: Correction): DishCondition {
  switch (correction) {
    case "technique": return { ...condition, technique: "right" };
    case "sauce": return { ...condition, sauce: condition.sauce === "none" ? "none" : "smooth" };
    case "structure": return { ...condition, structure: "intact" };
    case "temperature": return { ...condition, temperature: "hot" };
    case "plating": return { ...condition, plating: "composed" };
  }
}

export interface ConditionOptions {
  sear?: "golden" | "rushed" | null;
  sauce?: "saved" | "split" | null;
  recipeFinish?: RecipeFinish;
  correction?: Correction;
}

/**
 * Cooking luck determines observable defects before judgment. This function
 * consumes no RNG. After this point quality is derived solely from condition.
 */
export function conditionFromCooking(
  dish: string,
  cookingResult: number,
  options: ConditionOptions = {},
): DishCondition {
  const profile = dishProfile(dish);
  const result = Number.isFinite(cookingResult) ? cookingResult : 45;
  let condition: DishCondition = {
    technique: "right",
    sauce: profile.hasSauce ? "smooth" : "none",
    structure: "intact",
    temperature: profile.servedHot ? "hot" : "cold",
    plating: result >= 80 ? "composed" : "hurried",
    recipeFinish: dish === "Beef Wellington" ? options.recipeFinish ?? "classic" : "classic",
  };
  if (result < 72 && result >= 60 && profile.servedHot) condition.temperature = "warm";
  if (result < 60 && result >= 45) condition.technique = "over";
  if (result < 45) {
    condition.technique = "under";
    condition.temperature = "cold";
    if (dish === "Soufflé (weeping)" || !profile.servedHot) condition.structure = "collapsed";
  }
  if (options.sear === "rushed") condition.technique = "under";
  if (profile.hasSauce && options.sauce === "split") condition.sauce = "split";
  if (profile.hasSauce && options.sauce === "saved") condition.sauce = "smooth";
  if (options.correction) condition = applyCorrection(condition, options.correction);
  return condition;
}

/** Ready/held food cools on the service clock. Chilled dishes do not fail for being cold. */
export function coolCondition(dish: string, condition: DishCondition, secondsReady: number): DishCondition {
  if (!dishProfile(dish).servedHot) return condition;
  const temperature = secondsReady >= COLD_AFTER ? "cold"
    : secondsReady >= WARM_AFTER && condition.temperature === "hot" ? "warm"
      : condition.temperature;
  return temperature === condition.temperature ? condition : { ...condition, temperature };
}

export function correctionNeeded(dish: string, condition: DishCondition): Correction | null {
  if (condition.structure === "collapsed") return "structure";
  if (condition.technique !== "right") return "technique";
  if (condition.sauce === "split") return "sauce";
  if (dishProfile(dish).servedHot && condition.temperature !== "hot") return "temperature";
  if (condition.plating === "hurried") return "plating";
  return null;
}

export const CORRECTION_LABEL: Record<Correction, string> = {
  technique: "Check the cooking",
  sauce: "Bring the sauce together",
  structure: "Make a fresh one",
  temperature: "Bring it hot",
  plating: "Plate it carefully",
};

/** Observations, never a good/bad classification. Useful without colour vision or audio. */
export function plateObservations(dish: string, condition: DishCondition): string[] {
  const profile = dishProfile(dish);
  const observations = [
    condition.structure === "collapsed" ? profile.broken
      : condition.technique === "under" ? profile.under
        : condition.technique === "over" ? profile.over : profile.ideal,
  ];
  if (condition.sauce === "split") observations.push("Oil beads separate from the sauce");
  if (profile.servedHot && condition.temperature === "warm") observations.push("The plate is cooling");
  if (profile.servedHot && condition.temperature === "cold") observations.push("The plate has gone cold");
  if (condition.plating === "hurried") observations.push("A hurried finish");
  if (dish === "Beef Wellington" && condition.recipeFinish === "herb") observations.push("Thyme and parsley finish");
  return observations;
}

export type OrderState = "rail" | "plating" | "ready" | "pass" | "done";
interface OrderSlot { id: number; station: number; state: OrderState }

/** One work/ready position per station; the chef's held plate is a separate position. */
export function canStartOrder(tickets: readonly OrderSlot[], id: number): boolean {
  const ticket = tickets.find((item) => item.id === id && item.state === "rail");
  return !!ticket && !tickets.some((item) =>
    item.station === ticket.station && (item.state === "plating" || item.state === "ready"));
}

export function canCollectOrder(tickets: readonly OrderSlot[], id: number): boolean {
  return !tickets.some((item) => item.state === "pass")
    && tickets.some((item) => item.id === id && item.state === "ready");
}

export interface RecipeRevision {
  dish: "Beef Wellington";
  finish: RecipeFinish;
  contributor: string;
  night: number;
}

export const WELLINGTON_FINISHES = {
  classic: {
    name: "Crisp finish",
    note: "Jus alongside. Let the pastry speak.",
    extraSeconds: 0,
  },
  herb: {
    name: "Herb finish",
    note: "Thyme, parsley and a little more time at the pass.",
    extraSeconds: 0.8,
  },
} as const;

/** Drop malformed optional recipe entries without discarding an existing career. */
export function cleanRecipeHistory(value: unknown): RecipeRevision[] {
  if (!Array.isArray(value)) return [];
  const byNight = new Map<number, RecipeRevision>();
  for (const entry of value) {
    if (
      !entry || typeof entry !== "object"
      || entry.dish !== "Beef Wellington"
      || (entry.finish !== "classic" && entry.finish !== "herb")
      || typeof entry.contributor !== "string"
      || entry.contributor.trim().length === 0 || entry.contributor.length > 24
      || !Number.isInteger(entry.night) || entry.night < 2 || entry.night > 9
    ) continue;
    byNight.set(entry.night, {
      dish: "Beef Wellington", finish: entry.finish,
      contributor: entry.contributor.trim(), night: entry.night,
    });
  }
  return [...byNight.values()].sort((a, b) => a.night - b.night).slice(-8);
}

export function currentWellingtonRecipe(history: readonly RecipeRevision[] | undefined): RecipeRevision | null {
  if (!history?.length) return null;
  // Sanitation happens at the persistence boundary; do not sort/mutate caller state.
  return history.reduce((latest, entry) => entry.night >= latest.night ? entry : latest);
}

/** A morning may be revised before opening, but creates only one history entry. */
export function reviseWellington(
  history: readonly RecipeRevision[] | undefined,
  finish: RecipeFinish,
  contributor: string,
  night: number,
): RecipeRevision[] {
  return cleanRecipeHistory([
    ...(history ?? []).filter((entry) => entry.night !== night),
    { dish: "Beef Wellington", finish, contributor, night },
  ]);
}
