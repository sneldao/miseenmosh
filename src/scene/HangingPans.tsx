/**
 * The pan rail over the pass.
 *
 * The top third of the service frame was dead: measured with the frame's own
 * picking instrument, the band from screen y 46 to 200 holds nothing but a
 * pale tiled wall, and a wall that pale and that empty is why a room reads as
 * a set rather than a place. A kitchen tells you what it is from its pans, and
 * the passthrough wall is the one surface every first-person frame is
 * guaranteed to contain — so the rail goes there, hanging above the arch,
 * filling 150 px of nothing with shape.
 *
 * Design rules, all of them consequences of standing 7.5 m away:
 *
 *  1. Silhouette, not detail. At 7.5 m one metre is ~66 px, so a 0.34 m pan is
 *     22 px — enough for an outline and no more. Every pan is a disc facing the
 *     room with its handle up to a hook, because that is the one shape that
 *     reads at 22 px as "pan" rather than "blob".
 *  2. Variety is the point. Seven pans, three sizes, two metals, unevenly
 *     spaced and hung slightly out of level — a row of identical discs is a
 *     pattern, and a pattern is wallpaper.
 *  3. One merged geometry per silhouette, shared down the row: seven pans cost
 *     seven draws and seven geometries, and the rail plus its hooks is one
 *     more. The whole feature is eight.
 *  4. They answer the player. A rock travels down the bar when a plate leaves
 *     the pass — one number off the store, and the room flinches with you.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useGame } from "../game/state";
import { COPPER, useReducedMotion } from "./artDirection";

const STEEL = "#7c8288";
const IRON = "#3d3a36";
const RAIL_Y = 4.42;

function tint(geo: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new BufferAttribute(arr, 3));
  return geo;
}

/** A pan hanging face-on: shallow bowl, rim, handle up to the hook. Merged to
 *  one geometry so a pan costs one draw, not three. The pivot is the hook, so
 *  the whole object swings as one. */
function panGeometry(radius: number, depth: number, colour: string, handle: number): BufferGeometry {
  const bowl = tint(new CylinderGeometry(radius, radius * 0.8, depth, 18, 1, false), colour);
  bowl.rotateX(Math.PI / 2);
  bowl.translate(0, -0.44, 0);
  const rim = tint(new TorusGeometry(radius, 0.012, 5, 20), colour);
  rim.translate(0, -0.44, depth * 0.5);
  const stem = tint(new BoxGeometry(0.024, handle, 0.024), IRON);
  stem.translate(0, -0.44 + radius * 0.75 + handle * 0.5, 0);
  const grip = tint(new CylinderGeometry(0.016, 0.016, handle * 0.7, 8), colour);
  grip.translate(0, -0.44 + radius * 0.75 + handle * 0.55, 0);
  return mergeGeometries([bowl, rim, stem, grip])!;
}

/** unevenly spaced, unevenly sized, hung slightly out of level */
const ROW = [
  { x: -3.15, r: 0.2, d: 0.12, c: COPPER, h: 0.3, rest: 0.03 },
  { x: -2.25, r: 0.145, d: 0.09, c: STEEL, h: 0.26, rest: -0.02 },
  { x: -1.42, r: 0.235, d: 0.13, c: COPPER, h: 0.34, rest: 0.015 },
  { x: -0.2, r: 0.125, d: 0.08, c: STEEL, h: 0.24, rest: 0.04 },
  { x: 0.95, r: 0.19, d: 0.11, c: COPPER, h: 0.3, rest: -0.03 },
  { x: 1.75, r: 0.16, d: 0.1, c: STEEL, h: 0.27, rest: 0.01 },
  { x: 2.72, r: 0.215, d: 0.125, c: COPPER, h: 0.32, rest: -0.015 },
];

export default function HangingPans() {
  const reduced = useReducedMotion();
  const nodes = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const served = useRef(-1);
  const ringAt = useRef(-10);

  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 }),
    [],
  );
  const geos = useMemo(() => ROW.map((p) => panGeometry(p.r, p.d, p.c, p.h)), []);

  const rail = useMemo(() => {
    const bar = tint(new CylinderGeometry(0.024, 0.024, 7.4, 10), IRON);
    bar.rotateZ(Math.PI / 2);
    bar.translate(0, RAIL_Y, 0);
    const parts: BufferGeometry[] = [bar];
    for (const p of ROW) {
      const drop = tint(new CylinderGeometry(0.008, 0.008, 0.09, 6), IRON);
      drop.translate(p.x, RAIL_Y - 0.055, 0);
      parts.push(drop);
      const hook = tint(new TorusGeometry(0.022, 0.007, 4, 10, Math.PI), IRON);
      hook.translate(p.x, RAIL_Y - 0.11, 0);
      parts.push(hook);
    }
    // two brackets carrying it back to the wall, so it is not floating
    for (const bx of [-3.6, 3.6]) {
      const arm = tint(new BoxGeometry(0.05, 0.05, 0.52), IRON);
      arm.translate(bx, RAIL_Y, -0.25);
      parts.push(arm);
    }
    return mergeGeometries(parts)!;
  }, []);
  const railMat = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.4 }),
    [],
  );

  // one clock for the whole rail: seven useFrames would be seven passes over
  // the same arithmetic
  useFrame((_, dt) => {
    const st = useGame.getState();
    const step = Math.min(dt, 0.05);
    if (!st.paused && st.phase !== "title" && st.phase !== "review") clock.current += step;
    if (st.served !== served.current) {
      if (served.current >= 0) ringAt.current = clock.current;
      served.current = st.served;
    }
    const since = clock.current - ringAt.current;
    const ring = !reduced && since < 1.25 ? Math.max(0, 1 - since / 1.25) : 0;
    ROW.forEach((p, i) => {
      const g = nodes.current[i];
      if (!g) return;
      // the jolt travels down the bar: each pan answers a beat after the last
      const local = Math.max(0, since - i * 0.055);
      const swing = ring > 0 && local < 1.1 ? Math.sin(local * 11 - i * 0.7) * ring * 0.075 : 0;
      const breath = reduced ? 0 : Math.sin(clock.current * 0.42 + i * 0.9) * 0.008;
      g.rotation.z = p.rest + breath + swing;
    });
  });

  return (
    <group name="pan-rail" position={[0, 0, -4.6]}>
      <mesh geometry={rail} material={railMat} />
      {ROW.map((p, i) => (
        <group
          key={i}
          position={[p.x, RAIL_Y - 0.11, 0]}
          ref={(n) => {
            nodes.current[i] = n;
          }}
        >
          <mesh geometry={geos[i]} material={material} />
        </group>
      ))}
    </group>
  );
}
