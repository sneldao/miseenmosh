// OpenGame platform surface — thin, offline-safe, never load-bearing.
// Outside OpenGame (Vite dev, review sandbox, previews) the SDK resolves
// with no player and no services; every call below degrades to a no-op.
// Rule: the game never waits on the platform. Fire and forget.

import { og } from "@opengamehq/sdk";

let started = false;

/** Handshake once. onHostPause only ever pauses; resume stays the player's key. */
export function initOg(onHostPause: () => void, onHostMute: (muted: boolean) => void) {
  if (started) return;
  started = true;
  void og.init().then(() => {
    og.onPause((paused) => {
      if (paused) onHostPause();
    });
    og.audio.onHostMute((muted) => onHostMute(muted));
  });
}

/** First frame the player can act in — the title card. Idempotent. */
export function readyOg() {
  og.ready();
}

export function ogHandleNow(): string | null {
  return og.player.handle;
}

export function onOgHandle(fn: (handle: string | null) => void) {
  return og.player.onChange((p) => fn(p.handle));
}

function quiet(p: Promise<{ ok: boolean; error?: string; reason?: string }>) {
  void p.then((r) => {
    if (!r.ok) console.debug("[og]", r.error, r.reason ?? "");
  });
}

/** Best single-night stars (0–5), best streak — keep:best boards. */
export function submitBoard(board: "service_stars" | "streaks" | "run_stars", value: number, level?: string) {
  quiet(og.leaderboard(board).submit(value, level ? { level } : undefined));
}

export function unlockAch(id: "silent_service" | "wellington_trilogy" | "house_legend") {
  quiet(og.achievements.unlock(id));
}

export function trackEvent(name: "night_completed" | "run_completed", props: { level?: string; score?: number; result?: string }) {
  og.track(name, props);
}
