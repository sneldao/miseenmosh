import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Vector2, Vector3, type Camera, type Object3D } from "three";
import { useGame } from "../game/state";

/**
 * Opt-in local diagnostics. Observes the renderer's real render calls; it never
 * steps the game, changes quality, fakes input, reads pixels or skips a frame.
 * App excludes this module from ordinary production builds.
 */
export interface FrameObservation {
  frame: number;
  startedAt: number;
  intervalMs: number;
  submitCpuMs: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  phase: string;
  paused: boolean;
  firstPerson: boolean;
  serviceTime: number;
  rail: number;
  cooking: number;
  ready: number;
  held: number;
}

interface LongTaskObservation { startedAt: number; durationMs: number }
interface Capture {
  profile: Record<string, unknown>;
  startedAt: number;
  endedAt: number;
  reason: "frame-target" | "timeout" | "hidden" | "unmounted" | "context-lost" | "renderer-did-not-submit";
  requestedFrames: number;
  longTasksSupported: boolean;
  longTasks: LongTaskObservation[];
  frames: FrameObservation[];
}

interface Diagnostics {
  snapshot: () => unknown;
  profile: () => Record<string, unknown>;
  capture: (frames?: number) => Promise<Capture>;
  /** DEV BUILDS ONLY — steps the store so a person or an agent can stage an
   *  exact state for a screenshot (first person, a ticket mid-plate, a mood)
   *  instead of fishing for it through clicks. Absent from production builds. */
  act?: (patch: Record<string, unknown>) => string[];
  /** DEV BUILDS ONLY — projects world points through the live camera and
   *  returns CSS-pixel coordinates. This is how "it feels far away" becomes a
   *  number that can be argued with: where a cook's head sits, how many pixels
   *  of floor are bare, what a hand moves by at 7 m. Absent from production
   *  builds, like `act`. */
  probe?: (points: Array<[number, number, number]>) => Array<{
    at: [number, number, number];
    x: number; y: number; depth: number; covered: boolean;
  }>;
  /** DEV BUILDS ONLY — the live camera's world position and orientation. */
  eye?: () => { x: number; y: number; z: number; look: [number, number, number] } | null;
  /** DEV BUILDS ONLY — raycasts the live scene at a CSS pixel and reports what
   *  is actually drawn there, nearest first. This is the answer to "is that
   *  figure hidden by the counter or standing in the open?", which no projection
   *  can settle on its own. */
  pick?: (x: number, y: number) => Array<{
    at: string; distance: number; world: [number, number, number];
  }>;
}

declare global {
  interface Window { __miseReadOnly?: Diagnostics }
}

