import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveMood, spikeStrengths, SPIKE_DECAY, type MoodInputs } from "./mood";

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
  length: 0,
});
vi.stubGlobal("performance", { now: () => Date.now() });

async function freshGame() {
  vi.resetModules();
  const mod = await import("./state");
  return mod.useGame;
}
type Game = Awaited<ReturnType<typeof freshGame>>;
type State = ReturnType<Game["getState"]>;

const base: MoodInputs = {
  morale: 90,
  overloadT: 0,
  grudge: null,
  burning: false,
  trauma: 0,
  walkedOut: false,
  working: false,
};

describe("deriveMood — one language, five states", () => {
  it("CALM: high morale, idle, no spikes", () => {
    expect(deriveMood(base)).toBe("CALM");
  });
  it("FOCUSED: high morale and working, or relief still fresh", () => {
    expect(deriveMood({ ...base, working: true })).toBe("FOCUSED");
    expect(deriveMood(base, { anger: 0, panic: 0, strain: 0, relief: 0.8 })).toBe("FOCUSED");
  });
  it("STRAINED: tired morale, overload clock, or a strain spike", () => {
    expect(deriveMood({ ...base, morale: 50 })).toBe("STRAINED");
    expect(deriveMood({ ...base, overloadT: 3 })).toBe("STRAINED");
    expect(deriveMood(base, { anger: 0, panic: 0, strain: 0.5, relief: 0 })).toBe("STRAINED");
  });
  it("ANGRY: low morale, a grudge, or an anger spike", () => {
    expect(deriveMood({ ...base, morale: 30 })).toBe("ANGRY");
    expect(deriveMood({ ...base, grudge: "sent back" })).toBe("ANGRY");
    expect(deriveMood(base, { anger: 1, panic: 0, strain: 0, relief: 0 })).toBe("ANGRY");
  });
  it("EDGE: burning, panic spike, feral morale, or deep trauma", () => {
    expect(deriveMood({ ...base, burning: true })).toBe("EDGE");
    expect(deriveMood(base, { anger: 0, panic: 1, strain: 0, relief: 0 })).toBe("EDGE");
    expect(deriveMood({ ...base, morale: 10 })).toBe("EDGE");
    expect(deriveMood({ ...base, trauma: 3 })).toBe("EDGE");
  });
  it("grudge and trauma hold even when morale is fine", () => {
    expect(deriveMood({ ...base, morale: 95, grudge: "screamed at" })).toBe("ANGRY");
    expect(deriveMood({ ...base, morale: 95, trauma: 4 })).toBe("EDGE");
  });
  it("walked out is a status, not a mood", () => {
    expect(deriveMood({ ...base, walkedOut: true, burning: true })).toBe("CALM");
  });
  it("priority: panic beats anger, anger beats strain", () => {
    expect(deriveMood(base, { anger: 1, panic: 1, strain: 1, relief: 0 })).toBe("EDGE");
    expect(deriveMood(base, { anger: 1, panic: 0, strain: 1, relief: 0 })).toBe("ANGRY");
  });
});

describe("spikeStrengths — the ~45 s decay", () => {
  it("fires at full strength and decays to zero at the horizon", () => {
    const sp = spikeStrengths({ angerAt: 100 }, 100);
    expect(sp.anger).toBe(1);
    expect(sp.panic).toBe(0);
    const half = spikeStrengths({ angerAt: 100 }, 100 + SPIKE_DECAY / 2);
    expect(half.anger).toBeCloseTo(0.5, 5);
    expect(spikeStrengths({ angerAt: 100 }, 100 + SPIKE_DECAY).anger).toBe(0);
    expect(spikeStrengths({ angerAt: 100 }, 100 + SPIKE_DECAY + 10).anger).toBe(0);
  });
  it("a decayed spike no longer moves the mood", () => {
    const now = 200;
    const spikes = { angerAt: now - SPIKE_DECAY - 1 };
    expect(deriveMood(base, spikeStrengths(spikes, now))).toBe("CALM");
    const fresh = { angerAt: now };
    expect(deriveMood(base, spikeStrengths(fresh, now))).toBe("ANGRY");
  });
});

