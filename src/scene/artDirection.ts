import { useEffect, useState } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export const INK = "#302c2b";
export const PAPER = "#f3e6c8";
export const CREAM = "#fff1d0";
export const VERMILION = "#d94e36";
export const PETROL = "#286e70";
export const MUSTARD = "#dfaa3c";
export const COPPER = "#bf7048";
export const STATION_X = [-3.6, 0, 3.6] as const;
export const LOOK = {
  background: "#d8c8a5",
  fogNear: 28,
  fogFar: 50,
  sky: "#fff4da",
  ground: "#699391",
  hemi: 1.5,
  key: "#fff0d4",
  keyIntensity: 3.2,
  fill: "#a9d5d0",
  fillIntensity: 0.7,
  shadowSize: 2048,
  maxDpr: 1.5,
} as const;
export const COOK_SHAPES = [
  {
    name: "PETRA",
    height: 2.30,
    shoulder: 0.40,
    waist: 0.25,
    skin: "#d49b70",
    shirt: "#b5883e",
    apron: "#dfaa3c",
    trim: "#286e70",
    headWidth: 0.24,
    headHeight: 0.31,
  },
  {
    name: "DIMITRI",
    height: 2.40,
    shoulder: 0.42,
    waist: 0.38,
    skin: "#e4b685",
    shirt: "#2e6366",
    apron: "#286e70",
    trim: "#dfaa3c",
    headWidth: 0.29,
    headHeight: 0.27,
  },
  {
    name: "ANWAR",
    height: 2.30,
    shoulder: 0.28,
    waist: 0.22,
    skin: "#bf875e",
    shirt: "#e4d8b6",
    apron: "#286e70",
    trim: "#dfaa3c",
    headWidth: 0.21,
    headHeight: 0.32,
  },
] as const;

/** Live prefers-reduced-motion flag for useFrame-side decisions. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Canvas-drawn sign/plaque texture — local, deterministic, no font fetch. */
export function signTexture(text: string, opts?: { w?: number; h?: number; bg?: string; fg?: string; size?: number }) {
  const w = opts?.w ?? 512;
  const h = opts?.h ?? 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = opts?.bg ?? INK;
  g.fillRect(0, 0, w, h);
  // thin inset rule, like a painted enamel sign
  g.strokeStyle = opts?.fg ?? CREAM;
  g.lineWidth = 4;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = opts?.fg ?? CREAM;
  g.font = `bold ${opts?.size ?? Math.floor(h * 0.5)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

let cloth: CanvasTexture | null = null;
/** Shared cloth weave: off-white base + a few fixed diagonal ink strokes.
 *  Applied as a multiply map on garments — never skin. */
export function clothTexture(): CanvasTexture {
  if (cloth) return cloth;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fdfaf2";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(48,44,43,0.12)";
  g.lineWidth = 2;
  // stable hand-drawn diagonals, no randomness
  const strokes: [number, number, number, number][] = [
    [-10, 30, 60, -8],
    [20, 140, 90, 66],
    [70, 136, 140, 62],
    [-8, 96, 50, 40],
    [96, 40, 138, -6],
    [8, 64, 40, 30],
  ];
  for (const [x1, y1, x2, y2] of strokes) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  cloth = new CanvasTexture(c);
  cloth.wrapS = cloth.wrapT = RepeatWrapping;
  cloth.colorSpace = SRGBColorSpace;
  return cloth;
}
