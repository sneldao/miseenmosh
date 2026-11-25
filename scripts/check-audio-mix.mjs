#!/usr/bin/env node
// Measures the shipped baked-voice family after codec encoding. This is a
// meter gate, not a listening pass: per-file integrated loudness should sit
// on the voice target and true peaks below the ceiling.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../public/voice", import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort();
if (!files.length) {
  console.error("audio-mix: no shipped mp3 voice files found");
  process.exit(1);
}

const TARGET_I = -19;
const TOLERANCE = 0.8;
const PEAK_CEILING = -1;
let failures = 0;
const rows = [];

for (const file of files) {
  const path = join(dir, file);
  const run = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const err = run.stderr || "";
  const integrated = Number(err.match(/Integrated loudness:[\s\S]*?I:\s+(-?\d+(?:\.\d+)?) LUFS/)?.[1]);
  const peak = Number(err.match(/True peak:[\s\S]*?Peak:\s+(-?\d+(?:\.\d+)?) dBFS/)?.[1]);
  const ok = Number.isFinite(integrated) && Math.abs(integrated - TARGET_I) <= TOLERANCE && Number.isFinite(peak) && peak <= PEAK_CEILING;
  if (!ok) failures++;
  rows.push({ file, kb: Math.round(statSync(path).size / 1024), integrated, peak, ok });
}

for (const r of rows) {
  console.log(`${r.ok ? "ok" : "FAIL"} ${r.file}  ${r.integrated.toFixed(1)} LUFS  ${r.peak.toFixed(1)} dBTP  ${r.kb} KB`);
}
console.log(`audio-mix: measured ${rows.length}/${files.length} shipped mp3 files; target ${TARGET_I} LUFS ±${TOLERANCE}, ceiling ${PEAK_CEILING} dBTP`);
if (failures) process.exit(1);