describe("mood in the service tick", () => {
  const railTicket = (id: number, station = 0): State["tickets"][number] => ({
    id, dish: "Scallops", table: 3, station, age: 1, state: "rail",
    plateAt: 0, plateDur: 2, byChef: false, quality: -1, verdict: null, sear: null, sauce: null,
  });
  const toService = (over: Partial<State> = {}) =>
    useGame.setState({
      phase: "service", paused: false, openingStep: null,
      serviceTime: 30, guests: [], events: [],
      tickets: [railTicket(1), railTicket(2)],
      ...over,
    } satisfies Partial<State>);
  let useGame: Game;
  beforeEach(async () => {
    useGame = await freshGame();
    // boot cooks are empty — resetCareer installs the real brigade fixtures
    useGame.getState().resetCareer();
    useGame.setState({ cooks: useGame.getState().cooks.map((c) => ({ ...c, morale: 90 })) });
  });

  it("high-morale cooks read CALM idle and FOCUSED on their ticket", () => {
    toService();
    useGame.getState().tick(0.1);
    expect(useGame.getState().cooks[0].mood).toBe("CALM");
    // plating ticket on Petra's station → she is working
    toService({ tickets: [railTicket(1), { ...railTicket(2), state: "plating", plateAt: 40, plateDur: 10 }] });
    useGame.getState().tick(0.1);
    expect(useGame.getState().cooks[0].mood).toBe("FOCUSED");
  });

  it("a scream spikes the whole brigade toward STRAINED", () => {
    toService();
    useGame.getState().scream(0.5);
    useGame.getState().tick(0.1);
    const moods = useGame.getState().cooks.map((c) => c.mood);
    expect(moods).toHaveLength(3);
    expect(moods.every((m) => m === "STRAINED")).toBe(true);
    // and it decays: far past the horizon the kitchen forgets
    useGame.setState({ serviceTime: 30 + SPIKE_DECAY + 5 });
    useGame.getState().tick(0.1);
    expect(useGame.getState().cooks[0].mood).toBe("CALM");
  });

  it("a station fire spikes panic → EDGE on that cook only", () => {
    const cooks = useGame.getState().cooks.map((c, i) =>
      i === 0 ? { ...c, overloadT: 9 } : c
    );
    toService({ cooks, tickets: [railTicket(1), railTicket(2), railTicket(3)] });
    useGame.getState().tick(0.1);
    const st = useGame.getState();
    expect(st.cooks[0].burning).toBe(true);
    expect(st.cooks[0].mood).toBe("EDGE");
    expect(st.cooks[1].mood).not.toBe("EDGE");
  });
});

describe("pacing floor — a no-empty guard", () => {
  const railTicket = (id: number, station = 0): State["tickets"][number] => ({
    id, dish: "Scallops", table: 3, station, age: 1, state: "rail",
    plateAt: 0, plateDur: 2, byChef: false, quality: -1, verdict: null, sear: null, sauce: null,
  });
  const toService = (over: Partial<State> = {}) =>
    useGame.setState({
      phase: "service", paused: false, openingStep: null,
      serviceTime: 30, guests: [], events: [], tickets: [], nextTicketIn: 30,
      ...over,
    } satisfies Partial<State>);
  let useGame: Game;
  beforeEach(async () => {
    useGame = await freshGame();
    useGame.getState().resetCareer();
  });

  it("shrinks nextTicketIn when rail+plating drops below two", () => {
    toService({ tickets: [railTicket(1)] }); // one work-bearing ticket
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBeLessThanOrEqual(1.2);
  });

  it("ready and pass plates do not count — they are already cooked", () => {
    toService({
      tickets: [
        { ...railTicket(1), state: "ready" },
        { ...railTicket(2), state: "pass" },
        { ...railTicket(3), state: "ready" },
      ],
    });
    useGame.getState().tick(0.1);
    // three cooked plates, zero work-bearing → the floor still applies
    expect(useGame.getState().nextTicketIn).toBeLessThanOrEqual(1.2);
  });

  it("leaves the timer alone when the floor is met", () => {
    toService({ tickets: [railTicket(1), railTicket(2)] });
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBeGreaterThan(1.2);
  });

  it("the finale is excluded — the last 40 s stay authored", () => {
    toService({ serviceTime: 140 });
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBeGreaterThan(1.2);
  });

  it("the opening is excluded — the tutorial owns the clock", () => {
    toService({ openingStep: "judge" });
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBe(30);
  });

  it("pause holds the clock; resume re-applies the floor", () => {
    toService({ paused: true });
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBe(30);
    useGame.setState({ paused: false });
    useGame.getState().tick(0.1);
    expect(useGame.getState().nextTicketIn).toBeLessThanOrEqual(1.2);
  });
});
