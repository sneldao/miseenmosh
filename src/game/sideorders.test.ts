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
  get length() {
    return storage.size;
  },
});
vi.stubGlobal("performance", { now: () => Date.now() });

async function freshGame() {
  vi.resetModules();
  const mod = await import("./state");
  return mod.useGame;
}
type Game = Awaited<ReturnType<typeof freshGame>>;
type State = ReturnType<Game["getState"]>;

const ticket = (
  over: Partial<State["tickets"][number]>,
): State["tickets"][number] => ({
  id: 1,
  dish: "Beef Wellington",
  table: 11,
  station: 0,
  age: 10,
  state: "pass",
  plateAt: 0,
  plateDur: 0,
  byChef: false,
  quality: 88,
  verdict: null,
  sear: null,
  sauce: null,
  ...over,
});

describe("side-order evidence is committed to the store", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({
      phase: "service",
      paused: false,
      glossary: false,
      openingStep: null,
      correction: null,
      serviceTime: 30,
      sideFlags: {},
    } satisfies Partial<State>);
  });

  it("a golden plate leaving the pass sets sideFlags.golden — the night-3 order can land", () => {
    useGame.setState({
      tickets: [ticket({ id: 5, sear: "golden", quality: 88 })],
    } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().sideFlags.golden).toBe(true);
  });

  it("a FAST request nailed inside 30s sets sideFlags.fast — the night-4 order can land", () => {
    useGame.setState({
      tickets: [ticket({ id: 5, age: 20, quality: 88 })],
      request: {
        ticketId: 5,
        table: 11,
        dish: "Beef Wellington",
        mod: "FAST",
        until: 60,
      },
    } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().sideFlags.fast).toBe(true);
  });

  it("a missed FAST request does not set the flag", () => {
    useGame.setState({
      tickets: [ticket({ id: 5, age: 45, quality: 88 })],
      request: {
        ticketId: 5,
        table: 11,
        dish: "Beef Wellington",
        mod: "FAST",
        until: 60,
      },
    } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().sideFlags.fast).toBeUndefined();
  });

  it("a fire is evidence the moment it ignites — and smothering does not erase it", () => {
    const cook0 = useGame.getState().cooks.find((c) => c.station === 0)!;
    useGame.setState({
      cooks: useGame
        .getState()
        .cooks.map((c) =>
          c.station === 0 ? { ...c, overloadT: 8.5, burning: false } : c,
        ),
      // three live tickets on station 0 — the station is drowning
      tickets: [1, 2, 3].map((id) =>
        ticket({ id, state: "rail", quality: -1 }),
      ),
    } satisfies Partial<State>);
    useGame.getState().tick(0.5);
    const burningNow = useGame
      .getState()
      .cooks.find((c) => c.station === 0)!.burning;
    expect(burningNow).toBe(true);
    expect(useGame.getState().sideFlags.fire).toBe(true);
    useGame.getState().smotherFire(0);
    const s = useGame.getState();
    expect(s.cooks.find((c) => c.station === 0)!.burning).toBe(false);
    expect(s.sideFlags.fire).toBe(true);
    expect(cook0).toBeTruthy();
  });
});

describe("makeLots — the night-2 teaching showcase", () => {
  it("Allen's cod survives the contested-lot guarantee on every seed", async () => {
    vi.resetModules();
    const { makeLots } = await import("./state");
    for (let seed = 1; seed <= 200; seed++) {
      const lots = makeLots(2, seed);
      expect(
        lots.some((l) => l.name === "Allen's cod"),
        `seed ${seed}`,
      ).toBe(true);
    }
  });

  it("still guarantees a contested lot when the deck allows one", async () => {
    vi.resetModules();
    const { makeLots } = await import("./state");
    let contestedSeen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (makeLots(2, seed).some((l) => l.contested)) contestedSeen++;
    }
    expect(contestedSeen).toBeGreaterThan(150);
  });
});

describe("the back door — one gift a residency", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
    useGame.setState({ phase: "title" } satisfies Partial<State>);
  });

  it("the first knock pays sixty quid and claims the mat", () => {
    const cash = useGame.getState().career.cash;
    useGame.getState().theBackDoor();
    const s = useGame.getState();
    expect(s.career.cash).toBe(cash + 60);
    expect(s.career.matClaimed).toBe(true);
    expect(s.matDropKind).toBe("cash");
  });

  it("the second knock finds the mat empty and pays nothing", () => {
    useGame.getState().theBackDoor();
    const cash = useGame.getState().career.cash;
    useGame.getState().theBackDoor();
    useGame.getState().theBackDoor();
    const s = useGame.getState();
    expect(s.career.cash).toBe(cash);
    expect(s.matDropKind).toBe("empty");
  });

  it("a fresh residency can knock again — the cap is per career, not forever", () => {
    useGame.getState().theBackDoor();
    useGame.getState().resetCareer();
    useGame.setState({ phase: "title" } satisfies Partial<State>);
    const cash = useGame.getState().career.cash;
    useGame.getState().theBackDoor();
    expect(useGame.getState().career.cash).toBe(cash + 60);
  });

  it("the claim survives a reload through the save", async () => {
    useGame.getState().theBackDoor();
    // boot a fresh store against the same storage — the save round-trips
    const again = await freshGame();
    expect(again.getState().career.matClaimed).toBe(true);
    again.setState({ phase: "title" } satisfies Partial<State>);
    const cash = again.getState().career.cash;
    again.getState().theBackDoor();
    expect(again.getState().career.cash).toBe(cash);
    expect(again.getState().matDropKind).toBe("empty");
  });
});
