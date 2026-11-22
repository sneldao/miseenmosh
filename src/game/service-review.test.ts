import { describe, it, expect, vi, beforeEach } from "vitest";
import { criticForNight, criticTell, criticAssessment, CRITICS } from "./critics";
import { appendServiceEvent, MAX_SERVICE_EVENTS, type ServiceEvent } from "./serviceEvents";
import { buildServiceStory, nightAccounts, type ReviewFacts } from "./serviceReview";
import { conditionFromCooking } from "./culinary";
import { speakChorus } from "./voice";

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
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() { return storage.size; },
};
vi.stubGlobal("localStorage", localStorageStub);
vi.stubGlobal("performance", { now: () => Date.now() });

async function freshGame() {
  vi.resetModules();
  const mod = await import("./state");
  return mod.useGame;
}
type Game = Awaited<ReturnType<typeof freshGame>>;
type State = ReturnType<Game["getState"]>;

const baseFacts: ReviewFacts = {
  night: 1,
  stars: 5,
  served: 27,
  sentBack: 0,
  screams: 0,
  smashed: 7,
  misses: 0,
  complaints: 1,
  walkoutNames: ["PETRA"],
  spotted: true,
  criticServed: 1,
  criticAvg: 60,
  events: [],
  folkloreOutcome: null,
  persona: "gilliam",
  isFinalNight: false,
};

const storyText = (r: ReturnType<typeof buildServiceStory>) =>
  [r.headline, r.incident, r.consequence, r.criticVerdict, r.folkloreLine, r.cover].filter(Boolean).join(" ");

describe("critic rotation and tells", () => {
  it("maps nights to personas", () => {
    const cases: [number, "gilliam" | "madameV" | "kid"][] = [
      [1, "gilliam"],
      [5, "gilliam"],
      [6, "madameV"],
      [8, "madameV"],
      [9, "kid"],
    ];
    for (const [night, persona] of cases) expect(criticForNight(night), `night ${night}`).toBe(persona);
  });

  it("uses the persona's own tell kind", () => {
    expect(criticTell("gilliam", 1, 4).kind).toBe("notebook");
    expect(criticTell("madameV", 2, 4).kind).toBe("inspect");
    expect(criticTell("kid", 3, 4).kind).toBe("phone");
    for (const tell of CRITICS.gilliam.tells) {
      expect(tell.text).not.toMatch(/photograph|camera|flash/i);
    }
  });
});

describe("service story selection", () => {
  it("reports the actual walkout and never invents contradictory lines", () => {
    const story = buildServiceStory(baseFacts);
    expect(story.headline).toBe("THE STARS HAVE A COST");
    expect(story.incident).toContain("PETRA walked out");
    expect(story.incident).toContain("the empty station belongs");
    expect(story.consequence).toContain("trauma scar");
    expect(story.criticVerdict).toContain("7 smashed plates");
    const text = storyText(story);
    expect(text).not.toContain("mid-shout");
    expect(text).not.toContain("No theatrics");
    expect(text).not.toContain("Flawless");
  });

  it("a zero-star walkout does not claim the stars have a cost", () => {
    const story = buildServiceStory({ ...baseFacts, stars: 0, walkoutNames: ["PETRA", "DIMITRI"] });
    expect(story.headline).toBe("THE BRIGADE PAID THE PRICE");
    expect(story.incident).toContain("the empty stations belong");
  });

  it("quiet service gets the quiet headline", () => {
    const story = buildServiceStory({ ...baseFacts, walkoutNames: [], smashed: 0, complaints: 0 });
    expect(story.headline).toBe("A SERVICE WITHOUT SHOUTING");
  });

  it("screams break the quiet headline and cap Gilliam's assessment", () => {
    const story = buildServiceStory({ ...baseFacts, walkoutNames: [], smashed: 0, complaints: 0, screams: 2 });
    expect(story.headline).not.toBe("A SERVICE WITHOUT SHOUTING");
    expect(story.criticVerdict).toContain("second scream");
  });

  it("unknown inspector and clocked-but-unfed read as their own failures", () => {
    const unknown = buildServiceStory({ ...baseFacts, walkoutNames: [], spotted: false, criticServed: 0 });
    expect(unknown.criticVerdict).toBe("The inspector left unidentified.");
    const unfed = buildServiceStory({ ...baseFacts, walkoutNames: [], criticServed: 0 });
    expect(unfed.criticVerdict).toContain("never fed");
    expect(unfed.headline).toBe("SPOTTED. NEVER SERVED.");
  });

  it("names a real rescue and never invents one", () => {
    const rescue = buildServiceStory({
      ...baseFacts,
      walkoutNames: [],
      smashed: 0,
      complaints: 0,
      events: [{ kind: "rescue", at: 60, cookId: 0, cookName: "PETRA", action: "catch", dish: "Wellington" }],
    });
    expect(rescue.headline).toBe("PETRA HELD THE LINE");
    expect(rescue.incident).toContain("Wellington");
    const none = buildServiceStory({ ...baseFacts, walkoutNames: [], smashed: 0, complaints: 0 });
    expect(storyText(none)).not.toMatch(/caught|held the line/i);
  });

  it("final-night consequences carry no tomorrow hook", () => {
    const last = buildServiceStory({ ...baseFacts, walkoutNames: [], isFinalNight: true });
    expect(last.consequence).not.toMatch(/[Tt]omorrow/);
    expect(last.consequence).toContain("residency ends");
    const bankrupt = buildServiceStory({ ...baseFacts, walkoutNames: [], isFinalNight: true, smashed: 0 });
    expect(bankrupt.consequence).not.toMatch(/[Tt]omorrow/);
  });
});

describe("folklore narration", () => {
  const folk = (result: string, test: "fork" | "flash" | "return" = "fork") =>
    ({ kind: "folklore", at: 40, test, result, table: 7 }) as Extract<ServiceEvent, { kind: "folklore" }>;
  const line = (o: ReviewFacts["folkloreOutcome"]) =>
    buildServiceStory({ ...baseFacts, walkoutNames: [], folkloreOutcome: o }).folkloreLine;

  it("reports what actually happened", () => {
    expect(line(folk("expired"))).toContain("went unanswered");
    expect(line(folk("answered"))).toContain("answered");
    expect(line(folk("allowed", "flash"))).toContain("let them post");
    expect(line(folk("refired", "return"))).toContain("re-fired");
    expect(line(null)).toBeUndefined();
  });
});

describe("bounded service history", () => {
  it("keeps the newest 128 without mutating the old array", () => {
    const initial: ServiceEvent[] = [];
    let events = initial;
    for (let i = 0; i < 150; i++) {
      events = appendServiceEvent(events, { kind: "scream", at: i, power: 1, over: false });
    }
    expect(events).toHaveLength(MAX_SERVICE_EVENTS);
    expect(events[0].at).toBe(22);
    expect(events[events.length - 1].at).toBe(149);
    expect(initial).toHaveLength(0);
  });
});

