// Tiny synth SFX — zero assets, everything baked. ctx unlocks on the
// first user gesture (BEGIN SERVICE / keypress).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambienceBus: GainNode | null = null;
let voiceBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let masterMuted = false;

// Vertical-slice mix hierarchy. Master stays conservative; the buses put
// voice and playable consequences ahead of the room beds.
const MASTER_GAIN = 0.24;
const SFX_GAIN = 0.9;
const AMBIENCE_GAIN = 0.78;
const VOICE_GAIN = 1.0;

/** Host mute (OpenGame page): silence the master bus, keep the graph. */
export function setMasterMuted(muted: boolean) {
  masterMuted = muted;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.02);
  if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function isMasterMuted(): boolean {
  return masterMuted;
}

export function audioContext(): AudioContext | null {
  return ctx;
}

/** Input for recorded brigade voice, already downstream of master/mute. */
export function voiceOutput(): GainNode | null {
  return voiceBus;
}

/** Give a spoken line the front of the room for its duration. */
export function duckAmbience(seconds = 1.8) {
  if (!ctx || !ambienceBus) return;
  const now = ctx.currentTime;
  const g = ambienceBus.gain;
  g.cancelScheduledValues(now);
  g.setTargetAtTime(AMBIENCE_GAIN * 0.32, now, 0.045);
  g.setTargetAtTime(AMBIENCE_GAIN, now + Math.max(0.4, seconds), 0.35);
  // the band steps back when the brigade talks, too
  if (musicBus) {
    const m = musicBus.gain;
    m.cancelScheduledValues(now);
    m.setTargetAtTime(MUSIC_GAIN * 0.4, now, 0.05);
    m.setTargetAtTime(musicLevel, now + Math.max(0.4, seconds), 0.4);
  }
}

export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = masterMuted ? 0 : MASTER_GAIN;
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_GAIN;
    sfxBus.connect(master);

    ambienceBus = ctx.createGain();
    ambienceBus.gain.value = AMBIENCE_GAIN;
    ambienceBus.connect(master);

    voiceBus = ctx.createGain();
    voiceBus.gain.value = VOICE_GAIN;
    voiceBus.connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

function env(g: GainNode, t: number, a: number, d: number, peak = 1) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.001, t + a + d);
}

function osc(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak = 1, dest?: AudioNode) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, 0.005, dur, peak);
  o.connect(g).connect(dest ?? master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t: number, dur: number, peak = 1, hp = 0, dest?: AudioNode) {
  const len = Math.ceil(ctx!.sampleRate * dur);
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  const g = ctx!.createGain();
  env(g, t, 0.003, dur, peak);
  let node: AudioNode = src;
  if (hp) {
    const f = ctx!.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    src.connect(f);
    node = f;
  }
  node.connect(g).connect(dest ?? master!);
  src.start(t);
  src.stop(t + dur);
}

export type Sfx =
  | "print"
  | "bell"
  | "slam"
  | "pass"
  | "rip"
  | "shatter"
  | "gasp"
  | "sting"
  | "chorus"
  | "review"
  | "flash"
  | "applause"
  | "hiss"
  | "sear"
  | "whisk"
  | "hush"
  | "rattle"
  | "step"
  | "clatter"
  | "splash"
  | "knife"
  | "chop"
  | "boardTap";

export interface SfxOpts {
  /** -1 (far left, grill) .. +1 (far right, pastry) */
  pan?: number;
  vol?: number;
}

/** Route a one-shot through a panner so the room has a left and a right. */
function out(pan = 0, vol = 1): GainNode {
  const g = ctx!.createGain();
  g.gain.value = vol;
  const p = ctx!.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p).connect(sfxBus!);
  return g;
}

