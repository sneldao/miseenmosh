import { create } from "zustand";
import { mulberry32, daySeed } from "./seed";
import { sfx, unlockAudio } from "./sound";
import { CHEF_BARKS, STATION_BARKS, BRIGADE_RESPONSES, GUEST_HECKLES, RIVAL_LINES, pick } from "./barks";

export type Verdict = "serve" | "sendback" | "smash";
export type Phase = "title" | "briefing" | "service" | "review" | "ending";
export type PlateTier = "pristine" | "serviceable" | "criminal";

export interface Ticket {
  id: number;
  dish: string;
  table: number;
  station: number;
  age: number;
  state: "rail" | "plating" | "pass" | "done";
  /** serviceTime when plating completes */
  plateAt: number;
  plateDur: number;
  /** true when the chef covers a walked-out station */
  byChef: boolean;
  quality: number;
  verdict: Verdict | null;
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
}

export interface Guest {
  id: number;
  table: number;
  isCritic: boolean;
  tellClock: number;
  /** serviceTime of last tell burst; drives the phone flash */
  tellAt: number;
}

export interface FeedItem {
  id: number;
  text: string;
  kind: "info" | "good" | "bad" | "drama";
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

const COOK_ROSTER: { name: string; station: number; skill: number }[] = [
  { name: "PETRA", station: 0, skill: 0.72 },
  { name: "DIMITRI", station: 1, skill: 0.55 },
  { name: "ANWAR", station: 2, skill: 0.64 },
];

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
  cost: number;
  station: number; // -1 = whole kitchen
  qBonus: number;
  contested: boolean; // BEEFCAKES wants it too
  bought: boolean;
}

// the morning fish market — what the sea surrendered today
const LOT_DECK: Omit<Lot, "bought">[] = [
  { name: "Day-boat scallops", desc: "still twitching. sea dishes +7", cost: 45, station: -1, qBonus: 7, contested: false },
  { name: "Dry-aged belted beef", desc: "28 days of funk. grill +8", cost: 60, station: 0, qBonus: 8, contested: true },
  { name: "Heritage tomatoes", desc: "ugly, perfect. sauté +6", cost: 35, station: 1, qBonus: 6, contested: false },
  { name: "Normandy butter", desc: "a brick of gold. pastry +6", cost: 40, station: 2, qBonus: 6, contested: false },
  { name: "Yesterday's fish", desc: "technically fish. everything −2, but it's £8", cost: 8, station: -1, qBonus: -2, contested: false },
  { name: "A lamb", desc: "with the sauce already inside it. grill +9", cost: 70, station: 0, qBonus: 9, contested: true },
  { name: "Saffron threads", desc: "worth more than the pans. sauté +8", cost: 65, station: 1, qBonus: 8, contested: true },
  { name: "Farm eggs, still warm", desc: "the hen glared. pastry +5", cost: 28, station: 2, qBonus: 5, contested: false },
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

let nextId = 1;
let feedId = 1;

interface GameState {
  phase: Phase;
  rng: () => number;
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
  screamAt: number;
  smashAt: number;
  chorusText: string;
  stampText: string;
  stampAt: number;
  paused: boolean;
  /** user preference: embodied first-person pass during service */
  firstPerson: boolean;
  /** what the centre of the screen is aimed at, for the reticle */
  aim: "fire" | "guest" | "ticket" | "station" | null;
  rivalIdx: number;
  rivalAt: number; // serviceTime of last Beefcakes appearance
  barkAt: number;
  criticAnnounced: boolean;
  criticServed: number;
  criticQ: number;
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
  start: () => void;
  startService: () => void;
  continueNext: () => void;
  briefAction: (id: "drinks" | "gear" | "press") => void;
  feudChoice: (i: number) => void;
  buyLot: (i: number, outbid: boolean) => void;
  resetCareer: () => void;
  tick: (dt: number) => void;
  plateToPass: (id: number) => void;
  judge: (v: Verdict) => void;
  scream: (power?: number) => void;
  flagGuest: (id: number) => void;
  togglePause: () => void;
  toggleFirstPerson: () => void;
  setAim: (aim: "fire" | "guest" | "ticket" | "station" | null) => void;
  smotherFire: (station: number) => void;
}

function pushFeed(feed: FeedItem[], text: string, kind: FeedItem["kind"]) {
  return [...feed.slice(-23), { id: feedId++, text, kind }];
}

function spawnTicket(rng: () => number, criticTable = -1): Ticket {
  let d = DISHES[Math.floor(rng() * DISHES.length)];
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
    byChef: false,
    quality: -1,
    verdict: null,
  };
}

