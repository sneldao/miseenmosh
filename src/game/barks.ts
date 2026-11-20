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

// --- expo language: the pass speaks kitchen, not English ---
// {D} = dish, {T} = table, {N} = all-day count for that dish.
export const EXPO_FIRE = [
  "Fire {D} — table {T}! All day {N}.",
  "{D}, table {T} — fire! That's {N} all day.",
];

export const EXPO_HANDS = [
  "Hands! Table {T} — {D}, looking beautiful.",
  "Hands across! {D} for {T}. Don't drop it.",
];

export const EXPO_CORNER = [
  "Corner! Coming through with the {D}.",
  "Behind! Sharp! {D} walking to {T}.",
];

// --- callbacks the trade will recognise ---
export const TRILOGY_WELLY = "Three pristine Wellingtons. Someone call Escoffier — then deny everything.";

export const EMPTY_PASS_SCREAM = [
  "You scream at an empty pass. Even the extractor fan is scared.",
  "Nobody there to hear it. The tickets flutter. The fridge hums back.",
];

export const VAN_REMINDER = [
  "The van is parked across the street. He waves. He remembers.",
  "£130 before the residency ends. The man with the van counts your covers from the curb.",
];

export const FISH_JOKE = "Technically fish. Legally, let's not ask.";

export const CHAMPAGNE_KNEW = "You knew. The champagne arrived before they asked.";

export const SILENT_LEGEND_TAILS = [
  "Escoffier would have asked for the recipe. Then denied it.",
  "The guide retires a star. Yours keeps working.",
];

export const OUTBID_BEEFCAKES = [
  "BEEFCAKES is still thinking about the market. His protein bowls taste of loss.",
  "BEEFCAKES tells the press your outbid was 'a fluke with a wallet'.",
];

// --- 9/10 missions: named critics, provenance, 101, vows, folklore ---
export const CRITIC_DREAD: Record<string, string> = {
  gilliam: "GILLIAM is in town. Ex-sous, hates noise. Notebook early, never photos. Two screams and he's gone.",
  madameV: "MADAME V is in town. Booked as 'M. Vane', table for one. She will drop a fork.",
  kid: "THE KID is in town. 2M followers, films everything, orders the trap dish. Don't 86 anything. Let him post.",
};

export const CRITIC_VERDICTS: Record<string, string[]> = {
  gilliam: [
    "GILLIAM: 'Discipline on the pass. The brigade held. I noticed the quiet.'",
    "GILLIAM: 'No theatrics. Just cooking. Rare, these days.'",
  ],
  madameV: [
    "MADAME V: 'The fork was back before it stopped ringing. Lorna's scallops sang.'",
    "MADAME V: 'Coursing like a metronome. The window table glowed. 101 survived. Impressive.'",
  ],
  kid: [
    "THE KID: 'POSTED. That edge-char close-up did 400k before dessert. No cap.'",
    "THE KID: 'Chat says the smoky kiss is elite. 101 is literally me though.'",
  ],
};

export const FOLKLORE_FORK_WARN = "Something small hits the floor by Table {T}. A fork. Nobody moves. (R to replace)";
export const FOLKLORE_FORK_SAVED = "The fork was back before it stopped ringing. {T} noticed. They always notice.";
export const FOLKLORE_FORK_IGNORED = "They waited. Nobody came. The notebook opens.";
export const FOLKLORE_GLASS_WARN = "Table {T}'s water glass is empty. They haven't asked. They're timing you. (W to refill)";
export const FOLKLORE_GLASS_SAVED = "Water appears like it never left. Table {T} almost smiles.";
export const FOLKLORE_COAT_WARN = "Table {T}'s coat slides to the floor. Nobody's hung it. (H to hang it)";
export const FOLKLORE_COAT_SAVED = "Coat hung, collar smoothed. Table {T} sits taller.";
export const FOLKLORE_RETURN_WARN = "Table {T} sends it back: 'too cold'. It's a test. (D to refuse with grace, F to re-fire)";
export const FOLKLORE_FLASH_WARN = "Table {T} lifts a phone. Flash on. Don't react. Let them post.";

export const TABLE101_WARN = "101's wobbling again. Don't put anyone you love there.";
export const TABLE101_MOVE = "You move 101 mid-rush. Chairs scrape, runners sprint. Worth it.";
export const SEATING_LINES: Record<string, string> = {
  regulars: "The regulars get 101 for old times' sake. Twenty years they've sat there.",
  press: "The press get the window. They order fast and write faster.",
  walkin: "Walk-ins at 101. Impatient, big spenders, already photographing the wobble.",
};

export const VOW_LINES: Record<string, string> = {
  star: "STAR VOW: no walks, clock the inspector. +2★ tomorrow if you hold it.",
  house: "HOUSE VOW: 101 turns twice, nobody walks from it. The regulars become permanent.",
  brigade: "BRIGADE VOW: zero walkouts. The family meal means it. Trauma −1 all if you hold.",
};

export const PROVENANCE_BONUS = [
  "{O} — and {P} knew it by the first bite.",
  "Lorna's scallops sang. The window table heard it.",
];
