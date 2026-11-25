import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sound", () => ({
  sfx: vi.fn(),
  unlockAudio: vi.fn(),
  setMasterMuted: vi.fn(),
}));
vi.mock("./voice", () => ({
  speakChorus: vi.fn(),
  speakLine: vi.fn(),
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

  it("walks the basket to the most impatient table, charges £3, and buys patience only", () => {
    const cash = useGame.getState().career.cash;
    const quality = useGame.getState().qualitySum;
    useGame.getState().sendBread();
    const s = useGame.getState();
    const hungriest = s.guests.find((g) => g.id === 2)!;
    expect(hungriest.tellClock).toBeCloseTo(19);
    expect(s.breadAt).toBe(30);
    expect(s.career.cash).toBe(cash - 3);
    expect(s.qualitySum).toBe(quality);
    expect(s.lastDelivery?.table).toBe(14);
    expect(s.lastDelivery?.plates[0].dish).toContain("Bread");
  });

  it("fails closed without £3 and charges nothing", () => {
    useGame.setState({ career: { ...useGame.getState().career, cash: 2 } } satisfies Partial<State>);
    useGame.getState().sendBread();
    const s = useGame.getState();
    expect(s.breadAt).toBe(-999);
    expect(s.career.cash).toBe(2);
    expect(s.guests.find((g) => g.id === 2)!.tellClock).toBe(5);
    expect(s.lastDelivery).toBeNull();
  });

  it("respects the cooldown — a second press inside 18s does nothing or charge again", () => {
    useGame.getState().sendBread();
    const cash = useGame.getState().career.cash;
    useGame.setState({ serviceTime: 38 } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().guests.find((g) => g.id === 2)!.tellClock).toBeCloseTo(19);
    expect(useGame.getState().career.cash).toBe(cash);
  });

  it("is gated during the opening teach and outside service", () => {
    const cash = useGame.getState().career.cash;
    useGame.setState({ openingStep: "serve" } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().breadAt).toBe(-999);
    useGame.setState({ openingStep: null, phase: "briefing" } satisfies Partial<State>);
    useGame.getState().sendBread();
    expect(useGame.getState().breadAt).toBe(-999);
    expect(useGame.getState().career.cash).toBe(cash);
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

  it("pulls the next order onto the rail immediately and adds explicit station pressure", () => {
    const before = useGame.getState().cooks.map((c) => c.overloadT);
    useGame.getState().expedite();
    const s = useGame.getState();
    expect(s.nextTicketIn).toBe(0);
    expect(s.cooks.map((c) => c.overloadT)).toEqual(before.map((n) => n + 2));
    expect(s.feed.at(-1)!.text).toContain("+2 pressure");
  });

  it("is a no-op when the printer is already firing or the room is drowned", () => {
    useGame.setState({ nextTicketIn: 0.3 } satisfies Partial<State>);
    const before = useGame.getState();
    useGame.getState().expedite();
    expect(useGame.getState().feed.length).toBe(before.feed.length);
    expect(useGame.getState().cooks).toBe(before.cooks);
    // nine live tickets = the rail cap; expedite must not overfill it
    const rail = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1, table: 10 + i, dish: "Beef Wellington", station: 0,
      state: "rail" as const, plateAt: 0, plateDur: 0, byChef: false,
      age: 0, quality: -1, sear: null,
    }));
    useGame.setState({ nextTicketIn: 8, tickets: rail as State["tickets"] } satisfies Partial<State>);
    const capped = useGame.getState();
    useGame.getState().expedite();
    expect(useGame.getState().nextTicketIn).toBe(8);
    expect(useGame.getState().cooks).toBe(capped.cooks);
  });
});

