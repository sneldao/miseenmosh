import { create } from "zustand";
import { mulberry32, daySeed } from "./seed";

export type Verdict = "serve" | "sendback" | "smash";
export type Phase = "title" | "service" | "review";

export interface Ticket {
  id: number;
  dish: string;
  table: number;
  age: number; // seconds since printed
  state: "rail" | "pass" | "done";
}

export interface Guest {
  id: number;
  table: number;
  isCritic: boolean;
  tellClock: number; // when the next tell fires
}

const DISHES = [
  "Scallop, one",
  "Red mullet, crying",
  "Risotto (stood up)",
  "Lamb sauce (missing)",
  "Beef Wellington",
  "Scallop, one",
  "Foie torchon",
  "Pommes purée",
];

interface GameState {
  phase: Phase;
  rng: () => number;
  tickets: Ticket[];
  guests: Guest[];
  nextTicketIn: number;
  serviceTime: number;
  served: number;
  sentBack: number;
  smashed: number;
  morale: number; // 0..100
  ego: number;
  criticFlagged: boolean;
  screamAt: number; // timestamp of last scream (drives shake + chorus)
  start: () => void;
  tick: (dt: number) => void;
  plateToPass: (id: number) => void;
  judge: (v: Verdict) => void;
  scream: () => void;
  flagGuest: (id: number) => void;
}

let nextId = 1;

export const useGame = create<GameState>((set, get) => ({
  phase: "title",
  rng: () => Math.random(),
  tickets: [],
  guests: [],
  nextTicketIn: 2,
  serviceTime: 0,
  served: 0,
  sentBack: 0,
  smashed: 0,
  morale: 70,
  ego: 10,
  criticFlagged: false,
  screamAt: 0,

  start: () => {
    const rng = mulberry32(daySeed());
    const guests: Guest[] = [];
    const criticId = 1 + Math.floor(rng() * 5);
    for (let i = 0; i < 5; i++) {
      guests.push({
        id: i,
        table: 10 + i,
        isCritic: i === criticId,
        tellClock: 6 + rng() * 10,
      });
    }
    nextId = 1;
    set({
      phase: "service",
      rng,
      guests,
      tickets: [],
      nextTicketIn: 2,
      serviceTime: 0,
      served: 0,
      sentBack: 0,
      smashed: 0,
      morale: 70,
      criticFlagged: false,
    });
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "service") return;
    const serviceTime = s.serviceTime + dt;
    let nextTicketIn = s.nextTicketIn - dt;
    const tickets = s.tickets.map((t) => ({ ...t, age: t.age + dt }));
    if (nextTicketIn <= 0 && tickets.filter((t) => t.state !== "done").length < 8) {
      const rng = s.rng;
      tickets.push({
        id: nextId++,
        dish: DISHES[Math.floor(rng() * DISHES.length)],
        table: 10 + Math.floor(rng() * 5),
        age: 0,
        state: "rail",
      });
      // service pressure ramps: ticket gap shrinks over the night
      nextTicketIn = Math.max(3, 8 - serviceTime / 30) * (0.8 + rng() * 0.5);
    }
    set({ tickets, nextTicketIn, serviceTime });
  },

  plateToPass: (id) => {
    const s = get();
    if (s.tickets.some((t) => t.state === "pass")) return; // one plate at the pass
    set({
      tickets: s.tickets.map((t) =>
        t.id === id && t.state === "rail" ? { ...t, state: "pass" } : t
      ),
    });
  },

  judge: (v) => {
    const s = get();
    const plate = s.tickets.find((t) => t.state === "pass");
    if (!plate) return;
    set({
      tickets: s.tickets.map((t) => (t.id === plate.id ? { ...t, state: "done" } : t)),
      served: s.served + (v === "serve" ? 1 : 0),
      sentBack: s.sentBack + (v === "sendback" ? 1 : 0),
      smashed: s.smashed + (v === "smash" ? 1 : 0),
      morale: Math.min(
        100,
        Math.max(0, s.morale + (v === "serve" ? 1 : v === "sendback" ? -1.5 : -4))
      ),
      ego: s.ego + (v === "smash" ? 2 : 0),
    });
  },

  scream: () => {
    const s = get();
    set({ screamAt: performance.now(), morale: Math.max(0, s.morale - 3), ego: s.ego + 3 });
  },

  flagGuest: (id) => {
    const s = get();
    const g = s.guests.find((g) => g.id === id);
    if (!g || s.criticFlagged) return;
    set({ criticFlagged: true, ego: s.ego + (g.isCritic ? 15 : -10) });
  },
}));
