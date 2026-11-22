import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "../game/state";
import Stations, { Station } from "./Stations";
import DiningRoom from "./DiningRoom";
import Cloche from "./Cloche";
import MeshyProp from "./MeshyProp";
import { useTexture } from "@react-three/drei";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { tileTexture, floorTexture } from "./tex";
import { Group, PointLight } from "three";
import chefPoster from "../../assets/recraft/raster/chef-pistols-poster.webp";
import FirstPerson from "./FirstPerson";
import RailDockets from "./RailDockets";
import SpeechBubble from "./SpeechBubble";
import Ambience from "./Ambience";
import PropBoundary from "./PropBoundary";
import { modelUrl } from "./modelUrl";
import FoodModel from "./FoodModel";
import IllustratedCook from "./IllustratedCook";
import PetraKitchen from "./PetraKitchen";
import BrigadeKitchen from "./BrigadeKitchen";
import PlateCorrection from "./PlateCorrection";
import { COPPER, INK, LOOK, MUSTARD, PETROL, STATION_X, VERMILION, signTexture, useReducedMotion } from "./artDirection";
import { type DishCondition, dishProfile } from "../game/culinary";

const STEEL_DARK = "#4a4d52";
const IVORY = "#f2ead6";
const STONE = "#e8dcbe";

/** The 1MB gig poster loads on its own so the room shell paints first
 *  and the title card never waits on wall art. */
function PosterMesh() {
  const poster = useTexture(chefPoster);
  return (
    <group>
      <mesh position={[-8.82, 2.9, 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 1.8]} />
        <meshStandardMaterial map={poster} roughness={0.85} />
      </mesh>
      {/* ink frame lip */}
      <mesh position={[-8.86, 2.9, 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 1.95]} />
        <meshStandardMaterial color={INK} roughness={0.95} />
      </mesh>
    </group>
  );
}

