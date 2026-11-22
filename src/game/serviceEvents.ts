export type TellKind = "notebook" | "phone" | "inspect";
export type FolkloreKind = "fork" | "glass" | "coat" | "return" | "flash";
export type FolkloreResult = "answered" | "ignored" | "expired" | "refired" | "allowed";

export type ServiceEvent = { at: number } & (
  | {
      kind: "plate";
      ticketId: number;
      dish: string;
      table: number;
      cookName: string;
      verdict: "serve" | "sendback" | "smash";
      /** actual food quality — a flawed plate is never called pristine */
      quality: number;
      /** contextual score after coursing/preference bonuses, when it differs */
      guestScore?: number;
    }
  | { kind: "scream"; power: number; over: boolean }
  | { kind: "walkout"; cookId: number; cookName: string }
  | { kind: "rescue"; cookId: number; cookName: string; action: "catch" | "whisk" | "stay"; dish?: string }
  | { kind: "intervention"; action: "smother" | "whisk" | "shoo"; cookName?: string; dish?: string; ticketId?: number }
  | { kind: "critic-tell"; table: number; tell: TellKind }
  | { kind: "critic-flag"; result: "correct" | "wrong" | "late"; table?: number }
  | { kind: "folklore"; test: FolkloreKind; result: FolkloreResult; table: number }
);

export type FolkloreOutcome = Extract<ServiceEvent, { kind: "folklore" }>;

export const MAX_SERVICE_EVENTS = 128;

/** Bounded narrative history — old entries fall out; aggregate counters stay
 *  authoritative. Never mutates the input array. */
export function appendServiceEvent(
  events: readonly ServiceEvent[],
  event: ServiceEvent
): ServiceEvent[] {
  return [...events.slice(-(MAX_SERVICE_EVENTS - 1)), event];
}
