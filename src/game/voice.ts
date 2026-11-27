// Baked voice, no keys, no network. The brigade chorus is generated audio
// (fal Kokoro → assets/voice/bake.mjs → public/voice/*.mp3) shipped in the
// bundle; the review read-out stays on the platform's own speech synth
// because its text is dynamic. Everything here is best-effort: no synth,
// no files, no voices, no problem — the game never waits on a voice.

import { BRIGADE_RESPONSES } from "./barks";
import { audioContext, duckAmbience, isMasterMuted, voiceOutput } from "./sound";

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
  if (!enabled || isMasterMuted()) return null;
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    return window.speechSynthesis;
  } catch {
    return null;
  }
}

export function stopVoice() {
  if (reviewTimer !== null && typeof window !== "undefined") window.clearTimeout(reviewTimer);
  reviewTimer = null;
  try {
    // Cancel even while disabled/muted; synth() deliberately refuses then.
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {}
  for (const v of Object.values(baked)) {
    try {
      v.el.pause();
    } catch {}
  }
}

/** Baked chorus takes — one mp3 per BRIGADE_RESPONSES entry, mixed from
 *  per-cook fal stems. A file that 404s or won't decode marks itself dead
 *  and we fall back to the synth forever after. Playback is routed through
 *  the WebAudio voice bus where possible, so host mute and the mix apply. */
interface BakedVoice {
  el: HTMLAudioElement;
  routed: boolean;
  src?: MediaElementAudioSourceNode;
}

const baked: Record<number, BakedVoice> = {};
const bakedDead = new Set<number>();
const namedBaked: Record<string, BakedVoice> = {};
const namedDead = new Set<string>();
let lastBakedFailure: string | null = null;

/** Small meter/debug surface for browser QA; never used by gameplay. */
export function voiceDiagnostics() {
  return { enabled, bakedLoaded: Object.keys(baked).length + Object.keys(namedBaked).length, bakedDead: [...bakedDead, ...namedDead], lastBakedFailure };
}

function routeBaked(v: BakedVoice) {
  if (v.routed) return;
  const ac = audioContext();
  const out = voiceOutput();
  if (!ac || !out) return;
  try {
    const src = ac.createMediaElementSource(v.el);
    src.connect(out);
    v.src = src;
    v.routed = true;
  } catch {
    // A browser that refuses media-element routing still gets the direct tag.
  }
}

function playBaked(idx: number): boolean {
  return playBakedFile(`voice/chorus-${idx}.mp3`, `dead-${idx}`, (v) => { baked[idx] = v; });
}

/** Named hinge takes — Petra's opening verdicts and house-rule lines, baked
 *  by scripts/elevenlabs-bake.mjs. A missing file marks itself dead and the
 *  synth takes the line, exactly like the chorus. */
const NAMED: Record<string, string> = {
  "You saw it. You sent it anyway. I heard you.": "voice/petra-opening-serve.mp3",
  "Dark pastry. Grey centre. You saw it. Back to me.": "voice/petra-opening-sendback.mp3",
  "You saw it. Then you chose the tiles. So did I.": "voice/petra-opening-smash.mp3",
  "Double shift. Bring a broom.": "voice/petra-rule-double.mp3",
  "No bin. Cook everything.": "voice/petra-rule-nobin.mp3",
  "Short fuse. Move.": "voice/petra-rule-shortfuse.mp3",
  "Play it straight. Good.": "voice/petra-rule-none.mp3",
};

function playBakedByName(key: string): boolean {
  const file = NAMED[key];
  if (!file) return false;
  return playBakedFile(file, `dead-${key}`, (v) => { namedBaked[key] = v; });
}

function playBakedFile(file: string, deadKey: string, cache: (v: BakedVoice) => void): boolean {
  if (!enabled || isMasterMuted() || namedDead.has(deadKey)) {
    lastBakedFailure = !enabled ? "voice-disabled" : isMasterMuted() ? "master-muted" : deadKey;
    return false;
  }
  const ac = audioContext();
  if (!ac) {
    lastBakedFailure = "no-audio-context";
    return false;
  }
  if (ac.state === "suspended") void ac.resume();
  try {
    let v = namedBaked[file] ?? Object.values(baked).find((b) => b.el.src.endsWith(file));
    if (!v) {
      const el = new Audio(`${import.meta.env.BASE_URL}${file}`);
      el.preload = "auto";
      v = { el, routed: false };
      el.addEventListener("error", () => namedDead.add(deadKey));
      cache(v);
    }
    routeBaked(v);
    v.el.currentTime = 0;
    const dur = Number.isFinite(v.el.duration) && v.el.duration > 0 ? v.el.duration : 1.65;
    duckAmbience(dur + 0.35);
    void v.el.play().catch(() => {});
    lastBakedFailure = null;
    return true;
  } catch (err) {
    lastBakedFailure = err instanceof Error ? err.message : "playback-error";
    namedDead.add(deadKey);
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
    duckAmbience(Math.min(4, 0.8 + text.length / 16));
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

/** One scripted line in a cook's voice — hinge moments only (first plate,
 *  house rule), never the running commentary. Best-effort like the rest. */
export function speakLine(text: string, seed = 1) {
  if (playBakedByName(text.trim())) return;
  say(text.slice(0, 140), { pitch: 0.9, rate: 1.0, seed });
}

let reviewTimer: number | null = null;

/** The review read-out: a beat after the sting, then stars and the quotable
 *  line. Slower and lower than the brigade so the critic owns the room. */
export function speakReview(stars: number, quote: string) {
  const starLine = stars >= 5 ? "Five stars." : stars >= 4 ? "Four stars." : stars === 3 ? "Three stars." : stars === 2 ? "Two stars." : stars === 1 ? "One star." : "No stars.";
  const text = `${starLine} ${quote.slice(0, 220)}`;
  if (reviewTimer !== null && typeof window !== "undefined") window.clearTimeout(reviewTimer);
  if (typeof window === "undefined") {
    say(text, { pitch: 0.86, rate: 0.96, seed: 3 });
    return;
  }
  reviewTimer = window.setTimeout(() => {
    reviewTimer = null;
    say(text, { pitch: 0.86, rate: 0.96, seed: 3 });
  }, 430);
}
