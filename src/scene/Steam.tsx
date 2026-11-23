/**
 * The line is hot.
 *
 * A kitchen with nothing rising off it reads as a diorama. Steam is the
 * cheapest, strongest hive signal there is, because it is the one thing in
 * frame that changes shape, drifts sideways, and reaches into the part of the
 * picture no body can occupy — the empty wall band above the pass arch.
 *
 * Cost: one draw call. Every puff in the room is a quad in ONE merged
 * geometry whose positions and per-vertex alpha are rewritten each frame on
 * the CPU (16 puffs = 64 vertices, which is less work than one collider).
 * Alpha rides the fourth component of the colour attribute, so a single
 * MeshBasicMaterial fades each puff on its own without a material clone, a
 * shader, or a second draw.
 *
 * Measured anchors (first-person service camera, eye (0, 1.74, 3), fov 66,
 * 1280x577): the centre station sits at 4.4 m and 0.5 m of puff is ~57 px, so
 * a plume off the range is unmissable; the pale band above the arch
 * (screen y 46–200) has no geometry in it at all, which is why the top third
 * of the frame used to be dead — the tall plume is aimed at it deliberately.
 *
 * Honest limits: this is ambience, not simulation. It reads the store for one
 * number per station (heat) and nothing else. It freezes with a pause, holds
 * still under reduced motion, and never jumps on resume.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useGame } from "../game/state";
import { useReducedMotion } from "./artDirection";

/**
 * A puff drawn the way this room is drawn: opaque-ish lobes with a two-pixel
 * feather, not a photographic radial falloff.
 *
 * The first version used a soft gradient and it was, measured, invisible: two
 * frames 1.2 s apart changed the plume band by a mean of 6/255 while a control
 * patch of bare wall changed by 0.56 — real motion, no read. A pale, flat-lit
 * room eats soft white fog. Cookbook vapour — cream blobs with a defined rim —
 * survives it, and it is also the honest choice for an illustrated kitchen.
 */
