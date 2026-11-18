import { Canvas } from "@react-three/fiber";
import KitchenScene from "./scene/KitchenScene";
import HUD from "./hud/HUD";

export default function App() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.6, 7.2], fov: 46, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <KitchenScene />
      </Canvas>
      <HUD />
    </>
  );
}
