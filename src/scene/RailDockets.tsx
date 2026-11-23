import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import { useGame, type Ticket } from "../game/state";
import { PASS_Z } from "./artDirection";

/**
 * Phase 2 — the rail is a rail.
 *
 * Dockets are physical cards hanging above the pass: table number, dish,
 * station stripe, hotkey digit, and an age bar that fills as the ticket
 * dies. They are the click target in first person (centre raycast), so
 * the DOM rail can retire once the pointer is locked.
 */
const STATION_COLOR = ["#a8322a", "#b07a2a", "#3a6a9a"];
const STATION_NAME = ["GRILL", "SAUTÉ", "PASTRY"];

const CARD_W = 0.2;
const CARD_H = 0.27;
const SLOT = 0.47;
const HANG_Y = 1.70;
const RAIL_X = -2.6; // compact rail, left of the held plate
const HANG_Z = PASS_Z; // the rail hangs over the pass, so it rides the pass

/** One soft stain texture, shared by every docket. */
let stainTex: CanvasTexture | null = null;
function useStain() {
  return useMemo(() => {
    if (stainTex) return stainTex;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 58, 6, 64, 58, 62);
    grad.addColorStop(0, "rgba(112, 66, 26, 0.72)");
    grad.addColorStop(0.55, "rgba(126, 79, 34, 0.34)");
    grad.addColorStop(1, "rgba(126, 79, 34, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    stainTex = new CanvasTexture(c);
    stainTex.colorSpace = SRGBColorSpace;
    return stainTex;
  }, []);
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
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
  return lines;
}

