import type { CalibrationPolicy } from '../types/strategy';

export const sheets = {
  dashboard: 'Race Dashboard',
  laps: 'Lap Analysis',
  tires: 'Tire Strategy',
  simulator: 'Strategy Simulator',
  data: 'Data'
} as const;

export const policy: CalibrationPolicy = {
  fuelEffect: 0.04,
  minimumCleanLaps: 5,
  minimumSlopeLaps: 6,
  minimumSlopeSpan: 8,
  fallbackDegradation: 0.05,
  fallbackPitLoss: 23
};

export const palette = {
  ink: '#192a39',
  muted: '#637589',
  navy: '#152635',
  accent: '#006f8c',
  blue: '#e4f3ff',
  teal: '#d9f3ef',
  observed: '#eef1f4',
  border: '#d9e1e8',
  soft: '#d93b46',
  medium: '#e4ad23',
  hard: '#e7eaf0',
  caution: '#fff0aa',
  positive: '#dcefe4',
  negative: '#fce1e0'
} as const;

export const sim = {
  inputColumn: 2,
  rows: {
    stops: 7,
    pit1: 8,
    pit2: 9,
    compound1: 10,
    compound2: 11,
    compound3: 12,
    age1: 13,
    age2: 14,
    age3: 15,
    base: 16,
    softDeg: 17,
    mediumDeg: 18,
    hardDeg: 19,
    softOffset: 20,
    hardOffset: 21,
    pitLoss: 22,
    fuel: 23,
    target: 24
  },
  actualDuration: { row: 7, col: 6 },
  referencePace: { row: 8, col: 6 },
  candidateTotal: { row: 10, col: 6 },
  actualModelTotal: { row: 11, col: 6 },
  delta: { row: 12, col: 6 },
  adjustment: { row: 13, col: 6 },
  projected: { row: 14, col: 6 },
  validity: { row: 16, col: 6 },
  tableRow: 32,
  tableCol: 2,
  candidateStart: 55,
  referenceStart: 55
} as const;

export const inputRows = Object.values(sim.rows).filter(row => row !== sim.rows.target);

export const dataColumns = {
  driver: 0,
  lap: 1,
  time: 2,
  s1: 3,
  s2: 4,
  s3: 5,
  stint: 6,
  compound: 7,
  position: 8,
  start: 9,
  end: 10,
  pitIn: 11,
  pitOut: 12,
  caution: 13,
  restart: 14,
  flags: 15,
  age: 16,
  candidate: 17,
  median: 18,
  mad: 19,
  clean: 20,
  corrected: 21,
  cleanTime: 22,
  cleanAge: 23,
  cleanCorrected: 24,
  stintKey: 25
} as const;
