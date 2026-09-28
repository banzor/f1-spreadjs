import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset, DriverRace } from '../../types/race';
import type { StrategyInputs } from '../../types/strategy';
import type { DataRanges } from './data';
import { baseSheet, columnLeft, headers, inputCell, resultCell, rowTop, section, seconds, signedSeconds, title } from '../styles';
import { calibrationRows } from './tire-strategy';
import { sim } from '../config';

const labels: Record<keyof typeof sim.rows, string> = {
  stops: 'Number of stops',
  pit1: 'First pit / end of lap',
  pit2: 'Second pit / end of lap',
  compound1: 'Starting compound',
  compound2: 'Second compound',
  compound3: 'Third compound',
  age1: 'Starting tire age 1',
  age2: 'Starting tire age 2',
  age3: 'Starting tire age 3',
  base: 'Base pace / s per lap',
  softDeg: 'Soft degradation / s per lap',
  mediumDeg: 'Medium degradation / s per lap',
  hardDeg: 'Hard degradation / s per lap',
  softOffset: 'Soft pace offset / s',
  hardOffset: 'Hard pace offset / s',
  pitLoss: 'Net pit loss / s',
  fuel: 'Fuel gain / s per race lap',
  target: 'Target improvement / s'
};

export function eligibility(driver: DriverRace, raceLaps: number): { eligible: boolean; reason: string } {
  const complete = !driver.result.dnf && !driver.result.dns && !driver.result.dsq && driver.result.reportedCompletedLaps === raceLaps && typeof driver.result.officialDurationSeconds === 'number';
  const covered = driver.stints.length > 0 && driver.stints[0].startLap === 1 && driver.stints.at(-1)?.endLap === raceLaps && driver.stints.every((stint, index) => index === 0 || driver.stints[index - 1].endLap + 1 === stint.startLap);
  return { eligible: complete && covered, reason: complete ? covered ? '' : 'Actual stint coverage is incomplete' : 'No comparable 57-lap official baseline' };
}

export function readInputs(sheet: GC.Spread.Sheets.Worksheet): StrategyInputs {
  const value = (row: number) => sheet.getValue(row, sim.inputColumn);
  return {
    stops: Number(value(sim.rows.stops)) as 1 | 2,
    firstPitLap: Number(value(sim.rows.pit1)),
    secondPitLap: Number(value(sim.rows.pit2)),
    compounds: [value(sim.rows.compound1), value(sim.rows.compound2), value(sim.rows.compound3)],
    startingTireAges: [Number(value(sim.rows.age1)), Number(value(sim.rows.age2)), Number(value(sim.rows.age3))],
    basePace: Number(value(sim.rows.base)),
    degradation: { SOFT: Number(value(sim.rows.softDeg)), MEDIUM: Number(value(sim.rows.mediumDeg)), HARD: Number(value(sim.rows.hardDeg)) },
    offsets: { SOFT: Number(value(sim.rows.softOffset)), MEDIUM: 0, HARD: Number(value(sim.rows.hardOffset)) },
    pitLoss: Number(value(sim.rows.pitLoss)),
    fuelEffect: Number(value(sim.rows.fuel)),
    targetImprovement: Number(value(sim.rows.target))
  };
}

export function writeInputs(sheet: GC.Spread.Sheets.Worksheet, values: StrategyInputs): void {
  const set = (row: number, value: string | number) => sheet.setValue(row, sim.inputColumn, value);
  set(sim.rows.stops, values.stops);
  set(sim.rows.pit1, values.firstPitLap);
  set(sim.rows.pit2, values.secondPitLap);
  set(sim.rows.compound1, values.compounds[0]);
  set(sim.rows.compound2, values.compounds[1]);
  set(sim.rows.compound3, values.compounds[2]);
  set(sim.rows.age1, values.startingTireAges[0]);
  set(sim.rows.age2, values.startingTireAges[1]);
  set(sim.rows.age3, values.startingTireAges[2]);
  set(sim.rows.base, values.basePace);
  set(sim.rows.softDeg, values.degradation.SOFT);
  set(sim.rows.mediumDeg, values.degradation.MEDIUM);
  set(sim.rows.hardDeg, values.degradation.HARD);
  set(sim.rows.softOffset, values.offsets.SOFT);
  set(sim.rows.hardOffset, values.offsets.HARD);
  set(sim.rows.pitLoss, values.pitLoss);
  set(sim.rows.fuel, values.fuelEffect);
  set(sim.rows.target, values.targetImprovement);
}

