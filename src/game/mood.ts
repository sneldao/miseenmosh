/** The brigade's visible mood — the contract Dev 1 (body offsets) and
 * Dev 2 (glyph mount) build against. Pure derivation, no store access:
 * Dev 3 calls this in the tick and stores the result on `Cook.mood`
 * (transient — reset each night, never persisted).
 *
 * Five moods, one language across HUD word, ink glyph, body pose and
 * bark gate: CALM / FOCUSED / STRAINED / ANGRY / EDGE.
 * HUD mapping: sharp→FOCUSED · tired→STRAINED · dangerous→ANGRY ·
 * feral→EDGE · walked out→(hidden). */

export type Mood = "CALM" | "FOCUSED" | "STRAINED" | "ANGRY" | "EDGE";

/** What the simulation already knows about a cook. */
export interface MoodInputs {
  morale: number; // 0..100
  overloadT: number; // seconds spent drowning
  grudge: string | null;
  burning: boolean; // their station is on fire
  trauma: number; // nights spent broken
  walkedOut: boolean;
  working: boolean; // has a live plating ticket this tick
}

/** Transient event spikes, resolved to 0..1 strengths by the caller —
 * anger: a smash/send-back on their plate · panic: a fire beat ·
 * strain: a scream (whole brigade flinches) · relief: praise/honor.
 * Spikes decay over ~45 s of service time and are never saved. */
export interface MoodSpikes {
  anger: number;
  panic: number;
  strain: number;
  relief: number;
}

export const NO_SPIKES: MoodSpikes = { anger: 0, panic: 0, strain: 0, relief: 0 };

export function deriveMood(c: MoodInputs, sp: MoodSpikes = NO_SPIKES): Mood {
  if (c.walkedOut) return "CALM"; // gone is gone — consumers hide him anyway
  if (c.burning || sp.panic > 0 || c.morale < 25 || c.trauma >= 3) return "EDGE";
  if (sp.anger > 0 || c.morale < 45 || c.grudge) return "ANGRY";
  if (sp.strain > 0 || c.overloadT > 0 || c.morale < 70) return "STRAINED";
  return c.working || sp.relief > 0 ? "FOCUSED" : "CALM";
}
