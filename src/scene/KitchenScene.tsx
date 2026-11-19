import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame } from "../game/state";
import Stations from "./Stations";
import DiningRoom from "./DiningRoom";
import Cloche from "./Cloche";
import MeshyProp from "./MeshyProp";
import { useTexture } from "@react-three/drei";
import { tileTexture, floorTexture } from "./tex";
import { Group, PointLight } from "three";
import chefPoster from "../../assets/recraft/raster/chef-pistols-poster.webp";
import wellingtonSprite from "../../assets/recraft/food-lino/wellington.webp";
import seaBassSprite from "../../assets/recraft/food-lino/sea-bass.webp";
import quenelleSprite from "../../assets/recraft/food-lino/quenelle.webp";

const DISH_SPRITE: Record<string, string> = {
  "Beef Wellington": wellingtonSprite,
  "Scallop, one": seaBassSprite,
  "Red mullet, crying": seaBassSprite,
  "Foie torchon": seaBassSprite,
  "Risotto (stood up)": quenelleSprite,
  "Lamb sauce (missing)": quenelleSprite,
  "Pommes purée": quenelleSprite,
  "Soufflé (weeping)": quenelleSprite,
  "Tart of the day": quenelleSprite,
};

/** Generated dish art as a camera-facing sprite — criminal plates
 *  still get the sad lump, which is funnier. */
function DishSprite({ url, dim }: { url: string; dim?: boolean }) {
  const tex = useTexture(url);
  return (
    <sprite position={[0, 0.3, 0]} scale={[0.66, 0.66, 1]}>
      <spriteMaterial map={tex} transparent color={dim ? "#a89a8c" : "#ffffff"} />
    </sprite>
  );
}
const STEEL = "#8a8d91";
const STEEL_DARK = "#4a4d52";
const WARM = "#ffb066";

function PassCounter() {
  return (
    <group position={[0, 0, 2.2]}>
      {/* counter body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 1.1, 0.9]} />
        <meshStandardMaterial color="#3a2415" roughness={0.8} />
      </mesh>
      {/* steel top */}
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.3, 0.06, 1.1]} />
        <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* ticket rail */}
      <mesh position={[0, 2.35, -0.15]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[11, 0.08, 0.3]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* heat lamps */}
      {[-3.2, 0, 3.2].map((x) => (
        <group key={x} position={[x, 1.9, 0]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.5]} />
            <meshStandardMaterial color={STEEL_DARK} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <coneGeometry args={[0.28, 0.3, 16, 1, true]} />
            <meshStandardMaterial color="#7a1f12" emissive={WARM} emissiveIntensity={0.6} side={2} />
          </mesh>
          <pointLight position={[0, -0.5, 0.2]} color={WARM} intensity={4} distance={4} />
        </group>
      ))}
    </group>
  );
}

function BrigadeFigure({ cookId, x, stationHue }: { cookId: number; x: number; stationHue: string }) {
  const ref = useRef<Group>(null);
  const outAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const s = useGame.getState();
    const cook = s.cooks[cookId];
    const t = clock.elapsedTime;
    if (cook?.walkedOut) {
      // storm off: exit stage left with the apron thrown
      if (outAt.current === null) outAt.current = t;
      const p = Math.min(1, (t - outAt.current) / 2.2);
      g.position.x = x - p * 6.5;
      g.position.z = -2.4 + p * 1.5;
      g.rotation.y = p * 1.2;
      g.visible = p < 1;
      return;
    }
    const plating = s.tickets.some((tk) => tk.state === "plating" && tk.station === cook?.station);
    const amped = s.serviceTime < s.adrenalineTil;
    const speed = plating ? 9 : amped ? 5.5 : 3;
    g.position.y = Math.abs(Math.sin(t * speed + x)) * (plating ? 0.06 : 0.03);
    g.rotation.y = Math.sin(t * 0.7 + x) * 0.15;
  });
  return (
    <group ref={ref} position={[x, 0, -2.4]}>
      {/* body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.75, 6, 12]} />
        <meshStandardMaterial color="#e8e2d5" roughness={0.9} />
      </mesh>
      {/* apron stripe = station color coding */}
      <mesh position={[0, 0.75, 0.19]}>
        <boxGeometry args={[0.28, 0.5, 0.02]} />
        <meshStandardMaterial color={stationHue} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#d9a877" />
      </mesh>
      {/* toque */}
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.22, 12]} />
        <meshStandardMaterial color="#f4efe4" />
      </mesh>
    </group>
  );
}

