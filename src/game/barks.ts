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

// --- family meal: one shared dish, eaten standing up, before doors ---
// {M} = the meal, {N} = a cook's name.
export const MEALS = [
  "yesterday's fish, made excellent by spite",
  "staff pasta with too much garlic and no regrets",
  "the Wellington trimmings, eaten over the bin like animals",
  "burnt ends nobody can sell, everybody wants",
  "a single perfect omelette, cut into three unfair pieces",
  "cold pommes purée, eaten with thumbs",
];

export const FAMILY_LINES = [
  "{N} eats like it's their last meal. It might be.",
  "{N} guards the crispy bit with a paring knife.",
  "{N} says grace. It's mostly swearing.",
  "{N} feeds the pass a bite first. Respect, or fear.",
];

// --- grudges: {N} holds one, and the room knows ---
export const GRUDGE_BARKS: string[][] = [
  [
    "{N} — still thinking about that sendback. Aren't you.",
    "{N} seasons everything twice now. Trust issues, salted.",
  ],
  [
    "{N} stirs like the pan personally wronged them. It did.",
    "{N} — the shallots heard what you did. They all heard.",
  ],
  [
    "{N} pipes the tart with unnecessary violence. Beautiful. Hurt. Tart.",
    "{N} — precision is revenge you can eat.",
  ],
];

// --- Beefcakes, up close and unforgivable ---
export const BEEFCAKES_WARN = [
  "A runner in a BEEFCAKES vest loiters by your bins. He's stretching.",
  "BEEFCAKES' runner is doing lunges by the back door. This means something.",
];

export const BEEFCAKES_STEAL_LINES = [
  `BEEFCAKES' runner takes table {T}'s {D} like he pre-ordered it. BEFORE YOU, DARLING.`,
  `Table {T}'s {D}, gone. The runner blows a kiss to the pass. A kiss.`,
  `BEEFCAKES just plated YOUR table {T} order across the street. The {D} looks happy there.`,
];

// --- the dining room, reading back at you ---
// {T} = table number.
export const PRESS_TELLS = [
  "Table {T}'s food writer photographs the pass. And writes. Faster.",
  "Table {T} is sketching your plating. Badly. Publishing anyway.",
];

export const COUPLE_FIGHT = [
  "Table {T} is fighting. About the scallops. About everything.",
  "Table {T} made up. The scallops helped. The scallops always help.",
  "Table {T} is crying into the napkins. Good napkins, to be fair.",
];

export const REGULARS_KIND = [
  "The regulars nod at the pass. They've seen worse. They've BEEN worse.",
  "The regulars send back an empty plate and a thumbs-up. Keep it.",
];

export const REGULARS_FORGIVE = "The regulars wave it off. Twenty years they've eaten here. Once, they forgive.";

export const CRITIC_ESCALATION = [
  "Table {T} keeps photographing the plate. And writing.",
  "Table {T} asks when the soufflé lands. They know about the soufflé.",
  "Table {T} is writing. A lot. Underlined, probably.",
];

export const SMOKE_WARN = "{N}'s station is smoking. Ease off that side — or it goes up.";
