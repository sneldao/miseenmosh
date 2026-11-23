import { create } from "zustand";
import { mulberry32, daySeed } from "./seed";
import { sfx, unlockAudio, setMasterMuted } from "./sound";
import { speakChorus, speakReview } from "./voice";
import { initOg, submitBoard, unlockAch, trackEvent } from "./og";
import {
  CHEF_BARKS, STATION_BARKS, BRIGADE_RESPONSES, GUEST_HECKLES, RIVAL_LINES, pick,
  MEALS, FAMILY_LINES, FAMILY_CRAFT, GRUDGE_BARKS, BEEFCAKES_WARN, BEEFCAKES_STEAL_LINES,
  PRESS_TELLS, COUPLE_FIGHT, REGULARS_KIND, REGULARS_FORGIVE,
  SMOKE_WARN, EXPO_FIRE, EXPO_HANDS, EXPO_CORNER, TRILOGY_WELLY,
  EMPTY_PASS_SCREAM, VAN_REMINDER, FISH_JOKE,
  OUTBID_BEEFCAKES,
  FOLKLORE_FORK_WARN, FOLKLORE_FORK_SAVED, FOLKLORE_FORK_IGNORED,
  FOLKLORE_GLASS_WARN, FOLKLORE_GLASS_SAVED, FOLKLORE_COAT_WARN,
  FOLKLORE_COAT_SAVED, FOLKLORE_RETURN_WARN, FOLKLORE_FLASH_WARN,
  TABLE101_SEAT, TABLE101_MOVE, SEATING_LINES, VOW_LINES, PERMANENT_101,
  TRUCE_LINES, BEEFCAKES_PRICEWAR, HONOR_LINES, MADAME_CAM_NOD, GILLIAM_CAM_CRAFT,
  FATIGUE_BARKS, FLYING_BARKS,
} from "./barks";
import { CRITICS, criticForNight, criticTell, type CriticPersona } from "./critics";
import { appendServiceEvent, type FolkloreOutcome, type ServiceEvent, type TellKind } from "./serviceEvents";
import { deriveMood, spikeStrengths } from "./mood";
import { buildServiceStory, nightAccounts, reviewNarration } from "./serviceReview";
import {
  type DishCondition, type Correction, type RecipeFinish, type RecipeRevision,
  type OrderState, conditionFromCooking, qualityOfCondition, coolCondition,
  correctionNeeded, CORRECTION_LABEL, canStartOrder, canCollectOrder,
  cleanRecipeHistory, currentWellingtonRecipe, reviseWellington,
  WELLINGTON_FINISHES, SAUCE_CORRECTION_SECONDS, dishProfile,
} from "./culinary";

export type Verdict = "serve" | "sendback" | "smash";
export type OpeningStep = "serve" | "call" | "judge";
export type Phase = "title" | "briefing" | "service" | "review" | "ending";
export type PlateTier = "pristine" | "serviceable" | "criminal";

export interface Ticket {
  id: number;
  dish: string;
  table: number;
  station: number;
  age: number;
  state: OrderState;
  /** serviceTime when plating completes */
  plateAt: number;
  plateDur: number;
  /** true when the chef covers a walked-out station */
  byChef: boolean;
  quality: number;
  verdict: Verdict | null;
  /** fire-early call: golden = kissed by the pan, rushed = raw but free */
  sear: "golden" | "rushed" | null;
  /** split-sauce event: whisked back (saved) or gone out broken (split) */
  sauce: "saved" | "split" | null;
  /** canonical food condition, sampled once when cooking finished */
  condition?: DishCondition;
  /** serviceTime the plate became ready — drives cooling */
  readyAt?: number;
  /** a judged send-back told the cook what to fix; the remake honours it */
  requestedCorrection?: Correction;
  /** Wellington revision snapshot at call time */
  recipeFinish?: RecipeFinish;
  recipeContributor?: string;
  /** authored teaching ticket: the first split sauce */
  lesson?: "split-jus";
}

export interface Cook {
  id: number;
  name: string;
  station: number;
  skill: number; // 0..1
  morale: number; // 0..100
  walkedOut: boolean;
  trauma: number; // nights spent broken — drains faster forever
  overloadT: number; // seconds spent drowning (>3 live tickets)
  burning: boolean; // station is on fire
  walkoutAt: number; // serviceTime of the apron throw, for physics
  fave: string; // the dish they nail when it matters
  grudge: string | null; // what they haven't forgiven — fumbles more, cooks bitter
  honored?: boolean; // twice-praised: a name moment, and a once-a-night keepsake save
  honoredUsed?: boolean; // keepsake spent tonight
  smoked: boolean; // the smoke warning already fired tonight
  mood?: import("./mood").Mood; // transient: derived each tick, reset nightly, never persisted
  spikes?: import("./mood").CookSpikes; // transient: event-spike timestamps, never persisted
}

export type GuestKind = "critic" | "press" | "regulars" | "couple" | "walkin";

export interface Guest {
  id: number;
  table: number;
  isCritic: boolean;
  kind: GuestKind;
  tellClock: number;
  /** how many tells this table has given — the critic escalates */
  tells: number;
  /** the regulars' mercy: walkouts forgiven before they walk (2 on dessert nights) */
  mercy: number;
  /** serviceTime of last tell burst; drives the phone flash */
  tellAt: number;
  /** what the last tell looked like — notebook, phone, or inspection; null = no visible tell */
  tellKind: TellKind | null;
}

export interface FeedItem {
  id: number;
  text: string;
  kind: "info" | "good" | "bad" | "drama";
  /** who said it, when the room knows — a cook's name for the speech bubble */
  who?: string;
}

export interface Review {
  stars: number;
  quote: string;
  covers: number;
  avgQuality: number;
  complaints: number;
  misses: number;
  walkouts: number;
  smashed: number;
  spotted: boolean;
  ego: number;
  bestStreak: number;
  criticVerdict: string;
  /** nobody screamed across a real service — the food shouted instead */
  silent: boolean;
  /** the defining incident of the night, from the recorded events */
  incident: string;
  /** what tonight's facts mean for tomorrow */
  consequence: string;
  sentBack: number;
  screams: number;
  /** call-the-board result line + cash payout (applied next morning) */
  betLine?: string;
  betCash?: number;
  /** 9/10 missions: vow judged first, folklore paid off */
  vowLine?: string;
  folkloreLine?: string;
  /** 4–5★: the magazine cover line */
  cover?: string;
  /** the press headline — names the night, not the numbers */
  headline?: string;
}

const DISHES: { name: string; station: number }[] = [
  { name: "Scallop, one", station: 0 },
  { name: "Beef Wellington", station: 0 },
  { name: "Red mullet, crying", station: 0 },
  { name: "Risotto (stood up)", station: 1 },
  { name: "Lamb sauce (missing)", station: 1 },
  { name: "Pommes purée", station: 1 },
  { name: "Foie torchon", station: 2 },
  { name: "Soufflé (weeping)", station: 2 },
  { name: "Tart of the day", station: 2 },
];

const COOK_ROSTER: { name: string; station: number; skill: number; fave: string }[] = [
  { name: "PETRA", station: 0, skill: 0.72, fave: "Beef Wellington" },
  { name: "DIMITRI", station: 1, skill: 0.55, fave: "Pommes purée" },
  { name: "ANWAR", station: 2, skill: 0.64, fave: "Soufflé (weeping)" },
];

const STATION_FAVE = ["Beef Wellington", "Pommes purée", "Soufflé (weeping)"];
const STATION_PAN = [-0.6, 0, 0.6];

/** pan a table's business across the room: tables 10–14, left to right */
function tablePan(table: number): number {
  return Math.max(-1, Math.min(1, ((table - 12) / 2) * 0.7));
}

const NEW_BLOOD = ["RUE", "MAGS", "OTIS", "LEN", "VIV", "COLE", "IDA", "THOM"];

export const VENUES = [
  { name: "STALL 86", sub: "a street stall with delusions", price: 14, spawnMul: 1.0, tellMul: 1.0 },
  { name: "LE MOSH", sub: "a bistro with a landlord problem", price: 22, spawnMul: 0.9, tellMul: 0.85 },
  { name: "MOSH & SON", sub: "the flagship. behave.", price: 32, spawnMul: 0.8, tellMul: 0.7 },
];

const SERVICE_LEN = 150;
const DESSERT_AT = 100; // escalation beat + inspector flag deadline
const TICKET_TTL = 55;
const WALKOUT_AT = 12;
const MAX_NIGHTS = 9;

export interface Career {
  night: number;
  cash: number;
  stars: number;
  venue: number;
  gear: number; // quality floor bonus, bought
  defections: number;
  aggro: number; // Beefcakes heat — raises steal count
  feudDone?: number; // night the feud card was answered
  feudOutcome?: string;
  mealNight?: number; // night the family meal was eaten
  champagneNight?: number; // clout: inspector's table comped tonight
  dessertNight?: number; // clout: regulars forgive twice tonight
  doorNamed?: boolean; // clout: name above the door, +1 star banked
  totalEgo?: number; // lifetime ego banked at reviews — legends need 200
  /** call the board: one wager a night, resolved at review */
  bet?: { kind: "covers" | "walks" | "spot"; stake: number; stakeEgo: number };
  /** the man with the van: £100 now, £130 before the residency ends */
  debt?: number;
  /** cohesion memory: what the kitchen carries between nights */
  lastSmashed?: string | null;
  silentLast?: boolean;
  outbidBeefcakes?: boolean;
  /** 9/10 missions: named critic rotation + grudges */
  criticPersona?: CriticPersona;
  criticGrudge?: number;
  /** cooks remember: praise sessions per cook id (twice praised earns a keepsake) */
  praiseCount?: Record<number, number>;
  /** house vow held: MARA & JUNE are permanent — regulars forgive twice, every night */
  regularsPermanent?: boolean;
  /** BEEFCAKES night (N5): family-meal detente ends the runner war for good */
  beefcakesTruce?: boolean;
  /** BEEFCAKES night (N5): rivalry doubles his runners tonight */
  beefcakesWar?: boolean;
  /** first-time gentling: first sauce gets 7s, first runner warns 10s out */
  sauceGentled?: boolean;
  runnerGentled?: boolean;
  /** run mutator: one twist per residency, chosen N1 — double runners, no bin, short fuse */
  mutator?: "double_runners" | "no_bin" | "short_fuse";
  /** covers earned this run (4–5★ reviews name the magazine) */
  covers?: string[];
  /** coaching: night a cook was coached (one session a night) */
  coachNight?: number;
  /** menu deck: featured dish (+6 tonight), rested dish (off the rail tonight) */
  featuredDish?: string | null;
  restedDish?: string | null;
  menuNight?: number;
  /** maitre-d': who sits at wobbly 101 tonight */
  seating101?: "regulars" | "press" | "walkin" | null;
  /** one vow a night: star / house / brigade */
  vow?: "star" | "house" | "brigade";
  vowDone?: boolean;
  /** provenance: story tags of bought lots, carried into service */
  stories?: string[];
  /** hidden unlock: poked BEEFCAKES 3× on the title card — critic telemetry in service */
  criticCam?: boolean;
  /** last night's factual summary — the morning callback in the next briefing */
  lastReview?: { night: number; headline: string; incident: string; consequence: string };
  /** venue dressing: night the room moved up (briefing banner) */
  venueUpNight?: number;
  /** bounded recipe memory: Wellington revisions, one per night */
  recipeHistory?: RecipeRevision[];
  /** the cook whose sauce the chef saved — thanked by name next morning */
  lastSauceHelp?: { night: number; cookName: string; dish: string };
}

export interface Feud {
  text: string;
  options: string[];
  resolved: boolean;
  actor: "beefcakes" | "critic" | "fishmonger";
  outcome?: string;
}

export interface Lot {
  name: string;
  desc: string;
  /** one true clause from its voice — gossip, not lessons */
  note?: string;
  voice?: string;
  cost: number;
  station: number; // -1 = whole kitchen
  qBonus: number;
  contested: boolean; // BEEFCAKES wants it too
  bought: boolean;
  /** provenance: who pulled it, where — critics remember names */
  origin?: string;
  storyTag?: string;
  risk?: boolean; // yesterday's fish energy
}

// the morning fish market — what the sea surrendered today
const LOT_DECK: Omit<Lot, "bought">[] = [
  { name: "Day-boat scallops", desc: "Lorna, Tobermory, in at 4am. sea dishes +7", note: "Diver-caught, abductors intact — dry flesh sears instead of weeping.", voice: "THE FISHMONGER", cost: 45, station: -1, qBonus: 7, contested: false, origin: "diver Lorna, Tobermory", storyTag: "lorna" },
  { name: "Dry-aged belted beef", desc: "28 days of funk. grill +8", note: "Hung 28 days — the enzymes did the tenderizing, you just don't ruin it.", voice: "THE BUTCHER", cost: 60, station: 0, qBonus: 8, contested: true, origin: "dry-aged 28 days" },
  { name: "Heritage tomatoes", desc: "ugly, perfect. sauté +6", note: "Never refrigerated — cold kills the aromatics dead.", voice: "THE FARM", cost: 35, station: 1, qBonus: 6, contested: false },
  { name: "Normandy butter", desc: "a brick of gold. pastry +6", note: "82% fat, cultured — it laminates instead of tearing.", voice: "THE FARM", cost: 40, station: 2, qBonus: 6, contested: false },
  { name: "Layby shrooms", desc: "a guy, a layby, no receipt. garnish +5, story +10", note: "Brush, never wash — they drink water like a sponge and fry like one.", voice: "THE FARM", cost: 22, station: 2, qBonus: 5, contested: false, origin: "a guy, a layby, no receipt", storyTag: "layby" },
  { name: "Yesterday's fish", desc: "technically fish. everything −2, but it's £8", note: "On ice since Tuesday. It gets cooked through or it gets binned.", voice: "THE FISHMONGER", cost: 8, station: -1, qBonus: -2, contested: false, risk: true },
  { name: "A lamb", desc: "with the sauce already inside it. grill +9", note: "Rest it half its cook or the juices run across the board.", voice: "THE BUTCHER", cost: 70, station: 0, qBonus: 9, contested: true },
  { name: "Saffron threads", desc: "worth more than the pans. sauté +8", note: "Bloom it in warm stock first — dry threads in the pan are confetti.", voice: "THE FARM", cost: 65, station: 1, qBonus: 8, contested: true },
  { name: "Farm eggs, still warm", desc: "the hen glared. pastry +5", note: "Room-temp whites whip; cold ones sulk.", voice: "THE FARM", cost: 28, station: 2, qBonus: 5, contested: false },
];

const FEUD_DECK: { actor: Feud["actor"]; text: (cook: string) => string; options: string[] }[] = [
  {
    actor: "beefcakes",
    text: (c) => `BEEFCAKES slid ${c} a napkin offer. Double your money, says the gym-bro.`,
    options: ["Match it. (−£90, keep them)", "Let them walk. You don't chase talent."],
  },
  {
    actor: "critic",
    text: () => "The food press wants your take on BEEFCAKES' protein-only tasting menu.",
    options: [`"It's a smoothie with plates." (+ego, +heat)`, `"I wish him well." (+brigade morale)`],
  },
  {
    actor: "fishmonger",
    text: () => "A refrigerated van pulls up. The driver offers you BEEFCAKES' fish order. Still cold.",
    options: ["Take it. (−£50, brigade feasts)", "Refuse. You're not that kind of kitchen."],
  },
  {
    actor: "beefcakes",
    text: () => "BEEFCAKES bought every food-truck pitch within a mile of your door.",
    options: ["Outbid him. (−£70)", "Eat it. He can't buy taste. (+heat)"],
  },
];

export function tierOf(q: number): PlateTier {
  return q >= 72 ? "pristine" : q >= 45 ? "serviceable" : "criminal";
}

const REVIEW_QUOTES: Record<number, string[]> = {
  5: ["Flawless. Terrifying. Flawless.", "The pass ran like a drill sergeant with a palate."],
  4: ["Worth every decibel audible from the dining room.", "Chaos, but the kind you pay for."],
  3: ["Competent chaos. The lamb sauce remains missing.", "Great plates, occasional screaming, one apology."],
  2: ["The plates flew further than the flavour travelled.", "Theatre: ten. Dinner: pending."],
  1: ["An open kitchen should not mean an open wound.", "I have seen calmer hostage negotiations."],
  0: ["The chef has been asked to leave his own restaurant.", "A crime scene with a wine list."],
};

const SILENT_TAILS = [
  "The pass never raised its voice — the food shouted instead.",
  "Not one raised voice all night. The plates arrived like apologies that meant it.",
];

/** ego wears a name: the room addresses you by the loudest thing about you */
export const EGO_TIERS: [number, string][] = [
  [55, "LEGEND"],
  [38, "CHEF"],
  [24, "SOUS CHEF"],
  [12, "COOK"],
  [0, "COMMIS"],
];

export function tierName(ego: number): string {
  return EGO_TIERS.find(([floor]) => ego >= floor)?.[1] ?? "COMMIS";
}

const MILESTONES: Record<number, string> = {
  10: "STREAK ×10 — the room leans in.",
  15: "STREAK ×15 — applause, unprompted.",
  20: "STREAK ×20 — they will talk about this service for years.",
};

export const BOARD = {
  covers: { label: "8+ COVERS", stake: 20, stakeEgo: 0, pays: 45, blurb: "stake £20, pays £45" },
  walks: { label: "NO WALKS", stake: 30, stakeEgo: 0, pays: 70, blurb: "stake £30, pays £70" },
  spot: { label: "CLOCK THE INSPECTOR", stake: 0, stakeEgo: 10, pays: 25, blurb: "stake 10 ego, pays +25" },
} as const;

