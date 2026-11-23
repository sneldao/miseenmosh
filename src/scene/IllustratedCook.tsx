import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
} from "three";
import { useTexture } from "@react-three/drei";
import { useGame } from "../game/state";
import { COOK_SHAPES, INK, clothTexture, useReducedMotion } from "./artDirection";
import petraHead from "../../assets/recraft/playable/petra.webp";
import dimitriHead from "../../assets/recraft/playable/dimitri.webp";
import anwarHead from "../../assets/recraft/playable/anwar.webp";
import commisHead from "../../assets/recraft/playable/commis.webp";

export interface IllustratedCookProps {
  cookId: number;
  x: number;
}

const ease = (dt: number) => 1 - Math.exp(-dt * 8);

/** Torso contour: waist → shoulder line with a soft cap, closed along y.
 *  Canonical figure space; cook height scales the group, not the shape. */
function torsoShape(shoulder: number, waist: number) {
  const s = new Shape();
  s.moveTo(-waist, 0.55);
  s.lineTo(-shoulder, 1.35);
  s.quadraticCurveTo(-shoulder, 1.48, -shoulder + 0.12, 1.5);
  s.lineTo(shoulder - 0.12, 1.5);
  s.quadraticCurveTo(shoulder, 1.48, shoulder, 1.35);
  s.lineTo(waist, 0.55);
  s.closePath();
  return s;
}

/** Apron slab following the front of the torso, with a hem flare. */
function apronShape(shoulder: number, waist: number) {
  const s = new Shape();
  s.moveTo(-waist - 0.05, 0.42);
  s.lineTo(-waist, 0.62);
  s.lineTo(-shoulder + 0.06, 1.3);
  s.lineTo(shoulder - 0.06, 1.3);
  s.lineTo(waist, 0.62);
  s.lineTo(waist + 0.05, 0.42);
  s.closePath();
  return s;
}

/** Head contour with a shaped jaw — wider at the cheek, narrowing at chin. */
function bootShape() {
  const s = new Shape();
  s.moveTo(-0.07, 0);
  s.lineTo(-0.07, 0.16);
  s.quadraticCurveTo(-0.07, 0.2, -0.03, 0.2);
  s.lineTo(0.05, 0.2);
  s.quadraticCurveTo(0.13, 0.18, 0.14, 0.1);
  s.quadraticCurveTo(0.14, 0.02, 0.08, 0);
  s.closePath();
  return s;
}

// shared small geometries — one allocation, all cooks/arms reuse
const shared = {
  button: new CylinderGeometry(0.016, 0.016, 0.012, 8),
  eye: new SphereGeometry(0.021, 8, 8),
  bead: new SphereGeometry(0.012, 6, 6),
};

