#!/usr/bin/env node
/**
 * Rodin Hyper3D Rigging pipeline step.
 *
 * Rigs a character mesh via POST https://api.hyper3d.com/api/v2/rigging,
 * optionally baking up to 10 stock motion clips, polls status, downloads GLB.
 *
 * Usage:
 *   RODIN_API_KEY=... node scripts/rodin/rig-character.mjs \
 *     --model assets/rodin/guest-01.glb \
 *     --image assets/rodin/guest-01.png \
 *     --out assets/rodin/guest-01-rigged.glb \
 *     [--template human] [--skinning core] \
 *     [--clips human_sp/sitting human_sp/happy_idle] \
 *     [--material PBR]
 *
 * Requires a Rodin API key with Rigging access (Business tier).
 * Docs: https://docs.hyper3d.ai/en/api-specification/rigging
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const API = "https://api.hyper3d.com/api/v2";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  if (process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return true; // flag-style
}

const key = process.env.RODIN_API_KEY;
if (!key) {
  console.error("Set RODIN_API_KEY (create at hyper3d.ai/workspace/api-dashboard).");
  process.exit(1);
}

const modelPath = arg("model");
const outPath = arg("out", modelPath.replace(/\.glb$/, "-rigged.glb"));
if (!modelPath) {
  console.error("--model path is required");
  process.exit(1);
}

const form = new FormData();
form.append("model", new Blob([await readFile(modelPath)]), modelPath.split("/").pop());
const imagePath = arg("image");
if (imagePath) {
  form.append("image", new Blob([await readFile(imagePath)]), imagePath.split("/").pop());
}
form.append("bone_template", arg("template", "human"));
form.append("skinning_method", arg("skinning", "core"));
form.append("material", arg("material", "PBR"));
form.append("geometry_file_format", "glb");
const clips = arg("clips");
if (clips) {
  for (const c of String(clips).split(" ")) form.append("animations", c);
}

// Submit. NOTE: the endpoint returns HTTP 201 even on logical failure —
// the error lives in the body's error field, so always inspect it.
const submit = await fetch(`${API}/rigging`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
  body: form,
});
const submitBody = await submit.json();
if (submitBody.error) {
  console.error("Submit failed:", submitBody.error);
  process.exit(1);
}
const { uuid, jobs } = submitBody;
const subKey = jobs?.subscription_key;
console.log("submitted:", uuid);

if (!subKey) {
  console.error("No subscription_key in response:", JSON.stringify(submitBody));
  process.exit(1);
}

// Poll status until every job (packaging included) is Done.
for (;;) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(`${API}/status`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription_key: subKey }),
  });
  const status = await res.json();
  const jobsList = status.jobs ?? [];
  const done = jobsList.filter((j) => j.status === "Done").length;
  const failed = jobsList.find((j) => /fail/i.test(j.status));
  console.log(`status: ${done}/${jobsList.length} done`);
  if (failed) {
    console.error("Job failed:", JSON.stringify(failed));
    process.exit(1);
  }
  if (jobsList.length && done === jobsList.length) break;
}

// Download.
const dl = await fetch(`${API}/download`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ task_uuid: uuid }),
});
const files = await dl.json();
const glb = files.result?.find?.((f) => f.name?.endsWith(".glb")) ?? files.result?.[0];
if (!glb?.url) {
  console.error("No GLB in download response:", JSON.stringify(files));
  process.exit(1);
}
const bin = Buffer.from(await (await fetch(glb.url)).arrayBuffer());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, bin);
console.log(`saved ${outPath} (${(bin.length / 1e6).toFixed(1)} MB)`);
console.log("Next: decimate + prune (strips the Icosphere artifact):");
console.log(`  npx @gltf-transform/cli simplify ${outPath} ${outPath.replace(".glb", "-lod.glb")} --ratio 0.03`);
console.log(`  npx @gltf-transform/cli prune ${outPath.replace(".glb", "-lod.glb")} ${outPath.replace(".glb", "-rt.glb")}`);