describe("store integration", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    // real career/cook defaults to clone fixtures from (boot cooks are empty)
    useGame.getState().resetCareer();
  });

  const saveEnvelope = (career: State["career"], cooks: State["cooks"], version?: number) =>
    JSON.stringify(version === undefined ? { career, cooks } : { version, career, cooks });

  it("startService applies the night's critic over a stale saved persona", () => {
    const cur = useGame.getState();
    const career = { ...cur.career, night: 6, cash: 120, stars: 3, venue: 1, criticPersona: "gilliam" as const };
    storage.set("mem-career", saveEnvelope(career, cur.cooks));
    useGame.getState().start();
    useGame.getState().startService();
    const s = useGame.getState();
    expect(s.career.criticPersona).toBe("madameV");
    expect(s.career.cash).toBe(120);
    expect(s.career.stars).toBe(3);
    expect(s.cooks).toHaveLength(3);
  });

  it("night 9 overrides to the kid", () => {
    const cur = useGame.getState();
    const career = { ...cur.career, night: 9, venue: 1, criticPersona: "madameV" as const };
    storage.set("mem-career", saveEnvelope(career, cur.cooks));
    useGame.getState().start();
    useGame.getState().startService();
    expect(useGame.getState().career.criticPersona).toBe("kid");
  });

  it("startService resets leftover service history", () => {
    const outcome: Extract<ServiceEvent, { kind: "folklore" }> = { kind: "folklore", at: 1, test: "fork", result: "expired", table: 7 };
    useGame.setState({
      phase: "briefing",
      events: [outcome, { kind: "scream", at: 2, power: 1, over: false }],
      folkloreOutcome: outcome,
    } satisfies Partial<State>);
    useGame.getState().startService();
    expect(useGame.getState().events).toEqual([]);
    expect(useGame.getState().folkloreOutcome).toBeNull();
  });

  it("a versioned save keeps lastReview; a malformed one drops only it", () => {
    const cur = useGame.getState();
    const career = {
      ...cur.career,
      night: 2,
      stars: 4,
      cash: 80,
      venue: 1,
      lastReview: { night: 1, headline: "A SERVICE WITHOUT SHOUTING", incident: "Quiet.", consequence: "Tomorrow." },
    };
    storage.set("mem-career", saveEnvelope(career, cur.cooks, 1));
    useGame.getState().start();
    useGame.getState().startService();
    expect(useGame.getState().career.lastReview?.headline).toBe("A SERVICE WITHOUT SHOUTING");
  });

  it("malformed lastReview is omitted, rest of the career survives", () => {
    const cur = useGame.getState();
    const career = { ...cur.career, night: 3, stars: 4, cash: 90, venue: 1, lastReview: { night: "oops" } as never };
    storage.set("mem-career", saveEnvelope(career, cur.cooks, 1));
    useGame.getState().start();
    useGame.getState().startService();
    const c = useGame.getState().career;
    expect(c.lastReview).toBeUndefined();
    expect(c.cash).toBe(90);
  });

  it("a newer-version save blocks start and reset without being touched", () => {
    const cur = useGame.getState();
    const career = { ...cur.career, night: 7, cash: 500 };
    const v2 = saveEnvelope(career, cur.cooks, 3);
    storage.set("mem-career", v2);
    useGame.setState({ phase: "title" } satisfies Partial<State>);
    useGame.getState().start();
    let s = useGame.getState();
    expect(s.phase).toBe("title");
    expect(s.canSave).toBe(false);
    expect(s.saveIssue).toContain("newer build");
    expect(storage.get("mem-career")).toBe(v2);
    // resetCareer must also refuse to delete it — even discovered after boot
    useGame.getState().resetCareer();
    s = useGame.getState();
    expect(s.phase).toBe("title");
    expect(s.canSave).toBe(false);
    expect(s.saveIssue).toContain("newer build");
    expect(storage.get("mem-career")).toBe(v2);
  });

  it("a corrected supported save loads again and clears the issue", () => {
    const cur = useGame.getState();
    storage.set("mem-career", saveEnvelope({ ...cur.career }, cur.cooks, 3));
    useGame.getState().start();
    expect(useGame.getState().saveIssue).toContain("newer build");
    // the save is replaced by one this build can read
    const career = { ...cur.career, night: 4, cash: 250, venue: 1 };
    storage.set("mem-career", saveEnvelope(career, cur.cooks, 1));
    useGame.getState().start();
    const s = useGame.getState();
    expect(s.saveIssue).toBeNull();
    expect(s.phase).toBe("briefing");
    expect(s.career.cash).toBe(250);
  });

  const passPlate = (over: Partial<State["tickets"][number]> = {}): State["tickets"][number] => ({
    id: 1,
    dish: "Scallops",
    table: 3,
    station: 0,
    age: 10,
    state: "pass",
    plateAt: 0,
    plateDur: 2,
    byChef: false,
    quality: 55,
    verdict: null,
    sear: null,
    sauce: null,
    ...over,
  });

  const toService = (over: Partial<State> = {}) => {
    useGame.setState({
      phase: "service",
      paused: false,
      serviceTime: 10,
      events: [],
      tickets: [passPlate()],
      ...over,
    } satisfies Partial<State>);
  };

  it("judge records a plate event per verdict and guards phase/pause", () => {
    toService();
    useGame.getState().judge("serve");
    const evs = useGame.getState().events.filter((e) => e.kind === "plate");
    expect(evs).toHaveLength(1);
    const ev = evs[0] as Extract<ServiceEvent, { kind: "plate" }>;
    expect(ev).toMatchObject({ ticketId: 1, dish: "Scallops", table: 3, verdict: "serve", cookName: "PETRA" });

    toService();
    useGame.getState().judge("sendback");
    expect(useGame.getState().events.filter((e) => e.kind === "plate").at(-1)).toMatchObject({ verdict: "sendback" });

    toService();
    useGame.getState().judge("smash");
    expect(useGame.getState().events.filter((e) => e.kind === "plate").at(-1)).toMatchObject({ verdict: "smash" });

    // a chef-covered station credits THE CHEF, not the absent cook
    toService({ tickets: [passPlate({ byChef: true })] });
    useGame.getState().judge("serve");
    expect(useGame.getState().events.filter((e) => e.kind === "plate").at(-1)).toMatchObject({ cookName: "THE CHEF" });

    // paused with a live plate: no mutation, no event
    toService();
    const before = useGame.getState();
    useGame.setState({ paused: true } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().events).toBe(before.events);
    expect(useGame.getState().tickets).toBe(before.tickets);
    expect(useGame.getState().served).toBe(before.served);

    // review phase with a live plate: same
    useGame.setState({ paused: false, phase: "review" } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().events).toBe(before.events);
    expect(useGame.getState().tickets).toBe(before.tickets);
  });

  it("scream records the event and keeps the chorus line", () => {
    toService();
    useGame.getState().scream(0.8);
    const normal = vi.mocked(speakChorus).mock.calls.at(-1)!;
    expect(useGame.getState().chorusText).toBe(normal[0]);
    expect(useGame.getState().chorusText.length).toBeGreaterThan(0);

    useGame.getState().scream(1.3);
    const sc = useGame.getState().events.find((e) => e.kind === "scream" && (e as { over: boolean }).over) as Extract<ServiceEvent, { kind: "scream" }>;
    expect(sc.power).toBeCloseTo(1.3);
    expect(sc.over).toBe(true);
    const held = vi.mocked(speakChorus).mock.calls.at(-1)!;
    expect(useGame.getState().chorusText).toBe(held[0]);
    expect(held[1]).toBe(true);
    expect(useGame.getState().chorusText.length).toBeGreaterThan(0);

    // paused: nothing recorded, nothing spoken
    useGame.setState({ paused: true } satisfies Partial<State>);
    const len = useGame.getState().events.length;
    const calls = vi.mocked(speakChorus).mock.calls.length;
    useGame.getState().scream(1);
    expect(useGame.getState().events.length).toBe(len);
    expect(vi.mocked(speakChorus).mock.calls.length).toBe(calls);
  });

  it("flag records once and guards", () => {
    toService({
      serviceTime: 20,
      guests: [{ id: 5, kind: "walkin", table: 4, isCritic: false, tells: 0, tellAt: -1, tellClock: 0, mercy: 0, tellKind: null }],
      criticFlagged: false,
    });
    useGame.getState().flagGuest(5);
    const flags = useGame.getState().events.filter((e) => e.kind === "critic-flag");
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ result: "wrong", table: 4 });
    useGame.getState().flagGuest(5);
    expect(useGame.getState().events.filter((e) => e.kind === "critic-flag")).toHaveLength(1);

    useGame.setState({ paused: true, criticFlagged: false } satisfies Partial<State>);
    useGame.getState().flagGuest(5);
    expect(useGame.getState().events.filter((e) => e.kind === "critic-flag")).toHaveLength(1);
  });

  it("a final-tick walkout names the cook in the same review", () => {
    const anwar = { ...useGame.getState().cooks[2], morale: 0 };
    useGame.setState({
      phase: "service",
      paused: false,
      serviceTime: 149.9,
      guests: [],
      tickets: [],
      cooks: [anwar],
      career: { ...useGame.getState().career, night: 1, venue: 1, cash: 50, criticPersona: "gilliam" },
    } satisfies Partial<State>);
    useGame.getState().tick(0.2);
    const st = useGame.getState();
    expect(st.phase).toBe("review");
    expect(st.events.some((e) => e.kind === "walkout" && e.cookName === "ANWAR")).toBe(true);
    expect(st.review?.incident).toContain("ANWAR");
    // continueNext persists lastReview with matching arithmetic
    const cashBefore = st.career.cash;
    useGame.getState().continueNext();
    const c = useGame.getState().career;
    const acc = nightAccounts({
      covers: st.review!.covers, price: 22, walkedOut: 1, cooks: 1,
      smashed: 0, betCash: st.review!.betCash ?? 0, cash: cashBefore, debtTake: 0,
    });
    expect(c.cash).toBe(acc.nextCash);
    expect(c.lastReview?.night).toBe(1);
    expect(c.lastReview?.incident).toBe(st.review!.incident);
  });

  it("folklore expiry and ticket miss on the closing tick reach the review", () => {
    const anwar = { ...useGame.getState().cooks[2], morale: 90 };
    const critic = { id: 0, kind: "critic" as const, table: 12, isCritic: true, tells: 0, tellAt: -1, tellClock: 1e9, mercy: 0, tellKind: null };
    useGame.setState({
      phase: "service",
      paused: false,
      serviceTime: 149.9,
      folklore: { kind: "fork", table: 12, until: 150 },
      folkloreDone: true,
      guests: [critic],
      // a rail ticket that crosses its TTL on this same tick
      tickets: [passPlate({ id: 9, table: 11, state: "rail", age: 54.95 })],
      events: [],
      folkloreOutcome: null,
      criticQ: 60,
      criticServed: 1,
      criticSpotted: true,
      cooks: [anwar],
      career: { ...useGame.getState().career, night: 1, venue: 1, cash: 50, criticPersona: "gilliam" },
    } satisfies Partial<State>);
    useGame.getState().tick(0.2);
    const st = useGame.getState();
    expect(st.phase).toBe("review");
    expect(st.folkloreOutcome).toMatchObject({ test: "fork", result: "expired", table: 12 });
    // the fork penalty resolved on this tick lands in stored criticQ AND the verdict
    expect(st.criticQ).toBe(40);
    expect(st.review?.criticVerdict).toContain("fell short");
    expect(st.review?.folkloreLine).toContain("went unanswered");
    expect(st.review?.folkloreLine).not.toContain("test: answered");
    // the expired ticket counted in the review and in the store identically
    expect(st.misses).toBe(1);
    expect(st.review?.misses).toBe(st.misses);

    // flash expiry reads as allowed
    useGame.setState({
      phase: "service",
      paused: false,
      serviceTime: 149.9,
      folklore: { kind: "flash", table: 9, until: 145 },
      guests: [],
      tickets: [],
      events: [],
      folkloreOutcome: null,
      cooks: [{ ...useGame.getState().cooks[0], morale: 90, walkedOut: false }],
    } satisfies Partial<State>);
    useGame.getState().tick(0.2);
    expect(useGame.getState().folkloreOutcome).toMatchObject({ test: "flash", result: "allowed" });
    expect(useGame.getState().review?.folkloreLine).toContain("let them post");
  });
});