export function sfx(kind: Sfx, opts: SfxOpts = {}) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.01;
  const bus = out(opts.pan ?? 0, opts.vol ?? 1);
  switch (kind) {
    case "print":
      noise(t, 0.05, 0.5, 3000, bus);
      osc("square", 1200, 900, t + 0.02, 0.05, 0.2, bus);
      break;
    case "bell":
      osc("sine", 1560, 1560, t, 0.3, 0.28, bus);
      osc("sine", 2340, 2340, t, 0.2, 0.1, bus);
      break;
    case "slam":
      osc("sine", 160, 60, t, 0.12, 0.9, bus);
      noise(t, 0.04, 0.3, 800, bus);
      break;
    case "pass":
      // a clean plate leaves the kitchen — a rising third, the room notices
      osc("triangle", 660, 660, t, 0.16, 0.2, bus);
      osc("triangle", 831, 831, t + 0.08, 0.2, 0.2, bus);
      osc("sine", 1662, 1662, t + 0.08, 0.16, 0.07, bus);
      break;
    case "rip":
      noise(t, 0.18, 0.5, 1500, bus);
      break;
    case "shatter":
      noise(t, 0.22, 0.8, 2500, bus);
      osc("triangle", 2400, 1400, t, 0.12, 0.25, bus);
      osc("triangle", 3100, 2000, t + 0.03, 0.1, 0.15, bus);
      break;
    case "gasp":
      noise(t, 0.4, 0.35, 400, bus);
      osc("sawtooth", 300, 160, t, 0.35, 0.12, bus);
      break;
    case "sting":
      [110, 138.6, 164.8].forEach((f, i) => osc("sawtooth", f, f * 0.99, t + i * 0.02, 0.8, 0.16, bus));
      break;
    case "chorus":
      [660, 660, 880].forEach((f, i) => osc("square", f, f, t + i * 0.09, 0.07, 0.16, bus));
      break;
    case "review":
      [523, 659, 784, 1047].forEach((f, i) => osc("triangle", f, f, t + i * 0.12, 0.25, 0.2, bus));
      break;
    case "flash":
      // a phone camera: blip + tiny shutter click
      osc("sine", 2400, 2400, t, 0.05, 0.3, bus);
      noise(t + 0.05, 0.03, 0.4, 4000, bus);
      break;
    case "applause":
      // sizzling applause: a handful of filtered claps
      for (let i = 0; i < 7; i++) noise(t + i * 0.07, 0.05, 0.35, 1800, bus);
      break;
    case "hiss":
      // steam escaping before the grease goes up
      noise(t, 0.7, 0.4, 5000, bus);
      break;
    case "sear":
      // the kiss of the pan: a sizzle pop with a high singing edge
      noise(t, 0.25, 0.5, 4500, bus);
      osc("sine", 1900, 2600, t, 0.18, 0.15, bus);
      break;
    case "whisk":
      // three fast stirs and a save: wire whisk on steel
      for (let i = 0; i < 3; i++) noise(t + i * 0.06, 0.05, 0.4, 3200, bus);
      osc("sine", 2400, 3200, t + 0.18, 0.12, 0.12, bus);
      break;
    case "hush":
      // wonder needs no urgency: dip the master for half a second, then let it back
      if (master) {
        const m = master.gain;
        m.cancelScheduledValues(t);
        m.setValueAtTime(Math.max(0.02, m.value), t);
        m.linearRampToValueAtTime(0.04, t + 0.08);
        m.linearRampToValueAtTime(masterMuted ? 0 : MASTER_GAIN, t + 0.6);
      }
      break;
    case "rattle":
      // 101's wobble: low ceramic chatter, twice
      noise(t, 0.06, 0.4, 900, bus);
      noise(t + 0.09, 0.05, 0.32, 800, bus);
      osc("sine", 220, 180, t, 0.08, 0.12, bus);
      break;
    case "step":
      // a shoe on tile — quiet, meant to be heard in sequence
      noise(t, 0.04, 0.2, 700, bus);
      osc("sine", 150, 95, t, 0.06, 0.13, bus);
      break;
    case "clatter":
      // crockery grabbed in a hurry: two ticks and a faint ring
      noise(t, 0.03, 0.35, 2800, bus);
      noise(t + 0.045, 0.03, 0.26, 2400, bus);
      osc("triangle", 1900, 1500, t, 0.09, 0.1, bus);
      break;
    case "splash":
      // plates dumped at wash-up: plunging tone under broadband hiss
      noise(t, 0.35, 0.4, 1200, bus);
      osc("sine", 600, 170, t, 0.3, 0.12, bus);
      noise(t + 0.12, 0.15, 0.22, 2000, bus);
      break;
    case "knife":
      // steel on the board: a bright ting with the cut's tick
      osc("triangle", 3000, 2300, t, 0.05, 0.22, bus);
      noise(t, 0.025, 0.18, 3500, bus);
      break;
    case "chop":
      // the board takes the blow: dull knock under a soft scuff
      osc("sine", 190, 105, t, 0.07, 0.3, bus);
      noise(t, 0.03, 0.22, 600, bus);
      break;
    case "boardTap":
      // a wooden tap — mise en place punctuation, quieter than a chop
      osc("sine", 340, 210, t, 0.045, 0.18, bus);
      noise(t, 0.02, 0.12, 1500, bus);
      break;
  }
}