export function buildSimulator(sheet: GC.Spread.Sheets.Worksheet, data: BahrainRaceDataset, ranges: DataRanges): void {
  baseSheet(sheet, 145, 32);
  title(sheet, 'STRATEGY SIMULATOR / BAHRAIN 2025', 14);
  sheet.setValue(2, 0, 'SELECTED DRIVER');
  sheet.setValue(2, 5, 'DRIVER #');
  sheet.setValue(3, 0, 'Actual race time, stints and pit laps appear here after driver selection.');
  sheet.addSpan(3, 0, 1, 12);
  sheet.setValue(4, 0, 'Projection assumes unmodeled race effects stay unchanged. Negative delta is faster.');
  sheet.addSpan(4, 0, 1, 12);
  sheet.addSpan(5, 0, 1, 12);
  section(sheet, 6, 0, 4, 'EDIT STRATEGY / BLUE CELLS');
  section(sheet, 6, 5, 7, 'OBSERVED BASELINE AND PROJECTED RESULT');
  sheet.setColumnWidth(0, 222);
  sheet.setColumnWidth(1, 38);
  sheet.setColumnWidth(2, 125);
  sheet.setColumnWidth(5, 195);
  sheet.setColumnWidth(6, 155);
  for (const [key, row] of Object.entries(sim.rows) as [keyof typeof sim.rows, number][]) {
    sheet.setValue(row, 0, labels[key]);
    inputCell(sheet, row, sim.inputColumn);
  }
  for (const row of [sim.rows.base, sim.rows.softDeg, sim.rows.mediumDeg, sim.rows.hardDeg, sim.rows.softOffset, sim.rows.hardOffset, sim.rows.pitLoss, sim.rows.fuel]) sheet.getCell(row, sim.inputColumn).formatter('0.000');
  const summaryLabels = [
    [sim.actualDuration.row, 'Actual race time / s'],
    [sim.referencePace.row, 'Calibrated base pace / s'],
    [sim.candidateTotal.row, 'Raw model time / s'],
    [sim.actualModelTotal.row, 'Modeled actual / s'],
    [sim.delta.row, 'Strategy delta / s'],
    [sim.adjustment.row, 'Historical adjustment / s'],
    [sim.projected.row, 'Anchored projected / s'],
    [sim.validity.row, 'Model validity']
  ] as const;
  for (const [row, text] of summaryLabels) sheet.setValue(row, 5, text);
  resultCell(sheet, sim.delta.row, sim.delta.col);
  resultCell(sheet, sim.projected.row, sim.projected.col);
  sheet.setValue(19, 5, 'Actual strategy stays fixed at calibrated pace.');
  sheet.setValue(20, 5, 'Safety car, traffic and penalties are not simulated.');
  sheet.setValue(22, 5, 'GOAL SEEK / TARGET');
  sheet.setFormula(23, 6, '=IF(ISNUMBER(G8),G8-C25,"")');
  sheet.setValue(23, 5, 'Target time / s');
  sheet.setValue(24, 5, 'Use the Goal Seek control above to solve Base Pace.');
  sheet.setValue(26, 5, 'Goal Seek changes only the Base Pace cell.');
  const list = (row: number, items: string) => sheet.getCell(row, sim.inputColumn).validator(GC.Spread.Sheets.DataValidation.createListValidator(items));
  const numeric = (row: number, minimum: number, maximum: number, integer = false) => sheet.getCell(row, sim.inputColumn).validator(GC.Spread.Sheets.DataValidation.createNumberValidator(GC.Spread.Sheets.ConditionalFormatting.ComparisonOperators.between, minimum, maximum, integer));
  list(sim.rows.stops, '1,2');
  for (const row of [sim.rows.compound1, sim.rows.compound2, sim.rows.compound3]) list(row, 'SOFT,MEDIUM,HARD');
  for (const row of [sim.rows.pit1, sim.rows.pit2]) numeric(row, 1, 56, true);
  for (const row of [sim.rows.age1, sim.rows.age2, sim.rows.age3]) numeric(row, 0, 60, true);
  numeric(sim.rows.base, 70, 130);
  for (const row of [sim.rows.softDeg, sim.rows.mediumDeg, sim.rows.hardDeg]) numeric(row, 0, 0.3);
  for (const row of [sim.rows.softOffset, sim.rows.hardOffset]) numeric(row, -5, 5);
  numeric(sim.rows.pitLoss, 0, 60);
  numeric(sim.rows.fuel, 0, 0.1);
  numeric(sim.rows.target, 0, 60);
  const valid = '=IF(AND(OR(C8=1,C8=2),C9>=1,C9<57,OR(C8=1,AND(C10>C9,C10<57)),OR(C11<>C12,AND(C8=2,C12<>C13)),OR(C11="SOFT",C11="MEDIUM",C11="HARD"),OR(C12="SOFT",C12="MEDIUM",C12="HARD"),OR(C13="SOFT",C13="MEDIUM",C13="HARD"),C14>=0,C15>=0,C16>=0,C17>=70,C17<=130,C18>=0,C19>=0,C20>=0,C18<=0.3,C19<=0.3,C20<=0.3,C21>=-5,C21<=5,C22>=-5,C22<=5,C23>=0,C23<=60,C24>=0,C24<=0.1),"READY","CHECK INPUTS")';
  sheet.setFormula(sim.validity.row, sim.validity.col, valid);
  sheet.setFormula(sim.referencePace.row, sim.referencePace.col, `=IFERROR(MEDIAN(FILTER(Data!$AB$2:$AB$${ranges.lapEnd},(Data!$A$2:$A$${ranges.lapEnd}=$G$3)*(Data!$U$2:$U$${ranges.lapEnd}=1))),"")`);
  sheet.setFormula(sim.candidateTotal.row, sim.candidateTotal.col, '=IF(G17="READY",SUM(J56:J112),NA())');
  sheet.setFormula(sim.actualModelTotal.row, sim.actualModelTotal.col, '=IF(G17="READY",SUM(V56:V112),NA())');
  sheet.setFormula(sim.delta.row, sim.delta.col, '=IF(AND(ISNUMBER(G8),G17="READY"),G11-G12,NA())');
  sheet.setFormula(sim.adjustment.row, sim.adjustment.col, '=IF(ISNUMBER(G8),G8-G12,NA())');
  sheet.setFormula(sim.projected.row, sim.projected.col, '=IF(ISNUMBER(G8),G8+G13,NA())');
  sheet.setFormula(7, 7, '=IF(ISNUMBER(G8),G8/86400,"")');
  sheet.setFormula(14, 7, '=IF(ISNUMBER(G15),G15/86400,"")');
  sheet.getCell(7, 7).formatter('[h]:mm:ss.000');
  sheet.getCell(14, 7).formatter('[h]:mm:ss.000').backColor('#d9f3ef').font('bold 13px Inter, Arial, sans-serif');
  seconds(sheet, sim.actualDuration.row, 6, 8);
  signedSeconds(sheet, sim.delta.row, 6);
  signedSeconds(sheet, sim.adjustment.row, 6);
  section(sheet, 29, 0, 13, 'WHAT-IF / FIRST PIT LAP × STARTING-TIRE DEGRADATION');
  sheet.setValue(30, 0, 'Column = end-of-lap pit. Row = seconds of tire wear added each tire-age lap.');
  sheet.addSpan(30, 0, 1, 12);
  sheet.setValue(31, 2, 'DEG / PIT');
  for (let index = 0; index < 9; index++) sheet.setValue(31, 3 + index, 14 + index);
  for (let index = 0; index < 6; index++) sheet.setValue(32 + index, 2, 0.03 + index * 0.01);
  sheet.getRange(31, 2, 1, 10).backColor('#e6ecf1').font('bold 11px Arial');
  sheet.getRange(32, 2, 6, 1).backColor('#e6ecf1').formatter('0.000');
  sheet.getRange(32, 3, 6, 9).formatter('+0.000;-0.000;0.000');
  sheet.conditionalFormats.add3ScaleRule(
    GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.number, -15, '#9bd7c0',
    GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.number, 0, '#ffffff',
    GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.number, 15, '#efaca6',
    [new GC.Spread.Sheets.Range(32, 3, 6, 9)]
  );
  sheet.setValue(39, 0, 'Negative cells favor the candidate. Second pit and all other assumptions stay fixed.');
  sheet.addSpan(39, 0, 1, 13);
  sheet.setFormula(27, 6, `=IF(OR(COUNTIFS(Data!$A$2:$A$${ranges.lapEnd},G3,Data!$B$2:$B$${ranges.lapEnd},C9,Data!$N$2:$N$${ranges.lapEnd},1)>0,AND(C8=2,COUNTIFS(Data!$A$2:$A$${ranges.lapEnd},G3,Data!$B$2:$B$${ranges.lapEnd},C10,Data!$N$2:$N$${ranges.lapEnd},1)>0)),"Caution-window pit: flat green-flag loss is approximate","")`);
  section(sheet, 42, 0, 12, 'SCENARIO COMPARISON / FORMULA OUTPUT SNAPSHOTS');
  headers(sheet, 43, 0, ['SCENARIO', 'STOPS', 'TIRES', 'PIT 1', 'PIT 2', 'BASE PACE', 'PROJECTED s', 'DELTA s', 'ASSUMPTIONS']);
  sheet.setColumnWidth(8, 215);
  sheet.setValue(52, 0, 'Tire-age extrapolation and pit timing are illustrative. Inspect both ledgers below.');
  sheet.addSpan(52, 0, 1, 12);
  section(sheet, 53, 0, 12, 'CANDIDATE / ONE FORMULA ROW PER RACE LAP');
  section(sheet, 53, 13, 10, 'OBSERVED STINT SCHEDULE / SAME PHYSICAL ASSUMPTIONS');
  headers(sheet, 54, 0, ['LAP', 'STINT', 'TIRE', 'AGE', 'OFFSET', 'DEGRAD', 'FUEL', 'PACE', 'PIT LOSS', 'LAP TOTAL', 'CUMULATIVE', 'CUM Δ']);
  headers(sheet, 54, 13, ['LAP', 'STINT', 'TIRE', 'AGE', 'OFFSET', 'DEGRAD', 'FUEL', 'PIT LOSS', 'LAP TOTAL', 'CUMULATIVE']);
  headers(sheet, 54, 25, ['START', 'END', 'TIRE', 'INITIAL AGE']);
  for (let lap = 1; lap <= data.race.scheduledLaps; lap++) {
    const row = sim.candidateStart + lap - 1;
    const r = row + 1;
    sheet.setValue(row, 0, lap);
    sheet.setValue(row, 13, lap);
    sheet.setFormula(row, 1, `=IF(A${r}<=$C$9,1,IF($C$8=1,2,IF(A${r}<=$C$10,2,3)))`);
    sheet.setFormula(row, 2, `=INDEX($C$11:$C$13,B${r})`);
    sheet.setFormula(row, 3, `=INDEX($C$14:$C$16,B${r})+A${r}-IF(B${r}=1,1,IF(B${r}=2,$C$9+1,$C$10+1))`);
    sheet.setFormula(row, 4, `=IF(C${r}="SOFT",$C$21,IF(C${r}="HARD",$C$22,0))`);
    sheet.setFormula(row, 5, `=D${r}*IF(C${r}="SOFT",$C$18,IF(C${r}="MEDIUM",$C$19,$C$20))`);
    sheet.setFormula(row, 6, `=-$C$24*(A${r}-1)`);
    sheet.setFormula(row, 7, `=$C$17+E${r}+F${r}+G${r}`);
    sheet.setFormula(row, 8, `=IF(OR(A${r}=$C$9,AND($C$8=2,A${r}=$C$10)),$C$23,0)`);
    sheet.setFormula(row, 9, `=H${r}+I${r}`);
    sheet.setFormula(row, 10, `=SUM($J$56:J${r})`);
    sheet.setFormula(row, 11, `=K${r}-W${r}`);
    sheet.setFormula(row, 14, `=MATCH(N${r},$Z$56:$Z$65,1)`);
    sheet.setFormula(row, 15, `=INDEX($AB$56:$AB$65,O${r})`);
    sheet.setFormula(row, 16, `=INDEX($AC$56:$AC$65,O${r})+N${r}-INDEX($Z$56:$Z$65,O${r})`);
    sheet.setFormula(row, 17, `=IF(P${r}="SOFT",$C$21,IF(P${r}="HARD",$C$22,0))`);
    sheet.setFormula(row, 18, `=Q${r}*IF(P${r}="SOFT",$C$18,IF(P${r}="MEDIUM",$C$19,$C$20))`);
    sheet.setFormula(row, 19, `=-$C$24*(N${r}-1)`);
    sheet.setFormula(row, 20, `=IF(AND(N${r}<57,COUNTIF($AA$56:$AA$65,N${r})>0),$C$23,0)`);
    sheet.setFormula(row, 21, `=$G$9+R${r}+S${r}+T${r}+U${r}`);
    sheet.setFormula(row, 22, `=SUM($V$56:V${r})`);
  }
  seconds(sheet, 55, 7, 57, 5);
  seconds(sheet, 55, 21, 57, 2);
  signedSeconds(sheet, 55, 11, 57);
  sheet.frozenRowCount(6);
  const deltaChart = sheet.charts.add('CumulativeDelta', GC.Spread.Sheets.Charts.ChartType.line, columnLeft(sheet, 9) + 8, rowTop(sheet, 43) + 8, 560, 245);
  deltaChart.series().add({ name: 'L55', xValues: 'A56:A112', yValues: 'L56:L112' });
  deltaChart.title({ text: 'Cumulative candidate vs actual delta (s)' });
}

