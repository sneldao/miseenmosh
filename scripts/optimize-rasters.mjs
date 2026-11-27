#!/usr/bin/node
/**
 * Right-size the rec raster art for where it actually appears. The cast
 * portraits shipped at 896x1216 (~350 KB each) for cards under 100 px wide;
 * the market sign at 1280 px for a 16rem slot; the dish sprites at 1024 px
 * q~90 for plates you inspect at arm's length. This writes capped variants
 * beside the originals (originals stay untouched — they are the pipeline's
 * source art) and prints the import lines to rewire.
 *
 * Usage: node scripts/optimize-rasters.mjs
 */
import sharp from "sharp";
import fs from "node:fs";

const DIR = "assets/recraft";
// [source file, max width, webp quality, output suffix]
const JOBS = [
  // HUD cast cards + feud panels: never wider than ~200 px on screen
  ...["petra", "dimitri", "anwar", "beefcakes", "critic", "fishmonger", "commis", "inspector"].map(
    (n) => [`${DIR}/cast-gilliam/${n}.webp`, 512, 80, "-512"],
  ),
  // the title hero gets a wider cap
  [`${DIR}/cast-gilliam/title-lineup.webp`, 1280, 82, "-1k"],
  // market sign: max 16rem in the prep book
  [`${DIR}/paper-cookery/market-sign.webp`, 640, 80, "-512"],
  // dish sprites ride 3D plates and close-up inspections: keep resolution,
  // drop encoder bloat
  ...["wellington", "sea-bass", "quenelle"].map(
    (n) => [`${DIR}/food-lino/${n}.webp`, 1024, 80, "-q80"],
  ),
];

let before = 0;
let after = 0;
for (const [src, width, quality, suffix] of JOBS) {
  const out = src.replace(/\.webp$/, `${suffix}.webp`);
  const srcBytes = fs.statSync(src).size;
  const info = await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(out);
  before += srcBytes;
  after += info.size;
  const from = src.replace(/^assets\//, "../");
  console.log(`${srcBytes} -> ${info.size} bytes  ${out}`);
  console.log(`   import: ${from.replace(/\.webp$/, `${suffix}.webp`)}`);
}
console.log(`\ntotal: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB`);
