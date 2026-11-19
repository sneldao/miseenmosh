import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { CanvasTexture } from "three";
import wellingtonSprite from "../../assets/recraft/food-lino/wellington.webp";
import seaBassSprite from "../../assets/recraft/food-lino/sea-bass.webp";
import quenelleSprite from "../../assets/recraft/food-lino/quenelle.webp";

export const DISH_SPRITE: Record<string, string> = {
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

/** radial alpha so a print reads as food on a plate, not a square card */
function useRadialAlpha() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.66, "#fff");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }, []);
}

function usePrint(url: string, crop?: number) {
  const base = useTexture(url);
  return useMemo(() => {
    if (!crop) return base;
    const t = base.clone();
    t.repeat.set(crop, crop);
    t.offset.set((1 - crop) / 2, (1 - crop) / 2);
    t.needsUpdate = true;
    return t;
  }, [base, crop]);
}

/** Generated dish art as a camera-facing sprite — criminal plates
 *  still get the sad lump, which is funnier. */
export default function DishSprite({
  url,
  dim,
  size = 0.66,
  lift = 0.3,
  mask = false,
  crop,
}: {
  url: string;
  dim?: boolean;
  size?: number;
  lift?: number;
  mask?: boolean;
  /** crop to the centre of the print (0–1) so its own plate rim goes away */
  crop?: number;
}) {
  const tex = usePrint(url, crop);
  const alpha = useRadialAlpha();
  return (
    <sprite position={[0, lift, 0]} scale={[size, size, 1]}>
      <spriteMaterial
        map={tex}
        alphaMap={mask ? alpha ?? undefined : undefined}
        transparent
        color={dim ? "#a89a8c" : "#ffffff"}
      />
    </sprite>
  );
}

/** The same print, lying on the plate — for the plate in your hands. */
export function DishDecal({
  url,
  dim,
  size = 0.21,
  lift = 0.022,
  crop = 1,
}: {
  url: string;
  dim?: boolean;
  size?: number;
  lift?: number;
  crop?: number;
}) {
  const tex = usePrint(url, crop);
  const alpha = useRadialAlpha();
  return (
    <mesh position={[0, lift, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={tex}
        alphaMap={alpha ?? undefined}
        transparent
        depthWrite={false}
        color={dim ? "#b3a496" : "#ffffff"}
      />
    </mesh>
  );
}
