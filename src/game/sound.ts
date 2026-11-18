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

function osc(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak = 1) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, 0.005, dur, peak);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t: number, dur: number, peak = 1, hp = 0) {
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
  node.connect(g).connect(master!);
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
  | "review";

export function sfx(kind: Sfx) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.01;
  switch (kind) {
    case "print":
      noise(t, 0.05, 0.5, 3000);
      osc("square", 1200, 900, t + 0.02, 0.05, 0.2);
      break;
    case "bell":
      osc("sine", 1560, 1560, t, 0.3, 0.28);
      osc("sine", 2340, 2340, t, 0.2, 0.1);
      break;
    case "slam":
      osc("sine", 160, 60, t, 0.12, 0.9);
      noise(t, 0.04, 0.3, 800);
      break;
    case "rip":
      noise(t, 0.18, 0.5, 1500);
      break;
    case "shatter":
      noise(t, 0.22, 0.8, 2500);
      osc("triangle", 2400, 1400, t, 0.12, 0.25);
      osc("triangle", 3100, 2000, t + 0.03, 0.1, 0.15);
      break;
    case "gasp":
      noise(t, 0.4, 0.35, 400);
      osc("sawtooth", 300, 160, t, 0.35, 0.12);
      break;
    case "sting":
      [110, 138.6, 164.8].forEach((f, i) => osc("sawtooth", f, f * 0.99, t + i * 0.02, 0.8, 0.16));
      break;
    case "chorus":
      [660, 660, 880].forEach((f, i) => osc("square", f, f, t + i * 0.09, 0.07, 0.16));
      break;
    case "review":
      [523, 659, 784, 1047].forEach((f, i) => osc("triangle", f, f, t + i * 0.12, 0.25, 0.2));
      break;
  }
}
