export interface ServiceScoreFacts {
  served: number;
  avgQuality: number;
  avgHospitality: number;
  misses: number;
  complaints: number;
  walkouts: number;
}

export interface ServiceScore {
  stars: number;
  foodStars: number;
  hospitalityStars: number;
  brigadeStars: number;
  penalties: number;
}

export function scoreService(f: ServiceScoreFacts): ServiceScore {
  const foodStars = f.served === 0 ? 0
    : f.avgQuality >= 85 ? 3
      : f.avgQuality >= 72 ? 2
        : f.avgQuality >= 58 ? 1
          : 0;
  const hospitalityStars = f.served > 0 && f.avgHospitality >= 75 ? 1 : 0;
  const brigadeStars = f.served >= 8 && f.misses === 0 && f.complaints === 0 && f.walkouts === 0 ? 1 : 0;
  const penalties = Math.min(2, f.misses + f.walkouts);
  return {
    stars: Math.max(0, Math.min(5, foodStars + hospitalityStars + brigadeStars - penalties)),
    foodStars,
    hospitalityStars,
    brigadeStars,
    penalties,
  };
}

export function runningAverage(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

export function residencyWon(f: {
  stars: number;
  avgCulinary: number;
  avgHospitality: number;
  defections: number;
  totalWalkouts: number;
  cash: number;
}): boolean {
  return f.stars >= 10
    && f.avgCulinary >= 72
    && f.avgHospitality >= 65
    && f.defections < 3
    && f.totalWalkouts < 6
    && f.cash >= -60;
}

/** The nightly side order: one optional challenge, priced in ego, resolved
 *  on the review card alongside the bets and the vow. No new systems — the
 *  checks read facts the service already records. */
export interface SideOrder {
  id: string;
  /** the ask, in the pass's voice */
  text: string;
  pay: number;
}

export const SIDE_ORDERS: readonly SideOrder[] = [
  { id: "n1_no_walks", text: "The whole brigade still standing at close", pay: 6 },
  { id: "n2_save_sauce", text: "Dimitri's first sauce whisked back before it goes out", pay: 6 },
  { id: "n3_golden", text: "One golden Wellington leaves the pass", pay: 6 },
  { id: "n4_fast", text: "The FAST table served inside its 30 seconds", pay: 8 },
  { id: "n5_shoo", text: "A runner shooed before it touches the rail", pay: 8 },
  { id: "n6_no_fire", text: "No station catches fire", pay: 8 },
  { id: "n7_101", text: "Move 101 mid-rush and still turn it twice", pay: 8 },
  { id: "n8_champagne", text: "Champagne on the house and eight covers anyway", pay: 8 },
  { id: "n9_silent", text: "A service with no screams and eight covers", pay: 12 },
];

export function sideOrderFor(night: number): SideOrder | null {
  return SIDE_ORDERS[Math.max(0, Math.min(SIDE_ORDERS.length - 1, night - 1))] ?? null;
}

export interface SideOrderFacts {
  walkouts: number;
  sauceOutcomeSaved: boolean;
  goldenServed: boolean;
  requestFastLanded: boolean;
  runnerShooed: boolean;
  anyBurned: boolean;
  moved101: boolean;
  table101Turns: number;
  comped: boolean;
  served: number;
  screams: number;
}

export function resolveSideOrder(night: number, f: SideOrderFacts): { order: SideOrder; line: string } | null {
  const order = sideOrderFor(night);
  if (!order) return null;
  const won = (() => {
    switch (order.id) {
      case "n1_no_walks": return f.walkouts === 0;
      case "n2_save_sauce": return f.sauceOutcomeSaved;
      case "n3_golden": return f.goldenServed;
      case "n4_fast": return f.requestFastLanded;
      case "n5_shoo": return f.runnerShooed;
      case "n6_no_fire": return !f.anyBurned;
      case "n7_101": return f.moved101 && f.table101Turns >= 2;
      case "n8_champagne": return f.comped && f.served >= 8;
      case "n9_silent": return f.screams === 0 && f.served >= 8;
      default: return false;
    }
  })();
  if (!won) return null;
  return { order, line: `SIDE ORDER HELD: ${order.text.toLowerCase()} — +${order.pay} ego.` };
}