function steamTexture(): CanvasTexture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const lobes: [number, number, number][] = [
    [0.46, 0.54, 0.3],
    [0.62, 0.46, 0.24],
    [0.5, 0.36, 0.22],
    [0.36, 0.44, 0.18],
  ];
  // feather first, then fill: overlapping soft-edged discs union into one
  // cloud with a single silhouette rather than four visible rings
  const feather = 2.6;
  for (const [cx, cy, r] of lobes) {
    for (let i = 0; i < 6; i++) {
      const rr = r * s - (i * feather) / 6;
      g.fillStyle = `rgba(254,252,248,${0.3 + i * 0.08})`;
      g.beginPath();
      g.arc(cx * s, cy * s, Math.max(1, rr), 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

interface Emitter {
  /** world x/z of the source */
  x: number;
  z: number;
  /** height of the source — the lip of a pan, the top of a pot */
  base: number;
  /** metres a puff climbs over one life */
  rise: number;
  /** metres of lateral wander at the top of the climb */
  drift: number;
  size0: number;
  size1: number;
  /** seconds for one puff, start to gone */
  life: number;
  /** which station's heat scales this plume; -1 = always on (the pot-wash) */
  station: number;
  puffs: number;
  /** peak alpha for this plume: pastry barely fogs, the wash-up bay fogs less */
  alpha: number;
}

/**
 * Where the heat actually is, in world coordinates. The station line rides
 * LINE_SHIFT (+1.6 z) so its counters sit at z ≈ -1.4; the wash-up bay is the
 * one thing that stayed back at z -4.3, which is why its plume is smaller and
 * greyer — it is the corner of the room, not the pass.
 */
const EMITTERS: Emitter[] = [
  // the range, centre station: the tallest plume, aimed at the dead band
  { x: 0.0, z: -1.42, base: 1.2, rise: 2.45, drift: 0.3, size0: 0.11, size1: 0.42, life: 5.0, station: 1, puffs: 5, alpha: 0.95 },
  // sauce, left station: lower and thinner off a pan, not a flattop
  { x: -3.6, z: -1.42, base: 1.16, rise: 1.45, drift: 0.2, size0: 0.09, size1: 0.32, life: 4.3, station: 0, puffs: 4, alpha: 0.9 },
  // pastry, right station: a short cold puff — nothing here is boiling
  { x: 3.6, z: -1.42, base: 1.12, rise: 0.85, drift: 0.15, size0: 0.075, size1: 0.25, life: 3.9, station: 2, puffs: 3, alpha: 0.78 },
  // the pot-wash bay, back left: dishwater, always going, never dramatic
  { x: -6.0, z: -4.02, base: 1.02, rise: 1.05, drift: 0.18, size0: 0.09, size1: 0.3, life: 4.6, station: -1, puffs: 3, alpha: 0.85 },
];

const PUFFS = EMITTERS.reduce((n, e) => n + e.puffs, 0);

const COOL = new Color("#ffffff");
const WARM = new Color("#fffdf6");
const GREY = new Color("#c8c1b5");

/** flat list of puffs, each remembering its emitter and its own phase */
const PUFF_SPEC = (() => {
  const out: { e: Emitter; ei: number; phase: number; wob: number; spin: number }[] = [];
  EMITTERS.forEach((e, ei) => {
    for (let i = 0; i < e.puffs; i++) {
      out.push({
        e,
        ei,
        // evenly spread with a deterministic jitter: no two puffs ever line up,
        // so the plume pulses instead of breathing like one lung
        phase: (i / e.puffs) + ((ei * 0.37 + i * 0.21) % 0.5) * 0.1,
        wob: 0.7 + ((ei * 13 + i * 7) % 11) * 0.06,
        spin: (ei + i) % 2 === 0 ? 1 : -1,
      });
    }
  });
  return out;
})();

export default function Steam() {
  const reduced = useReducedMotion();
  const tex = useMemo(() => steamTexture(), []);
  const life = useRef(0);
  const heat = useRef([0.55, 0.55, 0.55, 0.55]);

  const { geometry, alphas } = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(PUFFS * 4 * 3);
    const uv = new Float32Array(PUFFS * 4 * 2);
    const col = new Float32Array(PUFFS * 4 * 4);
    const idx = new Uint16Array(PUFFS * 6);
    for (let i = 0; i < PUFFS; i++) {
      const v = i * 4;
      uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
      idx.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
      for (let k = 0; k < 4; k++) col[(v + k) * 4 + 3] = 0;
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("uv", new BufferAttribute(uv, 2));
    geo.setAttribute("color", new BufferAttribute(col, 4));
    geo.setIndex(new BufferAttribute(idx, 1));
    geo.boundingSphere = null;
    return { geometry: geo, alphas: col };
  }, []);

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        vertexColors: true,
        toneMapped: false,
      }),
    [tex],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      tex.dispose();
    };
  }, [geometry, material, tex]);

  const camRight = useMemo(() => new Vector3(), []);
  const camUp = useMemo(() => new Vector3(), []);
  const p = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, dt) => {
    const st = useGame.getState();
    const running = !st.paused && st.phase !== "title" && st.phase !== "review";
    if (running && !reduced) life.current += Math.min(dt, 0.05);
    const t = life.current;
    const live = running && !reduced;

    // heat per station: the same three numbers the sound bed sizzles on, so
    // the plume and the noise are one event, not two systems agreeing
    for (let i = 0; i < 3; i++) {
      const c = st.cooks[i];
      let h = 0.5;
      if (!c) h = 0.5;
      else if (c.walkedOut) h = 0.2;
      else {
        const plating = st.tickets.some((k) => k.station === i && k.state === "plating");
        h = 0.42 + Math.min(1, c.overloadT / 8) * 0.4 + (plating ? 0.22 : 0);
        if (c.burning) h = 1.75;
      }
      heat.current[i] += (h - heat.current[i]) * Math.min(1, dt * 3);
    }
    heat.current[3] = 0.5; // the pot-wash: always washing, never a state

    const pos = geometry.attributes.position.array as Float32Array;
    alphas.fill(0);
    // billboard basis off the camera's own matrix — no per-puff quaternion
    const e = camera.matrixWorld.elements;
    camRight.set(e[0], e[1], e[2]).normalize();
    camUp.set(e[4], e[5], e[6]).normalize();

    const fade = (a: number) => (a < 0.12 ? a / 0.12 : a > 0.58 ? Math.max(0, (1 - a) / 0.42) : 1);

    PUFF_SPEC.forEach((spec, i) => {
      const em = spec.e;
      const age = ((t / em.life) + spec.phase) % 1;
      const h = Math.min(1.6, heat.current[em.station >= 0 ? em.station : 3]);
      const strength = live ? Math.min(1, 0.5 + h * 0.5) * fade(age) : 0;
      const grow = age * age * 0.35 + age * 0.65;
      const size = (em.size0 + (em.size1 - em.size0) * grow) * (0.8 + Math.min(1, h) * 0.3);
      p.set(
        em.x + Math.sin(age * 3.4 * spec.wob + spec.phase * 6.3) * em.drift * age,
        em.base + age * em.rise * (0.55 + Math.min(1.6, h) * 0.35),
        em.z + Math.cos(age * 2.7 * spec.wob + spec.phase * 4.1) * em.drift * 0.6 * age,
      );
      const ax = camRight.x * size;
      const ay = camRight.y * size;
      const az = camRight.z * size;
      const bx = camUp.x * size;
      const by = camUp.y * size;
      const bz = camUp.z * size;
      const v = i * 4 * 3;
      // rotate the quad a little per puff so the lobes never line up
      const rot = age * spec.spin * 1.6 + spec.phase * 7;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const put = (k: number, sx: number, sy: number) => {
        const rx = sx * cr - sy * sr;
        const ry = sx * sr + sy * cr;
        pos[v + k * 3] = p.x + ax * rx + bx * ry;
        pos[v + k * 3 + 1] = p.y + ay * rx + by * ry;
        pos[v + k * 3 + 2] = p.z + az * rx + bz * ry;
      };
      put(0, -1, -1);
      put(1, 1, -1);
      put(2, 1, 1);
      put(3, -1, 1);

      // colour: steam is warm near a burner and grey when something is burning
      const burn = em.station >= 0 ? Math.max(0, Math.min(0.8, (heat.current[em.station] - 1) / 0.9)) : 0;
      const warm = 0.5 + age * 0.5;
      const r = COOL.r * (1 - warm) + WARM.r * warm;
      const g2 = COOL.g * (1 - warm) + WARM.g * warm;
      const b2 = COOL.b * (1 - warm) + WARM.b * warm;
      const cr2 = r * (1 - burn) + GREY.r * burn;
      const cg2 = g2 * (1 - burn) + GREY.g * burn;
      const cb2 = b2 * (1 - burn) + GREY.b * burn;
      const a = strength * em.alpha;
      for (let k = 0; k < 4; k++) {
        const o = (i * 4 + k) * 4;
        alphas[o] = cr2;
        alphas[o + 1] = cg2;
        alphas[o + 2] = cb2;
        alphas[o + 3] = a;
      }
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <mesh
      name="steam"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={4}
      // the room's own lights must not re-light steam; basic material ignores
      // them, and no shadow is cast or received from vapour
    />
  );
}