function extrude(shape: Shape, depth: number, bevel = 0.055) {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Frozen collage head crops (lead-authored, see assets/recraft/playable/README).
 *  Outlines are in the ORIGINAL 755x1024 source space; bounds delimit the
 *  crop baked into each WebP. height is the world height of the cutout. */
const PORTRAITS = [
 {name:'petra',height:.70,anchorX:476,bounds:[408,35,568,263],
  outline:[[426,54],[457,38],[484,40],[499,47],[510,35],[534,40],
  [552,57],[558,78],[555,100],[568,119],[556,151],[538,166],
  [534,204],[524,223],[539,241],[508,263],[486,251],[476,260],
  [449,248],[428,223],[413,209],[412,186],[409,173],[408,145],
  [413,119],[434,108],[422,93],[425,71]]},
 {name:'dimitri',height:.90,anchorX:516,bounds:[350,34,736,427],
  outline:[[535,34],[578,35],[625,49],[680,73],[729,100],[736,117],
  [692,235],[672,274],[636,293],[650,302],[648,318],[628,337],
  [620,368],[609,388],[596,413],[571,427],[525,414],[501,408],
  [469,414],[446,401],[437,381],[419,377],[389,379],[364,367],
  [350,349],[352,338],[372,341],[401,328],[429,318],[450,302],
  [453,287],[466,265],[464,251],[481,233],[492,220],[518,126]]},
 {name:'anwar',height:.68,anchorX:483,bounds:[405,57,598,302],
  outline:[[414,109],[432,79],[465,63],[497,57],[528,64],[551,67],
  [570,89],[583,116],[590,148],[587,181],[579,202],[598,205],
  [593,225],[576,241],[561,248],[548,275],[530,287],[518,300],
  [481,302],[451,291],[440,274],[420,253],[412,224],[410,191],
  [405,166],[410,139]]},
 {name:'commis',height:.60,anchorX:468,bounds:[300,115,655,565],
  outline:[[407,124],[520,124],[577,160],[584,223],[556,250],[605,268],
  [612,304],[598,340],[577,394],[556,466],[520,520],[485,552],
  [435,552],[399,511],[364,457],[336,385],[321,331],[336,277],
  [371,241],[378,169]]}
] as const;
const PORTRAIT_SRC = [petraHead, dimitriHead, anwarHead, commisHead] as const;

/** A shaped, thick piece of collage: the frozen crop printed on an extruded
 *  cutout, ink on the sides/back. The parent's head pivot still carries all
 *  pose/reaction animation — the printed expression itself is fixed. */
export function PortraitHead({ cookId }: { cookId: number }) {
  const spec = PORTRAITS[Math.min(cookId, PORTRAITS.length - 1)];
  const tex = useTexture(PORTRAIT_SRC[Math.min(cookId, PORTRAIT_SRC.length - 1)]);
  tex.colorSpace = SRGBColorSpace;
  const { extruded, face } = useMemo(() => {
    const [left, top, right, bottom] = spec.bounds;
    const k = spec.height / (bottom - top);
    const shape = new Shape(
      spec.outline.map(([sx, sy]) => new Vector2((sx - spec.anchorX) * k, (bottom - sy) * k))
    );
    const extruded = new ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    const face = new ShapeGeometry(shape);
    const pos = face.attributes.position;
    const uv = face.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(
        i,
        (pos.getX(i) / k + spec.anchorX - left) / (right - left),
        pos.getY(i) / k / (bottom - top)
      );
    }
    uv.needsUpdate = true;
    return { extruded, face };
  }, [spec]);
  return (
    <group>
      {/* thin backing keeps the print plane at .113 — the 10cm slab read
          as a black helmet in close-up; front cap+bevel ends at .112 */}
      <mesh geometry={extruded} castShadow position={[0, 0, 0.09]}>
        <meshStandardMaterial color={INK} roughness={0.85} />
      </mesh>
      {/* the printed face sits on the front surface of the cutout */}
      <mesh geometry={face} position={[0, 0, 0.113]}>
        <meshBasicMaterial map={tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** An arm: shoulder pivot → upper sleeve → elbow pivot → forearm → hand+tool. */
function Arm({
  side,
  shape,
  tool,
  refs,
}: {
  side: 1 | -1;
  shape: (typeof COOK_SHAPES)[number];
  tool: "tongs" | "spoonpan" | "whiskbowl";
  refs: {
    shoulder: React.MutableRefObject<Group | null>;
    elbow: React.MutableRefObject<Group | null>;
    hand: React.MutableRefObject<Group | null>;
    tongJaw?: React.MutableRefObject<Mesh | null>;
  };
}) {
  const { tongJaw } = refs;
  return (
    <group ref={refs.shoulder} position={[side * (shape.shoulder + 0.02), 1.44, 0.02]}>
      {/* sleeve */}
      <mesh position={[0, -0.17, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.2, 4, 10]} />
        <meshStandardMaterial color={shape.shirt} roughness={0.88} map={clothTexture()} />
      </mesh>
      <group ref={refs.elbow} position={[0, -0.3, 0]}>
        {/* forearm with cuff */}
        <mesh position={[0, -0.14, 0]} castShadow>
          <capsuleGeometry args={[0.048, 0.18, 4, 10]} />
          <meshStandardMaterial color={shape.shirt} roughness={0.88} map={clothTexture()} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.05, 10]} />
          <meshStandardMaterial color="#f0e8d8" roughness={0.9} />
        </mesh>
        {/* mitten hand */}
        <group ref={refs.hand} position={[0, -0.32, 0.01]}>
          <mesh castShadow>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={shape.skin} roughness={0.8} />
          </mesh>
          <mesh position={[side * 0.05, -0.01, 0.02]} rotation={[0, 0, side * 0.8]}>
            <capsuleGeometry args={[0.018, 0.04, 4, 6]} />
            <meshStandardMaterial color={shape.skin} roughness={0.8} />
          </mesh>
          {tool === "tongs" && side === 1 && (
            <group position={[0, -0.05, 0.1]} rotation={[-1.2, 0, 0]}>
              <mesh position={[-0.012, -0.14, 0]} rotation={[0, 0, -0.1]}>
                <boxGeometry args={[0.014, 0.3, 0.008]} />
                <meshStandardMaterial color={INK} metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh ref={tongJaw} position={[0.012, -0.14, 0]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.014, 0.3, 0.008]} />
                <meshStandardMaterial color={INK} metalness={0.6} roughness={0.4} />
              </mesh>
            </group>
          )}
          {tool === "spoonpan" && side === 1 && (
            <group position={[0, -0.05, 0.08]} rotation={[-1.1, 0, 0]}>
              <mesh position={[0, -0.16, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
                <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.33, 0]} scale={[1, 1, 1.5]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color="#6a4a30" roughness={0.6} />
              </mesh>
            </group>
          )}
          {tool === "spoonpan" && side === -1 && (
            <group position={[0, -0.08, 0.18]}>
              <mesh rotation={[0.35, 0, 0]}>
                <cylinderGeometry args={[0.16, 0.13, 0.07, 16]} />
                <meshStandardMaterial color="#3a3028" metalness={0.4} roughness={0.5} />
              </mesh>
              <mesh position={[side * -0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.016, 0.016, 0.2, 6]} />
                <meshStandardMaterial color={INK} metalness={0.5} roughness={0.5} />
              </mesh>
            </group>
          )}
          {tool === "whiskbowl" && side === 1 && (
            <group position={[0, -0.04, 0.1]} rotation={[-1.15, 0, 0]}>
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.016, 0.016, 0.12, 6]} />
                <meshStandardMaterial color="#6a4a30" roughness={0.7} />
              </mesh>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[0, -0.2, 0]} rotation={[0.35 + (i % 2) * 0.2, (i * Math.PI) / 2, 0]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.22, 4]} />
                  <meshStandardMaterial color={INK} metalness={0.6} roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}
          {tool === "whiskbowl" && side === -1 && (
            <group position={[0, -0.06, 0.14]}>
              <mesh>
                <sphereGeometry args={[0.14, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color="#e8ddc4" roughness={0.7} side={2} />
              </mesh>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.14, 0.012, 8, 20]} />
                <meshStandardMaterial color="#d8cdb2" roughness={0.7} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

export default function IllustratedCook({ cookId, x }: IllustratedCookProps): JSX.Element {
  const shape = COOK_SHAPES[Math.min(cookId, 2)];
  const reduced = useReducedMotion();
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = { shoulder: useRef<Group>(null), elbow: useRef<Group>(null), hand: useRef<Group>(null) };
  const armR = { shoulder: useRef<Group>(null), elbow: useRef<Group>(null), hand: useRef<Group>(null), tongJaw: useRef<Mesh>(null) };
  const time = useRef(0);
  const lastNight = useRef(-1);
  const wasService = useRef(false);
  const workAmt = useRef(0);
  const outAt = useRef<number | null>(null);
  const lastEvent = useRef<unknown>(undefined);
  const react = useRef<{ kind: "serve" | "sendback" | "smash"; at: number } | null>(null);

  const geoms = useMemo(() => {
    return {
      torso: extrude(torsoShape(shape.shoulder, shape.waist), 0.3),
      apron: extrude(apronShape(shape.shoulder, shape.waist), 0.05, 0.02),
      boot: extrude(bootShape(), 0.14, 0.03),
    };
  }, [cookId, shape]);

  const hScale = shape.height / (1.58 + PORTRAITS[Math.min(cookId, 2)].height);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const s = useGame.getState();
    const cook = s.cooks[cookId];

    // --- new night: reset local animation, event and walkout refs once —
    // and restore the body itself BEFORE any early return, or a walked-out
    // cook stays hidden/rotated on the next morning
    if (s.career.night !== lastNight.current) {
      lastNight.current = s.career.night;
      time.current = 0;
      lastEvent.current = undefined;
      outAt.current = null;
      react.current = null;
      workAmt.current = 0;
      wasService.current = false;
      g.visible = true;
      g.position.set(x, 0, -3.95);
      g.rotation.set(0, 0, 0);
    }
    // --- exit tail: a walked-out cook finishes the leave on UI time during
    // review/ending; everyone else still freezes when service ends
    const exitTail = !!cook?.walkedOut && (s.phase === "review" || s.phase === "ending");
    // --- out of service: clear stale work/reaction once, then hold the pose
    if (s.phase !== "service" && !exitTail) {
      if (wasService.current) {
        wasService.current = false;
        react.current = null;
        workAmt.current = 0;
      }
      return;
    }
    wasService.current = true;
    if (s.paused) return;
    time.current += Math.min(dt, 0.05);
    const t = time.current;

    // --- event reactions: tail-reference gating, plate events match cook names
    const tail = s.events[s.events.length - 1] ?? null;
    if (lastEvent.current === undefined) {
      lastEvent.current = tail;
    } else if (tail !== lastEvent.current) {
      const idx = lastEvent.current === null ? -1 : s.events.indexOf(lastEvent.current as never);
      const start = lastEvent.current === null ? 0 : idx >= 0 ? idx + 1 : Math.max(0, s.events.length - 1);
      for (let i = start; i < s.events.length; i++) {
        const e = s.events[i];
        if (e.kind === "plate" && cook && e.cookName === cook.name) {
          react.current = { kind: e.verdict, at: t };
        }
        // a whisk you did for their sauce: the cook gives a relieved nod
        if (e.kind === "intervention" && e.action === "whisk" && cook && e.cookName === cook.name) {
          react.current = { kind: "serve", at: t };
        }
      }
      lastEvent.current = tail;
    }
    const rp = react.current ? Math.min(1, (t - react.current.at) / 1.4) : 1;
    if (rp >= 1) react.current = null;
    const reacting = react.current;

    // --- walkout: the 2.2s exit path, unchanged semantics
    if (cook?.walkedOut) {
      if (outAt.current === null) outAt.current = time.current - Math.max(0, s.serviceTime - (cook.walkoutAt ?? s.serviceTime));
      const p = Math.min(1, (time.current - outAt.current) / 2.2);
      g.position.x = x - p * 6.5;
      g.position.z = -3.95 + p * 1.55;
      g.rotation.y = p * 1.2;
      g.visible = p < 1;
      return;
    }
    outAt.current = null;
    g.visible = true;
    g.position.x = x;
    g.position.z = -3.95;
    g.rotation.y = 0;

    const active = s.tickets.find((tk) => tk.station === cook?.station && tk.state === "plating");
    const ready = s.tickets.some((tk) => tk.station === cook?.station && (tk.state === "ready" || tk.state === "pass"));
    workAmt.current += ((active ? 1 : 0) - workAmt.current) * ease(dt);
    const w = workAmt.current;
    const breathe = reduced ? 0 : Math.sin(t * 1.6 + cookId * 2.1) * 0.012;

    if (body.current) {
      body.current.position.y = breathe;
      body.current.rotation.y = ready ? 0 : Math.sin(t * 0.4 + cookId) * (reduced ? 0 : 0.04);
    }

    // --- head: turn toward the chef when a plate is ready; reactions on top
    const screamRecent = s.screamAt && performance.now() - s.screamAt < 1200;
    let headYaw = ready ? -x * 0.06 : Math.sin(t * 0.33 + cookId * 1.7) * (reduced ? 0 : 0.05);
    let headPitch = (active ? 0.12 : 0) + (reacting?.kind === "sendback" ? 0.28 * (1 - rp) : 0);
    if (reacting?.kind === "serve") headPitch -= 0.16 * Math.sin(rp * Math.PI);
    if (screamRecent && !reduced) headYaw += 0.3;
    if (reacting?.kind === "smash") headYaw += (cookId % 2 ? -1 : 1) * 0.3 * (1 - rp);
    if (head.current) {
      head.current.rotation.y = headYaw;
      head.current.rotation.x = headPitch;
      head.current.rotation.z = reacting?.kind === "smash" ? 0.12 * (1 - rp) : 0;
    }
    // --- arms: rest at the bench, work loops per station, present when ready.
    // Left arm holds the pan/bowl steady; only the right arm works the tool.
    const station = cook?.station ?? cookId;
    const restShX = -0.72;
    const restElX = -0.55;
    let shXL = restShX - 0.12 * w;
    let shXR = restShX - 0.12 * w;
    let elXL = restElX;
    let elXR = restElX;
    let handYawR = 0;
    let handPitchR = 0;
    let ellX = 0;
    let ellY = 0;
    let tongClose = 0.1;
    if (!reduced) {
      if (station === 0) {
        // tongs: 2.0s reach → close → turn → rest
        const ph = (t % 2.0) / 2.0;
        const reach = Math.sin(Math.min(1, ph / 0.3) * Math.PI * 0.5);
        const turn = ph > 0.5 && ph < 0.75 ? Math.sin(((ph - 0.5) / 0.25) * Math.PI) : 0;
        shXR = restShX - 0.5 * reach * w;
        elXR = restElX + 0.35 * reach * w;
        tongClose = 0.1 - (0.1 - 0.025) * reach * w;
        handYawR = turn * 0.9 * w;
        handPitchR = -turn * 0.4 * w;
        shXL = restShX - 0.1 * w * Math.sin(t * 1.1);
      } else if (station === 1) {
        // stir: right forearm traces an ellipse in 1.6s, left hand holds the pan
        const a = (t % 1.6) * ((Math.PI * 2) / 1.6);
        ellX = Math.cos(a) * 0.05 * w;
        ellY = Math.sin(a) * 0.045 * w;
        shXR = restShX - 0.42 * w;
        elXR = restElX + 0.28 * w;
        handYawR = a;
        shXL = restShX - 0.55 * w;
        elXL = restElX + 0.4 * w;
      } else {
        // whisk: 1.2s loop, wrist does the work
        const a = (t % 1.2) * ((Math.PI * 2) / 1.2);
        shXR = restShX - 0.45 * w;
        elXR = restElX + 0.3 * w;
        handYawR = Math.cos(a) * 0.7 * w;
        handPitchR = Math.sin(a) * 0.55 * w;
        shXL = restShX - 0.5 * w;
        elXL = restElX + 0.35 * w;
      }
    } else {
      // reduced motion: hold the working pose, drop the oscillation
      shXR = restShX - 0.4 * w;
      shXL = restShX - 0.4 * w;
      elXR = restElX + 0.3 * w;
      elXL = restElX + 0.3 * w;
      tongClose = 0.05;
    }
    // ready: plate at the pass — present it forward
    if (ready) {
      shXR = -1.15;
      elXR = -0.15;
      handPitchR = -0.3;
    }
    // flinch: both shoulders snap inward on smash
    if (reacting?.kind === "smash") {
      const f = Math.sin(rp * Math.PI);
      shXL += f * 0.5;
      shXR += f * 0.5;
    }
    if (armL.shoulder.current) {
      armL.shoulder.current.rotation.x = shXL;
      armL.shoulder.current.rotation.z = station === 0 ? 0.15 : 0.55;
    }
    if (armL.elbow.current) armL.elbow.current.rotation.x = elXL;
    if (armR.shoulder.current) {
      armR.shoulder.current.rotation.x = shXR;
      armR.shoulder.current.rotation.z = station === 0 ? -0.3 : -0.7;
    }
    if (armR.elbow.current) {
      armR.elbow.current.rotation.x = elXR;
      armR.elbow.current.position.x = ellX;
      armR.elbow.current.position.y = -0.3 + ellY;
    }
    if (armR.hand.current) {
      armR.hand.current.rotation.y = handYawR;
      armR.hand.current.rotation.x = handPitchR;
    }
    if (armR.tongJaw?.current) armR.tongJaw.current.rotation.z = tongClose;
  });

  const tool = cookId === 0 ? "tongs" : cookId === 1 ? "spoonpan" : "whiskbowl";

  return (
    <group ref={root} position={[x, 0, -3.95]} scale={[1, hScale, 1]}>
      <group ref={body}>
        {/* planted boots */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} geometry={geoms.boot} position={[sd * 0.12, 0, 0.04]} castShadow>
            <meshStandardMaterial color={INK} roughness={0.9} />
          </mesh>
        ))}
        {/* trouser hint between boot and apron hem */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.11, 0.42, 0]}>
            <cylinderGeometry args={[0.07, 0.085, 0.5, 10]} />
            <meshStandardMaterial color={INK} roughness={0.9} />
          </mesh>
        ))}
        {/* torso */}
        <mesh geometry={geoms.torso} castShadow>
          <meshStandardMaterial color={shape.shirt} roughness={0.88} map={clothTexture()} />
        </mesh>
        {/* apron on the front contour */}
        <mesh geometry={geoms.apron} position={[0, 0, 0.16]} castShadow>
          <meshStandardMaterial color={shape.apron} roughness={0.9} map={clothTexture()} />
        </mesh>
        {/* stitched stripes + pocket + buttons */}
        {[0.52, 0.62, 0.72].map((y) => (
          <mesh key={y} position={[0, y, 0.2]}>
            <boxGeometry args={[shape.waist * 2 + 0.06, 0.018, 0.012]} />
            <meshStandardMaterial color={shape.trim} roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 0.98, 0.2]}>
          <boxGeometry args={[0.16, 0.14, 0.015]} />
          <meshStandardMaterial color={shape.trim} roughness={0.85} />
        </mesh>
        {[1.12, 1.22, 1.32].map((y) => (
          <mesh key={y} geometry={shared.button} position={[0, y, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={INK} roughness={0.6} />
          </mesh>
        ))}
        {/* neck */}
        <mesh position={[0, 1.52, 0]}>
          <cylinderGeometry args={[0.075, 0.09, 0.12, 10]} />
          <meshStandardMaterial color={shape.skin} roughness={0.8} />
        </mesh>
        <Arm side={-1} shape={shape} tool={tool} refs={armL} />
        <Arm side={1} shape={shape} tool={tool} refs={armR} />
        {/* head group: face reads from the gameplay camera */}
        <group ref={head} position={[0, 1.58, 0.02]}>
          <PortraitHead cookId={cookId} />
        </group>
      </group>
    </group>
  );
}
