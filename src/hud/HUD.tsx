import { useEffect, useState } from "react";
import { useGame, tierOf, Ticket, PlateTier, VENUES } from "../game/state";
import stampServe from "../../assets/recraft/vector/stamp-serve.svg";
import stampBack from "../../assets/recraft/vector/stamp-send-back.svg";
import stampSmash from "../../assets/recraft/vector/stamp-smash.svg";
import titleLockup from "../../assets/recraft/vector/title-lockup.svg";
import coverArt from "../../assets/recraft/raster/cover-art-ticket-storm.webp";
import reviewClip from "../../assets/recraft/raster/review-clipping-third-star.webp";

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
  const frac = Math.min(1, t.age / 55);
  const plating = t.state === "plating";
  return (
    <div
      className={`ticket ${frac > 0.45 ? "aging" : ""} ${frac > 0.72 ? "dying" : ""} ${plating ? "plating" : ""}`}
      onClick={() => !plating && plateToPass(t.id)}
    >
      <div className="tno">
        TABLE {t.table} · #{t.id}
        {hotkey && <span className="kbd">{hotkey}</span>}
      </div>
      <div className="dish">{t.dish}</div>
      <div className="trow">
        <span className="chip" style={{ background: STATION_COLOR[t.station] }}>
          {STATION_NAME[t.station]}
        </span>
        <span className="tstate">{plating ? "PLATING…" : `${Math.floor(t.age)}s`}</span>
      </div>
      <div className="agebar" style={{ width: `${frac * 100}%` }} />
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
          <span className="dim">{"★".repeat(5 - review.stars)}</span>
        </div>
        <img className="press-clip" src={reviewClip} alt="Press clipping" />
        <div className="quote">“{review.quote}”</div>
        <div className="critic-line">{review.criticVerdict}</div>
        <div className="rstats">
          <span>{review.covers} covers</span>
          <span>{review.misses} walked</span>
          <span>{review.complaints} send-backs</span>
          <span>{review.smashed} smashed</span>
          <span>{review.walkouts} walkouts</span>
          <span>streak ×{review.bestStreak}</span>
          <span>inspector {review.spotted ? "CLOCKED" : "missed"}</span>
        </div>
        <div className="rfoot">EGO {Math.round(review.ego)}</div>
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
  const feudChoice = useGame((s) => s.feudChoice);
  const lots = useGame((s) => s.lots);
  const buyLot = useGame((s) => s.buyLot);
  const feed = useGame((s) => s.feed);
  const startService = useGame((s) => s.startService);
  const canSave = useGame((s) => s.canSave);
  const v = VENUES[career.venue];
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
        <div className="bbrigade">
          {cooks.map((c) => (
            <div key={c.id} className="bcook">
              <span className="cname">
                {c.name}
                {c.trauma > 0 && <span className="scar">{" ✕".repeat(Math.min(3, c.trauma))}</span>}
              </span>
              <div className="mbar">
                <div
                  className="mfill"
                  style={{ width: `${c.morale}%`, background: c.morale > 45 ? "#c9a44a" : "#a8322a" }}
                />
              </div>
              <span className="bskill">skill {Math.round(c.skill * 100)}</span>
            </div>
          ))}
        </div>
        <div className="bshop">
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
        {feed.length > 0 && <div className="bfeed">{feed[feed.length - 1].text}</div>}
        {feud && (
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
        )}
        {!canSave && <div className="bwarn">Progress won't persist — this browser blocks storage.</div>}
        <button className="btn serve big" onClick={startService}>
          RUN SERVICE <span className="kbd">↵</span>
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
  return (
    <div className="review-wrap">
      <div className="review ending">
        <div className="rhead">THE RESIDENCY ENDS</div>
        <div className="stars">
          {"★".repeat(Math.min(5, Math.ceil(career.stars / 3)))}
          <span className="dim">{"★".repeat(5 - Math.min(5, Math.ceil(career.stars / 3)))}</span>
        </div>
        <div className="quote">
          {broke
            ? "The suppliers stopped answering. The lights stayed on out of pity. It's over."
            : won
              ? "Three stars. The room says YES, CHEF to itself. You are the venue now."
              : "Nine nights of sweat and shouting. A footnote in the guide — but your brigade still calls you chef."}
        </div>
        <div className="rstats">
          <span>{career.stars}★ earned</span>
          <span>£{career.cash} in the till</span>
          <span>{career.defections} defections</span>
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
      if (s.phase === "briefing" && e.key === "Enter") {
        e.preventDefault();
        s.startService();
        return;
      }
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
      if (e.key === " " ) {
        e.preventDefault();
        s.scream();
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
  const screams = useGame((s) => s.screams);
  const served = useGame((s) => s.served);
  const sentBack = useGame((s) => s.sentBack);
  const smashed = useGame((s) => s.smashed);
  const misses = useGame((s) => s.misses);
  const ego = useGame((s) => s.ego);
  const serviceTime = useGame((s) => s.serviceTime);
  const adrenalineTil = useGame((s) => s.adrenalineTil);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const criticSpotted = useGame((s) => s.criticSpotted);
  const streak = useGame((s) => s.streak);
  const paused = useGame((s) => s.paused);

  const atPass = tickets.find((t) => t.state === "pass");
  const live = tickets.filter((t) => t.state === "rail" || t.state === "plating");
  const amped = serviceTime < adrenalineTil;

  return (
    <div className="hud">
      {phase === "title" && (
        <div className="title-card">
          <img className="cover-art" src={coverArt} alt="" aria-hidden />
          <img className="lockup" src={titleLockup} alt="MISE EN MOSH" />
          <div className="tag">Everything in its place. Until the tickets start flying.</div>
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
          <div className="hint">
            {atPass
              ? "Judge the plate."
              : live.some((t) => t.state === "plating")
                ? "Plating…"
                : "Click a ticket to plate it."}{" "}
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
          <div className="rail">
            {live.map((t) => (
              <TicketCard
                key={t.id}
                t={t}
                hotkey={
                  t.state === "rail"
                    ? live.filter((x) => x.state === "rail").indexOf(t) + 1
                    : undefined
                }
              />
            ))}
          </div>
          {atPass && (
            <div className="pass-actions">
              <div className="plate-note">{TIER_LINE[tierOf(atPass.quality)]}</div>
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
            EGO <b>{Math.round(ego)}</b>
            {streak >= 3 && <span className="amped"> · STREAK ×{streak}</span>}
          </div>
          <Brigade />
          <Ticker />
          <button className="btn scream" onClick={scream}>
            SCREAM <span className="kbd">␣</span>{" "}
            <span className="cost">−{3 + Math.floor(screams / 2)} morale</span>
          </button>
          <Chorus />
          <Stamp />
          {paused && <div className="paused">PAUSED — P to resume</div>}
        </>
      )}
      {phase === "review" && <ReviewCard />}
      {phase === "ending" && <Ending />}
    </div>
  );
}
