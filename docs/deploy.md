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
  That used the fifth deploy of the day; the Phase 2 build (dining room,
  aim reticle, rail cap) is committed but waits for the 23:46 UTC reset.
- **19 Nov, 23:50 UTC** — release `47b6bc21` (dining room, aim reticle,
  DOM rail cap, physical ticket rail with PLATE IT) is Ready; deployment
  `5dc01c3c`, 26 files / 7.7 MiB. The daily deploy allowance did not
  actually reset at 23:46 — the quota page reports the next slot at
  **01:44 UTC on 20 Nov** — but the deploy went through, so treat the
  reported reset time as advisory and check `opengame status` before
  planning a last-minute deploy. Preview links need the owner's sign-in;
  the game origin refuses a bare visit, so live checks happen inside the
  OpenGame page or a hosted playtest.
- **20 Nov, 01:54 UTC** — release `15a15a8b` (3D speech bubble replaces
  the ticker in first person, heat lamps moved behind the rail,
  pointer-lock refusal falls back to the `V` camera instead of stranding
  the player) is Ready; deployment `6216e7ae`; preview
  `https://opengame.io/g/9i7mjkmdx4?preview=15a15a8b-fc33-47e9-acd8-288190f9288e`.
  Verified on the local build through a tunnel (the sandbox browser
  cannot reach localhost): bubble pops for scream / bark / walkout with
  a legible speaker stamp, dockets unobstructed, ticker present again
  after `V`. A second `deploy` in the same session hit the 5/24 h cap
  (used 5/5, next slot 02:54 UTC) and left a stale `upload_pending` in
  `status` — the release itself is fine, so do not re-deploy to "fix"
  the status; it clears on the next deploy.
- **20 Nov, ~04:15 UTC** — the six-slice build (audio beds, family meal,
  cook memory, readable tables, Beefcakes set-piece, heat glow) is
  committed (`5331c6e`) and pushed but NOT live. `opengame deploy --wait`
  resumed the *saved* deploy with its *original archive* (deployment
  `7384f6a5`, pre-slice code) and burned the last of the 5 daily slots —
  next slot **12:01 UTC**. To ship the new build after the reset, deploy
  with a **fresh idempotency key** or it will resume the stale archive
  again: `opengame deploy --wait --idempotency-key "$(uuidgen)"`.
  Never run a bare second `deploy` to check on the first — the resume
  looks like progress and costs a slot.
