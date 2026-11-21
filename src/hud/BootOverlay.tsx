import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useGame } from "../game/state";

const LINES = [
  "warming the room",
  "sharpening knives",
  "seating tables",
  "tempering chocolate",
  "waking the brigade",
];

/** Thin top progress bar + staged copy while 3D streams in.
 *  Only visible before the player commits — after that, props
 *  pop in behind PropBoundary without blocking play. */
export default function BootOverlay() {
  const { active, progress } = useProgress();
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    try {
      const el = document.getElementById("boot-status");
      if (el && active) el.textContent = `lighting the pass — ${Math.round(progress)}%`;
    } catch { /* never load-bearing */ }
  }, [active, progress]);

  if (phase !== "title" || (!active && progress >= 100)) return null;
  const line = LINES[Math.min(LINES.length - 1, Math.floor(progress / 22))];
  return (
    <div className="boot-overlay" role="status" aria-label={`Loading ${Math.round(progress)} percent`}>
      <div className="boot-track">
        <div className="boot-fill" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <div className="boot-line">
        {Math.round(progress)}% — {line}
      </div>
    </div>
  );
}
