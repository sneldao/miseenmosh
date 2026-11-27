import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGame,
  tierName,
  BOARD,
  Ticket,
  VENUES,
  loadLegends,
  Cook,
  petraOpeningReply,
  consumeBriefingBookRequest,
  n1NeedsHouseRule,
  introSeen,
  Stance,
  STANCE_ORDER,
} from "../game/state";
import { deriveMood } from "../game/mood";
import { morningCards } from "../game/beats";
import {
  dishProfile,
  plateObservations,
  correctionNeeded,
  CORRECTION_LABEL,
  currentWellingtonRecipe,
  WELLINGTON_FINISHES,
  type RecipeFinish,
} from "../game/culinary";
import { readyOg, ogHandleNow, onOgHandle } from "../game/og";
import { petraCoachingNote, reviewNarration } from "../game/serviceReview";
import { nightContract, lowestMoraleCook } from "../game/nightArc";
import { sideOrderFor, nearMissLine } from "../game/serviceScore";
import { buildEnding } from "../game/ending";
import { speakReview, voiceEnabled, setVoiceEnabled } from "../game/voice";
import { sfx } from "../game/sound";
import { preloadKitchenModels } from "../scene/preloadModels";
import { INTRO } from "../game/introCopy";
import stampServe from "../../assets/recraft/vector/stamp-serve.svg";
import stampBack from "../../assets/recraft/vector/stamp-send-back.svg";
import stampSmash from "../../assets/recraft/vector/stamp-smash.svg";
import lineupArt from "../../assets/recraft/cast-gilliam/title-lineup-1k.webp";
import castPetra from "../../assets/recraft/cast-gilliam/petra-512.webp";
import castDimitri from "../../assets/recraft/cast-gilliam/dimitri-512.webp";
import castAnwar from "../../assets/recraft/cast-gilliam/anwar-512.webp";
import castBeefcakes from "../../assets/recraft/cast-gilliam/beefcakes-512.webp";
import castCritic from "../../assets/recraft/cast-gilliam/critic-512.webp";
import castFishmonger from "../../assets/recraft/cast-gilliam/fishmonger-512.webp";
import castCommis from "../../assets/recraft/cast-gilliam/commis-512.webp";
import marketSign from "../../assets/recraft/paper-cookery/market-sign-512.webp";

const CAST_IMG: Record<string, string> = {
  PETRA: castPetra,
  DIMITRI: castDimitri,
  ANWAR: castAnwar,
};
const FEUD_ART: Record<string, string> = {
  beefcakes: castBeefcakes,
  critic: castCritic,
  fishmonger: castFishmonger,
};
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
const moodOf = (c: Cook) =>
  c.walkedOut
    ? "walked out"
    : (c.mood ?? deriveMood({ ...c, working: false })).toLowerCase();

/** A stat that earns its number: counts up once on mount, then holds.
 *  Reduced motion reads the number straight away. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? value
      : 0,
  );
  const raf = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || value === 0) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const dur = 700;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{shown}</>;
}

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
      if (s.phase !== "service" || s.paused || s.openingStep || s.glossary)
        return;
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
      const p = Math.max(
        0.2,
        Math.min(1.4, (performance.now() - start.current) / 900),
      );
      setCharge(0);
      if (s.phase === "service" && !s.paused && !s.glossary) s.scream(p);
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

/** The held plate: physical evidence + the calls on it. No tier labels —
 *  observations come from the plate's actual condition. */
function PassPanel({
  plate,
  firstPerson,
}: {
  plate: Ticket;
  firstPerson: boolean;
}) {
  const judge = useGame((s) => s.judge);
  const runTable = useGame((s) => s.runTable);
  const correctPlate = useGame((s) => s.correctPlate);
  const turnPlate = useGame((s) => s.turnPlate);
  const setInspecting = useGame((s) => s.setInspecting);
  const inspecting = useGame((s) => s.inspecting);
  const correction = useGame((s) => s.correction);
  const serviceTime = useGame((s) => s.serviceTime);
  const tickets = useGame((s) => s.tickets);
  const peers = tickets.filter(
    (t) => t.state === "ready" && t.table === plate.table,
  ).length;
  const correcting = correction?.ticketId === plate.id ? correction : null;
  const progress = correcting
    ? Math.max(
        0,
        Math.min(
          1,
          (serviceTime - correcting.startedAt) /
            Math.max(0.01, correcting.endsAt - correcting.startedAt),
        ),
      )
    : 0;
  const condition = plate.condition;
  const observations = condition
    ? plateObservations(plate.dish, condition)
    : [];
  const split = condition?.sauce === "split";
  const contributor = plate.recipeContributor;
  const finish = condition?.recipeFinish ?? plate.recipeFinish;
  const needed = condition ? correctionNeeded(plate.dish, condition) : null;
  return (
    <div
      className={`pass-actions pass-panel${inspecting ? " inspecting" : ""}${firstPerson ? " fp" : ""}`}
    >
      <div className="pp-info">
        <div className="plate-note">
          {plate.dish}
          {finish === "herb" ? " · herb finish" : ""}
          {contributor ? ` — ${contributor}'s recipe` : ""}
        </div>
        {observations[0] && <div className="plate-obs">{observations[0]}</div>}
      </div>
      {inspecting && (
        <div className="plate-inspect">
          {observations.slice(1).map((o) => (
            <div key={o} className="plate-obs">
              {o}
            </div>
          ))}
          <div className="plate-std">
            House standard: {dishProfile(plate.dish).standard}
          </div>
          <button
            className="btn ghost sm"
            onClick={() => turnPlate(Math.PI / 4)}
          >
            TURN
          </button>
        </div>
      )}
      <div className="plate-verbs">
        {peers > 0 && (
          <button
            className="btn serve big"
            onClick={() => runTable(true)}
            disabled={!!correcting}
          >
            COMMIT TABLE {plate.table} · {peers + 1} PLATES
          </button>
        )}
        {split && (
          <button
            className="btn whisk"
            onClick={correctPlate}
            disabled={!!correcting}
          >
            {correcting ? (
              <>
                WHISKING…{" "}
                <span className="corrbar">
                  <span
                    className="corrfill"
                    style={{ width: `${progress * 100}%` }}
                  />
                </span>
              </>
            ) : (
              "BRING SAUCE TOGETHER"
            )}
          </button>
        )}
        <button className="btn" onClick={() => setInspecting(!inspecting)}>
          {inspecting ? "CLOSE" : "INSPECT"} <span className="kbd">I</span>
        </button>
        <button
          className="btn serve"
          onClick={() => judge("serve")}
          disabled={!!correcting}
        >
          SERVE <span className="kbd">S</span>
        </button>
        <button
          className="btn back"
          onClick={() => judge("sendback")}
          disabled={!!correcting}
          title={
            needed
              ? `Names the fault: ${CORRECTION_LABEL[needed]}. The table keeps waiting; the remake must be cooked again.`
              : "Nothing wrong with it — the table keeps waiting and the kitchen will remember."
          }
        >
          SEND BACK <span className="kbd">B</span>
        </button>
        <button
          className="btn smash"
          onClick={() => judge("smash")}
          disabled={!!correcting}
        >
          SMASH <span className="kbd">X</span>
        </button>
      </div>
    </div>
  );
}