export interface ServiceRequest {
  ticketId: number;
  table: number;
  dish: string;
  mod: "FAST" | "EXTRA CHAR";
  until: number;
}

/** after a tier change the room says the new name out loud */
function tiered(feed: FeedItem[], before: number, after: number): FeedItem[] {
  const a = tierName(before);
  const b = tierName(after);
  return b !== a ? pushFeed(feed, `The room calls you ${b} now.`, "drama") : feed;
}

interface PlateCtx {
  rng: () => number;
  menuBuffs: number[];
  gear: number;
  criticTable: number;
  champagne: boolean;
  /** fired off a smouldering station: kissed by the edge (+4, fire comes sooner) */
  simmer: boolean;
  /** the brigade is flying: favourites land harder (+2) */
  flying: boolean;
}

/** Shared by the auto-complete in tick() and the early fire in firePlate():
 * fumbles first, then the full quality arithmetic including sear + champagne. */
function finishPlating(
  t: Ticket,
  _age: number,
  cook: Cook | undefined,
  ctx: PlateCtx
): { fumble: boolean; quality: number; condition: DishCondition; edged: boolean } {
  const { rng } = ctx;
  // a broken cook fumbles — plate in the bin, ticket back on the rail.
  // one holding a grudge fumbles half as often again.
  if (cook && !cook.walkedOut && cook.morale < 30 && rng() < (cook.grudge ? 0.25 : 0.15)) {
    return { fumble: true, quality: -1, condition: conditionFromCooking(t.dish, 45), edged: false };
  }
  const chefPenalty = t.byChef ? 12 : 0;
  const burnPenalty = cook?.burning ? 8 : 0;
  const marketBonus = ctx.menuBuffs[t.station] ?? 0;
  // favourites get the good hands; grudges get the bitter ones
  const faveBonus = cook && !cook.walkedOut && cook.fave === t.dish ? 6 + (ctx.flying ? 2 : 0) : 0;
  const grudgePenalty = cook?.grudge ? 4 : 0;
  // fired on the sear: kissed by the pan. rushed off early: raw in the middle.
  const searBonus = t.sear === "golden" ? 8 : t.sear === "rushed" ? -6 : 0;
  // kissed by the edge: smouldering stations char beautifully and dangerously
  const edgeBonus = ctx.simmer ? 4 : 0;
  // the split sauce: whisked back (+6) or gone out broken (−8)
  const sauceBonus = t.sauce === "saved" ? 6 : t.sauce === "split" ? -8 : 0;
  // authored teaching ticket: the first split sauce arrives broken unless
  // the player has already asked for it to be remade
  const raw = t.lesson === "split-jus" && !t.requestedCorrection ? 85 : Math.max(
    5 + ctx.gear * 3,
    Math.min(
      100,
      38 +
        (cook?.skill ?? 0.5) * 30 +
        ((cook?.morale ?? 50) - 50) * 0.35 -
        chefPenalty -
        burnPenalty -
        grudgePenalty +
        faveBonus +
        marketBonus +
        searBonus +
        edgeBonus +
        sauceBonus +
        (rng() - 0.5) * 30
    )
  );
  const condition = conditionFromCooking(t.dish, raw, {
    sear: t.sear,
    sauce: t.lesson === "split-jus" && !t.requestedCorrection ? "split" : t.sauce,
    recipeFinish: t.recipeFinish,
    correction: t.requestedCorrection,
  });
  return { fumble: false, quality: qualityOfCondition(t.dish, condition), condition, edged: ctx.simmer };
}

let nextId = 1;
let feedId = 1;

interface GameState {
  phase: Phase;
  rng: () => number;
  /** night-1 opening: two actions teach serve → call → judge before pressure starts */
  openingStep: OpeningStep | null;
  tickets: Ticket[];
  guests: Guest[];
  cooks: Cook[];
  feed: FeedItem[];
  nextTicketIn: number;
  serviceTime: number;
  served: number;
  sentBack: number;
  smashed: number;
  complaints: number;
  misses: number;
  qualitySum: number;
  ego: number;
  screams: number;
  adrenalineTil: number;
  criticFlagged: boolean;
  criticSpotted: boolean;
  dessertDone: boolean;
  streak: number;
  bestStreak: number;
  /** streak-ceremony overlay: what the room just witnessed, and when */
  milestoneAt: number;
  milestoneText: string;
  /** coursing: last good-serve serviceTime per table — eat together (+6) */
  tableServeAt: Record<number, number>;
  /** BEEFCAKES' runner: approaching the rail until at, stealing unless shooed */
  runner: { at: number; steal: boolean; shooed: boolean; fled: boolean } | null;
  /** one table request at a time: FAST or EXTRA CHAR, D to refuse */
  request: ServiceRequest | null;
  /** split-sauce event on a plating ticket: WHISK (M) it back */
  sauce: { ticketId: number; until: number } | null;
  /** champagne comped mid-service: once, and the room exhales */
  comped: boolean;
  /** the Kid noticed the red eye (critic cam counterplay, N9) */
  kidNoticed: boolean;
  /** MADAME V nodded at the red eye (cam warmth, once) */
  madameNodded: boolean;
  /** the brigade is flying: announced once, favourites land harder */
  flyingAnnounced: boolean;
  /** on-demand key glossary overlay — modal: owns input and pauses service */
  glossary: boolean;
  /** whether closing the glossary releases the pause it took */
  glossaryResume: boolean;
  /** the critic's exit: head high (fed, spotted) or coat on (slipped away) */
  criticLeft: boolean;
  criticServeAt: number;
  screamAt: number;
  smashAt: number;
  chorusText: string;
  stampText: string;
  stampAt: number;
  paused: boolean;
  /** user preference: embodied first-person pass during service */
  firstPerson: boolean;
  /** what the centre of the screen is aimed at, for the reticle */
  aim: "fire" | "guest" | "ticket" | "station" | "ready" | "held" | "cooking" | null;
  rivalIdx: number;
  rivalAt: number; // serviceTime of last Beefcakes appearance
  rivalWarned: number; // rivalTimes index already warned about
  /** torn stub on the rail after a steal: what, from where, when */
  lastSteal: { table: number; dish: string; slot: number; at: number } | null;
  barkAt: number;
  criticAnnounced: boolean;
  criticServed: number;
  criticQ: number;
  /** cohesion: consecutive pristine Wellingtons — the trilogy the trade whispers about */
  wellingtonRun: number;
  /** platform: the trilogy fired tonight (achievement unlock at review) */
  trilogyTonight: boolean;
  /** folklore: one timed test at a time — fork, glass, coat, return, flash */
  folklore: { kind: "fork" | "glass" | "coat" | "return" | "flash"; table: number; until: number } | null;
  folkloreDone: boolean;
  /** the rail card the chef has aimed at: fire/collect target, never auto-picked */
  selectedTicketId: number | null;
  /** held-plate inspection: close camera, turn the plate */
  inspecting: boolean;
  /** plate turn angle while inspecting — drives held and world models */
  inspectionTurn: number;
  /** live sauce correction on the held plate; owns that plate until done */
  correction: { ticketId: number; startedAt: number; endsAt: number } | null;
  /** the last table run: what actually went out, for the delivery tray */
  lastDelivery: { id: number; at: number; table: number; plates: { dish: string; quality: number; condition?: DishCondition; recipeFinish?: RecipeFinish }[] } | null;
  /** bounded narrative history of this service — feeds the factual review */
  events: ServiceEvent[];
  /** how tonight's folklore test actually ended, kept even when history evicts it */
  folkloreOutcome: FolkloreOutcome | null;
  /** 101: turns served from the wobble table, whether it was moved mid-rush */
  table101Turns: number;
  moved101: boolean;
  review: Review | null;
  // --- career layer ---
  career: Career;
  feud: Feud | null;
  spawnMul: number;
  tellMul: number;
  nightTake: { covers: number; wages: number; breakage: number; net: number } | null;
  lots: Lot[];
  menuBuffs: number[]; // per-station quality bonus for tonight
  hasSave: boolean;
  canSave: boolean;
  /** why continuing is blocked (e.g. a save from a newer build) — shown on the title */
  saveIssue: string | null;
  start: () => void;
  /** one route in for mouse and keyboard: start/continue, or straight into night 1 */
  enterResidency: (options?: { fresh?: boolean; prep?: boolean }) => void;
  startService: () => void;
  continueNext: () => void;
  briefAction: (id: "drinks" | "gear" | "press") => void;
  meal: (i: number) => void;
  clout: (id: "champagne" | "dessert" | "door") => void;
  feudChoice: (i: number) => void;
  buyLot: (i: number, outbid: boolean) => void;
  chooseVow: (v: "star" | "house" | "brigade") => void;
  chooseMutator: (m: NonNullable<Career["mutator"]>) => void;
  coach: (id: number, kind: "praise" | "drill" | "rest") => void;
  setMenu: (featured: string, rested: string) => void;
  unlockCriticCam: () => void;
  chooseSeating: (k: "regulars" | "press" | "walkin") => void;
  answerFolklore: (ok: boolean) => void;
  move101: () => void;
  resetCareer: () => void;
  tick: (dt: number) => void;
  plateToPass: (id: number) => void;
  firePlate: (id?: number) => void;
  selectTicket: (id: number) => void;
  collectPlate: (id: number) => void;
  setInspecting: (value: boolean) => void;
  correctPlate: () => void;
  runTable: () => void;
  developWellington: (finish: RecipeFinish) => void;
  turnPlate: (delta: number) => void;
  eightySix: () => void;
  whisk: () => void;
  shooRunner: () => void;
  declineRequest: () => void;
  compTable: () => void;
  bet: (kind: "covers" | "walks" | "spot") => void;
  borrow: () => void;
  repay: () => void;
  judge: (v: Verdict, options?: { batch?: boolean }) => void;
  scream: (power?: number) => void;
  flagGuest: (id: number) => void;
  togglePause: () => void;
  toggleGlossary: () => void;
  /** platform: handshake, host pause/mute — safe anywhere, game never waits */
  initPlatform: () => void;
  toggleFirstPerson: () => void;
  setAim: (aim: GameState["aim"]) => void;
  smotherFire: (station: number) => void;
}

function pushFeed(feed: FeedItem[], text: string, kind: FeedItem["kind"], who?: string) {
  return [...feed.slice(-23), { id: feedId++, text, kind, who }];
}

const LEGENDS_KEY = "mem-legends";
export interface Legends {
  bestStreak: number;
  silentFives: number;
  covers: string[];
  residencies: number;
}
export function loadLegends(): Legends {
  try {
    const raw = localStorage.getItem(LEGENDS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { bestStreak: p.bestStreak ?? 0, silentFives: p.silentFives ?? 0, covers: Array.isArray(p.covers) ? p.covers : [], residencies: p.residencies ?? 0 };
    }
  } catch {}
  return { bestStreak: 0, silentFives: 0, covers: [], residencies: 0 };
}
function recordLegends(review: Review): void {
  try {
    const l = loadLegends();
    l.bestStreak = Math.max(l.bestStreak, review.bestStreak);
    if (review.silent && review.stars >= 5) l.silentFives += 1;
    if (review.cover && !l.covers.includes(review.cover)) l.covers.push(review.cover);
    localStorage.setItem(LEGENDS_KEY, JSON.stringify(l));
  } catch {}
}
/** the morning paper: last night's story, named once — the game says it remembered */
function morningPaperLine(review: Review): string {
  return `${review.headline} — ${review.consequence}`;
}
function spottedProvenance(stories: string[], persona: string): boolean {
  if (persona === "madameV" && stories.includes("lorna")) return true;
  if (persona === "kid" && stories.includes("layby")) return true;
  return false;
}

/** the opening's own ticket: a Wellington, honest and simple — no spawned variance */
function openingTicket(table: number, state: "rail" | "pass"): Ticket {
  const t: Ticket = { id: nextId++, dish: "Beef Wellington", table, station: 0, age: 0,
    state, plateAt: 0, plateDur: 0, byChef: false,
    quality: -1, verdict: null, sear: null, sauce: null };
  if (state === "pass") {
    // an honest first plate: raw 80 cooks to a pristine condition
    t.condition = conditionFromCooking(t.dish, 80, {});
    t.quality = qualityOfCondition(t.dish, t.condition);
    t.readyAt = 0;
  }
  return t;
}

/** the first real rush after the two teaching plates — authored, not spawned */
function authoredTicket(dishName: string, table: number, lesson?: "split-jus"): Ticket {
  const d = DISHES.find((x) => x.name === dishName)!;
  return { id: nextId++, dish: d.name, table, station: d.station, age: 0,
    state: "rail", plateAt: 0, plateDur: 0, byChef: false,
    quality: -1, verdict: null, sear: null, sauce: null, lesson };
}

function spawnTicket(rng: () => number, criticTable = -1, rested?: string | null): Ticket {
  const pool = rested ? DISHES.filter((x) => x.name !== rested) : DISHES;
  let d = pool[Math.floor(rng() * pool.length)];
  let table = 10 + Math.floor(rng() * 5);
  // the inspector always gets the signature dish — the Wellington. Of course.
  if (criticTable >= 0 && rng() < 0.3) {
    table = criticTable;
    d = DISHES.find((x) => x.name === "Beef Wellington")!;
  }
  return {
    id: nextId++,
    dish: d.name,
    table,
    station: d.station,
    age: 0,
    state: "rail",
    plateAt: 0,
    plateDur: 0,
    sear: null,
    sauce: null,
    byChef: false,
    quality: -1,
    verdict: null,
  };
}

function freshCareer(): Career {
  return { night: 1, cash: 120, stars: 0, venue: 0, gear: 0, defections: 0, aggro: 0 };
}

const SAVE_KEY = "mem-career";
const NEWER_SAVE_MESSAGE =
  "This residency was saved by a newer build. Open that build to continue; your saved progress is untouched.";

/** set when a save from a newer version is found: never overwritten, never downgraded */
let saveBlocked = false;

function saveCareer(career: Career, cooks: Cook[]) {
  if (saveBlocked) return;
  try {
    // transient mood/spikes never persist — they're tonight's weather, not history
    const stored = cooks.map(({ mood: _m, spikes: _sp, ...rest }) => rest);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, career, cooks: stored }));
  } catch {
    /* private mode etc. — career simply won't persist */
  }
}

function canPersist(): boolean {
  try {
    localStorage.setItem(SAVE_KEY + "-t", "1");
    localStorage.removeItem(SAVE_KEY + "-t");
    return true;
  } catch {
    return false;
  }
}

/** drop only malformed optional fields — the rest of the career is still good */
function cleanCareer(c: Career): Career {
  let out = c;
  const lr = out.lastReview;
  if (
    lr !== undefined &&
    !(
      typeof lr === "object" &&
      lr !== null &&
      typeof lr.night === "number" &&
      typeof lr.headline === "string" &&
      typeof lr.incident === "string" &&
      typeof lr.consequence === "string"
    )
  ) {
    const { lastReview, ...rest } = out;
    out = rest;
  }
  out = { ...out, recipeHistory: cleanRecipeHistory(out.recipeHistory).filter((e) => e.night <= out.night) };
  const help = out.lastSauceHelp;
  if (
    help !== undefined &&
    !(
      typeof help === "object" && help !== null &&
      Number.isInteger(help.night) && help.night >= 1 && help.night <= 9 &&
      typeof help.cookName === "string" && help.cookName.trim().length > 0 && help.cookName.length <= 24 &&
      typeof help.dish === "string" && help.dish.trim().length > 0 && help.dish.length <= 40
    )
  ) {
    const { lastSauceHelp, ...rest } = out;
    out = rest;
  }
  return out;
}

function loadSave(): { career: Career; cooks: Cook[] } | null {
  saveBlocked = false; // re-evaluate: a corrected supported save should load
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    // unversioned saves are version 0; anything newer than we wrote is not ours to touch
    const version = typeof p.version === "number" ? p.version : 0;
    if (version > 2) {
      saveBlocked = true;
      return null;
    }
    if (!p.career || !Array.isArray(p.cooks)) return null;
    return { career: cleanCareer(p.career), cooks: p.cooks };
  } catch {
    return null;
  }
}

type NightFields = "walkedOut" | "overloadT" | "burning" | "walkoutAt" | "smoked" | "mood" | "spikes";
function makeLots(night: number): Lot[] {
  const r = mulberry32(daySeed() + night * 31337);
  const pool = [...LOT_DECK];
  const lots: Lot[] = [];
  for (let i = 0; i < 3; i++) {
    const d = pool.splice(Math.floor(r() * pool.length), 1)[0];
    lots.push({ ...d, bought: false });
  }
  // Beefcakes shops the same market — guarantee a contested lot when one fits
  if (!lots.some((l) => l.contested)) {
    const extra = LOT_DECK.find((d) => d.contested && !lots.some((l) => l.name === d.name));
    if (extra) lots[Math.floor(r() * 3)] = { ...extra, bought: false };
  }
  return lots;
}

function withFreshNight(c: Omit<Cook, NightFields> & Partial<Pick<Cook, NightFields>>): Cook {
  return {
    ...c,
    walkedOut: false,
    overloadT: 0,
    burning: false,
    walkoutAt: -1,
    smoked: false,
    honoredUsed: false,
    mood: undefined, // tonight's weather, derived fresh each tick
    spikes: undefined,
    // memory persists across nights — grudges and favourites survive;
    // fresh blood arrives with the station default and nothing to forgive
    fave: c.fave ?? STATION_FAVE[c.station] ?? "Beef Wellington",
    grudge: c.grudge ?? null,
  };
}

