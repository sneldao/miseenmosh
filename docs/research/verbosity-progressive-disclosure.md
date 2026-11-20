# Verbosity & progressive disclosure — research + audit

How much the game says, when it says it, and what to tune. Sources via Serper (deep).

## What the best say

- **Valve invisible tutorial (Half-Life 2, App2top dev library).** New threats debut in safe contexts: the first zombie is behind a fence; barnacles catch barrels before they catch you. The pattern is *establish, then test* — never a popup where a staged encounter works. Mega Man and Portal do the same (first room has one exit; the portal is already there).
- **3-step organic tutorials (GameDev Academy / Game Wisdom / Celeste).** Introduce in safety → use for real → combine with other systems. Celeste teaches dash with an optional strawberry before any mandatory dash. Apple's WWDC guidance: a tutorial covers the core loop's 2–3 parts only; everything else (upgrades, stores, messages) is discovered after.
- **Slay the Spire hover-glossary.** Text-heavy design made readable by pushing definitions to hover: keywords compress rules (Vulnerable, Exhaust), appear on many cards so players learn once, and popups vanish when the cursor leaves. Nothing is forced into memory.
- **Balatro information hierarchy.** Color as a strict system (neutral / active / exceptional), 3-layer feedback (confirm → magnitude → back to decision-ready), big numbers as gameplay objects, stable layout zones. Roguelikes live or die on *interface fatigue* — the 50th run must read as fast as the 1st.
- **HUD tiers (aslain.dev / madegooddesigns / Sinfull).** Vital (always visible) / contextual (appears when needed) / on-demand (menu/key). The cardinal sin: treating everything as tier one — "when everything is loud, nothing is readable." Shape over text; stable anchoring (muscle memory for where health lives); animate changes, never resting positions.
- **Keyword emphasis (uxdesign.cc).** Words carrying equal weight slow reaction; color + bold on action words and game objects lets players act without re-reading. Dialog borders on fringes keep focus.
- **Hades dialogue gating (prior research).** 2–4 line exchanges, gated by run state, never repeated unskippably. Repetition is the delivery mechanism, not the content.

## Audit: what Mise en Mosh already does right

- **Phasing is progressive disclosure.** N1 plate→judge only; each night adds ≤2 verbs (sauce N2, requests+86 N5, folklore N6…). The 9-night arc *is* the tutorial and nobody noticed — the highest compliment.
- **One interrupt at a time.** Sauce, request, folklore, runner never overlap. This is the game's load cap and its most important anti-verbosity system. Protect it.
- **Feed capped at 23, kind-tagged** (drama/good/bad/info). Chronological + severity-tinted is the right call for a chaos feed.
- **First-appearance warnings** (FOLKLORE_*_WARN, BEEFCAKES_WARN) are Valve barnacles: the threat introduces itself before it bites.
- **Office costs inline** ("−£70", "+3 skill, −8 morale") = StS keyword compression: learn once, decide fast.
- **Beat-ordered briefing** (market → feud → office) with fixed order = Balatro stable zones. Don't reshuffle.
- **1–2 line feed/bark/epilogue discipline** already matches the Hades 2–4 line rule. Name it as a rule so it survives.

## Pressure points + recommendations (cheap → expensive)

1. **Keyword styling (XS).** Key verbs in feed/office (FIRE, WHISK, SHOO, FLAG, 86, SMASH) get bold + color via a shared class. The `.kbd` pattern exists; extend to verbs. Reaction speed without re-reading.
2. **Review card hierarchy (S).** The card grows: quote, vow, persona, folklore, epilogue, cover = 6 text lines. Rank it visually: stars → quote (the hook, biggest) → persona voice lines → stats small. Share text keeps everything (off-screen, no cost).
3. **First-time gentling (S, the Celeste strawberry).** First sauce split of a run gets a 7s whisk window, then 4s. First runner approaches 20% slower. Establish, then test — adaptive disclosure, no text added.
4. **Two-verbs-per-night cap (rule, free).** N5 ships requests + 86 together; acceptable, but make it the documented maximum and never stack a new verb on a persona's debut night.
5. **Briefing beat budget (M).** Count office options per night; if a night exceeds ~7 distinct decisions, demote one to a hint (e.g., seating auto-suggests). Beats stay fixed-order; depth grows inside beats, never as new beats.
6. **Tell-volume governor (M).** Late nights stack tells (critic + press + lore + flying/fatigue barks). Cap non-critical feed to 1 line per ~4s during the last 40s; queue the rest. The finale should feel loud, not spammy.
7. **On-demand glossary (L, only if needed).** A StS-style hover/key legend for the full key list. Only if playtests show key confusion — the inline costs may already cover it.

## Adopted rules

- 2–4 lines per beat, always. One interrupt at a time, always. Fixed briefing order, always.
- New verbs ≤2/night, never on a persona debut. Threats introduce themselves (warn line) before they bite.
- Loud is earned: ceremonies and caps, not volume. When everything is loud, nothing is readable.
