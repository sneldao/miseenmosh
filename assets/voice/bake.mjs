#!/usr/bin/env node
/** Bake brigade voice lines via fal Kokoro → mixed chorus mp3s.
 *
 *  "Baked voice, no keys, no network" — generation happens HERE, at
 *  asset time; the game ships the resulting files and never calls fal
 *  at runtime. Stems land in assets/voice/stems/ for reuse (per-cook
 *  barks later); mixed chorus files go to public/voice/ for the bundle.
 *
 *  Cast (Kokoro voices, Apache-2.0):
 *    Petra   af_bella   — cut-glass line reader, commands a pass
 *    Dimitri am_fenrir  — the deepest male preset, smoke and fatigue
 *    Anwar   am_puck    — lighter, younger energy
 *
 *  Usage: node assets/voice/bake.mjs   (key read from ~/.config/fal/key)
 *  Cost: ~450 chars total ≈ $0.01 at $0.02/1K chars. */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const STEMS = join(ROOT, "assets/voice/stems");
const OUT = join(ROOT, "public/voice");
mkdirSync(STEMS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const FAL_KEY = readFileSync(`${process.env.HOME}/.config/fal/key`, "utf8").trim();
const MODEL = "https://fal.run/fal-ai/kokoro/american-english";

const VOICES = { petra: "af_bella", dimitri: "am_fenrir", anwar: "am_puck" };

// index = position in BRIGADE_RESPONSES (src/game/barks.ts) — keep in sync.
// ensemble: all three cooks answer; solo: a single voice (the muttered asides).
const LINES = [
  { idx: 0, text: "Yes, chef!", ensemble: true },
  { idx: 1, text: "Yes, chef.", ensemble: false, voice: "dimitri", rate: 0.92 },
  { idx: 2, text: "Heard, chef.", ensemble: true },
  { idx: 3, text: "On it, chef.", ensemble: true },
  { idx: 4, text: "Yes, chef!", ensemble: false, voice: "anwar", rate: 0.85, gain: 0.7 },
];

async function tts(text, voice, speed = 1.0) {
  const res = await fetch(MODEL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, speed }),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${await res.text()}`);
  const { audio } = await res.json();
  const wav = await fetch(audio.url);
  if (!wav.ok) throw new Error(`audio fetch ${wav.status}`);
  return Buffer.from(await wav.arrayBuffer());
}

for (const line of LINES) {
  const speakers = line.ensemble ? Object.keys(VOICES) : [line.voice];
  const wavs = [];
  for (const who of speakers) {
    const stem = join(STEMS, `chorus-${line.idx}-${who}.wav`);
    if (!existsSync(stem)) {
      console.log(`gen chorus-${line.idx} ${who}: "${line.text}"`);
      writeFileSync(stem, await tts(line.text, VOICES[who], line.rate ?? 1.0));
    }
    wavs.push({ who, path: stem });
  }
  const out = join(OUT, `chorus-${line.idx}.mp3`);
  // ensemble: tiny start offsets make three voices read as a shouted chorus
  const inputs = wavs.flatMap((w, i) => ["-i", w.path]);
  const filters = wavs.map((w, i) => `[${i}:a]adelay=${i * 90}|${i * 90},volume=${line.gain ?? 1}[a${i}]`);
  filters.push(`${wavs.map((_, i) => `[a${i}]`).join("")}amix=inputs=${wavs.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11`);
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", filters.join(";"), "-c:a", "libmp3lame", "-q:a", "4", out], { stdio: "pipe" });
  console.log(`  → public/voice/chorus-${line.idx}.mp3 (${speakers.join("+")})`);
}

// manifest for voice.ts — file index must equal BRIGADE_RESPONSES order
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ chorus: LINES.map((l) => `chorus-${l.idx}.mp3`) }, null, 2) + "\n");
console.log("done → public/voice/manifest.json");