describe("nightAccounts", () => {
  it("keeps the original arithmetic", () => {
    const acc = nightAccounts({ covers: 10, price: 42, walkedOut: 0, cooks: 3, smashed: 2, betCash: 20, cash: 100, debtTake: 0 });
    expect(acc.covers).toBe(420);
    expect(acc.wages).toBe(90);
    expect(acc.breakage).toBe(24);
    expect(acc.net).toBe(306);
    expect(acc.nextCash).toBe(426);
  });

  it("walkouts pay half wage", () => {
    const acc = nightAccounts({ covers: 0, price: 42, walkedOut: 1, cooks: 3, smashed: 0, betCash: 0, cash: 0, debtTake: 0 });
    expect(acc.wages).toBe(75);
  });

  it("debt is collected on the final night and bankruptcy is strictly below -60", () => {
    const acc = nightAccounts({ covers: 0, price: 42, walkedOut: 0, cooks: 3, smashed: 0, betCash: 0, cash: 30, debtTake: 25 });
    expect(acc.nextCash).toBe(30 - 90 - 25);
    const edge = nightAccounts({ covers: 0, price: 42, walkedOut: 0, cooks: 2, smashed: 0, betCash: 0, cash: 0, debtTake: 0 });
    expect(edge.nextCash).toBe(-60);
    // -60 survives: residency continues
    expect(edge.nextCash < -60).toBe(false);
  });
});

describe("critic assessment copy", () => {
  it("spotted and fed reads quality plus conduct", () => {
    const v = criticAssessment("madameV", { spotted: true, criticServed: 2, criticAvg: 80, screams: 0, smashed: 0 });
    expect(v).toContain("excellent");
    expect(v).toContain("kept its voice down");
  });
});

