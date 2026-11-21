import { Component, type ReactNode } from "react";

/** One bad prop must never black-screen the whole kitchen.
 *  If a GLB 404s or fails to parse, render nothing for that prop. */
export default class PropBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[prop] skipping failed model", err);
    try {
      const w = window as unknown as { __propErrors?: string[] };
      w.__propErrors = w.__propErrors ?? [];
      w.__propErrors.push(err instanceof Error ? err.message : String(err));
    } catch { /* never load-bearing */ }
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
