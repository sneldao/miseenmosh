# Build-in-public post 06 — first paint (draft for owner to post)

Attach: title card screenshot with the brigade lineup

LIVE at: https://opengame.io/g/9i7mjkmdx4

## X version

MISE EN MOSH had a production-only bug: black screen on first load.
The 3D props loaded from absolute paths that 404 under the game's
hosted sub-path — and one failed prop took down the whole kitchen.

Now: the title card paints instantly with a real loading bar, the
heavy props stream in after you commit, and a dead model just…
doesn't appear. One bad plate never closes the restaurant.
#ZAxisAwards

## Notes

- Root cause was prod-only: local dev serves `/models/` from root,
  the hosted game doesn't. Caught by checking the preview, not
  localhost — the deploy checklist in docs/deploy.md now says so
  explicitly.
- `?debug=props` on any build lists skipped models; keep it out of
  public posts.
- The boot shell + progress bar + WebGL/no-JS fallbacks mean the
  game always says *something* — the black void is gone as a
  failure mode.
