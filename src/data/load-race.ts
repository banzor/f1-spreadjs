import data from './bahrain-race.json';
import type { BahrainRaceDataset } from '../types/race';

export function loadRace(): BahrainRaceDataset {
  const candidate = data as unknown as BahrainRaceDataset;
  if (candidate.schemaVersion !== 1 || candidate.race.sessionKey !== 10014 || candidate.race.scheduledLaps !== 57 || candidate.drivers.length < 19) {
    throw new Error('The bundled 2025 Bahrain dataset is missing or incompatible. Run npm run data:fetch.');
  }
  return candidate;
}