function TicketCard({ t, hotkey }: { t: Ticket; hotkey?: number }) {
  const plateToPass = useGame((s) => s.plateToPass);
  const firePlate = useGame((s) => s.firePlate);
  const collectPlate = useGame((s) => s.collectPlate);
  const selectTicket = useGame((s) => s.selectTicket);
  const selectedTicketId = useGame((s) => s.selectedTicketId);
  const tickets = useGame((s) => s.tickets);
  const cooks = useGame((s) => s.cooks);
  const serviceTime = useGame((s) => s.serviceTime);
  const request = useGame((s) => s.request);
  const sauce = useGame((s) => s.sauce);
  const frac = Math.min(1, t.age / 55);
  const plating = t.state === "plating";
  const ready = t.state === "ready";
  // the sear: the last 30% of the cook glows gold — fire inside it (F or click)
  const searFrac =
    plating && t.plateDur > 0
      ? Math.max(0, Math.min(1, 1 - (t.plateAt - serviceTime) / t.plateDur))
      : 0;
  const golden = searFrac >= 0.7;
  const myReq = request?.ticketId === t.id ? request : null;
  const splitting = plating && sauce?.ticketId === t.id;
  // capacity gates, same as the actions enforce
  const stationBusy =
    t.state === "rail" &&
    tickets.some(
      (x) =>
        x.station === t.station &&
        (x.state === "plating" || x.state === "ready"),
    );
  const handsBusy = ready && tickets.some((x) => x.state === "pass");
  const action = ready
    ? "COLLECT"
    : plating
      ? golden
        ? "FIRE — SEAR"
        : "FIRE EARLY"
      : "CALL";
  const disabled = stationBusy || handsBusy;
  const cook = cooks.find((c) => c.station === t.station);
  const temp =
    ready && t.condition?.temperature && dishProfile(t.dish).servedHot
      ? t.condition.temperature
      : null;
  return (
    <button
      type="button"
      className={`ticket ${frac > 0.45 ? "aging" : ""} ${frac > 0.72 ? "dying" : ""} ${plating ? "plating" : ""} ${ready ? "ready" : ""} ${golden ? "golden" : ""} ${splitting ? "sauced" : ""} ${selectedTicketId === t.id ? "selected" : ""}`}
      disabled={disabled}
      onFocus={() => selectTicket(t.id)}
      onClick={() => {
        selectTicket(t.id);
        if (ready) collectPlate(t.id);
        else if (plating) firePlate(t.id);
        else plateToPass(t.id);
      }}
    >
      <div className="tno">
        TABLE {t.table} · #{t.id}
        {hotkey && <span className="kbd">{hotkey}</span>}
      </div>
      <div className="dish">{t.dish}</div>
      {myReq && (
        <div className="modline">
          {myReq.mod} T{myReq.table} ·{" "}
          {myReq.mod === "FAST" ? "<30s" : "GOLDEN"}
        </div>
      )}
      <div className="trow">
        <span className="chip" style={{ background: STATION_COLOR[t.station] }}>
          {STATION_NAME[t.station]}
          {cook ? ` · ${cook.name}` : ""}
        </span>
        <span className="tstate">
          {plating
            ? splitting
              ? "SPLIT! — M TO WHISK"
              : golden
                ? "SEAR — FIRE IT"
                : `PLATING…${t.sauce === "saved" ? " ✓" : ""}`
            : ready
              ? `READY${temp === "warm" ? " — cooling" : temp === "cold" ? " — cold" : ""}`
              : `${Math.floor(t.age)}s`}
        </span>
      </div>
      {plating ? (
        <div className="searbar">
          <div className="sear-goldzone" />
          <div
            className={`searfill${golden ? " gold" : ""}`}
            style={{ width: `${searFrac * 100}%` }}
          />
        </div>
      ) : (
        <div className="agebar" style={{ width: `${frac * 100}%` }} />
      )}
      <div className="taction">{action}</div>
    </button>
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
  const cls =
    stampText === "SERVED"
      ? "ok"
      : stampText === "SENT BACK"
        ? "warn"
        : "violent";
  return (
    <div className={`stamp ${cls}`} key={stampAt}>
      {STAMP_IMG[stampText] ? (
        <img src={STAMP_IMG[stampText]} alt={stampText} />
      ) : (
        stampText
      )}
    </div>
  );
}

const VERB_RE =
  /(\([A-Z]\)|\bCORNER\b|\bFIRE\w*|\bWHISK\w*|\bSHOO\w*|\bSMASH\w*|\bJUDG\w*|\bCLOCK\w*|\bSPOT\w*|\bHANDS\b|\bREFUS\w*|\bCOMP\w*|(?<!STALL )86\w*)/i;
function rich(text: string) {
  return text.split(VERB_RE).map((part, i) => {
    if (/^\([A-Z]\)$/.test(part))
      return (
        <span key={i} className="kbd">
          {part}
        </span>
      );
    if (VERB_RE.test(part))
      return (
        <b key={i} className="verb">
          {part}
        </b>
      );
    return <span key={i}>{part}</span>;
  });
}
function Ticker() {
  const feed = useGame((s) => s.feed);
  return (
    <div className="ticker">
      {feed.slice(-3).map((f) => (
        <div key={f.id} className={`line ${f.kind}`}>
          {rich(f.text)}
        </div>
      ))}
    </div>
  );
}

const MENU_DISHES = [
  "Scallop, one",
  "Beef Wellington",
  "Red mullet, crying",
  "Risotto (stood up)",
  "Lamb sauce (missing)",
  "Pommes purée",
  "Foie torchon",
  "Soufflé (weeping)",
  "Tart of the day",
];

function MenuPicker({
  onPick,
}: {
  featured?: string | null;
  onPick: (f: string, r: string) => void;
}) {
  const [f, setF] = useState(MENU_DISHES[1]);
  const [r, setR] = useState(MENU_DISHES[4]);
  return (
    <div className="lot">
      <span className="lname">FEATURE</span>
      <select value={f} onChange={(e) => setF(e.target.value)}>
        {MENU_DISHES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <span className="lname">REST</span>
      <select value={r} onChange={(e) => setR(e.target.value)}>
        {MENU_DISHES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <button
        className="btn lbtn"
        disabled={f === r}
        onClick={() => onPick(f, r)}
      >
        SET MENU <span className="cost">feature +6 · rest off rail</span>
      </button>
    </div>
  );
}

function CriticCam() {
  const guests = useGame((s) => s.guests);
  const serviceTime = useGame((s) => s.serviceTime);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const criticSpotted = useGame((s) => s.criticSpotted);
  const criticServed = useGame((s) => s.criticServed);
  const criticLeft = useGame((s) => s.criticLeft);
  const kidNoticed = useGame((s) => s.kidNoticed);
  const cg = guests.find((g) => g.isCritic);
  if (!cg) return null;
  const ago =
    cg.tellAt >= 0 ? Math.max(0, Math.round(serviceTime - cg.tellAt)) : -1;
  const status = criticLeft ? "GONE" : criticServed > 0 ? "FED" : "EATING";
  return (
    <div
      className="critic-cam"
      title="A little red eye above the pass. Tell no one."
    >
      <span className="cam-dot" />
      CAM 3{kidNoticed ? " · NOTICED" : ""} · TABLE{" "}
      {criticFlagged && criticSpotted ? cg.table : "???"} · {cg.tells} TELL
      {cg.tells === 1 ? "" : "S"} ·{" "}
      {ago < 0 ? "QUIET" : ago < 5 ? "TELL!" : `LAST TELL ${ago}s`} · {status}
    </div>
  );
}

function VowRibbon() {
  const vow = useGame((s) => s.career.vow);
  const turns101 = useGame((s) => s.table101Turns);
  if (!vow) return null;
  return (
    <div className="vow-ribbon">
      {vow === "star"
        ? "STAR VOW — no walks, clock them"
        : vow === "house"
          ? `HOUSE VOW — 101 turns ${turns101}/2`
          : "BRIGADE VOW — nobody walks"}
    </div>
  );
}

function FolkloreBar() {
  const folklore = useGame((s) => s.folklore);
  const answer = useGame((s) => s.answerFolklore);
  const move101 = useGame((s) => s.move101);
  const moved101 = useGame((s) => s.moved101);
  if (!folklore) return null;
  const label =
    folklore.kind === "return"
      ? "REFUSE WITH GRACE (D) / RE-FIRE (F)"
      : folklore.kind === "flash"
        ? "LET THEM POST — do nothing"
        : "FIX IT (R)";
  return (
    <div className="folklore-bar">
      <span>
        TABLE {folklore.table} — {label}
      </span>
      {folklore.kind !== "flash" && (
        <button className="btn" onClick={() => answer(true)}>
          ANSWER
        </button>
      )}
      {!moved101 && (
        <button className="btn ghost" onClick={move101}>
          MOVE 101 (T)
        </button>
      )}
    </div>
  );
}

function Brigade() {
  const cooks = useGame((s) => s.cooks);
  return (
    <div className="brigade">
      {cooks.map((c) => (
        <div
          key={c.id}
          className={`cook ${c.walkedOut ? "out" : ""} ${!c.walkedOut && c.morale < 25 ? "low" : ""}`}
        >
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
          {!c.walkedOut && c.grudge && (
            <span className="out-tag grudge" title={c.grudge}>
              HOLDING ONE
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const STANCE_LABEL: Record<Stance, string> = {
  sinks: "SINKS",
  sauce: "SAUCE",
  pass: "PASS",
  room: "ROOM",
};

/** Walk the line: where the chef's body is. Night 1 the pass holds you. */
function StanceBar() {
  const stance = useGame((s) => s.stance);
  const setStance = useGame((s) => s.setStance);
  const night = useGame((s) => s.career.night);
  const openingStep = useGame((s) => s.openingStep);
  const locked = night < 2 || !!openingStep;
  return (
    <div
      className="stancebar"
      title="Q / W walks the line · 0 back to the pass"
    >
      <span className="slabel">CHEF</span>
      {STANCE_ORDER.map((id) => (
        <button
          key={id}
          className={`btn sm ${stance === id ? "picked" : ""}`}
          disabled={locked || stance === id}
          onClick={() => setStance(id)}
          title={
            locked
              ? "the pass holds you tonight — from night 2, you walk"
              : id === "pass"
                ? "back to the pass (0)"
                : `walk to ${id} (Q / W)`
          }
        >
          {STANCE_LABEL[id]}
        </button>
      ))}
      {locked && <span className="scost">NIGHT 2</span>}
    </div>
  );
}

function ReviewCard() {
  const review = useGame((s) => s.review);
  const career = useGame((s) => s.career);
  const continueNext = useGame((s) => s.continueNext);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  if (!review) return null;
  const narration = reviewNarration(review);
  const stats =
    `food ${Math.round(review.avgQuality)}/100 (${review.foodStars}/3 stars) · ` +
    `hospitality ${Math.round(review.avgHospitality)}/100 (${review.hospitalityStars}/1) · ` +
    `brigade ${review.brigadeStars}/1 · penalties −${review.penalties}\n` +
    `${review.covers} covers · ${review.misses} orders expired · ${review.sentBack} sent back · ` +
    `${review.complaints} complaints · ${review.smashed} smashed · ${review.walkouts} walkouts · ${review.screams} screams · ` +
    `streak ×${review.bestStreak} · inspector ${review.spotted ? "CLOCKED" : "missed"}`;
  const card =
    `MISE EN MOSH — night ${career.night} review (${new Date().toDateString()})\n` +
    `${"★".repeat(review.stars)}${"☆".repeat(5 - review.stars)}\n` +
    `${narration}\n` +
    stats;
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("unavailable");
      await navigator.clipboard.writeText(card);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };
  return (
    <div className="review-wrap">
      <div className="review service-review">
        <div className="rhead">
          TONIGHT'S REVIEW — {VENUES[career.venue].name}, NIGHT {career.night}
        </div>
        <div className="stars">
          {"★".repeat(review.stars)}
          <span className="dim">{"☆".repeat(5 - review.stars)}</span>
        </div>
        <div className="score-breakdown">
          <span>
            FOOD {Math.round(review.avgQuality)} · {review.foodStars}/3
          </span>
          <span>
            SERVICE {Math.round(review.avgHospitality)} ·{" "}
            {review.hospitalityStars}/1
          </span>
          <span>BRIGADE {review.brigadeStars}/1</span>
          {review.penalties > 0 && <span>LOSSES −{review.penalties}</span>}
        </div>
        {(() => {
          const nm = nearMissLine(
            {
              served: review.covers,
              avgQuality: review.avgQuality,
              avgHospitality: review.avgHospitality,
              misses: review.misses,
              complaints: review.complaints,
              walkouts: review.walkouts,
            },
            review,
          );
          const l = loadLegends();
          const record =
            review.bestStreak > 0 &&
            l.bestStreak > review.bestStreak &&
            l.bestStreak - review.bestStreak <= 2
              ? `Your record ×${l.bestStreak} stands. Tonight ×${review.bestStreak}.`
              : null;
          if (!nm && !record) return null;
          return (
            <>
              {nm && <div className="nearmiss">{nm}</div>}
              {record && <div className="nearmiss record">{record}</div>}
            </>
          );
        })()}
        {review.headline && <div className="headline">{review.headline}</div>}
        <p className="incident">{review.incident}</p>
        {petraCoachingNote({
          stars: review.stars,
          walkouts: review.walkouts,
          misses: review.misses,
          smashed: review.smashed,
          served: review.covers,
        }) && (
          <p className="incident petra-note">
            PETRA'S NOTE —{" "}
            {petraCoachingNote({
              stars: review.stars,
              walkouts: review.walkouts,
              misses: review.misses,
              smashed: review.smashed,
              served: review.covers,
            })}
          </p>
        )}
        <div className="rlabel">WHAT FOLLOWS</div>
        <p className="consequence">{review.consequence}</p>
        <div className="rbtns main-action">
          <button className="btn serve" onClick={continueNext}>
            NEXT MORNING <span className="kbd">↵</span>
          </button>
        </div>
        <details className="review-details">
          <summary>Service details</summary>
          <div className="critic-line">{review.criticVerdict}</div>
          {review.folkloreLine && (
            <div className="critic-line">{review.folkloreLine}</div>
          )}
          {review.sideLine && (
            <div className="board-line">{review.sideLine}</div>
          )}
          {review.vowLine && <div className="board-line">{review.vowLine}</div>}
          {review.betLine && <div className="board-line">{review.betLine}</div>}
          {review.cover && <div className="cover-line">{review.cover}</div>}
          <div className="rstats">
            <span>{review.covers} covers</span>
            <span>{review.misses} orders expired</span>
            <span>{review.sentBack} sent back</span>
            <span>{review.complaints} complaints</span>
            <span>{review.smashed} smashed</span>
            <span>{review.walkouts} walkouts</span>
            <span>{review.screams} screams</span>
            <span>streak ×{review.bestStreak}</span>
            {review.silent && <span>SILENT SERVICE ACCOLADE</span>}
            <span>inspector {review.spotted ? "CLOCKED" : "missed"}</span>
          </div>
          <div className="rfoot">
            EGO {Math.round(review.ego)} · {tierName(review.ego)}
          </div>
          <div className="rbtns">
            <button className="btn" onClick={copy}>
              {copied ? "COPIED" : "COPY REVIEW"}
            </button>
            <button
              className="btn"
              onClick={() => speakReview(review.stars, narration)}
              title="The critic reads it back"
            >
              READ IT ALOUD
            </button>
          </div>
          {copyFailed && (
            <div className="bwarn">Clipboard unavailable — copy failed.</div>
          )}
        </details>
      </div>
    </div>
  );
}

function ServiceTools() {
  const toggleGlossary = useGame((s) => s.toggleGlossary);
  const togglePause = useGame((s) => s.togglePause);
  const paused = useGame((s) => s.paused);
  return (
    <div className="opening-tools">
      <button
        className="btn ghost"
        aria-label="Controls"
        onClick={toggleGlossary}
      >
        ?
      </button>
      <button
        className="btn ghost"
        aria-label={paused ? "Resume" : "Pause"}
        onClick={togglePause}
      >
        {paused ? "RESUME" : "PAUSE"}
      </button>
    </div>
  );
}

/** the quiet night-1 lesson: the action itself is the prompt — no tutorial text */
function OpeningService() {
  const career = useGame((s) => s.career);
  const openingStep = useGame((s) => s.openingStep);
  const tickets = useGame((s) => s.tickets);
  const serviceTime = useGame((s) => s.serviceTime);
  const judge = useGame((s) => s.judge);
  const plateToPass = useGame((s) => s.plateToPass);
  const paused = useGame((s) => s.paused);
  const inspecting = useGame((s) => s.inspecting);
  const openingTurned = useGame((s) => s.openingTurned);
  const setInspecting = useGame((s) => s.setInspecting);
  const turnPlate = useGame((s) => s.turnPlate);
  const acknowledgeOpeningDefect = useGame((s) => s.acknowledgeOpeningDefect);
  const pass = tickets.find((t) => t.state === "pass");
  const rail = tickets.find((t) => t.state === "rail");
  const plating = tickets.find((t) => t.state === "plating");
  const observations = pass?.condition
    ? plateObservations(pass.dish, pass.condition)
    : [];
  const fault = pass?.condition
    ? correctionNeeded(pass.dish, pass.condition)
    : null;
  const openingReply =
    career.openingMemory?.night === 1
      ? petraOpeningReply(career.openingMemory.firstVerdict)
      : null;
  return (
    <>
      {openingStep === "serve" && pass && (
        <div className="pass-actions opening-actions">
          <button
            className="btn serve big"
            autoFocus
            onClick={() => judge("serve")}
          >
            SERVE → TABLE {pass.table}
          </button>
        </div>
      )}
      {openingStep === "call" && rail && (
        <div className="pass-actions opening-actions">
          <button
            className="btn docket-call"
            autoFocus
            onClick={() => plateToPass(rail.id)}
          >
            <span className="dtable">TABLE {rail.table}</span>
            <span className="ddish">{rail.dish}</span>
            <span className="daction">CALL</span>
          </button>
        </div>
      )}
      {openingStep === "judge" && plating && (
        <div className="opening-cooking">
          <span className="ocname">PETRA</span>
          <div className="ocbar">
            <div
              className="ocfill"
              style={{
                width: `${plating.plateDur > 0 ? Math.min(100, Math.max(0, (1 - (plating.plateAt - serviceTime) / plating.plateDur) * 100)) : 0}%`,
              }}
            />
          </div>
          <span className="oclabel">Cooking</span>
        </div>
      )}
      {openingStep === "inspect" && pass && (
        <div className="pass-actions opening-actions opening-inspect">
          <div className="mhead">TURN IT. NAME IT.</div>
          {!inspecting ? (
            <button
              className="btn serve big"
              autoFocus
              onClick={() => setInspecting(true)}
            >
              INSPECT IT <span className="kbd">I</span>
            </button>
          ) : (
            <>
              <div className="plate-std">{observations[0]}</div>
              <div className="plate-std">
                House standard: {dishProfile(pass.dish).standard}
              </div>
              <button
                className="btn"
                autoFocus
                onClick={() => turnPlate(Math.PI / 4)}
              >
                TURN THE PLATE
              </button>
              {openingTurned && fault && (
                <button className="btn back" onClick={acknowledgeOpeningDefect}>
                  NAME IT: {CORRECTION_LABEL[fault].toUpperCase()}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {openingStep === "judge" && pass && !plating && (
        <div className="pass-actions opening-actions">
          <button
            className="btn serve"
            autoFocus
            onClick={() => judge("serve")}
          >
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
      {openingStep === "call" && openingReply && (
        <div className="opening-response" role="status">
          <span>PETRA</span>
          {openingReply}
        </div>
      )}
      <Stamp />
      {paused && <div className="paused">PAUSED — P to resume</div>}
    </>
  );
}

function Briefing() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  // Night 1 has its own staged intro — the brigade, the contract, the house
  // rule — before the doors. After that, an unread morning of confessionals
  // auto-opens the book too — beats hidden in a closed book are beats nobody sees.
  const [bookOpen, setBookOpen] = useState(
    (career.bookSeenNight ?? 0) < career.night &&
      morningCards(career, cooks).length > 0,
  );
  if (career.night === 1) return <NightOneBrief />;
  if (bookOpen) return <PrepBook onBack={() => setBookOpen(false)} />;
  return <QuickBrief onBook={() => setBookOpen(true)} />;
}

/** Night 1 staged intro: who we are + family meal, then tonight + house rule.
 *  Two beats, two decisions max, doors gated on the house rule. The full
 *  prep book stays one click away the whole time. */
function NightOneBrief() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const meal = useGame((s) => s.meal);
  const chooseMutator = useGame((s) => s.chooseMutator);
  const startService = useGame((s) => s.startService);
  const canSave = useGame((s) => s.canSave);
  const mealDone = (career.mealNight ?? -1) >= career.night;
  // veterans who finished an intro before collapse to one beat — contract +
  // rule + doors, with the meal kept inline so the buff isn't lost
  const [veteran] = useState(() => introSeen());
  const [beat, setBeat] = useState(() => (veteran ? 1 : 0));
  // the night-one opener plays in three moments — the room, the brigade,
  // the work — each one landing before the next is offered
  const nextBeat = () => {
    sfx("bell");
    setBeat((b) => Math.min(2, b + 1));
  };
  // HOW IT WORKS (PREP) opens the book on arrival instead of skipping anything
  const [bookOpen, setBookOpen] = useState(() => consumeBriefingBookRequest());
  const [picked, setPicked] = useState<number | null>(null);
  const locked = n1NeedsHouseRule(career);
  const FamilyMeal = (
    <div className="qmeal">
      <div className="mhead">FAMILY MEAL — eaten standing up</div>
      <div className="qmeal-row">
        {[
          { label: "RAISE A TOAST", i: 0 },
          { label: "SHARE THE CRISPY BIT", i: 1 },
          { label: "EAT QUIETLY", i: 2 },
          ...((career.lastReview?.avgQuality ?? 100) < 58 &&
          (career.lastReview?.walkoutNames?.length ?? 0) === 0
            ? [
                {
                  label: "EAT THE CRISPY BIT YOURSELF",
                  i: 3,
                  chefEatsFirst: true,
                },
              ]
            : []),
        ].map(
          ({
            label,
            i,
            chefEatsFirst,
          }: {
            label: string;
            i: number;
            chefEatsFirst?: boolean;
          }) => (
            <button
              key={i}
              className={`btn lbtn ${picked === i ? "picked" : ""}${chefEatsFirst ? " chef-eats" : ""}`}
              disabled={mealDone || picked !== null}
              onClick={() => {
                meal(i);
                setPicked(i);
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>
      {mealDone && picked === null && (
        <div className="ltaken">bowls licked. yesterday stays yesterday.</div>
      )}
    </div>
  );
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      // a focused button/summary owns its activation — don't steal it
      if (
        e.target instanceof Element &&
        e.target.closest("button, summary, input, select, textarea, a")
      )
        return;
      e.preventDefault();
      if (beat < 2) nextBeat();
      else if (!n1NeedsHouseRule(useGame.getState().career)) startService();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [beat, startService]);
  if (bookOpen) return <PrepBook onBack={() => setBookOpen(false)} />;
  return (
    <div className="brief-wrap">
      <div className="brief quick-brief">
        <div className="bhead">{INTRO.n1Head}</div>
        <div className="bsub">{INTRO.n1Why}</div>
        <div className="title-residency">{INTRO.residencyLine}</div>
        <div className="bstats">
          <span>
            £<CountUp value={career.cash} />
          </span>
          <span>
            ★ <CountUp value={career.stars} />
          </span>
        </div>
        {beat === 0 && (
          <>
            <div className="mhead">DOORS OPEN AT SEVEN. IT IS FIVE PAST.</div>
            <div className="n1body">
              Three cooks came back. One rival wants your ticket rail. Somewhere
              in the room sits tonight's inspector, notebook closed, waiting.
            </div>
            <div className="qbtns">
              <button className="btn serve big" autoFocus onClick={nextBeat}>
                MEET THE BRIGADE <span className="kbd">↵</span>
              </button>
              <button className="btn ghost" onClick={() => setBookOpen(true)}>
                KITCHEN BOOK
              </button>
            </div>
          </>
        )}
        {beat === 1 && (
          <>
            <div className="mhead">{INTRO.beat1Head}</div>
            <div className="cast row qcast">
              {cooks.map((c) => (
                <div
                  key={c.id}
                  className={`ccard qcook ${c.walkedOut ? "gone" : ""}`}
                  title={`${c.name} — morale ${Math.round(c.morale)} · skill ${Math.round(c.skill * 100)}`}
                >
                  <img src={CAST_IMG[c.name] ?? castCommis} alt={c.name} />
                  <span className="cname">{c.name}</span>
                  {CAST_INTRO[c.name] && (
                    <span className="intro">{CAST_INTRO[c.name]}</span>
                  )}
                  <span className="mood">{moodOf(c)}</span>
                </div>
              ))}
            </div>
            {FamilyMeal}
            <div className="qbtns">
              <button className="btn serve big" autoFocus onClick={nextBeat}>
                TONIGHT →
              </button>
              <button className="btn ghost" onClick={() => setBookOpen(true)}>
                KITCHEN BOOK
              </button>
            </div>
          </>
        )}
        {beat === 2 && (
          <>
            <div className="mission">{INTRO.beat2Body}</div>
            <NightContractCard />
            {(() => {
              const side = sideOrderFor(career.night);
              return side ? (
                <div className="side-order">
                  <div className="mhead">TONIGHT'S SIDE ORDER</div>
                  {side.text}
                  <span className="cost"> · +{side.pay} ego if it lands</span>
                </div>
              ) : null;
            })()}
            {veteran && FamilyMeal}
            <div className="qmeal">
              <div className="mhead">HOUSE RULE — one twist, all residency</div>
              {career.mutator ? (
                <div className="ltaken">
                  rule set:{" "}
                  {career.mutator === "double_runners"
                    ? "DOUBLE SHIFT"
                    : career.mutator === "no_bin"
                      ? "NO BIN"
                      : career.mutator === "short_fuse"
                        ? "SHORT FUSE"
                        : "NONE"}
                  . no take-backs.
                </div>
              ) : (
                <div className="qmeal-row">
                  <button
                    className="btn lbtn"
                    onClick={() => chooseMutator("double_runners")}
                  >
                    DOUBLE SHIFT
                    <span className="cost">
                      BEEFCAKES doubles runners · all 9 nights
                    </span>
                  </button>
                  <button
                    className="btn lbtn"
                    onClick={() => chooseMutator("no_bin")}
                  >
                    NO BIN
                    <span className="cost">
                      86 off · cook everything · all 9 nights
                    </span>
                  </button>
                  <button
                    className="btn lbtn dim"
                    onClick={() => chooseMutator("short_fuse")}
                  >
                    SHORT FUSE
                    <span className="cost">
                      tables walk 20% faster · all 9 nights
                    </span>
                  </button>
                  <button
                    className="btn lbtn"
                    onClick={() => chooseMutator("none")}
                  >
                    NO HOUSE RULE
                    <span className="cost">
                      play it straight · all 9 nights
                    </span>
                  </button>
                </div>
              )}
            </div>
            {!canSave && (
              <div className="bwarn">
                Progress won't persist — this browser blocks storage.
              </div>
            )}
            <div className="qbtns">
              <button
                className="btn serve big"
                autoFocus
                disabled={locked}
                title={locked ? "Choose a house rule first" : undefined}
                onClick={startService}
              >
                OPEN THE DOORS
              </button>
              <button className="btn ghost" onClick={() => setBookOpen(true)}>
                KITCHEN BOOK
              </button>
            </div>
            {locked && (
              <div className="ltaken">
                pick a house rule and the doors open.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** one screen, one decision, one big button — the reading lives in the book */
/** Morning recipe call: one revision a night, with N3's credit decision explicit. */
function RecipeRow() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const developWellington = useGame((s) => s.developWellington);
  const current = currentWellingtonRecipe(career.recipeHistory);
  const tonight = career.recipeHistory?.find(
    (entry) => entry.night === career.night,
  );
  const stationCook = cooks.find((c) => c.station === 0 && !c.walkedOut);
  const [credit, setCredit] = useState<"shared" | "house">("shared");
  const pick = (finish: RecipeFinish) => developWellington(finish, credit);
  return (
    <div className="qrecipe">
      <div className="mhead">
        {career.night === 3
          ? "THE WELLINGTON — WHOSE VOICE?"
          : `${stationCook?.name ?? "THE HOUSE"}'S WELLINGTON`}
      </div>
      {career.night === 3 && !tonight && (
        <div className="credit-choice">
          <button
            className={`btn lbtn ${credit === "shared" ? "picked" : ""}`}
            disabled={!stationCook}
            onClick={() => setCredit("shared")}
          >
            SHARE WITH {stationCook?.name ?? "THE GRILL"}
            <span className="cost">+8 morale · grudge cleared</span>
          </button>
          <button
            className={`btn lbtn ${credit === "house" ? "picked" : ""}`}
            onClick={() => setCredit("house")}
          >
            THE HOUSE TAKES IT
            <span className="cost">−10 morale · “credit taken”</span>
          </button>
        </div>
      )}
      <div className="qmeal-row">
        {(Object.keys(WELLINGTON_FINISHES) as RecipeFinish[]).map((finish) => (
          <button
            key={finish}
            className={`btn lbtn ${tonight?.finish === finish ? "picked" : ""}`}
            disabled={
              !!tonight ||
              (career.night === 3 && credit === "shared" && !stationCook)
            }
            onClick={() => pick(finish)}
          >
            {WELLINGTON_FINISHES[finish].name.toUpperCase()}
          </button>
        ))}
      </div>
      {tonight ? (
        <div className="ltaken">
          {tonight.contributor} revised this —{" "}
          {WELLINGTON_FINISHES[tonight.finish].note}
        </div>
      ) : current ? (
        <div className="ltaken">
          On the pass: {current.contributor}&rsquo;s{" "}
          {WELLINGTON_FINISHES[current.finish].name.toLowerCase()}.
        </div>
      ) : (
        <div className="ltaken">
          No revision yet — the house standard remains.
        </div>
      )}
      {(career.lastSauceHelp?.night ?? -1) === career.night - 1 && (
        <div className="ltaken">
          You brought {career.lastSauceHelp!.cookName}&rsquo;s{" "}
          {career.lastSauceHelp!.dish} back together last night.
        </div>
      )}
    </div>
  );
}

function NightContractCard() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const chooseAttention = useGame((s) => s.chooseAttention);
  const chooseRecovery = useGame((s) => s.chooseRecovery);
  const chooseSeating = useGame((s) => s.chooseSeating);
  const contract = nightContract(career.night);
  const weakest = lowestMoraleCook(cooks);
  const recoveryTarget =
    career.recovery?.night === 6 ? career.recovery.cookName : weakest?.name;
  return (
    <div className="night-contract">
      <div className="mhead">
        NIGHT {contract.night} — {contract.name.toUpperCase()}
      </div>
      <div className="ndilemma">{contract.dilemma}</div>
      <div className="ncondition">{contract.condition}</div>
      {career.night === 4 && (
        <div className="night-choice">
          {career.attentionNight === 4 ? (
            <div className="ltaken">
              Attention spent on {career.attention?.toUpperCase()}.
            </div>
          ) : (
            <>
              <button
                className="btn lbtn"
                onClick={() => chooseAttention("regulars")}
              >
                THE REGULARS
                <span className="cost">their request comes first</span>
              </button>
              <button
                className="btn lbtn"
                onClick={() => chooseAttention("critic")}
              >
                THE CRITIC
                <span className="cost">their request comes first</span>
              </button>
              <button
                className="btn lbtn"
                onClick={() => chooseAttention("brigade")}
              >
                THE BRIGADE
                <span className="cost">
                  {weakest?.name ?? "the weakest cook"} steadies · +12 morale ·
                  trauma −1
                </span>
              </button>
            </>
          )}
        </div>
      )}
      {career.night === 6 && (
        <div className="night-choice">
          {career.recovery?.night === 6 ? (
            <div className="ltaken">
              {career.recovery.cookName}:{" "}
              {career.recovery.choice === "push"
                ? "pushed for skill, at a cost to morale"
                : "protected for morale and correction reliability"}
              .
            </div>
          ) : (
            <>
              <div className="ncondition">
                {recoveryTarget ?? "The weakest cook"} is running on empty.
              </div>
              <button
                className="btn lbtn"
                onClick={() => chooseRecovery("push")}
              >
                PUSH {recoveryTarget ?? "THEM"}
                <span className="cost">+4% skill · −12 morale</span>
              </button>
              <button
                className="btn lbtn"
                onClick={() => chooseRecovery("protect")}
              >
                PROTECT {recoveryTarget ?? "THEM"}
                <span className="cost">
                  +18 morale · trauma −1 · grudge cleared
                </span>
              </button>
            </>
          )}
        </div>
      )}
      {career.night === 7 && (
        <div className="night-choice">
          {career.seating101 ? (
            <div className="ltaken">
              101: {career.seating101.toUpperCase()}.
            </div>
          ) : (
            <>
              <button
                className="btn lbtn"
                onClick={() => chooseSeating("regulars")}
              >
                REGULARS TO 101
                <span className="cost">keep the ritual · 50s fuse</span>
              </button>
              <button
                className="btn lbtn"
                onClick={() => chooseSeating("press")}
              >
                PRESS TO 101
                <span className="cost">fast company · 40s fuse</span>
              </button>
              <button
                className="btn lbtn"
                onClick={() => chooseSeating("walkin")}
              >
                WALK-INS TO 101
                <span className="cost">big spend · 42s fuse</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FeudPanel() {
  const career = useGame((s) => s.career);
  const feud = useGame((s) => s.feud);
  const feudChoice = useGame((s) => s.feudChoice);
  if (!feud) return null;
  return (
    <div className="night-feud">
      <img
        className="feudface"
        src={FEUD_ART[feud.actor] ?? castBeefcakes}
        alt={FEUD_ALT[feud.actor] ?? "BEEFCAKES"}
      />
      <div>
        <div className="mhead">TONIGHT&rsquo;S PROBLEM</div>
        <div className="ftext">{feud.text}</div>
        {feud.resolved ? (
          <div className="fout">{feud.outcome}</div>
        ) : (
          <div className="fbtns">
            {feud.options.map((option, i) => (
              <button
                key={i}
                className="btn fbtn"
                disabled={i === 0 && career.cash < (feud.cost ?? 0)}
                onClick={() => feudChoice(i)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickBrief({ onBook }: { onBook: () => void }) {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const meal = useGame((s) => s.meal);
  const startService = useGame((s) => s.startService);
  const canSave = useGame((s) => s.canSave);
  const v = VENUES[career.venue];
  const mealDone = (career.mealNight ?? -1) >= career.night;
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="brief-wrap">
      <div className="brief quick-brief">
        <div className="bhead">
          NIGHT {career.night} — {v.name}
        </div>
        <div className="bstats">
          <span>
            £<CountUp value={career.cash} />
          </span>
          <span>
            ★ <CountUp value={career.stars} />
          </span>
        </div>
        <div className="cast row qcast">
          {cooks.map((c) => (
            <div
              key={c.id}
              className={`ccard qcook ${c.walkedOut ? "gone" : ""}`}
              title={`${c.name} — morale ${Math.round(c.morale)} · skill ${Math.round(c.skill * 100)}`}
            >
              <img src={CAST_IMG[c.name] ?? castCommis} alt={c.name} />
              <span className="cname">
                {c.name}
                {c.trauma > 0 && (
                  <span className="scar">
                    {" ✕".repeat(Math.min(3, c.trauma))}
                  </span>
                )}
              </span>
              <span className="mood">{moodOf(c)}</span>
            </div>
          ))}
        </div>
        {career.night >= 2 && <RecipeRow />}
        <NightContractCard />
        {(() => {
          const side = sideOrderFor(career.night);
          return side ? (
            <div className="side-order">
              <div className="mhead">TONIGHT'S SIDE ORDER</div>
              {side.text}
              <span className="cost"> · +{side.pay} ego if it lands</span>
            </div>
          ) : null;
        })()}
        <FeudPanel />
        <div className="qmeal">
          <div className="mhead">FAMILY MEAL</div>
          <div className="qmeal-row">
            {[
              { label: "RAISE A TOAST", i: 0 },
              { label: "SHARE THE CRISPY BIT", i: 1 },
              { label: "EAT QUIETLY", i: 2 },
              ...((career.lastReview?.avgQuality ?? 100) < 58 &&
              (career.lastReview?.walkoutNames?.length ?? 0) === 0
                ? [
                    {
                      label: "EAT THE CRISPY BIT YOURSELF",
                      i: 3,
                      chefEatsFirst: true,
                    },
                  ]
                : []),
            ].map(
              ({
                label,
                i,
                chefEatsFirst,
              }: {
                label: string;
                i: number;
                chefEatsFirst?: boolean;
              }) => (
                <button
                  key={i}
                  className={`btn lbtn ${picked === i ? "picked" : ""}${chefEatsFirst ? " chef-eats" : ""}`}
                  disabled={mealDone || picked !== null}
                  onClick={() => {
                    meal(i);
                    setPicked(i);
                  }}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          {mealDone && picked === null && (
            <div className="ltaken">Meal shared.</div>
          )}
        </div>
        {!canSave && (
          <div className="bwarn">
            Progress won't persist — this browser blocks storage.
          </div>
        )}
        <div className="qbtns">
          <button className="btn serve big" autoFocus onClick={startService}>
            OPEN THE DOORS
          </button>
          <button className="btn ghost" onClick={onBook}>
            KITCHEN BOOK
            {(career.bookSeenNight ?? 0) < career.night &&
              morningCards(career, cooks).length > 0 && (
                <span className="bnew">new entry</span>
              )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** the old full prep: brigade detail, meal, market, accounts, feuds, vows */
function PrepBook({ onBack }: { onBack: () => void }) {
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
  const lots = useGame((s) => s.lots);
  const buyLot = useGame((s) => s.buyLot);
  const coach = useGame((s) => s.coach);
  const setMenu = useGame((s) => s.setMenu);
  const chooseVow = useGame((s) => s.chooseVow);
  const chooseMutator = useGame((s) => s.chooseMutator);
  const meal = useGame((s) => s.meal);
  const mealDone = (career.mealNight ?? -1) >= career.night;
  const feed = useGame((s) => s.feed);
  const startService = useGame((s) => s.startService);
  const canSave = useGame((s) => s.canSave);
  const markBookSeen = useGame((s) => s.markBookSeen);
  const v = VENUES[career.venue];
  const [beat, setBeat] = useState(0);
  // this morning's confessionals — the reason the book carries the badge
  const cards = morningCards(career, cooks);
  useEffect(() => {
    markBookSeen();
  }, [markBookSeen]);
  // N1 cold open: one beat (brigade + house rule), then doors. Market N2+, shop N3+, feud N4+.
  const lastBeat = career.night === 1 ? 0 : feud ? 2 : 1;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      // a focused button/summary owns its activation — don't steal it
      if (
        e.target instanceof Element &&
        e.target.closest("button, summary, input, select, textarea, a")
      )
        return;
      e.preventDefault();
      if (beat < lastBeat) setBeat(beat + 1);
      else startService();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [beat, lastBeat, startService]);
  const fwdLabel =
    beat < lastBeat
      ? beat === 0
        ? "TO THE MARKET →"
        : "TONIGHT'S PROBLEM →"
      : career.night === 1
        ? "OPEN THE DOORS ↵"
        : "RUN SERVICE ↵";
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
        const lock = c?.requestPointerLock?.() as unknown as
          Promise<void> | undefined;
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
          <button className="btn ghost bookback" onClick={onBack}>
            ← BACK TO THE DOORS
          </button>
        </div>
        <div className="bstats">
          <span>
            £<CountUp value={career.cash} />
          </span>
          <span>
            {"★".repeat(Math.min(12, career.stars)) || "☆"} {career.stars}★
            total
          </span>
          <span>{9 - career.night + 1} services left</span>
        </div>
        {career.lastReview && (
          <div className="blast">
            <div className="rlabel">
              LAST NIGHT — {career.lastReview.headline}
            </div>
            <div className="bincident">{career.lastReview.incident}</div>
            <div className="bconsequence">{career.lastReview.consequence}</div>
          </div>
        )}
        <NightContractCard />
        {nightTake && (
          <div className="btake">
            Last night: £{nightTake.covers} covers − £{nightTake.wages} wages −
            £{nightTake.breakage} breakage ={" "}
            <b className={nightTake.net >= 0 ? "up" : "down"}>
              {nightTake.net >= 0 ? "+" : ""}£{nightTake.net}
            </b>
          </div>
        )}
        {career.venueUpNight === career.night && (
          <div className="venue-up">
            {career.venue >= 2
              ? "MOSH & SON — the flagship. They fixed 14's wobble. Behave."
              : "LE MOSH — white paint, same rats. Tablecloths (mostly clean)."}
          </div>
        )}
        {cards.length > 0 && (
          <div className="confess">
            {cards.map((c) => (
              <div key={c.cookId} className="confess-card">
                <img src={CAST_IMG[c.speaker] ?? castCommis} alt={c.speaker} />
                <span className="cline">&ldquo;{c.line}&rdquo;</span>
                <span className="cwho">— {c.speaker}</span>
              </div>
            ))}
          </div>
        )}
        {beat === 0 && (
          <div className="beat">
            <div className="mhead">
              THE BRIGADE
              {career.night === 1 ? " — first night, so: introductions" : ""}
            </div>
            <div className="cast row">
              {cooks.map((c) => (
                <div
                  key={c.id}
                  className={`ccard tall ${c.walkedOut ? "gone" : ""}`}
                >
                  <img src={CAST_IMG[c.name] ?? castCommis} alt={c.name} />
                  {!CAST_IMG[c.name] && (
                    <span className="freshmeat">FRESH MEAT — first night</span>
                  )}
                  <span className="cname">
                    {c.name}
                    {c.trauma > 0 && (
                      <span className="scar">
                        {" ✕".repeat(Math.min(3, c.trauma))}
                      </span>
                    )}
                  </span>
                  <span className="mood">
                    {moodOf(c)} · skill {Math.round(c.skill * 100)}
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
                <div className="ltaken">
                  bowls licked. yesterday stays yesterday.
                </div>
              ) : (
                <>
                  <button className="btn lbtn" onClick={() => meal(0)}>
                    PRAISE THEM{" "}
                    <span className="cost">
                      +12 morale all · clears grudges
                    </span>
                  </button>
                  <button className="btn lbtn" onClick={() => meal(1)}>
                    THE CRISPY BIT GOES TO THE LOWEST{" "}
                    <span className="cost">
                      +25 them, +6 rest · clears grudges
                    </span>
                  </button>
                  <button className="btn lbtn dim" onClick={() => meal(2)}>
                    EAT IN SILENCE{" "}
                    <span className="cost">
                      −1 trauma where it hurts · clears grudges
                    </span>
                  </button>
                  {(career.lastReview?.avgQuality ?? 100) < 58 &&
                    (career.lastReview?.walkoutNames?.length ?? 0) === 0 && (
                      <button
                        className="btn lbtn chef-eats"
                        onClick={() => meal(3)}
                      >
                        EAT THE CRISPY BIT YOURSELF{" "}
                        <span className="cost">
                          +10 morale all · the pass holds its head up
                        </span>
                      </button>
                    )}
                </>
              )}
            </div>
            {career.night === 1 && (
              <div className="market">
                <div className="mhead">
                  HOUSE RULE — one twist, all residency
                </div>
                {career.mutator ? (
                  <div className="ltaken">
                    rule set:{" "}
                    {career.mutator === "double_runners"
                      ? "DOUBLE SHIFT"
                      : career.mutator === "no_bin"
                        ? "NO BIN"
                        : career.mutator === "short_fuse"
                          ? "SHORT FUSE"
                          : "NONE"}
                    . no take-backs.
                  </div>
                ) : (
                  <>
                    <button
                      className="btn lbtn"
                      onClick={() => chooseMutator("double_runners")}
                    >
                      DOUBLE SHIFT{" "}
                      <span className="cost">
                        BEEFCAKES doubles runners · all 9 nights
                      </span>
                    </button>
                    <button
                      className="btn lbtn"
                      onClick={() => chooseMutator("no_bin")}
                    >
                      NO BIN{" "}
                      <span className="cost">
                        86 off · cook everything · all 9 nights
                      </span>
                    </button>
                    <button
                      className="btn lbtn dim"
                      onClick={() => chooseMutator("short_fuse")}
                    >
                      SHORT FUSE{" "}
                      <span className="cost">
                        tables walk 20% faster · all 9 nights
                      </span>
                    </button>
                    <button
                      className="btn lbtn"
                      onClick={() => chooseMutator("none")}
                    >
                      NO HOUSE RULE{" "}
                      <span className="cost">
                        play it straight · all 9 nights
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
            {career.night >= 2 && (
              <div className="market">
                <div className="mhead">COACHING — one session a night</div>
                {(career.coachNight ?? -1) >= career.night ? (
                  <div className="ltaken">session done. let it simmer.</div>
                ) : (
                  <>
                    {cooks.map((c) => (
                      <div key={c.id} className="lot">
                        <span className="lname">{c.name}</span>
                        <span className="ldesc">
                          skill {Math.round(c.skill * 100)}
                          {c.grudge ? ` · holding: ${c.grudge}` : ""}
                          {c.honored ? " · ✦ keepsake" : ""}
                        </span>
                        <span className="lbtns">
                          <button
                            className="btn lbtn"
                            disabled={c.walkedOut}
                            onClick={() => coach(c.id, "praise")}
                          >
                            PRAISE
                          </button>
                          <button
                            className="btn lbtn"
                            disabled={c.walkedOut}
                            onClick={() => coach(c.id, "drill")}
                          >
                            DRILL{" "}
                            <span className="cost">+3 skill, −8 morale</span>
                          </button>
                          <button
                            className="btn lbtn dim"
                            disabled={c.walkedOut}
                            onClick={() => coach(c.id, "rest")}
                          >
                            REST <span className="cost">−1 trauma</span>
                          </button>
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
              <img
                className="fishmonger"
                src={castFishmonger}
                alt="The fishmonger — what the sea surrendered"
              />
              <img
                className="market-sign"
                src={marketSign}
                alt="MORNING MARKET — what the sea surrendered"
              />
            </div>
            {career.night >= 3 && (
              <div className="market">
                <div className="mhead">MENU — feature one, rest one</div>
                {(career.menuNight ?? -1) >= career.night ? (
                  <div className="ltaken">
                    feature: {career.featuredDish} · resting:{" "}
                    {career.restedDish}
                  </div>
                ) : (
                  <MenuPicker
                    featured={career.featuredDish}
                    onPick={(f, r) => setMenu(f, r)}
                  />
                )}
              </div>
            )}
            {career.night >= 2 && lots.length > 0 && (
              <div className="market">
                <div className="mhead">
                  MORNING MARKET — what the sea surrendered
                </div>
                {lots.map((l, i) => (
                  <div key={i} className={`lot ${l.bought ? "gone" : ""}`}>
                    <span className="lname">{l.name}</span>
                    <span className="ldesc">
                      {l.desc}
                      {l.note && (
                        <em className="lnote">
                          {l.note} — {l.voice}
                        </em>
                      )}
                    </span>
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
                        <button
                          className="btn lbtn dim"
                          onClick={() => buyLot(i, false)}
                        >
                          LET HIM HAVE IT
                        </button>
                      </span>
                    ) : (
                      <button
                        className="btn lbtn"
                        disabled={career.cash < l.cost}
                        onClick={() => buyLot(i, true)}
                      >
                        £{l.cost}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {career.night >= 3 && (
              <div className="bshop slim">
                <div className="mhead">BACK OFFICE</div>
                <button
                  className="btn shop"
                  disabled={career.cash < 40}
                  onClick={() => briefAction("drinks")}
                >
                  TAKE THEM FOR DRINKS{" "}
                  <span className="cost">£40 · +25 morale</span>
                </button>
                <button
                  className="btn shop"
                  disabled={career.cash < 80 || career.gear >= 3}
                  onClick={() => briefAction("gear")}
                >
                  BETTER PANS{" "}
                  <span className="cost">
                    £80 · quality floor {career.gear}/3
                  </span>
                </button>
                <button
                  className="btn shop"
                  disabled={career.cash < 60}
                  onClick={() => briefAction("press")}
                >
                  COMP THE FOOD PRESS{" "}
                  <span className="cost">£60 · −heat, +5 morale</span>
                </button>
              </div>
            )}
            {career.night >= 4 && (
              <div className="bshop slim">
                <div className="mhead">
                  CLOUT — EGO {Math.round(ego)} · spend it tonight
                </div>
                {(career.champagneNight ?? -1) >= career.night ? (
                  <div className="ltaken">
                    champagne on ice for the inspector
                  </div>
                ) : (
                  <button
                    className="btn shop"
                    disabled={ego < 15}
                    onClick={() => clout("champagne")}
                  >
                    COMP CHAMPAGNE FOR THE INSPECTOR{" "}
                    <span className="cost">15 ego · +10 on their plates</span>
                  </button>
                )}
                {(career.dessertNight ?? -1) >= career.night ? (
                  <div className="ltaken">
                    dessert on the house for the regulars
                  </div>
                ) : (
                  <button
                    className="btn shop"
                    disabled={ego < 20}
                    onClick={() => clout("dessert")}
                  >
                    DESSERT ON THE HOUSE{" "}
                    <span className="cost">
                      20 ego · regulars forgive twice
                    </span>
                  </button>
                )}
                {career.doorNamed ? (
                  <div className="ltaken">your name is above the door</div>
                ) : (
                  <button
                    className="btn shop"
                    disabled={ego < 40}
                    onClick={() => clout("door")}
                  >
                    NAME ABOVE THE DOOR{" "}
                    <span className="cost">
                      40 ego to ask · 30 to buy · accolade, no star
                    </span>
                  </button>
                )}
              </div>
            )}
            {career.night >= 8 && (
              <>
                <div className="bshop slim">
                  <div className="mhead">CALL THE BOARD — one wager</div>
                  {career.bet ? (
                    <div className="ltaken">
                      board called: {BOARD[career.bet.kind].label}
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn shop"
                        disabled={career.cash < BOARD.covers.stake}
                        onClick={() => bet("covers")}
                      >
                        8+ COVERS{" "}
                        <span className="cost">{BOARD.covers.blurb}</span>
                      </button>
                      <button
                        className="btn shop"
                        disabled={career.cash < BOARD.walks.stake}
                        onClick={() => bet("walks")}
                      >
                        NO WALKS{" "}
                        <span className="cost">{BOARD.walks.blurb}</span>
                      </button>
                      <button
                        className="btn shop"
                        disabled={ego < BOARD.spot.stakeEgo}
                        onClick={() => bet("spot")}
                      >
                        CLOCK THE INSPECTOR{" "}
                        <span className="cost">{BOARD.spot.blurb}</span>
                      </button>
                    </>
                  )}
                </div>
                <div className="bshop slim">
                  <div className="mhead">
                    TONIGHT'S VOW — judged first on the card
                  </div>
                  {career.vow ? (
                    <div className="ltaken">
                      vowed: {career.vow.toUpperCase()}
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn shop"
                        onClick={() => chooseVow("star")}
                      >
                        STAR VOW{" "}
                        <span className="cost">
                          no walks + clocked = +15 lifetime ego
                        </span>
                      </button>
                      <button
                        className="btn shop"
                        onClick={() => chooseVow("house")}
                      >
                        HOUSE VOW <span className="cost">101 turns twice</span>
                      </button>
                      <button
                        className="btn shop"
                        onClick={() => chooseVow("brigade")}
                      >
                        BRIGADE VOW{" "}
                        <span className="cost">zero walkouts, trauma −1</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            <div className="bshop slim">
              <div className="mhead">A MAN WITH A VAN</div>
              {(career.debt ?? 0) > 0 ? (
                <button
                  className="btn shop"
                  disabled={career.cash < (career.debt ?? 0) + 30}
                  onClick={repay}
                >
                  PAY THE MAN £{(career.debt ?? 0) + 30}{" "}
                  <span className="cost">before the residency ends</span>
                </button>
              ) : (
                <button className="btn shop" onClick={borrow}>
                  BORROW £100{" "}
                  <span className="cost">he&apos;ll want £130 back</span>
                </button>
              )}
            </div>
          </div>
        )}
        {beat === 2 && <FeudPanel />}
        {feed.length > 0 && (
          <div className="bfeed">{feed[feed.length - 1].text}</div>
        )}
        {!canSave && (
          <div className="bwarn">
            Progress won't persist — this browser blocks storage.
          </div>
        )}
        <button className="btn serve big" onClick={go}>
          {fwdLabel}
        </button>
      </div>
    </div>
  );
}

function Ending() {
  const career = useGame((s) => s.career);
  const cooks = useGame((s) => s.cooks);
  const enterResidency = useGame((s) => s.enterResidency);
  const curtain = useGame((s) => s.endingCurtain);
  const dismissEndingCurtain = useGame((s) => s.dismissEndingCurtain);
  const ending = buildEnding(career, cooks);
  // the graduation plays in two moments: the brigade faces the room (curtain
  // call, one fate per cook), then the verdict lands like a stamped review
  return (
    <div className="review-wrap">
      <div className="review ending">
        <div className="rhead">THE RESIDENCY ENDS</div>
        {curtain ? (
          <>
            <div className="ending-title">CURTAIN CALL</div>
            <div className="rollcall">
              {ending.rollCall.map((entry, i) => (
                <div
                  key={`${entry.name}-${i}`}
                  className={`roll-line ${entry.gone ? "gone" : ""}`}
                  style={{ animationDelay: `${0.15 + i * 0.55}s` }}
                >
                  <span className="roll-name">{entry.name}</span>
                  <span className="roll-fate">{entry.line}</span>
                </div>
              ))}
            </div>
            <div className="rbtns main-action">
              <button
                className="btn serve"
                autoFocus
                onClick={dismissEndingCurtain}
              >
                THE VERDICT <span className="kbd">↵</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`ending-result ${ending.won ? "won" : ""}`}>
              {ending.broke
                ? "THE HOUSE CLOSED"
                : ending.won
                  ? "RESIDENCY WON"
                  : "RESIDENCY UNFINISHED"}
            </div>
            <div className="ending-title">{ending.title}</div>
            <div className="quote">{ending.quote}</div>
            <div className="ending-ledger">
              <p>{ending.signature}</p>
              <p>{ending.brigade}</p>
              {ending.memory && <p>{ending.memory}</p>}
              <p>{ending.costs}</p>
            </div>
            <div className="rstats">
              <span>{career.stars}★ earned</span>
              <span>food {Math.round(ending.avgCulinary)}/100</span>
              <span>hospitality {Math.round(ending.avgHospitality)}/100</span>
              <span>{career.defections} defections</span>
              <span>{career.totalWalkouts ?? 0} walkouts</span>
              <span>{Math.round(career.totalEgo ?? 0)} lifetime ego</span>
              {(career.covers ?? []).length > 0 && (
                <span>covers: {(career.covers ?? []).join(" · ")}</span>
              )}
            </div>
            <div className="rbtns">
              <button
                className="btn serve"
                onClick={() => enterResidency({ fresh: true })}
              >
                NEW RESIDENCY <span className="kbd">↵</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useGame.getState();
      // the controls modal owns input entirely — Escape/? close it, nothing else passes
      if (s.glossary) {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault();
          s.toggleGlossary();
        }
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        s.toggleGlossary();
        return;
      }
      if (s.phase === "title" && (e.key === " " || e.key === "Enter")) {
        // buttons, the Menu summary and links own their own activation
        if (
          e.target instanceof Element &&
          e.target.closest("button, summary, input, select, textarea, a")
        )
          return;
        e.preventDefault();
        s.enterResidency();
        return;
      }
      if (s.phase === "briefing" && e.key === "Enter") return; // briefing components own Enter
      if (s.phase === "ending" && (e.key === " " || e.key === "Enter")) {
        if (
          e.target instanceof Element &&
          e.target.closest("button, summary, input, select, textarea, a")
        )
          return;
        e.preventDefault();
        if (s.endingCurtain) {
          s.dismissEndingCurtain();
          return;
        }
        s.enterResidency({ fresh: true });
        return;
      }
      if (s.phase === "review" && (e.key === " " || e.key === "Enter")) {
        // a focused button, summary or link owns its own activation — don't
        // let the global advance steal it (details must be keyboard-expandable)
        if (
          e.target instanceof Element &&
          e.target.closest("button, summary, input, select, textarea, a")
        )
          return;
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
      if (e.key.toLowerCase() === "u") {
        setVoiceEnabled(!voiceEnabled());
        return;
      }
      if (e.key === "Escape") {
        // inspection closes before the pause overlay takes the key
        if (s.inspecting) {
          s.setInspecting(false);
          return;
        }
        s.togglePause();
        return;
      }
      if (e.key.toLowerCase() === "p") {
        s.togglePause();
        return;
      }
      if (s.paused) return;
      const k = e.key.toLowerCase();
      // walk the line: Q toward the sinks, W toward the room, 0 back to the pass
      if (k === "0") {
        s.setStance("pass");
        return;
      }
      if (k === "q") {
        s.stepStance(-1);
        return;
      }
      if (k === "w") {
        s.stepStance(1);
        return;
      }
      if (k === "s") return s.smartServe();
      if (k === "b") return s.judge("sendback");
      if (k === "x") return s.judge("smash");
      if (k === "f") {
        if (s.folklore?.kind === "return") return s.answerFolklore(false);
        // F aims at the selected ticket: ready → collect, cooking → fire
        const sel =
          s.selectedTicketId != null
            ? s.tickets.find((t) => t.id === s.selectedTicketId)
            : null;
        if (sel?.state === "ready") return s.collectPlate(sel.id);
        return s.firePlate(sel?.id);
      }
      if (k === "i") return s.setInspecting(!s.inspecting);
      if (k === "e") return s.eightySix();
      if (k === "m") {
        // held split sauce → the pass correction; otherwise the live whisk
        const held = s.tickets.find((t) => t.state === "pass");
        if (held?.condition?.sauce === "split") return s.correctPlate();
        return s.whisk();
      }
      if (k === "t") return s.move101();
      if (
        k === "r" &&
        s.folklore &&
        s.folklore.kind !== "flash" &&
        s.folklore.kind !== "return"
      )
        return s.answerFolklore(true);
      if (k === "d" && s.folklore?.kind === "return")
        return s.answerFolklore(true);
      if (k === "h") return s.shooRunner();
      if (k === "d") return s.declineRequest();
      if (k === "c") return s.compTable();
      if (k === "g") return s.sendBread();
      if (k === "n") return s.expedite();
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

function Glossary() {
  const toggleGlossary = useGame((s) => s.toggleGlossary);
  const rows: [string, string][] = [
    ["1–9", "plate rail ticket to pass"],
    [
      "S / B / X",
      "serve (collects a ready plate if the pass is empty) · send back · smash the held plate",
    ],
    ["F", "fire / collect the aimed ticket"],
    ["I", "inspect the held plate"],
    ["E", "86 the dish — displaced covers count as misses"],
    ["M", "fix a split sauce — held plate or live pot"],
    ["T", "move 101 mid-rush"],
    ["H", "shoo BEEFCAKES' runner"],
    ["D", "refuse request · refuse-with-grace (cold plate)"],
    ["R", "fix the folklore (fork/glass/coat)"],
    ["C", "comp the hanging table (£20 champagne)"],
    ["G", "bread service (£3; buys patience, not quality)"],
    ["N", "wave the next order in early (+2 station pressure)"],
    ["U", "brigade voices on/off"],
    ["click table", "flag the inspector (before dessert)"],
    ["Q / W", "walk the line, night 2+ — sinks · sauce · pass · room"],
    ["0", "back to the pass"],
    ["P / Esc", "pause"],
    ["V", "first-person pass view"],
    ["?", "this card"],
  ];
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    // single focusable control: keep Tab cycling inside the dialog
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      closeBtn.current?.focus();
    };
    window.addEventListener("keydown", trap, true);
    return () => {
      window.removeEventListener("keydown", trap, true);
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    <div className="glossary" onClick={toggleGlossary}>
      <div
        className="gcard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ghead" id="controls-title">
          HOUSE MANUAL — ? to close
        </div>
        {rows.map(([k, v]) => (
          <div key={k} className="grow">
            <span className="gkey">{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <button className="btn" ref={closeBtn} onClick={toggleGlossary}>
          BACK TO WORK
        </button>
      </div>
    </div>
  );
}

export default function HUD() {
  useHotkeys();
  const phase = useGame((s) => s.phase);
  const glossary = useGame((s) => s.glossary);
  const initPlatform = useGame((s) => s.initPlatform);
  const [ogHandle, setOgHandle] = useState<string | null>(() => ogHandleNow());
  useEffect(() => {
    initPlatform();
    readyOg(); // first frame the player can act in — the title card
    return onOgHandle(setOgHandle);
  }, [initPlatform]);
  const enterResidency = useGame((s) => s.enterResidency);
  const hasSave = useGame((s) => s.hasSave);
  const saveIssue = useGame((s) => s.saveIssue);
  const career = useGame((s) => s.career);
  // the ghost target: the house best lives in legends, refreshed per night —
  // a record is only a target when the number is on the wall during service
  const legendsBest = useMemo(() => loadLegends().bestStreak, [career.night]);
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
  const sauce = useGame((s) => s.sauce);
  const breadAt = useGame((s) => s.breadAt);
  const sendBread = useGame((s) => s.sendBread);
  const nextTicketIn = useGame((s) => s.nextTicketIn);
  const expedite = useGame((s) => s.expedite);
  const adrenalineTil = useGame((s) => s.adrenalineTil);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const criticSpotted = useGame((s) => s.criticSpotted);
  const streak = useGame((s) => s.streak);
  const qualitySum = useGame((s) => s.qualitySum);
  const paused = useGame((s) => s.paused);
  const openingStep = useGame((s) => s.openingStep);
  const toggleGlossary = useGame((s) => s.toggleGlossary);
  const firstPerson = useGame((s) => s.firstPerson);
  const aim = useGame((s) => s.aim);
  const charge = useScreamCharge();
  const locked = usePointerLocked();
  // tonight's live food average — the star thresholds made visible
  const avg = served > 0 ? qualitySum / served : 0;

  useEffect(() => {
    if (phase !== "service" || paused) {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [phase, paused]);

  const unlockCriticCam = useGame((s) => s.unlockCriticCam);
  const theBackDoor = useGame((s) => s.theBackDoor);
  const matDrop = useGame((s) => s.matDrop);
  const [matVisible, setMatVisible] = useState(false);
  const [pokes, setPokes] = useState(0);
  // the back door: type 8-6 at the title and sixty quid sits under the mat
  const knockBuffer = useRef("");
  useEffect(() => {
    if (phase !== "title") {
      knockBuffer.current = "";
      return;
    }
    const h = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[0-9]$/.test(e.key)) return;
      knockBuffer.current = (knockBuffer.current + e.key).slice(-2);
      if (knockBuffer.current === "86") {
        knockBuffer.current = "";
        theBackDoor();
        setMatVisible(true);
        window.setTimeout(() => setMatVisible(false), 3600);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, theBackDoor]);
  const [voiceOn, setVoiceOn] = useState(voiceEnabled());
  const pokeBeefcakes = () => {
    if (career.criticCam) return;
    const n = pokes + 1;
    setPokes(n);
    if (n >= 3) {
      unlockCriticCam();
      setPokes(0);
    }
  };
  const atPass = tickets.find((t) => t.state === "pass");
  const live = tickets.filter(
    (t) => t.state === "rail" || t.state === "plating" || t.state === "ready",
  );
  const railAll = live.filter((t) => t.state === "rail");
  const amped = serviceTime < adrenalineTil;
  // one rail, one keyed card per order — rendered from the first ticket of
  // the night, opening included, so the rail is there from the start.
  // Active plates first so a ready is never clipped away, then the queued
  // dockets. In first person the world's dockets hold the queue.
  const railCards = (() => {
    const active = live.filter((t) => t.state !== "rail");
    const cards = firstPerson ? active : [...active, ...railAll];
    const shown = cards.slice(0, 9);
    if (shown.length === 0) return null;
    return (
      <div className="order-rail">
        {shown.map((t) => (
          <TicketCard
            key={t.id}
            t={t}
            hotkey={t.state === "rail" ? railAll.indexOf(t) + 1 : undefined}
          />
        ))}
      </div>
    );
  })();

  return (
    <div className="hud">
      {glossary && <Glossary />}
      {phase === "title" && (
        <div className="title-card title-simple">
          <img
            className="hero-lineup"
            src={lineupArt}
            alt="MISE EN MOSH — the brigade at the pass"
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
          <div className="title-promise">{INTRO.titleSub}</div>
          <button
            className="btn title-play"
            autoFocus
            disabled={!!saveIssue}
            onClick={() => {
              preloadKitchenModels();
              enterResidency();
            }}
          >
            {hasSave ? `CONTINUE — NIGHT ${career.night}` : "TAKE THE PASS"}
          </button>
          {matVisible && (
            <div className="mat-drop" role="status">
              {useGame.getState().matDropKind === "empty"
                ? "THE BACK DOOR — the mat is empty. Sixty quid was the whole kindness."
                : `THE BACK DOOR — sixty quid under the mat. £${useGame.getState().career.cash} in the pocket.`}
            </div>
          )}
          {!hasSave && <div className="title-hint">{INTRO.titleHint}</div>}
          {!hasSave && (
            <div className="title-residency">{INTRO.residencyLine}</div>
          )}
          <details className="title-menu">
            <summary>Menu</summary>
            <div className="title-menu-panel">
              <button className="btn" onClick={toggleGlossary}>
                CONTROLS
              </button>
              <button
                className="btn"
                onClick={() => {
                  const next = !voiceOn;
                  setVoiceEnabled(next);
                  setVoiceOn(next);
                }}
              >
                VOICE {voiceOn ? "ON" : "OFF"}
              </button>
              <button
                className="btn"
                disabled={!!saveIssue}
                onClick={() => {
                  preloadKitchenModels();
                  enterResidency({ prep: true });
                }}
              >
                HOW IT WORKS (PREP)
              </button>
              {hasSave && (
                <button
                  className="btn ghost"
                  disabled={!!saveIssue}
                  onClick={() => {
                    preloadKitchenModels();
                    enterResidency({ fresh: true });
                  }}
                >
                  NEW RESIDENCY
                </button>
              )}
              <details className="cast-menu">
                <summary>The brigade</summary>
                <div className="cast">
                  <div className="ccard">
                    <img src={castPetra} alt="PETRA" />
                    <span>
                      PETRA — grill.
                      <br />
                      Do not touch her tongs.
                    </span>
                  </div>
                  <div className="ccard">
                    <img src={castDimitri} alt="DIMITRI" />
                    <span>
                      DIMITRI — sauté.
                      <br />
                      He's seen things.
                    </span>
                  </div>
                  <div className="ccard">
                    <img src={castAnwar} alt="ANWAR" />
                    <span>
                      ANWAR — pastry.
                      <br />
                      Fragile. Handle with care.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`ccard wanted${pokes > 0 && !career.criticCam ? " poked" : ""}`}
                    onClick={pokeBeefcakes}
                    title="WANTED for ticket theft."
                  >
                    <img src={castBeefcakes} alt="BEEFCAKES" />
                    <span>
                      BEEFCAKES
                      <br />
                      WANTED for ticket theft.
                    </span>
                    {pokes === 1 && !career.criticCam && (
                      <span className="poke">BEEFCAKES eyes your tickets.</span>
                    )}
                    {pokes >= 2 && !career.criticCam && (
                      <span className="poke">
                        BEEFCAKES mouths: “nice pass. shame if—”
                      </span>
                    )}
                    {career.criticCam && (
                      <span className="poke wired">
                        CRITIC CAM WIRED — a red eye blinks above the pass. Tell
                        no one.
                      </span>
                    )}
                  </button>
                </div>
              </details>
              {(() => {
                const l = loadLegends();
                if (!l.residencies && !l.bestStreak) return null;
                return (
                  <div className="legends-line">
                    HOUSE LEGENDS — best streak ×{l.bestStreak} · silent fives{" "}
                    {l.silentFives} · covers {l.covers.length} · residencies{" "}
                    {l.residencies}
                  </div>
                );
              })()}
              {ogHandle && (
                <div className="legends-line">
                  CHEF {ogHandle.toUpperCase()} IS ON THE PASS.
                </div>
              )}
            </div>
          </details>
        </div>
      )}
      {/* rendered outside the overflowing title panel so the warning is always visible */}
      {phase === "title" && saveIssue && (
        <p className="save-issue" role="alert">
          {saveIssue}
        </p>
      )}
      {phase === "briefing" && <Briefing />}
      {phase === "service" && openingStep && (
        <>
          {railCards}
          <OpeningService />
        </>
      )}
      {phase === "service" && !openingStep && (
        <>
          <ServiceTools />
          {career.criticCam && <CriticCam />}
          {firstPerson && (
            <div className={`reticle${aim ? ` aim-${aim}` : ""}`} aria-hidden />
          )}
          {firstPerson && aim && aim !== "station" && (
            <div className={`aimtag ${aim}`}>
              {aim === "fire"
                ? "SMOTHER"
                : aim === "ticket"
                  ? "CALL"
                  : aim === "ready"
                    ? "COLLECT"
                    : aim === "held"
                      ? "INSPECT"
                      : aim === "cooking"
                        ? "FIRE"
                        : "FLAG THEM"}
            </div>
          )}
          {firstPerson && !locked && !paused && (
            <div className="lockhint">CLICK TO TAKE THE PASS</div>
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
          )}{" "}
          {firstPerson ? (
            <div className="hint">
              {atPass
                ? "Hold right mouse to look at the plate."
                : live.some((t) => t.state === "ready")
                  ? "A plate is up — aim at it and click."
                  : live.some((t) => t.state === "plating")
                    ? "Aim at the cooking dish and click to fire; wait for the gold."
                    : railAll.length > 0
                      ? "Aim at a docket on the rail and click."
                      : runner && !runner.fled
                        ? "Runner on the floor — H shoos them."
                        : request
                          ? `Table ${request.table} wants it ${request.mod} — D refuses.`
                          : sauce
                            ? "The sauce is splitting — M whisks it."
                            : serviceTime - breadAt >= 18
                              ? "G — bread service settles a hanging table."
                              : nextTicketIn > 6
                                ? "N — call the next order in early."
                                : !criticFlagged && serviceTime < 100
                                  ? "Spot the inspector — aim and click."
                                  : null}
            </div>
          ) : (
            (() => {
              // two hands, two problems: the top two live hints stack instead of
              // one evicting the other mid-rush
              const hints = [
                runner && !runner.fled && "Runner on the floor — SHOO HIM (H)!",
                request &&
                  `Table ${request.table} wants it ${request.mod} — D to refuse.`,
                sauce && "That sauce is splitting — WHISK it (M)!",
                !atPass &&
                  live.some((t) => t.state === "ready") &&
                  "A plate is up — F collects it.",
                live.some((t) => t.state === "plating") &&
                  "Plating… F fires it early — wait for the gold.",
                railAll.length > 0 &&
                  `Orders on the rail — keys 1–${Math.min(9, railAll.length)} call them in.`,
                serviceTime - breadAt >= 18 &&
                  "Bread service (G) — a basket settles the hanging table.",
                nextTicketIn > 6 &&
                  "Quiet pass — N waves the next order in early.",
                !criticFlagged &&
                  serviceTime < 100 &&
                  "Spot the inspector — click them.",
              ].filter((h): h is string => !!h);
              return hints.slice(0, 2).map((h) => (
                <div key={h} className="hint">
                  {h}
                </div>
              ));
            })()
          )}
          {railCards}
          {atPass && <PassPanel plate={atPass} firstPerson={firstPerson} />}
          <div className="house-left">
            <div className="status">
              NIGHT {career.night} ·{" "}
              <b>
                {Math.floor(serviceTime / 60)}:
                {String(Math.floor(serviceTime % 60)).padStart(2, "0")}
              </b>
              {amped && <span className="amped"> FIRED UP</span>}
              <br />
              SERVED <b>{served}</b> · BACK <b>{sentBack}</b> · SMASHED{" "}
              <b>{smashed}</b> · WALKED <b>{misses}</b>
              <br />
              EGO <b>{Math.round(ego)}</b> · {tierName(ego)}
              {streak >= 3 && <span className="amped"> · ×{streak}</span>}
              {(() => {
                if (streak < 3) return null;
                const best = legendsBest;
                if (best > 0 && streak > best)
                  return <span className="amped"> · NEW HOUSE BEST</span>;
                if (best >= 3)
                  return <span className="ghost-target"> · best ×{best}</span>;
                return null;
              })()}
              {screams === 0 ? (
                <span className="silent"> · SILENT</span>
              ) : (
                <>
                  {" "}
                  · <b>{screams}</b> SCREAMS
                </>
              )}
            </div>
            {served > 0 && (
              <div
                className="qmeter"
                title="Tonight's food average — 72 earns the second food star, 85 the third"
              >
                <span className="qmeter-label">TONIGHT</span>
                <div className="qmeter-track">
                  <div
                    className={`qmeter-fill ${avg >= 72 ? "good" : avg >= 58 ? "mid" : "low"}`}
                    style={{ width: `${Math.min(100, (avg / 100) * 100)}%` }}
                  />
                  <div className="qmeter-mark m58" />
                  <div className="qmeter-mark m72" />
                  <div className="qmeter-mark m85" />
                </div>
                <span className="qmeter-num">{Math.round(avg)}</span>
              </div>
            )}
            <Brigade />
            {/* first person shouts the newest line into the room instead */}
            {!firstPerson && <Ticker />}
          </div>
          <div className="house-actions">
            <StanceBar />
            <button
              className="btn scream"
              title="Hold Space to charge; costs morale"
              onClick={() => scream(1)}
            >
              SCREAM <span className="kbd">SPACE</span>{" "}
              <span className="cost">hold to charge · costs morale</span>
            </button>
            <button
              className="btn voice"
              title="Brigade voices + review read-out (U)"
              onClick={() => {
                const next = !voiceOn;
                setVoiceEnabled(next);
                setVoiceOn(next);
              }}
            >
              VOICE {voiceOn ? "ON" : "OFF"} <span className="kbd">U</span>
            </button>
            <button
              className="btn bread"
              title="£3 · the commis walks a basket to the hanging table"
              disabled={
                !!openingStep || career.cash < 3 || serviceTime - breadAt < 18
              }
              onClick={() => sendBread()}
            >
              BREAD <span className="kbd">G</span>{" "}
              <span className="cost">
                {career.cash < 3
                  ? "need £3"
                  : serviceTime - breadAt < 18
                    ? `basket out · ${Math.ceil(18 - (serviceTime - breadAt))}s`
                    : "£3 · the hanging table settles"}
              </span>
            </button>
            <button
              className={`btn expedite${career.night < 2 ? " locked" : ""}`}
              title="Wave the next order through — +2 station pressure"
              disabled={
                career.night < 2 ||
                !!openingStep ||
                nextTicketIn <= 0.5 ||
                live.length >= 9
              }
              onClick={() => expedite()}
            >
              NEXT <span className="kbd">N</span>{" "}
              {career.night < 2 ? (
                <span className="ntwo">NIGHT 2</span>
              ) : (
                <span className="cost">
                  {nextTicketIn > 0.5 ? `fire now · +2 pressure` : "printing…"}
                </span>
              )}
            </button>
            <button
              className={`btn comp${career.night < 2 ? " locked" : ""}`}
              title="£20 · the room exhales"
              disabled={career.night < 2 || comped || career.cash < 20}
              onClick={() => compTable()}
            >
              COMP <span className="kbd">C</span>{" "}
              {career.night < 2 ? (
                <span className="ntwo">NIGHT 2</span>
              ) : (
                <span className="cost">
                  £20
                  <span className="utility-explainer"> · the room exhales</span>
                </span>
              )}
            </button>
          </div>
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
