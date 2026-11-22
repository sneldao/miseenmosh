import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../game/state";
import { updateAmbience } from "../game/sound";

/**
 * The room's ears. No meshes — just listens to the service a few times
 * a second and tells the sound beds what to do:
 * - each station sizzles with its load and crackles when it burns,
 * - the dining murmur swells with covers and sours when tables walk,
 * - a low drone rises as the rail fills.
 * Silent unless the service is actually running.
 */
export default function Ambience() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3) return;
    acc.current = 0;
    const s = useGame.getState();
    const audible = s.phase === "service" && !s.paused;
    const sizzle = [0, 1, 2].map((st) => {
      const c = s.cooks[st];
      if (!c || c.walkedOut) return 0;
      if (c.burning) return 1.3;
      const working = s.tickets.some((t) => t.station === st && t.state === "plating");
      return (
        Math.min(1, c.overloadT / 8) * 0.9 +
        (working ? 0.3 : 0) +
        (c.morale < 30 ? 0.08 : 0)
      );
    });
    const live = s.tickets.filter((t) => t.state !== "done").length;
    const murmur = Math.min(1, s.served / 24) - Math.min(0.5, s.misses * 0.12);
    updateAmbience(
      { sizzle, murmur: Math.max(0.05, murmur), drone: Math.min(1, live / 9) },
      audible
    );
  });
  return null;
}
