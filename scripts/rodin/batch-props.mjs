#!/usr/bin/env node
/**
 * Batch props: sink-bay dressing + table-setting kit via Rodin Gen-2.5-Low.
 * No rigging — props only. Requires RODIN_API_KEY in env.
 */
import { writeFile, readFile } from "node:fs/promises";

const API = "https://api.hyper3d.com/api/v2";
const key = process.env.RODIN_API_KEY;
if (!key) { console.error("RODIN_API_KEY missing"); process.exit(1); }

const PROPS = [
  { name: "bustub",
    prompt: "commercial stainless steel bus tub, rectangular plastic bussing bin, straight sides, empty, clean, matte grey, studio product shot, centered, full object" },
  { name: "tablesetting",
    prompt: "elegant bistro table setting arrangement: white ceramic dinner plate, folded cream linen napkin, fork and knife, small wine bottle, top-down compact arrangement, stylized painterly, clean readable silhouette, centered, full objects" },
];

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;
const jobs = only ? PROPS.filter((p) => only.includes(p.name)) : PROPS;

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

for (const p of jobs) {
  console.log(`\n=== ${p.name} ===`);
  try {
    const genForm = new FormData();
    genForm.append("prompt", p.prompt);
    genForm.append("tier", "Gen-2.5-Low");
    const genRes = await fetch(`${API}/rodin`, {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: genForm,
    });
    const gen = await genRes.json();
    if (gen.error) throw new Error("gen: " + gen.error);
    console.log("  submitted", gen.uuid);
    await poll(gen.jobs.subscription_key);
    const bytes = await download(gen.uuid, `assets/rodin/${p.name}-raw.glb`);
    console.log(`  raw ${(bytes / 1e6).toFixed(2)} MB -> assets/rodin/${p.name}-raw.glb`);
  } catch (e) {
    console.error(`  ${p.name} FAILED:`, e.message);
  }
}
console.log("\nbatch props done");
