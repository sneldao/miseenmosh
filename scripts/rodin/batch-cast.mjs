#!/usr/bin/env node
/**
 * Batch driver: remaining dining-room cast through the Rodin pipeline.
 *
 * Per character: generate (Gen-2.5-Low, text-to-3D) → rig (human template,
 * core skinning, animation_preset clips) → optimize → install to
 * public/models/characters/<name>.glb.
 *
 * Usage:  node scripts/rodin/batch-cast.mjs [--only name1,name2]
 * Requires RODIN_API_KEY in env (sourced from .env.local).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const API = "https://api.hyper3d.com/api/v2";
const key = process.env.RODIN_API_KEY;
if (!key) { console.error("RODIN_API_KEY missing"); process.exit(1); }

// Clip picks per character from the live catalog (scripts/rodin/animation-catalog-human.md):
// 000025 happy idle · 000056 sitting (jiggling legs) · 000085 sitting (hands on legs)
// 000090 standing idle · 000089 walking · 000088 elegant walk · 000050 sad idle
// 000012 drunk idle · 000041 pointing forward · 000080 sit shake foot
const CAST = [
  { name: "guest-c", prompt: "Young woman seated, mustard-yellow evening dress, dark bobbed hair, leaning slightly toward companion, stylized painterly, warm palette, relaxed A-pose, full body",
    clips: ["human_000085", "human_000025", "human_000080"] },
  { name: "guest-d", prompt: "Young man seated, vermilion-accented waistcoat, rolled sleeves, animated gesturing hands, stylized painterly, candlelit, relaxed A-pose, full body",
    clips: ["human_000085", "human_000041", "human_000025"] },
  { name: "guest-e", prompt: "Middle-aged solitary diner, copper-brown suit, reading a folded paper, slouched, stylized painterly, muted tones, relaxed A-pose, full body",
    clips: ["human_000085", "human_000050", "human_000090"] },
  { name: "waiter", prompt: "Standing waiter mid-stride, dark vest over crisp white shirt, white towel over left arm, one hand raised holding a small tray, black trousers, stylized painterly, candlelit dining room, relaxed A-pose, full body",
    clips: ["human_000089", "human_000088", "human_000090"] },
  { name: "second-row", prompt: "Background diner in soft petrol-grey suit, simple silhouette, slightly simplified detail, seen at distance, stylized painterly, relaxed A-pose, full body",
    clips: ["human_000085", "human_000090"] },
];

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;
const jobs = only ? CAST.filter((c) => only.includes(c.name)) : CAST;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poll(subKey) {
  for (;;) {
    await sleep(6000);
    const res = await fetch(`${API}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_key: subKey }),
    });
    const s = await res.json();
    const list = s.jobs ?? [];
    const done = list.filter((j) => j.status === "Done").length;
    const failed = list.find((j) => /fail/i.test(j.status));
    console.log(`  ${done}/${list.length} done`);
    if (failed) throw new Error("job failed: " + JSON.stringify(failed));
    if (list.length && done === list.length) return;
  }
}

async function download(uuid, outPath) {
  const res = await fetch(`${API}/download`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ task_uuid: uuid }),
  });
  const files = await res.json();
  const list = files.list ?? files.result ?? [];
  const glb = list.find((f) => f.name?.endsWith(".glb")) ?? list[0];
  if (!glb?.url) throw new Error("no GLB: " + JSON.stringify(files).slice(0, 200));
  const bin = Buffer.from(await (await fetch(glb.url)).arrayBuffer());
  await writeFile(outPath, bin);
  return bin.length;
}

for (const c of jobs) {
  console.log(`\n=== ${c.name} ===`);
  try {
    // 1. generate
    const genForm = new FormData();
    genForm.append("prompt", c.prompt);
    genForm.append("tier", "Gen-2.5-Low");
    const genRes = await fetch(`${API}/rodin`, {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: genForm,
    });
    const gen = await genRes.json();
    if (gen.error) throw new Error("gen: " + gen.error);
    console.log("  gen submitted", gen.uuid);
    await poll(gen.jobs.subscription_key);
    const rawBytes = await download(gen.uuid, `assets/rodin/${c.name}-raw.glb`);
    console.log(`  raw ${(rawBytes / 1e6).toFixed(1)} MB`);

    // 2. rig with clips
    const rigForm = new FormData();
    rigForm.append("model", new Blob([await readFile(`assets/rodin/${c.name}-raw.glb`)]), `${c.name}.glb`);
    rigForm.append("bone_template", "human");
    rigForm.append("skinning_method", "core");
    rigForm.append("material", "PBR");
    rigForm.append("geometry_file_format", "glb");
    for (const clip of c.clips) rigForm.append("animation_preset", clip);
    const rigRes = await fetch(`${API}/rigging`, {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: rigForm,
    });
    const rig = await rigRes.json();
    if (rig.error) throw new Error("rig: " + rig.error);
    console.log("  rig submitted", rig.uuid);
    await poll(rig.jobs.subscription_key);
    await download(rig.uuid, `assets/rodin/${c.name}-rigged.glb`);

    // 3. verify clips landed (guard against silent drops)
    const { default: assertClips } = { default: null };
    // quick GLB JSON peek
    const buf = await readFile(`assets/rodin/${c.name}-rigged.glb`);
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
    const anims = (json.animations ?? []).map((a) => a.name);
    console.log("  clips:", anims.join(",") || "NONE");
    if (!anims.length) throw new Error("no animations in output");

    // 4. optimize + install
    execFileSync("npx", ["@gltf-transform/cli", "optimize",
      `assets/rodin/${c.name}-rigged.glb`, `assets/rodin/${c.name}-web.glb`,
      "--texture-compress", "webp", "--texture-size", "512", "--simplify-ratio", "0.01"],
      { stdio: "inherit" });
    await mkdir("public/models/characters", { recursive: true });
    const web = await readFile(`assets/rodin/${c.name}-web.glb`);
    await writeFile(`public/models/characters/${c.name}.glb`, web);
    console.log(`  installed public/models/characters/${c.name}.glb (${(web.length / 1e6).toFixed(2)} MB)`);
  } catch (e) {
    console.error(`  ${c.name} FAILED:`, e.message);
  }
}
console.log("\nbatch done");