function freshCareer(): Career {
  return { night: 1, cash: 120, stars: 0, venue: 0, gear: 0, defections: 0, aggro: 0 };
}

const SAVE_KEY = "mem-career";

function saveCareer(career: Career, cooks: Cook[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ career, cooks }));
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

function loadSave(): { career: Career; cooks: Cook[] } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.career || !Array.isArray(p.cooks)) return null;
    return p;
  } catch {
    return null;
  }
}

type NightFields = "walkedOut" | "overloadT" | "burning" | "walkoutAt";
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
  return { ...c, walkedOut: false, overloadT: 0, burning: false, walkoutAt: -1 };
}

function makeFeud(career: Career, cooks: Cook[]): Feud | null {
  if (career.night <= 1) return null;
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

const bootSave = loadSave();

export const useGame = create<GameState>((set, get) => ({
  phase: "title",
  rng: () => Math.random(),
  tickets: [],
  guests: [],
  cooks: [],
  feed: [],
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
  barkAt: 16,
  criticAnnounced: false,
  criticServed: 0,
  criticQ: 0,
  review: null,
  career: bootSave?.career ?? freshCareer(),
  feud: null,
  spawnMul: 1,
  tellMul: 1,
  nightTake: null,
  lots: [],
  menuBuffs: [0, 0, 0],
  hasSave: !!bootSave,
  canSave: canPersist(),

  start: () => {
    unlockAudio();
    const saved = loadSave();
    if (saved) {
      const cooks = saved.cooks.map(withFreshNight);
      const career = saved.career;
      set({
        phase: career.night > MAX_NIGHTS ? "ending" : "briefing",
        career,
        cooks,
        feud: makeFeud(career, cooks),
        lots: makeLots(career.night),
        menuBuffs: [0, 0, 0],
        hasSave: true,
        feed: [],
      });
      return;
    }
    get().resetCareer();
  },

  resetCareer: () => {
    unlockAudio();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    const career = freshCareer();
    const cooks = COOK_ROSTER.map((c, i) =>
      withFreshNight({ ...c, id: i, morale: 70, trauma: 0 })
    );
    set({
      phase: "briefing",
      career,
      cooks,
      feud: null,
      hasSave: false,
      feed: [{ id: feedId++, text: `Night 1 — ${VENUES[0].name}. ${VENUES[0].sub}.`, kind: "info" }],
      review: null,
      nightTake: null,
      lots: makeLots(1),
      menuBuffs: [0, 0, 0],
    });
  },

  startService: () => {
    unlockAudio();
    const s = get();
    const career = s.career;
    const v = VENUES[career.venue];
    const rng = mulberry32(daySeed() + career.night * 104729);
    const criticId = Math.floor(rng() * 5);
    const guests: Guest[] = [];
    for (let i = 0; i < 5; i++) {
      guests.push({
        id: i,
        table: 10 + i,
        isCritic: i === criticId,
        tellClock: (i === criticId ? 7 + rng() * 6 : 40 + rng() * 40) * v.tellMul,
        tellAt: -1,
      });
    }
    nextId = 1;
    feedId = 1;
    set({
      phase: "service",
      rng,
      guests,
      spawnMul: v.spawnMul,
      tellMul: v.tellMul,
      // cooks persist across nights — they rest a little, they don't forget
      cooks: s.cooks.map((c) => withFreshNight({ ...c, morale: Math.min(85, c.morale + 20) })),
      tickets: [],
      feed: [
        { id: feedId++, text: `Night ${career.night} — ${v.name}. ${v.sub}.`, kind: "drama" },
        { id: feedId++, text: "Doors open. Somewhere out there is the inspector.", kind: "info" },
      ],
      nextTicketIn: 1.5,
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
      chorusText: `"YES, CHEF!"`,
      stampText: "",
      stampAt: 0,
      paused: false,
      rivalIdx: 0,
      rivalAt: -10,
      barkAt: 16 + rng() * 10,
      criticAnnounced: false,
      criticServed: 0,
      criticQ: 0,
      review: null,
    });
  },

  continueNext: () => {
    const s = get();
    if (s.phase !== "review" || !s.review) return;
    const v = VENUES[s.career.venue];
    const covers = s.served * v.price;
    // walked-out cooks still expect half pay — storming off doesn't kill the bill
    const wages =
      30 * s.cooks.filter((c) => !c.walkedOut).length +
      15 * s.cooks.filter((c) => c.walkedOut).length;
    const breakage = s.smashed * 12;
    const net = covers - wages - breakage;
    const c = s.career;
    const career: Career = {
      ...c,
      night: c.night + 1,
      cash: c.cash + net,
      stars: c.stars + s.review.stars,
    };
    career.venue = venueFor(career.stars);
    const cooks = s.cooks.map((k) => ({
      ...k,
      walkedOut: false,
      trauma: k.trauma + (k.walkedOut ? 1 : 0),
    }));
    const nightTake = { covers, wages, breakage, net };
    saveCareer(career, cooks);
    const done = career.night > MAX_NIGHTS || career.cash < -60;
    set({
      phase: done ? "ending" : "briefing",
      career,
      cooks,
      nightTake,
      feud: done ? null : makeFeud(career, cooks),
      lots: done ? [] : makeLots(career.night),
      menuBuffs: [0, 0, 0],
      hasSave: true,
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

  feudChoice: (i) => {
    const s = get();
    if (s.phase !== "briefing" || !s.feud || s.feud.resolved) return;
    const idx = (s.career.night - 2) % FEUD_DECK.length;
    const c = { ...s.career };
    let cooks = s.cooks.map((k) => ({ ...k }));
    let outcome: string;
    if (idx === 0) {
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
    const c = { ...s.career, cash: s.career.cash - price };
    if (lot.contested) c.aggro += 1;
    const menuBuffs = [...s.menuBuffs];
    if (lot.station < 0) menuBuffs.forEach((_, k) => (menuBuffs[k] += lot.qBonus));
    else menuBuffs[lot.station] += lot.qBonus;
    saveCareer(c, s.cooks);
    set({
      career: c,
      menuBuffs,
      lots: s.lots.map((l, j) => (j === i ? { ...l, bought: true } : l)),
      feed: pushFeed(
        s.feed,
        lot.contested
          ? `You outbid BEEFCAKES for the ${lot.name}. He watched you take it home.`
          : `Bought the ${lot.name}. Tonight eats better.`,
        "good"
      ),
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
    let nextTicketIn = s.nextTicketIn - dt;
    let dessertDone = s.dessertDone;

    // --- tickets: age, expire, finish plating ---
    const tickets: Ticket[] = [];
    for (const t of s.tickets) {
      if (t.state === "done") continue;
      const age = t.age + dt;
      if (t.state === "plating" && serviceTime >= t.plateAt) {
        const cook = s.cooks.find((c) => c.station === t.station);
        // a broken cook fumbles — plate in the bin, ticket back on the rail
        if (cook && !cook.walkedOut && cook.morale < 30 && rng() < 0.15) {
          feed = pushFeed(feed, `${cook.name} fumbles the ${t.dish} — straight in the bin.`, "bad");
          sfx("shatter");
          cook.morale = Math.max(0, cook.morale - 3);
          tickets.push({ ...t, state: "rail", age: age * 0.6, quality: -1 });
          continue;
        }
        const chefPenalty = t.byChef ? 12 : 0;
        const burnPenalty = cook?.burning ? 8 : 0;
        const marketBonus = s.menuBuffs[t.station] ?? 0;
        const quality = Math.max(
          5 + s.career.gear * 3,
          Math.min(
            100,
            38 +
              (cook?.skill ?? 0.5) * 30 +
              ((cook?.morale ?? 50) - 50) * 0.35 -
              age * 0.5 -
              chefPenalty -
              burnPenalty +
              marketBonus +
              (rng() - 0.5) * 30
          )
        );
        tickets.push({ ...t, age, state: "pass", quality });
        sfx("bell");
        continue;
      }
      if (age > TICKET_TTL) {
        feed = pushFeed(feed, `Table ${t.table} walks — ${t.dish} never came.`, "bad");
        sfx("gasp");
        misses += 1;
        streak = 0;
        continue;
      }
      tickets.push({ ...t, age });
    }

    // --- dessert course: one-time stampede, then faster printer ---
    if (!dessertDone && serviceTime >= DESSERT_AT) {
      dessertDone = true;
      feed = pushFeed(
        feed,
        "DESSERT COURSE. If the inspector's out there, they're on the soufflé now.",
        "drama"
      );
      sfx("sting");
      for (let i = 0; i < 3; i++) tickets.push(spawnTicket(rng, criticTable));
    }

    // --- new tickets ---
    const live = tickets.filter((t) => t.state !== "done").length;
    if (nextTicketIn <= 0 && live < 9) {
      const t = spawnTicket(rng, criticTable);
      tickets.push(t);
      sfx("print");
      if (t.table === criticTable && !criticAnnounced) {
        criticAnnounced = true;
        feed = pushFeed(feed, "The inspector ordered the Wellington. Of course.", "drama");
      }
      const floor = dessertDone ? 1.8 : 2.5;
      nextTicketIn =
        Math.max(floor, 7.5 - serviceTime / 25) * s.spawnMul * (0.8 + rng() * 0.5);
    }

    // --- ambient bark: general rage, or a station-directed insult ---
    if (serviceTime >= barkAt) {
      const target = s.cooks.find((c) => !c.walkedOut && rng() < 0.4);
      feed = pushFeed(
        feed,
        target
          ? pick(rng, STATION_BARKS[target.station]).replace("{N}", target.name)
          : pick(rng, CHEF_BARKS),
        "drama"
      );
      barkAt = serviceTime + 16 + rng() * 14;
    }

    // --- BEEFCAKES does something unforgivable ---
    const rivalTimes = [35, 75, 118];
    let rivalAt = s.rivalAt;
    if (rivalIdx < rivalTimes.length && serviceTime >= rivalTimes[rivalIdx]) {
      rivalAt = serviceTime;
      const steal = rivalIdx === 1 || (rivalIdx === 2 && s.career.aggro > 0);
      if (steal) {
        const victim = tickets.find((t) => t.state === "rail");
        if (victim) {
          victim.state = "done";
          feed = pushFeed(
            feed,
            `BEEFCAKES' runner snatches table ${victim.table}'s order off your rail.`,
            "drama"
          );
          sfx("rip");
        } else {
          feed = pushFeed(feed, pick(rng, RIVAL_LINES), "drama");
        }
      } else {
        feed = pushFeed(feed, pick(rng, RIVAL_LINES), "drama");
      }
      rivalIdx += 1;
    }

    // --- cooks: overload → fires, morale decay under load, walkouts ---
    const cooks = s.cooks.map((c) => {
      if (c.walkedOut) return c;
      const load = tickets.filter((t) => t.station === c.station && t.state !== "done").length;
      // drowning stations ignite — 3+ live tickets for 8s and the grease goes up
      let overloadT = load >= 3 ? c.overloadT + dt : Math.max(0, c.overloadT - 2 * dt);
      let burning = c.burning;
      if (!burning && overloadT > 8) {
        burning = true;
        overloadT = 0;
        feed = pushFeed(
          feed,
          `FLAMBÉ NOBODY ORDERED — ${c.name}'s station is ON FIRE. Click it. Smother it.`,
          "drama"
        );
        sfx("sting");
      }
      // idle stations recover; loaded stations drain — drowning is what kills.
      // trauma from past walkouts makes them fragile forever; fire is worse.
      const drain = load === 0 ? -1.4 : (0.22 + load * 0.15) * (1 + c.trauma * 0.35);
      const morale = Math.min(100, Math.max(0, c.morale - dt * drain * (burning ? 2 : 1)));
      if (morale <= WALKOUT_AT) {
        feed = pushFeed(feed, `${c.name} throws their apron. WALKOUT.`, "drama");
        sfx("sting");
        ego += 4; // the room watches
        return { ...c, morale, overloadT, burning, walkedOut: true, walkoutAt: serviceTime };
      }
      return { ...c, morale, overloadT, burning };
    });
    // stalled plating on a walked-out station → the chef finishes it, slower
    for (const t of tickets) {
      if (t.state === "plating" && !t.byChef && cooks[t.station]?.walkedOut) {
        t.byChef = true;
        t.plateAt = serviceTime + (t.plateAt - serviceTime) * 1.8 + 0.5;
        feed = pushFeed(feed, `You dive on ${cooks[t.station].name}'s station yourself.`, "info");
      }
    }

    // --- critic tells ---
    const guests = s.guests.map((g) => {
      const tellClock = g.tellClock - dt;
      if (tellClock <= 0) {
        const isCrit = g.isCritic;
        if (!s.criticFlagged) {
          feed = pushFeed(
            feed,
            isCrit
              ? `Table ${g.table} keeps photographing the plate. And writing.`
              : `Table ${g.table} is taking photos.`,
            isCrit ? "drama" : "info"
          );
        }
        return {
          ...g,
          tellAt: serviceTime,
          tellClock: isCrit ? 9 + rng() * 7 : 60 + rng() * 50,
        };
      }
      return { ...g, tellClock };
    });

    // --- night ends ---
    const allOut = cooks.every((c) => c.walkedOut);
    if (serviceTime >= SERVICE_LEN || allOut) {
      const avgQuality = served > 0 ? qualitySum / served : 0;
      const spotted = s.criticSpotted;
      const walkouts = cooks.filter((c) => c.walkedOut).length;
      let stars = 4;
      stars += avgQuality >= 72 ? 1 : avgQuality < 45 ? -1 : 0;
      stars -= Math.min(2, complaints);
      stars -= Math.min(2, misses);
      stars -= walkouts;
      stars += spotted ? 1 : 0;
      stars += s.smashed >= 3 && misses === 0 ? 1 : 0; // theatre bonus
      stars = Math.max(0, Math.min(5, stars));
      const bank = REVIEW_QUOTES[stars];
      let quote = bank[Math.floor(rng() * bank.length)];
      if (s.smashed >= 3) quote += " — crockery budget: exceeded.";
      if (allOut) quote = "The brigade abandoned ship mid-service. " + quote;
      const criticAvg = s.criticServed > 0 ? s.criticQ / s.criticServed : -1;
      const criticVerdict = !s.criticSpotted
        ? "The inspector left unidentified."
        : criticAvg < 0
          ? "You clocked them, then never fed them."
          : criticAvg >= 72
            ? "The inspector wrote home about the Wellington."
            : criticAvg >= 45
              ? "The inspector nodded, once."
              : "The inspector photographed it. For evidence.";
      sfx("review");
      set({
        phase: "review",
        tickets,
        cooks,
        guests,
        feed,
        serviceTime,
        review: {
          stars,
          quote,
          covers: served,
          avgQuality,
          complaints,
          misses,
          walkouts,
          smashed: s.smashed,
          spotted,
          ego,
          bestStreak,
          criticVerdict,
        },
      });
      return;
    }

    set({
      tickets, cooks, guests, feed, nextTicketIn, serviceTime,
      ego, complaints, misses, served, qualitySum, streak, bestStreak, dessertDone,
      barkAt, rivalIdx, rivalAt, criticAnnounced,
    });
  },

  plateToPass: (id) => {
    const s = get();
    if (s.phase !== "service") return;
    if (s.tickets.some((t) => t.state === "pass" || t.state === "plating")) return;
    const t = s.tickets.find((t) => t.id === id && t.state === "rail");
    if (!t) return;
    const cook = s.cooks.find((c) => c.station === t.station);
    const walkedOut = cook?.walkedOut ?? false;
    const adrenaline = s.serviceTime < s.adrenalineTil;
    let dur = 2.0 + (1 - (cook?.skill ?? 0.5)) * 2.5 + s.rng() * 1.2;
    if (walkedOut) dur *= 1.8;
    if (adrenaline) dur /= 1.7;
    set({
      tickets: s.tickets.map((x) =>
        x.id === id
          ? { ...x, state: "plating", plateAt: s.serviceTime + dur, plateDur: dur, byChef: walkedOut }
          : x
      ),
      feed: walkedOut
        ? pushFeed(s.feed, `Nobody on ${cook?.name}'s station — you're plating it yourself.`, "info")
        : s.feed,
    });
  },

  judge: (v) => {
    const s = get();
    const plate = s.tickets.find((t) => t.state === "pass");
    if (!plate) return;
    let { feed, ego, served, sentBack, smashed, complaints, qualitySum, streak, bestStreak } = s;
    let { criticServed, criticQ } = s;
    const cooks = s.cooks.map((c) => ({ ...c }));
    const cook = cooks[plate.station];
    const criticTable = s.guests.find((g) => g.isCritic)?.table;
    const stamp = (text: string) => ({ stampText: text, stampAt: performance.now() });

    if (v === "serve") {
      served += 1;
      qualitySum += plate.quality;
      sfx("slam");
      if (plate.table === criticTable) {
        criticServed += 1;
        criticQ += plate.quality;
      }
      if (plate.quality >= 45) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        if (plate.quality >= 72) {
          feed = pushFeed(feed, `Table ${plate.table}: clean plate club.`, "good");
          if (cook) cook.morale = Math.min(100, cook.morale + 3);
        } else {
          feed = pushFeed(feed, `Table ${plate.table} eats in silence. Acceptable.`, "info");
        }
        if (streak > 0 && streak % 5 === 0) {
          feed = pushFeed(feed, `The kitchen is humming — streak ×${streak}.`, "drama");
          ego += 2;
          for (const c of cooks) if (!c.walkedOut) c.morale = Math.min(100, c.morale + 2);
        }
      } else {
        complaints += 1;
        streak = 0;
        feed = pushFeed(feed, `Table ${plate.table} sends it back. Loudly.`, "bad");
        feed = pushFeed(feed, pick(s.rng, GUEST_HECKLES).replace("{T}", String(plate.table)), "bad");
        if (cook) cook.morale = Math.max(0, cook.morale - 5);
      }
      set({
        tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done", verdict: v } : t)),
        served,
        complaints,
        qualitySum,
        cooks,
        feed,
        ego,
        streak,
        bestStreak,
        criticServed,
        criticQ,
        ...stamp("SERVED"),
      });
      return;
    }

    if (v === "sendback") {
      sentBack += 1;
      sfx("rip");
      feed = pushFeed(feed, `Back to ${cook?.name ?? "the pass"}: "${plate.dish}. Again."`, "info");
      if (cook) cook.morale = Math.max(0, cook.morale - 3);
      set({
        tickets: s.tickets.map((t) =>
          t.id === plate.id ? { ...t, state: "rail", age: t.age * 0.4, quality: -1 } : t
        ),
        sentBack,
        cooks,
        feed,
        ...stamp("SENT BACK"),
      });
      return;
    }

    // smash
    smashed += 1;
    streak = 0;
    ego += 4;
    sfx("shatter");
    setTimeout(() => sfx("gasp"), 120);
    feed = pushFeed(feed, `You launch the ${plate.dish} into the tiles. The room stares.`, "drama");
    if (cook && !cook.walkedOut) cook.morale = Math.max(0, cook.morale - 6);
    set({
      tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done", verdict: v } : t)),
      smashed,
      ego,
      cooks,
      feed,
      streak,
      smashAt: performance.now(),
      ...stamp("SMASHED"),
    });
  },

  scream: (power = 1) => {
    const s = get();
    if (s.phase !== "service") return;
    // charge-and-release: short jab = cheap and brief, full roar = long
    // adrenaline window, over-held = the brigade stops answering.
    const p = Math.max(0.2, Math.min(1.4, power));
    const over = p > 1.05;
    const cost = 2 + Math.floor(s.screams / 2) + Math.round(p * 2) + (over ? 3 : 0);
    const cooks = s.cooks.map((c) =>
      c.walkedOut ? c : { ...c, morale: Math.max(0, c.morale - cost) }
    );
    sfx(over ? "gasp" : "chorus");
    if (over) setTimeout(() => sfx("gasp"), 140);
    set({
      screamAt: performance.now(),
      chorusText: over
        ? `"..." — nobody answers.`
        : pick(s.rng, BRIGADE_RESPONSES),
      screams: s.screams + 1,
      adrenalineTil: s.serviceTime + 2 + 5 * Math.min(p, 1.05),
      cooks,
      ego: s.ego + (over ? -2 : 2),
      feed: pushFeed(
        s.feed,
        over
          ? "You held it too long. The kitchen flinches — and stops."
          : s.screams === 0
            ? "You scream. The kitchen moves faster. Everyone hates you."
            : `Scream #${s.screams + 1}. It's working less.`,
        over ? "bad" : "drama"
      ),
    });
  },

  flagGuest: (id) => {
    const s = get();
    if (s.criticFlagged || s.phase !== "service") return;
    if (s.serviceTime >= DESSERT_AT) {
      set({
        criticFlagged: true,
        feed: pushFeed(s.feed, "Too late — they're already on the soufflé.", "bad"),
      });
      return;
    }
    const g = s.guests.find((g) => g.id === id);
    if (!g) return;
    sfx(g.isCritic ? "bell" : "gasp");
    set({
      criticFlagged: true,
      criticSpotted: g.isCritic,
      ego: s.ego + (g.isCritic ? 15 : -10),
      feed: pushFeed(
        s.feed,
        g.isCritic
          ? `You clock the inspector at table ${g.table}. Comped before they asked.`
          : `You accuse table ${g.table}. Wrong guest. They heard.`,
        g.isCritic ? "good" : "bad"
      ),
    });
  },

  togglePause: () => {
    const s = get();
    if (s.phase !== "service") return;
    set({ paused: !s.paused });
  },

  toggleFirstPerson: () => {
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
    sfx("slam");
    set({
      cooks: s.cooks.map((c) =>
        c === cook ? { ...c, burning: false, overloadT: 0 } : c
      ),
      feed: pushFeed(
        s.feed,
        `You smother the fire on ${cook.name}'s station with a hotel pan. Sizzling applause.`,
        "good"
      ),
    });
  },
}));
