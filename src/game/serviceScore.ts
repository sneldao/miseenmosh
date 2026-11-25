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
