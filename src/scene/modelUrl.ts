// Model URLs must respect vite `base: "./"` — OpenGame serves the build
// from a sub-path / iframe, so absolute "/models/..." 404s in prod while
// working fine in `vite dev`. `import.meta.env.BASE_URL` is "/" locally
// and "./" in the built game.
export function modelUrl(name: string) {
  const base = import.meta.env.BASE_URL || "./";
  const sep = base.endsWith("/") ? "" : "/";
  return `${base}${sep}models/${name}`;
}