function PassCounter() {
  const bell = useRef<Group>(null);
  const lastServed = useRef(0);
  const rungAt = useRef(-10);
  useFrame(({ clock }) => {
    const s = useGame.getState();
    if (s.served !== lastServed.current) {
      lastServed.current = s.served;
      rungAt.current = clock.elapsedTime;
    }
    if (bell.current) {
      const t = clock.elapsedTime;
      const since = t - rungAt.current;
      // idle: barely-there sway; rung: one quick ding-swing that decays.
      // small angles only — the smash/scream keep the urgent channel.
      const rung = since < 1.2 ? Math.sin(since * 18) * 0.3 * (1 - since / 1.2) : 0;
      bell.current.rotation.z = Math.sin(t * 0.9) * 0.02 + rung;
    }
  });
  return (
    <group position={[0, 0, 2.2]}>
      {/* petrol enamel fascia with cream inset panels */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 1.1, 0.9]} />
        <meshStandardMaterial color={PETROL} roughness={0.7} />
      </mesh>
      {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => (
        <group key={x} position={[x, 0.55, 0.46]}>
          {/* ink/gold inset border — largest ink behind, cream panel in front */}
          <mesh position={[0, 0, 0.002]}>
            <boxGeometry args={[1.72, 0.82, 0.004]} />
            <meshStandardMaterial color={INK} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[1.66, 0.76, 0.006]} />
            <meshStandardMaterial color="#b8913e" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.016]}>
            <boxGeometry args={[1.6, 0.7, 0.02]} />
            <meshStandardMaterial color={IVORY} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* ink kick + rounded corners */}
      <mesh position={[0, 0.09, 0.46]}>
        <boxGeometry args={[11, 0.18, 0.03]} />
        <meshStandardMaterial color={INK} roughness={0.9} />
      </mesh>
      {[-5.47, 5.47].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.45]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 10]} />
          <meshStandardMaterial color={PETROL} roughness={0.7} />
        </mesh>
      ))}
      {/* warm ivory top with a copper lip */}
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.3, 0.06, 1.1]} />
        <meshStandardMaterial color={IVORY} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0.55]}>
        <boxGeometry args={[11.3, 0.05, 0.05]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* order spike + dockets */}
      <group position={[-1.7, 1.16, 0.12]}>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.04, 0.055, 0.025, 12]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.2, 6]} />
          <meshStandardMaterial color="#c2c6ca" metalness={0.6} roughness={0.3} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0.006 * i, 0.1 + i * 0.014, 0.004 * i]}
            rotation={[-0.18 + i * 0.1, 0.5 + i * 0.7, 0.1 - i * 0.08]}
          >
            <boxGeometry args={[0.11, 0.0016, 0.15]} />
            <meshStandardMaterial color="#efe6cf" roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* folded towel */}
      <group position={[1.34, 1.16, 0.18]} rotation={[0, 0.42, 0]}>
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.26, 0.024, 0.2]} />
          <meshStandardMaterial color="#efe9dd" roughness={1} />
        </mesh>
        <mesh position={[0, 0.033, 0]}>
          <boxGeometry args={[0.24, 0.018, 0.18]} />
          <meshStandardMaterial color="#f0e9db" roughness={1} />
        </mesh>
        <mesh position={[0, 0.043, 0.055]}>
          <boxGeometry args={[0.24, 0.002, 0.03]} />
          <meshStandardMaterial color={VERMILION} roughness={1} />
        </mesh>
      </group>
      {/* service bell — sways on every serve, idles otherwise */}
      <group position={[-0.72, 1.16, 0.24]} ref={bell}>
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.055, 0.062, 0.012, 16]} />
          <meshStandardMaterial color={STEEL_DARK} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.046, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c9a24a" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.078, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#e0bd63" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>
      {/* two end pendants only — the cooks' faces stay clear of the shade */}
      {[-4.8, 4.8].map((x) => (
        <group key={x} position={[x, 3.95, -0.45]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.2]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <coneGeometry args={[0.2, 0.24, 16, 1, true]} />
            <meshStandardMaterial color={VERMILION} emissive="#d98a4a" emissiveIntensity={0.4} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A plate: big, banded, and carrying real food now. */

function Plate({
  quality,
  position,
  slideFrom,
  dish,
  sauce,
  condition,
  small,
  onClick,
  correcting,
  turn,
  plateId,
}: {
  quality: number;
  position: [number, number, number];
  slideFrom?: [number, number, number];
  dish?: string;
  sauce?: "saved" | "split" | null;
  condition?: DishCondition;
  small?: boolean;
  onClick?: () => void;
  /** 0..1 correction progress while the chef whisks this sauce back */
  correcting?: number | null;
  turn?: number;
  /** ticket id for the first-person raycast — plates are actionable */
  plateId?: number;
}) {
  const root = useRef<Group>(null);
  const steam = useRef<Group>(null);
  const born = useRef(0);
  const reduced = useReducedMotion();
  const pr = small ? 0.26 : 0.475;
  useFrame((_, dt) => {
    if (!root.current || !slideFrom) return;
    if (reduced) {
      root.current.position.set(position[0], position[1], position[2]);
      return;
    }
    if (!useGame.getState().paused) born.current = Math.min(0.25, born.current + Math.min(dt, 0.05));
    const p = Math.min(1, born.current / 0.25);
    const ease = 1 - (1 - p) * (1 - p);
    root.current.position.x = slideFrom[0] + (position[0] - slideFrom[0]) * ease;
    root.current.position.y = slideFrom[1] + (position[1] - slideFrom[1]) * ease;
    root.current.position.z = slideFrom[2] + (position[2] - slideFrom[2]) * ease;
  });
  useFrame(({ clock }) => {
    if (!steam.current || reduced) return;
    const t = clock.elapsedTime;
    steam.current.children.forEach((m, i) => {
      m.position.y = 0.12 + ((t * 0.35 + i * 0.4) % 0.5);
      m.scale.setScalar(1 - ((t * 0.35 + i * 0.4) % 0.5));
    });
  });
  return (
    <group
      ref={root}
      position={slideFrom ?? position}
      userData={plateId != null ? { interact: { kind: "plate", id: plateId } } : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); if (document.pointerLockElement) return; onClick(); } : undefined}
    >
      <mesh castShadow>
        <cylinderGeometry args={[pr, pr * 0.82, 0.045 * (small ? 0.7 : 1), 28]} />
        <meshStandardMaterial color="#f2ead6" roughness={0.45} />
      </mesh>
      {/* hand-painted petrol bands on the rim */}
      <mesh position={[0, 0.026 * (small ? 0.7 : 1), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pr * 0.88, small ? 0.008 : 0.014, 6, 36]} />
        <meshStandardMaterial color={PETROL} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.027 * (small ? 0.7 : 1), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pr * 0.7, small ? 0.005 : 0.009, 6, 32]} />
        <meshStandardMaterial color={PETROL} roughness={0.55} />
      </mesh>
      {dish && (
        <group position={[0, 0.03 * (small ? 0.7 : 1), 0]} rotation={[0, turn ?? 0, 0]}>
          <FoodModel dish={dish} quality={quality} sauce={sauce} condition={condition} scale={small ? 0.55 : 0.9} />
          {correcting != null && <PlateCorrection foodScale={small ? 0.55 : 0.9} />}
        </group>
      )}
      {/* steam = heat evidence: only genuinely hot dishes steam */}
      {dish && dishProfile(dish).servedHot && (condition ? condition.temperature === "hot" : quality >= 72) && !reduced && (
        <group ref={steam}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[(i - 1) * 0.09, 0.12, 0]}>
              <sphereGeometry args={[small ? 0.03 : 0.05, 8, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.28} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Plates on the pass (judging) and at stations (plating). */
function Plates({ petraReady }: { petraReady: boolean }) {
  const tickets = useGame((s) => s.tickets);
  const phase = useGame((s) => s.phase);
  const firstPerson = useGame((s) => s.firstPerson);
  const serviceTime = useGame((s) => s.serviceTime);
  const correction = useGame((s) => s.correction);
  const inspecting = useGame((s) => s.inspecting);
  const inspectionTurn = useGame((s) => s.inspectionTurn);
  const collectPlate = useGame((s) => s.collectPlate);
  const openingStep = useGame((s) => s.openingStep);
  const setInspecting = useGame((s) => s.setInspecting);
  const atPass = tickets.filter((t) => t.state === "pass");
  const ready = tickets.filter((t) => t.state === "ready");
  const plating = tickets.filter((t) => t.state === "plating" && (t.station !== 0 || !petraReady));
  const handTicket = atPass[0];
  // the sear reads in 3D too: the ring under the plating dish runs
  // white-hot and turns gold in the fire window — both cameras see it
  const searTick = plating[0];
  const searFrac = searTick && searTick.plateDur > 0
    ? Math.max(0, Math.min(1, 1 - (searTick.plateAt - serviceTime) / searTick.plateDur))
    : 0;
  const golden = searFrac >= 0.7;
  // in first person the pass plate lives in your hands (see FirstPerson)
  const inHand = phase === "service" && firstPerson;
  const lanes: readonly number[] = [-1.25, 0, 1.25];
  return (
    <group>
      {atPass.map((t, i) => {
        if (inHand && t.id === handTicket?.id) return null;
        const laneX = atPass.length > 1 ? lanes[Math.min(i, 2)] : 0;
        const corr = correction?.ticketId === t.id
          ? Math.max(0, Math.min(1, (serviceTime - correction.startedAt) / Math.max(0.01, correction.endsAt - correction.startedAt)))
          : null;
        return (
          <Plate
            key={t.id}
            quality={t.quality}
            position={[laneX, 1.18, 2.2]}
            // a collected plate only slides a handspan along the pass top —
            // it never flies in from the station across the room; during the
            // opening the tutorial plate is already on the pass
            slideFrom={openingStep ? undefined : [laneX - 0.35, 1.18, 2.2]}
            dish={t.dish}
            sauce={t.sauce}
            condition={t.condition}
            correcting={corr}
            turn={inspecting ? inspectionTurn : 0}
            plateId={t.id}
            onClick={() => setInspecting(!useGame.getState().inspecting)}
          />
        );
      })}
      {/* ready plates wait at their stations — clickable by ticket id */}
      {ready.map((t) => (
        <Plate
          key={t.id}
          small
          quality={t.quality}
          position={t.station === 0 && petraReady
            ? [STATION_X[0] + 1.05, 0.936, -3.0]
            : [STATION_X[t.station] ?? 0, 1.2, -3.0]}
          dish={t.dish}
          sauce={t.sauce}
          condition={t.condition}
          plateId={t.id}
          onClick={() => collectPlate(t.id)}
        />
      ))}
      {plating.map((t) => (
        <Plate
          key={t.id}
          small
          quality={60}
          position={[STATION_X[t.station] ?? 0, 1.2, -3.0]}
          dish={t.dish}
          sauce={t.sauce}
        />
      ))}
      {searTick && (
        <mesh
          position={[STATION_X[searTick.station] ?? 0, 1.13, -3.0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.26, 0.32, 24]} />
          <meshBasicMaterial
            color={golden ? "#ffd76a" : "#ff5a2a"}
            transparent
            opacity={golden ? 0.95 : 0.25 + searFrac * 0.3}
          />
        </mesh>
      )}
    </group>
  );
}

/** Crockery shrapnel on SMASH. */
function SmashBurst() {
  const smashAt = useGame((s) => s.smashAt);
  const group = useRef<Group>(null);
  const born = useRef(0);
  const shards = useRef<{ v: [number, number, number]; r: [number, number, number] }[]>([]);
  if (smashAt && born.current !== smashAt) {
    born.current = smashAt;
    shards.current = Array.from({ length: 7 }, (_, i) => ({
      v: [Math.sin(i * 2.7) * 2.2, 2.5 + (i % 3), Math.cos(i * 1.9) * 1.6],
      r: [i * 1.3, i * 0.7, i * 2.1],
    }));
  }
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !born.current) return;
    const t = clock.elapsedTime;
    const dt = Math.min(2, (performance.now() - born.current) / 1000);
    g.children.forEach((m, i) => {
      const s = shards.current[i];
      if (!s) return;
      m.position.set(s.v[0] * dt, Math.max(0, 1.15 + s.v[1] * dt - 4.5 * dt * dt), 2.2 + s.v[2] * dt);
      m.rotation.set(s.r[0] * t * 2, s.r[1] * t * 2, s.r[2] * t * 2);
      m.visible = dt < 0.9;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} visible={false}>
          <tetrahedronGeometry args={[0.05 + (i % 3) * 0.02]} />
          <meshStandardMaterial color="#f2ead6" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Room() {
  const tile = useMemo(() => {
    const t = tileTexture();
    t.repeat.set(8, 3);
    return t;
  }, []);
  const floor = useMemo(() => {
    const t = floorTexture();
    t.repeat.set(5, 4);
    return t;
  }, []);
  const sign = useMemo(() => signTexture("MISE EN MOSH", { w: 1024, h: 160, bg: INK, fg: "#f3e6c8", size: 96 }), []);
  useEffect(() => () => { tile.dispose(); floor.dispose(); sign.dispose(); }, [tile, floor, sign]);
  return (
    <group>
      {/* floor: cream/petrol checker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial map={floor} roughness={0.95} />
      </mesh>
      {/* back wall with pass-through window hole (two segments) */}
      <mesh position={[0, 0.5, -5]}>
        <boxGeometry args={[20, 1.0, 0.3]} />
        <meshStandardMaterial map={tile} roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.65, -5]}>
        <boxGeometry args={[20, 2.9, 0.3]} />
        <meshStandardMaterial map={tile} roughness={0.9} />
      </mesh>
      {/* window sill / pass shelf — warm stone */}
      <mesh position={[0, 1.02, -4.9]}>
        <boxGeometry args={[8.4, 0.1, 0.6]} />
        <meshStandardMaterial color={STONE} roughness={0.65} />
      </mesh>
      {/* copper lip on the sill */}
      <mesh position={[0, 1.075, -4.62]}>
        <boxGeometry args={[8.44, 0.022, 0.06]} />
        <meshStandardMaterial color={COPPER} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* illustrated cream/ochre arch frame */}
      {[-4.28, 4.28].map((x) => (
        <mesh key={x} position={[x, 2.15, -5]} castShadow>
          <boxGeometry args={[0.3, 2.3, 0.42]} />
          <meshStandardMaterial color="#e2c98e" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 3.31, -5]} castShadow>
        <boxGeometry args={[8.86, 0.3, 0.42]} />
        <meshStandardMaterial color="#e2c98e" roughness={0.8} />
      </mesh>
      {/* ink edge inside the arch so the opening still reads as a hole */}
      <mesh position={[0, 3.14, -4.99]}>
        <boxGeometry args={[8.56, 0.05, 0.42]} />
        <meshStandardMaterial color={INK} roughness={0.9} />
      </mesh>
      {[-4.11, 4.11].map((x) => (
        <mesh key={x} position={[x, 2.15, -4.99]}>
          <boxGeometry args={[0.05, 2.0, 0.42]} />
          <meshStandardMaterial color={INK} roughness={0.9} />
        </mesh>
      ))}
      {/* the house sign over the window */}
      <mesh position={[0, 3.86, -4.83]}>
        <planeGeometry args={[3.6, 0.56]} />
        <meshStandardMaterial map={sign} roughness={0.8} />
      </mesh>
      {/* side walls */}
      <mesh position={[-9, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[14, 6, 0.3]} />
        <meshStandardMaterial map={tile} roughness={0.9} />
      </mesh>
      <mesh position={[9, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[14, 6, 0.3]} />
        <meshStandardMaterial map={tile} roughness={0.9} />
      </mesh>
      {/* the gig poster — streams in behind its own boundary so the
          room shell (and title card) never waits on wall art */}
      <Suspense fallback={null}>
        <PosterMesh />
      </Suspense>
    </group>
  );
}

/** BEEFCAKES leans through the pass window during his events. */
function RivalSilhouette() {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const s = useGame.getState();
    const g2 = g.current;
    if (!g2) return;
    const p = s.serviceTime - s.rivalAt;
    if (p < 0 || p > 4.2) {
      g2.visible = false;
      return;
    }
    g2.visible = true;
    const in_ = Math.min(1, p / 0.5); // shoulder-checks in fast
    const out = p > 3.4 ? Math.max(0, 1 - (p - 3.4) / 0.8) : 1;
    g2.position.z = -4.35 - (1 - in_) * 1.2 - (1 - out) * 1.2;
    g2.position.y = Math.sin(clock.elapsedTime * 1.7) * 0.03;
    g2.rotation.y = Math.sin(clock.elapsedTime * 0.9) * 0.08;
  });
  return (
    <group ref={g} position={[1.4, 0, -5.5]} visible={false}>
      {/* a silhouette with shoulders — unmistakably him */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.95, 6, 14]} />
        <meshStandardMaterial color="#241c16" roughness={0.95} />
      </mesh>
      {/* absurd delts */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[1.05, 0.3, 0.42]} />
        <meshStandardMaterial color="#241c16" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial color="#2a2018" roughness={0.9} />
      </mesh>
      {/* backward cap */}
      <mesh position={[0, 1.95, -0.02]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.21, 0.09, 12]} />
        <meshStandardMaterial color="#33261c" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** BEEFCAKES' runner: a body on the floor, not just a feed line. He
 * stretches in from the bins (right) during the warning, reaches the rail
 * at the beat, and scurries back — shooed, scored, or merely menacing. */
function Runner() {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const s = useGame.getState();
    const g2 = g.current;
    if (!g2) return;
    const r = s.runner;
    const t = clock.elapsedTime;
    if (!r || s.serviceTime < r.at - 6 || s.serviceTime > r.at + 4) {
      g2.visible = false;
      return;
    }
    g2.visible = true;
    const since = s.serviceTime - (r.at - 6); // 0..10 across approach + beat + flee
    const reach = Math.min(1, since / 6); // approach over the warning window
    const flee = s.serviceTime > r.at ? Math.min(1, (s.serviceTime - r.at) / 3) : 0;
    const ease = 1 - (1 - reach) * (1 - reach);
    g2.position.x = (5.2 - ease * 3.0) + flee * 3.2;
    g2.position.y = Math.abs(Math.sin(t * (r.fled ? 14 : 9))) * (r.fled ? 0.09 : 0.05);
    g2.rotation.y = -0.5 + Math.sin(t * 2) * 0.05;
  });
  return (
    <group ref={g} position={[5.2, 0, 1.4]} visible={false}>
      {/* protein-bro in a tank top — the wrong kind of regular */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.7, 6, 12]} />
        <meshStandardMaterial color={VERMILION} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, 1.05, 0.1]} rotation={[0.5, 0, side * -0.3]}>
          <capsuleGeometry args={[0.07, 0.4, 4, 8]} />
          <meshStandardMaterial color="#d9a877" roughness={0.9} />
        </mesh>
      ))}
      {/* the bowl he eats out of, held out front like an offering */}
      <mesh position={[0, 0.95, 0.35]}>
        <cylinderGeometry args={[0.16, 0.1, 0.12, 12]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.48, 0]}>
        <sphereGeometry args={[0.15, 14, 14]} />
        <meshStandardMaterial color="#c9906a" roughness={0.9} />
      </mesh>
      {/* backwards cap */}
      <mesh position={[0, 1.6, 0.03]} rotation={[-0.15, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.08, 12]} />
        <meshStandardMaterial color={PETROL} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, -0.2]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.14, 0.02, 0.16]} />
        <meshStandardMaterial color={PETROL} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The scream pulses the whole kitchen red for a beat. */
