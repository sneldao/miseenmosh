import { useEffect, useRef, useState } from "react";
import { useGame, tierOf, tierName, BOARD, Ticket, PlateTier, VENUES } from "../game/state";
import stampServe from "../../assets/recraft/vector/stamp-serve.svg";
import stampBack from "../../assets/recraft/vector/stamp-send-back.svg";
import stampSmash from "../../assets/recraft/vector/stamp-smash.svg";
import lineupArt from "../../assets/recraft/cast-gilliam/title-lineup.webp";
import castPetra from "../../assets/recraft/cast-gilliam/petra.webp";
import castDimitri from "../../assets/recraft/cast-gilliam/dimitri.webp";
import castAnwar from "../../assets/recraft/cast-gilliam/anwar.webp";
import castBeefcakes from "../../assets/recraft/cast-gilliam/beefcakes.webp";
import castCritic from "../../assets/recraft/cast-gilliam/critic.webp";
import castFishmonger from "../../assets/recraft/cast-gilliam/fishmonger.webp";
import castCommis from "../../assets/recraft/cast-gilliam/commis.webp";
import marketSign from "../../assets/recraft/paper-cookery/market-sign.webp";
import reviewClip from "../../assets/recraft/raster/review-clipping-third-star.webp";

const SPLASH = [
  "“WHERE'S THE LAMB SAUCE?”",
  "“Protein.” — BEEFCAKES",
  "0 stars. Still open.",
  "The inspector is already in the dining room.",
  "“Technically fish.” — the fishmonger",
  "No walkouts. No refunds. No mercy.",
  "“It's not the pan. It's you.”",
  "Pans will fall. Morale will too.",
  "Serves 5 tables. Ego serves 1.",
  "“He called it a protein bowl.” — the press",
];

const CAST_IMG: Record<string, string> = { PETRA: castPetra, DIMITRI: castDimitri, ANWAR: castAnwar };
const FEUD_ART: Record<string, string> = { beefcakes: castBeefcakes, critic: castCritic, fishmonger: castFishmonger };
const FEUD_ALT: Record<string, string> = {
  beefcakes: "BEEFCAKES — protein dealer",
  critic: "THE PRESS — hungry for the best",
  fishmonger: "THE FISH VAN — still cold",
};
const CAST_INTRO: Record<string, string> = {
  PETRA: "runs grill. Do not touch her tongs.",
  DIMITRI: "runs sauté. He's seen things.",
  ANWAR: "runs pastry. Fragile. Handle with care.",
};
const moodOf = (m: number, out: boolean) =>
  out ? "walked out" : m >= 70 ? "sharp" : m >= 45 ? "tired" : m >= 25 ? "dangerous" : "feral";

/** Charge-and-release scream: hold Space, the meter fills, let go. */
function useScreamCharge() {
  const [charge, setCharge] = useState(0);
  const start = useRef(0);
  const on = useRef(false);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!on.current) return;
      setCharge(Math.min(1.4, (performance.now() - start.current) / 900));
      raf = requestAnimationFrame(loop);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      const s = useGame.getState();
      if (s.phase !== "service" || s.paused) return;
      e.preventDefault();
      if (on.current) return;
      on.current = true;
      start.current = performance.now();
      setCharge(0.02);
      raf = requestAnimationFrame(loop);
    };
    const release = () => {
      if (!on.current) return;
      on.current = false;
      cancelAnimationFrame(raf);
      const s = useGame.getState();
      const p = Math.max(0.2, Math.min(1.4, (performance.now() - start.current) / 900));
      setCharge(0);
      if (s.phase === "service" && !s.paused) s.scream(p);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      release();
    };
    const blur = () => {
      on.current = false;
      cancelAnimationFrame(raf);
      setCharge(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      cancelAnimationFrame(raf);
    };
  }, []);
  return charge;
}

function usePointerLocked() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const h = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", h);
    h();
    return () => document.removeEventListener("pointerlockchange", h);
  }, []);
  return locked;
}


const STAMP_IMG: Record<string, string> = {
  SERVED: stampServe,
  "SENT BACK": stampBack,
  SMASHED: stampSmash,
};

const STATION_COLOR = ["#a8322a", "#b07a2a", "#3a6a9a"];
const STATION_NAME = ["GRILL", "SAUTÉ", "PASTRY"];

const TIER_LINE: Record<PlateTier, string> = {
  pristine: "Pristine. The garnish is doing its job.",
  serviceable: "Serviceable. Nobody will photograph it.",
  criminal: "A war crime on a plate.",
};

