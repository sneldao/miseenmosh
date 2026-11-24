import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sound", () => ({
  sfx: vi.fn(),
  unlockAudio: vi.fn(),
  setMasterMuted: vi.fn(),
}));
vi.mock("./voice", () => ({
  speakChorus: vi.fn(),
  speakReview: vi.fn(),
}));
vi.mock("./og", () => ({
  initOg: vi.fn(),
  submitBoard: vi.fn(),
  unlockAch: vi.fn(),
  trackEvent: vi.fn(),
}));

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() { return storage.size; },
});
vi.stubGlobal("performance", { now: () => Date.now() });

async function freshGame() {
  vi.resetModules();
  const mod = await import("./state");
  return mod.useGame;
}
type Game = Awaited<ReturnType<typeof freshGame>>;
type State = ReturnType<Game["getState"]>;

const guest = (id: number, table: number, tellClock: number): State["guests"][number] => ({
  id, table, isCritic: false, kind: "walkin", tellClock, tells: 0, mercy: 1, tellAt: -1, tellKind: null,
});

describe("sendBread", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({
      phase: "service", paused: false, glossary: false, openingStep: null,
      correction: null, serviceTime: 30, breadAt: -999,
      guests: [guest(1, 12, 40), guest(2, 14, 5), guest(3, 16, 25)],
    } satisfies Partial<State>);
  });

  it("walks the basket to the most impatient table and settles it", () => {
    useGame.getState().sendBread();
    const s = useGame.getState();
    const hungriest = s.guests.find((g) => g.id === 2)!;
    expect(hungriest.tellClock).toBeCloseTo(19);
    expect(s.breadAt).toBe(30);
    expect(s.lastDelivery?.table).toBe(14);
    expect(s.lastDelivery?.plates[0].dish).toContain("Bread");
  });

  it("respects the cooldown — a second press inside 18s does nothing", () => {
    useGame.getState().sendBread();
    useGame.setState({ serviceTime: 38 } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().guests.find((g) => g.id === 2)!.tellClock).toBeCloseTo(19);
  });

  it("is gated during the opening teach and outside service", () => {
    useGame.setState({ openingStep: "serve" } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().breadAt).toBe(-999);
    useGame.setState({ openingStep: null, phase: "briefing" } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().breadAt).toBe(-999);
  });
});

describe("expedite", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({
      phase: "service", paused: false, glossary: false, openingStep: null,
      serviceTime: 30, nextTicketIn: 6, tickets: [],
    } satisfies Partial<State>);
  });

  it("pulls the next order onto the rail immediately", () => {
    useGame.getState().expedite();
    expect(useGame.getState().nextTicketIn).toBe(0);
  });

  it("is a no-op when the printer is already firing or the room is drowned", () => {
    useGame.setState({ nextTicketIn: 0.3 } satisfies Partial<State>);
    const before = useGame.getState().feed.length;
    useGame.getState().expedite();
    expect(useGame.getState().feed.length).toBe(before);
    // nine live tickets = the rail cap; expedite must not overfill it
    const rail = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1, table: 10 + i, dish: "Beef Wellington", station: 0,
      state: "rail" as const, plateAt: 0, plateDur: 0, byChef: false,
      age: 0, quality: -1, sear: null,
    }));
    useGame.setState({ nextTicketIn: 8, tickets: rail as State["tickets"] } satisfies Partial<State>);
    useGame.getState().expedite();
    expect(useGame.getState().nextTicketIn).toBe(8);
  });
});
