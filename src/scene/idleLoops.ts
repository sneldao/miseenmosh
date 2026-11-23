/** The actors never rest — the idle prep machinery every rigged body shares.
 *
 *  The pilots ship no idle clip: each cook owns one `Work` performance. So the
 *  idle loop is a **neutral window** cut out of that same clip, played slower,
 *  staggered per cook and blended at the seam. Which window is not a guess —
 *  `assets/meshy/probe-idle-windows.mjs` measures every candidate window on
 *  the shipped GLB and ranks it by four things that matter on screen:
 *
 *    seam     pose distance between window start and end (a pop is a bug)
 *    motion   how much moves inside the window (a freeze is a bug)
 *    neutral  distance from the clip's mean pose (counter stance, not a pose)
 *    handZ    forward hand reach (the plating read lives in the clip's reach —
 *             an idle window must never contain it)
 *
 *  Numbers below are that probe's output (see the devlog for the run). The
 *  contract from Dev 3 — `Mood`, `Cook.mood` and the idle SFX names — is
 *  consumed here, so bodies, glyph and HUD all speak one language.
 *
 *  Everything is deterministic: variant, tempo jitter, phase offset and which
 *  loop actually sounds are hashes of (cookId, loop index), never Math.random
 *  at frame time, so a paused or replayed service looks the same twice.
 */

import {
  AnimationClip,
  AnimationUtils,
  Euler,
  KeyframeTrack,
  Quaternion,
  type AnimationAction,
  type Bone,
  type Interpolant,
} from "three";
import type { Mood } from "../game/mood";
import type { Sfx } from "../game/sound";

/** One audible beat inside a loop, at a fraction of the loop (0..1). */
export interface IdleBeat {
  at: number;
  sound: Sfx;
  vol: number;
}

/** An alternate idle loop: a window of a source clip plus its tempo. */
export interface IdleVariant {
  /** stable id — also the built clip's action name */
  id: string;
  /** clip in the GLB the window is cut from */
  source: string;
  start: number;
  len: number;
  /** idle plays slower than the work pass, so prep reads as background work */
  tempo: number;
  beats: IdleBeat[];
}

/** Cook ids as used by `Cook.id` / the scene (0 Petra, 1 Dimitri, 2 Anwar). */
export const IDLE_VARIANTS: Record<number, IdleVariant[]> = {
  // Petra (grill): two windows that stay off the presenting reach — she is
  // benching, not plating. Knife work on the board is her between-ticket read.
  0: [
    {
      id: "Idle0a",
      source: "PetraWork",
      start: 3.8,
      len: 2.0,
      tempo: 0.82,
      beats: [
        { at: 0.14, sound: "knife", vol: 0.6 },
        { at: 0.62, sound: "boardTap", vol: 0.55 },
      ],
    },
    {
      id: "Idle0b",
      source: "PetraWork",
      start: 1.2,
      len: 2.0,
      tempo: 0.76,
      beats: [
        { at: 0.28, sound: "knife", vol: 0.55 },
        { at: 0.71, sound: "knife", vol: 0.45 },
      ],
    },
  ],
  // Dimitri (sauce): spoon against the pot rim, relentless but low.
  1: [
    {
      id: "Idle1a",
      source: "Work",
      start: 1.3,
      len: 1.4,
      tempo: 0.8,
      beats: [
        { at: 0.19, sound: "boardTap", vol: 0.5 },
        { at: 0.68, sound: "boardTap", vol: 0.4 },
      ],
    },
    {
      id: "Idle1b",
      source: "Work",
      start: 0.8,
      len: 1.2,
      tempo: 0.74,
      beats: [{ at: 0.45, sound: "boardTap", vol: 0.5 }],
    },
  ],
  // Anwar (pastry): bench work, one tap per loop — the quietest station.
  2: [
    {
      id: "Idle2a",
      source: "Work",
      start: 0.7,
      len: 1.2,
      tempo: 0.78,
      beats: [{ at: 0.33, sound: "boardTap", vol: 0.45 }],
    },
    {
      id: "Idle2b",
      source: "Work",
      start: 0.2,
      len: 1.6,
      tempo: 0.72,
      beats: [
        { at: 0.22, sound: "boardTap", vol: 0.4 },
        { at: 0.77, sound: "knife", vol: 0.4 },
      ],
    },
  ],
};