function TicketCard({ t, hotkey }: { t: Ticket; hotkey?: number }) {
  const plateToPass = useGame((s) => s.plateToPass);
  const firePlate = useGame((s) => s.firePlate);
  const serviceTime = useGame((s) => s.serviceTime);
  const request = useGame((s) => s.request);
  const sauce = useGame((s) => s.sauce);
  const frac = Math.min(1, t.age / 55);
  const plating = t.state === "plating";
  // the sear: the last 30% of the cook glows gold — fire inside it (F or click)
  const searFrac = plating && t.plateDur > 0
    ? Math.max(0, Math.min(1, 1 - (t.plateAt - serviceTime) / t.plateDur))
    : 0;
  const golden = searFrac >= 0.7;
  const myReq = request?.ticketId === t.id ? request : null;
  const splitting = plating && sauce?.ticketId === t.id;
  return (
    <div
      className={`ticket ${frac > 0.45 ? "aging" : ""} ${frac > 0.72 ? "dying" : ""} ${plating ? "plating" : ""} ${golden ? "golden" : ""} ${splitting ? "sauced" : ""}`}
      onClick={() => (plating ? firePlate() : plateToPass(t.id))}
    >
      <div className="tno">
        TABLE {t.table} · #{t.id}
        {hotkey && <span className="kbd">{hotkey}</span>}
      </div>
      <div className="dish">{t.dish}</div>
      {myReq && (
        <div className="modline">
          {myReq.mod} — T{myReq.table}{myReq.mod === "FAST" ? " · <30s" : " · fire it golden"}
        </div>
      )}
      <div className="trow">
        <span className="chip" style={{ background: STATION_COLOR[t.station] }}>
          {STATION_NAME[t.station]}
        </span>
        <span className="tstate">
          {plating
            ? splitting
              ? "SPLIT! — M TO WHISK"
              : golden
                ? "SEAR — FIRE IT"
                : `PLATING…${t.sauce === "saved" ? " ✓" : ""}`
            : `${Math.floor(t.age)}s`}
        </span>
      </div>
      {plating ? (
        <div className="searbar">
          <div className="sear-goldzone" />
          <div className={`searfill${golden ? " gold" : ""}`} style={{ width: `${searFrac * 100}%` }} />
        </div>
      ) : (
        <div className="agebar" style={{ width: `${frac * 100}%` }} />
      )}
    </div>
  );
}

function Milestone() {
  const milestoneAt = useGame((s) => s.milestoneAt);
  const milestoneText = useGame((s) => s.milestoneText);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (milestoneAt) setShown(milestoneAt);
  }, [milestoneAt]);
  if (!shown || !milestoneText) return null;
  return (
    <div className="milestone" key={shown}>
      {milestoneText}
    </div>
  );
}

function Chorus() {
  const screamAt = useGame((s) => s.screamAt);
  const chorusText = useGame((s) => s.chorusText);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (screamAt) setShown(screamAt);
  }, [screamAt]);
  if (!shown) return null;
  return (
    <div className="chorus" key={shown}>
      {chorusText}
    </div>
  );
}

function Stamp() {
  const stampText = useGame((s) => s.stampText);
  const stampAt = useGame((s) => s.stampAt);
  if (!stampAt || !stampText) return null;
  const cls = stampText === "SERVED" ? "ok" : stampText === "SENT BACK" ? "warn" : "violent";
  return (
    <div className={`stamp ${cls}`} key={stampAt}>
      {STAMP_IMG[stampText] ? <img src={STAMP_IMG[stampText]} alt={stampText} /> : stampText}
    </div>
  );
}

function Ticker() {
  const feed = useGame((s) => s.feed);
  return (
    <div className="ticker">
      {feed.slice(-4).map((f) => (
        <div key={f.id} className={`line ${f.kind}`}>
          {f.text}
        </div>
      ))}
    </div>
  );
}

function VowRibbon() {
  const vow = useGame((s) => s.career.vow);
  const turns101 = useGame((s) => s.table101Turns);
  if (!vow) return null;
  return (
    <div className="vow-ribbon">
      {vow === "star" ? "STAR VOW — no walks, clock them" : vow === "house" ? `HOUSE VOW — 101 turns ${turns101}/2` : "BRIGADE VOW — nobody walks"}
    </div>
  );
}

function FolkloreBar() {
  const folklore = useGame((s) => s.folklore);
  const answer = useGame((s) => s.answerFolklore);
  const move101 = useGame((s) => s.move101);
  const moved101 = useGame((s) => s.moved101);
  if (!folklore) return null;
  const label = folklore.kind === "return" ? "REFUSE WITH GRACE (D) / RE-FIRE (F)" : folklore.kind === "flash" ? "LET THEM POST — do nothing" : "FIX IT (R)";
  return (
    <div className="folklore-bar">
      <span>FOLKLORE TEST — table {folklore.table}: {label}</span>
      {folklore.kind !== "flash" && <button className="btn" onClick={() => answer(true)}>ANSWER</button>}
      {!moved101 && <button className="btn ghost" onClick={move101}>MOVE 101 (T)</button>}
    </div>
  );
}