function HeatPulse() {
  const l = useRef<PointLight>(null);
  const reduced = useReducedMotion();
  useFrame(() => {
    const s = useGame.getState();
    const el = l.current;
    if (!el) return;
    const p = s.screamAt && !reduced ? (performance.now() - s.screamAt) / 1200 : Infinity;
    el.intensity = p < 1 ? (1 - p) * 8 : 0;
  });
  return <pointLight ref={l} position={[0, 3.2, 0]} color="#ff2a14" intensity={0} distance={14} />;
}


/** The runner's tray: lastDelivery's actual plates carried off frame-right
 *  on a bounded local clock (advances during the opening's waiting beat,
 *  freezes on pause). One pooled group keyed on delivery id — the state
 *  snapshot stays the sole authority on what was served. */
function DeliveryTray() {
  const delivery = useGame((s) => s.lastDelivery);
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const lastDelivery = useRef<typeof delivery>(null);
  const reduced = useReducedMotion();
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (delivery !== lastDelivery.current) {
      lastDelivery.current = delivery;
      elapsed.current = 0;
    }
    if (!group.current) return;
    if (!delivery || s.phase !== "service" || reduced) {
      group.current.visible = false;
      return;
    }
    if (!s.paused) elapsed.current += Math.min(dt, 0.05);
    const p = Math.min(1, elapsed.current / 1.3);
    const ease = 1 - (1 - p) * (1 - p);
    group.current.visible = p < 1;
    group.current.position.x = 0.6 + 7.5 * ease;
  });
  if (!delivery || reduced) return null;
  const plates = delivery.plates.slice(0, 4);
  const w = Math.max(1.1, 0.34 * (plates.length - 1) + 0.35);
  return (
    <group ref={group} position={[0.6, 1.45, 2.7]} visible={false}>
      {/* mittens under the tray, cuffed forearms trailing down toward the
          camera — the body stays below the bottom of frame */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.32, -0.1, 0.1]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color="#c99772" roughness={0.85} />
          </mesh>
          <mesh position={[side * 0.37, -0.4, 0.35]} rotation={[-0.62, 0, side * 0.12]}>
            <cylinderGeometry args={[0.045, 0.055, 0.72, 10]} />
            <meshStandardMaterial color={IVORY} roughness={0.85} />
          </mesh>
          <mesh position={[side * 0.335, -0.16, 0.14]} rotation={[-0.62, 0, side * 0.12]}>
            <cylinderGeometry args={[0.056, 0.056, 0.08, 10]} />
            <meshStandardMaterial color={INK} roughness={0.85} />
          </mesh>
        </group>
      ))}
      <mesh castShadow>
        <boxGeometry args={[w, 0.025, 0.5]} />
        <meshStandardMaterial color={COPPER} roughness={0.4} metalness={0.5} />
      </mesh>
      {plates.map((p, i) => (
        <group key={`${delivery.id}-${i}`} position={[(i - (plates.length - 1) / 2) * 0.34, 0.02, 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.13, 0.012, 20]} />
            <meshStandardMaterial color={IVORY} roughness={0.5} />
          </mesh>
          <group position={[0, 0.008, 0]}>
            <FoodModel
              dish={p.dish}
              quality={p.quality}
              condition={p.condition}
              finish={p.recipeFinish}
              scale={0.32}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Boot-only PBR support: a cheap indoor environment for the real
 *  equipment — generated once per mount, never a remote HDRI. */
function KitchenReflections() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const target = pmrem.fromScene(env, 0.04);
    env.dispose?.();
    pmrem.dispose();
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = 0.35;
    return () => {
      if (scene.environment === target.texture) {
        scene.environment = prevEnv;
        scene.environmentIntensity = prevIntensity;
      }
      target.dispose();
    };
  }, [gl, scene]);
  return null;
}