/** Seam blend length, seconds. The probe's best seams already read clean
 *  (~0.4-0.8 summed radians across 65 bones ≈ 3-5° per bone); the blend makes
 *  the wrap exactly continuous so a slow scan for a pop finds nothing. */
export const SEAM_BLEND = 0.2;

const FPS = 30;

/** `createInterpolant` exists on every track at runtime but is missing from
 *  the shipped types — one narrow cast, kept here instead of at call sites. */
function interpolantOf(track: KeyframeTrack): Interpolant {
  return (track as unknown as { createInterpolant(): Interpolant }).createInterpolant();
}

function evaluate(track: KeyframeTrack, t: number): Float32Array {
  return interpolantOf(track).evaluate(t) as Float32Array;
}

/** deterministic 0..1 from three integers — no Math.random at frame time */
export function hash01(a: number, b: number, c = 0): number {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x2545f491, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Blend a clip's opening into its own ending so the loop wrap is continuous:
 *  value(0) becomes value(duration) over the first `blend` seconds, which
 *  makes the pose at t=0 identical to the pose at t=duration. Quaternion
 *  tracks slerp, everything else lerps. */
export function wrapBlend(clip: AnimationClip, blend = SEAM_BLEND, fps = FPS): AnimationClip {
  if (blend <= 0 || clip.duration <= blend * 2) return clip;
  const steps = Math.max(2, Math.round(clip.duration * fps));
  const times = new Float32Array(steps + 1);
  for (let i = 0; i <= steps; i++) times[i] = (clip.duration * i) / steps;
  const endPose = clip.tracks.map((track) => Array.from(evaluate(track, clip.duration)));
  const tracks = clip.tracks.map((track, ti) => {
    const stride = track.getValueSize();
    const values = new Float32Array((steps + 1) * stride);
    const end = endPose[ti];
    for (let i = 0; i <= steps; i++) {
      const t = times[i];
      const raw = evaluate(track, t);
      const w = t >= blend ? 0 : 1 - t / blend; // 1 at the seam, 0 after `blend`
      if (stride === 4) {
        // quaternions take the short way round, and land exactly on the end
        // pose at w = 1 — that is what closes the loop
        Quaternion.slerpFlat(
          values as unknown as number[],
          i * stride,
          raw as unknown as number[],
          0,
          end,
          0,
          w
        );
        continue;
      }
      for (let c = 0; c < stride; c++) {
        values[i * stride + c] = raw[c] + (end[c] - raw[c]) * w;
      }
    }
    const ctor = track.constructor as new (name: string, times: number[], values: number[]) => KeyframeTrack;
    return new ctor(track.name, Array.from(times), Array.from(values));
  });
  const out = new AnimationClip(clip.name, clip.duration, tracks);
  out.blendMode = clip.blendMode;
  return out;
}

/** Cut each variant's window out of its source clip and close the loop. */
export function buildIdleClips(sources: Map<string, AnimationClip>, cookId: number): AnimationClip[] {
  const variants = IDLE_VARIANTS[cookId] ?? [];
  const out: AnimationClip[] = [];
  for (const v of variants) {
    const src = sources.get(v.source);
    if (!src) continue; // a body missing its source clip simply gets no idle
    const from = Math.round(v.start * FPS);
    const to = Math.round((v.start + v.len) * FPS);
    const sub = AnimationUtils.subclip(src, v.id, from, to, FPS);
    // a clip whose keys all fall outside the window would build a dead
    // action and hang the body on its bind pose — ship no idle instead
    if (!(sub.duration > 0.2) || sub.tracks.length === 0) continue;
    out.push(wrapBlend(sub, SEAM_BLEND));
  }
  return out;
}

/** Playing rate for a loop: the variant's own tempo, jittered per loop so the
 *  cook never repeats at a metronome cadence, keyed by mood. */
export function idleRate(cookId: number, variant: IdleVariant, loop: number, mood: Mood | undefined): number {
  const jitter = 0.94 + hash01(cookId, loop, 11) * 0.12; // 0.94 .. 1.06
  return variant.tempo * jitter * moodPose(mood).idleRate;
}

/** Seconds into the loop this cook starts at, so no two bodies are in step. */
export function idlePhase(cookId: number, variant: IdleVariant, loop: number): number {
  return hash01(cookId, loop, 29) * variant.len;
}

/** A beat only sounds on ~3 loops in 4 — a perfectly repeating tap is the
 *  same failure as a perfectly repeating loop. */
const BEAT_DENSITY = 0.75;

/** shared empty result — a beat-less frame allocates nothing */
const NO_BEATS: IdleBeat[] = [];

export interface BeatClock {
  variant: IdleVariant;
  /** loops completed */
  loop: number;
  /** seconds into the current loop */
  t: number;
  /** advance by dt at `rate`; returns the beats crossed, in order */
  advance(dt: number, rate: number, cookId: number): IdleBeat[];
  reset(): void;
}

export function makeBeatClock(variant: IdleVariant, cookId: number, startAt = 0): BeatClock {
  const clock: BeatClock = {
    variant,
    loop: 0,
    t: startAt % variant.len,
    advance(dt, rate, id) {
      const step = Math.max(0, Math.min(0.25, dt)) * Math.max(0, rate);
      if (step <= 0) return NO_BEATS;
      let fired: IdleBeat[] | null = null;
      const before = this.t;
      this.t += step;
      const wrapped = this.t >= this.variant.len;
      for (let i = 0; i < this.variant.beats.length; i++) {
        const b = this.variant.beats[i];
        const at = b.at * this.variant.len;
        const crossed = wrapped ? at >= before || at < this.t - this.variant.len : at >= before && at < this.t;
        if (!crossed) continue;
        if (hash01(id, this.loop, i + 3) > BEAT_DENSITY) continue;
        (fired ??= []).push(b);
      }
      if (wrapped) {
        this.t -= this.variant.len;
        this.loop += 1;
      }
      return fired ?? NO_BEATS;
    },
    reset() {
      this.t = 0;
      this.loop = 0;
    },
  };
  return clock;
}

/** The whole idle state for one body: which window is playing, where in it we
 *  are, and which beats sound. The scene file only feeds it the frame delta
 *  and crossfades when `changed` says the window swapped.
 *
 *  No allocation in steady state: one clock for the body's lifetime, and a
 *  beat-less frame returns the shared empty array. */
export interface IdleDrive {
  /** the window that should be playing right now */
  readonly variant: IdleVariant;
  /** seconds into the window */
  readonly t: number;
  /** loops completed since the drive was made */
  readonly loop: number;
  /** true on the frame the window swapped — crossfade to `variant.id` */
  readonly changed: boolean;
  /** advance one frame; returns the beats to sound this frame (may be empty) */
  step(cookId: number, dt: number, mood: Mood | undefined, playing: boolean): IdleBeat[];
  /** rewind to a fresh window (new night, pause/resume, back from work) */
  restart(cookId: number, mood: Mood | undefined, loop?: number): void;
}

export function makeIdleDrive(cookId: number, mood: Mood | undefined, startLoop = 0): IdleDrive | null {
  const variants = IDLE_VARIANTS[cookId];
  if (!variants || variants.length === 0) return null;
  const first = pickVariant(cookId, variants, startLoop, mood);
  const clock = makeBeatClock(first, cookId, idlePhase(cookId, first, startLoop));
  clock.loop = startLoop;
  const drive: IdleDrive = {
    get variant() {
      return clock.variant;
    },
    get t() {
      return clock.t;
    },
    get loop() {
      return clock.loop;
    },
    changed: false,
    step(id, dt, m, playing) {
      (drive as { changed: boolean }).changed = false;
      if (!playing || dt <= 0) return NO_BEATS;
      const before = clock.loop;
      const beats = clock.advance(dt, idleRate(id, clock.variant, before, m), id);
      if (clock.loop !== before) {
        const next = pickVariant(id, IDLE_VARIANTS[id], clock.loop, m);
        if (next !== clock.variant) {
          clock.variant = next;
          clock.t = clock.t % next.len;
          (drive as { changed: boolean }).changed = true;
        }
      }
      return beats;
    },
    restart(id, m, loop = 0) {
      const v = pickVariant(id, IDLE_VARIANTS[id], loop, m);
      clock.variant = v;
      clock.loop = loop;
      clock.t = idlePhase(id, v, loop);
      (drive as { changed: boolean }).changed = true;
    },
  };
  return drive;
}

/** Pick the variant for this stretch of idle time: alternates per loop, with
 *  a mood tilt — a straining cook drifts to the slower window. */
export function pickVariant(cookId: number, variants: IdleVariant[], loop: number, mood: Mood | undefined): IdleVariant {
  if (variants.length === 1) return variants[0];
  if (mood === "STRAINED" || mood === "EDGE") {
    return [...variants].sort((a, b) => a.tempo - b.tempo)[loop % 2];
  }
  const jump = hash01(cookId, loop, 5) < 0.5 ? 0 : 1;
  return variants[(loop + jump) % variants.length];
}

// ---------------------------------------------------------------------------
// The body carries the mood — additive bone offsets, the same mechanism gaze
// already uses. Derived from Dev 3's `Cook.mood`, never from a meter.
// ---------------------------------------------------------------------------

export interface MoodPose {
  /** forward/down bend on the spine, radians (+ = slumped) */
  slump: number;
  /** chest lifted, shoulders set, radians (+ = braced) */
  brace: number;
  /** fast small shake amplitude, radians */
  tremble: number;
  trembleHz: number;
  /** breathing rate multiplier */
  breathRate: number;
  /** breathing depth multiplier */
  breathAmp: number;
  /** idle loop tempo multiplier */
  idleRate: number;
  /** work-clip tempo multiplier */
  workRate: number;
  /** left hand drawn to the hip — the EDGE silhouette (0..1) */
  handHip: number;
}

const POSE: Record<Mood, MoodPose> = {
  // CALM is the baseline breathing body — nothing added, nothing taken.
  CALM: { slump: 0, brace: 0, tremble: 0, trembleHz: 0, breathRate: 1, breathAmp: 1, idleRate: 0.95, workRate: 1, handHip: 0 },
  // FOCUSED leans in a touch and breathes quicker: working, not suffering.
  FOCUSED: { slump: 0.02, brace: 0, tremble: 0, trembleHz: 0, breathRate: 1.12, breathAmp: 1, idleRate: 1.02, workRate: 1.04, handHip: 0 },
  // STRAINED slumps and breathes hard — the drowning read.
  STRAINED: { slump: 0.11, brace: 0, tremble: 0, trembleHz: 0, breathRate: 1.5, breathAmp: 1.5, idleRate: 0.88, workRate: 0.94, handHip: 0 },
  // ANGRY braces and speeds up — chest up, shoulders set, no shake.
  ANGRY: { slump: -0.03, brace: 0.1, tremble: 0, trembleHz: 0, breathRate: 1.7, breathAmp: 1.6, idleRate: 1.12, workRate: 1.12, handHip: 0 },
  // EDGE braces AND trembles, hand on the hip, everything at tempo: the
  // silhouette is "shaking and set", which is why it never blurs with ANGRY.
  EDGE: { slump: 0.02, brace: 0.13, tremble: 0.014, trembleHz: 6.5, breathRate: 2.1, breathAmp: 1.8, idleRate: 1.22, workRate: 1.1, handHip: 1 },
};

/** QA affordance: `?mood=EDGE` forces the body pose so every state can be
 *  compared in the browser without waiting for a night to go wrong (Dev 2 can
 *  use it for the glyph mount too). Compiled out of production builds. */
const DEV_MOOD: Mood | null = (() => {
  if (!import.meta.env?.DEV) return null;
  try {
    const q = new URLSearchParams(location.search).get("mood")?.toUpperCase();
    return q && q in POSE ? (q as Mood) : null;
  } catch {
    return null;
  }
})();

export function moodPose(mood: Mood | undefined): MoodPose {
  return POSE[DEV_MOOD ?? mood ?? "CALM"];
}

const _e = new Euler();
const _q = new Quaternion();

/** Add the mood offsets on top of whatever the mixer just wrote. Called after
 *  `mixer.update`, so the clip's own pose is the base every frame and the
 *  offsets cannot accrue. `reduced` (reduced motion) drops all of it. */
export function applyMoodPose(
  bones: { spine1?: Bone | null; spine2?: Bone | null; leftArm?: Bone | null },
  pose: MoodPose,
  t: number,
  reduced = false
): void {
  if (reduced) return;
  const tr = pose.tremble ? Math.sin(t * pose.trembleHz * Math.PI * 2) * pose.tremble : 0;
  if (bones.spine1) {
    _q.setFromEuler(_e.set(pose.slump + tr * 0.5, 0, tr));
    bones.spine1.quaternion.multiply(_q);
  }
  if (bones.spine2) {
    _q.setFromEuler(_e.set(-pose.brace * 0.6 + tr * 0.8, 0, -tr * 0.6));
    bones.spine2.quaternion.multiply(_q);
  }
  if (pose.handHip > 0 && bones.leftArm) {
    // elbow out, hand down at the waist — one arm, so the silhouette stays
    // "set and shaking" rather than folded
    _q.setFromEuler(_e.set(0.12 * pose.handHip, 0, -0.75 * pose.handHip + tr * 2));
    bones.leftArm.quaternion.multiply(_q);
  }
}

/** Procedural standby life for the rigs that have no gesture to subclip (the
 *  commis and the porter): a slow weight shift, a breath, a shoulder settle.
 *  Real bones, tiny angles, and nothing at all under reduced motion — the
 *  plan's "micro-actions are bone-offset sway, not new gestures". */
export function applyStandbySway(
  bones: { spine1?: Bone | null; spine2?: Bone | null },
  t: number,
  seed: number,
  reduced = false
): void {
  if (reduced) return;
  const shift = Math.sin(t * 0.52 + seed * 1.7); // weight from foot to foot, ~12 s
  const settle = Math.sin(t * 1.15 + seed * 0.9); // shoulder settle, faster
  if (bones.spine1) {
    _q.setFromEuler(_e.set(0.014 * settle, 0, 0.022 * shift));
    bones.spine1.quaternion.multiply(_q);
  }
  if (bones.spine2) {
    _q.setFromEuler(_e.set(0, 0.03 * shift, -0.016 * shift));
    bones.spine2.quaternion.multiply(_q);
  }
}

/** Breathing is absolute from the bind scale (never accumulated), and the
 *  mood sets both its rate and its depth. */
export function breathAt(t: number, cookId: number, pose: MoodPose, working: boolean, reduced: boolean): number {
  if (reduced) return 0;
  const workingDamp = working ? 0.35 : 1; // a plating cook's chest is busy already
  return Math.sin(t * 1.6 * pose.breathRate + cookId * 2.1) * 0.003 * pose.breathAmp * workingDamp;
}

/** Mood compounds the ticket's own timing: an ANGRY cook works 12% faster and
 *  holds the finished plate a beat, an EDGE one 10%. The rate is bounded into
 *  [1, 1.2] on purpose — slower than the ticket would cut the performance off
 *  mid-return (the "one whole performance" rule), and faster than 1.2 would
 *  park him on the last frame for a fifth of the ticket. STRAINED therefore
 *  reads through the slump and the breathing, not through slow work. */
export function workTimeScale(plateDur: number, clipDur: number, mood: Mood | undefined): number {
  const rate = Math.min(1.2, Math.max(1, moodPose(mood).workRate));
  return (clipDur / Math.max(0.1, plateDur)) * rate;
}

/** Convenience for a scene file: the action to play for this idle state. */
export function idleAction(actions: Map<string, AnimationAction>, variant: IdleVariant): AnimationAction | undefined {
  return actions.get(variant.id);
}