/** A plate: pristine gets steam, criminal gets a sad black lump. */
function Plate({
  quality,
  position,
  slideFromX,
  dish,
}: {
  quality: number;
  position: [number, number, number];
  slideFromX?: number;
  dish?: string;
}) {
  const root = useRef<Group>(null);
  const steam = useRef<Group>(null);
  const born = useRef<number | null>(null);
  const tier = quality >= 72 ? "pristine" : quality >= 45 ? "serviceable" : "criminal";
  useFrame(({ clock }) => {
    if (root.current && slideFromX !== undefined) {
      if (born.current === null) born.current = clock.elapsedTime;
      const p = Math.min(1, (clock.elapsedTime - born.current) / 0.55);
      const ease = 1 - (1 - p) * (1 - p);
      root.current.position.x = slideFromX + (position[0] - slideFromX) * ease;
    }
  });
  useFrame(({ clock }) => {
    if (!steam.current) return;
    const t = clock.elapsedTime;
    steam.current.children.forEach((m, i) => {
      m.position.y = 0.12 + ((t * 0.35 + i * 0.4) % 0.5);
      m.scale.setScalar(1 - ((t * 0.35 + i * 0.4) % 0.5));
    });
  });
  return (
    <group ref={root} position={[slideFromX ?? position[0], position[1], position[2]]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.035, 20]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.4} />
      </mesh>
      {dish && DISH_SPRITE[dish] && tier !== "criminal" ? (
        <DishSprite url={DISH_SPRITE[dish]} dim={tier === "serviceable"} />
      ) : (
        <mesh position={[0, 0.04, 0]}>
          {tier === "criminal" ? (
            <sphereGeometry args={[0.1, 10, 8]} />
          ) : (
            <cylinderGeometry args={[0.12, 0.14, 0.06, 12]} />
          )}
          <meshStandardMaterial
            color={tier === "criminal" ? "#1a120c" : tier === "pristine" ? "#c9803a" : "#8a6a44"}
            roughness={tier === "criminal" ? 1 : 0.6}
          />
        </mesh>
      )}
      {tier === "pristine" && (
        <group ref={steam}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[(i - 1) * 0.06, 0.12, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.28} />
            </mesh>
          ))}
        </group>
      )}
      {tier === "criminal" && (
        <pointLight position={[0, 0.3, 0]} color="#5a1f8a" intensity={1.2} distance={1.4} />
      )}
    </group>
  );
}

