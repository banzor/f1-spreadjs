export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';

export type RaceGap =
  | { kind: 'seconds'; value: number }
  | { kind: 'laps'; value: number }
  | { kind: 'unavailable'; raw: string | null };

export interface DataQualityIssue {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  driverNumber: number | null;
  lapNumber: number | null;
}

export interface RaceMetadata {
  year: number;
  eventName: string;
  circuitName: string;
  country: string;
  scheduledStartUtc: string;
  sessionEndUtc: string;
  scheduledLaps: number;
  completedLeaderLaps: number;
  winnerDriverNumber: number;
  sessionKey: number;
  meetingKey: number;
}

export interface WeatherObservation {
  dateUtc: string;
  airTemperature: number | null;
  trackTemperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

export interface RaceControlEvent {
  id: number;
  dateUtc: string;
  category: string;
  message: string;
  flag: string | null;
  scope: string | null;
  driverNumber: number | null;
  lapNumber: number | null;
  sector: number | null;
}

export interface NeutralizationPeriod {
  kind: 'SC' | 'VSC' | 'RED' | 'YELLOW';
  startUtc: string;
  endUtc: string | null;
  scope: string | null;
  driverNumber: number | null;
  startEventId: number;
  endEventId: number | null;
  confidence: 'high' | 'ambiguous';
}

export interface RaceResult {
  position: number | null;
  reportedCompletedLaps: number | null;
  officialDurationSeconds: number | null;
  gap: RaceGap;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

export interface LapObservation {
  lapNumber: number;
  startUtc: string | null;
  endUtc: string | null;
  timeSeconds: number | null;
  sectors: [number | null, number | null, number | null];
  stintNumber: number | null;
  compound: Compound;
  positionAtEnd: number | null;
  positionSampleUtc: string | null;
  pitIn: boolean;
  pitOut: boolean;
  linkedPitIds: number[];
  neutralizationEventIds: number[];
  restartAdjacent: boolean;
  timingQualityFlags: string[];
}

export interface StintObservation {
  stintNumber: number;
  compound: Compound;
  startLap: number;
  endLap: number;
  startingTireAgeLaps: number;
  linkedPitEntryId: number | null;
  linkedPitExitId: number | null;
  boundaryQuality: 'verified' | 'uncertain';
}

export interface PitObservation {
  id: number;
  reportedLap: number;
  endOfLapBoundary: number | null;
  dateUtc: string;
  laneDurationSeconds: number | null;
  stationaryDurationSeconds: number | null;
  linkedNextStint: number | null;
  mappingConfidence: 'high' | 'ambiguous';
}

export interface DriverRace {
  driverNumber: number;
  name: string;
  abbreviation: string;
  teamName: string;
  teamColor: string;
  startingPosition: number | null;
  result: RaceResult;
  laps: LapObservation[];
  stints: StintObservation[];
  pitStops: PitObservation[];
}

export interface DatasetProvenance {
  sourceName: string;
  sourceUrl: string;
  sessionKey: number;
  meetingKey: number;
  fetchedAtUtc: string;
  normalizerVersion: string;
  endpointRequests: string[];
  rawChecksums: Record<string, string>;
  normalizedContentChecksum: string;
  attribution: string;
  termsUrl: string;
  permissionReference: string | null;
}

export interface BahrainRaceDataset {
  schemaVersion: 1;
  provenance: DatasetProvenance;
  race: RaceMetadata;
  conditions: WeatherObservation[];
  raceControlEvents: RaceControlEvent[];
  neutralizationPeriods: NeutralizationPeriod[];
  drivers: DriverRace[];
  qualityIssues: DataQualityIssue[];
}
