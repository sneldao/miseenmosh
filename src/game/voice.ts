// Baked voice, no keys, no network. The ElevenLabs flagship (8–12 designed
// voices, review read-out) ships as generated audio when the pipeline lands;
// until then the brigade answers through the platform's own speech synth,
// which renders locally and keeps the offline review sandbox intact.
// Everything here is best-effort: no synth, no voices, no problem — the
// game never waits on a voice.

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

/** The brigade answers the scream — pitch varies so it never reads as one voice. */
export function speakChorus(line: string, over: boolean) {
  if (over) {
    say("...", { pitch: 0.6, rate: 0.9, seed: 7 });
    return;
  }
  const clean = line.replace(/[""]/g, "").slice(0, 40) || "Yes, chef!";
  say(clean, { pitch: 0.8 + Math.random() * 0.5, rate: 1.15, seed: Math.floor(Math.random() * 8) });
}

/** The review read-out: stars, then the quotable line. Biggest text first. */
export function speakReview(stars: number, quote: string) {
  const starLine = stars >= 5 ? "Five stars." : stars >= 4 ? "Four stars." : stars === 3 ? "Three stars." : stars === 2 ? "Two stars." : stars === 1 ? "One star." : "No stars.";
  say(`${starLine} ${quote.slice(0, 220)}`, { pitch: 0.9, rate: 1.0, seed: 3 });
}