export function updateSimulatorDriver(sheet: GC.Spread.Sheets.Worksheet, driver: DriverRace, raceLaps: number): void {
  const available = eligibility(driver, raceLaps);
  sheet.setValue(2, 0, `${driver.name.toUpperCase()} · ${driver.teamName.toUpperCase()}`);
  sheet.setValue(2, 6, driver.driverNumber);
  sheet.setValue(2, 9, `GRID ${driver.startingPosition ?? '—'} / FINISH ${driver.result.position ?? (driver.result.dnf ? 'DNF' : driver.result.dsq ? 'DSQ' : 'NC')}`);
  sheet.setValue(sim.actualDuration.row, sim.actualDuration.col, available.eligible ? driver.result.officialDurationSeconds : null);
  sheet.setValue(5, 0, driver.stints.length > 3 ? `Observed ${driver.stints.length - 1}-stop schedule cannot be restored in this two-stop editor. Default is an approximation.` : '');
  sheet.setValue(17, 5, available.eligible ? 'Full-distance historical baseline' : available.reason);
  sheet.setValue(18, 5, `${driver.stints.map(stint => stint.compound[0]).join('–')} · PIT ${driver.pitStops.map(pit => pit.endOfLapBoundary ?? '?').join(' / ')}`);
  sheet.setValue(18, 10, available.eligible ? driver.stints.length > 3 ? 'Approximate candidate' : 'Eligible' : 'Raw model only');
  for (let index = 0; index < 10; index++) {
    const stint = driver.stints[index];
    sheet.setArray(55 + index, 25, [[stint?.startLap ?? 999, stint?.endLap ?? null, stint?.compound ?? null, stint?.startingTireAgeLaps ?? null]]);
  }
}

