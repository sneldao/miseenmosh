#!/usr/bin/env node
/**
 * UX wave, part 1: static hero/dressing props (no rigging).
 * wellington (hero dish) / range (sauce-stance hero) /
 * produce (crate) / bread (basket).
 * Requires RODIN_API_KEY in env.
 */
import { writeFile } from "node:fs/promises";

const API = "https://api.hyper3d.com/api/v2";
const key = process.env.RODIN_API_KEY;
if (!key) { console.error("RODIN_API_KEY missing"); process.exit(1); }

const PROPS = [
  { name: "wellington",
    prompt: "plated beef wellington slice, golden puff pastry lattice crust, pink beef center, dark jus drizzle, white ceramic plate, fine dining, stylized painterly, warm candlelight, centered, full object" },
  { name: "range",
    prompt: "professional gas range cooker front, six burners with black cast-iron grates, copper trim rail, oven door with small window, row of control knobs, stainless steel and ink-black enamel, straight-on product shot, stylized clean shapes, centered, full object" },
  { name: "produce",
    prompt: "wooden slatted crate of fresh vegetables, red peppers, green herbs, beige mushrooms, market fresh, stylized painterly, warm light, centered, full object" },
  { name: "bread",
    prompt: "wicker basket of baguettes and round country loaves, folded linen cloth, artisan bakery, stylized painterly, warm light, centered, full object" },
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
    const dl = await fetch(`${API}/download`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ task_uuid: gen.uuid }),
    });
    const files = await dl.json();
    const list = files.list ?? files.result ?? [];
    const glb = list.find((f) => f.name?.endsWith(".glb")) ?? list[0];
    if (!glb?.url) throw new Error("no GLB: " + JSON.stringify(files).slice(0, 200));
    const bin = Buffer.from(await (await fetch(glb.url)).arrayBuffer());
    await writeFile(`assets/rodin/${p.name}-raw.glb`, bin);
    console.log(`  raw ${(bin.length / 1e6).toFixed(2)} MB`);
  } catch (e) {
    console.error(`  ${p.name} FAILED:`, e.message);
  }
}
console.log("\nstatics done");