// ---------------------------------------------------------------------------
// The house band: a two-bar walking-bass swing at 132, all synth, no assets.
// Bass walks A minor with a turnaround, brushes tick the offbeats, a soft
// kick keeps the quarters. It sits behind everything (see MUSIC_GAIN) and
// swells a touch as the rail fills — energy you feel, not a song you notice.
// ---------------------------------------------------------------------------

const MUSIC_BPM = 132;
const MUSIC_GAIN = 0.11;
let musicLevel = 0;
let musicTimer: number | null = null;
let musicStep = 0;
let nextStepAt = 0;

// two bars of 8ths: A A A C | D D E D | C C B A | G G A (turnaround up)
const BASS_LINE = [55, 55, 55, 65.41, 73.42, 73.42, 82.41, 73.42, 65.41, 65.41, 61.74, 55, 49, 49, 55, 65.41];

function scheduleStep(step: number, t: number) {
  if (!ctx || !musicBus) return;
  // walking bass: round triangle through a lowpass so it stays felt, not heard
  const b = ctx.createOscillator();
  const bf = ctx.createBiquadFilter();
  const bg = ctx.createGain();
  b.type = "triangle";
  b.frequency.value = BASS_LINE[step % BASS_LINE.length];
  bf.type = "lowpass";
  bf.frequency.value = 520;
  bg.gain.setValueAtTime(0, t);
  bg.gain.linearRampToValueAtTime(0.5, t + 0.012);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
  b.connect(bf).connect(bg).connect(musicBus);
  b.start(t);
  b.stop(t + 0.25);
  // brushes on the offbeats — a short band of hiss, swung late
  if (step % 2 === 1) {
    const len = Math.ceil(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    const hg = ctx.createGain();
    hg.gain.value = 0.1;
    src.connect(hp).connect(hg).connect(musicBus);
    src.start(t + 0.055); // the swing: laid back, not on the grid
  }
  // a soft kick on the quarters so the room has a pulse
  if (step % 4 === 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
    g.gain.setValueAtTime(0.42, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + 0.14);
  }
}

function startMusic() {
  if (!ctx || musicTimer !== null || typeof window === "undefined") return;
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master!);
  nextStepAt = ctx.currentTime + 0.1;
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicBus || ctx.state !== "running") return;
    const stepDur = 60 / MUSIC_BPM / 2;
    while (nextStepAt < ctx.currentTime + 0.3) {
      try {
        scheduleStep(musicStep, Math.max(nextStepAt, ctx.currentTime + 0.01));
      } catch {
        /* the band never stops service */
      }
      musicStep = (musicStep + 1) % 16;
      nextStepAt += stepDur;
    }
  }, 90);
}

