import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./ui.css";
// NOTE: drei's useGLTF wires the meshopt decoder itself (Gltf.js extensions()),
// so Rodin-pipeline GLBs load without extra setup.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
