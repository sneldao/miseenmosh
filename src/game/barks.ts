// The room talks. Homage lines — kitchen legend, band-biopic energy.

export const CHEF_BARKS = [
  "IT'S STILL RAW.",
  "WHERE'S THE LAMB SAUCE?",
  "Perfection is a thousand small things. Do one of them.",
  "It's not the pan. It's you.",
  "My grandmother plates faster. She's dead.",
  "The pass does not forgive.",
  "Season it like you mean it.",
  "This is a kitchen, not a group therapy session.",
  "You're so raw you're still swimming.",
  "This wouldn't pass at a food fight.",
  "It needs… everything.",
  "The garnish gave up. Like you.",
  "I have seen better technique in a food blender.",
  "One day you'll make me proud. It is not today.",
];

// {N} = a cook's name. Station-directed insults land harder.
export const STATION_BARKS: string[][] = [
  [
    "{N} — that grill's hotter than your excuses.",
    "{N} — the beef is weeping. So am I.",
    "{N} — charred is a flavour. Cremated is not.",
  ],
  [
    "{N} — the pan is not a swimming pool.",
    "{N} — stir it like you mean it, not like you're stirring gravy at a wake.",
    "{N} — the shallots can hear you crying.",
  ],
  [
    "{N} — the soufflé is a metaphor. For you.",
    "{N} — pastry is precision. You are not.",
    "{N} — that tart has more structural integrity than your career.",
  ],
];

export const BRIGADE_RESPONSES = [
  `"YES, CHEF!"`,
  `"YES, CHEF." (through teeth)`,
  `"Heard, Chef."`,
  `"On it, Chef."`,
  `"YES, CHEF!" (someone definitely muttered)`,
];

export const GUEST_HECKLES = [
  `Table {T}: "My compliments to the microwave."`,
  `Table {T}: "I've had better at a petrol station."`,
  `Table {T}: "Is the chef... alright?"`,
  `Table {T}: "We're telling everyone we know."`,
  `Table {T}: "I didn't order a mystery."`,
  `Table {T}: "Compliments to the fire alarm."`,
  `Table {T}: "The plate was warmer than the welcome."`,
];

export const RIVAL_LINES = [
  "BEEFCAKES posts a shirtless prep video. 2M views. Your own brigade liked it.",
  "BEEFCAKES plates with tweezers AND a shirt on. Disgusting.",
  "Rumor: BEEFCAKES comped the food press again. The rat.",
  "BEEFCAKES' dining room is full. Yours has the inspector. Priorities.",
  "BEEFCAKES bench-presses his sous for warmth. Morale there is also bad.",
  "BEEFCAKES' restaurant plays his own playlist. On repeat.",
  "He calls his menu 'functional'. So is a shovel.",
  "BEEFCAKES got a tattoo of a whisk. On his neck. He's in your doorway.",
];

export function pick(rng: () => number, arr: string[]): string {
  return arr[Math.floor(rng() * arr.length)];
}