/** Plates on the pass (judging) and at stations (plating). */
function Plates() {
  const tickets = useGame((s) => s.tickets);
  const atPass = tickets.find((t) => t.state === "pass");
  const plating = tickets.find((t) => t.state === "plating");
  return (
    <group>
      {atPass && (
        <Plate
          key={atPass.id}
          quality={atPass.quality}
          position={[0, 1.18, 2.2]}
          slideFromX={[-3.6, 0, 3.6][atPass.station]}
          dish={atPass.dish}
        />
      )}
      {plating && (
        <Plate
          quality={60}
          position={[[-3.6, 0, 3.6][plating.station], 1.2, -3.0]}
          dish={plating.dish}
        />
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
          <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
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
  const poster = useTexture(chefPoster);
  return (
    <group>
      {/* floor: worn dark squares */}
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
      {/* window sill / pass shelf */}
      <mesh position={[0, 1.02, -4.9]}>
        <boxGeometry args={[8.4, 0.1, 0.6]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} />
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
      {/* the gig poster — the game is the band */}
      <mesh position={[-8.82, 2.9, 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 1.8]} />
        <meshStandardMaterial map={poster} roughness={0.85} />
      </mesh>
      {/* frame shadow lip */}
      <mesh position={[-8.86, 2.9, 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 1.95]} />
        <meshStandardMaterial color="#100c08" roughness={0.95} />
      </mesh>
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
        <meshStandardMaterial color="#120d0a" roughness={0.95} />
      </mesh>
      {/* absurd delts */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[1.05, 0.3, 0.42]} />
        <meshStandardMaterial color="#120d0a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial color="#0f0b08" roughness={0.9} />
      </mesh>
      {/* backward cap */}
      <mesh position={[0, 1.95, -0.02]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.21, 0.09, 12]} />
        <meshStandardMaterial color="#1a1410" roughness={0.9} />
      </mesh>
      {/* rim light so the silhouette reads against the dark wall */}
      <pointLight position={[0, 1.9, -0.6]} color="#ff5a2a" intensity={6} distance={3.5} />
    </group>
  );
}

/** The scream pulses the whole kitchen red for a beat. */
function HeatPulse() {
  const l = useRef<PointLight>(null);
  useFrame(() => {
    const s = useGame.getState();
    const el = l.current;
    if (!el) return;
    const p = s.screamAt ? (performance.now() - s.screamAt) / 1200 : Infinity;
    el.intensity = p < 1 ? (1 - p) * 40 : 0;
  });
  return <pointLight ref={l} position={[0, 3.2, 0]} color="#ff2a14" intensity={0} distance={14} />;
}

function CameraShake() {
  const screamAt = useGame((s) => s.screamAt);
  const smashAt = useGame((s) => s.smashAt);
  const { camera } = useThree();
  const base = useRef({ x: 0, y: 4.6, z: 7.2 });
  useFrame(({ clock }) => {
    const sinceScream = screamAt ? performance.now() - screamAt : Infinity;
    const sinceSmash = smashAt ? performance.now() - smashAt : Infinity;
    const k =
      (sinceScream < 600 ? (1 - sinceScream / 600) * 0.14 : 0) +
      (sinceSmash < 400 ? (1 - sinceSmash / 400) * 0.08 : 0);
    if (k > 0) {
      camera.position.x = base.current.x + Math.sin(clock.elapsedTime * 55) * k;
      camera.position.y = base.current.y + Math.cos(clock.elapsedTime * 47) * k * 0.6;
    } else {
      camera.position.x = base.current.x;
      camera.position.y = base.current.y;
    }
    camera.lookAt(0, 1.6, -2);
  });
  return null;
}

export default function KitchenScene() {
  const tick = useGame((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return (
    <>
      <color attach="background" args={["#0d0b09"]} />
      <fog attach="fog" args={["#0d0b09", 14, 30]} />
      <ambientLight intensity={0.25} color="#3a4050" />
      {/* warm key over the kitchen */}
      <spotLight position={[0, 7, 2]} angle={0.9} penumbra={0.5} intensity={80} color={WARM} castShadow />
      {/* steel fill */}
      <directionalLight position={[-5, 6, -1]} intensity={0.4} color="#9fb4d8" />
      <Room />
      <Stations />
      <PassCounter />
      <DiningRoom />
      {/* brigade: one figure per station, color-coded */}
      <BrigadeFigure cookId={0} x={-3.6} stationHue="#a8322a" />
      <BrigadeFigure cookId={1} x={0} stationHue="#b07a2a" />
      <BrigadeFigure cookId={2} x={3.6} stationHue="#3a6a9a" />
      <Plates />
      <Cloche />
      {/* Meshy prop batch — sill + pass (see docs/meshy-pipeline.md) */}
      <MeshyProp url="/models/platestack.glb" height={0.42} position={[-2.7, 1.16, 2.15]} tint={{ color: "#e8e4dc", metalness: 0.05, roughness: 0.55 }} wobble="scream" />
      <MeshyProp url="/models/panstack.glb" height={0.45} position={[-3.8, 1.07, -4.85]} tint={{ color: "#b87333", metalness: 0.85, roughness: 0.4 }} />
      <MeshyProp url="/models/seabass.glb" height={0.3} position={[-1.9, 1.07, -4.85]} rotation={0.5} tint={{ color: "#c8ccd4", metalness: 0.55, roughness: 0.4 }} />
      <MeshyProp url="/models/lamb.glb" height={0.5} position={[1.8, 1.07, -4.85]} tint={{ color: "#c96a5a", metalness: 0.05, roughness: 0.7 }} />
      <MeshyProp url="/models/shaker.glb" height={0.5} position={[3.8, 1.07, -4.85]} rotation={-0.4} tint={{ color: "#9fe060", metalness: 0.4, roughness: 0.5 }} />
      <SmashBurst />
      <RivalSilhouette />
      <HeatPulse />
      <CameraShake />
    </>
  );
}