describe("night-1 opening", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
  });

  const enterFromTitle = (options?: { fresh?: boolean; prep?: boolean }) => {
    useGame.setState({ phase: "title" } satisfies Partial<State>);
    useGame.getState().enterResidency(options);
    return useGame.getState();
  };

  it("enterResidency from title goes straight to service with one ready plate", () => {
    const s = enterFromTitle();
    expect(s.phase).toBe("service");
    expect(s.openingStep).toBe("serve");
    expect(s.firstPerson).toBe(false);
    expect(s.tickets).toHaveLength(1);
    expect(s.tickets[0]).toMatchObject({ state: "pass", quality: 88, dish: "Beef Wellington" });
    expect(s.feed.some((f) => f.text === "Service, chef." && f.who === "PETRA")).toBe(true);
  });

  it("a newer-version save still blocks entry and stays untouched", () => {
    const cur = useGame.getState();
    const payload = JSON.stringify({ version: 3, career: { ...cur.career, night: 3 }, cooks: cur.cooks });
    storage.set("mem-career", payload);
    const s = enterFromTitle();
    expect(s.phase).toBe("title");
    expect(s.saveIssue).toBeTruthy();
    expect(s.canSave).toBe(false);
    expect(storage.get("mem-career")).toBe(payload);
  });

  it("calling enterResidency while already in service does not reset the run", () => {
    enterFromTitle();
    const before = useGame.getState();
    useGame.getState().judge("serve");
    const servedEvents = useGame.getState().events;
    const servedTickets = useGame.getState().tickets;
    useGame.getState().enterResidency();
    const s = useGame.getState();
    expect(s.phase).toBe("service");
    expect(s.events).toBe(servedEvents);
    expect(s.tickets).toBe(servedTickets);
    expect(s.served).toBe(1);
    expect(before).not.toBe(s);
  });

  it("a legacy night-2 save enters briefing with no opening step", () => {
    const cur = useGame.getState();
    storage.set("mem-career", JSON.stringify({ career: { ...cur.career, night: 2, cash: 80 }, cooks: cur.cooks }));
    const s = enterFromTitle();
    expect(s.phase).toBe("briefing");
    expect(s.career.night).toBe(2);
    expect(s.openingStep).toBeNull();
  });

  it("explicit prep on night 1 enters briefing instead of service", () => {
    const s = enterFromTitle({ prep: true });
    expect(s.phase).toBe("briefing");
    expect(s.openingStep).toBeNull();
  });

  it("waiting freezes time, tickets, morale and events until the player acts", () => {
    enterFromTitle();
    const snap = () => {
      const s = useGame.getState();
      return {
        serviceTime: s.serviceTime,
        ages: s.tickets.map((t) => t.age),
        morale: s.cooks.map((c) => c.morale),
        misses: s.misses,
        events: s.events,
        guests: s.guests,
      };
    };
    // serve step: one pass plate waiting
    const a = snap();
    useGame.getState().tick(120);
    expect(snap()).toEqual(a);
    // call step: one rail ticket waiting
    useGame.getState().judge("serve");
    const b = snap();
    useGame.getState().tick(120);
    expect(snap()).toEqual(b);
    // judge step with the cooked plate already at the pass: still waiting, frozen
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    useGame.getState().tick(120); // this tick is what cooks it
    expect(useGame.getState().tickets[0].state).toBe("pass");
    const c = snap();
    useGame.getState().tick(120);
    expect(snap()).toEqual(c);
  });

  it("serving the first plate records a real event, advances to call, and deals one fresh rail ticket", () => {
    enterFromTitle();
    const first = useGame.getState().tickets[0];
    useGame.getState().judge("serve");
    const s = useGame.getState();
    const plates = s.events.filter((e) => e.kind === "plate");
    expect(plates).toHaveLength(1);
    expect(plates[0]).toMatchObject({ verdict: "serve", ticketId: first.id, dish: "Beef Wellington", table: first.table });
    expect(s.served).toBe(1);
    expect(s.openingStep).toBe("call");
    expect(s.tickets).toHaveLength(1);
    expect(s.tickets[0]).toMatchObject({ state: "rail", dish: "Beef Wellington", table: first.table });
  });

  it("a rejected verdict on the first plate is a no-op", () => {
    enterFromTitle();
    const before = useGame.getState();
    useGame.getState().judge("sendback");
    expect(useGame.getState().tickets).toBe(before.tickets);
    expect(useGame.getState().sentBack).toBe(0);
    useGame.getState().judge("smash");
    expect(useGame.getState().smashed).toBe(0);
    expect(useGame.getState().events).toHaveLength(0);
  });

  it("calling the fresh ticket cooks only it — no spawns, hazards, tells or extra events", () => {
    enterFromTitle();
    useGame.getState().judge("serve");
    const rail = useGame.getState().tickets[0];
    useGame.getState().plateToPass(rail.id);
    const s = useGame.getState();
    expect(s.openingStep).toBe("judge");
    expect(s.tickets).toHaveLength(1);
    expect(s.tickets[0].state).toBe("plating");
    const evCount = s.events.length;
    useGame.getState().tick(120); // crosses readiness however long the cook takes
    const t = useGame.getState().tickets;
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ state: "pass", quality: 78 });
    expect(useGame.getState().events.length).toBe(evCount);
    expect(useGame.getState().misses).toBe(0);
  });

  it("serving the second plate completes the opening and releases normal service", () => {
    enterFromTitle();
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("serve");
    const s = useGame.getState();
    expect(s.openingStep).toBeNull();
    expect(s.served).toBe(2);
    expect(s.nextTicketIn).toBe(8);
    // normal service runs: the clock moves and new orders spawn
    useGame.getState().tick(10);
    const n = useGame.getState();
    expect(n.serviceTime).toBeGreaterThan(s.serviceTime);
    expect(n.tickets.length).toBeGreaterThanOrEqual(1);
  });

  it("an intro send-back returns to call and the same plate can be called and served", () => {
    enterFromTitle();
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("sendback");
    let s = useGame.getState();
    expect(s.openingStep).toBe("call");
    expect(s.tickets[0].state).toBe("rail");
    useGame.getState().plateToPass(s.tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("serve");
    s = useGame.getState();
    expect(s.openingStep).toBeNull();
    expect(s.served).toBe(2);
    expect(s.sentBack).toBe(1);
    expect(s.nextTicketIn).toBe(8);
  });

  it("an intro smash ends the opening with the real cost and event", () => {
    enterFromTitle();
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("smash");
    const s = useGame.getState();
    expect(s.openingStep).toBeNull();
    expect(s.smashed).toBe(1);
    expect(s.nextTicketIn).toBe(8);
    expect(s.events.some((e) => e.kind === "plate" && e.verdict === "smash")).toBe(true);
  });

  it("a paused opening cannot progress", () => {
    enterFromTitle();
    useGame.setState({ paused: true } satisfies Partial<State>);
    const before = useGame.getState();
    useGame.getState().judge("serve");
    expect(useGame.getState().tickets).toBe(before.tickets);
    expect(useGame.getState().served).toBe(0);
    useGame.setState({ paused: false } satisfies Partial<State>);
    useGame.getState().judge("serve");
    useGame.setState({ paused: true } satisfies Partial<State>);
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    expect(useGame.getState().tickets[0].state).toBe("rail");
    useGame.getState().tick(120);
    expect(useGame.getState().serviceTime).toBe(before.serviceTime);
  });

  it("unrelated controls do nothing during the opening and work after it", () => {
    enterFromTitle();
    useGame.getState().judge("serve"); // now at call step
    const s0 = useGame.getState();
    const evLen = s0.events.length;
    const chorusCalls = vi.mocked(speakChorus).mock.calls.length;
    useGame.getState().scream(1);
    useGame.getState().flagGuest(0);
    useGame.getState().firePlate();
    useGame.getState().compTable();
    useGame.getState().toggleFirstPerson();
    const s1 = useGame.getState();
    expect(s1.screams).toBe(0);
    expect(s1.events.length).toBe(evLen);
    expect(s1.comped).toBe(false);
    expect(s1.firstPerson).toBe(false);
    expect(s1.tickets).toBe(s0.tickets);
    expect(vi.mocked(speakChorus).mock.calls.length).toBe(chorusCalls);
    // finish the opening, then the same verbs land normally
    useGame.getState().plateToPass(s1.tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("serve");
    expect(useGame.getState().openingStep).toBeNull();
    useGame.getState().scream(1);
    expect(useGame.getState().screams).toBe(1);
    useGame.getState().toggleFirstPerson();
    expect(useGame.getState().firstPerson).toBe(true);
    useGame.getState().toggleFirstPerson();
    useGame.setState({
      tickets: [{ ...useGame.getState().tickets[0], id: 42, state: "rail" as const }],
      guests: [{ id: 1, kind: "regulars" as const, table: 42, isCritic: false, tells: 0, tellAt: -1, tellClock: 0, mercy: 0, tellKind: null }],
    } satisfies Partial<State>);
    useGame.getState().compTable();
    expect(useGame.getState().comped).toBe(true);
  });
});

