// Baked voice, no keys, no network. The brigade chorus is generated audio
// (fal Kokoro → assets/voice/bake.mjs → public/voice/*.mp3) shipped in the
// bundle; the review read-out stays on the platform's own speech synth
// because its text is dynamic. Everything here is best-effort: no synth,
// no files, no voices, no problem — the game never waits on a voice.

import { BRIGADE_RESPONSES } from "./barks";

const VOICE_KEY = "mem-voice";

let enabled = true;
try {
  enabled = localStorage.getItem(VOICE_KEY) !== "off";
} catch {
  /* private mode — voice just stays on */
}

export function voiceEnabled(): boolean {
  return enabled;
}

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {}
  if (!on) stopVoice();
}

function synth(): SpeechSynthesis | null {
  if (!enabled) return null;
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    return window.speechSynthesis;
  } catch {
    return null;
  }
}

export function stopVoice() {
  try {
    synth()?.cancel();
  } catch {}
  for (const a of Object.values(baked)) {
    try {
      a.pause();
    } catch {}
  }
}

/** Baked chorus takes — one mp3 per BRIGADE_RESPONSES entry, mixed from
 *  per-cook fal stems. A file that 404s or won't decode marks itself dead
 *  and we fall back to the synth forever after. */
const baked: Record<number, HTMLAudioElement> = {};
const bakedDead = new Set<number>();

function playBaked(idx: number): boolean {
  if (!enabled || bakedDead.has(idx)) return false;
  try {
    let a = baked[idx];
    if (!a) {
      a = new Audio(`${import.meta.env.BASE_URL}voice/chorus-${idx}.mp3`);
      a.preload = "auto";
      a.addEventListener("error", () => bakedDead.add(idx));
      baked[idx] = a;
    }
    a.currentTime = 0;
    void a.play().catch(() => {});
    return true;
  } catch {
    bakedDead.add(idx);
    return false;
  }
}

/** Pick a roughly-local voice so the read-out works in the offline sandbox. */
function pickVoice(s: SpeechSynthesis, seed: number): SpeechSynthesisVoice | null {
  try {
    const vs = s.getVoices();
    if (!vs.length) return null;
    const local = vs.filter((v) => v.localService);
    const pool = local.length ? local : vs;
    return pool[seed % pool.length] ?? null;
  } catch {
    return null;
  }
}

function say(text: string, opts: { pitch?: number; rate?: number; seed?: number } = {}) {
  const s = synth();
  if (!s) return;
  try {
    // one line at a time — the pass talks over itself otherwise
    if (s.speaking) s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(s, opts.seed ?? 0);
    if (v) u.voice = v;
    u.pitch = opts.pitch ?? 1;
    u.rate = opts.rate ?? 1.05;
    u.volume = 0.9;
    s.speak(u);
  } catch {
    /* voice is texture, never load-bearing */
  }
}

// Prime the voice list after the first gesture (some browsers load async).
try {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
  }
} catch {}

/** The brigade answers the scream — baked ensemble takes first, the
 *  platform synth behind them if a take is missing. */
export function speakChorus(line: string, over: boolean) {
  if (over) {
    say("...", { pitch: 0.6, rate: 0.9, seed: 7 });
    return;
  }
  const idx = BRIGADE_RESPONSES.indexOf(line);
  if (idx >= 0 && playBaked(idx)) return;
  const clean = line.replace(/[""]/g, "").slice(0, 40) || "Yes, chef!";
  say(clean, { pitch: 0.8 + Math.random() * 0.5, rate: 1.15, seed: Math.floor(Math.random() * 8) });
}

/** The review read-out: stars, then the quotable line. Biggest text first. */
export function speakReview(stars: number, quote: string) {
  const starLine = stars >= 5 ? "Five stars." : stars >= 4 ? "Four stars." : stars === 3 ? "Three stars." : stars === 2 ? "Two stars." : stars === 1 ? "One star." : "No stars.";
  say(`${starLine} ${quote.slice(0, 220)}`, { pitch: 0.9, rate: 1.0, seed: 3 });
}
