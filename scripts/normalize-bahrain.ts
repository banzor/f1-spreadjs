import { createHash } from 'node:crypto';
import type { BahrainRaceDataset, Compound, DataQualityIssue, DriverRace, LapObservation, NeutralizationPeriod, RaceControlEvent, RaceGap } from '../src/types/race';
import type { OpenF1Responses } from './types/openf1';

const validCompounds = new Set<Compound>(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET']);
const finiteOrNull = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const timestamp = (value: string | null | undefined): number | null => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const iso = (value: string): string => new Date(value).toISOString();

function gap(value: number | string | null): RaceGap {
  if (typeof value === 'number' && Number.isFinite(value)) return { kind: 'seconds', value };
  if (typeof value === 'string') {
    const match = value.match(/\+?(\d+)\s+LAPS?/i);
    if (match) return { kind: 'laps', value: Number(match[1]) };
  }
  return { kind: 'unavailable', raw: value === null ? null : String(value) };
}

function periods(events: RaceControlEvent[], issues: DataQualityIssue[]): NeutralizationPeriod[] {
  const output: NeutralizationPeriod[] = [];
  const active = new Map<string, NeutralizationPeriod>();
  const classify = (event: RaceControlEvent): NeutralizationPeriod['kind'] | null => {
    const message = event.message.toUpperCase();
    if (event.category === 'SafetyCar' && (message.includes('VIRTUAL SAFETY CAR') || message.includes('VSC'))) return 'VSC';
    if (event.category === 'SafetyCar' && message.includes('SAFETY CAR')) return 'SC';
    if (event.category === 'Flag' && (message.includes('RED FLAG') || event.flag === 'RED')) return 'RED';
    if (event.category === 'Flag' && (message.includes('YELLOW') || event.flag?.includes('YELLOW') || event.flag === 'CLEAR')) return 'YELLOW';
    return null;
  };
  for (const event of events) {
    const kind = classify(event);
    if (!kind) continue;
    const key = `${kind}:${event.scope ?? 'Track'}:${event.sector ?? 0}:${event.driverNumber ?? 0}`;
    const message = event.message.toUpperCase();
    const closing = /ENDING|ENDED|WITHDRAWN|GREEN FLAG|CLEAR|IN THIS LAP|CHEQUERED|RESTART/.test(message) || event.flag === 'GREEN' || event.flag === 'CLEAR';
    const opening = /DEPLOY|START|YELLOW|RED FLAG|VSC|SAFETY CAR/.test(message) && !closing;
    if (closing && active.has(key)) {
      const period = active.get(key)!;
      period.endUtc = event.dateUtc;
      period.endEventId = event.id;
      output.push(period);
      active.delete(key);
    } else if (opening && !active.has(key)) {
      active.set(key, { kind, startUtc: event.dateUtc, endUtc: null, scope: event.scope, driverNumber: event.driverNumber, startEventId: event.id, endEventId: null, confidence: 'high' });
    }
  }
  for (const period of active.values()) {
    period.confidence = 'ambiguous';
    issues.push({ severity: 'warning', code: 'UNCLOSED_CAUTION', message: `${period.kind} beginning at ${period.startUtc} was not closed by a matched event`, driverNumber: period.driverNumber, lapNumber: null });
    output.push(period);
  }
  return output.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

function addIssue(issues: DataQualityIssue[], code: string, message: string, driverNumber: number | null = null, lapNumber: number | null = null, severity: DataQualityIssue['severity'] = 'warning'): void {
  issues.push({ severity, code, message, driverNumber, lapNumber });
}

function validateObservations(drivers: DriverRace[], events: RaceControlEvent[], raceLaps: number): void {
  const numbers = new Set<number>();
  for (const driver of drivers) {
    if (numbers.has(driver.driverNumber)) throw new Error(`Duplicate driver ${driver.driverNumber}`);
    numbers.add(driver.driverNumber);
    if (driver.result.officialDurationSeconds !== null && driver.result.officialDurationSeconds <= 0) throw new Error(`Invalid official duration for ${driver.abbreviation}`);
    let priorLap = 0;
    for (const lap of driver.laps) {
      if (lap.lapNumber <= priorLap || lap.lapNumber > raceLaps) throw new Error(`Invalid lap order for ${driver.abbreviation} lap ${lap.lapNumber}`);
      if (lap.timeSeconds !== null && lap.timeSeconds <= 0) throw new Error(`Invalid lap time for ${driver.abbreviation} lap ${lap.lapNumber}`);
      const hasStint = driver.stints.some(stint => lap.lapNumber >= stint.startLap && lap.lapNumber <= stint.endLap);
      const incompleteRetirementLap = driver.result.dnf && lap.timeSeconds === null && lap.lapNumber > (driver.result.reportedCompletedLaps ?? 0);
      if (!hasStint && !incompleteRetirementLap) throw new Error(`Lap ${lap.lapNumber} has no stint for ${driver.abbreviation}`);
      priorLap = lap.lapNumber;
    }
    for (const [index, stint] of driver.stints.entries()) {
      if (stint.startLap < 1 || stint.endLap < stint.startLap || stint.endLap > raceLaps) throw new Error(`Invalid stint ${stint.stintNumber} for ${driver.abbreviation}`);
      if (index > 0 && driver.stints[index - 1].endLap + 1 !== stint.startLap) throw new Error(`Stint coverage gap or overlap for ${driver.abbreviation}`);
    }
    for (const pit of driver.pitStops) {
      if (pit.laneDurationSeconds !== null && pit.laneDurationSeconds <= 0) throw new Error(`Invalid pit duration for ${driver.abbreviation}`);
      if (pit.endOfLapBoundary !== null && (pit.endOfLapBoundary < 1 || pit.endOfLapBoundary >= raceLaps || !driver.stints.some(stint => stint.startLap === pit.endOfLapBoundary! + 1))) throw new Error(`Invalid pit boundary for ${driver.abbreviation}`);
    }
  }
  if (events.some((event, index) => index > 0 && event.dateUtc < events[index - 1].dateUtc)) throw new Error('Race control events are not sorted');
}

export function normalizeBahrain(raw: OpenF1Responses, requests: string[], checksums: Record<string, string>, fetchedAtUtc: string): BahrainRaceDataset {
  const issues: DataQualityIssue[] = [];
  const sessions = raw.sessions.filter(s => s.year === 2025 && s.session_name === 'Race' && s.session_key === 10014 && !s.is_cancelled);
  if (sessions.length !== 1) throw new Error(`Expected one completed Bahrain 2025 race session; found ${sessions.length}`);
  const session = sessions[0];
  const matchSession = <T extends { session_key: number }>(name: string, values: T[]): T[] => {
    const mismatches = values.filter(v => v.session_key !== session.session_key);
    if (mismatches.length) throw new Error(`${name} contains ${mismatches.length} records from other sessions`);
    return values;
  };
  for (const [name, values] of Object.entries(raw)) {
    if (name !== 'sessions' && name !== 'meetings') matchSession(name, values as { session_key: number }[]);
  }
  const results = matchSession('session_result', raw.session_result);
  if (!results.length) throw new Error('No final session results');
  const winner = results.find(r => r.position === 1);
  if (!winner || !winner.number_of_laps || !winner.duration) throw new Error('Winner result is incomplete');
  const events: RaceControlEvent[] = raw.race_control.map(event => ({
    id: 0,
    dateUtc: iso(event.date),
    category: event.category ?? '',
    message: event.message ?? '',
    flag: event.flag ?? null,
    scope: event.scope ?? null,
    driverNumber: finiteOrNull(event.driver_number),
    lapNumber: finiteOrNull(event.lap_number),
    sector: finiteOrNull(event.sector)
  })).sort((a, b) => a.dateUtc.localeCompare(b.dateUtc)).map((event, index) => ({ ...event, id: index + 1 }));
  const neutralizationPeriods = periods(events, issues);
  const deletedLaps = new Set(events.filter(event => /TIME .* DELETED/.test(event.message)).map(event => {
    const car = event.message.match(/CAR\s+(\d+)/);
    const lap = event.message.match(/LAP\s+(\d+)/);
    return car && lap ? `${Number(car[1])}:${Number(lap[1])}` : '';
  }));
  const driverRows = new Map(raw.drivers.map(driver => [driver.driver_number, driver]));
  const gridRows = new Map(raw.starting_grid.map(grid => [grid.driver_number, grid]));
  if (!raw.starting_grid.length) addIssue(issues, 'GRID_FEED_UNAVAILABLE', 'OpenF1 starting_grid returned no records; pre-race position samples are used where present');
  const drivers: DriverRace[] = results.map(result => {
    const number = result.driver_number;
    const identity = driverRows.get(number);
    if (!identity) throw new Error(`Missing identity for driver ${number}`);
    const sourceStints = raw.stints.filter(s => s.driver_number === number).sort((a, b) => a.stint_number - b.stint_number);
    const sourceLaps = raw.laps.filter(l => l.driver_number === number).sort((a, b) => a.lap_number - b.lap_number);
    const sourcePits = raw.pit.filter(p => p.driver_number === number).sort((a, b) => a.date.localeCompare(b.date));
    const positions = raw.position.filter(p => p.driver_number === number).sort((a, b) => a.date.localeCompare(b.date));
    const preRaceGrid = positions.filter(p => timestamp(p.date) !== null && timestamp(p.date)! < timestamp(session.date_start)!).at(-1)?.position ?? null;
    if (!gridRows.has(number) && preRaceGrid === null) addIssue(issues, 'GRID_UNKNOWN', 'No grid position or pre-race position sample', number);
    const lapNumbers = new Set<number>();
    for (const lap of sourceLaps) {
      if (lapNumbers.has(lap.lap_number)) addIssue(issues, 'DUPLICATE_LAP', `Duplicate lap ${lap.lap_number}`, number, lap.lap_number, 'error');
      lapNumbers.add(lap.lap_number);
    }
    const pitStops = sourcePits.map((pit, index) => {
      const nextStint = sourceStints.find(s => s.lap_start === pit.lap_number + 1);
      const boundary = nextStint ? pit.lap_number : sourceStints.find(s => s.lap_start === pit.lap_number)?.lap_start;
      if (!nextStint) addIssue(issues, 'PIT_STINT_MAPPING', `Pit at reported lap ${pit.lap_number} has no exact next-stint boundary`, number, pit.lap_number);
      return {
        id: number * 100 + index + 1,
        reportedLap: pit.lap_number,
        endOfLapBoundary: nextStint ? boundary ?? null : null,
        dateUtc: iso(pit.date),
        laneDurationSeconds: finiteOrNull(pit.lane_duration ?? pit.pit_duration),
        stationaryDurationSeconds: finiteOrNull(pit.stop_duration),
        linkedNextStint: nextStint?.stint_number ?? null,
        mappingConfidence: nextStint ? 'high' as const : 'ambiguous' as const
      };
    });
    const stints = sourceStints.map((stint, index) => {
      const compoundText = (stint.compound ?? '').toUpperCase() as Compound;
      const compound: Compound = validCompounds.has(compoundText) ? compoundText : 'UNKNOWN';
      if (compound === 'UNKNOWN') addIssue(issues, 'UNKNOWN_COMPOUND', `Unknown compound ${stint.compound}`, number, stint.lap_start);
      const endLap = stint.lap_end ?? sourceLaps.at(-1)?.lap_number ?? stint.lap_start;
      const entry = pitStops.find(p => p.linkedNextStint === stint.stint_number);
      const exit = pitStops.find(p => p.endOfLapBoundary === endLap);
      const prior = sourceStints[index - 1];
      const boundaryQuality = (!prior || prior.lap_end === stint.lap_start - 1) && (!prior || entry) ? 'verified' as const : 'uncertain' as const;
      if (boundaryQuality === 'uncertain') addIssue(issues, 'STINT_BOUNDARY', `Stint ${stint.stint_number} has uncertain boundary`, number, stint.lap_start);
      return { stintNumber: stint.stint_number, compound, startLap: stint.lap_start, endLap, startingTireAgeLaps: stint.tyre_age_at_start ?? 0, linkedPitEntryId: entry?.id ?? null, linkedPitExitId: exit?.id ?? null, boundaryQuality };
    });
    const laps: LapObservation[] = sourceLaps.map((source, index) => {
      const startMs = timestamp(source.date_start);
      const endMs = timestamp(sourceLaps[index + 1]?.date_start ?? null) ?? (startMs && source.lap_duration ? startMs + source.lap_duration * 1000 : null);
      const stint = stints.find(s => s.startLap <= source.lap_number && source.lap_number <= s.endLap);
      const position = [...positions].reverse().find(p => endMs !== null && timestamp(p.date)! <= endMs);
      const caution = neutralizationPeriods.filter(period => {
        const from = timestamp(period.startUtc);
        const to = period.endUtc ? timestamp(period.endUtc) : timestamp(session.date_end);
        return startMs !== null && endMs !== null && from !== null && to !== null && startMs < to && endMs > from && (period.driverNumber === null || period.driverNumber === number);
      });
      const restartAdjacent = neutralizationPeriods.some(period => period.endUtc && startMs !== null && endMs !== null && timestamp(period.endUtc)! <= startMs && startMs - timestamp(period.endUtc)! <= 150000);
      const flags: string[] = [];
      if (source.lap_duration === null || source.lap_duration <= 0) flags.push('MISSING_OR_INVALID_TIME');
      if (deletedLaps.has(`${number}:${source.lap_number}`)) flags.push('DELETED_LAP');
      if (!stint) flags.push('NO_STINT');
      if (startMs === null || endMs === null) flags.push('MISSING_TIMESTAMP');
      const pitIn = pitStops.some(p => p.endOfLapBoundary === source.lap_number);
      return {
        lapNumber: source.lap_number,
        startUtc: startMs === null ? null : new Date(startMs).toISOString(),
        endUtc: endMs === null ? null : new Date(endMs).toISOString(),
        timeSeconds: finiteOrNull(source.lap_duration),
        sectors: [finiteOrNull(source.duration_sector_1), finiteOrNull(source.duration_sector_2), finiteOrNull(source.duration_sector_3)],
        stintNumber: stint?.stintNumber ?? null,
        compound: stint?.compound ?? 'UNKNOWN',
        positionAtEnd: finiteOrNull(position?.position),
        positionSampleUtc: position ? iso(position.date) : null,
        pitIn,
        pitOut: source.is_pit_out_lap === true,
        linkedPitIds: pitStops.filter(p => p.reportedLap === source.lap_number || p.endOfLapBoundary === source.lap_number).map(p => p.id),
        neutralizationEventIds: caution.map(p => p.startEventId),
        restartAdjacent,
        timingQualityFlags: flags
      };
    });
    if (result.number_of_laps !== null && sourceLaps.length < result.number_of_laps - 1) addIssue(issues, 'LAP_COVERAGE', `Only ${sourceLaps.length} lap records for ${result.number_of_laps} completed laps`, number);
    return {
      driverNumber: number,
      name: identity.full_name.split(' ').map(part => part[0] + part.slice(1).toLowerCase()).join(' '),
      abbreviation: identity.name_acronym,
      teamName: identity.team_name ?? 'Unknown team',
      teamColor: identity.team_colour ? `#${identity.team_colour}` : '#7891a8',
      startingPosition: finiteOrNull(gridRows.get(number)?.position ?? preRaceGrid),
      result: { position: finiteOrNull(result.position), reportedCompletedLaps: finiteOrNull(result.number_of_laps), officialDurationSeconds: finiteOrNull(result.duration), gap: gap(result.gap_to_leader), dnf: result.dnf, dns: result.dns, dsq: result.dsq },
      laps,
      stints,
      pitStops
    };
  }).sort((a, b) => (a.result.position ?? 100) - (b.result.position ?? 100) || a.driverNumber - b.driverNumber);
  validateObservations(drivers, events, winner.number_of_laps);
  const meeting = raw.meetings.find(m => m.meeting_key === session.meeting_key);
  const content = {
    schemaVersion: 1 as const,
    race: {
      year: session.year,
      eventName: meeting?.meeting_name ?? 'Bahrain Grand Prix',
      circuitName: session.circuit_short_name,
      country: session.country_name,
      scheduledStartUtc: iso(session.date_start),
      sessionEndUtc: iso(session.date_end),
      scheduledLaps: 57,
      completedLeaderLaps: winner.number_of_laps,
      winnerDriverNumber: winner.driver_number,
      sessionKey: session.session_key,
      meetingKey: session.meeting_key
    },
    conditions: raw.weather.map(w => ({ dateUtc: iso(w.date), airTemperature: finiteOrNull(w.air_temperature), trackTemperature: finiteOrNull(w.track_temperature), humidity: finiteOrNull(w.humidity), rainfall: finiteOrNull(w.rainfall), windSpeed: finiteOrNull(w.wind_speed), windDirection: finiteOrNull(w.wind_direction) })).sort((a, b) => a.dateUtc.localeCompare(b.dateUtc)),
    raceControlEvents: events,
    neutralizationPeriods,
    drivers,
    qualityIssues: issues
  };
  if (issues.some(issue => issue.severity === 'error')) throw new Error(`Normalization produced ${issues.filter(issue => issue.severity === 'error').length} errors`);
  return {
    ...content,
    provenance: {
      sourceName: 'OpenF1',
      sourceUrl: 'https://openf1.org/',
      sessionKey: session.session_key,
      meetingKey: session.meeting_key,
      fetchedAtUtc,
      normalizerVersion: '1.0.0',
      endpointRequests: requests,
      rawChecksums: checksums,
      normalizedContentChecksum: createHash('sha256').update(JSON.stringify(content)).digest('hex'),
      attribution: 'OpenF1 data used with permission (openf1.org). Unofficial independent analysis.',
      termsUrl: 'https://openf1.org/',
      permissionReference: 'Direct permission from Bruno Godefroy at OpenF1 to use this data in videos, blogs, demos, and the public GitHub Pages demo with bundled data, confirmed by the project owner on 2026-09-28; separate public source-repository distribution was not specified.'
    }
  };
}
