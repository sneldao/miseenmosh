import type { TellKind } from "./serviceEvents";

export type CriticPersona = "gilliam" | "madameV" | "kid";

type CriticTell = { kind: TellKind; text: string };

export const CRITICS: Record<
  CriticPersona,
  { name: string; introduction: string; preference: string; tells: readonly CriticTell[] }
> = {
  gilliam: {
    name: "GILLIAM",
    introduction:
      "GILLIAM is in town. Ex-sous, hates noise. Notebook early, never photos. He remembers how the pass treated the room as well as the plate.",
    preference: "A quiet pass",
    tells: [
      { kind: "notebook", text: "Table {T} opens a notebook and studies the pass." },
      { kind: "notebook", text: "Table {T} watches the pass, then underlines something." },
      { kind: "notebook", text: "Table {T} is writing. A lot. The notebook stays open." },
    ],
  },
  madameV: {
    name: "MADAME V",
    introduction:
      "MADAME V is in town. Watch for the guest studying the table setting and the service. A dropped fork may be a test.",
    preference: "Attentive service",
    tells: [
      { kind: "inspect", text: "Table {T} studies the place setting, then looks towards the pass." },
      { kind: "inspect", text: "Table {T} checks the glass, then watches the room for a response." },
      { kind: "inspect", text: "Table {T} looks from the cutlery to the pass. Still waiting for you to notice." },
    ],
  },
  kid: {
    name: "THE KID",
    introduction:
      "THE KID is in town. Phone up, films the pass as well as the plates. When the flash test comes, let them post.",
    preference: "A service worth filming",
    tells: [
      { kind: "phone", text: "Table {T} holds a phone upright and films the pass." },
      { kind: "phone", text: "Table {T} turns the phone towards the brigade. Still recording." },
      { kind: "phone", text: "Table {T} is filming another close-up. The screen lights their face." },
    ],
  },
};

export function criticForNight(night: number): CriticPersona {
  return night >= 9 ? "kid" : night >= 6 ? "madameV" : "gilliam";
}

export function criticTell(persona: CriticPersona, tells: number, table: number): CriticTell {
  const list = CRITICS[persona].tells;
  const tell = list[Math.max(0, Math.min(tells - 1, list.length - 1))];
  return { ...tell, text: tell.text.replace("{T}", String(table)) };
}

export function criticAssessment(
  persona: CriticPersona,
  f: {
    spotted: boolean;
    criticServed: number;
    criticAvg: number;
    criticAvgHospitality: number;
    screams: number;
    smashed: number;
  }
): string {
  const name = CRITICS[persona].name;
  if (!f.spotted) return "The inspector left unidentified.";
  if (f.criticServed === 0) return `${name}: You clocked me, then never fed me.`;
  const food =
    f.criticAvg >= 72
      ? "The food at my table was excellent."
      : f.criticAvg >= 45
        ? "The food at my table was acceptable."
        : "The food at my table fell short.";
  const service =
    f.criticAvgHospitality >= 75
      ? " The service was attentive."
      : f.criticAvgHospitality >= 55
        ? " The service was capable, if distracted."
        : " The service neglected the room.";
  const conduct =
    f.smashed > 0
      ? ` I counted ${f.smashed} smashed plate${f.smashed === 1 ? "" : "s"}.`
      : f.screams === 0
        ? " The pass kept its voice down."
        : ` I heard ${f.screams} shout${f.screams === 1 ? "" : "s"} from the pass.`;
  return `${name}: ${food}${service}${conduct}`;
}
