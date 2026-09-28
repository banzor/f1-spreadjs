import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset } from '../../types/race';
import { baseSheet, headers } from '../styles';
import { dataColumns } from '../config';

export interface DataRanges {
  lapEnd: number;
  driverEnd: number;
  stintEnd: number;
  pitEnd: number;
  weatherEnd: number;
  eventEnd: number;
  lapRows: Map<string, number>;
  stintRows: Map<string, number>;
}

export function buildData(sheet: GC.Spread.Sheets.Worksheet, data: BahrainRaceDataset): DataRanges {
  const lapCount = data.drivers.reduce((sum, driver) => sum + driver.laps.length, 0);
  baseSheet(sheet, Math.max(lapCount + 5, 1500), 86);
  const lapHeaders = ['Driver #', 'Lap', 'Time s', 'Sector 1', 'Sector 2', 'Sector 3', 'Stint', 'Compound', 'Position', 'Start UTC', 'End UTC', 'Pit in', 'Pit out', 'Caution', 'Restart', 'Quality', 'Tire age', 'Candidate', 'Stint median', 'MAD', 'Clean', 'Fuel corrected', 'Clean time', 'Clean age', 'Clean corrected', 'Stint key'];
  headers(sheet, 0, 0, lapHeaders);
  headers(sheet, 0, 28, ['Driver #', 'Driver', 'Team', 'Grid', 'Finish', 'Status', 'Official s', 'Gap s', 'Gap laps', 'Completed laps', 'Pit count', 'Stints']);
  headers(sheet, 0, 26, ['Tire-adjusted s', 'Base-adjusted s']);
  headers(sheet, 0, 40, ['Best-valid lap s']);
  headers(sheet, 0, 42, ['Driver #', 'Stint', 'Compound', 'Start', 'End', 'Initial age', 'Boundary', 'Candidate median', 'MAD', 'Clean count', 'Mean s', 'Best s', 'Observed slope', 'Adjusted slope', 'Pit lane s', 'Stop s', 'Slope source']);
  headers(sheet, 0, 62, ['Driver #', 'Boundary', 'Lane s', 'Stop s', 'Date UTC', 'Next stint']);
  headers(sheet, 0, 70, ['Date UTC', 'Air °C', 'Track °C', 'Humidity', 'Rainfall', 'Wind speed']);
  headers(sheet, 0, 78, ['Date UTC', 'Category', 'Flag', 'Scope', 'Driver #', 'Lap', 'Message']);
  const lapRows = new Map<string, number>();
  const stintRows = new Map<string, number>();
  let lapRow = 1;
  let stintRow = 1;
  let pitRow = 1;
  for (const [driverIndex, driver] of data.drivers.entries()) {
    const gapSeconds = driver.result.gap.kind === 'seconds' ? driver.result.gap.value : null;
    const gapLaps = driver.result.gap.kind === 'laps' ? driver.result.gap.value : null;
    const status = driver.result.dsq ? 'DSQ' : driver.result.dns ? 'DNS' : driver.result.dnf ? 'DNF' : driver.result.position === null ? 'NC' : 'FIN';
    sheet.setArray(driverIndex + 1, 28, [[driver.driverNumber, driver.name, driver.teamName, driver.startingPosition, driver.result.position, status, driver.result.officialDurationSeconds, gapSeconds, gapLaps, driver.result.reportedCompletedLaps, driver.pitStops.length, driver.stints.map(stint => stint.compound[0]).join('–')]]);
    for (const stint of driver.stints) {
      stintRows.set(`${driver.driverNumber}:${stint.stintNumber}`, stintRow);
      const exitPit = driver.pitStops.find(pit => pit.id === stint.linkedPitExitId);
      sheet.setArray(stintRow, 42, [[driver.driverNumber, stint.stintNumber, stint.compound, stint.startLap, stint.endLap, stint.startingTireAgeLaps, stint.boundaryQuality, null, null, null, null, null, null, null, exitPit?.laneDurationSeconds ?? null, exitPit?.stationaryDurationSeconds ?? null, null]]);
      stintRow++;
    }
    for (const pit of driver.pitStops) {
      sheet.setArray(pitRow, 62, [[driver.driverNumber, pit.endOfLapBoundary, pit.laneDurationSeconds, pit.stationaryDurationSeconds, pit.dateUtc, pit.linkedNextStint]]);
      pitRow++;
    }
    for (const lap of driver.laps) {
      lapRows.set(`${driver.driverNumber}:${lap.lapNumber}`, lapRow);
      sheet.setArray(lapRow, 0, [[driver.driverNumber, lap.lapNumber, lap.timeSeconds, ...lap.sectors, lap.stintNumber, lap.compound, lap.positionAtEnd, lap.startUtc, lap.endUtc, Number(lap.pitIn), Number(lap.pitOut), Number(lap.neutralizationEventIds.length > 0), Number(lap.restartAdjacent), lap.timingQualityFlags.join(', '), null, null, null, null, null, null, null, null, null, lap.stintNumber === null ? '' : `${driver.driverNumber}:${lap.stintNumber}`]]);
      lapRow++;
    }
  }
  data.conditions.forEach((item, index) => sheet.setArray(index + 1, 70, [[item.dateUtc, item.airTemperature, item.trackTemperature, item.humidity, item.rainfall, item.windSpeed]]));
  data.raceControlEvents.forEach((item, index) => sheet.setArray(index + 1, 78, [[item.dateUtc, item.category, item.flag, item.scope, item.driverNumber, item.lapNumber, item.message]]));
  const lapEnd = lapRow;
  const stintEnd = stintRow;
  const full = (column: string) => `$${column}$2:$${column}$${lapEnd}`;
  for (let row = 1; row < lapEnd; row++) {
    const r = row + 1;
    const stintKey = String(sheet.getValue(row, dataColumns.stintKey));
    const relatedStint = stintRows.get(stintKey);
    sheet.setFormula(row, dataColumns.age, relatedStint === undefined ? '=""' : `=IF(G${r}="","",AV${relatedStint + 1}+B${r}-AT${relatedStint + 1})`);
    sheet.setFormula(row, dataColumns.candidate, `=IF(AND(ISNUMBER(C${r}),C${r}>0,B${r}>1,L${r}=0,M${r}=0,N${r}=0,O${r}=0,P${r}="",G${r}<>"",IFERROR(INDEX(${full('M')},ROW()-2),0)=0),1,0)`);
    sheet.setFormula(row, dataColumns.median, relatedStint === undefined ? '=""' : `=AX${relatedStint + 1}`);
    sheet.setFormula(row, dataColumns.mad, relatedStint === undefined ? '=""' : `=AY${relatedStint + 1}`);
    sheet.setFormula(row, dataColumns.clean, `=IF(R${r}=0,0,IF(COUNTIFS(${full('Z')},Z${r},${full('R')},1)<5,1,IF(C${r}>S${r}+MAX(3,3*1.4826*T${r}),0,1)))`);
    sheet.setFormula(row, dataColumns.corrected, `=IF(ISNUMBER(C${r}),C${r}+'Tire Strategy'!$B$102*(B${r}-1),"")`);
    sheet.setFormula(row, dataColumns.cleanTime, `=IF(U${r}=1,C${r},"")`);
    sheet.setFormula(row, dataColumns.cleanAge, `=IF(U${r}=1,Q${r},"")`);
    sheet.setFormula(row, dataColumns.cleanCorrected, `=IF(U${r}=1,V${r},"")`);
    sheet.setFormula(row, 40, `=IF(AND(ISNUMBER(C${r}),C${r}>0,ISERROR(SEARCH("DELETED_LAP",P${r}))),C${r},"")`);
  }
  for (let row = 1; row < stintEnd; row++) {
    const r = row + 1;
    const key = `${sheet.getValue(row, 42)}:${sheet.getValue(row, 43)}`;
    const k = full('Z');
    sheet.setFormula(row, 49, `=IFERROR(MEDIAN(FILTER(${full('C')},(${k}="${key}")*(${full('R')}=1))),"")`);
    sheet.setFormula(row, 50, `=IFERROR(MEDIAN(ABS(FILTER(${full('C')},(${k}="${key}")*(${full('R')}=1))-AX${r})),"")`);
    sheet.setFormula(row, 51, `=COUNTIFS(${k},"${key}",${full('U')},1)`);
    sheet.setFormula(row, 52, `=IF(AZ${r}<5,"",AVERAGE(FILTER(${full('W')},(${k}="${key}")*(${full('U')}=1))))`);
    sheet.setFormula(row, 53, `=IF(AZ${r}<5,"",MIN(FILTER(${full('W')},(${k}="${key}")*(${full('U')}=1))))`);
    sheet.setFormula(row, 54, `=IF(OR(AZ${r}<6,AU${r}-AT${r}<8),"",SLOPE(FILTER(${full('W')},(${k}="${key}")*(${full('U')}=1)),FILTER(${full('X')},(${k}="${key}")*(${full('U')}=1))))`);
    sheet.setFormula(row, 55, `=IF(OR(AZ${r}<6,AU${r}-AT${r}<8),"",SLOPE(FILTER(${full('Y')},(${k}="${key}")*(${full('U')}=1)),FILTER(${full('X')},(${k}="${key}")*(${full('U')}=1))))`);
    sheet.setFormula(row, 58, `=IF(ISNUMBER(BD${r}),"Observed","Insufficient")`);
  }
  for (const driver of data.drivers) {
    for (const lap of driver.laps) {
      const row = lapRows.get(`${driver.driverNumber}:${lap.lapNumber}`)!;
      if (lap.lapNumber === 1) continue;
      const priorRow = lapRows.get(`${driver.driverNumber}:${lap.lapNumber - 1}`);
      if (priorRow !== undefined && driver.laps.find(item => item.lapNumber === lap.lapNumber - 1)?.pitOut) {
        sheet.setValue(row, 15, `${lap.timingQualityFlags.join(', ')} WARMUP`.trim());
      }
    }
  }
  const theme = GC.Spread.Sheets.Tables.TableThemes.light1;
  for (const [name, start, width, count] of [
    ['Laps', 0, 28, lapEnd],
    ['Drivers', 28, 12, data.drivers.length + 1],
    ['Stints', 42, 17, stintEnd],
    ['PitStops', 62, 6, pitRow],
    ['Weather', 70, 6, data.conditions.length + 1],
    ['RaceEvents', 78, 7, data.raceControlEvents.length + 1]
  ] as [string, number, number, number][]) sheet.tables.add(name, 0, start, count, width, theme);
  sheet.frozenRowCount(1);
  sheet.frozenColumnCount(2);
  sheet.visible(false);
  return { lapEnd, driverEnd: data.drivers.length + 1, stintEnd, pitEnd: pitRow, weatherEnd: data.conditions.length + 1, eventEnd: data.raceControlEvents.length + 1, lapRows, stintRows };
}