function docketTexture(t: Ticket, hotkey: number) {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 330;
  const g = c.getContext("2d")!;

  // the paper: warm, slightly dirty, never white
  g.fillStyle = "#f2e5c9";
  g.fillRect(0, 0, 240, 330);
  const vign = g.createRadialGradient(120, 150, 60, 120, 150, 210);
  vign.addColorStop(0, "rgba(255, 247, 226, 0.55)");
  vign.addColorStop(1, "rgba(186, 156, 112, 0.35)");
  g.fillStyle = vign;
  g.fillRect(0, 0, 240, 330);

  // fibre speckle so the card is not a flat rectangle of colour
  g.fillStyle = "rgba(96, 72, 44, 0.14)";
  for (let i = 0; i < 220; i++) {
    const x = (i * 97.3) % 240;
    const y = (i * 61.7) % 330;
    g.fillRect(x, y, 1.3, 1.3);
  }

  // ink
  const ink = "#22160c";
  g.fillStyle = ink;
  g.textBaseline = "top";

  g.font = "600 17px 'Courier New', monospace";
  g.fillText("TABLE", 18, 18);
  g.font = "700 44px 'Courier New', monospace";
  g.fillText(String(t.table), 17, 36);

  // ticket number, quiet, under the table
  g.font = "600 15px 'Courier New', monospace";
  g.fillStyle = "rgba(34, 22, 12, 0.55)";
  g.fillText(`#${t.id}`, 19, 86);

  // hotkey box — the digit that already works on the keyboard
  g.fillStyle = "#2a1a10";
  g.fillRect(178, 18, 44, 44);
  g.fillStyle = "#f6ead0";
  g.font = "700 30px 'Courier New', monospace";
  g.textAlign = "center";
  g.fillText(String(hotkey), 200, 24);
  g.textAlign = "left";

  // rule
  g.strokeStyle = "rgba(34, 22, 12, 0.5)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(18, 112);
  g.lineTo(222, 112);
  g.stroke();

  // dish — the loudest thing on the card
  g.fillStyle = ink;
  g.font = "700 26px 'Courier New', monospace";
  const lines = wrap(g, t.dish, 202);
  lines.slice(0, 4).forEach((line, i) => {
    g.fillText(line, 18, 128 + i * 30);
  });

  // station stripe
  g.fillStyle = STATION_COLOR[t.station] ?? "#7a5a2a";
  g.fillRect(0, 264, 240, 44);
  g.fillStyle = "#f7eed8";
  g.font = "700 19px 'Courier New', monospace";
  g.fillText(STATION_NAME[t.station] ?? "PASS", 18, 274);

  // empty age gutter: a second mesh fills it in real time
  g.fillStyle = "rgba(34, 22, 12, 0.22)";
  g.fillRect(18, 315, 204, 4);

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Docket({ t, hotkey }: { t: Ticket; hotkey: number }) {
  const stain = useStain();
  const swing = useRef<Group>(null);
  const card = useRef<Mesh>(null);
  const ageBar = useRef<Mesh>(null);
  const stainMesh = useRef<Mesh>(null);

  const tex = useMemo(
    () => docketTexture(t, hotkey),
    [t.id, t.dish, t.table, t.station, hotkey]
  );
  useEffect(() => () => tex.dispose(), [tex]);

  const tint = useMemo(() => new Color("#ffffff"), []);

  useFrame(({ clock }) => {
    const live = useGame.getState().tickets.find((x) => x.id === t.id);
    const frac = live ? Math.min(1, live.age / 55) : 0;
    const time = clock.elapsedTime;

    if (swing.current) {
      // a card on a clip: barely moves, but never perfectly still
      swing.current.rotation.z = Math.sin(time * 1.5 + t.id * 1.9) * 0.022;
      swing.current.rotation.x = -frac * 0.1;
    }
    if (card.current) {
      const m = card.current.material as MeshBasicMaterial;
      // paper yellows and grimes as the ticket dies
      tint.setRGB(1, 0.95 - frac * 0.2, 0.82 - frac * 0.34);
      m.color.copy(tint);
    }
    if (stainMesh.current) {
      (stainMesh.current.material as MeshBasicMaterial).opacity = frac * 0.85;
      stainMesh.current.visible = frac > 0.18;
    }
    if (ageBar.current) {
      const w = Math.max(0.0001, frac * (CARD_W - 0.028));
      ageBar.current.scale.x = w / 0.1;
      ageBar.current.position.x = -(CARD_W - 0.028) / 2 + w / 2;
      const m = ageBar.current.material as MeshBasicMaterial;
      m.color.setRGB(0.35 + frac * 0.6, 0.3 - frac * 0.18, 0.18 - frac * 0.1);
    }
  });

  return (
    <group position={[0, HANG_Y, HANG_Z]} userData={{ interact: { kind: "ticket", id: t.id } }}>
      <group ref={swing}>
        {/* the clip over the rail */}
        <mesh position={[0, -0.012, 0]}>
          <boxGeometry args={[0.038, 0.03, 0.016]} />
          <meshStandardMaterial color="#b9bec4" metalness={0.5} roughness={0.35} />
        </mesh>
        {/* the docket itself, hung from its top edge */}
        <mesh
          ref={card}
          position={[0, -0.019 - CARD_H / 2, 0]}
          castShadow
        >
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial map={tex} toneMapped={false} side={DoubleSide} />
        </mesh>
        {/* a forgiving hit pad — you should not have to thread a needle */}
        <mesh position={[0, -0.019 - CARD_H / 2, 0.006]}>
          <planeGeometry args={[CARD_W * 1.4, CARD_H * 1.18]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* grime blooms on old paper */}
        <mesh
          ref={stainMesh}
          position={[0, -0.019 - CARD_H / 2, 0.0015]}
          visible={false}
        >
          <planeGeometry args={[CARD_W * 0.9, CARD_H * 0.75]} />
          <meshBasicMaterial
            map={stain}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        {/* printed rule fills left to right as the ticket ages */}
        <mesh ref={ageBar} position={[0, -0.019 - CARD_H + 0.012, 0.0016]}>
          <planeGeometry args={[0.1, 0.0055]} />
          <meshBasicMaterial color="#5a3a1c" />
        </mesh>
      </group>
    </group>
  );
}

/** What Beefcakes leaves behind: half a docket, still swinging. */
function stubTexture(table: number, dish: string) {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe0c2";
  g.fillRect(0, 0, 240, 160);
  g.fillStyle = "rgba(96, 72, 44, 0.14)";
  for (let i = 0; i < 90; i++) g.fillRect((i * 97.3) % 240, (i * 61.7) % 160, 1.3, 1.3);
  g.fillStyle = "#22160c";
  g.textBaseline = "top";
  g.font = "600 17px 'Courier New', monospace";
  g.fillText("TABLE", 18, 46);
  g.font = "700 44px 'Courier New', monospace";
  g.fillText(String(table), 17, 64);
  g.font = "700 22px 'Courier New', monospace";
  g.fillStyle = "#6a1a1a";
  g.fillText("RIPPED", 150, 66);
  g.font = "700 20px 'Courier New', monospace";
  g.fillStyle = "#22160c";
  const words = wrap(g, dish, 202);
  words.slice(0, 2).forEach((w, i) => g.fillText(w, 18, 112 + i * 24));
  // the tear across the top — the other half is across the street
  g.fillStyle = "#0d0b09";
  for (let x = 0; x < 240; x += 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 8, 18 + ((x / 16) % 3) * 6);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const STUB_LIFE = 25;

function TornStub({ table, dish, slot, at }: { table: number; dish: string; slot: number; at: number }) {
  const swing = useRef<Group>(null);
  const fade = useRef<Mesh>(null);
  const tex = useMemo(() => stubTexture(table, dish), [table, dish]);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame(({ clock }) => {
    const age = useGame.getState().serviceTime - at;
    if (swing.current) {
      // ripped paper swings wilder, then settles into shame
      const wild = Math.max(0, 1 - age / 2);
      swing.current.rotation.z = Math.sin(clock.elapsedTime * 6 + slot) * 0.16 * wild
        + Math.sin(clock.elapsedTime * 1.5 + slot) * 0.022;
    }
    if (fade.current) {
      const m = fade.current.material as MeshBasicMaterial;
      m.opacity = Math.min(1, (STUB_LIFE - age) / 0.6);
    }
  });
  return (
    // hangs slightly forward of the rail — the live dockets close ranks
    // over the victim's slot, so the stub must sit proud to be seen
    <group position={[(slot - 2.5) * SLOT + RAIL_X, HANG_Y, HANG_Z + 0.06]}>
      <group ref={swing}>
        <mesh position={[0, -0.012, 0]}>
          <boxGeometry args={[0.038, 0.03, 0.016]} />
          <meshStandardMaterial color="#b9bec4" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh ref={fade} position={[0, -0.019 - 0.08, 0]}>
          <planeGeometry args={[CARD_W, 0.16]} />
          <meshBasicMaterial map={tex} toneMapped={false} side={DoubleSide} transparent />
        </mesh>
      </group>
    </group>
  );
}

export default function RailDockets() {
  const firstPerson = useGame((s) => s.firstPerson);
  const phase = useGame((s) => s.phase);
  const tickets = useGame((s) => s.tickets);
  const lastSteal = useGame((s) => s.lastSteal);
  const serviceTime = useGame((s) => s.serviceTime);

  const rail = tickets.filter((t) => t.state === "rail").slice(0, 6);
  if (!firstPerson || phase !== "service") return null;

  return (
    <group>
      {/* the rail the dockets actually hang on — a short bar left of the
          plate, supported from the pass top instead of dropped from the dark */}
      <mesh position={[RAIL_X, HANG_Y + 0.022, HANG_Z]} castShadow>
        <boxGeometry args={[3.0, 0.025, 0.025]} />
        <meshStandardMaterial color="#4a4d52" metalness={0.7} roughness={0.42} />
      </mesh>
      {[-4.1, -1.1].map((x) => (
        <mesh key={x} position={[x, (HANG_Y + 1.15) / 2, HANG_Z]}>
          <cylinderGeometry args={[0.011, 0.011, HANG_Y - 1.15, 6]} />
          <meshStandardMaterial color="#3c3f44" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {rail.map((t, i) => (
        <group key={t.id} position={[(i - 2.5) * SLOT + RAIL_X, 0, 0]}>
          <Docket t={t} hotkey={i + 1} />
        </group>
      ))}
      {lastSteal && serviceTime - lastSteal.at < STUB_LIFE && (
        <TornStub table={lastSteal.table} dish={lastSteal.dish} slot={lastSteal.slot} at={lastSteal.at} />
      )}
    </group>
  );
}
