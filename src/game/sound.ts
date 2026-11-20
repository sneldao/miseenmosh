// Tiny synth SFX — zero assets, everything baked. ctx unlocks on the
// first user gesture (BEGIN SERVICE / keypress).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
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
  | "rip"
  | "shatter"
  | "gasp"
  | "sting"
  | "chorus"
  | "review"
  | "flash"
  | "applause"
  | "hiss"
  | "sear";

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
  g.connect(p).connect(master!);
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
  }
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
  src.connect(hpF).connect(lpF).connect(g).connect(master!);
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
    g.connect(p).connect(master!);
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
  beds = { sizzle, murmur, drone, droneOsc, live: false };
}

export interface BedLevels {
  /** 0..1 per station: load hiss, 1+ when burning */
  sizzle: number[];
  /** 0..1: covers served, sour when tables walk */
  murmur: number;
  /** 0..1: how full the rail is */
  drone: number;
}

function glide(param: AudioParam, v: number) {
  param.setTargetAtTime(v, ctx!.currentTime, 0.4);
}

export function updateAmbience(lv: BedLevels, audible: boolean) {
  if (!ctx || ctx.state !== "running") return;
  if (!beds) startAmbience();
  if (!beds) return;
  const m = audible ? 1 : 0;
  beds.sizzle.forEach((g, i) => glide(g.gain, Math.min(1.4, lv.sizzle[i] ?? 0) * 0.16 * m));
  glide(beds.murmur.gain, (0.05 + lv.murmur * 0.1) * m);
  glide(beds.drone.gain, lv.drone * 0.3 * m);
  if (!beds.live) beds.live = true;
}