describe("eightySix", () => {
  let useGame: Game;
  const ticket = (over: Partial<State["tickets"][number]>): State["tickets"][number] => ({
    id: 1, dish: "Beef Wellington", table: 11, station: 0, age: 10,
    state: "rail", plateAt: 0, plateDur: 0, byChef: false,
    quality: -1, verdict: null, sear: null, sauce: null, ...over,
  });
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({
      phase: "service", paused: false, glossary: false, openingStep: null, correction: null,
      serviceTime: 30, misses: 0,
      career: { ...useGame.getState().career, night: 5 },
      tickets: [
        ticket({ id: 1, age: 12 }),
        ticket({ id: 2, table: 12, age: 20 }),
        ticket({ id: 3, dish: "Pommes purée", station: 1, age: 7 }),
        ticket({ id: 4, state: "plating", plateAt: 34, plateDur: 4 }),
        ticket({ id: 5, table: 14, state: "pass", quality: 88 }),
        ticket({ id: 6, dish: "Soufflé (weeping)", station: 2, table: 13 }),
      ],
    } satisfies Partial<State>);
  });

  it("resolves only the binned dockets, counts their covers as misses, and leaves held or cooking work alone", () => {
    useGame.getState().eightySix();
    const s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.state).toBe("done");
    expect(s.tickets.find((t) => t.id === 2)!.state).toBe("done");
    expect(s.misses).toBe(2);
    expect(s.tickets.find((t) => t.id === 3)).toMatchObject({ state: "rail", age: 15 });
    expect(s.tickets.find((t) => t.id === 4)!.state).toBe("plating");
    expect(s.tickets.find((t) => t.id === 5)!.state).toBe("pass");
    expect(s.tickets.find((t) => t.id === 6)).toMatchObject({ state: "rail", age: 10 });
    expect(s.feed.some((item) => item.text.includes("2 missed covers"))).toBe(true);
  });

  it("is unavailable before night five, under no-bin, and with an empty rail", () => {
    useGame.setState({ career: { ...useGame.getState().career, night: 4 } } satisfies Partial<State>);
    useGame.getState().eightySix();
    expect(useGame.getState().misses).toBe(0);
    expect(useGame.getState().tickets[0].state).toBe("rail");

    useGame.setState({ career: { ...useGame.getState().career, night: 5, mutator: "no_bin" } } satisfies Partial<State>);
    useGame.getState().eightySix();
    expect(useGame.getState().misses).toBe(0);
    expect(useGame.getState().tickets[0].state).toBe("rail");

    useGame.setState({
      career: { ...useGame.getState().career, mutator: undefined },
      tickets: [ticket({ id: 9, state: "pass", quality: 88 })],
    } satisfies Partial<State>);
    useGame.getState().eightySix();
    expect(useGame.getState().misses).toBe(0);
    expect(useGame.getState().tickets[0].state).toBe("pass");
  });
});

describe("send-back costs (C3)", () => {
  let useGame: Game;
  const passPlate = (over: Partial<State["tickets"][number]>): State["tickets"][number] => ({
    id: 1, dish: "Scallops", table: 3, station: 0, age: 10,
    state: "pass", plateAt: 0, plateDur: 2, byChef: false,
    quality: 55, verdict: null, sear: null, sauce: null, ...over,
  });
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({
      phase: "service", paused: false, glossary: false, openingStep: null, correction: null,
      serviceTime: 30, sentBack: 0,
    } satisfies Partial<State>);
  });

  it("a send-back preserves the order's age — the remake inherits the wait", () => {
    useGame.setState({ tickets: [passPlate({ age: 42 })] } satisfies Partial<State>);
    useGame.getState().judge("sendback");
    const t = useGame.getState().tickets[0];
    expect(t.state).toBe("rail");
    expect(t.age).toBe(42);
    expect(useGame.getState().sentBack).toBe(1);
  });

  it("a truthful send-back names the fault and spares the grudge; a free one earns it", () => {
    // no defect: the free rejection earns the grudge and costs morale
    const noFault = passPlate({ age: 10, condition: undefined, quality: 88 });
    useGame.setState({ tickets: [noFault] } satisfies Partial<State>);
    const before = useGame.getState().cooks[0].morale;
    useGame.getState().judge("sendback");
    const s = useGame.getState();
    expect(s.cooks[0].grudge).toBe("sent back");
    expect(s.cooks[0].morale).toBeLessThan(before);
  });

  it("the remake is a fresh cook job: plateToPass re-plans the full duration", () => {
    useGame.setState({ tickets: [passPlate({ age: 42 })] } satisfies Partial<State>);
    useGame.getState().judge("sendback");
    const rail = useGame.getState().tickets[0];
    expect(rail.state).toBe("rail");
    useGame.getState().plateToPass(rail.id);
    const remake = useGame.getState().tickets[0];
    expect(remake.state).toBe("plating");
    // the remake's plateAt is serviceTime + a fresh duration, not a free instant
    expect(remake.plateAt).toBeGreaterThan(useGame.getState().serviceTime);
    expect(remake.plateDur).toBeGreaterThan(0);
  });
});