/** Glide the band in and out with the service; intensity 0..1 = rail fullness. */
export function updateMusic(intensity: number, audible: boolean) {
  if (!ctx || ctx.state !== "running") return;
  if (!musicBus) startMusic();
  if (!musicBus) return;
  musicLevel = audible ? MUSIC_GAIN * (0.7 + Math.min(1, Math.max(0, intensity)) * 0.6) : 0;
  musicBus.gain.setTargetAtTime(musicLevel, ctx.currentTime, 0.6);
}

// ---------------------------------------------------------------------------
// Ambience beds. Three looping sizzle beds (one per station), a dining-room
// murmur, and a low rail drone. updateAmbience() is called a few times a
// second from the scene; gains glide so nothing clicks.
// ---------------------------------------------------------------------------

interface Beds {
  sizzle: GainNode[];
  murmur: GainNode;
  drone: GainNode;
  droneOsc: OscillatorNode;
  simmer: GainNode;
  live: boolean;
}

let beds: Beds | null = null;

function loopNoise(hp: number, lp: number): { src: AudioBufferSourceNode; g: GainNode } {
  const len = ctx!.sampleRate * 2;
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const hpF = ctx!.createBiquadFilter();
  hpF.type = "highpass";
  hpF.frequency.value = hp;
  const lpF = ctx!.createBiquadFilter();
  lpF.type = "lowpass";
  lpF.frequency.value = lp;
  const g = ctx!.createGain();
  g.gain.value = 0;
  src.connect(hpF).connect(lpF).connect(g).connect(ambienceBus!);
  src.start();
  return { src, g };
}

export function startAmbience() {
  if (!ctx || beds) return;
  if (ctx.state === "suspended") void ctx.resume();
  const sizzle: GainNode[] = [];
  // stations spread across the stereo field: grill left, pastry right
  [-0.6, 0, 0.6].forEach((pan) => {
    const { g } = loopNoise(2500, 9000);
    const p = ctx!.createStereoPanner();
    p.pan.value = pan;
    g.disconnect();
    g.connect(p).connect(ambienceBus!);
    sizzle.push(g);
  });
  const { g: murmur } = loopNoise(300, 1200);
  const { g: drone } = loopNoise(60, 220);
  const droneOsc = ctx.createOscillator();
  droneOsc.type = "sine";
  droneOsc.frequency.value = 55;
  const og = ctx.createGain();
  og.gain.value = 0.05;
  droneOsc.connect(og).connect(drone);
  droneOsc.start();
  // the kitchen-is-on floor: a pot that never stops bubbling — low wet
  // rumble that lives under everything the whole service
  const { g: simmer } = loopNoise(140, 800);
  beds = { sizzle, murmur, drone, droneOsc, simmer, live: false };
}

export interface BedLevels {
  /** 0..1 per station: load hiss, 1+ when burning */
  sizzle: number[];
  /** 0..1: covers served, sour when tables walk */
  murmur: number;
  /** 0..1: how full the rail is */
  drone: number;
  /** 0..1: the always-on pot — base floor under the whole service */
  simmer?: number;
}

function glide(param: AudioParam, v: number) {
  param.setTargetAtTime(v, ctx!.currentTime, 0.4);
}

export function updateAmbience(lv: BedLevels, audible: boolean) {
  if (!ctx || ctx.state !== "running") return;
  if (!beds) startAmbience();
  if (!beds) return;
  const m = audible ? 1 : 0;
  beds.sizzle.forEach((g, i) => glide(g.gain, Math.min(1.4, lv.sizzle[i] ?? 0) * 0.13 * m));
  glide(beds.murmur.gain, (0.04 + lv.murmur * 0.08) * m);
  glide(beds.drone.gain, lv.drone * 0.22 * m);
  glide(beds.simmer.gain, (lv.simmer ?? 0) * 0.07 * m);
  if (!beds.live) beds.live = true;
}
