import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import { useGame } from "../game/state";

/**
 * Phase 2, slice 3 — the room talks.
 *
 * The ticker is a DOM receipt; in first person the newest line is shouted
 * into the room instead: a torn paper card that pops up over the pass,
 * leaning toward whoever said it, and is gone in under five seconds.
 * One transient line maximum — the DOM ticker stays for the `V` camera.
 */
const HOLD = 4600;
const W = 1.08;
const H = 0.54;
const CARD_Y = 2.02;
const CARD_Z = 1.02;
const STATION_COLOR = ["#a8322a", "#b07a2a", "#3a6a9a"];
const RAIL_COLOR = "#5a3a1c";
/** named speakers who aren't on a station stamp their own ink */
const WHO_COLOR: Record<string, string> = {
  BEEFCAKES: "#6a2a5a",
  "THE PRESS": "#2c2c34",
  "THE REGULARS": "#3d5a2c",
  "THE TABLE": "#7a4a1a",
};

function wrap(g: CanvasRenderingContext2D, text: string, max: number, limit: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, limit);
}

function bubbleTexture(text: string, who: string, accent: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 268;
  const g = c.getContext("2d")!;

  // the paper: warm cookery-page stock, never white
  g.fillStyle = "#f2e5c9";
  g.fillRect(0, 0, 512, 268);
  const vign = g.createRadialGradient(256, 140, 40, 256, 140, 300);
  vign.addColorStop(0, "rgba(255, 249, 231, 0.6)");
  vign.addColorStop(1, "rgba(186, 156, 112, 0.42)");
  g.fillStyle = vign;
  g.fillRect(0, 0, 512, 268);

  // fibre speckle
  g.fillStyle = "rgba(96, 72, 44, 0.16)";
  for (let i = 0; i < 380; i++) {
    g.fillRect((i * 89.7) % 512, (i * 53.1) % 268, 1.4, 1.4);
  }

  // the speaker, stamped in ink rather than a UI bar
  g.textBaseline = "top";
  g.font = "700 26px 'Courier New', monospace";
  g.fillStyle = accent;
  g.fillText(who, 20, 16);
  g.fillStyle = "rgba(34, 22, 12, 0.35)";
  g.fillRect(20, 50, 472, 2.5);

  // the shout, in the same ticket type as the dockets — wrap at the size
  // it will be drawn at, or the last words run off the paper
  g.fillStyle = "#22160c";
  const upper = text.toUpperCase();
  let size = 35;
  g.font = `700 ${size}px 'Courier New', monospace`;
  let lines = wrap(g, upper, 468, 5);
  if (lines.length > 4) {
    size = 29;
    g.font = `700 ${size}px 'Courier New', monospace`;
    lines = wrap(g, upper, 468, 5);
  }
  const lh = size + 9;
  lines = lines.slice(0, 4);
  const top = 64 + Math.max(0, (180 - lines.length * lh) / 2);
  lines.forEach((l, i) => g.fillText(l, 20, top + i * lh));

  // torn bottom edge, so it reads as paper and not a UI panel
  g.fillStyle = "#0d0b09";
  for (let x = 0; x < 512; x += 16) {
    g.beginPath();
    g.moveTo(x, 268);
    g.lineTo(x + 8, 252 + ((x / 16) % 3) * 5);
    g.lineTo(x + 16, 268);
    g.fill();
  }

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export default function SpeechBubble() {
  const { camera } = useThree();
  const feed = useGame((s) => s.feed);
  const cooks = useGame((s) => s.cooks);
  const firstPerson = useGame((s) => s.firstPerson);
  const phase = useGame((s) => s.phase);
  const openingStep = useGame((s) => s.openingStep);

  const item = feed[feed.length - 1];
  const card = useRef<Group>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const born = useRef(0);
  const lastId = useRef(-1);

  const stationOf = useMemo(() => {
    const m = new Map<string, number>();
    cooks.forEach((c) => m.set(c.name, c.station));
    return m;
  }, [cooks]);

  const station = item?.who ? stationOf.get(item.who) : undefined;
  const accent = station !== undefined
    ? STATION_COLOR[station]
    : (item?.who && WHO_COLOR[item.who]) ?? RAIL_COLOR;
  const who = item?.who ?? "THE ROOM";

  const tex = useMemo(
    () => (item ? bubbleTexture(item.text, who, accent) : null),
    // the card is re-drawn only when a new line arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id]
  );
  useEffect(() => () => tex?.dispose(), [tex]);

  useFrame(({ clock }, dt) => {
    const g = card.current;
    if (!g || !item) {
      if (g) g.visible = false;
      return;
    }
    if (lastId.current !== item.id) {
      lastId.current = item.id;
      born.current = clock.elapsedTime;
    }
    const age = clock.elapsedTime - born.current;
    const show = age < HOLD / 1000;
    g.visible = show;
    if (!show) return;

    // pop in, then settle; fade out on the last half-second
    const pop = Math.min(1, age / 0.16);
    const ease = 1 - (1 - pop) * (1 - pop);
    g.scale.setScalar(0.72 + 0.28 * ease);
    if (mat.current) mat.current.opacity = Math.min(1, (HOLD / 1000 - age) / 0.5);

    // the card faces the chef but stays upright, drifting a touch
    const dx = station !== undefined ? (station - 1) * 1.42 : 0.02;
    g.position.x += (dx - g.position.x) * Math.min(1, dt * 7);
    g.position.y = CARD_Y + (1 - ease) * -0.05 + Math.sin(clock.elapsedTime * 1.6) * 0.006;
    g.lookAt(camera.position.x, g.position.y, camera.position.z);
  });

  if (!firstPerson || phase !== "service" || !item || !tex || openingStep) return null;

  return (
    <group ref={card} position={[0, CARD_Y, CARD_Z]} visible={false}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial
          ref={mat}
          map={tex}
          transparent
          toneMapped={false}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* a tail, so it comes from a mouth and not from the ceiling */}
      <mesh position={[0, -H / 2 - 0.075, -0.002]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.075, 0.16, 3]} />
        <meshBasicMaterial color="#efdfc2" transparent opacity={0.94} toneMapped={false} />
      </mesh>
    </group>
  );
}
