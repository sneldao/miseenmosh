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
- **20 Nov, ~05:30 UTC** — the 9/10 patch (sear window, clout spends,
  silent-service star) is committed but NOT live: still no deploy slots
  until **12:01 UTC**. Verified each slice in-browser on the local build
  through a tunnel (25 golden fires, rushed-fire line, champagne bought
  for 15 ego, SILENT SERVICE ★ + tail quote on the review card). After
  the reset: `opengame deploy --wait --idempotency-key "$(uuidgen)"`.
- **21 Nov, ~15:25 UTC** — FIRST PUBLISH. Release `b21576f9` (ambient-life
  build: guest sip/shift, sconce dips, bell ding on serve, cook idle,
  bad-line tremor + everything since `5331c6e`) is **live** as SUB-1885,
  version 8. Entered Game Jam #1 on `simulation-management` + all three
  sponsor tracks (elevenlabs, fal, meshy), sponsor email on file. The game
  had never actually been published before — every prior deploy was
  preview-only, so this was a first publish (`awaiting_details`) that
  needed the jam answers on `opengame publish`, not `submit`. Fresh
  `--idempotency-key` dodged the stale `upload_pending`. Draco
  `missing-ref` heuristic fired again — false positive, all six GLBs are
  uncompressed. Share: https://opengame.io/g/9i7mjkmdx4 — sponsor
  `--evidence-*` text can be added later via the deploy page.
- **21 Nov, evening UTC** — release `5e4dd584` (first-land overhaul:
  prod black screen fixed via base-relative `modelUrl()` + per-prop
  `PropBoundary`, zero-JS boot shell, real `useProgress` bar, GLBs
  deferred until after the title and preloaded on BEGIN, WebGL/failure
  cards, `?debug=props`) is Ready; preview
  `https://opengame.io/g/9i7mjkmdx4?preview=5e4dd584-268d-4270-ba15-8d826fae4c60`.
  No `missing-ref` heuristic this time — the base-relative paths fixed
  it. Deployed from the root with a fresh `--idempotency-key`;
  4 daily slots remain. Still to verify inside the real iframe:
  boot shell → title + % bar → briefing with props fading in.
- **20 Nov, ~06:40 UTC** — the all-eleven build (coursing, 86, requests,
  milestones, runner, critic exit, ego tiers, board, loan, sauce, edge,
  comp) committed but NOT live: still no deploy slots until **12:01
  UTC**. Verified each slice in-browser on the local build through a
  tunnel (5★ silent review, both request verdicts, both shoo outcomes,
  board payout, loan + repay, whisk saves, coursing, 86, milestones).
  After the reset: `opengame deploy --wait --idempotency-key "$(uuidgen)"`.
- **22 Nov, ~22:45 UTC** — release `15b856f8` (flagship overhaul:
  culinary authorship + service review, real rigged bodies for Petra,
  Dimitri and Anwar with station work clips, portrait sockets and
  bone-local tools, cream-and-colour room, first-person opening
  close-up, real cooker/skillet/tongs) is **published and live** —
  SUB-2015 review outcome `publish`, live at
  https://opengame.io/g/9i7mjkmdx4 serving `index-DOdAbBGz.js`
  (verified against local dist hash). Draco `missing-ref` heuristic
  fired again — still a false positive, all eleven GLBs uncompressed.
  Jam entry retained: Game Jam #1, all four tracks incl. meshy + fal.
  Push needed `gh auth switch --user sneldao` first — the active gh
  account had defaulted to `thisyearnofear` which lacks write access.

## a82befdd — Commis runner live + brigade mount fix (23 Nov 2026)

- `opengame deploy . --wait` → release `a82befdd-c2fa-44c2-9392-ac99a209f1bd`,
  SUB-2019, review passed and auto-published.
- Ships: real commis body carrying the pass' plates (standby → lift →
  carry → return loop on `lastDelivery`), commis portrait spec + crop,
  and a fix for a pre-existing `brigadeReady` render loop that silently
  dropped both real cooks to illustrated fallbacks (React #185).
- Verified live: commis waits at the pass' right end on the published
  page; real brigade bodies at SAUCE/PASTRY; zero `__propErrors`.
- Jam entry retained on all four tracks.
- Quota after this deploy: 3 deploys left today, 8 playtests left.

## a0374713 — Porter live: send-backs hauled to wash-up (23 Nov 2026)

- `opengame deploy . --wait` → release `a0374713-9159-4602-93d0-2035ab20220f`,
  SUB-2020, review passed and auto-published.
- Ships: real porter body (Meshy T2.5 + N1, textured, ~8.4k faces,
  rigged, Motion Prime heavy bus-tub haul) running the send-back loop —
  standby left → walk to pickup → grab → haul off-frame left → return
  empty → standby, queued on repeated send-backs, grey bus tub riding a
  TubSocket with the actual rejected dish (FoodModel by quality) inside,
  masked collage portrait on PortraitSocket.
- Verified live on https://opengame.io/g/9i7mjkmdx4 (Version 12):
  porter at left standby with portrait during service, commis at the
  pass' right end, real Petra/Dimitri/Anwar bodies at their stations,
  a full night-1 service ran to the review screen (brigade walkout
  fired — Running clips exercised in the wild). No visible errors.
- Same two known inconclusive findings: Draco `missing-ref` (false
  positive — no GLB compressed) and the r187 engine heuristic.
- Quota after this deploy: 2 deploys left today.

## 7a0ec476 — Runner spatial audio pass (23 Nov 2026)

- `opengame deploy . --wait` → release `7a0ec476-d7f8-4571-9ab2-564a244c9073`,
  SUB-2021, review passed and auto-published.
- Ships: new synth cues `step` / `clatter` / `splash` wired into the
  runner phase machines — commis footfalls + tray-lift clatter, porter
  footfalls + mid-grab clatter + tub-shift clinks + wash-up splash.
  Pan rides each runner's live x so steps sweep the stereo field.
- Verified pre-deploy on the prod preview: send-back ran the full porter
  loop, zero `__propErrors`. Sound levels are meter-set and NOT yet
  listened to by a person — flagged in the production status doc.
- Quota after this deploy: 1 deploy left today.