describe("controls glossary modal", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
  });

  it("opening mid-cooking: glossary pauses the lesson, nothing passes through, close resumes", () => {
    useGame.setState({ phase: "title" } satisfies Partial<State>);
    useGame.getState().enterResidency();
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    expect(useGame.getState().openingStep).toBe("judge");
    expect(useGame.getState().paused).toBe(false);

    useGame.getState().toggleGlossary();
    let s = useGame.getState();
    expect(s.glossary).toBe(true);
    expect(s.paused).toBe(true);
    expect(s.glossaryResume).toBe(true);

    // nothing progresses or acts while the modal owns input
    useGame.getState().tick(120);
    s = useGame.getState();
    expect(s.tickets[0].state).toBe("plating");
    expect(s.serviceTime).toBe(0);
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(s.tickets[0].id);
    useGame.getState().togglePause();
    s = useGame.getState();
    expect(s.paused).toBe(true);
    expect(s.served).toBe(1);
    expect(s.tickets[0].state).toBe("plating");

    useGame.getState().toggleGlossary();
    s = useGame.getState();
    expect(s.glossary).toBe(false);
    expect(s.paused).toBe(false);
    useGame.getState().tick(120);
    s = useGame.getState();
    expect(s.tickets[0].state).toBe("pass");
    expect(s.tickets[0].quality).toBe(78);
  });

  it("an already-paused service stays paused after open/close", () => {
    useGame.setState({
      phase: "service",
      paused: true,
      serviceTime: 20,
      tickets: [],
    } satisfies Partial<State>);
    useGame.getState().toggleGlossary();
    let s = useGame.getState();
    expect(s.glossary).toBe(true);
    expect(s.glossaryResume).toBe(false);
    useGame.getState().toggleGlossary();
    s = useGame.getState();
    expect(s.glossary).toBe(false);
    expect(s.paused).toBe(true);
  });

  it("title open/close never touches paused", () => {
    useGame.setState({ phase: "title", paused: false } satisfies Partial<State>);
    useGame.getState().toggleGlossary();
    let s = useGame.getState();
    expect(s.glossary).toBe(true);
    expect(s.paused).toBe(false);
    useGame.getState().toggleGlossary();
    s = useGame.getState();
    expect(s.glossary).toBe(false);
    expect(s.paused).toBe(false);
  });
});

