/**
 * The line is hot.
 *
 * A kitchen with nothing rising off it reads as a diorama. Steam is the
 * cheapest, strongest hive signal there is, because it is the one thing in
 * frame that changes shape, drifts sideways, and reaches into the part of the
 * picture no body can occupy — the empty wall band above the pass arch.
 *
 * Cost: **one draw call for the whole room.** Every puff from every source is a
 * quad in one merged geometry whose positions and per-vertex alpha are
 * rewritten each frame on the CPU (26 puffs = 104 vertices, less work than one
 * collider). Alpha rides the fourth component of the colour attribute, so a
 * single `MeshBasicMaterial` fades each puff on its own without a material
 * clone, a shader, or a second draw.
 *
 * This is also the only steam renderer in the game. The equipment used to pool
 * ten `THREE.Sprite`s — ten draws — until the budget in `steam.ts` made it
 * obvious that the cap was written in puffs and paid in draws. Equipment now
 * publishes a source instead of drawing anything; see `equipment/Steam.tsx`.
 *
 * Measured anchors (first-person service camera, eye (0, 1.74, 3), fov 66,
 * 1280x577): the centre station sits at 4.4 m and 0.5 m of puff is ~57 px, so
 * a plume off the range is unmissable; a puff at the top of that climb lands at
 * screen y ≈ 123, which is the pale band above the arch — the part of the frame
 * with the least in it.
 *
 * Honest limits: this is ambience, not simulation. Station plumes read the
 * store for one number each (heat); equipment plumes read the level their
 * owner pushes. It freezes with a pause, holds still under reduced motion, and
 * never jumps on resume.
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
import { STEAM_MAX_SLOTS, steamSources } from "./steamBudget";

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

const COOL = new Color("#ffffff");
const WARM = new Color("#fffdf6");
const GREY = new Color("#c8c1b5");

export default function Steam() {
  const reduced = useReducedMotion();
  const tex = useMemo(() => steamTexture(), []);
  const life = useRef(0);
  /** per-station heat, plus slot 3 held at a constant simmer for the wash-up */
  const heat = useRef([0.55, 0.55, 0.55, 0.5]);

  const { geometry, colours } = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(STEAM_MAX_SLOTS * 4 * 3);
    const uv = new Float32Array(STEAM_MAX_SLOTS * 4 * 2);
    const col = new Float32Array(STEAM_MAX_SLOTS * 4 * 4);
    const idx = new Uint16Array(STEAM_MAX_SLOTS * 6);
    for (let i = 0; i < STEAM_MAX_SLOTS; i++) {
      const v = i * 4;
      uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
      idx.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("uv", new BufferAttribute(uv, 2));
    geo.setAttribute("color", new BufferAttribute(col, 4));
    geo.setIndex(new BufferAttribute(idx, 1));
    return { geometry: geo, colours: col };
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
  /** stable per-slot jitter, so puffs never line up even as slots are reused */
  const jitter = useMemo(
    () => Array.from({ length: STEAM_MAX_SLOTS }, (_, i) => ({
      phase: ((i * 0.37) % 0.5) * 0.1 + (i / STEAM_MAX_SLOTS) * 0.5,
      wob: 0.7 + ((i * 13) % 11) * 0.06,
      spin: i % 2 === 0 ? 1 : -1,
    })),
    [],
  );

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
    heat.current[3] = 0.5;

    const sources = steamSources();
    const pos = geometry.attributes.position.array as Float32Array;
    colours.fill(0);
    // billboard basis off the camera's own matrix — no per-puff quaternion
    const e = camera.matrixWorld.elements;
    camRight.set(e[0], e[1], e[2]).normalize();
    camUp.set(e[4], e[5], e[6]).normalize();

    const fade = (a: number) => (a < 0.12 ? a / 0.12 : a > 0.58 ? Math.max(0, (1 - a) / 0.42) : 1);

    let slot = 0;
    for (const src of sources) {
      // equipment pushes a level; the line's own plumes read the fire
      const driven = src.station < 0 ? src.level : Math.min(1.6, heat.current[src.station]);
      const burn = src.station >= 0 ? Math.max(0, Math.min(0.8, (heat.current[src.station] - 1) / 0.9)) : 0;
      const strength = src.station < 0
        ? src.level
        : Math.min(1, 0.5 + driven * 0.5);
      const growRise = src.station < 0 ? 1 : 0.55 + Math.min(1.6, driven) * 0.35;
      const growSize = src.station < 0 ? 1 : 0.8 + Math.min(1, driven) * 0.3;

      for (let i = 0; i < src.puffs && slot < STEAM_MAX_SLOTS; i++, slot++) {
        const j = jitter[slot];
        const age = ((t / src.life) + i / src.puffs + j.phase) % 1;
        const a = live ? strength * fade(age) * src.alpha : 0;
        const grow = age * age * 0.35 + age * 0.65;
        const size = (src.size0 + (src.size1 - src.size0) * grow) * growSize;
        p.set(
          src.x + Math.sin(age * 3.4 * j.wob + j.phase * 6.3) * src.drift * age,
          src.y + age * src.rise * growRise,
          src.z + Math.cos(age * 2.7 * j.wob + j.phase * 4.1) * src.drift * 0.6 * age,
        );
        const ax = camRight.x * size;
        const ay = camRight.y * size;
        const az = camRight.z * size;
        const bx = camUp.x * size;
        const by = camUp.y * size;
        const bz = camUp.z * size;
        const v = slot * 4 * 3;
        const rot = age * j.spin * 1.6 + j.phase * 7;
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

        // colour: steam is warm near a burner and grey when something is
        // burning, and the grey stops short of charcoal — a dark plume over the
        // cream rail reads as a coffee stain
        const warm = 0.5 + age * 0.5;
        const r = COOL.r * (1 - warm) + WARM.r * warm;
        const g2 = COOL.g * (1 - warm) + WARM.g * warm;
        const b2 = COOL.b * (1 - warm) + WARM.b * warm;
        const rr = r * (1 - burn) + GREY.r * burn;
        const gg = g2 * (1 - burn) + GREY.g * burn;
        const bb = b2 * (1 - burn) + GREY.b * burn;
        for (let k = 0; k < 4; k++) {
          const o = (slot * 4 + k) * 4;
          colours[o] = rr;
          colours[o + 1] = gg;
          colours[o + 2] = bb;
          colours[o + 3] = a;
        }
      }
    }
    // unused slots are already alpha 0 and sit at the origin; the geometry has
    // no bounding sphere because it is never frustum-culled

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
      // basic material: the room's lights must not re-light vapour, and vapour
      // neither casts nor receives a shadow
    />
  );
}