/** old saves predate memory — teach them to hold a grudge */
function withMemory(c: Cook): Cook {
  return withFreshNight({
    ...c,
    fave: (c as Partial<Cook>).fave ?? STATION_FAVE[c.station] ?? "Beef Wellington",
    grudge: (c as Partial<Cook>).grudge ?? null,
  });
}

function makeFeud(career: Career, cooks: Cook[]): Feud | null {
  if (career.night <= 1) return null;
  // BEEFCAKES night: the price war across the street — one night, one choice, permanent fallout
  if (career.night === 5 && !career.beefcakesTruce) {
    const resolved = career.feudDone === career.night;
    return {
      text: BEEFCAKES_PRICEWAR,
      options: ["Détente: family meal for two kitchens (−£70, his runners stand down for good)", "Rivalry: undercut the undercutter (+heat, his runners double tonight)"],
      resolved,
      actor: "beefcakes",
      outcome: resolved ? career.feudOutcome : undefined,
    };
  }
  const def = FEUD_DECK[(career.night - 2) % FEUD_DECK.length];
  const weakest = cooks.reduce((a, b) => (a.skill < b.skill ? a : b), cooks[0]);
  const resolved = career.feudDone === career.night;
  return {
    text: def.text(weakest?.name ?? "your sous"),
    options: def.options,
    resolved,
    actor: def.actor,
    outcome: resolved ? career.feudOutcome : undefined,
  };
}

function venueFor(stars: number) {
  return stars >= 10 ? 2 : stars >= 5 ? 1 : 0;
}

/** 101 migrates up with the room: wobbly corner → window → center stage */
const ONE_OH_ONE_IDX = [4, 2, 0];
export function oneOhOneTable(career: Career): number {
  // N8+: no call is still a call — MARA & JUNE take 101 without being asked
  const seat = career.seating101 ?? (career.night >= 8 ? "regulars" : null);
  return seat ? 10 + ONE_OH_ONE_IDX[Math.min(2, career.venue)] : -1;
}

const bootSave = loadSave();