export default function KitchenScene() {
  const tick = useGame((s) => s.tick);
  // Title-first boot: the title card is DOM and must never wait on GLBs.
  // Props stream in once the player commits (briefing+), during the beats.
  const booted = useGame((s) => s.phase !== "title");
  const [petraReady, setPetraReady] = useState(false);
  const [brigadeIdx, setBrigadeIdx] = useState<number[]>([]);
  const brigadeReady = (index: number) => (ready: boolean) =>
    setBrigadeIdx((cur) => (ready ? [...new Set([...cur, index])] : cur.filter((i) => i !== index)));
  useFrame((_, dt) => {
    tick(Math.min(dt, 0.1));
  });
  return (
    <>
      <color attach="background" args={[LOOK.background]} />
      <fog attach="fog" args={[LOOK.background, LOOK.fogNear, LOOK.fogFar]} />
      <hemisphereLight args={[LOOK.sky, LOOK.ground, LOOK.hemi]} />
      {/* illustrated key: one shadow light, warm paper sun */}
      <directionalLight
        position={[-4, 8, 5]}
        intensity={LOOK.keyIntensity}
        color={LOOK.key}
        castShadow
        shadow-mapSize={[LOOK.shadowSize, LOOK.shadowSize]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-normalBias={0.025}
      />
      {/* cool fill so shaded sides stay petrol, not black */}
      <directionalLight position={[6, 5, -1]} intensity={LOOK.fillIntensity} color={LOOK.fill} />
      <Room />
      <Stations skipPetra={booted} squashIdx={brigadeIdx} />
      <PassCounter />
      <RailDockets />
      <SpeechBubble />
      <Ambience />
      <DiningRoom />
      {/* brigade: three illustrated cooks behind their stations */}
      {booted ? (
        <PropBoundary
          fallback={
            <>
              <Station x={-3.6} index={0} />
              <IllustratedCook cookId={0} x={-3.6} />
            </>
          }
        >
          <Suspense
            fallback={
              <>
                <Station x={-3.6} index={0} />
                <IllustratedCook cookId={0} x={-3.6} />
              </>
            }
          >
            <PetraKitchen x={-3.6} onReady={setPetraReady} />
          </Suspense>
        </PropBoundary>
      ) : (
        <IllustratedCook cookId={0} x={-3.6} />
      )}
      {([1, 2] as const).map((i) =>
        booted ? (
          <PropBoundary key={i} fallback={<IllustratedCook cookId={i} x={i === 1 ? 0 : 3.6} />}>
            <Suspense fallback={<IllustratedCook cookId={i} x={i === 1 ? 0 : 3.6} />}>
              <BrigadeKitchen index={i} x={i === 1 ? 0 : 3.6} onReady={brigadeReady(i)} />
            </Suspense>
          </PropBoundary>
        ) : (
          <IllustratedCook key={i} cookId={i} x={i === 1 ? 0 : 3.6} />
        )
      )}
      <Plates petraReady={booted && petraReady} />
      <DeliveryTray />
      {booted && (
        <>
          <KitchenReflections />
          <PropBoundary>
            <Suspense fallback={null}>
              <Cloche />
            </Suspense>
          </PropBoundary>
          {/* Meshy prop batch — sill + pass (see docs/meshy-pipeline.md) */}
          <PropBoundary>
            <Suspense fallback={null}>
              <MeshyProp url={modelUrl("platestack.glb")} height={0.42} position={[-4.5, 1.16, 2.15]} tint={{ color: "#f2ead6", metalness: 0.05, roughness: 0.55 }} wobble="scream" />
          <MeshyProp url={modelUrl("panstack.glb")} height={0.45} position={[-3.8, 1.07, -4.85]} tint={{ color: COPPER, metalness: 0.7, roughness: 0.4 }} />
          <MeshyProp url={modelUrl("seabass.glb")} height={0.3} position={[-1.9, 1.07, -4.85]} rotation={0.5} tint={{ color: "#d8b8b0", metalness: 0.2, roughness: 0.5 }} />
          <MeshyProp url={modelUrl("lamb.glb")} height={0.5} position={[1.8, 1.07, -4.85]} tint={{ color: "#c96a5a", metalness: 0.05, roughness: 0.7 }} />
              <MeshyProp url={modelUrl("shaker.glb")} height={0.5} position={[3.8, 1.07, -4.85]} rotation={-0.4} tint={{ color: MUSTARD, metalness: 0.4, roughness: 0.5 }} />
            </Suspense>
          </PropBoundary>
        </>
      )}
      <SmashBurst />
      <RivalSilhouette />
      <Runner />
      <HeatPulse />
      <FirstPerson />
    </>
  );
}