describe("flagship station and recipe flow", () => {
  let useGame: Game;
  beforeEach(async () => {
    storage.clear();
    useGame = await freshGame();
    useGame.getState().resetCareer();
  });

  const rail = (over: Partial<State["tickets"][number]>): State["tickets"][number] => ({
    id: 1, dish: "Beef Wellington", table: 11, station: 0, age: 0,
    state: "rail", plateAt: 0, plateDur: 0, byChef: false,
    quality: -1, verdict: null, sear: null, sauce: null, ...over,
  });
  const pristine = (dish = "Beef Wellington") =>
    conditionFromCooking(dish, 88, {});
  const toService = (over: Partial<State> = {}) => {
    useGame.setState({
      phase: "service", paused: false, serviceTime: 10,
      events: [], tickets: [], openingStep: null, correction: null,
      selectedTicketId: null, inspecting: false, lastDelivery: null,
      career: { ...useGame.getState().career, night: 3 },
      ...over,
    } satisfies Partial<State>);
  };

  it("A: stations work independently; the pass holds one plate at a time", () => {
    toService({ tickets: [
      rail({ id: 1, station: 0 }), rail({ id: 2, station: 0 }), rail({ id: 3, station: 1, dish: "Pommes purée" }),
    ]});
    const g = useGame.getState();
    g.plateToPass(1);
    g.plateToPass(3);
    expect(useGame.getState().tickets.filter((t) => t.state === "plating")).toHaveLength(2);
    // same-station second rail order stays on the rail while the slot is busy
    useGame.getState().plateToPass(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("rail");
    useGame.getState().tick(20);
    expect(useGame.getState().tickets.filter((t) => t.state === "ready")).toHaveLength(2);
    // calling the second station-0 order is rejected while its ready slot is full
    useGame.getState().plateToPass(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("rail");
    // collect frees the station; the pass holds exactly one plate
    useGame.getState().collectPlate(1);
    let s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.state).toBe("pass");
    expect(s.tickets.find((t) => t.id === 3)!.state).toBe("ready");
    useGame.getState().collectPlate(3);
    expect(useGame.getState().tickets.find((t) => t.id === 3)!.state).toBe("ready");
    // while holding the plate the chef may still call the freed station
    useGame.getState().plateToPass(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("plating");
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.byChef).toBe(false);
  });

  it("B: firePlate hits only the aimed ticket and persists the sear", () => {
    toService({ tickets: [
      rail({ id: 1, state: "plating", plateAt: 12, plateDur: 4 }),
      rail({ id: 2, station: 1, dish: "Pommes purée", state: "plating", plateAt: 12, plateDur: 4 }),
    ]});
    useGame.getState().selectTicket(2);
    useGame.getState().firePlate();
    const s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 2)!.state).toBe("ready");
    expect(s.tickets.find((t) => t.id === 2)!.sear).toBeTruthy();
    expect(s.tickets.find((t) => t.id === 1)!.state).toBe("plating");
    // no selection, no action — and an unknown id is a no-op
    useGame.setState({ selectedTicketId: null } satisfies Partial<State>);
    useGame.getState().firePlate();
    expect(useGame.getState().tickets.find((t) => t.id === 1)!.state).toBe("plating");
    useGame.getState().firePlate(999);
    expect(useGame.getState().tickets.find((t) => t.id === 1)!.state).toBe("plating");
    // a full ready slot defends the pending plate: it waits, never rerolls
    toService({ tickets: [
      rail({ id: 5, state: "ready", readyAt: 5, condition: pristine(), quality: 88 }),
      rail({ id: 6, state: "plating", plateAt: 10, plateDur: 4 }),
    ]});
    useGame.getState().tick(0.5);
    const after = useGame.getState();
    expect(after.tickets.find((t) => t.id === 6)!.state).toBe("plating");
    expect(after.tickets.find((t) => t.id === 5)!.state).toBe("ready");
  });

  it("C: ready and held food cools on the service clock; chilled dishes never do", () => {
    const hot = { ...pristine(), recipeFinish: "classic" as const };
    toService({ serviceTime: 0, tickets: [
      rail({ id: 1, dish: "Beef Wellington", state: "ready", readyAt: 0, condition: hot, quality: 88 }),
      rail({ id: 2, dish: "Foie torchon", station: 2, state: "ready", readyAt: 0,
             condition: conditionFromCooking("Foie torchon", 88), quality: 88 }),
    ]});
    useGame.getState().tick(17.9);
    let s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.condition!.temperature).toBe("hot");
    expect(s.tickets.find((t) => t.id === 1)!.quality).toBe(88);
    useGame.getState().tick(0.2);
    s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.condition!.temperature).toBe("warm");
    expect(s.tickets.find((t) => t.id === 1)!.quality).toBe(80);
    useGame.getState().tick(17);
    s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.condition!.temperature).toBe("cold");
    expect(s.tickets.find((t) => t.id === 1)!.quality).toBe(64);
    expect(s.tickets.find((t) => t.id === 2)!.quality).toBe(88);
    // a paused tick never advances the clock
    const frozen = useGame.getState().tickets;
    useGame.setState({ paused: true } satisfies Partial<State>);
    useGame.getState().tick(10);
    expect(useGame.getState().tickets).toBe(frozen);
  });

  it("D: a split sauce can be brought together, once, truthfully", () => {
    const split = { ...pristine("Beef Wellington"), sauce: "split" as const };
    toService({ tickets: [
      rail({ id: 1, state: "pass", readyAt: 10, condition: split, quality: 70 }),
      rail({ id: 2, station: 1, dish: "Pommes purée", state: "ready", readyAt: 10, condition: pristine("Pommes purée"), quality: 88 }),
    ]});
    const morale0 = useGame.getState().cooks[0].morale;
    useGame.getState().correctPlate();
    let s = useGame.getState();
    expect(s.correction).toMatchObject({ ticketId: 1 });
    expect(s.inspecting).toBe(true);
    // repeating the call does nothing while the first correction runs
    useGame.getState().correctPlate();
    expect(useGame.getState().correction!.endsAt).toBe(s.correction!.endsAt);
    // verdicts are locked while the sauce is being saved
    useGame.getState().judge("serve");
    expect(useGame.getState().served).toBe(0);
    // the intervention lasts exactly as long as it says on the tin
    expect(s.correction!.endsAt - s.correction!.startedAt).toBeCloseTo(2.4, 6);
    // a paused clock freezes the correction too
    useGame.setState({ paused: true } satisfies Partial<State>);
    useGame.getState().tick(3);
    expect(useGame.getState().tickets.find((t) => t.id === 1)!.condition!.sauce).toBe("split");
    useGame.setState({ paused: false } satisfies Partial<State>);
    // 2.39s in: still split. The final 0.02s is the whole job.
    useGame.getState().tick(2.39);
    const almost = useGame.getState();
    expect(almost.tickets.find((t) => t.id === 1)!.condition!.sauce).toBe("split");
    expect(almost.correction).not.toBeNull();
    useGame.getState().tick(0.02);
    s = useGame.getState();
    const fixed = s.tickets.find((t) => t.id === 1)!;
    expect(fixed.condition!.sauce).toBe("smooth");
    expect(fixed.sauce).toBe("saved");
    expect(fixed.quality).toBe(88);
    expect(s.correction).toBeNull();
    // +2 for the help, minus the ambient drain of those same seconds
    expect(s.cooks[0].morale).toBeGreaterThan(morale0);
    expect(s.events.filter((e) => e.kind === "intervention" && e.action === "whisk")).toHaveLength(1);
    expect(s.career.lastSauceHelp).toMatchObject({ night: 3, cookName: s.cooks[0].name });
    // the untouched ready plate was not part of the correction
    expect(s.tickets.find((t) => t.id === 2)!.condition!.sauce).toBe("none");
    // no second correction on a smooth sauce, and none without a held plate
    useGame.getState().correctPlate();
    expect(useGame.getState().correction).toBeNull();
    useGame.getState().judge("sendback"); // clears the pass
    useGame.getState().correctPlate();
    expect(useGame.getState().correction).toBeNull();
    // a held plate that dies of age mid-correction cancels it silently
    toService({ serviceTime: 50, tickets: [
      rail({ id: 9, age: 54.9, state: "pass", readyAt: 40, condition: { ...split }, quality: 70 }),
    ]});
    useGame.getState().correctPlate();
    expect(useGame.getState().correction).toBeTruthy();
    useGame.getState().tick(0.3);
    s = useGame.getState();
    expect(s.correction).toBeNull();
    expect(s.events.filter((e) => e.kind === "intervention" && e.action === "whisk")).toHaveLength(0);
  });

  it("E: a truthful send-back names the fault; a free one earns the grudge", () => {
    const split = { ...pristine("Beef Wellington"), sauce: "split" as const };
    toService({ tickets: [rail({ id: 1, state: "pass", readyAt: 10, condition: split, quality: 70 })] });
    useGame.getState().judge("sendback");
    let s = useGame.getState();
    expect(s.tickets[0].state).toBe("rail");
    expect(s.tickets[0].requestedCorrection).toBe("sauce");
    expect(s.tickets[0].condition).toBeUndefined();
    expect(s.cooks[0].grudge).toBeNull();
    // the remake honours the correction: the sauce comes back together
    useGame.getState().plateToPass(1);
    useGame.getState().tick(20);
    expect(useGame.getState().tickets[0].condition!.sauce).toBe("smooth");
    // rejecting a perfect plate still earns the grudge — and never erases an old one
    toService({ tickets: [rail({ id: 2, state: "pass", readyAt: 10, condition: pristine(), quality: 88 })] });
    useGame.getState().judge("sendback");
    expect(useGame.getState().cooks[0].grudge).toBe("sent back");
    useGame.setState({
      cooks: useGame.getState().cooks.map((c, i) => (i === 0 ? { ...c, grudge: "86ed" } : c)),
      tickets: [rail({ id: 3, state: "pass", readyAt: 10, condition: split, quality: 70 })],
    } satisfies Partial<State>);
    useGame.getState().judge("sendback");
    expect(useGame.getState().cooks[0].grudge).toBe("86ed");
  });

  it("F: a walkout returns unfinished work to the rail; the chef works one station", () => {
    toService({ tickets: [
      rail({ id: 1, state: "plating", plateAt: 11, plateDur: 4, requestedCorrection: "sauce" }),
      rail({ id: 2, station: 0, state: "ready", readyAt: 5, condition: pristine(), quality: 88 }),
      rail({ id: 3, station: 1, dish: "Pommes purée" }),
      rail({ id: 4, station: 2, dish: "Soufflé (weeping)" }),
    ], cooks: useGame.getState().cooks.map((c, i) => (i <= 1 ? { ...c, walkedOut: true, walkoutAt: 9 } : c)) });
    useGame.getState().tick(0.5);
    let s = useGame.getState();
    const back = s.tickets.find((t) => t.id === 1)!;
    expect(back.state).toBe("rail");
    expect(back.requestedCorrection).toBe("sauce");
    expect(back.plateAt).toBe(0);
    expect(s.tickets.find((t) => t.id === 2)!.state).toBe("ready");
    // the ready plate still owns its station's slot until it is collected
    useGame.getState().collectPlate(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("pass");
    // the chef can call it — but cannot cover two stations at once
    useGame.getState().plateToPass(1);
    expect(useGame.getState().tickets.find((t) => t.id === 1)!.byChef).toBe(true);
    useGame.getState().plateToPass(3);
    expect(useGame.getState().tickets.find((t) => t.id === 3)!.state).toBe("rail");
    // TTL applies on the completion tick — finishing cannot outrun a walking table
    toService({ tickets: [rail({ id: 8, age: 54.9, state: "plating", plateAt: 9, plateDur: 4 })] });
    useGame.getState().tick(0.3);
    expect(useGame.getState().tickets.find((t) => t.id === 8)).toBeUndefined();
    // simultaneous completions survive as distinct ready plates — live cooks only;
    // a walked-out cook's pan goes cold on the rail instead
    toService({ tickets: [
      rail({ id: 10, state: "plating", plateAt: 10, plateDur: 4 }),
      rail({ id: 11, station: 1, dish: "Pommes purée", state: "plating", plateAt: 10, plateDur: 4 }),
    ], cooks: useGame.getState().cooks.map((c) => ({ ...c, walkedOut: false })) });
    useGame.getState().tick(0.5);
    expect(useGame.getState().tickets.filter((t) => t.state === "ready").map((t) => t.id).sort()).toEqual([10, 11]);
  });

  it("G: runTable walks only the held plate and its same-table ready peers", () => {
    toService({ tickets: [
      rail({ id: 1, table: 12, dish: "Beef Wellington", state: "pass", readyAt: 10, condition: pristine(), quality: 88 }),
      rail({ id: 2, table: 12, dish: "Pommes purée", station: 1, state: "ready", readyAt: 10, condition: pristine("Pommes purée"), quality: 88 }),
      rail({ id: 3, table: 13, dish: "Soufflé (weeping)", station: 2, state: "ready", readyAt: 10, condition: pristine("Soufflé (weeping)"), quality: 88 }),
    ]});
    useGame.getState().runTable();
    const s = useGame.getState();
    expect(s.served).toBe(2);
    expect(s.tickets.find((t) => t.id === 3)!.state).toBe("ready");
    expect(s.lastDelivery).toMatchObject({ table: 12 });
    expect(s.lastDelivery!.plates.map((p) => p.dish).sort()).toEqual(["Beef Wellington", "Pommes purée"].sort());
    expect(s.events.filter((e) => e.kind === "plate" && e.verdict === "serve")).toHaveLength(2);
    // paused and correcting are hard no-ops
    toService({ served: 0, tickets: [rail({ id: 4, state: "pass", readyAt: 10, condition: pristine(), quality: 88 })] });
    useGame.setState({ paused: true } satisfies Partial<State>);
    useGame.getState().runTable();
    expect(useGame.getState().served).toBe(0);
  });

  it("H: the second teaching plate opens a real, authored rush", () => {
    useGame.setState({ phase: "title" } satisfies Partial<State>);
    useGame.getState().enterResidency();
    expect(useGame.getState().openingStep).toBe("serve");
    useGame.getState().judge("serve");
    useGame.getState().plateToPass(useGame.getState().tickets[0].id);
    useGame.getState().tick(120);
    useGame.getState().judge("serve");
    const s = useGame.getState();
    expect(s.openingStep).toBeNull();
    const fresh = s.tickets.filter((t) => t.state === "rail");
    expect(fresh).toHaveLength(3);
    expect(fresh.map((t) => t.station).sort()).toEqual([0, 1, 2]);
    const welly = fresh.find((t) => t.dish === "Beef Wellington")!;
    const puree = fresh.find((t) => t.dish === "Pommes purée")!;
    expect(welly.table).toBe(puree.table);
    // the lesson ticket arrives with its split jus — visible evidence, not a whisper
    useGame.getState().plateToPass(welly.id);
    useGame.getState().tick(20);
    const cooked = useGame.getState().tickets.find((t) => t.id === welly.id)!;
    expect(cooked.state).toBe("ready");
    expect(cooked.condition!.sauce).toBe("split");
    expect(cooked.quality).toBe(70);
    // a smashed second plate ends the lesson the same way
    storage.clear();
  });

  it("I: a developed Wellington persists, revises once a night, and walks on first", () => {
    const cook = useGame.getState().cooks.find((c) => c.station === 0)!;
    useGame.setState({ phase: "briefing", career: { ...useGame.getState().career, night: 2 } } satisfies Partial<State>);
    useGame.getState().developWellington("herb");
    let s = useGame.getState();
    expect(s.career.recipeHistory).toHaveLength(1);
    expect(s.career.recipeHistory![0]).toMatchObject({ finish: "herb", contributor: cook.name, night: 2 });
    expect(JSON.parse(storage.get("mem-career")!).version).toBe(2);
    useGame.getState().developWellington("classic");
    expect(useGame.getState().career.recipeHistory).toHaveLength(1);
    expect(useGame.getState().career.recipeHistory![0].finish).toBe("classic");
    useGame.getState().developWellington("herb");
    // in-service revision is a no-op
    useGame.setState({ phase: "service" } satisfies Partial<State>);
    useGame.getState().developWellington("classic");
    expect(useGame.getState().career.recipeHistory![0].finish).toBe("herb");
    // the next service opens with that Wellington on the rail, recipe snapshot intact
    useGame.setState({ phase: "briefing" } satisfies Partial<State>);
    useGame.getState().startService();
    s = useGame.getState();
    const welly = s.tickets.find((t) => t.dish === "Beef Wellington")!;
    expect(welly.state).toBe("rail");
    useGame.getState().plateToPass(welly.id);
    const called = useGame.getState().tickets.find((t) => t.id === welly.id)!;
    expect(called.recipeFinish).toBe("herb");
    expect(called.recipeContributor).toBe(cook.name);
    // herb finish costs time — the same call with classic is 0.8s shorter
    const herbDur = called.plateDur;
    useGame.setState({ phase: "briefing", career: { ...useGame.getState().career, recipeHistory: [{ dish: "Beef Wellington", finish: "classic", contributor: cook.name, night: 2 }] } } satisfies Partial<State>);
    useGame.getState().startService();
    const welly2 = useGame.getState().tickets.find((t) => t.dish === "Beef Wellington")!;
    useGame.getState().plateToPass(welly2.id);
    const classicDur = useGame.getState().tickets.find((t) => t.id === welly2.id)!.plateDur;
    expect(herbDur - classicDur).toBeCloseTo(0.8, 5);
  });

  it("I2: old saves keep their careers; malformed optional memory is dropped safely", async () => {
    // v0/v1 load as before
    const cooks = useGame.getState().cooks;
    storage.set("mem-career", JSON.stringify({ career: { night: 4, cash: 200 }, cooks }));
    useGame = await freshGame();
    expect(useGame.getState().career.night).toBe(4);
    storage.set("mem-career", JSON.stringify({ version: 1, career: { night: 5, cash: 300 }, cooks }));
    useGame = await freshGame();
    expect(useGame.getState().career.night).toBe(5);
    // v2 keeps its recipe history and sauce-help memory
    storage.set("mem-career", JSON.stringify({ version: 2, cooks,
      career: { night: 3, cash: 10,
        recipeHistory: [{ dish: "Beef Wellington", finish: "herb", contributor: "PETRA", night: 3 }],
        lastSauceHelp: { night: 2, cookName: "DIMITRI", dish: "Lamb sauce (missing)" } } }));
    useGame = await freshGame();
    let s = useGame.getState();
    expect(s.career.recipeHistory![0].contributor).toBe("PETRA");
    expect(s.career.lastSauceHelp!.cookName).toBe("DIMITRI");
    // same-length sanitization still applies — a padded name is cleaned, not kept
    storage.set("mem-career", JSON.stringify({ version: 2, cooks,
      career: { night: 3, cash: 10,
        recipeHistory: [{ dish: "Beef Wellington", finish: "herb", contributor: " PETRA ", night: 3 }] } }));
    useGame = await freshGame();
    s = useGame.getState();
    expect(s.career.recipeHistory).toHaveLength(1);
    expect(s.career.recipeHistory![0].contributor).toBe("PETRA");
    // a non-array history becomes an empty array rather than a loaded gun
    storage.set("mem-career", JSON.stringify({ version: 2, cooks,
      career: { night: 3, cash: 10, recipeHistory: 42 } }));
    useGame = await freshGame();
    expect(useGame.getState().career.recipeHistory).toEqual([]);
    // corrupt optional memory is dropped without discarding the career
    storage.set("mem-career", JSON.stringify({ version: 2, cooks,
      career: { night: 3, cash: 10,
        recipeHistory: [{ dish: "Foie torchon", finish: "green", contributor: "", night: 99 }],
        lastSauceHelp: { night: "later", cookName: 42, dish: null },
        lastReview: { nope: true } } }));
    useGame = await freshGame();
    s = useGame.getState();
    expect(s.career.night).toBe(3);
    expect(s.career.recipeHistory).toEqual([]);
    expect(s.career.lastSauceHelp).toBeUndefined();
    expect(s.career.lastReview).toBeUndefined();
    // a future version is still blocked, byte-for-byte untouched
    const payload = JSON.stringify({ version: 3, career: { night: 3 }, cooks });
    storage.set("mem-career", payload);
    useGame = await freshGame();
    expect(useGame.getState().saveIssue).toBeTruthy();
    expect(storage.get("mem-career")).toBe(payload);
  });

  it("A2: the ready guard sees the whole array, and overdue plates arrive cooled", () => {
    // plating BEFORE an existing ready in array order must not stack a second ready
    toService({ serviceTime: 10, nextTicketIn: 999, barkAt: 9999, tickets: [
      rail({ id: 1, state: "plating", plateAt: 9, plateDur: 4 }),
      rail({ id: 2, state: "ready", readyAt: 5, condition: pristine(), quality: 88 }),
    ]});
    let rolls = 0;
    useGame.setState({ rng: () => { rolls += 1; return 0.5; } } satisfies Partial<State>);
    useGame.getState().tick(0.5);
    let s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 1)!.state).toBe("plating");
    expect(s.tickets.filter((t) => t.state === "ready")).toHaveLength(1);
    // blocked plating consumes no finishPlating rolls
    expect(rolls).toBe(0);
    // ready-first order behaves identically
    toService({ serviceTime: 10, tickets: [
      rail({ id: 3, state: "ready", readyAt: 5, condition: pristine(), quality: 88 }),
      rail({ id: 4, state: "plating", plateAt: 9, plateDur: 4 }),
    ]});
    useGame.getState().tick(0.5);
    s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 4)!.state).toBe("plating");
    expect(s.tickets.filter((t) => t.state === "ready")).toHaveLength(1);
    // when the block finally clears, the plate has already waited out its heat:
    // plateAt 0, released at serviceTime 36 — it lands cold, not hot-then-cold
    toService({ serviceTime: 36, tickets: [
      rail({ id: 5, state: "plating", plateAt: 0, plateDur: 4 }),
    ]});
    useGame.getState().tick(0.5);
    const late = useGame.getState().tickets.find((t) => t.id === 5)!;
    expect(late.state).toBe("ready");
    expect(late.condition!.temperature).toBe("cold");
    // whatever the pan produced, the cold knocked 24 points off it
    expect(late.quality).toBeLessThanOrEqual(64);
  });

  it("A4: a cook who already left cannot finish a ghost plate; firing it is refused", () => {
    toService({ serviceTime: 20, tickets: [
      rail({ id: 1, state: "plating", plateAt: 5, plateDur: 4, age: 10, requestedCorrection: "sauce" }),
    ], cooks: useGame.getState().cooks.map((c, i) => (i === 0 ? { ...c, walkedOut: true, walkoutAt: 8 } : c)) });
    useGame.getState().tick(0.1);
    const back = useGame.getState().tickets.find((t) => t.id === 1)!;
    expect(back.state).toBe("rail");
    expect(back.plateAt).toBe(0);
    expect(back.quality).toBe(-1);
    expect(back.condition).toBeUndefined();
    expect(back.requestedCorrection).toBe("sauce");
    expect(back.age).toBeGreaterThan(10);
    // the ghost job can't be fired either
    toService({ serviceTime: 20, tickets: [
      rail({ id: 2, state: "plating", plateAt: 25, plateDur: 4 }),
    ], cooks: useGame.getState().cooks.map((c, i) => (i === 0 ? { ...c, walkedOut: true, walkoutAt: 8 } : c)) });
    useGame.getState().firePlate(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("plating");
  });

  it("A5: inspection belongs to the held plate; the rail selection survives it", () => {
    const split = { ...pristine(), sauce: "split" as const };
    toService({ tickets: [
      rail({ id: 1, state: "pass", readyAt: 9, condition: split, quality: 70 }),
      rail({ id: 2, station: 1, dish: "Pommes purée" }),
    ]});
    useGame.getState().selectTicket(2);
    useGame.getState().setInspecting(true);
    useGame.getState().turnPlate(0.7);
    expect(useGame.getState().inspectionTurn).toBeCloseTo(0.7, 6);
    // resolving the held plate clears inspection and the turn, keeps the aim
    useGame.getState().judge("serve");
    let s = useGame.getState();
    expect(s.inspecting).toBe(false);
    expect(s.inspectionTurn).toBe(0);
    expect(s.selectedTicketId).toBe(2);
    // expiring a SELECTED rail ticket doesn't close a live inspection —
    // the inspection only dies with its held plate
    toService({ tickets: [
      rail({ id: 3, state: "pass", readyAt: 9, condition: pristine(), quality: 88 }),
      rail({ id: 4, station: 1, dish: "Pommes purée", age: 54.9 }),
    ]});
    useGame.getState().selectTicket(4);
    useGame.getState().setInspecting(true);
    useGame.getState().tick(0.3);
    s = useGame.getState();
    expect(s.tickets.find((t) => t.id === 4)).toBeUndefined();
    expect(s.selectedTicketId).toBeNull();
    expect(s.inspecting).toBe(true);
    // and when the held plate itself walks, the inspection is over
    toService({ tickets: [
      rail({ id: 5, state: "pass", readyAt: 9, condition: pristine(), quality: 88, age: 54.9 }),
    ]});
    useGame.getState().setInspecting(true);
    useGame.getState().turnPlate(0.4);
    useGame.getState().tick(0.3);
    s = useGame.getState();
    expect(s.inspecting).toBe(false);
    expect(s.inspectionTurn).toBe(0);
  });

  it("A6: the glossary modal swallows plate verbs whole", () => {
    const split = { ...pristine(), sauce: "split" as const };
    toService({ tickets: [
      rail({ id: 1, state: "pass", readyAt: 9, condition: split, quality: 70 }),
      rail({ id: 2, station: 1, dish: "Pommes purée" }),
      rail({ id: 3, station: 2, dish: "Soufflé (weeping)", state: "plating", plateAt: 12, plateDur: 4 }),
    ]});
    useGame.setState({ inspecting: true } satisfies Partial<State>);
    useGame.setState({ glossary: true } satisfies Partial<State>);
    useGame.getState().plateToPass(2);
    expect(useGame.getState().tickets.find((t) => t.id === 2)!.state).toBe("rail");
    useGame.getState().selectTicket(2);
    expect(useGame.getState().selectedTicketId).toBeNull();
    useGame.getState().firePlate(3);
    expect(useGame.getState().tickets.find((t) => t.id === 3)!.state).toBe("plating");
    useGame.getState().turnPlate(0.5);
    expect(useGame.getState().inspectionTurn).toBe(0);
    useGame.getState().judge("serve");
    expect(useGame.getState().served).toBe(0);
    // closing the modal hands control straight back
    useGame.setState({ glossary: false } satisfies Partial<State>);
    useGame.getState().judge("serve");
    expect(useGame.getState().served).toBe(1);
  });

  it("serve events keep food quality honest when context inflates the score", () => {
    toService({ serviceTime: 10, tableServeAt: { 11: 5 }, tickets: [
      rail({ id: 1, table: 11, state: "pass", readyAt: 10, condition: pristine(), quality: 88 }),
    ]});
    useGame.getState().judge("serve");
    const ev = useGame.getState().events.find((e) => e.kind === "plate") as Extract<ServiceEvent, { kind: "plate" }>;
    expect(ev.quality).toBe(88);
    expect(ev.guestScore).toBe(94);
  });
});
