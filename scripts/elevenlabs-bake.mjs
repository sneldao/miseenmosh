#!/usr/bin/env node
/**
 * Bake brigade voice via the ElevenLabs API → the same files the game ships.
 *
 * The fal/Kokoro bake (assets/voice/bake.mjs) made the first chorus; this
 * re-cuts it with ElevenLabs premades and adds Petra's hinge lines — the
 * opening verdicts and the house-rule lines — as named mp3s the runtime
 * picks up through voice.ts's NAMED map. Generation happens HERE, at asset
 * time; the game ships the files and never calls ElevenLabs at runtime.
 *
 *   Petra   Alice (Xb7hH8MSUJpSbSDYk0k2) — clear, cut-glass, commands a pass
 *   Dimitri Brian (nPczCjzI2devNBz1zQrb) — deep, resonant, seen things
 *   Anwar   Will  (bIHbv24MWmeRgasZH58o) — lighter, younger energy
 *
 * Usage: ELEVENLABS_API_KEY=... node scripts/elevenlabs-bake.mjs
 * Cost: ~700 chars of TTS across 17 takes — a rounding error on a Creator plan.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STEMS = join(ROOT, "assets/voice/stems-elevenlabs");
const OUT = join(ROOT, "public/voice");
mkdirSync(STEMS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("ELEVENLABS_API_KEY is required"); process.exit(1); }

const MODEL = "eleven_turbo_v2_5";
const VOICES = {
  petra: { id: "Xb7hH8MSUJpSbSDYk0k2", settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25 } },
  dimitri: { id: "nPczCjzI2devNBz1zQrb", settings: { stability: 0.6, similarity_boost: 0.75, style: 0.15 } },
  anwar: { id: "bIHbv24MWmeRgasZH58o", settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 } },
};

// index = position in BRIGADE_RESPONSES (src/game/barks.ts) — keep in sync.
// ensemble: all three answer; solo: the muttered aside the line describes.
const CHORUS = [
  { idx: 0, text: "Yes, chef!", ensemble: true },
  { idx: 1, text: "Yes, chef.", ensemble: false, voice: "dimitri", rate: 0.92 },
  { idx: 2, text: "Heard, chef.", ensemble: true },
  { idx: 3, text: "On it, chef.", ensemble: true },
  { idx: 4, text: "Yes, chef!", ensemble: false, voice: "anwar", rate: 0.88, gain: 0.7 },
];

// Petra's hinge moments, named for voice.ts's NAMED map. These are the lines
// a judge hears at the two decisions that define a residency.
const LINES = [
  { key: "petra-opening-serve", text: "You saw it. You sent it anyway. I heard you." },
  { key: "petra-opening-sendback", text: "Dark pastry. Grey centre. You saw it. Back to me." },
  { key: "petra-opening-smash", text: "You saw it. Then you chose the tiles. So did I." },
  { key: "petra-rule-double", text: "Double shift. Bring a broom." },
  { key: "petra-rule-nobin", text: "No bin. Cook everything." },
  { key: "petra-rule-shortfuse", text: "Short fuse. Move." },
  { key: "petra-rule-none", text: "Play it straight. Good." },
];

async function tts(text, who, rate = 1.0) {
  const v = VOICES[who];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { ...v.settings, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const stem = (name, who) => join(STEMS, `${name}-${who}.mp3`);

for (const line of CHORUS) {
  const name = `chorus-${line.idx}`;
  const speakers = line.ensemble ? Object.keys(VOICES) : [line.voice];
  const files = [];
  for (const who of speakers) {
    const path = stem(name, who);
    if (!existsSync(path)) {
      console.log(`gen ${name} ${who}: "${line.text}"`);
      writeFileSync(path, await tts(line.text, who, line.rate ?? 1.0));
    }
    files.push({ who, path });
  }
  const out = join(OUT, `${name}.mp3`);
  const inputs = files.flatMap((f) => ["-i", f.path]);
  const filters = files.map((f, i) => `[${i}:a]adelay=${i * 90}|${i * 90},volume=${line.gain ?? 1}[a${i}]`);
  filters.push(`${files.map((_, i) => `[a${i}]`).join("")}amix=inputs=${files.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11`);
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", filters.join(";"), "-c:a", "libmp3lame", "-q:a", "4", out], { stdio: "pipe" });
  console.log(`  → public/voice/${name}.mp3 (${files.map((f) => f.who).join("+")})`);
}

const named = {};
for (const line of LINES) {
  const path = stem(line.key, "petra");
  if (!existsSync(path)) {
    console.log(`gen ${line.key}: "${line.text}"`);
    writeFileSync(path, await tts(line.text, "petra"));
  }
  execFileSync("ffmpeg", ["-y", "-i", path, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "libmp3lame", "-q:a", "4", join(OUT, `${line.key}.mp3`)], { stdio: "pipe" });
  named[line.key] = `${line.key}.mp3`;
  console.log(`  → public/voice/${line.key}.mp3 (petra)`);
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify({
  chorus: CHORUS.map((l) => `chorus-${l.idx}.mp3`),
  lines: named,
  baked_by: "scripts/elevenlabs-bake.mjs (ElevenLabs eleven_turbo_v2_5)",
}, null, 2) + "\n");
console.log("done → public/voice/manifest.json");
