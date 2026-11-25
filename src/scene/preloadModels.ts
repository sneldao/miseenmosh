import { useGLTF } from "@react-three/drei";
import { modelUrl } from "./modelUrl";

const PROPS = [
  "cloche.glb",
  "platestack.glb",
  "panstack.glb",
  "seabass.glb",
  "lamb.glb",
  "shaker.glb",
  "bustub.glb",
  "tablesetting.glb",
  "wellington.glb",
];

/** Warm the prop cache the moment the player commits (BEGIN RESIDENCY),
 *  so the briefing beats stream them in instead of stalling on them. */
export function preloadKitchenModels() {
  try {
    for (const p of PROPS) useGLTF.preload(modelUrl(p));
  } catch {
    /* a failed preload just resolves on demand behind PropBoundary */
  }
}
