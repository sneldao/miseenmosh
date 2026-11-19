# Deploying *Mise en Mosh*

**Short version:** deploy from the repo root. The manifest already says where
the build lands.

```bash
npx vite preview --port 4180 --strictPort   # verify first
opengame deploy --wait                      # builds, packages dist/, uploads
```

## The manifest does the packaging

`opengame.json` declares the build:

```json
"build": { "command": "npm run build", "output": "dist" }
```

`npm run build` is `tsc -b && vite build && cp opengame.json dist/`, so the
release folder also carries its own manifest. OpenGame hosts **static files**
— there is no build server on their side — and this field is what tells the
uploader which folder that is.

Without it, the checker reads the root `index.html`, sees
`<script src="/src/main.tsx">` (TypeScript, which no browser runs), fails the
deploy as `source-not-build`, and adds a heuristic `missing-ref` for the nine
files that only exist in `dist/` (draco, models).

## Do not deploy the folder

```bash
opengame deploy dist --no-build   # ✗ creates a second game
```

The CLI links the folder it runs in, so deploying *inside* `dist/` wrote
`dist/.opengame/project.json` pointing at a brand-new game with a new
`publicId`. That release never reached the jam entry. If it happens, delete
the duplicate (`opengame delete --game <id> --title "Mise en Mosh" --yes`),
remove `dist/.opengame`, and deploy from the root.

Vite empties `dist/` on every build, so the stale link would have been wiped
anyway — but the wasted deploy is real.

## The sequence

1. **Verify locally.** `npx vite preview --port 4180 --strictPort`, then play
   the real flow (title → briefing → service). A bad deploy costs one of five
   in 24 hours; a local check costs nothing.
2. **Deploy.** `opengame deploy --wait` from the repo root. It runs the build
   command, packages `dist/`, and stays for the checks so the preview URL
   comes back in the same run.
   - `--no-build` reuses the existing `dist/` instead of rebuilding — use it
     only when you just built and changed nothing else.
   - `--publish` waits for review and publishes the moment it passes.
3. **Record the preview.** `opengame status` or `opengame deployments` for
   `releaseId` + `previewUrl`. Put the preview URL in the devlog / submission
   notes so the judge link is never stale.

## What to check inside the iframe (not just locally)

Pointer lock behaves differently in a frame, so the first thing to test on a
fresh preview is the thing localhost can't prove:

- click **BEGIN RESIDENCY → RUN SERVICE** — the camera dollies to the pass
  and the cursor locks;
- mouse look, and arrow-key shimmy;
- hold **RMB** — the plate raises and turns to the eye, dish print readable;
- click a station / a guest in the dining window — the centre raycast lands;
- hold **Space** — the charge meter fills; over-hold turns it red and costs
  morale; release roars;
- **V** — drops to the cinematic camera and back (this is the fallback if
  pointer lock is refused, so verify it works *before* trusting the lock);
- **Escape** — unlocks and pauses; the game is still playable after resume.

If pointer lock is blocked by the frame, ship anyway: `V` is the supported
path and the game is fully playable from the cinematic camera.

## Ground truth

```bash
opengame status        # current release, preview URL, limits, findings
opengame deployments   # every deploy, newest first, with release ids
opengame games         # every game on the account — duplicates show up here
opengame limits        # deploy + submission budget
```

Budgets that bite: **5 deploys / 24 h**, **5 jam submissions / day**,
**10 playtests / 24 h**. Deploying early is cheap; deploying a broken build
late is not.

## Rollback

Bad release on the preview, deadline close:

```bash
opengame deployments           # find the last good release id
opengame rollback <releaseId>
```

The jam judges the **latest live version at the deadline** — so the last
deploy of the day should be a deliberate, verified one, and rollback exists
for the case where it wasn't.

## Manifest

`opengame.json` carries title, tagline, description, genre and controls.
`description: "auto"` and `controls: "auto"` are written by review from the
build; give them words once the game is stable, since auto-review reads the
first 90 seconds and the cold open changes what it sees.

## Log

- **19 Nov** — `build.output` added; release `de6d1a82` (first-person pass)
  landed on `9i7mjkmdx4` after a duplicate game was created and deleted.