export const useGame = create<GameState>((set, get) => ({
  phase: "title",
  rng: () => Math.random(),
  tickets: [],
  guests: [],
  cooks: [],
  feed: [],
  openingStep: null,
  nextTicketIn: 2,
  serviceTime: 0,
  served: 0,
  sentBack: 0,
  smashed: 0,
  complaints: 0,
  misses: 0,
  qualitySum: 0,
  ego: 10,
  screams: 0,
  adrenalineTil: 0,
  criticFlagged: false,
  criticSpotted: false,
  dessertDone: false,
  streak: 0,
  bestStreak: 0,
  milestoneAt: 0,
  milestoneText: "",
  selectedTicketId: null,
  inspecting: false,
  inspectionTurn: 0,
  correction: null,
  lastDelivery: null,
  tableServeAt: {},
  runner: null,
  request: null,
  sauce: null,
  comped: false,
  kidNoticed: false,
  madameNodded: false,
  flyingAnnounced: false,
  glossary: false,
  glossaryResume: false,
  criticLeft: false,
  criticServeAt: -1,
  screamAt: 0,
  smashAt: 0,
  chorusText: `"YES, CHEF!"`,
  stampText: "",
  stampAt: 0,
  paused: false,
  firstPerson: true,
  aim: null,
  rivalIdx: 0,
  rivalAt: -10,
  rivalWarned: -1,
  lastSteal: null,
  barkAt: 16,
  criticAnnounced: false,
  criticServed: 0,
  criticQ: 0,
  wellingtonRun: 0,
  trilogyTonight: false,
  folklore: null,
  folkloreDone: false,
  table101Turns: 0,
  moved101: false,
  review: null,
  career: bootSave?.career ?? freshCareer(),
  events: [],
  folkloreOutcome: null,
  feud: null,
  spawnMul: 1,
  tellMul: 1,
  nightTake: null,
  lots: [],
  menuBuffs: [0, 0, 0],
  hasSave: !!bootSave,
  canSave: !saveBlocked && canPersist(),
  saveIssue: saveBlocked ? NEWER_SAVE_MESSAGE : null,

  start: () => {
    unlockAudio();
    const saved = loadSave();
    if (!saved && saveBlocked) {
      // a save from a newer version exists — refuse to touch it rather than downgrade
      set({ hasSave: false, canSave: false, saveIssue: NEWER_SAVE_MESSAGE });
      return;
    }
    if (saved) {
      const cooks = saved.cooks.map(withMemory);
      const career = saved.career;
      set({
        phase: career.night > MAX_NIGHTS ? "ending" : "briefing",
        career,
        cooks,
        feud: makeFeud(career, cooks),
        lots: makeLots(career.night),
        menuBuffs: [0, 0, 0],
        hasSave: true,
        canSave: canPersist(),
        saveIssue: null,
        selectedTicketId: null,
        inspecting: false,
        correction: null,
        lastDelivery: null,
        feed: [],
      });
      return;
    }
    get().resetCareer();
  },

  enterResidency: ({ fresh = false, prep = false } = {}) => {
    const before = get();
    if (before.phase !== "title" && before.phase !== "ending") return;
    if (fresh) get().resetCareer(); else get().start();
    const s = get();
    if (!s.saveIssue && !prep && s.phase === "briefing" && s.career.night === 1) s.startService();
  },

  resetCareer: () => {
    unlockAudio();
    // detect a newer-version envelope even if it was written after boot —
    // never delete progress we can't read
    loadSave();
    if (saveBlocked) {
      set({ hasSave: false, canSave: false, saveIssue: NEWER_SAVE_MESSAGE });
      return;
    }
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    const career = freshCareer();
    const cooks = COOK_ROSTER.map((c, i) =>
      withFreshNight({ ...c, id: i, morale: 70, trauma: 0, grudge: null, smoked: false })
    );
    set({
      phase: "briefing",
      career,
      cooks,
      feud: null,
      hasSave: false,
      canSave: canPersist(),
      saveIssue: null,
      openingStep: null,
      selectedTicketId: null,
      inspecting: false,
      inspectionTurn: 0,
      correction: null,
      lastDelivery: null,
      glossary: false,
      glossaryResume: false,
      ego: 10,
      screams: 0,
      events: [],
      folkloreOutcome: null,
      feed: [{ id: feedId++, text: `Night 1 — ${VENUES[0].name}. ${VENUES[0].sub}.`, kind: "info" }, { id: feedId++, text: "You're the chef because you're the only one who came back.", kind: "drama" as const }],
      review: null,
      nightTake: null,
      lots: makeLots(1),
      menuBuffs: [0, 0, 0],
    });
  },

  startService: () => {
    unlockAudio();
    const s = get();
    if (s.phase !== "briefing" || s.saveIssue) return;
    const career = s.career;
    const v = VENUES[career.venue];
    const rng = mulberry32(daySeed() + career.night * 104729);
    const criticId = Math.floor(rng() * 5);
    // teaching order, not rotation: GILLIAM N1–5 (noise), MADAME V N6–8 (fork), KID N9 (graduation).
    // The night's intended critic always overrides a stale saved persona.
    const persona = criticForNight(career.night);
    // one critic, one press, one regulars, one couple, one walk-in — the
    // dining room reads back at the pass instead of five identical tables
    const kinds: GuestKind[] = ["press", "regulars", "couple", "walkin"];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    const guests: Guest[] = [];
    // dessert on the house: the regulars forgive twice tonight
    const sweetNight = (career.dessertNight ?? -1) === career.night;
    // maitre-d': seating101 forces that party to 101 — which migrates up with the room
    const seat101 = career.seating101 ?? (career.night >= 8 ? "regulars" : null);
    const hundredOne = seat101 ? ONE_OH_ONE_IDX[Math.min(2, career.venue)] : -1;
    let ki = 0;
    for (let i = 0; i < 5; i++) {
      const isCritic = i === criticId;
      let kind: GuestKind = isCritic ? "critic" : kinds[ki++];
      // 101's table migrates with the venue (unless it's the critic's table)
      if (i === hundredOne && seat101 && !isCritic) kind = seat101;
      const base =
        kind === "critic" ? 7 + rng() * 6
        : kind === "press" ? 20 + rng() * 15
        : kind === "couple" ? 25 + rng() * 30
        : kind === "regulars" ? 45 + rng() * 30
        : 60 + rng() * 50;
      guests.push({
        id: i,
        table: 10 + i,
        isCritic,
        kind,
        tellClock: base * v.tellMul,
        tells: 0,
        mercy: kind === "regulars" ? (sweetNight || (career.regularsPermanent ?? false) ? 2 : 1) : 0,
        tellAt: -1,
        tellKind: null,
      });
    }
    nextId = 1;
    feedId = 1;
    const careerNext = { ...career, criticPersona: persona };
    // N1 opening: one honest plate, one serve, one call — the room waits while you learn
    const coldOpen = career.night === 1;
    const regularsTable = guests.find((g) => g.kind === "regulars")?.table ?? guests.find((g) => !g.isCritic)?.table ?? 10;
    const opening: Ticket[] = coldOpen ? [openingTicket(regularsTable, "pass")] : [];
    // a developed Wellington walks on first: the new recipe is a promise, not a bonus
    const recipe = !coldOpen ? currentWellingtonRecipe(career.recipeHistory) : null;
    if (recipe) opening.push(authoredTicket("Beef Wellington", regularsTable));
    saveCareer(careerNext, s.cooks);
    set({
      phase: "service",
      rng,
      guests,
      career: careerNext,
      spawnMul: v.spawnMul,
      tellMul: v.tellMul,
      // cooks persist across nights — they rest a little, they don't forget
      cooks: s.cooks.map((c) => withFreshNight({ ...c, morale: Math.min(85, c.morale + 20) })),
      tickets: opening,
      feed: coldOpen
        ? [{ id: feedId++, text: "Service, chef.", kind: "info" as const, who: "PETRA" }]
        : [
        { id: feedId++, text: `Night ${career.night} — ${v.name}. ${v.sub}.`, kind: "drama" },
        { id: feedId++, text: CRITICS[persona].introduction, kind: "drama" },
        ...(career.vow ? [{ id: feedId++, text: VOW_LINES[career.vow], kind: "drama" as const }] : []),
        ...(career.mutator === "double_runners" ? [{ id: feedId++, text: "HOUSE RULE: DOUBLE SHIFT — his runners come doubled.", kind: "drama" as const }] : []),
        ...(career.mutator === "no_bin" ? [{ id: feedId++, text: "HOUSE RULE: NO BIN — everything gets cooked.", kind: "info" as const }] : []),
        ...(career.mutator === "short_fuse" ? [{ id: feedId++, text: "HOUSE RULE: SHORT FUSE — tables walk faster. Move.", kind: "drama" as const }] : []),
        ...(seat101 ? [{ id: feedId++, text: TABLE101_SEAT[Math.min(2, career.venue)], kind: "info" as const }] : []),
        ...(career.regularsPermanent ? [{ id: feedId++, text: PERMANENT_101, kind: "good" as const }] : []),
        ...(career.beefcakesTruce ? [{ id: feedId++, text: "Across the street, BEEFCAKES plates quietly. The truce holds.", kind: "info" as const }] : []),
        { id: feedId++, text: "Doors open. Somewhere out there is the inspector.", kind: "info" },
        ...((s.career.debt ?? 0) > 0
          ? [{ id: feedId++, text: pick(rng, VAN_REMINDER), kind: "drama" as const }]
          : []),
        ...(s.career.silentLast
          ? [{ id: feedId++, text: "The press remembers last night: nobody raised their voice. They're listening for it.", kind: "info" as const, who: "THE PRESS" }]
          : []),
        ...(recipe
          ? [{ id: feedId++, text: `${recipe.contributor}'s ${WELLINGTON_FINISHES[recipe.finish].name.toLowerCase()} is on tonight.`, kind: "good" as const }]
          : []),
      ],
      nextTicketIn: coldOpen ? 4 : 1.5,
      openingStep: coldOpen ? "serve" : null,
      selectedTicketId: null,
      inspecting: false,
      inspectionTurn: 0,
      correction: null,
      lastDelivery: null,
      firstPerson: coldOpen ? false : s.firstPerson,
      serviceTime: 0,
      served: 0,
      sentBack: 0,
      smashed: 0,
      complaints: 0,
      misses: 0,
      qualitySum: 0,
      ego: 10,
      screams: 0,
      adrenalineTil: 0,
      criticFlagged: false,
      criticSpotted: false,
      dessertDone: false,
      streak: 0,
      bestStreak: 0,
      milestoneAt: 0,
      milestoneText: "",
      tableServeAt: {},
      runner: null,
      request: null,
      sauce: null,
      comped: false,
      kidNoticed: false,
      madameNodded: false,
      flyingAnnounced: false,
      glossary: false,
      glossaryResume: false,
      criticLeft: false,
      criticServeAt: -1,
      chorusText: `"YES, CHEF!"`,
      stampText: "",
      stampAt: 0,
      paused: false,
      rivalIdx: 0,
      rivalAt: -10,
      rivalWarned: -1,
      lastSteal: null,
      barkAt: coldOpen ? 8 + rng() * 6 : 16 + rng() * 10,
      criticAnnounced: false,
      criticServed: 0,
      criticQ: 0,
      wellingtonRun: 0,
      trilogyTonight: false,
      folklore: null,
      folkloreDone: false,
      events: [],
      folkloreOutcome: null,
      table101Turns: 0,
      moved101: false,
      review: null,
    });
  },

  continueNext: () => {
    const s = get();
    if (s.phase !== "review" || !s.review) return;
    const v = VENUES[s.career.venue];
    const c = s.career;
    recordLegends(s.review);
    const betCash = s.review.betCash ?? 0;
    // the man with the van collects when the residency ends — off the top, no arguments
    const lastNight = c.night + 1 > MAX_NIGHTS;
    const debtTake = lastNight ? (c.debt ?? 0) : 0;
    const walkoutCount = s.cooks.filter((k) => k.walkedOut).length;
    const acc = nightAccounts({
      covers: s.served,
      price: v.price,
      walkedOut: walkoutCount,
      cooks: s.cooks.length,
      smashed: s.smashed,
      betCash,
      cash: c.cash,
      debtTake,
    });
    const { covers, wages, breakage, net } = acc;
    // vow rewards: star +1 career star if held, brigade trauma −1, house regulars permanent
    let vowBonusStar = 0;
    if (c.vow === "star" && s.review.vowLine?.includes("HELD")) vowBonusStar = 1;
    const career: Career = {
      ...c,
      night: c.night + 1,
      cash: acc.nextCash,
      stars: c.stars + s.review.stars + vowBonusStar,
      totalEgo: (c.totalEgo ?? 0) + s.review.ego,
      bet: undefined,
      vow: undefined,
      seating101: undefined,
      featuredDish: undefined,
      restedDish: undefined,
      stories: [],
      regularsPermanent: (c.regularsPermanent ?? false) || (c.vow === "house" && (s.review.vowLine?.includes("HELD") ?? false)),
      covers: [...(c.covers ?? []), ...(s.review.cover && !(c.covers ?? []).includes(s.review.cover) ? [s.review.cover] : [])],
      beefcakesWar: undefined,
      criticGrudge: (c.criticGrudge ?? 0) + (s.review.stars <= 2 ? 1 : 0),
      // the press has a memory: last night's silence follows you into the next briefing
      silentLast: s.review.silent,
      // the night, on the record — the next briefing reads it back
      lastReview: {
        night: c.night,
        headline: s.review.headline ?? "SERVICE, ON THE RECORD",
        incident: s.review.incident,
        consequence: s.review.consequence,
      },
    };
    const oldVenue = c.venue;
    career.venue = venueFor(career.stars);
    if (career.venue > oldVenue) career.venueUpNight = career.night;
    const brigadeHeld = c.vow === "brigade" && s.review.vowLine?.includes("HELD");
    const cooks = s.cooks.map((k) => ({
      ...k,
      walkedOut: false,
      trauma: Math.max(0, k.trauma + (k.walkedOut ? 1 : 0) - (brigadeHeld ? 1 : 0)),
    }));
    const nightTake = { covers, wages, breakage, net };
    saveCareer(career, cooks);
    const done = career.night > MAX_NIGHTS || career.cash < -60;
    if (done) {
      // platform: the residency's line in the books — best totals, legend, event
      const won = career.stars >= 10;
      submitBoard("run_stars", career.stars);
      trackEvent("run_completed", { score: career.stars, result: won ? "stars" : "broke" });
      if (won && (career.totalEgo ?? 0) >= 200) unlockAch("house_legend");
    }
    if (done) {
      try {
        const l = loadLegends();
        localStorage.setItem(LEGENDS_KEY, JSON.stringify({ ...l, residencies: l.residencies + 1 }));
      } catch {}
    }
    set({
      phase: done ? "ending" : "briefing",
      career,
      cooks,
      nightTake,
      feud: done ? null : makeFeud(career, cooks),
      lots: done ? [] : makeLots(career.night),
      menuBuffs: [0, 0, 0],
      feed: pushFeed(s.feed, morningPaperLine(s.review), "info"),
    });
  },

  briefAction: (id) => {
    const s = get();
    if (s.phase !== "briefing") return;
    const c = s.career;
    if (id === "drinks" && c.cash >= 40) {
      set({
        career: { ...c, cash: c.cash - 40 },
        cooks: s.cooks.map((k) => ({ ...k, morale: Math.min(100, k.morale + 25) })),
      });
    } else if (id === "gear" && c.cash >= 80 && c.gear < 3) {
      set({ career: { ...c, cash: c.cash - 80, gear: c.gear + 1 } });
    } else if (id === "press" && c.cash >= 60) {
      set({
        career: { ...c, cash: c.cash - 60, aggro: Math.max(0, c.aggro - 1) },
        cooks: s.cooks.map((k) => ({ ...k, morale: Math.min(100, k.morale + 5) })),
      });
    }
  },

  meal: (i) => {
    const s = get();
    if (s.phase !== "briefing") return;
    if ((s.career.mealNight ?? -1) >= s.career.night) return; // one meal a night
    unlockAudio();
    // the family meal remembers: last night's smashed dish comes back as hash, eaten over the bin
    const base = MEALS[(s.career.night - 1) % MEALS.length];
    const haunted = s.career.lastSmashed;
    const dish = haunted ? `${base} — mostly ${haunted}, reborn` : base;
    const rng = s.rng;
    let cooks = s.cooks.map((k) => ({ ...k }));
    let line: string;
    if (i === 0) {
      // praise: everybody stands taller, nobody lets go
      cooks = cooks.map((k) => ({ ...k, morale: Math.min(100, k.morale + 12), grudge: null }));
      line = `Family meal — ${dish}. You tell them they're the best kitchen you'll ever run. They almost believe you.`;
    } else if (i === 1) {
      // the crispy bit goes to whoever needs it most
      const low = cooks.reduce((a, b) => (a.morale <= b.morale ? a : b), cooks[0]);
      cooks = cooks.map((k) =>
        k === low
          ? { ...k, morale: Math.min(100, k.morale + 25), grudge: null }
          : { ...k, morale: Math.min(100, k.morale + 6), grudge: null }
      );
      line = `Family meal — ${dish}. The crispy bit goes to ${low?.name ?? "nobody"}. The table forgives everything.`;
    } else {
      // silence: yesterday's dead are buried, not discussed
      cooks = cooks.map((k) => ({
        ...k,
        morale: Math.min(100, k.morale + 6),
        trauma: Math.max(0, k.trauma - (k.walkedOut || k.trauma > 0 ? 1 : 0)),
        grudge: null,
      }));
      line = `Family meal — ${dish}. Eaten standing up, in silence. Yesterday stays yesterday.`;
    }
    const witness = cooks[Math.floor(rng() * cooks.length)];
    // the technique inside the joke: one true clause, in a cook's voice
    const craft = FAMILY_CRAFT[(s.career.night - 1) % FAMILY_CRAFT.length];
    sfx("applause", { vol: 0.5 });
    set({
      career: { ...s.career, mealNight: s.career.night },
      cooks,
      feed: pushFeed(
        pushFeed(
          pushFeed(s.feed, line, "good", "THE TABLE"),
          pick(rng, FAMILY_LINES).replace("{N}", witness?.name ?? "The commis"),
          "info",
          witness?.name
        ),
        craft,
        "info",
        witness?.name
      ),
    });
  },

  feudChoice: (i) => {
    const s = get();
    if (s.phase !== "briefing" || !s.feud || s.feud.resolved) return;
    const idx = (s.career.night - 2) % FEUD_DECK.length;
    const c = { ...s.career };
    let cooks = s.cooks.map((k) => ({ ...k }));
    let outcome: string;
    if (s.career.night === 5) {
      // BEEFCAKES night: détente ends the war, rivalry doubles tonight's runners
      if (i === 0) {
        if (c.cash < 70) return;
        c.cash -= 70;
        c.beefcakesTruce = true;
        outcome = "Family meal for two kitchens. His runners stand down — for good. The truce holds.";
      } else {
        c.aggro += 2;
        c.beefcakesWar = true;
        outcome = "You undercut the undercutter. Tonight his runners come doubled. Bring a broom.";
      }
    } else if (idx === 0) {
      // poach attempt on the weakest cook
      if (i === 0) {
        if (c.cash < 90) return;
        c.cash -= 90;
        outcome = "You matched it, crumpled napkin and all. Nobody leaves tonight.";
      } else {
        const weakest = cooks.reduce((a, b) => (a.skill < b.skill ? a : b));
        const j = cooks.indexOf(weakest);
        const name = NEW_BLOOD[(c.defections + c.night) % NEW_BLOOD.length];
        cooks[j] = withFreshNight({
          ...weakest,
          name,
          skill: 0.35 + Math.random() * 0.3,
          morale: 70,
          trauma: 0,
          grudge: null,
          fave: STATION_FAVE[weakest.station] ?? "Beef Wellington",
        });
        c.defections += 1;
        c.aggro += 1;
        outcome = `${weakest.name} defected to the protein people. ${name} starts tonight.`;
      }
    } else if (idx === 1) {
      if (i === 0) {
        c.aggro += 1;
        outcome = "They printed it. He read it twice, then framed it.";
      } else {
        cooks = cooks.map((k) => ({ ...k, morale: Math.min(100, k.morale + 10) }));
        outcome = "Classy. The kitchen noticed you took the high road.";
      }
    } else if (idx === 2) {
      if (i === 0) {
        if (c.cash < 50) return;
        c.cash -= 50;
        cooks = cooks.map((k) => ({ ...k, morale: Math.min(100, k.morale + 12) }));
        outcome = "Best fish you've served all week. Morally flexible.";
      } else {
        outcome = "Your conscience is fed. Nothing else is.";
      }
    } else {
      if (i === 0) {
        if (c.cash < 70) return;
        c.cash -= 70;
        c.aggro = Math.max(0, c.aggro - 1);
        outcome = "The pitches are yours again. Petty. Effective.";
      } else {
        c.aggro += 2;
        outcome = "He's circling. Two runners spotted near your bins.";
      }
    }
    c.feudDone = c.night;
    c.feudOutcome = outcome;
    saveCareer(c, cooks);
    set({
      career: c,
      cooks,
      feud: { ...s.feud, resolved: true, outcome },
    });
  },

  buyLot: (i, outbid) => {
    const s = get();
    if (s.phase !== "briefing") return;
    const lot = s.lots[i];
    if (!lot || lot.bought) return;
    if (lot.contested && !outbid) {
      set({
        lots: s.lots.map((l, j) => (j === i ? { ...l, bought: true } : l)),
        feed: pushFeed(s.feed, `BEEFCAKES took the ${lot.name}. His protein bowls get shinier.`, "bad"),
      });
      return;
    }
    const price = lot.contested ? lot.cost + 20 : lot.cost;
    if (s.career.cash < price) return;
    const c = { ...s.career, cash: s.career.cash - price, stories: [...(s.career.stories ?? [])] };
    if (lot.contested) {
      c.aggro += 1;
      c.outbidBeefcakes = true;
    }
    if (lot.storyTag && !c.stories!.includes(lot.storyTag)) c.stories!.push(lot.storyTag);
    if (lot.risk && !c.stories!.includes("risky")) c.stories!.push("risky");
    const menuBuffs = [...s.menuBuffs];
    if (lot.station < 0) menuBuffs.forEach((_, k) => (menuBuffs[k] += lot.qBonus));
    else menuBuffs[lot.station] += lot.qBonus;
    saveCareer(c, s.cooks);
    set({
      career: c,
      menuBuffs,
      lots: s.lots.map((l, j) => (j === i ? { ...l, bought: true } : l)),
      feed: pushFeed(
        pushFeed(
          s.feed,
          lot.contested
            ? `You outbid BEEFCAKES for the ${lot.name}. He watched you take it home.`
            : `Bought the ${lot.name}. Tonight eats better.`,
          "good"
        ),
        lot.name === "Yesterday's fish" ? FISH_JOKE : `The walk-in smells like ${lot.name.toLowerCase()}. Money well spent.`,
        "info"
      ),
    });
  },

  chooseVow: (v) => {
    const s = get();
    if (s.phase !== "briefing" || s.career.vow || s.career.night < 8) return;
    const career = { ...s.career, vow: v };
    saveCareer(career, s.cooks);
    set({ career, feed: pushFeed(s.feed, VOW_LINES[v], "drama") });
  },

  chooseMutator: (m) => {
    const s = get();
    if (s.phase !== "briefing" || s.career.night !== 1 || s.career.mutator) return;
    const career = { ...s.career, mutator: m };
    saveCareer(career, s.cooks);
    const line =
      m === "double_runners"
        ? "HOUSE RULE: DOUBLE SHIFT — BEEFCAKES doubles his runners all residency. Bring a broom."
        : m === "no_bin"
          ? "HOUSE RULE: NO BIN — 86 is off all residency. Cook everything."
          : "HOUSE RULE: SHORT FUSE — tickets walk 20% faster all residency. Streaks still pay.";
    set({ career, feed: pushFeed(s.feed, line, "drama") });
  },

  unlockCriticCam: () => {
    const s = get();
    if (s.career.criticCam) return;
    const career = { ...s.career, criticCam: true };
    saveCareer(career, s.cooks);
    set({ career });
  },

  setMenu: (featured, rested) => {
    const s = get();
    if (s.phase !== "briefing" || (s.career.menuNight ?? -1) >= s.career.night) return;
    if (s.career.night < 3 || featured === rested) return;
    const career = { ...s.career, featuredDish: featured, restedDish: rested, menuNight: s.career.night };
    saveCareer(career, s.cooks);
    set({ career, feed: pushFeed(pushFeed(s.feed, `Tonight's feature: ${featured}. It sings (+6).`, "good"), `${rested} rests. The rail won't see it tonight.`, "info") });
  },

  coach: (id, kind) => {
    const s = get();
    if (s.phase !== "briefing" || (s.career.coachNight ?? -1) >= s.career.night) return;
    if (s.career.night < 2) return;
    const cooks = s.cooks.map((k) => ({ ...k }));
    const c = cooks.find((k) => k.id === id);
    if (!c || c.walkedOut) return;
    let line: string;
    let pc: Record<number, number> | undefined;
    if (kind === "praise") {
      c.morale = Math.min(100, c.morale + 10);
      c.grudge = null;
      // cooks remember: twice praised earns a name moment and a keepsake
      pc = { ...(s.career.praiseCount ?? {}) };
      pc[c.id] = (pc[c.id] ?? 0) + 1;
      if (pc[c.id] >= 2 && !c.honored) {
        c.honored = true;
        line = HONOR_LINES[Math.min(2, c.station)] + ` (${c.name} will remember this.)`;
      } else {
        line = `You pull ${c.name} aside: that ${c.fave} last night — cook like that every night. They stand taller.`;
      }
    } else if (kind === "drill") {
      c.skill = Math.min(0.95, c.skill + 0.03);
      c.morale = Math.max(0, c.morale - 8);
      if (s.rng() < 0.25 && !c.grudge) c.grudge = "drilled";
      line = `Drill: ${c.name} runs ${c.fave} three times before doors. Faster. Angrier. Better?`;
    } else {
      c.morale = Math.min(100, c.morale + 5);
      c.trauma = Math.max(0, c.trauma - (c.walkedOut || c.trauma > 0 ? 1 : 0));
      c.skill = Math.max(0.3, c.skill - 0.005);
      line = `${c.name} sits out prep, ices their wrists. Old scars fade a little. The knife stays sharp enough.`;
    }
    const career = { ...s.career, coachNight: s.career.night, ...(pc ? { praiseCount: pc } : null) };
    saveCareer(career, cooks);
    set({ career, cooks, feed: pushFeed(s.feed, line, kind === "drill" ? "drama" : "good", c.name) });
  },

  chooseSeating: (k) => {
    const s = get();
    if (s.phase !== "briefing" || s.career.seating101 || s.career.night < 7) return;
    const career = { ...s.career, seating101: k };
    saveCareer(career, s.cooks);
    set({ career, feed: pushFeed(pushFeed(s.feed, SEATING_LINES[k], "info"), TABLE101_SEAT[Math.min(2, s.career.venue)], "drama") });
  },

  answerFolklore: (ok) => {
    const s = get();
    if (s.phase !== "service" || s.paused || !s.folklore) return;
    const f = s.folklore;
    // the flash test's only right answer is doing nothing — expiry resolves it
    if (f.kind === "flash") return;
    let feed = s.feed;
    let criticQ = s.criticQ;
    const criticTable = s.guests.find((g) => g.isCritic)?.table;
    if (f.kind === "fork") {
      if (ok) {
        feed = pushFeed(feed, FOLKLORE_FORK_SAVED.replace("{T}", String(f.table)), "good");
        if (f.table === criticTable) criticQ += 15;
        sfx("bell", { pan: tablePan(f.table) });
      } else {
        feed = pushFeed(feed, FOLKLORE_FORK_IGNORED, "bad");
        if (f.table === criticTable) criticQ -= 20;
        sfx("gasp", { pan: tablePan(f.table) });
      }
    } else if (f.kind === "glass") {
      if (ok) {
        feed = pushFeed(feed, FOLKLORE_GLASS_SAVED.replace("{T}", String(f.table)), "good");
        if (f.table === criticTable) criticQ += 8;
        sfx("bell", { pan: tablePan(f.table) });
      }
    } else if (f.kind === "coat") {
      if (ok) {
        feed = pushFeed(feed, FOLKLORE_COAT_SAVED.replace("{T}", String(f.table)), "good");
        if (f.table === criticTable) criticQ += 8;
        sfx("bell", { pan: tablePan(f.table) });
      }
    } else if (f.kind === "return") {
      if (ok) {
        feed = pushFeed(feed, `Table ${f.table} wanted grace — you gave it. The press writes it down.`, "good");
      } else {
        feed = pushFeed(feed, `Table ${f.table} gets re-fired, on the house. The pass eats the cost.`, "info");
      }
    }
    // flash: correct answer is nothing — handled by expiry
    const result: FolkloreOutcome["result"] =
      f.kind === "return" ? (ok ? "answered" : "refired") : ok ? "answered" : "ignored";
    const outcome: FolkloreOutcome = { kind: "folklore", at: s.serviceTime, test: f.kind, result, table: f.table };
    set({
      folklore: null,
      folkloreDone: true,
      feed,
      criticQ,
      folkloreOutcome: outcome,
      events: appendServiceEvent(s.events, outcome),
    });
  },    move101: () => {
    const s = get();
    if (s.phase !== "service" || s.moved101 || s.career.night < 7) return;
    sfx("slam");
    const t101 = oneOhOneTable(s.career);
    set({
      moved101: true,
      ego: s.ego + 1,
      feed: pushFeed(s.feed, TABLE101_MOVE, "good"),
      tickets: s.tickets.map((t) => (t.state === "rail" && t.table === t101 ? { ...t, age: Math.max(0, t.age - 12) } : t)),
    });
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "service" || s.paused) return;
    const serviceTime = s.serviceTime + dt;
    const rng = s.rng;
    const criticTable = s.guests.find((g) => g.isCritic)?.table ?? -1;
    let {
      feed, ego, complaints, misses, served, qualitySum, streak, bestStreak,
      barkAt, rivalIdx, criticAnnounced,
    } = s;
    let flyingAnnounced = s.flyingAnnounced;
    let career = s.career;
    const liveEarly = s.cooks.filter((c) => !c.walkedOut);
    const flying = liveEarly.length > 0 && liveEarly.reduce((t, c) => t + c.morale, 0) / liveEarly.length > 80 && streak >= 5;
    let nextTicketIn = s.nextTicketIn - dt;
    let dessertDone = s.dessertDone;
    let sauce = s.sauce;
    let request = s.request;
    let runner = s.runner;
    let events = s.events;
    let folkloreOutcome = s.folkloreOutcome;

    // --- the opening: nothing expires and nothing spawns until both plates teach
    // their lesson; only the cooking clock moves ---
    if (s.openingStep) {
      const t = s.tickets.find((t) => t.state === "plating");
      if (!t) return; // waits for the player's action, without eating service time
      const serviceTime2 = Math.min(s.serviceTime + dt, t.plateAt);
      const elapsed = serviceTime2 - s.serviceTime;
      const ready = serviceTime2 >= t.plateAt;
      // an honest second plate: raw 76 cooks to a good, not pristine, condition
      const second = ready ? conditionFromCooking(t.dish, 76, { recipeFinish: t.recipeFinish }) : undefined;
      set({
        serviceTime: serviceTime2,
        tickets: s.tickets.map((x) =>
          x.id === t.id
            ? { ...x, age: x.age + elapsed, state: ready ? "pass" : "plating",
                quality: ready && second ? qualityOfCondition(t.dish, second) : x.quality,
                condition: ready ? second : x.condition,
                readyAt: ready ? t.plateAt : x.readyAt }
            : x
        ),
        feed: ready ? pushFeed([], "Order up.", "info", "PETRA") : s.feed,
      });
      if (ready) sfx("bell");
      return;
    }

    // --- tickets: expire first, then age, finish plating, cool ready food ---
    const tickets: Ticket[] = [];
    const expiredIds = new Set<number>();
    let correction = s.correction;
    let selectedTicketId = s.selectedTicketId;
    let inspecting = s.inspecting;
    for (const t of s.tickets) {
      if (t.state === "done") continue;
      const age = t.age + dt;
      // expiry first: a plate cannot outrun its table by finishing on the tick it dies
      const harsh101 = s.career.night >= 7;
      const t101ttl = oneOhOneTable(s.career);
      const baseTtl = t101ttl >= 0 && t.table === t101ttl && harsh101 ? (s.moved101 ? TICKET_TTL : 45) : TICKET_TTL;
      const ttl = s.career.mutator === "short_fuse" ? baseTtl * 0.8 : baseTtl;
      if (age > ttl) {
        expiredIds.add(t.id);
        // the regulars forgive — twice on dessert-on-the-house nights
        const regular = s.guests.find((gg) => gg.table === t.table && gg.kind === "regulars" && gg.mercy > 0);
        if (regular) {
          regular.mercy -= 1;
          feed = pushFeed(feed, REGULARS_FORGIVE, "good", "THE REGULARS");
          continue;
        }
        feed = pushFeed(feed, t.table === 14 ? `Table 101 walks — ${t.dish} never came. The wobble wins.` : `Table ${t.table} walks — ${t.dish} never came.`, "bad");
        sfx("gasp", { pan: tablePan(t.table) });
        misses += 1;
        streak = 0;
        continue;
      }
      if (t.state === "plating" && !t.byChef && s.cooks[t.station]?.walkedOut) {
        // no ghost cooks: work their station abandoned goes back on the rail
        feed = pushFeed(feed, `${s.cooks[t.station].name} is gone — the ${t.dish} goes back on the rail.`, "info");
        tickets.push({ ...t, state: "rail", age, quality: -1, plateAt: 0, plateDur: 0, sear: null, condition: undefined, readyAt: undefined });
        continue;
      }
      if (t.state === "plating" && serviceTime >= t.plateAt) {
        // the ready slot is occupied: the plate waits at plating until it frees,
        // keeping its original plateAt so cooling time isn't refunded
        if (
          tickets.some((x) => x.station === t.station && x.state === "ready") ||
          s.tickets.some((x) => x.id !== t.id && x.station === t.station && x.state === "ready")
        ) {
          tickets.push({ ...t, age });
          continue;
        }
        const cook = s.cooks.find((c) => c.station === t.station);
        // a live unrescued sauce interrupt goes out split — plating early does not erase it
        const sauceSplit = sauce?.ticketId === t.id;
        const res = finishPlating(sauceSplit ? { ...t, sauce: "split" } : t, age, cook, {
          rng,
          menuBuffs: s.menuBuffs,
          gear: s.career.gear,
          criticTable,
          champagne: (s.career.champagneNight ?? -1) === s.career.night,
          simmer: !!cook && !cook.walkedOut && !cook.burning && cook.overloadT > 5,
          flying,
        });
        if (sauce?.ticketId === t.id) sauce = null; // plated out from under it
        if (res.fumble && cook) {
          if (cook.honored && !cook.honoredUsed && cook.station === 0) {
            // PETRA's keepsake: caught mid-air, bare hands
            cook.honoredUsed = true;
            cook.spikes = { ...cook.spikes, reliefAt: serviceTime };
            feed = pushFeed(feed, `${cook.name} catches the ${t.dish} mid-air. Bare hands. The pass applauds. (keepsake spent)`, "good", cook.name);
            events = appendServiceEvent(events, { kind: "rescue", at: serviceTime, cookId: cook.id, cookName: cook.name, action: "catch", dish: t.dish });
            sfx("bell");
            const kept = coolCondition(t.dish, conditionFromCooking(t.dish, 60, { recipeFinish: t.recipeFinish, sauce: t.sauce }), serviceTime - t.plateAt);
            tickets.push({ ...t, age, state: "ready", readyAt: t.plateAt, quality: qualityOfCondition(t.dish, kept), condition: kept });
            continue;
          }
          feed = pushFeed(feed, `${cook.name} fumbles the ${t.dish} — straight in the bin.`, "bad", cook.name);
          sfx("shatter");
          cook.morale = Math.max(0, cook.morale - 3);
          tickets.push({ ...t, state: "rail", age: age * 0.6, quality: -1, sear: null });
          continue;
        }
        if (res.edged && cook && !cook.walkedOut) {
          // playing with fire brings the fire sooner
          cook.overloadT += 2;
          feed = pushFeed(feed, `${cook.name}'s station kisses the ${t.dish} with smoke. Worth it. Probably.`, "info", cook.name);
        }
        const cooled = coolCondition(t.dish, res.condition, serviceTime - t.plateAt);
        tickets.push({ ...t, age, state: "ready", readyAt: t.plateAt, quality: qualityOfCondition(t.dish, cooled), condition: cooled });
        sfx("bell");
        // corner! the kitchen calls the walk so nobody wears the plate
        if (rng() < 0.35) {
          feed = pushFeed(feed, pick(rng, EXPO_CORNER).replace("{D}", t.dish).replace("{T}", String(t.table)), "info", cook?.name);
        }
        continue;
      }
      // ready and held food cools on the service clock
      if ((t.state === "ready" || t.state === "pass") && t.condition) {
        const cooled = coolCondition(t.dish, t.condition, serviceTime - (t.readyAt ?? serviceTime));
        if (cooled !== t.condition) {
          tickets.push({ ...t, age, condition: cooled, quality: qualityOfCondition(t.dish, cooled) });
          continue;
        }
      }
      tickets.push({ ...t, age });
    }

    // expiry takes aim away only from the plate that vanished; inspection
    // belongs to the held plate — it closes when no pass plate remains
    if (selectedTicketId !== null && expiredIds.has(selectedTicketId)) {
      selectedTicketId = null;
    }
    let inspectionTurn = s.inspectionTurn;
    if (inspecting && !tickets.some((x) => x.state === "pass")) {
      inspecting = false;
      inspectionTurn = 0;
    }
    if (correction && expiredIds.has(correction.ticketId)) correction = null;
    // a correction lands only if its held plate is still held
    if (correction && serviceTime >= correction.endsAt) {
      const held = tickets.find((t) => t.id === correction!.ticketId && t.state === "pass");
      if (held?.condition?.sauce === "split") {
        const fixed: DishCondition = { ...held.condition, sauce: "smooth" };
        held.condition = fixed;
        held.quality = qualityOfCondition(held.dish, fixed);
        held.sauce = "saved";
        const cook = s.cooks.find((c) => c.station === held.station);
        if (cook && !cook.walkedOut) {
          cook.morale = Math.min(100, cook.morale + 2);
          cook.spikes = { ...cook.spikes, reliefAt: serviceTime };
        }
        events = appendServiceEvent(events, { kind: "intervention", at: serviceTime, action: "whisk", cookName: cook?.name, dish: held.dish, ticketId: held.id });
        feed = pushFeed(feed, "You gave it a moment. Thank you.", "good", cook?.name);
        career = { ...career, lastSauceHelp: { night: career.night, cookName: cook?.name ?? "THE KITCHEN", dish: held.dish } };
        saveCareer(career, s.cooks);
      }
      correction = null;
    }

    // --- split sauce + table requests: validate the live ones, maybe start new ones ---
    if (sauce) {
      const st = tickets.find((t) => t.id === sauce!.ticketId);
      if (!st || st.state !== "plating") sauce = null; // plated, fired or binned — drama over
      else if (serviceTime >= sauce.until) {
        const dimi = s.cooks.find((dd) => dd.station === st.station);
        if (dimi && !dimi.walkedOut && dimi.honored && !dimi.honoredUsed && dimi.station === 1) {
          // DIMITRI's keepsake: already there, whisk in hand
          dimi.honoredUsed = true;
          dimi.spikes = { ...dimi.spikes, reliefAt: serviceTime };
          sauce = null;
          st.sauce = "saved";
          feed = pushFeed(feed, `${dimi.name} is already there, whisk in hand. He saw it split before it split. (keepsake spent)`, "good", dimi.name);
          events = appendServiceEvent(events, { kind: "rescue", at: serviceTime, cookId: dimi.id, cookName: dimi.name, action: "whisk", dish: st.dish });
          sfx("whisk", { pan: STATION_PAN[st.station] ?? 0 });
        } else {
          sauce = null;
          st.sauce = "split";
          feed = pushFeed(feed, `The ${st.dish} split. It goes out broken.`, "bad");
          sfx("hiss", { pan: STATION_PAN[st.station] ?? 0, vol: 0.6 });
        }
      }
    }
    // one interrupt at a time: sauce waits if folklore is live; unlocks N2+
    if (!sauce && !s.folklore && serviceTime > 20 && s.career.night >= 2) {
      const plating = tickets.find((t) => t.state === "plating");
      if (plating && rng() < dt / 45) {
        // first split of the run gets a 7s window — establish, then test
        sauce = { ticketId: plating.id, until: serviceTime + (career.sauceGentled ? 4 : 7) };
        career = { ...career, sauceGentled: true };
        feed = pushFeed(feed, `The ${plating.dish} is splitting! WHISK it (M) or lose it.`, "drama");
        sfx("hiss", { pan: STATION_PAN[plating.station] ?? 0, vol: 0.5 });
      }
    }
    if (request) {
      const rt = tickets.find((t) => t.id === request!.ticketId);
      if (!rt) {
        // walked, stolen or 86ed mid-craving — the room moves on
        feed = pushFeed(feed, `Table ${request!.table} never mind about the ${request!.dish}.`, "info");
        request = null;
      } else if (rt.state === "rail" && serviceTime >= request.until) {
        // still hanging, still ordinary — they stop believing
        feed = pushFeed(feed, `Table ${request!.table} gives up on the ${request!.dish}.`, "info");
        request = null;
      }
      // plating/pass keeps the craving pinned — FAST and EXTRA CHAR are judged at the pass
    }
    // requests unlock N5; never while sauce or folklore holds the room
    if (!request && !sauce && !s.folklore && serviceTime > 30 && s.career.night >= 5) {
      const rail = tickets.filter((t) => t.state === "rail");
      if (rail.length > 0 && rng() < dt / 50) {
        const want = rail[Math.floor(rng() * rail.length)];
        const mod = rng() < 0.5 ? "FAST" : ("EXTRA CHAR" as const);
        request = { ticketId: want.id, table: want.table, dish: want.dish, mod, until: serviceTime + 35 };
        feed = pushFeed(
          feed,
          mod === "FAST"
            ? `Table ${want.table} wants the ${want.dish} FAST. Under 30 seconds old or they notice. (D to refuse)`
            : `Table ${want.table} wants the ${want.dish} with EXTRA CHAR. Kiss it with the sear. (D to refuse)`,
          "drama"
        );
        sfx("print", { pan: tablePan(want.table), vol: 0.6 });
      }
    }

    // --- folklore: seeded tests, 1–2 a night max — fork, glass, coat, return, flash ---
    let folklore = s.folklore;
    let folkloreDone = s.folkloreDone;
    let folkloreQ = 0;
    if (folklore && serviceTime >= folklore.until) {
      // expired unanswered: fork ignored, flash correctly ignored, rest forgiven
      const outcome: FolkloreOutcome = {
        kind: "folklore",
        at: serviceTime,
        test: folklore.kind,
        result: folklore.kind === "flash" ? "allowed" : "expired",
        table: folklore.table,
      };
      events = appendServiceEvent(events, outcome);
      folkloreOutcome = outcome;
      if (folklore.kind === "fork") {
        feed = pushFeed(feed, FOLKLORE_FORK_IGNORED, "bad");
        if (folklore.table === criticTable) folkloreQ = -20;
        sfx("gasp", { pan: tablePan(folklore.table) });
      } else if (folklore.kind === "flash") {
        feed = pushFeed(feed, `Table ${folklore.table} posted. The dining room glows. Let them.`, "info");
      }
      folklore = null;
      folkloreDone = true;
    }
    // folklore tests unlock N6; never while sauce or request holds the room
    if (!folklore && !folkloreDone && !sauce && !request && serviceTime > 40 && serviceTime < 110 && s.career.night >= 6) {
      const persona = s.career.criticPersona ?? "madameV";
      if (rng() < dt / 60) {
        const table = criticTable >= 0 ? criticTable : 10 + Math.floor(rng() * 5);
        const kind = persona === "madameV" ? "fork" : persona === "gilliam" ? (rng() < 0.5 ? "coat" : "glass") : (rng() < 0.5 ? "flash" : "return");
        folklore = { kind, table, until: serviceTime + 6 };
        const warn = kind === "fork" ? FOLKLORE_FORK_WARN.replace("{T}", String(table))
          : kind === "glass" ? FOLKLORE_GLASS_WARN.replace("{T}", String(table))
          : kind === "coat" ? FOLKLORE_COAT_WARN.replace("{T}", String(table))
          : kind === "return" ? FOLKLORE_RETURN_WARN.replace("{T}", String(table))
          : FOLKLORE_FLASH_WARN.replace("{T}", String(table));
        feed = pushFeed(feed, warn, "drama");
        sfx("hush");
        setTimeout(() => sfx("gasp", { pan: tablePan(table), vol: 0.5 }), 120);
      }
    }

    // 101 rattle: wobbly table chatters past 30s — you hear the bad table before it walks
    if (s.career.night >= 7 && rng() < dt / 6) {
      const old101 = tickets.find((t) => t.table === 14 && t.state === "rail" && t.age > 30);
      if (old101) sfx("rattle", { pan: tablePan(14), vol: 0.5 });
    }
    // sizzle tells truth: plating near the gold sings a little brighter
    const platingCue = tickets.find((t) => t.state === "plating" && t.plateDur > 0);
    if (platingCue) {
      const frac = 1 - (platingCue.plateAt - serviceTime) / platingCue.plateDur;
      if (frac > 0.55 && frac < 0.8 && rng() < dt / 1.2) {
        sfx("sear", { pan: STATION_PAN[platingCue.station] ?? 0, vol: 0.18 });
      }
    }
    // N9 graduation: second folklore — the room gets its crescendo (flash → return)
    if (s.career.night >= 9 && folkloreDone && !folklore && serviceTime > 70 && serviceTime < 72) {
      folkloreDone = false;
    }

    // --- dessert course: one-time stampede, then faster printer ---
    if (!dessertDone && serviceTime >= DESSERT_AT) {
      dessertDone = true;
      feed = pushFeed(
        feed,
        "Hands! DESSERT COURSE — fire soufflés, all day. If the inspector's out there, they're on the soufflé now.",
        "drama"
      );
      sfx("sting");
      for (let i = 0; i < 3; i++) tickets.push(spawnTicket(rng, criticTable, s.career.restedDish));
    }

    // --- new tickets ---
    const live = tickets.filter((t) => t.state !== "done").length;
    if (nextTicketIn <= 0 && live < 9) {
      const t = spawnTicket(rng, criticTable, s.career.restedDish);
      tickets.push(t);
      // the printer lives at the right of the pass — hear it land there
      sfx("print", { pan: 0.25 + rng() * 0.25 });
      if (t.table === criticTable && !criticAnnounced) {
        criticAnnounced = true;
        feed = pushFeed(feed, "The inspector ordered the Wellington. Of course.", "drama");
      }
      const floor = dessertDone ? 1.8 : 2.5;
      nextTicketIn =
        Math.max(floor, 7.5 - serviceTime / 25) * s.spawnMul * (0.8 + rng() * 0.5);
    }

    // --- pacing floor: a no-empty guard, not a busyness generator. Only
    // rail + plating count as work-bearing — ready/pass plates are already
    // cooked and idle. The opening early-returns above (inviolate); the
    // finale (last 40 s) stays authored. It spawns pending tickets only —
    // calling them is still the player's verb. ---
    if (serviceTime <= SERVICE_LEN - 40) {
      const workBearing = tickets.filter((t) => t.state === "rail" || t.state === "plating").length;
      if (workBearing < 2) nextTicketIn = Math.min(nextTicketIn, 1.2);
    }

    // --- BEEFCAKES does something unforgivable — and this time he sends a body ---
    const rivalTimes = s.career.mutator === "double_runners" ? [30, 50, 70, 90, 110, 128] : s.career.beefcakesWar ? [35, 55, 75, 95, 118] : [35, 75, 118];
    let rivalAt = s.rivalAt;
    let rivalWarned = s.rivalWarned;
    let lastSteal = s.lastSteal;
    const willSteal = !s.career.beefcakesTruce && (rivalIdx === 1 || (rivalIdx === 2 && s.career.aggro > 0) || !!s.career.beefcakesWar);
    // six seconds out, the runner stretches by your bins. You were warned.
    // SHOO him (H) before he reaches the rail — it costs you a second. Waits if folklore holds the room.
    // the first runner of the run stretches a little longer — 10s out, then 6s
    const warnGap = rivalIdx === 0 && !career.runnerGentled ? 10 : 6;
    if (rivalWarned < rivalIdx && rivalIdx < rivalTimes.length && serviceTime >= rivalTimes[rivalIdx] - warnGap && !folklore) {
      rivalWarned = rivalIdx;
      if (rivalIdx === 0) career = { ...career, runnerGentled: true };
      runner = { at: rivalTimes[rivalIdx], steal: willSteal, shooed: false, fled: false };
      feed = pushFeed(feed, pick(rng, BEEFCAKES_WARN), "drama", "BEEFCAKES");
      sfx("gasp", { pan: 0.8, vol: 0.6 });
    }
    if (rivalIdx < rivalTimes.length && serviceTime >= rivalTimes[rivalIdx]) {
      rivalAt = serviceTime;
      if (willSteal && !runner?.shooed) {
        const railNow = tickets.filter((t) => t.state === "rail");
        const victim = railNow[0];
        if (victim) {
          victim.state = "done";
          const slot = Math.min(5, railNow.indexOf(victim));
          lastSteal = { table: victim.table, dish: victim.dish, slot, at: serviceTime };
          feed = pushFeed(
            feed,
            pick(rng, BEEFCAKES_STEAL_LINES)
              .replace("{T}", String(victim.table))
              .replace("{D}", victim.dish),
            "drama",
            "BEEFCAKES"
          );
          sfx("rip", { pan: 0.8 });
        } else {
          feed = pushFeed(feed, pick(rng, s.career.beefcakesTruce ? TRUCE_LINES : RIVAL_LINES), "drama", "BEEFCAKES");
        }
      } else if (willSteal) {
        // shooed: he points at you from the door instead
        feed = pushFeed(feed, "BEEFCAKES points at you from the door. Noted. The ticket stays.", "good", "BEEFCAKES");
        sfx("gasp", { pan: 0.8, vol: 0.5 });
      } else {
        feed = pushFeed(feed, pick(rng, s.career.beefcakesTruce ? TRUCE_LINES : RIVAL_LINES), "drama", "BEEFCAKES");
        // he remembers the market: outbid him in the morning and the noon post is about you
        if (s.career.outbidBeefcakes && rng() < 0.5) {
          feed = pushFeed(feed, pick(rng, OUTBID_BEEFCAKES), "drama", "BEEFCAKES");
        }
      }
      if (runner) runner = { ...runner, fled: true };
      rivalIdx += 1;
    }
    if (runner && serviceTime > runner.at + 4) runner = null; // gone — scored or scattered

    // --- cooks: overload → fires, morale decay under load, walkouts ---
    const cooks = s.cooks.map((c) => {
      if (c.walkedOut) return c;
      const load = tickets.filter((t) => t.station === c.station && t.state !== "done").length;
      // drowning stations ignite — 3+ live tickets for 8s and the grease goes up.
      // at 5s the fat starts smoking: one warning hiss, then no more excuses.
      let overloadT = load >= 3 ? c.overloadT + dt : Math.max(0, c.overloadT - 2 * dt);
      let smoked = c.smoked;
      if (!c.burning && !smoked && overloadT > 5) {
        smoked = true;
        feed = pushFeed(feed, SMOKE_WARN.replace("{N}", c.name), "drama", c.name);
        sfx("hiss", { pan: STATION_PAN[c.station] ?? 0 });
      }
      let burning = c.burning;
      let spikes = c.spikes;
      if (!burning && overloadT > 8) {
        burning = true;
        overloadT = 0;
        spikes = { ...spikes, panicAt: serviceTime };
        feed = pushFeed(
          feed,
          `FLAMBÉ NOBODY ORDERED — ${c.name}'s station is ON FIRE. Click it. Smother it.`,
          "drama",
          c.name
        );
        sfx("sting");
      }
      // idle stations recover; loaded stations drain — drowning is what kills.
      // trauma from past walkouts makes them fragile forever; fire is worse.
      const drain = load === 0 ? -1.4 : (0.22 + load * 0.15) * (1 + c.trauma * 0.35);
      const morale = Math.min(100, Math.max(0, c.morale - dt * drain * (burning ? 2 : 1)));
      // the body is the gauge: one derived mood feeds HUD, glyph, pose and barks
      const working = tickets.some((t) => t.station === c.station && t.state === "plating");
      const mood = deriveMood(
        { morale, overloadT, grudge: c.grudge, burning, trauma: c.trauma, walkedOut: false, working },
        spikeStrengths(spikes, serviceTime)
      );
      if (morale <= WALKOUT_AT) {
        if (c.station === 2 && c.honored && !c.honoredUsed) {
          // ANWAR's keepsake: looks at the door, looks at the soufflé, stays
          feed = pushFeed(feed, `${c.name} looks at the door, looks at the soufflé, stays. For you. (keepsake spent)`, "good", c.name);
          events = appendServiceEvent(events, { kind: "rescue", at: serviceTime, cookId: c.id, cookName: c.name, action: "stay" });
          sfx("bell");
          return { ...c, morale: 15, overloadT, burning, smoked, spikes: { ...spikes, reliefAt: serviceTime }, mood, honoredUsed: true };
        }
        feed = pushFeed(feed, `${c.name} throws their apron. WALKOUT.`, "drama", c.name);
        events = appendServiceEvent(events, { kind: "walkout", at: serviceTime, cookId: c.id, cookName: c.name });
        sfx("sting");
        const egoBeforeWalk = ego;
        ego += 4; // the room watches
        feed = tiered(feed, egoBeforeWalk, ego);
        return { ...c, morale, overloadT, burning, spikes, walkedOut: true, walkoutAt: serviceTime };
      }
      return { ...c, morale, overloadT, burning, smoked, spikes, mood };
    });
    // a walked-out cook's half-done work goes back on the rail — the chef can
    // call it explicitly, but no ghost finishes it. Ready plates stay ready.
    for (const t of tickets) {
      if (t.state === "plating" && !t.byChef && cooks[t.station]?.walkedOut) {
        t.state = "rail";
        t.plateAt = 0;
        t.plateDur = 0;
        t.sear = null;
        t.condition = undefined;
        feed = pushFeed(feed, `${cooks[t.station].name} is gone — the ${t.dish} goes back on the rail.`, "info");
      }
    }

    // --- ambient bark: general rage, a station-directed insult, or a
    // personal one — cooks with grudges get barked AT, specifically ---
    // fatigue and flight read straight off morale — no new meters, just names for the states.
    // reads the post-tick cooks so mood, morale and walkouts are this frame's truth
    const liveBrigade = cooks.filter((c) => !c.walkedOut);
    const weakest = liveBrigade.length ? liveBrigade.reduce((a, b) => (a.morale < b.morale ? a : b)) : undefined;
    if (flying && !flyingAnnounced) {
      flyingAnnounced = true;
      feed = pushFeed(feed, "THE BRIGADE IS FLYING — favourites land harder (+2). Don't mention it. You'll jinx it.", "good");
    }
    if (serviceTime >= barkAt) {
      const target = liveBrigade.find((c) => rng() < 0.4);
      const grudged = target?.grudge && rng() < 0.5;
      let bark: string;
      let who: string | undefined;
      if (target && grudged) {
        bark = pick(rng, GRUDGE_BARKS[target.station]).replace("{N}", target.name);
        who = target.name;
      } else if (weakest && weakest.morale < 25 && rng() < 0.6) {
        bark = pick(rng, FATIGUE_BARKS[Math.min(2, weakest.station)]).replace("{N}", weakest.name);
        who = weakest.name;
      } else if (target && (target.mood === "ANGRY" || target.mood === "EDGE") && rng() < 0.7) {
        // the room talks in the mood: a furious cook gets barked AT,
        // a rattled one hears the fatigue pool — no new banks needed
        bark = pick(
          rng,
          target.mood === "ANGRY" ? GRUDGE_BARKS[target.station] : FATIGUE_BARKS[Math.min(2, target.station)]
        ).replace("{N}", target.name);
        who = target.name;
      } else if (flying && rng() < 0.6) {
        const f = liveBrigade[Math.floor(rng() * liveBrigade.length)];
        bark = pick(rng, FLYING_BARKS[Math.min(2, f.station)]).replace("{N}", f.name);
        who = f.name;
      } else if (target) {
        bark = pick(rng, STATION_BARKS[target.station]).replace("{N}", target.name);
        who = target.name;
      } else {
        bark = pick(rng, CHEF_BARKS);
        who = "THE PASS";
      }
      feed = pushFeed(feed, bark, "drama", who);
      barkAt = serviceTime + 16 + rng() * 14;
    }

    // --- the dining room tells on itself: critic escalates, press flashes,
    // the couple fights, the regulars nod through it ---
    // cam counterplay: on the Kid's night a wired cam gets noticed — they perform for it
    const personaTick = s.career.criticPersona ?? (s.career.night >= 9 ? "kid" : s.career.night >= 6 ? "madameV" : "gilliam");
    const kidPerforming = !!s.career.criticCam && personaTick === "kid";
    const camGilliam = !!s.career.criticCam && personaTick === "gilliam";
    const camMadame = !!s.career.criticCam && personaTick === "madameV";
    let kidNoticed = s.kidNoticed;
    let madameNodded = s.madameNodded;
    const guests = s.guests.map((g) => {
      const tickClock = g.tellClock - dt;
      if (tickClock <= 0) {
        const tells = g.tells + 1;
        const pan = tablePan(g.table);
        let line: string | null = null;
        let kind: FeedItem["kind"] = "info";
        let who: string | undefined;
        let tellKind: TellKind | null = null;
        if (g.kind === "critic") {
          const tell = criticTell(personaTick, tells, g.table);
          line = tell.text;
          tellKind = tell.kind;
          kind = "drama";
          events = appendServiceEvent(events, { kind: "critic-tell", at: serviceTime, table: g.table, tell: tell.kind });
          if (tell.kind === "phone") {
            sfx("flash", { pan });
            if (kidPerforming) {
              ego -= 2; // every flash tags the pass
              if (!kidNoticed) {
                kidNoticed = true;
                feed = pushFeed(feed, "THE KID found your red eye. They're performing for it now — flashes twice as fast, every photo tags the pass (−2 ego).", "drama");
              }
            }
          } else {
            sfx("hush", { pan });
          }
          if (camMadame && !madameNodded) {
            madameNodded = true;
            ego += 4;
            feed = pushFeed(feed, MADAME_CAM_NOD, "good");
          }
        } else if (g.kind === "press") {
          line = pick(rng, PRESS_TELLS).replace("{T}", String(g.table));
          tellKind = "phone";
          kind = "drama";
          who = "THE PRESS";
          sfx("flash", { pan, vol: 0.6 });
        } else if (g.kind === "couple") {
          line = pick(rng, COUPLE_FIGHT).replace("{T}", String(g.table));
        } else if (g.kind === "regulars" && tells === 1) {
          line = pick(rng, REGULARS_KIND);
          who = "THE REGULARS";
        } else if (g.kind === "walkin") {
          line = `Table ${g.table} is taking photos.`;
          tellKind = "phone";
        }
        // tell-volume governor: in the last 40s only the critic, the press, and first-kindness get lines
        const finale = serviceTime > SERVICE_LEN - 40;
        const keep = g.kind === "critic" || g.kind === "press" || (g.kind === "regulars" && tells === 1);
        if (line && !s.criticFlagged && (!finale || keep)) feed = pushFeed(feed, line, kind, who);
        const next =
          g.kind === "critic" ? (9 + rng() * 7) * (kidPerforming ? 0.55 : camGilliam ? 1.6 : 1)
          : g.kind === "press" ? 24 + rng() * 18
          : g.kind === "couple" ? 30 + rng() * 30
          : g.kind === "regulars" ? 70 + rng() * 40
          : 60 + rng() * 50;
        return { ...g, tells, tellAt: serviceTime, tellKind, tellClock: next * s.tellMul };
      }
      return { ...g, tellClock: tickClock };
    });

    // --- night ends ---
    const allOut = cooks.every((c) => c.walkedOut);
    if (serviceTime >= SERVICE_LEN || allOut) {
      const persona = s.career.criticPersona ?? "madameV";
      const avgQuality = served > 0 ? qualitySum / served : 0;
      const spotted = s.criticSpotted;
      const walkouts = cooks.filter((c) => c.walkedOut).length;
      let stars = 4;
      // GILLIAM hates noise: 2+ screams caps the night at 2★ no matter the food
      const gilliamCap = persona === "gilliam" && s.screams >= 2;
      // the quiet virtue: no screams across a real service — the food shouted instead
      const silent = s.screams === 0 && served >= 8;
      stars += avgQuality >= 72 ? 1 : avgQuality < 45 ? -1 : 0;
      stars -= Math.min(2, complaints);
      stars -= Math.min(2, misses);
      stars -= walkouts;
      stars += spotted ? 1 : 0;
      stars += s.smashed >= 3 && misses === 0 ? 1 : 0; // theatre bonus
      stars += silent ? 1 : 0;
      if (gilliamCap) stars = Math.min(stars, 2);
      // provenance: Lorna's scallops sing for Madame V; layby shrooms charm the Kid
      const hasLorna = (s.career.stories ?? []).includes("lorna");
      const hasLayby = (s.career.stories ?? []).includes("layby");
      const hasRisky = (s.career.stories ?? []).includes("risky");
      if (hasLorna && persona === "madameV" && spotted) stars = Math.min(5, stars + 1);
      if (hasRisky && persona === "kid" && spotted) stars = Math.max(0, stars - 1);
      stars = Math.max(0, Math.min(5, stars));
      // --- call the board: the wager resolves ---
      let betLine: string | undefined;
      let betCash = 0;
      const bet = s.career.bet;
      if (bet) {
        const label = BOARD[bet.kind].label;
        const wonBoard = bet.kind === "covers" ? served >= 8 : bet.kind === "walks" ? misses === 0 : spotted;
        if (wonBoard) {
          if (bet.kind === "spot") {
            ego += BOARD.spot.pays;
            betLine = `Called the board (${label}) — PAID +${BOARD.spot.pays} ego.`;
          } else {
            betCash = BOARD[bet.kind].pays;
            betLine = `Called the board (${label}) — PAID £${betCash}.`;
          }
          feed = pushFeed(feed, betLine, "good");
        } else {
          betLine = `Called the board (${label}) — the house wins.`;
          feed = pushFeed(feed, betLine, "bad");
        }
      }
      // vow judged first, before the story is told
      let vowLine: string | undefined;
      const vow = s.career.vow;
      if (vow === "star" && spotted && misses === 0) { vowLine = "STAR VOW HELD: no walks, inspector clocked. +1★ tomorrow."; }
      else if (vow === "star") vowLine = "STAR VOW BROKEN: the guide writes 'ambition without control.'";
      else if (vow === "house") vowLine = s.table101Turns >= 2 ? "HOUSE VOW HELD: 101 turned twice. The regulars are permanent." : "HOUSE VOW BROKEN: 101 wobbled away.";
      else if (vow === "brigade") vowLine = walkouts === 0 ? "BRIGADE VOW HELD: nobody walked. Trauma −1 all." : "BRIGADE VOW BROKEN: aprons on the tiles.";
      // the accounts answer the question the review can't fudge: does the residency end here?
      const v2 = VENUES[s.career.venue];
      const lastNight2 = s.career.night + 1 > MAX_NIGHTS;
      const acc = nightAccounts({
        covers: served,
        price: v2.price,
        walkedOut: walkouts,
        cooks: s.cooks.length,
        smashed: s.smashed,
        betCash,
        cash: s.career.cash,
        debtTake: lastNight2 ? (s.career.debt ?? 0) : 0,
      });
      const isFinalNight = s.career.night >= MAX_NIGHTS || acc.nextCash < -60;
      const criticQ = s.criticQ + folkloreQ; // this tick's folklore resolves into the last word too
      const story = buildServiceStory({
        night: s.career.night,
        stars,
        served,
        sentBack: s.sentBack,
        screams: s.screams,
        smashed: s.smashed,
        misses,
        complaints,
        walkoutNames: cooks.filter((k) => k.walkedOut).map((k) => k.name),
        spotted,
        criticServed: s.criticServed,
        criticAvg: s.criticServed > 0 ? criticQ / s.criticServed : -1,
        events,
        folkloreOutcome,
        persona,
        isFinalNight,
      });
      const review: Review = {
        stars,
        quote: story.incident,
        covers: served,
        avgQuality,
        complaints,
        misses,
        walkouts,
        smashed: s.smashed,
        spotted,
        ego,
        bestStreak,
        criticVerdict: story.criticVerdict,
        silent,
        incident: story.incident,
        consequence: story.consequence,
        sentBack: s.sentBack,
        screams: s.screams,
        betLine,
        betCash,
        vowLine,
        folkloreLine: story.folkloreLine,
        cover: story.cover,
        headline: story.headline,
      };
      sfx("review");
      speakReview(stars, reviewNarration(review));
      set({
        phase: "review",
        tickets,
        cooks,
        guests,
        feed,
        serviceTime,
        // the whole tick's worth of state commits with the review — the morning
        // after must read the same night the reviewer just saw
        ego, complaints, misses, served, qualitySum, streak, bestStreak, dessertDone, career,
        nextTicketIn, barkAt, rivalIdx, rivalAt, rivalWarned, lastSteal, criticAnnounced,
        sauce, request, runner, folklore, folkloreDone,
        criticQ,
        kidNoticed,
        madameNodded,
        flyingAnnounced,
        events,
        folkloreOutcome,
        review,
        // night ends: incomplete corrections die quietly — no invented success
        correction: null,
        inspecting: false,
        selectedTicketId: null,
      });
      // platform: nightly boards, achievements, events — fire and forget
      trackEvent("night_completed", { level: String(s.career.night), score: stars });
      submitBoard("service_stars", stars, String(s.career.night));
      submitBoard("streaks", bestStreak);
      if (silent && stars >= 5) unlockAch("silent_service");
      if (s.trilogyTonight) unlockAch("wellington_trilogy");
      return;
    }

    // --- the critic's exit: fed and spotted, they leave head high; unspotted, they slip away at 120 ---
    let criticLeft = s.criticLeft;
    if (!criticLeft) {
      const cg = guests.find((g) => g.isCritic);
      if (s.criticSpotted && s.criticServed > 0 && serviceTime - s.criticServeAt > 25) {
        criticLeft = true;
        if (cg) cg.tellClock = 1e9;
        feed = pushFeed(feed, `Table ${criticTable} pays and leaves. The inspector has finished their visit.`, "drama");
        sfx("bell", { pan: tablePan(criticTable) });
      } else if (!s.criticSpotted && serviceTime >= 120) {
        criticLeft = true;
        if (cg) cg.tellClock = 1e9;
        feed = pushFeed(feed, `Table ${criticTable} slips out, coat on. The inspector is gone.`, "bad");
        sfx("gasp", { pan: tablePan(criticTable) });
      }
    }

    set({
      tickets, cooks, guests, feed, nextTicketIn, serviceTime,
      ego, complaints, misses, served, qualitySum, streak, bestStreak, dessertDone, career,
      barkAt, rivalIdx, rivalAt, rivalWarned, lastSteal, criticAnnounced,
      sauce, request, runner, criticLeft, folklore, folkloreDone,
      events, folkloreOutcome,
      criticQ: s.criticQ + folkloreQ,
      kidNoticed,
      madameNodded,
      flyingAnnounced,
      correction, selectedTicketId, inspecting, inspectionTurn,
    });
  },

  plateToPass: (id) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary) return;
    // during the opening only the call exists — nothing else may start cooking
    if (s.openingStep && s.openingStep !== "call") return;
    if (!canStartOrder(s.tickets, id)) return;
    const t = s.tickets.find((t) => t.id === id)!;
    const cook = s.cooks.find((c) => c.station === t.station);
    const walkedOut = cook?.walkedOut ?? false;
    // the chef can't be in two stations: one byChef job at a time
    if (walkedOut && s.tickets.some((x) => x.state === "plating" && x.byChef)) return;
    const adrenaline = s.serviceTime < s.adrenalineTil;
    let dur = 2.0 + (1 - (cook?.skill ?? 0.5)) * 2.5 + s.rng() * 1.2;
    if (walkedOut) dur *= 1.8;
    if (adrenaline) dur /= 1.7;
    // the current Wellington revision is part of the work — herb takes longer
    const recipe = t.dish === "Beef Wellington" ? currentWellingtonRecipe(s.career.recipeHistory) : null;
    if (recipe) dur += WELLINGTON_FINISHES[recipe.finish].extraSeconds;
    // expo: the pass calls the fire, with the all-day count the trade counts on
    const allDay = s.tickets.filter((x) => x.dish === t.dish && x.state !== "done").length;
    const fireCall = pick(s.rng, EXPO_FIRE).replace("{D}", t.dish).replace("{T}", String(t.table)).replace("{N}", String(Math.max(1, allDay)));
    set({
      tickets: s.tickets.map((x) =>
        x.id === id
          ? { ...x, state: "plating", plateAt: s.serviceTime + dur, plateDur: dur, byChef: walkedOut, sear: null,
              recipeFinish: recipe?.finish, recipeContributor: recipe?.contributor }
          : x
      ),
      selectedTicketId: id,
      inspecting: false,
      feed: s.openingStep === "call"
        ? pushFeed(s.feed, "On it.", "info", "PETRA")
        : walkedOut
          ? pushFeed(pushFeed(s.feed, `${cook?.name} is gone — plating it yourself.`, "info"), fireCall, "info", "THE PASS")
          : pushFeed(s.feed, fireCall, "info", "THE PASS"),
      openingStep: s.openingStep === "call" ? "judge" : null,
    });
  },

  firePlate: (id?: number) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary || s.openingStep) return;
    const target = id ?? s.selectedTicketId;
    if (target == null) return;
    const t = s.tickets.find((t) => t.id === target && t.state === "plating");
    if (!t) return;
    // nobody is standing there to hand it off — the chef's own jobs only
    if (!t.byChef && s.cooks[t.station]?.walkedOut) return;
    // the ready slot must be free — firing into a full station would lose a plate
    if (s.tickets.some((x) => x.station === t.station && x.state === "ready")) return;
    // the last 30% of the cook is the sear: fire inside it for the kiss
    // of the pan, fire earlier to free the slot at a cost
    const frac = t.plateDur > 0 ? 1 - (t.plateAt - s.serviceTime) / t.plateDur : 1;
    const golden = frac >= 0.7;
    const cook = s.cooks.find((c) => c.station === t.station);
    const criticTable = s.guests.find((g) => g.isCritic)?.table ?? -1;
    // a live unrescued sauce interrupt goes out split — firing early does not erase it
    const searFlag = golden ? "golden" as const : "rushed" as const;
    const res = finishPlating(
      { ...t, sear: searFlag, sauce: s.sauce?.ticketId === t.id ? "split" : t.sauce },
      t.age,
      cook,
      {
        rng: s.rng,
        menuBuffs: s.menuBuffs,
        gear: s.career.gear,
        criticTable,
        champagne: (s.career.champagneNight ?? -1) === s.career.night,
        simmer: !!cook && !cook.walkedOut && !cook.burning && cook.overloadT > 5,
        flying: s.cooks.length > 0 && s.cooks.reduce((t, c) => t + (c.walkedOut ? 0 : c.morale), 0) / Math.max(1, s.cooks.filter((c) => !c.walkedOut).length) > 80 && s.streak >= 5,
      }
    );
    const cooks = s.cooks.map((c) => ({ ...c }));
    const liveCook = cooks.find((c) => c.station === t.station);
    let feed = s.feed;
    let sauce = s.sauce;
    if (sauce?.ticketId === t.id) sauce = null; // fired out from under it — the save stands
    if (res.edged && liveCook && !liveCook.walkedOut) {
      liveCook.overloadT += 2;
      feed = pushFeed(feed, `${liveCook.name}'s station kisses the ${t.dish} with smoke. Worth it. Probably.`, "info", liveCook.name);
    }
    if (res.fumble && liveCook) {
      liveCook.morale = Math.max(0, liveCook.morale - 3);
      feed = pushFeed(feed, `${liveCook.name} fumbles the ${t.dish} — straight in the bin.`, "bad", liveCook.name);
      sfx("shatter", { pan: STATION_PAN[t.station] ?? 0 });
      set({
        cooks,
        feed,
        sauce,
        tickets: s.tickets.map((x) =>
          x.id === t.id ? { ...x, state: "rail", age: x.age * 0.6, quality: -1, sear: null } : x
        ),
      });
      return;
    }
    if (golden) {
      feed = pushFeed(
        feed,
        `You fire the ${t.dish} right on the sear. ${cook?.name ?? "The kitchen"} almost smiles.`,
        "good",
        cook?.name
      );
      sfx("sear", { pan: STATION_PAN[t.station] ?? 0 });
    } else {
      feed = pushFeed(
        feed,
        `You rush the ${t.dish} off early — raw in the middle, but the slot's free.`,
        "info"
      );
      sfx("slam", { pan: STATION_PAN[t.station] ?? 0 });
    }
    set({
      cooks,
      feed,
      sauce,
      tickets: s.tickets.map((x) =>
        x.id === t.id
          ? { ...x, state: "ready", readyAt: s.serviceTime, quality: res.quality, condition: res.condition, sear: searFlag }
          : x
      ),
    });
  },

  selectTicket: (id) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary) return;
    // aim at a live ticket only — never a silent substitute
    if (!s.tickets.some((t) => t.id === id && t.state !== "done" && t.state !== "pass")) return;
    set({ selectedTicketId: id });
  },

  collectPlate: (id) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary || s.openingStep || s.correction || !canCollectOrder(s.tickets, id)) return;
    set({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, state: "pass" as const } : t)), selectedTicketId: id, inspecting: false, inspectionTurn: 0 });
  },

  setInspecting: (value) => {
    const s = get();
    if (!value) {
      if (s.inspecting) set({ inspecting: false });
      return;
    }
    if (s.phase !== "service" || s.paused || s.glossary || !s.tickets.some((t) => t.state === "pass")) return;
    set({ inspecting: true });
  },

  turnPlate: (delta) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary || !s.inspecting || !Number.isFinite(delta)) return;
    set({ inspectionTurn: (s.inspectionTurn + delta) % (Math.PI * 2) });
  },

  correctPlate: () => {
    const s = get();
    const p = s.tickets.find((t) => t.state === "pass");
    if (s.phase !== "service" || s.paused || s.glossary || s.openingStep || s.correction || p?.condition?.sauce !== "split") return;
    set({ inspecting: true, correction: { ticketId: p.id, startedAt: s.serviceTime, endsAt: s.serviceTime + SAUCE_CORRECTION_SECONDS } });
    sfx("whisk", { pan: STATION_PAN[p.station] ?? 0 });
  },

  runTable: () => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary || s.openingStep || s.correction) return;
    const held = s.tickets.find((t) => t.state === "pass");
    if (!held) return;
    // held plate plus every ready plate at the same table — the kitchen walks together
    const peers = s.tickets.filter((t) => t.state === "ready" && t.table === held.table);
    const plates: { dish: string; quality: number; condition?: DishCondition; recipeFinish?: RecipeFinish }[] = [];
    // serve the held plate through the real judgment first, freeing the pass
    plates.push({ dish: held.dish, quality: held.quality, condition: held.condition, recipeFinish: held.recipeFinish });
    get().judge("serve", { batch: true });
    // each same-table ready peer then walks the same honest path: collect, serve
    for (const peer of peers) {
      get().collectPlate(peer.id);
      const cur = get().tickets.find((t) => t.id === peer.id);
      if (cur?.state !== "pass") continue;
      plates.push({ dish: cur.dish, quality: cur.quality, condition: cur.condition, recipeFinish: cur.recipeFinish });
      get().judge("serve", { batch: true });
    }
    const after = get();
    if (plates.length === 0) return;
    set({
      lastDelivery: { id: (s.lastDelivery?.id ?? 0) + 1, at: after.serviceTime, table: held.table, plates },
      selectedTicketId: after.selectedTicketId && after.tickets.some((t) => t.id === after.selectedTicketId && t.state !== "done" && t.state !== "pass")
        ? after.selectedTicketId
        : null,
    });
    sfx("bell");
  },

  developWellington: (finish) => {
    const s = get();
    if (s.phase !== "briefing" || s.career.night < 2) return;
    if (finish !== "classic" && finish !== "herb") return;
    const contributor = s.cooks.find((c) => c.station === 0)?.name ?? "THE HOUSE";
    const career = { ...s.career, recipeHistory: reviseWellington(s.career.recipeHistory, finish, contributor, s.career.night) };
    saveCareer(career, s.cooks);
    set({ career });
  },

  eightySix: () => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.career.night < 5) return;
    if (s.career.mutator === "no_bin") {
      set({ feed: pushFeed(s.feed, "No bin tonight — house rule. Cook everything.", "info") });
      return;
    }
    const rail = s.tickets.filter((t) => t.state === "rail");
    if (rail.length === 0) return;
    // the oldest docket names the dish. The dish dies.
    const dish = rail[0].dish;
    const station = rail[0].station;
    const ids = new Set(rail.filter((t) => t.dish === dish).map((t) => t.id));
    const tables = [...new Set(rail.filter((t) => ids.has(t.id)).map((t) => t.table))];
    const cooks = s.cooks.map((c) => ({ ...c }));
    const cook = cooks.find((c) => c.station === station);
    if (cook && !cook.walkedOut) {
      cook.morale = Math.max(0, cook.morale - 4);
      if (!cook.grudge && s.rng() < 0.35) cook.grudge = "86ed";
    }
    const guests = s.guests.map((g) =>
      g.kind === "press" ? { ...g, tellClock: Math.max(0, g.tellClock - 12) } : g
    );
    sfx("rip");
    set({
      cooks,
      guests,
      ego: s.ego + 2,
      feed: tiered(
        pushFeed(
          s.feed,
          `86 the ${dish}. ${ids.size} docket${ids.size > 1 ? "s" : ""} in the bin. Tables ${tables.join(", ")} wait longer; ${cook?.name ?? "the kitchen"} takes it personally.`,
          "drama"
        ),
        s.ego,
        s.ego + 2
      ),
      tickets: s.tickets.map((t) =>
        ids.has(t.id)
          ? { ...t, state: "done", verdict: null }
          : t.state === "rail" && tables.includes(t.table)
            ? { ...t, age: t.age + 8 }
            : t
      ),
    });
  },

  whisk: () => {
    const s = get();
    if (s.phase !== "service" || s.paused) return;
    const ev = s.sauce;
    if (!ev) return;
    const t = s.tickets.find((x) => x.id === ev.ticketId && x.state === "plating");
    if (!t) return; // too late — it plated, fired or split already
    const cook = s.cooks.find((c) => c.station === t.station);
    sfx("whisk", { pan: STATION_PAN[t.station] ?? 0 });
    set({
      sauce: null,
      events: appendServiceEvent(s.events, { kind: "intervention", at: s.serviceTime, action: "whisk", cookName: cook?.name, dish: t.dish }),
      feed: pushFeed(s.feed, `Whisked back from the edge.`, "good", cook?.name),
      tickets: s.tickets.map((x) => (x.id === t.id ? { ...x, sauce: "saved" } : x)),
    });
  },

  shooRunner: () => {
    const s = get();
    if (s.phase !== "service" || s.paused) return;
    const r = s.runner;
    if (!r || r.fled || r.shooed) return;
    if (s.serviceTime > r.at + 1) return; // too late — he's at the rail
    sfx("slam", { pan: 0.8 });
    set({
      runner: { ...r, shooed: true, fled: true },
      events: appendServiceEvent(s.events, { kind: "intervention", at: s.serviceTime, action: "shoo" }),
      ego: s.ego + 2,
      feed: tiered(
        pushFeed(s.feed, "'Wrong kitchen, sunshine.' He leaves with the wrist.", "good"),
        s.ego,
        s.ego + 2
      ),
      // eyes off the rail for a second: everything ages a breath
      tickets: s.tickets.map((t) => (t.state === "rail" ? { ...t, age: t.age + 3 } : t)),
    });
  },

  declineRequest: () => {
    const s = get();
    if (s.phase !== "service" || s.paused) return;
    const req = s.request;
    if (!req) return;
    set({
      request: null,
      guests: s.guests.map((g) =>
        g.kind === "press" ? { ...g, tellClock: Math.max(0, g.tellClock - 15) } : g
      ),
      feed: pushFeed(s.feed, `Refused. The press writes it down.`, "info"),
    });
    sfx("gasp");
  },

  compTable: () => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.comped || s.career.cash < 20 || s.openingStep) return;
    const rail = s.tickets.filter((t) => t.state === "rail");
    // the table with the most hanging fire gets the champagne
    const counts = new Map<number, number>();
    for (const t of rail) counts.set(t.table, (counts.get(t.table) ?? 0) + 1);
    let target = -1;
    let best = 0;
    for (const [table, n] of counts) if (n > best) { best = n; target = table; }
    if (target < 0) return;
    const guests = s.guests.map((g) => ({
      ...g,
      tellClock: g.tellClock + 20, // the room exhales
      mercy: g.kind === "regulars" && g.table === target ? Math.min(2, g.mercy + 1) : g.mercy,
    }));
    sfx("applause", { pan: tablePan(target) });
    set({
      comped: true,
      guests,
      career: { ...s.career, cash: s.career.cash - 20 },
      feed: pushFeed(s.feed, `Champagne on the house. The room exhales.`, "good", "THE REGULARS"),
      tickets: s.tickets.map((t) =>
        t.state === "rail" && t.table === target ? { ...t, age: Math.max(0, t.age - 10) } : t
      ),
    });
  },

  bet: (kind) => {
    const s = get();
    if (s.phase !== "briefing" || s.career.bet || s.career.night < 8) return;
    const b = BOARD[kind];
    if (s.career.cash < b.stake || s.ego < b.stakeEgo) return;
    set({
      career: { ...s.career, cash: s.career.cash - b.stake, bet: { kind, stake: b.stake, stakeEgo: b.stakeEgo } },
      ego: s.ego - b.stakeEgo,
      feed: pushFeed(s.feed, `Board called: ${b.label}. No take-backs.`, "drama"),
    });
  },

  borrow: () => {
    const s = get();
    if (s.phase !== "briefing" || (s.career.debt ?? 0) > 0) return;
    const career = { ...s.career, cash: s.career.cash + 100, debt: 100 };
    saveCareer(career, s.cooks);
    set({
      career,
      feed: pushFeed(s.feed, "The van floats you £100. £130 before the residency ends.", "drama"),
    });
  },

  repay: () => {
    const s = get();
    if (s.phase !== "briefing") return;
    const debt = s.career.debt ?? 0;
    if (debt <= 0 || s.career.cash < debt + 30) return;
    const career = { ...s.career, cash: s.career.cash - debt - 30, debt: 0 };
    saveCareer(career, s.cooks);
    set({
      career,
      feed: pushFeed(s.feed, "Paid. The man nods once and dissolves into the night.", "good"),
    });
  },

  clout: (id) => {
    const s = get();
    if (s.phase !== "briefing") return;
    // ego doesn't keep — spend it in the morning or sober up by doors
    if (id === "champagne" && s.ego >= 15 && (s.career.champagneNight ?? -1) < s.career.night) {
      const career = { ...s.career, champagneNight: s.career.night };
      saveCareer(career, s.cooks);
      set({
        ego: s.ego - 15,
        career,
        feed: pushFeed(s.feed, "Inspector's table comped. +10 their plates.", "good"),
      });
    } else if (id === "dessert" && s.ego >= 20 && (s.career.dessertNight ?? -1) < s.career.night) {
      const career = { ...s.career, dessertNight: s.career.night };
      saveCareer(career, s.cooks);
      set({
        ego: s.ego - 20,
        career,
        feed: pushFeed(s.feed, "Dessert on the house for the regulars. Twenty years buys two walkouts tonight.", "good", "THE REGULARS"),
      });
    } else if (id === "door" && s.ego >= 40 && !s.career.doorNamed) {
      const career = { ...s.career, doorNamed: true, stars: s.career.stars + 1 };
      saveCareer(career, s.cooks);
      set({
        ego: s.ego - 30,
        career,
        feed: pushFeed(s.feed, "YOUR NAME ABOVE THE DOOR. +1★.", "drama"),
      });
    }
  },

  judge: (v, options) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.glossary || s.correction) return;
    // the opening's two plates only accept what they're teaching
    if (s.openingStep === "serve" && v !== "serve") return;
    if (s.openingStep === "call") return;
    const plate = s.tickets.find((t) => t.state === "pass");
    if (!plate) return;
    let { feed, ego, served, sentBack, smashed, complaints, qualitySum, streak, bestStreak } = s;
    let { criticServed, criticQ } = s;
    let wellingtonRun = s.wellingtonRun;
    let trilogyTonight = s.trilogyTonight;
    let criticServeAt = s.criticServeAt;
    const cooks = s.cooks.map((c) => ({ ...c }));
    const cook = cooks[plate.station];
    const criticTable = s.guests.find((g) => g.isCritic)?.table;
    const stamp = (text: string) => ({ stampText: text, stampAt: performance.now() });

    if (v === "serve") {
      const egoBefore = ego;
      served += 1;
      let q = plate.quality;
      let req = s.request;
      let ms: { at: number; text: string } | null = null;
      // coursing: the table eats together — a good plate landing within 20s
      // of the table's last one rides its heat (+6)
      let tableServeAt = s.tableServeAt;
      if (q >= 45 && s.serviceTime - (s.tableServeAt[plate.table] ?? -99) <= 20) {
        q += 6;
        feed = pushFeed(feed, `Table ${plate.table} eats together (+6).`, "good");
      }
      // table requests: FAST (under 30s old) or EXTRA CHAR (fired golden) — nailed it or noticed
      if (req && req.ticketId === plate.id) {
        const mod = req.mod;
        req = null;
        const nailed = mod === "FAST" ? plate.age < 30 : plate.sear === "golden";
        if (nailed) {
          q += 10;
          feed = pushFeed(feed, `Table ${plate.table} wanted ${mod} — nailed it (+10).`, "good");
        } else {
          q -= 8;
          feed = pushFeed(feed, `Table ${plate.table} asked for ${mod}. Noticed (−8).`, "bad");
        }
      }
      // menu feature: tonight's dish sings (+6) wherever it lands
      if (s.career.featuredDish && plate.dish === s.career.featuredDish) {
        q += 6;
        feed = pushFeed(feed, `The feature sings (+6).`, "good");
      }
      // provenance: Lorna sings for Madame V (+6), layby shrooms charm the Kid (+6)
      const stories = s.career.stories ?? [];
      const persona = s.career.criticPersona ?? "madameV";
      if (plate.table === criticTable && spottedProvenance(stories, persona)) {
        q += 6;
        feed = pushFeed(feed, `${stories.includes("lorna") ? "Lorna's scallops — known by the first bite" : "Layby shrooms — the Kid is already filming"} (+6).`, "good");
      }
      qualitySum += q;
      if (!options?.batch) sfx("slam");
      if (plate.table === criticTable) {
        criticServed += 1;
        criticQ += q;
        criticServeAt = s.serviceTime;
      }
      let table101Turns = s.table101Turns;
      if (plate.table === 14 && plate.quality >= 45) {
        table101Turns += 1;
        if (table101Turns === 2) feed = pushFeed(feed, `101 turns twice. The wobble holds.`, "good");
      }
      if (plate.quality >= 45) {
        tableServeAt = { ...tableServeAt, [plate.table]: s.serviceTime };
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        if (plate.quality >= 72) {
          feed = pushFeed(feed, `Table ${plate.table}: clean plate club.`, "good");
          // hands! the trade calls the walk, every time it matters
          if (s.rng() < 0.6) {
            feed = pushFeed(feed, pick(s.rng, EXPO_HANDS).replace("{T}", String(plate.table)).replace("{D}", plate.dish), "info", "THE PASS");
          }
          if (cook) cook.morale = Math.min(100, cook.morale + 3);
          // the Wellington trilogy: three pristine in a row and the room mythologises it
          if (plate.dish === "Beef Wellington") {
            wellingtonRun += 1;
            if (wellingtonRun === 3) {
              feed = pushFeed(feed, TRILOGY_WELLY, "drama", "THE REGULARS");
              sfx("applause", { vol: 0.7 });
              wellingtonRun = 0;
              trilogyTonight = true;
            }
          } else {
            wellingtonRun = 0;
          }
        } else {
          feed = pushFeed(feed, `Table ${plate.table} eats in silence.`, "info");
        }
        if (streak > 0 && streak % 5 === 0) {
          feed = pushFeed(feed, `The kitchen hums — ×${streak}.`, "drama");
          ego += 2;
          for (const c of cooks) if (!c.walkedOut) c.morale = Math.min(100, c.morale + 2);
        }
        // streak ceremonies: ×10 leans in, ×15 applauds unasked, ×20 gets remembered
        if (streak === 10 || streak === 15 || streak === 20) {
          ms = { at: performance.now(), text: MILESTONES[streak] };
          feed = pushFeed(feed, MILESTONES[streak], "drama");
          sfx("applause", { vol: streak === 15 ? 1 : 0.7 });
        }
      } else {
        complaints += 1;
        streak = 0;
        feed = pushFeed(feed, pick(s.rng, GUEST_HECKLES).replace("{T}", String(plate.table)), "bad");
        if (cook) cook.morale = Math.max(0, cook.morale - 5);
      }
      feed = tiered(feed, egoBefore, ego);
      // a bad plate breaks the trilogy — the myth dies hungry
      if (plate.quality < 72) wellingtonRun = 0;
      // the opening's two plates redirect the same real serve into the next lesson
      const ticketsNext = s.openingStep === "serve"
        ? [openingTicket(plate.table, "rail")]
        : s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done" as const, verdict: v } : t));
      // the second teaching plate resolves into the first real rush: one
      // Wellington with a split jus waiting for the new chef, all authored
      if (s.openingStep === "judge") {
        const coupleTable = s.guests.find((g) => g.kind === "couple")?.table ?? plate.table;
        const regularsTable = s.guests.find((g) => g.kind === "regulars")?.table ?? plate.table;
        ticketsNext.push(
          authoredTicket("Beef Wellington", coupleTable, "split-jus"),
          authoredTicket("Pommes purée", coupleTable),
          authoredTicket("Soufflé (weeping)", regularsTable),
        );
      }
      const feedNext = s.openingStep === "serve"
        ? pushFeed([], "One more, chef.", "info", "PETRA")
        : s.openingStep === "judge"
          ? pushFeed(feed, `Table ${s.guests.find((g) => g.kind === "couple")?.table ?? plate.table}: Wellington and purée. Together.`, "info")
          : feed;
      set({
        tickets: ticketsNext,
        served,
        complaints,
        qualitySum,
        cooks,
        feed: feedNext,
        ego,
        streak,
        bestStreak,
        criticServed,
        criticQ,
        criticServeAt,
        tableServeAt,
        table101Turns,
        request: req,
        wellingtonRun,
        trilogyTonight,
        openingStep: s.openingStep === "serve" ? "call" : null,
        nextTicketIn: s.openingStep === "judge" ? 8 : s.nextTicketIn,
        selectedTicketId: s.selectedTicketId === plate.id ? null : s.selectedTicketId,
        inspecting: false,
        inspectionTurn: 0,
        lastDelivery: options?.batch
          ? s.lastDelivery
          : { id: (s.lastDelivery?.id ?? 0) + 1, at: s.serviceTime, table: plate.table,
              plates: [{ dish: plate.dish, quality: plate.quality, condition: plate.condition, recipeFinish: plate.recipeFinish }] },
        events: appendServiceEvent(s.events, { kind: "plate", at: s.serviceTime, ticketId: plate.id, dish: plate.dish, table: plate.table, cookName: plate.byChef ? "THE CHEF" : cook?.name ?? "THE CHEF", verdict: "serve", quality: plate.quality, guestScore: q }),
        milestoneAt: ms?.at ?? s.milestoneAt,
        milestoneText: ms?.text ?? s.milestoneText,
        ...stamp("SERVED"),
      });
      return;
    }

    if (v === "sendback") {
      sentBack += 1;
      sfx("rip");
      // a truthful send-back names the fault; a free rejection earns the grudge
      const needed = plate.condition ? correctionNeeded(plate.dish, plate.condition) : null;
      if (needed) {
        feed = pushFeed(feed, `Back to ${cook?.name ?? "the pass"}: "${CORRECTION_LABEL[needed]}."`, "info", cook?.name);
        if (cook) cook.morale = Math.max(0, cook.morale - 1);
      } else {
        feed = pushFeed(feed, `Back to ${cook?.name ?? "the pass"}: "${plate.dish}. Again."`, "info", cook?.name);
        // sent back on their station: they will remember this
        if (cook && !cook.walkedOut && !cook.grudge) cook.grudge = "sent back";
        if (cook) cook.morale = Math.max(0, cook.morale - 3);
      }
      set({
        tickets: s.tickets.map((t) =>
          t.id === plate.id
            ? { ...t, state: "rail", age: t.age * 0.4, quality: -1, sear: null,
                condition: undefined, readyAt: undefined,
                requestedCorrection: needed ?? t.requestedCorrection }
            : t
        ),
        sentBack,
        cooks,
        feed,
        inspecting: false,
        inspectionTurn: 0,
        events: appendServiceEvent(s.events, { kind: "plate", at: s.serviceTime, ticketId: plate.id, dish: plate.dish, table: plate.table, cookName: plate.byChef ? "THE CHEF" : cook?.name ?? "THE CHEF", verdict: "sendback", quality: plate.quality }),
        openingStep: s.openingStep ? "call" as const : null,
        ...stamp("SENT BACK"),
      });
      return;
    }

    // smash
    const egoBeforeSmash = ego;
    smashed += 1;
    streak = 0;
    ego += 4;
    sfx("shatter");
    setTimeout(() => sfx("gasp"), 120);
    feed = pushFeed(feed, `You launch the ${plate.dish} into the tiles. The room stares.`, "drama");
    feed = tiered(feed, egoBeforeSmash, ego);
    if (cook && !cook.walkedOut) {
      cook.morale = Math.max(0, cook.morale - 6);
      cook.spikes = { ...cook.spikes, angerAt: s.serviceTime };
    }
    // the kitchen remembers what you smashed — tomorrow's family meal is haunted by it
    const career = { ...s.career, lastSmashed: plate.dish };
    saveCareer(career, cooks);
    set({
      tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done", verdict: v } : t)),
      smashed,
      ego,
      cooks,
      feed,
      streak,
      career,
      wellingtonRun: 0,
      request: s.request?.ticketId === plate.id ? null : s.request,
      events: appendServiceEvent(s.events, { kind: "plate", at: s.serviceTime, ticketId: plate.id, dish: plate.dish, table: plate.table, cookName: plate.byChef ? "THE CHEF" : cook?.name ?? "THE CHEF", verdict: "smash", quality: plate.quality }),
      smashAt: performance.now(),
      selectedTicketId: s.selectedTicketId === plate.id ? null : s.selectedTicketId,
      inspecting: false,
      inspectionTurn: 0,
      ...(s.openingStep
        ? {
            openingStep: null,
            nextTicketIn: 8,
            // even a smashed second plate ends the lesson: the room fills in
            tickets: (() => {
              const next = s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done" as const, verdict: v } : t));
              const coupleTable = s.guests.find((g) => g.kind === "couple")?.table ?? plate.table;
              const regularsTable = s.guests.find((g) => g.kind === "regulars")?.table ?? plate.table;
              next.push(
                authoredTicket("Beef Wellington", coupleTable, "split-jus"),
                authoredTicket("Pommes purée", coupleTable),
                authoredTicket("Soufflé (weeping)", regularsTable),
              );
              return next;
            })(),
          }
        : {}),
      ...stamp("SMASHED"),
    });
  },

  scream: (power = 1) => {
    const s = get();
    if (s.phase !== "service" || s.paused || s.openingStep) return;
    // charge-and-release: short jab = cheap and brief, full roar = long
    // adrenaline window, over-held = the brigade stops answering.
    const p = Math.max(0.2, Math.min(1.4, power));
    const over = p > 1.05;
    const cost = 2 + Math.floor(s.screams / 2) + Math.round(p * 2) + (over ? 3 : 0);
    const cooks = s.cooks.map((c) =>
      c.walkedOut
        ? c
        : { ...c, morale: Math.max(0, c.morale - cost), spikes: { ...c.spikes, strainAt: s.serviceTime } }
    );
    // easter egg: screaming at an empty pass — nobody to hear it but the fridge
    const liveTickets = s.tickets.filter((t) => t.state !== "done").length;
    const emptyPass = liveTickets === 0;
    sfx(over ? "gasp" : "chorus");
    const chorusLine = over ? `"..." — nobody answers.` : pick(s.rng, BRIGADE_RESPONSES);
    speakChorus(chorusLine, over);
    if (over) {
      setTimeout(() => sfx("gasp"), 140);
      // held too long: the whole brigade takes it personally
      for (const c of cooks) if (!c.walkedOut && !c.grudge) c.grudge = "screamed at";
    }
    set({
      screamAt: performance.now(),
      chorusText: chorusLine,
      events: appendServiceEvent(s.events, { kind: "scream", at: s.serviceTime, power: p, over }),
      screams: s.screams + 1,
      adrenalineTil: s.serviceTime + 2 + 5 * Math.min(p, 1.05),
      cooks,
      ego: s.ego + (over ? -2 : 2),
      feed: tiered(
        pushFeed(
          s.feed,
          emptyPass && !over
            ? pick(s.rng, EMPTY_PASS_SCREAM)
            : over
              ? "You held it too long. The kitchen flinches — and stops."
              : s.screams === 0
                ? "You scream. The kitchen moves faster. Everyone hates you."
                : `Scream #${s.screams + 1}. It's working less.`,
          emptyPass && !over ? "info" : over ? "bad" : "drama",
          "THE PASS"
        ),
        s.ego,
        s.ego + (over ? -2 : 2)
      ),
    });
  },

  flagGuest: (id) => {
    const s = get();
    if (s.criticFlagged || s.phase !== "service" || s.paused || s.openingStep) return;
    if (s.serviceTime >= DESSERT_AT) {
      set({
        criticFlagged: true,
        events: appendServiceEvent(s.events, { kind: "critic-flag", at: s.serviceTime, result: "late" }),
        feed: pushFeed(s.feed, "Too late — they're already on the soufflé.", "bad"),
      });
      return;
    }
    const g = s.guests.find((g) => g.id === id);
    if (!g) return;
    sfx(g.isCritic ? "bell" : "gasp");
    const gilliamCraft = g.isCritic && s.career.criticPersona === "gilliam" && s.career.criticCam;
    const egoAfterFlag = s.ego + (g.isCritic ? 15 : -10) + (gilliamCraft ? 5 : 0);
    set({
      criticFlagged: true,
      criticSpotted: g.isCritic,
      ego: egoAfterFlag,
      events: appendServiceEvent(s.events, { kind: "critic-flag", at: s.serviceTime, result: g.isCritic ? "correct" : "wrong", table: g.table }),
      feed: tiered(
        pushFeed(
          s.feed,
          g.isCritic
            ? `You clock the inspector at table ${g.table}.${gilliamCraft ? GILLIAM_CAM_CRAFT : ""}`
            : `You accuse table ${g.table}. Wrong guest. They heard.`,
          g.isCritic ? "good" : "bad"
        ),
        s.ego,
        egoAfterFlag
      ),
    });
  },

  togglePause: () => {
    const s = get();
    if (s.phase !== "service" || s.glossary) return;
    set({ paused: !s.paused });
  },

  toggleGlossary: () => {
    const s = get();
    if (s.glossary) {
      set({ glossary: false, paused: s.glossaryResume ? false : s.paused, glossaryResume: false });
    } else {
      set({ glossary: true, glossaryResume: s.phase === "service" && !s.paused, paused: s.phase === "service" ? true : s.paused });
    }
  },

  initPlatform: () => {
    initOg(
      () => {
        const s = get();
        if (s.phase === "service" && !s.paused) s.togglePause();
      },
      (muted) => setMasterMuted(muted)
    );
  },

  toggleFirstPerson: () => {
    if (get().openingStep) return;
    set({ firstPerson: !get().firstPerson });
  },

  setAim: (aim) => {
    if (get().aim !== aim) set({ aim });
  },

  smotherFire: (station) => {
    const s = get();
    if (s.phase !== "service" || s.paused) return;
    const cook = s.cooks.find((c) => c.station === station && c.burning);
    if (!cook) return;
    sfx("slam", { pan: STATION_PAN[station] ?? 0 });
    setTimeout(() => sfx("applause", { pan: STATION_PAN[station] ?? 0, vol: 0.7 }), 250);
    set({
      cooks: s.cooks.map((c) =>
        c === cook ? { ...c, burning: false, overloadT: 0 } : c
      ),
      events: appendServiceEvent(s.events, { kind: "intervention", at: s.serviceTime, action: "smother", cookName: cook.name }),
      feed: pushFeed(
        s.feed,
        `You smother the fire on ${cook.name}'s station with a hotel pan. Sizzling applause.`,
        "good",
        cook.name
      ),
    });
  },
}));
