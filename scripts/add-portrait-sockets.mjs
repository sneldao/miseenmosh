#!/usr/bin/node
/**
 * The portrait-socket repair: Petra's runtime GLB carries a PortraitSocket
 * node parented to mixamorig:Head; the other pilot bodies shipped without it,
 * so BrigadeCook/CommisRunner/PorterRunner threw at boot and their whole
 * model was skipped — three cooks rendered as empty air. This copies Petra's
 * socket (same parent, same head-local matrix) into every GLB named below.
 *
 * Usage: node scripts/add-portrait-sockets.mjs
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import fs from "node:fs";

const PETRA = "assets/meshy/petra-pilot/runtime.glb";
const TARGETS = [
  "assets/meshy/dimitri-pilot/runtime-dimitri.glb",
  "assets/meshy/anwar-pilot/runtime-anwar.glb",
  "assets/meshy/commis-pilot/runtime-commis.glb",
  "assets/meshy/porter-pilot/runtime-porter.glb",
  // Petra's own in-service body — runtime-hold ships without the socket too
  "assets/meshy/petra-pilot/runtime-hold.glb",
];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const petraDoc = await io.read(PETRA);
const petraSocket = petraDoc.getRoot().listNodes().find((n) => n.getName() === "PortraitSocket");
if (!petraSocket) {
  console.error("PortraitSocket not found in", PETRA);
  process.exit(1);
}
const matrix = petraSocket.getMatrix();
const translation = petraSocket.getTranslation();
const rotation = petraSocket.getRotation();
const scale = petraSocket.getScale();
console.log("petra socket: matrix?", !!matrix, "t", translation, "r", rotation, "s", scale);

for (const path of TARGETS) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  if (root.listNodes().some((n) => n.getName() === "PortraitSocket")) {
    console.log(path, "already has a PortraitSocket — skipped");
    continue;
  }
  const head = root.listNodes().find((n) => n.getName() === "mixamorig:Head");
  if (!head) {
    console.error(path, ": no mixamorig:Head — not patched");
    continue;
  }
  const socket = doc.createNode("PortraitSocket");
  if (matrix) socket.setMatrix(matrix);
  else {
    if (translation) socket.setTranslation(translation);
    if (rotation) socket.setRotation(rotation);
    if (scale) socket.setScale(scale);
  }
  head.addChild(socket);
  await io.write(path, doc);
  const size = fs.statSync(path).size;
  console.log(path, "patched,", (size / 1024).toFixed(0) + " KB");
}