export function defaultInputs(sheet: GC.Spread.Sheets.Worksheet, tireSheet: GC.Spread.Sheets.Worksheet, driver: DriverRace): StrategyInputs {
  const actual = driver.stints;
  const candidateStints = actual.length <= 3 ? actual : actual.slice(0, 3);
  const twoStops = candidateStints.length >= 3;
  const number = (row: number, column: number, fallback: number) => {
    const value = tireSheet.getValue(row, column);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };
  const pace = sheet.getValue(sim.referencePace.row, sim.referencePace.col);
  return {
    stops: twoStops ? 2 : 1,
    firstPitLap: candidateStints[0]?.endLap ?? 20,
    secondPitLap: twoStops ? candidateStints[1]?.endLap ?? 36 : 36,
    compounds: [candidateStints[0]?.compound ?? 'SOFT', candidateStints[1]?.compound ?? 'MEDIUM', candidateStints[2]?.compound ?? 'HARD'],
    startingTireAges: [candidateStints[0]?.startingTireAgeLaps ?? 0, candidateStints[1]?.startingTireAgeLaps ?? 0, candidateStints[2]?.startingTireAgeLaps ?? 0],
    basePace: typeof pace === 'number' && Number.isFinite(pace) ? pace : 98,
    degradation: {
      SOFT: number(calibrationRows.SOFT, 1, 0.05),
      MEDIUM: number(calibrationRows.MEDIUM, 1, 0.05),
      HARD: number(calibrationRows.HARD, 1, 0.05)
    },
    offsets: { SOFT: number(calibrationRows.SOFT, 4, 0), MEDIUM: 0, HARD: number(calibrationRows.HARD, 4, 0) },
    pitLoss: number(108, 1, 23),
    fuelEffect: number(101, 1, 0.04),
    targetImprovement: 5
  };
}