export default function Telemetry() {
  const { gl, camera, size, scene } = useThree();
  // the probe/pick instruments read the current camera, canvas size and scene
  // even though the effect below is keyed on the renderer alone, so a resize or
  // camera swap cannot stale them
  const live = useRef({ camera, size, scene });
  live.current = { camera, size, scene };
  useEffect(() => {
    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const profile = () => ({
      renderer: "WebGLRenderer",
      gpu: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
      userAgent: navigator.userAgent,
      width: gl.domElement.clientWidth,
      height: gl.domElement.clientHeight,
      drawingWidth: gl.domElement.width,
      drawingHeight: gl.domElement.height,
      pixelRatio: gl.getPixelRatio(),
      shadows: gl.shadowMap.enabled,
      visibility: document.visibilityState,
      timeSource: "performance.now around real WebGLRenderer.render",
      intervalMeaning: "interval between renderer submissions; not a GPU completion or display-presentation measurement",
      cpuMeaning: "synchronous renderer submission, including shadow pass; excludes game/React work before render",
      countMeaning: "renderer.info after render, including shadow draws in this Three.js version",
      diagnostics: true,
      buildScript: document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? null,
    });
    const snapshot = () => {
      const s = useGame.getState();
      // Serialization detaches every returned object from the live Zustand store.
      return JSON.parse(JSON.stringify({
        phase: s.phase, night: s.career.night, serviceTime: s.serviceTime,
        paused: s.paused, openingStep: s.openingStep, firstPerson: s.firstPerson,
        served: s.served, missed: s.misses, sentBack: s.sentBack, smashed: s.smashed,
        selectedTicketId: "selectedTicketId" in s ? s.selectedTicketId : null,
        inspecting: "inspecting" in s ? s.inspecting : false,
        correction: "correction" in s ? s.correction : null,
        recipeHistory: "recipeHistory" in s.career ? s.career.recipeHistory : [],
        lastSauceHelp: "lastSauceHelp" in s.career ? s.career.lastSauceHelp : null,
        tickets: s.tickets.map((t) => ({
          id: t.id, dish: t.dish, table: t.table, station: t.station,
          state: t.state, age: t.age, quality: t.quality, sear: t.sear,
          plateAt: t.plateAt, plateDur: t.plateDur,
          condition: "condition" in t ? t.condition : null,
          recipeFinish: "recipeFinish" in t ? t.recipeFinish : null,
          recipeContributor: "recipeContributor" in t ? t.recipeContributor : null,
        })),
        cooks: s.cooks.map((c) => ({
          name: c.name, station: c.station, morale: c.morale,
          walkedOut: c.walkedOut, burning: c.burning, grudge: c.grudge,
        })),
        events: s.events,
        review: s.review,
        propErrors: window.__propErrors ?? [],
        render: { ...gl.info.render }, memory: { ...gl.info.memory },
      }));
    };
    let active: {
      data: Capture;
      resolve: (capture: Capture) => void;
      timer: ReturnType<typeof setTimeout>;
      observer: PerformanceObserver | null;
    } | null = null;
    const finish = (reason: Capture["reason"]) => {
      if (!active) return;
      const capture = active;
      active = null;
      clearTimeout(capture.timer);
      const endedAt = performance.now();
      for (const task of capture.observer?.takeRecords() ?? []) {
        if (task.startTime >= capture.data.startedAt && task.startTime + task.duration <= endedAt) {
          capture.data.longTasks.push({ startedAt: task.startTime, durationMs: task.duration });
        }
      }
      capture.observer?.disconnect();
      capture.data.reason = reason;
      capture.data.endedAt = endedAt;
      capture.resolve(capture.data);
    };
    let previousStart: number | null = null;
    const originalRender = gl.render;
    const measuredRender = (scene: Object3D, camera: Camera) => {
      const startedAt = performance.now();
      const frameBefore = gl.info.render.frame;
      originalRender.call(gl, scene, camera);
      const submittedAt = performance.now();
      if (gl.info.render.frame === frameBefore) {
        previousStart = null;
        finish("renderer-did-not-submit");
        return;
      }
      const intervalMs = previousStart === null ? 0 : startedAt - previousStart;
      previousStart = startedAt;
      if (!active || intervalMs <= 0) return;
      const s = useGame.getState();
      const counts = { rail: 0, plating: 0, ready: 0, pass: 0, done: 0 };
      for (const ticket of s.tickets) counts[ticket.state]++;
      active.data.frames.push({
        frame: gl.info.render.frame, startedAt, intervalMs,
        submitCpuMs: submittedAt - startedAt,
        calls: gl.info.render.calls, triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        phase: s.phase, paused: s.paused, firstPerson: s.firstPerson, serviceTime: s.serviceTime,
        rail: counts.rail, cooking: counts.plating, ready: counts.ready, held: counts.pass,
      });
      if (active.data.frames.length >= active.data.requestedFrames) finish("frame-target");
    };
    const api: Diagnostics = Object.freeze({
      snapshot,
      profile,
      // dev-only store hook (compiled out of production): the honest way to
      // photograph a state rather than hunting for it with synthetic clicks
      ...(import.meta.env?.DEV
        ? {
            act: (patch: Record<string, unknown>) => {
              useGame.setState(patch as never);
              return Object.keys(patch);
            },
            probe: (points: Array<[number, number, number]>) => {
              const { camera: cam } = live.current;
              cam.updateMatrixWorld();
              const v = new Vector3();
              return points.map((p) => {
                v.set(p[0], p[1], p[2]).project(cam);
                const depth = -v.z;
                return {
                  at: p,
                  x: Math.round(((v.x + 1) / 2) * gl.domElement.clientWidth),
                  y: Math.round(((1 - v.y) / 2) * gl.domElement.clientHeight),
                  depth: Math.round(depth * 100) / 100,
                  // behind the camera or outside the frustum: not visible
                  covered: !(v.x > -1 && v.x < 1 && v.y > -1 && v.y < 1 && v.z < 1),
                };
              });
            },
            eye: () => {
              const { camera: cam } = live.current;
              const d = new Vector3();
              cam.getWorldDirection(d);
              return {
                x: Math.round(cam.position.x * 100) / 100,
                y: Math.round(cam.position.y * 100) / 100,
                z: Math.round(cam.position.z * 100) / 100,
                look: [+d.x.toFixed(3), +d.y.toFixed(3), +d.z.toFixed(3)] as [number, number, number],
              };
            },
            pick: (x: number, y: number) => {
              const { camera: cam, scene } = live.current;
              const el = gl.domElement;
              const ray = new Raycaster();
              const ndc = new Vector2(
                (x / el.clientWidth) * 2 - 1,
                -((y / el.clientHeight) * 2 - 1),
              );
              cam.updateMatrixWorld();
              ray.setFromCamera(ndc, cam);
              return ray
                .intersectObjects(scene.children, true)
                .filter((hit) => hit.object.visible)
                .slice(0, 6)
                .map((hit) => {
                  const parts: string[] = [];
                  let node: Object3D | null = hit.object;
                  while (node && parts.length < 4) {
                    parts.unshift(node.name || node.type);
                    node = node.parent;
                  }
                  const w = hit.object.getWorldPosition(new Vector3());
                  return {
                    at: parts.join("/"),
                    distance: Math.round(hit.distance * 100) / 100,
                    world: [+w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2)] as [number, number, number],
                  };
                });
            },
          }
        : {}),
      capture: (frames = 1200) => {
        if (active) return Promise.reject(new Error("A capture is already running."));
        if (!Number.isInteger(frames) || frames < 2 || frames > 3600) {
          return Promise.reject(new Error("Request 2–3600 rendered frames."));
        }
        if (document.hidden) return Promise.reject(new Error("Bring the game to the foreground before measuring."));
        if (context.isContextLost()) return Promise.reject(new Error("The WebGL context is lost."));
        return new Promise<Capture>((resolve) => {
          const startedAt = performance.now();
          const data: Capture = {
            profile: profile(), startedAt, endedAt: startedAt, reason: "timeout",
            requestedFrames: frames, longTasksSupported: false, longTasks: [], frames: [],
          };
          let observer: PerformanceObserver | null = null;
          if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes("longtask")) {
            observer = new PerformanceObserver((list) => {
              for (const task of list.getEntries()) {
                if (task.startTime >= startedAt) data.longTasks.push({ startedAt: task.startTime, durationMs: task.duration });
              }
            });
            observer.observe({ entryTypes: ["longtask"] });
            data.longTasksSupported = true;
          }
          // A stalled/slow run returns its partial evidence and an explicit failure reason.
          active = {
            data, resolve, observer,
            timer: setTimeout(() => finish("timeout"), Math.max(10000, Math.min(120000, frames * 100))),
          };
          previousStart = null; // exclude the boundary interval before sampling began
        });
      },
    });
    const visibility = () => { if (document.hidden) finish("hidden"); };
    const contextLost = () => finish("context-lost");
    gl.render = measuredRender;
    window.__miseReadOnly = api;
    document.addEventListener("visibilitychange", visibility);
    gl.domElement.addEventListener("webglcontextlost", contextLost);
    return () => {
      finish("unmounted");
      if (gl.render === measuredRender) gl.render = originalRender;
      if (window.__miseReadOnly === api) delete window.__miseReadOnly;
      document.removeEventListener("visibilitychange", visibility);
      gl.domElement.removeEventListener("webglcontextlost", contextLost);
    };
  }, [gl]);
  return null;
}
