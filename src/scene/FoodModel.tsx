import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, CapsuleGeometry, ExtrudeGeometry, InstancedMesh, LatheGeometry, Matrix4, Quaternion, Euler, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, Vector3, Vector2 } from "three";
import { INK, VERMILION } from "./artDirection";
import { type DishCondition, conditionFromCooking } from "../game/culinary";
import StaticMerge from "./StaticMerge";

export interface FoodModelProps {
  dish: string;
  quality?: number; // presentation evidence only — the game rules change next step
  sauce?: "saved" | "split" | null;
  finish?: "classic" | "herb"; // supported Wellington revision, future state wiring
  condition?: DishCondition; // canonical assessment — drives defects when present
  scale?: number;
}

const FISH_PINK = "#e8a0a0";
const MEAT_PINK = "#c97878";
const PASTRY = "#d9a04a";
const PASTRY_PALE = "#e2bd7d";
const PASTRY_DARK = "#7d5226";
const LEAF = "#4a7a3a";
const CREAM_FOOD = "#efe0b8";
const GRAVY = "#6a4526";
const BERRY = "#8a2a3a";

/** Deterministic scatter: no random(), the same plate every frame. */
const det = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

function fishShape(len: number, tall: number) {
  const s = new Shape();
  s.moveTo(-len, 0);
  s.quadraticCurveTo(-len * 0.5, tall, 0, tall * 0.85);
  s.quadraticCurveTo(len * 0.7, tall * 0.6, len, tall * 0.25);
  s.lineTo(len * 1.12, tall * 0.55); // tail top
  s.lineTo(len * 1.02, 0); // tail notch
  s.lineTo(len * 1.12, -tall * 0.4); // tail bottom
  s.lineTo(len, -tall * 0.1);
  s.quadraticCurveTo(len * 0.5, -tall * 0.55, 0, -tall * 0.6);
  s.quadraticCurveTo(-len * 0.6, -tall * 0.5, -len, 0);
  return s;
}

function loafShape(len: number, tall: number) {
  const s = new Shape();
  s.moveTo(-len, 0);
  s.lineTo(len, 0);
  s.quadraticCurveTo(len * 1.02, tall * 0.5, len * 0.92, tall * 0.8);
  s.quadraticCurveTo(len * 0.4, tall, 0, tall);
  s.quadraticCurveTo(-len * 0.4, tall, -len * 0.92, tall * 0.8);
  s.quadraticCurveTo(-len * 1.02, tall * 0.5, -len, 0);
  return s;
}

function inkLoop(r: number, y: number, tube = 0.006) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, tube, 6, 28]} />
      <meshStandardMaterial color={INK} roughness={0.85} />
    </mesh>
  );
}

/** where the sauce sits on the plate: in front of the food, inside the rim —
 *  shared with PlateCorrection so the whisk lands in the pool */
export const SAUCE_CENTRE = [0.08, 0.30] as const;
/** Saved sauce forms one pool; split sauce separates into pools and oil beads.
 *  Pale lemon for scallop, herb sauce for mullet, gravy for Wellington and lamb. */