function Brigade() {
  const cooks = useGame((s) => s.cooks);
  return (
    <div className="brigade">
      {cooks.map((c) => (
        <div key={c.id} className={`cook ${c.walkedOut ? "out" : ""}`}>
          <span className="cname">{c.name}</span>
          <div className="mbar">
            <div
              className="mfill"
              style={{
                width: `${c.morale}%`,
                background: c.morale > 45 ? "#c9a44a" : "#a8322a",
              }}
            />
          </div>
          {c.walkedOut && <span className="out-tag">WALKED</span>}
          {c.burning && <span className="out-tag fire">FIRE</span>}
          {!c.walkedOut && c.grudge && <span className="out-tag grudge" title={c.grudge}>HOLDING ONE</span>}
        </div>
      ))}
    </div>
  );
}

function ReviewCard() {
  const review = useGame((s) => s.review);
  const career = useGame((s) => s.career);
  const continueNext = useGame((s) => s.continueNext);
  const [copied, setCopied] = useState(false);
  if (!review) return null;
  const card =
    `MISE EN MOSH — night ${career.night} review\n` +
    `${"★".repeat(review.stars)}${"☆".repeat(5 - review.stars)}\n` +
    (review.vowLine ? `${review.vowLine}\n` : "") +
    (review.personaVerdict ? `${review.personaVerdict}\n` : "") +
    `"${review.quote}"\n` +
    `${review.covers} covers · ${review.misses} walks · ` +
    `${review.smashed} plates smashed · inspector ${review.spotted ? "CLOCKED" : "missed"}`;
  return (
    <div className="review-wrap">
      <div
        className="review"
        style={{
          backgroundImage: `linear-gradient(rgba(244,234,210,.90), rgba(244,234,210,.97)), url(${reviewClip})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="rhead">
          TONIGHT'S REVIEW — {VENUES[career.venue].name}, NIGHT {career.night}
        </div>
        <div className="stars">
          {"★".repeat(review.stars)}
          <span className="dim">{"☆".repeat(5 - review.stars)}</span>
        </div>
        <img className="press-clip" src={reviewClip} alt="Press clipping" />
        <div className="quote">“{review.quote}”</div>
        {review.vowLine && <div className="board-line">{review.vowLine}</div>}
        {review.personaVerdict && <div className="critic-line">{review.personaVerdict}</div>}
        {review.folkloreLine && <div className="critic-line">{review.folkloreLine}</div>}
        <div className="critic-line">{review.criticVerdict}</div>
        <div className="rstats">
          <span>{review.covers} covers</span>
          <span>{review.misses} walked</span>
          <span>{review.complaints} send-backs</span>
          <span>{review.smashed} smashed</span>
          <span>{review.walkouts} walkouts</span>
          <span>streak ×{review.bestStreak}</span>
          {review.silent && <span>SILENT SERVICE ★</span>}
          <span>inspector {review.spotted ? "CLOCKED" : "missed"}</span>
        </div>
        {review.betLine && <div className="board-line">{review.betLine}</div>}
        <div className="rfoot">EGO {Math.round(review.ego)} · {tierName(review.ego)}</div>
        <div className="rbtns">
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(card);
              setCopied(true);
            }}
          >
            {copied ? "COPIED" : "COPY REVIEW"}
          </button>
          <button className="btn serve" onClick={continueNext}>
            NEXT MORNING <span className="kbd">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Briefing() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const feud = useGame((s) => s.feud);
  const nightTake = useGame((s) => s.nightTake);
  const briefAction = useGame((s) => s.briefAction);
  const clout = useGame((s) => s.clout);
  const bet = useGame((s) => s.bet);
  const borrow = useGame((s) => s.borrow);
  const repay = useGame((s) => s.repay);
  const ego = useGame((s) => s.ego);
  const feudChoice = useGame((s) => s.feudChoice);
  const lots = useGame((s) => s.lots);
  const buyLot = useGame((s) => s.buyLot);
  const coach = useGame((s) => s.coach);
  const chooseVow = useGame((s) => s.chooseVow);
  const chooseSeating = useGame((s) => s.chooseSeating);
  const meal = useGame((s) => s.meal);
  const mealDone = (career.mealNight ?? -1) >= career.night;
  const feed = useGame((s) => s.feed);
  const startService = useGame((s) => s.startService);
  const canSave = useGame((s) => s.canSave);
  const v = VENUES[career.venue];
  const [beat, setBeat] = useState(0);
  const lastBeat = feud ? 2 : 1;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (beat < lastBeat) setBeat(beat + 1);
      else startService();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [beat, lastBeat, startService]);
  const fwdLabel = beat < lastBeat ? (beat === 0 ? "TO THE MARKET →" : "TONIGHT'S PROBLEM →") : "RUN SERVICE ↵";
  const go = () => {
    if (beat < lastBeat) {
      setBeat(beat + 1);
      return;
    }
    startService();
    // the click is the gesture, so the pass can be taken immediately
    if (useGame.getState().firstPerson) {
      const c = document.querySelector("canvas") as HTMLCanvasElement | null;
      try {
        const lock = c?.requestPointerLock?.() as unknown as Promise<void> | undefined;
        lock?.catch?.(() => {
          // pointer lock blocked (e.g. sandboxed iframe) — stay playable
          const g = useGame.getState();
          if (g.firstPerson) g.toggleFirstPerson();
        });
      } catch {
        useGame.getState().toggleFirstPerson();
      }
    }
  };
  return (
    <div className="brief-wrap">
      <div className="brief">
        <div className="bhead">
          NIGHT {career.night} — {v.name}
          <div className="bsub">{v.sub}</div>
        </div>
        <div className="bstats">
          <span>£{career.cash}</span>
          <span>{"★".repeat(Math.min(12, career.stars)) || "☆"} {career.stars}★ total</span>
          <span>{9 - career.night + 1} services left</span>
        </div>
        {nightTake && (
          <div className="btake">
            Last night: £{nightTake.covers} covers − £{nightTake.wages} wages − £
            {nightTake.breakage} breakage ={" "}
            <b className={nightTake.net >= 0 ? "up" : "down"}>
              {nightTake.net >= 0 ? "+" : ""}£{nightTake.net}
            </b>
          </div>
        )}
        {beat === 0 && (
          <div className="beat">
            <div className="mhead">
              THE BRIGADE{career.night === 1 ? " — first night, so: introductions" : ""}
            </div>
            <div className="cast row">
              {cooks.map((c) => (
                <div key={c.id} className={`ccard tall ${c.walkedOut ? "gone" : ""}`}>
                  <img src={CAST_IMG[c.name] ?? castCommis} alt={c.name} />
                  {!CAST_IMG[c.name] && <span className="freshmeat">FRESH MEAT — first night</span>}
                  <span className="cname">
                    {c.name}
                    {c.trauma > 0 && <span className="scar">{" ✕".repeat(Math.min(3, c.trauma))}</span>}
                  </span>
                  <span className="mood">
                    {moodOf(c.morale, c.walkedOut)} · skill {Math.round(c.skill * 100)}
                  </span>
                  {career.night === 1 && CAST_INTRO[c.name] && (
                    <span className="intro">{CAST_INTRO[c.name]}</span>
                  )}
                </div>
              ))}
            </div>
            {/* family meal: eaten standing up, before doors — the heart before the shouting */}
            <div className="market">
              <div className="mhead">FAMILY MEAL — eaten standing up</div>
              {mealDone ? (
                <div className="ltaken">bowls licked. yesterday stays yesterday.</div>
              ) : (
                <>
                  <button className="btn lbtn" onClick={() => meal(0)}>
                    PRAISE THEM <span className="cost">+12 morale all · clears grudges</span>
                  </button>
                  <button className="btn lbtn" onClick={() => meal(1)}>
                    THE CRISPY BIT GOES TO THE LOWEST <span className="cost">+25 them, +6 rest · clears grudges</span>
                  </button>
                  <button className="btn lbtn dim" onClick={() => meal(2)}>
                    EAT IN SILENCE <span className="cost">−1 trauma where it hurts · clears grudges</span>
                  </button>
                </>
              )}
            </div>
            {career.night >= 2 && (
            <div className="market">
              <div className="mhead">COACHING — one session a night, they adapt or crack</div>
              {(career.coachNight ?? -1) >= career.night ? (
                <div className="ltaken">session done. let it simmer.</div>
              ) : (
                <>
                  {cooks.map((c) => (
                    <div key={c.id} className="lot">
                      <span className="lname">{c.name}</span>
                      <span className="ldesc">skill {Math.round(c.skill * 100)} · {moodOf(c.morale, c.walkedOut)}{c.grudge ? ` · holding: ${c.grudge}` : ""}</span>
                      <span className="lbtns">
                        <button className="btn lbtn" disabled={c.walkedOut} onClick={() => coach(c.id, "praise")}>PRAISE</button>
                        <button className="btn lbtn" disabled={c.walkedOut} onClick={() => coach(c.id, "drill")}>DRILL <span className="cost">+3 skill, −8 morale</span></button>
                        <button className="btn lbtn dim" disabled={c.walkedOut} onClick={() => coach(c.id, "rest")}>REST <span className="cost">−1 trauma</span></button>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            )}
          </div>
        )}
        {beat === 1 && (
          <div className="beat">
            <div className="market-head">
              <img className="fishmonger" src={castFishmonger} alt="The fishmonger — what the sea surrendered" />
              <img className="market-sign" src={marketSign} alt="MORNING MARKET — what the sea surrendered" />
            </div>
            {lots.length > 0 && (
          <div className="market">
            <div className="mhead">MORNING MARKET — what the sea surrendered</div>
            {lots.map((l, i) => (
              <div key={i} className={`lot ${l.bought ? "gone" : ""}`}>
                <span className="lname">{l.name}</span>
                <span className="ldesc">{l.desc}</span>
                {l.bought ? (
                  <span className="ltaken">in the walk-in</span>
                ) : l.contested ? (
                  <span className="lbtns">
                    <span className="lwants">BEEFCAKES wants it too.</span>
                    <button
                      className="btn lbtn"
                      disabled={career.cash < l.cost + 20}
                      onClick={() => buyLot(i, true)}
                    >
                      OUTBID HIM £{l.cost + 20}
                    </button>
                    <button className="btn lbtn dim" onClick={() => buyLot(i, false)}>
                      LET HIM HAVE IT
                    </button>
                  </span>
                ) : (
                  <button className="btn lbtn" disabled={career.cash < l.cost} onClick={() => buyLot(i, true)}>
                    £{l.cost}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
            <div className="bshop slim">
              <div className="mhead">BACK OFFICE</div>
              <button className="btn shop" disabled={career.cash < 40} onClick={() => briefAction("drinks")}>
                TAKE THEM FOR DRINKS <span className="cost">£40 · +25 morale</span>
              </button>
              <button
                className="btn shop"
                disabled={career.cash < 80 || career.gear >= 3}
                onClick={() => briefAction("gear")}
              >
                BETTER PANS <span className="cost">£80 · quality floor {career.gear}/3</span>
              </button>
              <button className="btn shop" disabled={career.cash < 60} onClick={() => briefAction("press")}>
                COMP THE FOOD PRESS <span className="cost">£60 · −heat, +5 morale</span>
              </button>
            </div>
            {career.night >= 4 && (
            <div className="bshop slim">
              <div className="mhead">CLOUT — EGO {Math.round(ego)} · doesn&apos;t keep, spend it or sober up</div>
              {(career.champagneNight ?? -1) >= career.night ? (
                <div className="ltaken">champagne on ice for the inspector</div>
              ) : (
                <button className="btn shop" disabled={ego < 15} onClick={() => clout("champagne")}>
                  COMP CHAMPAGNE FOR THE INSPECTOR <span className="cost">15 ego · +10 on their plates</span>
                </button>
              )}
              {(career.dessertNight ?? -1) >= career.night ? (
                <div className="ltaken">dessert on the house for the regulars</div>
              ) : (
                <button className="btn shop" disabled={ego < 20} onClick={() => clout("dessert")}>
                  DESSERT ON THE HOUSE <span className="cost">20 ego · regulars forgive twice</span>
                </button>
              )}
              {career.doorNamed ? (
                <div className="ltaken">your name is above the door</div>
              ) : (
                <button className="btn shop" disabled={ego < 40} onClick={() => clout("door")}>
                  NAME ABOVE THE DOOR <span className="cost">40 ego to ask · 30 to buy · +1★, once ever</span>
                </button>
              )}
            </div>
            )}
            {career.night >= 8 && (
            <>
            <div className="bshop slim">
              <div className="mhead">CALL THE BOARD — one wager a night</div>
              {career.bet ? (
                <div className="ltaken">board called: {BOARD[career.bet.kind].label}</div>
              ) : (
                <>
                  <button className="btn shop" disabled={career.cash < BOARD.covers.stake} onClick={() => bet("covers")}>
                    8+ COVERS <span className="cost">{BOARD.covers.blurb}</span>
                  </button>
                  <button className="btn shop" disabled={career.cash < BOARD.walks.stake} onClick={() => bet("walks")}>
                    NO WALKS <span className="cost">{BOARD.walks.blurb}</span>
                  </button>
                  <button className="btn shop" disabled={ego < BOARD.spot.stakeEgo} onClick={() => bet("spot")}>
                    CLOCK THE INSPECTOR <span className="cost">{BOARD.spot.blurb}</span>
                  </button>
                </>
              )}
            </div>
            <div className="bshop slim">
              <div className="mhead">TONIGHT'S VOW — one a night, judged first on the card</div>
              {career.vow ? (
                <div className="ltaken">vowed: {career.vow.toUpperCase()}</div>
              ) : (
                <>
                  <button className="btn shop" onClick={() => chooseVow("star")}>STAR VOW <span className="cost">no walks + clocked = +1★</span></button>
                  <button className="btn shop" onClick={() => chooseVow("house")}>HOUSE VOW <span className="cost">101 turns twice</span></button>
                  <button className="btn shop" onClick={() => chooseVow("brigade")}>BRIGADE VOW <span className="cost">zero walkouts, trauma −1</span></button>
                </>
              )}
            </div>
            </>
            )}
            {career.night >= 7 && (
            <div className="bshop slim">
              <div className="mhead">MAITRE-D' — who gets wobbly 101 (table 14)?</div>
              {career.seating101 ? (
                <div className="ltaken">101: {career.seating101.toUpperCase()} · window +patience for the rest</div>
              ) : (
                <>
                  <button className="btn shop" onClick={() => chooseSeating("regulars")}>REGULARS TO 101 <span className="cost">they love it · +ego if honoured</span></button>
                  <button className="btn shop" onClick={() => chooseSeating("press")}>PRESS TO WINDOW <span className="cost">fast, writes fast</span></button>
                  <button className="btn shop" onClick={() => chooseSeating("walkin")}>WALK-INS TO 101 <span className="cost">impatient, big spend</span></button>
                </>
              )}
            </div>
            )}
            <div className="bshop slim">
              <div className="mhead">A MAN WITH A VAN</div>
              {(career.debt ?? 0) > 0 ? (
                <button className="btn shop" disabled={career.cash < (career.debt ?? 0) + 30} onClick={repay}>
                  PAY THE MAN £{(career.debt ?? 0) + 30} <span className="cost">before the residency ends</span>
                </button>
              ) : (
                <button className="btn shop" onClick={borrow}>
                  BORROW £100 <span className="cost">he&apos;ll want £130 back</span>
                </button>
              )}
            </div>
          </div>
        )}
        {beat === 2 && feud && (
          <div className="beat feudbeat">
            <img className="feudface" src={FEUD_ART[feud.actor] ?? castBeefcakes} alt={FEUD_ALT[feud.actor] ?? "BEEFCAKES"} />
            <div className="feud">
              <div className="ftext">{feud.text}</div>
              {feud.resolved ? (
                <div className="fout">{feud.outcome}</div>
              ) : (
                <div className="fbtns">
                  {feud.options.map((o, i) => (
                    <button
                      key={i}
                      className="btn fbtn"
                      disabled={i === 0 && career.cash < [90, 0, 50, 70][(career.night - 2) % 4]}
                      onClick={() => feudChoice(i)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {feed.length > 0 && <div className="bfeed">{feed[feed.length - 1].text}</div>}
        {!canSave && <div className="bwarn">Progress won't persist — this browser blocks storage.</div>}
        <button className="btn serve big" onClick={go}>
          {fwdLabel}
        </button>
      </div>
    </div>
  );
}

function Ending() {
  const career = useGame((s) => s.career);
  const resetCareer = useGame((s) => s.resetCareer);
  const broke = career.cash < -60;
  const won = career.stars >= 10;
  const legend = !broke && won && (career.totalEgo ?? 0) >= 200;
  return (
    <div className="review-wrap">
      <div className="review ending">
        <div className="rhead">THE RESIDENCY ENDS</div>
        <div className="stars">
          {"★".repeat(Math.min(5, Math.ceil(career.stars / 3)))}
          <span className="dim">{"☆".repeat(5 - Math.min(5, Math.ceil(career.stars / 3)))}</span>
        </div>
        <div className="quote">
          {broke
            ? "The suppliers stopped answering. The lights stayed on out of pity. It's over."
            : legend
              ? "Three stars, a name above the door, and the alley chanting it. They'll name a heat after you — the one where the fat catches and nobody flinches."
              : won
                ? "Three stars. The room says YES, CHEF to itself. You are the venue now."
                : "Nine nights of sweat and shouting. A footnote in the guide — but your brigade still calls you chef."}
        </div>
        <div className="rstats">
          <span>{career.stars}★ earned</span>
          <span>£{career.cash} in the till</span>
          <span>{career.defections} defections</span>
          <span>{Math.round(career.totalEgo ?? 0)} lifetime ego</span>
          {(career.debt ?? 0) > 0 && <span>the man takes £{career.debt} off the top</span>}
        </div>
        <div className="rbtns">
          <button className="btn serve" onClick={resetCareer}>
            NEW RESIDENCY <span className="kbd">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useGame.getState();
      if (s.phase === "title" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        s.start();
        return;
      }
      if (s.phase === "briefing" && e.key === "Enter") return; // Briefing owns Enter (beat advance)
      if (s.phase === "ending" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        s.resetCareer();
        return;
      }
      if (s.phase === "review" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        s.continueNext();
        return;
      }
      if (s.phase !== "service") return;
      if (e.key.toLowerCase() === "v") {
        if (document.pointerLockElement) document.exitPointerLock();
        s.toggleFirstPerson();
        return;
      }
      if (e.key.toLowerCase() === "p" || e.key === "Escape") {
        s.togglePause();
        return;
      }
      if (s.paused) return;
      const k = e.key.toLowerCase();
      if (k === "s") return s.judge("serve");
      if (k === "b") return s.judge("sendback");
      if (k === "x") return s.judge("smash");
      if (k === "f") return s.firePlate();
      if (k === "e") return s.eightySix();
      if (k === "m") return s.whisk();
      if (k === "t") return s.move101();
      if (k === "r" && s.folklore && s.folklore.kind !== "flash" && s.folklore.kind !== "return") return s.answerFolklore(true);
      if (k === "d" && s.folklore?.kind === "return") return s.answerFolklore(true);
      if (k === "f" && s.folklore?.kind === "return") return s.answerFolklore(false);
      if (k === "h") return s.shooRunner();
      if (k === "d") return s.declineRequest();
      if (k === "c") return s.compTable();
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const rail = s.tickets.filter((t) => t.state === "rail");
        const t = rail[n - 1];
        if (t) s.plateToPass(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function HUD() {
  useHotkeys();
  const phase = useGame((s) => s.phase);
  const start = useGame((s) => s.start);
  const resetCareer = useGame((s) => s.resetCareer);
  const hasSave = useGame((s) => s.hasSave);
  const career = useGame((s) => s.career);
  const tickets = useGame((s) => s.tickets);
  const judge = useGame((s) => s.judge);
  const scream = useGame((s) => s.scream);
  const served = useGame((s) => s.served);
  const sentBack = useGame((s) => s.sentBack);
  const smashed = useGame((s) => s.smashed);
  const screams = useGame((s) => s.screams);
  const misses = useGame((s) => s.misses);
  const ego = useGame((s) => s.ego);
  const serviceTime = useGame((s) => s.serviceTime);
  const runner = useGame((s) => s.runner);
  const request = useGame((s) => s.request);
  const comped = useGame((s) => s.comped);
  const compTable = useGame((s) => s.compTable);
  const adrenalineTil = useGame((s) => s.adrenalineTil);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const criticSpotted = useGame((s) => s.criticSpotted);
  const streak = useGame((s) => s.streak);
  const paused = useGame((s) => s.paused);
  const firstPerson = useGame((s) => s.firstPerson);
  const aim = useGame((s) => s.aim);
  const charge = useScreamCharge();
  const locked = usePointerLocked();

  useEffect(() => {
    if (phase !== "service" || paused) {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [phase, paused]);

  const [splashIdx, setSplashIdx] = useState(() => Math.floor(Math.random() * SPLASH.length));
  useEffect(() => {
    const t = setInterval(() => setSplashIdx((i) => (i + 1) % SPLASH.length), 3800);
    return () => clearInterval(t);
  }, []);
  const splash = SPLASH[splashIdx];

  const atPass = tickets.find((t) => t.state === "pass");
  const live = tickets.filter((t) => t.state === "rail" || t.state === "plating");
  // the rail is a fixed shelf: six dockets fit, the rest queue behind a chip
  const railAll = live.filter((t) => t.state === "rail");
  const railShown = railAll.slice(0, 6);
  const hiddenRail = railAll.length - railShown.length;
  const amped = serviceTime < adrenalineTil;

  return (
    <div className="hud">
      {phase === "title" && (
        <div className="title-card">
          <img className="hero-lineup" src={lineupArt} alt="MISE EN MOSH — the brigade at the pass" />
          <div className="splash">{splash}</div>
          <div className="cast">
            <div className="ccard">
              <img src={castPetra} alt="PETRA" />
              <span>PETRA — grill.<br />Do not touch her tongs.</span>
            </div>
            <div className="ccard">
              <img src={castDimitri} alt="DIMITRI" />
              <span>DIMITRI — sauté.<br />He's seen things.</span>
            </div>
            <div className="ccard">
              <img src={castAnwar} alt="ANWAR" />
              <span>ANWAR — pastry.<br />Fragile. Handle with care.</span>
            </div>
            <div className="ccard wanted">
              <img src={castBeefcakes} alt="BEEFCAKES" />
              <span>BEEFCAKES<br />WANTED for ticket theft.</span>
            </div>
          </div>
          <div className="tag sub">One guest tonight is the inspector.</div>
          <button className="btn" onClick={start}>
            {hasSave ? `CONTINUE RESIDENCY — NIGHT ${career.night}` : "BEGIN RESIDENCY"}
          </button>
          {hasSave && (
            <button className="btn ghost" onClick={resetCareer}>
              NEW RESIDENCY
            </button>
          )}
        </div>
      )}
      {phase === "briefing" && <Briefing />}
      {phase === "service" && (
        <>
          {firstPerson && (
            <div className={`reticle${aim ? ` aim-${aim}` : ""}`} aria-hidden />
          )}
          {firstPerson && (aim === "fire" || aim === "guest" || aim === "ticket") && (
            <div className={`aimtag ${aim}`}>
              {aim === "fire" ? "SMOTHER" : aim === "ticket" ? "PLATE IT" : "FLAG THEM"}
            </div>
          )}
          {firstPerson && !locked && !paused && (
            <div className="lockhint">
              CLICK TO TAKE THE PASS <span className="sep">·</span> MOUSE LOOKS
              <span className="sep">·</span> ARROWS SHIMMY <span className="sep">·</span> HOLD
              SPACE TO SCREAM <span className="sep">·</span> V CAMERA
            </div>
          )}
          {charge > 0 && (
            <div className={`charge ${charge > 1.05 ? "over" : ""}`}>
              <div
                className="chargefill"
                style={{ width: `${Math.min(100, (charge / 1.4) * 100)}%` }}
              />
              <span className="chargelabel">
                {charge > 1.05 ? "TOO LONG" : charge > 0.75 ? "ROAR" : "INHALE"}
              </span>
            </div>
          )}          <div className="hint">
            {runner && !runner.fled
              ? "Runner on the floor — SHOO HIM (H)!"
              : request
                ? `Table ${request.table} wants it ${request.mod} — D to refuse.`
                : atPass
                  ? firstPerson
                    ? "Hold right mouse to look at the plate."
                    : "Judge the plate."
                  : live.some((t) => t.state === "plating")
                    ? "Plating… F fires it early — wait for the gold."
                    : firstPerson
                      ? "Look at a docket on the rail and click."
                      : "Click a ticket to plate it. E 86s the oldest dish."}{" "}
            {criticFlagged
              ? criticSpotted
                ? "Inspector clocked."
                : serviceTime < 100
                  ? "Wrong guest flagged."
                  : "Inspector slipped the net."
              : serviceTime < 100
                ? "Spot the inspector — click them before dessert."
                : "DESSERT COURSE."}
          </div>
          {/* In first person the dockets hang on the steel; the DOM rail
              is the fallback camera's (and the keyboard's) rail. */}
          {!firstPerson && (
            <div className="rail">
              {live
                .filter((t) => t.state === "plating")
                .map((t) => (
                  <TicketCard key={t.id} t={t} />
                ))}
              {railShown.map((t) => (
                <TicketCard key={t.id} t={t} hotkey={railAll.indexOf(t) + 1} />
              ))}
              {hiddenRail > 0 && (
                <div className="rail-more" title={`${hiddenRail} more on the rail`}>
                  +{hiddenRail}
                </div>
              )}
            </div>
          )}
          {atPass && firstPerson && (
            <div className="plate-note fp-note">{TIER_LINE[tierOf(atPass.quality)]}</div>
          )}
          {atPass && (
            <div className={`pass-actions${firstPerson ? " fp" : ""}`}>
              {!firstPerson && (
                <div className="plate-note">{TIER_LINE[tierOf(atPass.quality)]}</div>
              )}
              <button className="btn serve" onClick={() => judge("serve")}>
                SERVE <span className="kbd">S</span>
              </button>
              <button className="btn back" onClick={() => judge("sendback")}>
                SEND BACK <span className="kbd">B</span>
              </button>
              <button className="btn smash" onClick={() => judge("smash")}>
                SMASH <span className="kbd">X</span>
              </button>
            </div>
          )}
          <div className="status">
            NIGHT {career.night} · SERVICE{" "}
            <b>
              {Math.floor(serviceTime / 60)}:
              {String(Math.floor(serviceTime % 60)).padStart(2, "0")}
            </b>
            {amped && <span className="amped"> FIRED UP</span>}
            <br />
            SERVED <b>{served}</b> · BACK <b>{sentBack}</b> · SMASHED <b>{smashed}</b> · WALKED{" "}
            <b>{misses}</b>
            <br />
            EGO <b>{Math.round(ego)}</b> · {tierName(ego)}
            {streak >= 3 && <span className="amped"> · STREAK ×{streak}</span>}
            {screams === 0 ? (
              <span className="silent"> · SILENT — hold it for a ★</span>
            ) : (
              <> · SCREAMS <b>{screams}</b></>
            )}
          </div>
          <Brigade />
          {/* first person shouts the newest line into the room instead */}
          {!firstPerson && <Ticker />}
          <button className="btn scream" onClick={() => scream(1)}>
            SCREAM <span className="kbd">SPACE</span>{" "}
            <span className="cost">hold to charge · costs morale</span>
          </button>
          <button className="btn comp" disabled={comped || career.cash < 20} onClick={() => compTable()}>
            COMP A TABLE <span className="kbd">C</span> <span className="cost">£20 · the room exhales</span>
          </button>
          <VowRibbon />
          <FolkloreBar />
          <Chorus />
          <Stamp />
          <Milestone />
          {paused && <div className="paused">PAUSED — P to resume</div>}
        </>
      )}
      {phase === "review" && <ReviewCard />}
      {phase === "ending" && <Ending />}
    </div>
  );
}
