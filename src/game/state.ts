import { create } from "zustand";
import { mulberry32, daySeed } from "./seed";

export type Verdict = "serve" | "sendback" | "smash";
export type Phase = "title" | "service" | "review";
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

const SERVICE_LEN = 150;
const TICKET_TTL = 55;
const WALKOUT_AT = 12;

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
  screamAt: number;
  smashAt: number;
  review: Review | null;
  start: () => void;
  tick: (dt: number) => void;
  plateToPass: (id: number) => void;
  judge: (v: Verdict) => void;
  scream: () => void;
  flagGuest: (id: number) => void;
}

function pushFeed(feed: FeedItem[], text: string, kind: FeedItem["kind"]) {
  return [...feed.slice(-23), { id: feedId++, text, kind }];
}

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
  screamAt: 0,
  smashAt: 0,
  review: null,

  start: () => {
    const rng = mulberry32(daySeed());
    const criticId = Math.floor(rng() * 5);
    const guests: Guest[] = [];
    for (let i = 0; i < 5; i++) {
      guests.push({
        id: i,
        table: 10 + i,
        isCritic: i === criticId,
        tellClock: i === criticId ? 7 + rng() * 6 : 40 + rng() * 40,
        tellAt: -1,
      });
    }
    nextId = 1;
    feedId = 1;
    set({
      phase: "service",
      rng,
      guests,
      cooks: COOK_ROSTER.map((c, i) => ({ ...c, id: i, morale: 70, walkedOut: false })),
      tickets: [],
      feed: [
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
      review: null,
    });
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "service") return;
    const serviceTime = s.serviceTime + dt;
    const rng = s.rng;
    let { feed, ego, complaints, misses, served, qualitySum } = s;
    let nextTicketIn = s.nextTicketIn - dt;

    // --- tickets: age, expire, finish plating ---
    const tickets: Ticket[] = [];
    for (const t of s.tickets) {
      if (t.state === "done") continue;
      const age = t.age + dt;
      if (t.state === "plating" && serviceTime >= t.plateAt) {
        const cook = s.cooks.find((c) => c.station === t.station);
        const chefPenalty = t.byChef ? 12 : 0;
        const quality = Math.max(
          5,
          Math.min(
            100,
            38 +
              (cook?.skill ?? 0.5) * 30 +
              ((cook?.morale ?? 50) - 50) * 0.35 -
              age * 0.5 -
              chefPenalty +
              (rng() - 0.5) * 30
          )
        );
        tickets.push({ ...t, age, state: "pass", quality });
        continue;
      }
      if (age > TICKET_TTL) {
        feed = pushFeed(feed, `Table ${t.table} walks — ${t.dish} never came.`, "bad");
        misses += 1;
        continue;
      }
      tickets.push({ ...t, age });
    }

    // --- new tickets ---
    const live = tickets.filter((t) => t.state !== "done").length;
    if (nextTicketIn <= 0 && live < 9) {
      const d = DISHES[Math.floor(rng() * DISHES.length)];
      tickets.push({
        id: nextId++,
        dish: d.name,
        table: 10 + Math.floor(rng() * 5),
        station: d.station,
        age: 0,
        state: "rail",
        plateAt: 0,
        plateDur: 0,
        byChef: false,
        quality: -1,
        verdict: null,
      });
      nextTicketIn = Math.max(2.5, 7.5 - serviceTime / 25) * (0.8 + rng() * 0.5);
    }

    // --- cooks: morale decay under load, walkouts ---
    const cooks = s.cooks.map((c) => {
      if (c.walkedOut) return c;
      const load = tickets.filter((t) => t.station === c.station && t.state !== "done").length;
      // idle stations recover; loaded stations drain — drowning is what kills
      const drain = load === 0 ? -1.4 : 0.22 + load * 0.15;
      const morale = Math.min(100, Math.max(0, c.morale - dt * drain));
      if (morale <= WALKOUT_AT) {
        feed = pushFeed(feed, `${c.name} throws their apron. WALKOUT.`, "drama");
        ego += 4; // the room watches
        return { ...c, morale, walkedOut: true };
      }
      return { ...c, morale };
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
        },
      });
      return;
    }

    set({ tickets, cooks, guests, feed, nextTicketIn, serviceTime, ego, complaints, misses, served, qualitySum });
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
    let { feed, ego, served, sentBack, smashed, complaints, qualitySum } = s;
    const cooks = s.cooks.map((c) => ({ ...c }));
    const cook = cooks[plate.station];

    if (v === "serve") {
      served += 1;
      qualitySum += plate.quality;
      if (plate.quality >= 72) {
        feed = pushFeed(feed, `Table ${plate.table}: clean plate club.`, "good");
        if (cook) cook.morale = Math.min(100, cook.morale + 3);
      } else if (plate.quality >= 45) {
        feed = pushFeed(feed, `Table ${plate.table} eats in silence. Acceptable.`, "info");
      } else {
        complaints += 1;
        feed = pushFeed(feed, `Table ${plate.table} sends it back. Loudly.`, "bad");
        if (cook) cook.morale = Math.max(0, cook.morale - 5);
      }
      set({
        tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done", verdict: v } : t)),
        served,
        complaints,
        qualitySum,
        cooks,
        feed,
      });
      return;
    }

    if (v === "sendback") {
      sentBack += 1;
      feed = pushFeed(feed, `Back to ${cook?.name ?? "the pass"}: "${plate.dish}. Again."`, "info");
      if (cook) cook.morale = Math.max(0, cook.morale - 3);
      set({
        tickets: s.tickets.map((t) =>
          t.id === plate.id ? { ...t, state: "rail", age: t.age * 0.4, quality: -1 } : t
        ),
        sentBack,
        cooks,
        feed,
      });
      return;
    }

    // smash
    smashed += 1;
    ego += 4;
    feed = pushFeed(feed, `You launch the ${plate.dish} into the tiles. The room stares.`, "drama");
    if (cook && !cook.walkedOut) cook.morale = Math.max(0, cook.morale - 6);
    set({
      tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done", verdict: v } : t)),
      smashed,
      ego,
      cooks,
      feed,
      smashAt: performance.now(),
    });
  },

  scream: () => {
    const s = get();
    if (s.phase !== "service") return;
    const cost = 3 + Math.floor(s.screams / 2);
    const cooks = s.cooks.map((c) =>
      c.walkedOut ? c : { ...c, morale: Math.max(0, c.morale - cost) }
    );
    set({
      screamAt: performance.now(),
      screams: s.screams + 1,
      adrenalineTil: s.serviceTime + 6,
      cooks,
      ego: s.ego + 2,
      feed: pushFeed(
        s.feed,
        s.screams === 0
          ? "You scream. The kitchen moves faster. Everyone hates you."
          : `Scream #${s.screams + 1}. It's working less.`,
        "drama"
      ),
    });
  },

  flagGuest: (id) => {
    const s = get();
    if (s.criticFlagged || s.phase !== "service") return;
    const g = s.guests.find((g) => g.id === id);
    if (!g) return;
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
}));