function Sauce({ mode, color = GRAVY }: { mode: "saved" | "split"; color?: string }) {
  if (mode === "saved") {
    return (
      <mesh position={[SAUCE_CENTRE[0], 0.004, SAUCE_CENTRE[1]]} scale={[1, 0.10, 0.45]}>
        <sphereGeometry args={[0.16, 18, 10]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    );
  }
  return (
    <group>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          position={[
            SAUCE_CENTRE[0] + (i === 0 ? -0.08 : 0.08),
            0.004,
            SAUCE_CENTRE[1] + (i === 0 ? -0.02 : 0.02),
          ]}
          scale={[1, 0.11, 0.6]}
        >
          <sphereGeometry args={[0.07, 14, 8]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      {[0.45, 1.9, 3.1, 4.7].map((a, i) => (
        <mesh
          key={i}
          position={[
            SAUCE_CENTRE[0] + Math.cos(a) * 0.135,
            0.012,
            SAUCE_CENTRE[1] + Math.sin(a) * 0.06,
          ]}
        >
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#c99a4a" roughness={0.2} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

const SAUCE_COLOR: Record<string, string> = {
  "Scallop, one": "#e8d9a0",
  "Red mullet, crying": "#7b8a4a",
};

function wellingtonSection() {
  // rounded cross-section: X = width across the loaf, Y = height
  const s = new Shape();
  s.moveTo(-0.14, 0.02);
  s.lineTo(0.14, 0.02);
  s.quadraticCurveTo(0.18, 0.08, 0.15, 0.17);
  s.quadraticCurveTo(0.08, 0.25, 0, 0.25);
  s.quadraticCurveTo(-0.08, 0.25, -0.15, 0.17);
  s.quadraticCurveTo(-0.18, 0.08, -0.14, 0.02);
  return s;
}

/** sparse carved ink strokes on near-white — a multiply-style crust map that
 *  marks pastry without blackening it */
let hatchTex: CanvasTexture | null = null;
function hatchTexture(): CanvasTexture {
  if (hatchTex) return hatchTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "rgba(48,44,43,0.16)";
  g.lineWidth = 1.5;
  [[8, 12, 24, 8], [30, 20, 50, 14], [12, 34, 30, 40], [40, 44, 56, 38], [6, 52, 22, 58]].forEach(
    ([x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  );
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  hatchTex = t;
  return t;
}

/** an elliptical cap in the YZ plane (a cut face, normal +X) */
function Cap({ radii, y, color, x = 0 }: { radii: [number, number]; y: number; color: string; x?: number }) {
  return (
    <group position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh scale={[radii[0], radii[1], 1]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color={color} roughness={0.7} side={2} />
      </mesh>
    </group>
  );
}

function Wellington({ finish, technique }: { finish: "classic" | "herb"; technique: DishCondition["technique"] }) {
  const { loaf, strip, slice } = useMemo(() => {
    const section = wellingtonSection();
    const loaf = new ExtrudeGeometry(section, {
      depth: 0.4, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3,
    });
    loaf.rotateY(Math.PI / 2); // length along X, width along Z, Y stays food height
    loaf.translate(-0.22, 0, 0);
    // a strip that rides the dome: the section's top arc, given thin thickness
    const stripShape = new Shape();
    stripShape.moveTo(-0.15, 0.155);
    stripShape.quadraticCurveTo(-0.08, 0.235, 0, 0.235);
    stripShape.quadraticCurveTo(0.08, 0.235, 0.15, 0.155);
    stripShape.lineTo(0.15, 0.17);
    stripShape.quadraticCurveTo(0.08, 0.25, 0, 0.25);
    stripShape.quadraticCurveTo(-0.08, 0.25, -0.15, 0.17);
    const strip = new ExtrudeGeometry(stripShape, { depth: 0.03, bevelEnabled: false });
    strip.rotateY(Math.PI / 2);
    const slice = new ExtrudeGeometry(section, { depth: 0.045, bevelEnabled: false });
    slice.rotateY(Math.PI / 2);
    return { loaf, strip, slice };
  }, []);
  useLayoutEffect(() => () => { loaf.dispose(); strip.dispose(); slice.dispose(); }, [loaf, strip, slice]);
  const crust = technique === "under" ? PASTRY_PALE : technique === "over" ? PASTRY_DARK : PASTRY;
  const centre = technique === "under" ? "#a83a30" : technique === "over" ? "#8a7a68" : MEAT_PINK;
  const stripColor = technique === "over" ? "#5f3d1d" : technique === "under" ? "#d8b078" : "#e8bd6a";
  const duxelles = "#4a3220";
  return (
    <group rotation={[0, -0.45, 0]}>
      <mesh geometry={loaf} castShadow>
        <meshStandardMaterial color={crust} roughness={0.7} map={hatchTexture()} />
      </mesh>
      {/* pastry bands following the dome, crossed by a lengthwise seam */}
      {[-0.16, -0.08, 0, 0.08, 0.14].map((x) => (
        <mesh key={x} geometry={strip} position={[x, 0.008, 0]}>
          <meshStandardMaterial color={stripColor} roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[-0.01, 0.253, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.008, 0.022]} />
        <meshStandardMaterial color={stripColor} roughness={0.65} />
      </mesh>
      {/* sliced end at x .20: pastry rim, duxelles ring, meat heart */}
      <group position={[0.202, 0, 0]}>
        <Cap radii={[0.14, 0.11]} y={0.135} color={crust} />
        <Cap radii={[0.11, 0.085]} y={0.135} color={duxelles} x={0.004} />
        <Cap radii={[0.075, 0.06]} y={0.135} color={centre} x={0.008} />
      </group>
      {/* two separately cut slices beside it */}
      {[0, 1].map((i) => (
        <group key={i} position={[0.26 + i * 0.08, 0, -0.03 + i * 0.07]} rotation={[0, 0.15 + i * 0.2, 0]}>
          <mesh geometry={slice}>
            <meshStandardMaterial color={crust} roughness={0.7} map={hatchTexture()} />
          </mesh>
          <Cap radii={[0.11, 0.085]} y={0.135} color={duxelles} x={0.046} />
          <Cap radii={[0.075, 0.06]} y={0.135} color={centre} x={0.05} />
        </group>
      ))}
      {/* herb finish: thyme and parsley laid on the crust */}
      {finish === "herb" ? (
        <group position={[0, 0.26, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[(i - 1.5) * 0.07, 0, (det(i, 7) - 0.5) * 0.1]} rotation={[0, det(i, 9) * 3, 0]}>
              <boxGeometry args={[0.045, 0.006, 0.018]} />
              <meshStandardMaterial color={LEAF} roughness={0.8} />
            </mesh>
          ))}
          {[-0.05, 0.05].map((z) => (
            <mesh key={z} position={[0.02, -0.01, z]} rotation={[0, 0.5, 0]}>
              <sphereGeometry args={[0.014, 6, 6]} />
              <meshStandardMaterial color="#3d5a2e" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ) : (
        <group position={[-0.16, 0.25, 0.06]}>
          <mesh rotation={[0, 0, Math.PI / 2.4]}>
            <cylinderGeometry args={[0.004, 0.004, 0.12, 5]} />
            <meshStandardMaterial color="#3d5a2e" roughness={0.9} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.02 * i, 0.02 + i * 0.008, 0]}>
              <sphereGeometry args={[0.011, 6, 6]} />
              <meshStandardMaterial color={LEAF} roughness={0.85} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Scallop({ technique }: { technique: DishCondition["technique"] }) {
  // a wedge is cut away so the centre is readable: body + cap share the
  // missing sector, two radial faces close it
  const bodyH = technique === "over" ? 0.07 : 0.1;
  const faceColor =
    technique === "under" ? "#cfd8d0" : technique === "over" ? "#c8b090" : "#f5eedd";
  return (
    <group>
      <mesh position={[0, bodyH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.115, bodyH, 20, 1, false, Math.PI / 4, Math.PI * 1.75]} />
        <meshStandardMaterial color={technique === "under" ? "#d8c8b0" : technique === "over" ? "#b89a78" : "#f2e6cf"} roughness={0.55} />
      </mesh>
      <mesh position={[0, bodyH + 0.003, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.006, 20, 1, false, Math.PI / 4, Math.PI * 1.75]} />
        <meshStandardMaterial color={technique === "under" ? "#8a5a2a" : technique === "over" ? "#6a4520" : "#c07a2e"} roughness={0.5} />
      </mesh>
      {/* radial cut faces at the two edges of the missing wedge */}
      {[0, Math.PI / 4].map((a) => (
        <mesh
          key={a}
          position={[0.065 * Math.sin(a), bodyH / 2, 0.065 * Math.cos(a)]}
          rotation={[0, a - Math.PI / 2, 0]}
        >
          <planeGeometry args={[0.13, bodyH]} />
          <meshStandardMaterial
            color={faceColor}
            roughness={0.45}
            side={2}
            transparent={technique === "under"}
            opacity={technique === "under" ? 0.85 : 1}
          />
        </mesh>
      ))}
      {inkLoop(0.13, 0.052)}
      <mesh position={[-0.1, bodyH + 0.02, 0.02]} rotation={[0.3, 0, 0.4]}>
        <boxGeometry args={[0.06, 0.008, 0.025]} />
        <meshStandardMaterial color={LEAF} roughness={0.8} />
      </mesh>
    </group>
  );
}

function RedMullet({ technique }: { technique: DishCondition["technique"] }) {
  const fillet = useMemo(() => {
    const g = new ExtrudeGeometry(fishShape(0.28, 0.09), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    g.translate(0, 0.02, -0.025);
    return g;
  }, []);
  useLayoutEffect(() => () => fillet.dispose(), [fillet]);
  return (
    <group>
      <mesh geometry={fillet} castShadow>
        <meshStandardMaterial color={technique === "under" ? "#d8b8b0" : technique === "over" ? "#9a6a55" : FISH_PINK} roughness={0.55} />
      </mesh>
      {/* silvery skin sheen + score marks */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * 0.1, 0.075, 0]} rotation={[0, 0.25, 0]}>
          <boxGeometry args={[0.012, 0.006, 0.1]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      {/* lemon wedge */}
      <group position={[0.22, 0.02, 0.16]} rotation={[0.2, 0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.025, 16, 1, false, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f0d95a" roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
          <torusGeometry args={[0.055, 0.008, 6, 12, Math.PI / 2]} />
          <meshStandardMaterial color="#e8e0a8" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Risotto({ technique }: { technique: DishCondition["technique"] }) {
  const grains = useRef<InstancedMesh>(null);
  const grainGeo = useMemo(() => new CapsuleGeometry(0.008, 0.025, 3, 5), []);
  useLayoutEffect(() => () => grainGeo.dispose(), [grainGeo]);
  const count = 18;
  useLayoutEffect(() => {
    const im = grains.current;
    if (!im) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const v = new Vector3();
    const one = new Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      v.set(
        (det(i, 1) - 0.5) * 0.3,
        0.05 + det(i, 2) * (technique === "under" ? 0.06 : 0.04),
        (det(i, 3) - 0.5) * 0.3
      );
      e.set(det(i, 4) * 3, det(i, 5) * 3, det(i, 6) * 3);
      q.setFromEuler(e);
      m.compose(v, q, one);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  }, [technique]);
  return (
    <group>
      <mesh position={[0, 0.03, 0]} scale={[1, technique === "over" ? 0.95 : technique === "under" ? 0.45 : 0.55, 1]} castShadow>
        <sphereGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color={technique === "under" ? "#d8c890" : technique === "over" ? "#e8d09a" : "#efe0b0"} roughness={0.7} />
      </mesh>
      {technique === "under" && (
        <mesh position={[0.02, 0.008, 0.04]} scale={[1, 0.08, 1]}>
          <sphereGeometry args={[0.19, 14, 8]} />
          <meshStandardMaterial color="#e8dcae" roughness={0.35} />
        </mesh>
      )}
      <instancedMesh ref={grains} args={[grainGeo, undefined, count]}>
        <meshStandardMaterial color={technique === "under" ? "#faf0cc" : "#f5e9c0"} roughness={0.65} />
      </instancedMesh>
      {/* saffron threads */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(det(i, 11) - 0.5) * 0.16, 0.1, (det(i, 13) - 0.5) * 0.16]} rotation={[0, det(i, 15) * 3, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.003, 0.05, 4]} />
          <meshStandardMaterial color={VERMILION} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function LambChop({ technique }: { technique: DishCondition["technique"] }) {
  const meat = useMemo(() => {
    const s = new Shape();
    s.absarc(0, 0, 0.12, 0, Math.PI * 2);
    s.holes.push(new Shape().absarc(0.02, 0.01, 0.035, 0, Math.PI * 2, true));
    const g = new ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useLayoutEffect(() => () => meat.dispose(), [meat]);
  return (
    <group>
      <mesh geometry={meat} position={[0, 0.02, 0]} castShadow>
        <meshStandardMaterial color={technique === "under" ? "#7a3a34" : technique === "over" ? "#8a8278" : "#a86a58"} roughness={0.7} />
      </mesh>
      {/* cut face + bone */}
      <mesh position={[0, 0.052, 0]} scale={[0.8, 1, 0.8]}>
        <cylinderGeometry args={[0.095, 0.095, 0.01, 16]} />
        <meshStandardMaterial color={MEAT_PINK} roughness={0.7} />
      </mesh>
      <mesh position={[0.14, 0.04, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
        <meshStandardMaterial color="#efe6d0" roughness={0.7} />
      </mesh>
      <mesh position={[0.21, 0.04, 0.02]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#efe6d0" roughness={0.7} />
      </mesh>

    </group>
  );
}

function Pommes({ technique }: { technique: DishCondition["technique"] }) {
  const swirl = useMemo(() => {
    const pts = [new Vector2(0.001, 0), new Vector2(0.16, 0.01), new Vector2(0.13, 0.05), new Vector2(0.09, 0.09), new Vector2(0.05, 0.12), new Vector2(0.001, 0.14)];
    return new LatheGeometry(pts, 24);
  }, []);
  useLayoutEffect(() => () => swirl.dispose(), [swirl]);
  return (
    <group>
      <mesh geometry={swirl} scale={technique === "over" ? [0.8, 1.35, 0.8] : [1, 1, 1]} castShadow>
        <meshStandardMaterial color={technique === "under" ? "#d0bf98" : technique === "over" ? "#e8d8b0" : CREAM_FOOD} roughness={0.5} />
      </mesh>
      {/* undercooked: distinct lumps the masher missed */}
      {technique === "under" &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = det(i, 21) * Math.PI * 2;
          const r = 0.05 + det(i, 23) * 0.07;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.045 + det(i, 25) * 0.06, Math.sin(a) * r]}>
              <sphereGeometry args={[0.016 + det(i, 27) * 0.008, 7, 6]} />
              <meshStandardMaterial color="#e0d0a8" roughness={0.8} />
            </mesh>
          );
        })}
      {/* butter well */}
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.014, 12]} />
        <meshStandardMaterial color="#e8b93a" roughness={0.35} />
      </mesh>
      {/* spoon ribbon across */}
      <mesh position={[0.08, 0.05, 0.1]} rotation={[0.5, 0.4, 0.9]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
        <meshStandardMaterial color={INK} metalness={0.5} roughness={0.4} />
      </mesh>
      {inkLoop(0.155, 0.012)}
    </group>
  );
}

function Foie({ technique, collapsed }: { technique: DishCondition["technique"]; collapsed: boolean }) {
  return (
    <group>
      {[-0.1, 0.11].map((px, i) => (
        <group key={i} position={[px, 0, i * 0.06 - 0.02]} scale={technique === "under" ? [1.1, 0.6, 1.1] : [1, 1, 1]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            {/* a collapsed medallion loses a sector — a torn piece sits beside it */}
            <cylinderGeometry args={[0.095, 0.095, 0.08, 18, 1, false, 0, collapsed && i === 0 ? Math.PI * 1.65 : Math.PI * 2]} />
            <meshStandardMaterial color={technique === "under" ? "#c8a88a" : technique === "over" ? "#a8886a" : "#d9b99a"} roughness={0.55} side={2} />
          </mesh>
          <mesh position={[0, 0.082, 0]}>
            <cylinderGeometry args={[0.078, 0.078, 0.004, 18, 1, false, 0, collapsed && i === 0 ? Math.PI * 1.65 : Math.PI * 2]} />
            <meshStandardMaterial color="#efd9c0" roughness={0.6} side={2} />
          </mesh>
          {/* overcooked foie dries into crumbles on the surface */}
          {technique === "over" &&
            [0, 1, 2].map((j) => (
              <mesh key={j} position={[(det(j, 31 + i) - 0.5) * 0.12, 0.09, (det(j, 33 + i) - 0.5) * 0.12]}>
                <sphereGeometry args={[0.009, 6, 5]} />
                <meshStandardMaterial color="#8a6a52" roughness={0.9} />
              </mesh>
            ))}
        </group>
      ))}
      {collapsed && (
        <group position={[-0.02, 0, 0.1]}>
          {[0, 1].map((i) => (
            <mesh key={i} position={[det(i, 37) * 0.05, 0.015 + i * 0.01, det(i, 39) * 0.04]}>
              <boxGeometry args={[0.03, 0.025, 0.028]} />
              <meshStandardMaterial color="#d9b99a" roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}
      {/* toast triangle */}
      <mesh position={[0.02, 0.02, 0.16]} rotation={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.025, 3]} />
        <meshStandardMaterial color="#c8934a" roughness={0.75} />
      </mesh>
      {/* fruit garnish */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.16 + i * 0.05, 0.025, 0.14 + i * 0.03]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={BERRY} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Souffle({ technique, collapsed }: { technique: DishCondition["technique"]; collapsed: boolean }) {
  const ramekin = useMemo(() => {
    const pts = [new Vector2(0.001, 0), new Vector2(0.11, 0), new Vector2(0.115, 0.12), new Vector2(0.105, 0.12), new Vector2(0.1, 0.02), new Vector2(0.001, 0.02)];
    return new LatheGeometry(pts, 24);
  }, []);
  useLayoutEffect(() => () => ramekin.dispose(), [ramekin]);
  return (
    <group>
      <mesh geometry={ramekin} castShadow>
        <meshStandardMaterial color="#f2ead6" roughness={0.7} />
      </mesh>
      {/* ribbed walls */}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 6, 0]}>
          <mesh position={[0.112, 0.06, 0]}>
            <boxGeometry args={[0.006, 0.11, 0.006]} />
            <meshStandardMaterial color="#e0d4ba" roughness={0.75} />
          </mesh>
        </group>
      ))}
      {/* the rise: proud dome, or a sad collapse */}
      <mesh position={[0, collapsed ? 0.125 : 0.16, 0]} scale={[1, collapsed ? 0.3 : 1, 1]} castShadow>
        <sphereGeometry args={[0.105, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={collapsed ? "#b08a5a" : technique === "under" ? "#d8c090" : technique === "over" ? "#8a5c30" : "#e2b25a"} roughness={0.6} />
      </mesh>
      {collapsed && (
        <mesh position={[0, 0.13, 0]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[0.05, 0.006, 0.008]} />
          <meshStandardMaterial color={INK} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function Tart({ technique, collapsed }: { technique: DishCondition["technique"]; collapsed: boolean }) {
  const shell = useMemo(() => {
    const pts = [new Vector2(0.001, 0), new Vector2(0.13, 0.005), new Vector2(0.145, 0.04), new Vector2(0.15, 0.055)];
    // a collapsed shell loses a sector outright
    return new LatheGeometry(pts, 28, 0, collapsed ? Math.PI * 1.6 : Math.PI * 2);
  }, [collapsed]);
  useLayoutEffect(() => () => shell.dispose(), [shell]);
  // LatheGeometry sweeps from +Z around +Y — a missing 1.6π..2π sector takes
  // flutes 11..13 with it; crumbs spill into that same gap
  const flutes = collapsed ? Array.from({ length: 11 }, (_, i) => i) : Array.from({ length: 14 }, (_, i) => i);
  return (
    <group>
      <mesh geometry={shell} castShadow>
        <meshStandardMaterial color={technique === "under" ? "#caa870" : technique === "over" ? "#8a5c2e" : "#caa258"} roughness={0.7} side={2} />
      </mesh>
      {/* fluted rim — three flutes go with the missing sector */}
      {flutes.map((i) => {
        const a = (i * Math.PI * 2) / 14;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.145, 0.055, Math.cos(a) * 0.145]}>
            <sphereGeometry args={[0.02, 8, 6]} />
            <meshStandardMaterial color={technique === "under" ? "#c8a070" : technique === "over" ? "#8a5c2e" : "#d9b268"} roughness={0.7} />
          </mesh>
        );
      })}
      {/* crumbs where the rim gave way */}
      {collapsed &&
        [0, 1, 2].map((i) => {
          const a = Math.PI * (1.68 + i * 0.1);
          return (
            <mesh key={i} position={[Math.sin(a) * 0.17, 0.008, Math.cos(a) * 0.17]}>
              <sphereGeometry args={[0.012 + det(i, 41) * 0.008, 6, 5]} />
              <meshStandardMaterial color="#caa258" roughness={0.85} />
            </mesh>
          );
        })}
      {/* custard: undercooked spills loose over the rim, right sits set */}
      <mesh position={[0, 0.048, 0]}>
        <cylinderGeometry args={[0.125, 0.125, 0.02, 20]} />
        <meshStandardMaterial color="#efd98f" roughness={0.4} />
      </mesh>
      {technique === "under" && (
        <mesh position={[0.1, 0.012, 0.08]} rotation={[0, 0.7, 0]} scale={[1, 0.15, 0.55]}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshStandardMaterial color="#efd98f" roughness={0.35} />
        </mesh>
      )}
      {/* overcooked: the rim dries and cracks */}
      {technique === "over" &&
        [0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3 + 0.5;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.13, 0.058, Math.sin(a) * 0.13]} rotation={[0, -a, 0.5]}>
              <boxGeometry args={[0.035, 0.004, 0.006]} />
              <meshStandardMaterial color={INK} roughness={0.9} />
            </mesh>
          );
        })}
      {/* berries */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * Math.PI * 2) / 5 + 0.4;
        const r = i === 0 ? 0 : 0.07;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.075, Math.sin(a) * r]}>
            <sphereGeometry args={[0.024, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? BERRY : "#3a4a8a"} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Unknown dish: an honest piece of cooked food, not a disguised named dish. */
function Fallback({ quality }: { quality: number }) {
  return (
    <group>
      <mesh position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.07, 14]} />
        <meshStandardMaterial color={quality < 45 ? "#8a6a44" : "#b88a52"} roughness={0.65} />
      </mesh>
      <mesh position={[0.14, 0.006, 0.1]} scale={[1, 0.12, 0.7]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshStandardMaterial color={GRAVY} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function FoodModel({
  dish,
  quality = 76,
  sauce = null,
  finish = "classic",
  condition,
  scale = 1,
}: FoodModelProps): JSX.Element {
  // legacy callers without a condition get a pure, deterministic derivation —
  // quality is already qualityOfCondition's output in the live path, so the
  // resulting fields agree with what the state layer stored
  const eff = condition ?? conditionFromCooking(dish, quality, {
    sauce,
    recipeFinish: finish,
  });
  const technique = eff.technique;
  const sauceState = eff.sauce === "none" ? null : eff.sauce === "split" ? ("split" as const) : ("saved" as const);
  const body =
    dish === "Beef Wellington" ? (
      <Wellington finish={eff.recipeFinish} technique={technique} />
    ) : dish === "Scallop, one" ? (
      <Scallop technique={technique} />
    ) : dish === "Red mullet, crying" ? (
      <RedMullet technique={technique} />
    ) : dish === "Risotto (stood up)" ? (
      <Risotto technique={technique} />
    ) : dish === "Lamb sauce (missing)" ? (
      <LambChop technique={technique} />
    ) : dish === "Pommes purée" ? (
      <Pommes technique={technique} />
    ) : dish === "Foie torchon" ? (
      <Foie technique={technique} collapsed={eff.structure === "collapsed"} />
    ) : dish === "Soufflé (weeping)" ? (
      <Souffle technique={technique} collapsed={eff.structure === "collapsed"} />
    ) : dish === "Tart of the day" ? (
      <Tart technique={technique} collapsed={eff.structure === "collapsed"} />
    ) : (
      <Fallback quality={quality} />
    );
  const hurried = eff.plating === "hurried";
  const bakeKey = `${dish}|${quality}|${sauce ?? "-"}|${finish}|${scale}|${JSON.stringify(eff)}`;
  return (
    <group scale={scale}>
      <StaticMerge key={bakeKey}>
      {/* a hurried plate lands off-centre, slightly turned, and leaves
          three honest smears/crumbs near the rim */}
      <group position={hurried ? [0.045, 0, -0.035] : [0, 0, 0]} rotation={hurried ? [0, 0.18, 0] : [0, 0, 0]}>
        {body}
      </group>
      {sauceState && <Sauce mode={sauceState} color={SAUCE_COLOR[dish] ?? GRAVY} />}
      {hurried &&
        [0, 1, 2].map((i) => {
          const a = det(i, 47) * Math.PI * 2;
          const r = 0.3 + det(i, 49) * 0.1;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * r, 0.006, Math.sin(a) * r]}
              scale={[1, 0.25, 0.6]}
              rotation={[0, det(i, 51) * 3, 0]}
            >
              <sphereGeometry args={[0.022 + det(i, 53) * 0.01, 8, 6]} />
              <meshStandardMaterial color={i === 2 ? "#d9cba0" : SAUCE_COLOR[dish] ?? GRAVY} roughness={0.6} />
            </mesh>
          );
        })}
      </StaticMerge>
    </group>
  );
}
