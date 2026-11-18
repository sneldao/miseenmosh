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
];

export const RIVAL_LINES = [
  "BEEFCAKES posts a shirtless prep video. 2M views. Your own brigade liked it.",
  "BEEFCAKES plates with tweezers AND a shirt on. Disgusting.",
  "Rumor: BEEFCAKES comped the food press again. The rat.",
  "BEEFCAKES' dining room is full. Yours has the inspector. Priorities.",
];

export function pick(rng: () => number, arr: string[]): string {
  return arr[Math.floor(rng() * arr.length)];
}
