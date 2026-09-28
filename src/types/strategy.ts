import type { Compound } from './race';

export interface StrategyInputs {
  stops: 1 | 2;
  firstPitLap: number;
  secondPitLap: number;
  compounds: [Compound, Compound, Compound];
  startingTireAges: [number, number, number];
  basePace: number;
  degradation: { SOFT: number; MEDIUM: number; HARD: number };
  offsets: { SOFT: number; MEDIUM: 0; HARD: number };
  pitLoss: number;
  fuelEffect: number;
  targetImprovement: number;
}

export interface CalibrationPolicy {
  fuelEffect: number;
  minimumCleanLaps: number;
  minimumSlopeLaps: number;
  minimumSlopeSpan: number;
  fallbackDegradation: number;
  fallbackPitLoss: number;
}

export interface DriverSimulationEligibility {
  eligible: boolean;
  reason: string;
  fullDistanceResult: boolean;
  actualStrategyCovered: boolean;
}

export interface GoalSeekOutcome {
  success: boolean;
  previousPace: number;
  requiredPace: number | null;
  residualSeconds: number | null;
}
