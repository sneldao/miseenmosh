# Sponsor tech — verified Nov 18, 2026

All output MUST be baked into the bundle: review runs offline, first
frame must render without network. Runtime calls allowed but never
load-bearing.

## ElevenLabs — "voice that changes how the game feels" (flagship fit)

| API | Use in MISE EN MOSH |
|---|---|
| Voice Design | 8–12 invented voices: brigade, rivals, critics, Beefcakes |
| Text to Dialogue | service barks, feud cutscenes, review read-out |
| Text to Speech (v3/v4) | the CHEF's own screams (player-character VO) |
| Sound Effects | ticket printer, pans, fire, smash, dining murmur |
| Music | 90s band-biopic score: intro riff, service adrenaline, review comedown |
| Forced Alignment | karaoke subtitles on screaming fits |
| Speech-to-Speech | optional: voice-morph the chef's roar into rage variants |

Entrant perk: free month of Creator plan (131K credits).
Prizes: 6mo Scale / 3mo Pro ×2.

## fal — "media that shapes how the game looks and plays"

| Model | Use |
|---|---|
| MiniMax H3 Image (FREE ~2 weeks) | dish art, menu cards, rival portraits, newspaper clippings, venue exteriors, title art — iterate freely NOW |
| Idol Max / Turbo (speridlabs/idol/max, launched Nov 18) | image → rigged GLB w/ animations in ~20s — hero chef + key characters |
| Kling 4.0 / H3 Max video | title-sequence animatic, feud "flashback" clips, trailer |
| ElevenLabs endpoints on fal | redundant TTS path if needed |

Entrant perk: $50 credits. Prizes: $1,666 × 3.

## Meshy — "models that hold up under a camera you do not control"

| Path | Use |
|---|---|
| meshy-t2.5 smart-topology | brigade/critics at game polycounts, part-separated, T-pose → meshy_rig → free walk/run anims |
| meshy-7.1 | hero props only: the pass, the range, signature dishes |
| meshy-n1 | 2K base-color textures for generated models |
| retexture/remesh | variants: uniform colors per venue, dish reskins |

Entrant perk: Pro for $1 (1,000 credits + API keys). Prizes: 125K credits
(62.5K/37.5K/25K).

## Pipeline order of operations

1. MiniMax H3 (free) → character/prop concept images
2. Approved image → Idol Max Turbo (rigged GLB, ~20s) OR meshy-t2.5 →
   rig → anims
3. Voices via Voice Design → Text to Dialogue/SFX/Music → bake to
   ogg/mp3
4. Everything lands in `assets/` → bundle. Hand-fix artifacts
   (twisted-fingers test) before ship.

## Models to declare on the entry form

ElevenLabs (voice design, dialogue, sfx, music, forced alignment),
fal (MiniMax H3 Image, Idol Max/Turbo, optionally Kling), Meshy
(meshy-t2.5, meshy-7.1, meshy-n1), plus the code model used (Devin/SWE).
