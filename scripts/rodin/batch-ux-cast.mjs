#!/usr/bin/env node
/**
 * UX wave, part 2: background crew (gen + rig) and guest re-rigs (motion pack).
 * Crew: wash / stock / carry — new Low gens, human template, work clips.
 * Guests: re-rig existing raws with expanded clip sets (v2 outputs, so the
 * live files stay untouched until verified).
 * Requires RODIN_API_KEY in env.
 */
import { readFile, writeFile } from "node:fs/promises";

const API = "https://api.hyper3d.com/api/v2";
const key = process.env.RODIN_API_KEY;
if (!key) { console.error("RODIN_API_KEY missing"); process.exit(1); }

const CREW = [
  { name: "wash",
    prompt: "stocky older kitchen porter, rolled sleeves, stained apron, arms forward scrubbing pose, stylized painterly, muted tones, relaxed A-pose, full body",
    clips: ["human_000090", "human_000016", "human_000025"] },
  { name: "stock",
    prompt: "burly young kitchen hand carrying a wooden crate, work shirt and apron, sturdy boots, stylized painterly, muted tones, relaxed A-pose, full body",
    clips: ["human_000090", "human_000089", "human_000065"] },
  { name: "carry",
    prompt: "slim young runner holding a tray high, quick step, kitchen whites, stylized painterly, warm candlelight, relaxed A-pose, full body",
    clips: ["human_000089", "human_000086", "human_000090"] },
];

// Motion pack: superset clip sets on the existing raws.
const RERIG = [
  { raw: "guest-c-raw.glb", out: "guest-c-v2", clips: ["human_000085", "human_000080", "human_000025", "human_000050"] },
  { raw: "guest-d-raw.glb", out: "guest-d-v2", clips: ["human_000041", "human_000025", "human_000050", "human_000085"] },
  { raw: "guest-e-raw.glb", out: "guest-e-v2", clips: ["human_000085", "human_000050", "human_000080", "human_000025"] },
  { raw: "waiter-raw.glb", out: "waiter-v2", clips: ["human_000089", "human_000088", "human_000090", "human_000025"] },
];

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

async function rig(modelPath, outName, clips) {
  const form = new FormData();
  form.append("model", new Blob([await readFile(modelPath)]), modelPath.split("/").pop());
  form.append("bone_template", "human");
  form.append("skinning_method", "core");
  form.append("material", "PBR");
  form.append("geometry_file_format", "glb");
  for (const c of clips) form.append("animation_preset", c);
  const res = await fetch(`${API}/rigging`, {
    method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
  });
  const body = await res.json();
  if (body.error) throw new Error("rig: " + body.error);
  console.log("  rig submitted", body.uuid);
  await poll(body.jobs.subscription_key);
  const bytes = await download(body.uuid, `assets/rodin/${outName}-rigged.glb`);
  const buf = await readFile(`assets/rodin/${outName}-rigged.glb`);
  const jsonLen = buf.readUInt32LE(12);
  const anims = (JSON.parse(buf.slice(20, 20 + jsonLen).toString()).animations ?? []).map((a) => a.name);
  console.log(`  clips: ${anims.join(",") || "NONE"} (${(bytes / 1e6).toFixed(1)} MB)`);
  if (!anims.length) throw new Error("no animations in output");
}

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;

if (!only || only.some((n) => ["wash", "stock", "carry"].includes(n))) {
  for (const c of CREW.filter((c) => !only || only.includes(c.name))) {
    console.log(`\n=== crew ${c.name} ===`);
    try {
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
      await download(gen.uuid, `assets/rodin/crew-${c.name}-raw.glb`);
      await rig(`assets/rodin/crew-${c.name}-raw.glb`, `crew-${c.name}`, c.clips);
    } catch (e) {
      console.error(`  crew ${c.name} FAILED:`, e.message);
    }
  }
}

if (!only || only.includes("rerig")) {
  for (const r of RERIG) {
    console.log(`\n=== rerig ${r.out} ===`);
    try {
      await rig(`assets/rodin/${r.raw}`, r.out, r.clips);
    } catch (e) {
      console.error(`  ${r.out} FAILED:`, e.message);
    }
  }
}
console.log("\ncast done");
