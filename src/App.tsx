import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import KitchenScene from "./scene/KitchenScene";
import { LOOK } from "./scene/artDirection";
import HUD from "./hud/HUD";
import BootOverlay from "./hud/BootOverlay";

const Telemetry = import.meta.env.DEV || import.meta.env.VITE_DIAGNOSTICS === "1"
  ? lazy(() => import("./scene/Telemetry"))
  : null;

function dismissBootShell() {
  try {
    window.__booted = true;
    const el = document.getElementById("boot");
    if (el) {
      el.classList.add("done");
      setTimeout(() => el.remove(), 500);
    }
  } catch { /* never load-bearing */ }
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** A failed frame must read as a message with a retry, never a black void. */
class FrameBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: "" };
  static getDerivedStateFromError(err: unknown) {
    return { failed: true, message: err instanceof Error ? err.message : String(err) };
  }
  componentDidCatch(err: unknown) {
    console.error("[frame]", err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="frame-fallback" role="alert">
        <div className="ff-card">
          <div className="ff-head">THE PASS WENT DARK</div>
          <div className="ff-body">
            The 3D pass failed to start
            {this.state.message ? ` (${this.state.message.slice(0, 120)})` : ""}.
            Your residency is safe — the brigade is holding.
          </div>
          <button className="btn" onClick={() => location.reload()}>
            RELIGHT THE PASS
          </button>
        </div>
      </div>
    );
  }
}

function DebugProps() {
  const [errors, setErrors] = useState<string[] | null>(null);
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("debug") !== "props") return;
      setErrors((window as unknown as { __propErrors?: string[] }).__propErrors ?? ["no prop errors recorded"]);
    } catch { /* ignore */ }
  }, []);
  if (!errors) return null;
  return (
    <div className="prop-debug">
      PROP DEBUG — {errors.length} skipped: {errors.join(" · ").slice(0, 400)}
    </div>
  );
}

export default function App() {
  const [gl] = useState(webglAvailable);
  useEffect(() => {
    dismissBootShell();
  }, []);

  if (!gl) {
    dismissBootShell();
    return (
      <div className="frame-fallback" role="alert">
        <div className="ff-card">
          <div className="ff-head">THIS KITCHEN NEEDS WEBGL</div>
          <div className="ff-body">
            Your browser blocked the 3D pass (private mode, old device, or
            disabled hardware acceleration). The game can't plate without it.
          </div>
          <button className="btn" onClick={() => location.reload()}>
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <FrameBoundary>
      <Canvas
        shadows
        dpr={[1, LOOK.maxDpr]}
        camera={{ position: [0, 3.6, 7.3], fov: 40, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <KitchenScene />
        </Suspense>
        {Telemetry && <Suspense fallback={null}><Telemetry /></Suspense>}
      </Canvas>
      <HUD />
      <BootOverlay />
      <DebugProps />
    </FrameBoundary>
  );
}

declare global {
  interface Window {
    __booted?: boolean;
    __propErrors?: string[];
  }
}
