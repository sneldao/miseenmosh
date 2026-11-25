/** Intro framing copy — WP0 copy lock.
 *  Single source for title promise, boot lines, and (WP2/WP3) N1 briefing
 *  + service chyrons. No logic, no imports — safe to use from HUD, boot,
 *  and state. Lines kept <90 chars to fit 480px layouts. */

export const INTRO = {
  titleSub: "STALL 86. 9 services. Spot the inspector. Keep the brigade.",
  titleHint: "Mouse + keyboard · bigger screen plays best",
  residencyLine: "NIGHT 1/9 · 5★ → LE MOSH · 10★ → MOSH & SON",
  n1Head: "NIGHT 1 — STALL 86 · a street stall with delusions",
  n1Why: "You're the chef because you're the only one who came back.",
  beat1Head: "THE BRIGADE — first night, so: introductions",
  beat2Head: "TONIGHT — EARN THE PASS",
  beat2Body:
    "Two Wellingtons. Turn the second. Name the fault. Petra will remember what you do.",
  bootLines: [
    "waking PETRA — grill, her tongs, her rules",
    "DIMITRI is holding a sauce — watch the pan, not the clock",
    "ANWAR is timing a soufflé — it is an appointment",
    "across the street, BEEFCAKES is stretching by your bins",
    "somewhere out there is tonight's inspector — notebook open",
  ],
  serviceChyrons: [
    { who: "PETRA", text: "Service, chef. First plate is honest." },
    { who: "PETRA", text: "Second one — turn it. Look before you judge." },
    { who: "THE ROOM", text: "Somewhere out there is the inspector. Feed them before they write." },
  ],
} as const;
