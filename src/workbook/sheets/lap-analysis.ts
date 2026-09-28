import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset, DriverRace } from '../../types/race';
import type { DataRanges } from './data';
import { baseSheet, headers, section, seconds, signedSeconds, title } from '../styles';
import { palette } from '../config';

const detailHeader = 73;

export function buildLapAnalysis(sheet: GC.Spread.Sheets.Worksheet, data: BahrainRaceDataset, ranges: DataRanges): void {
  baseSheet(sheet, 190, 30);
  title(sheet, 'LAP ANALYSIS / TIMING AND QUALITY', 14, 1);
  sheet.setValue(2, 0, '57 race laps · gaps remain blank after retirement · color is relative within each driver');
  sheet.addSpan(2, 0, 1, 12);
  sheet.setValue(3, 0, 'Clean pace excludes lap 1, pits, warm-up, caution/restart laps and large within-stint outliers.');
  sheet.addSpan(3, 0, 1, 15);
  section(sheet, 5, 0, 21, 'LAP TIMES / SECONDS');
  headers(sheet, 6, 0, ['LAP', ...data.drivers.map(driver => driver.abbreviation)]);
  sheet.setColumnWidth(0, 72);
  for (let col = 1; col <= data.drivers.length; col++) sheet.setColumnWidth(col, 82);
  for (let lap = 1; lap <= 57; lap++) {
    const row = lap + 6;
    sheet.setValue(row, 0, lap);
    for (const [index, driver] of data.drivers.entries()) {
      const source = ranges.lapRows.get(`${driver.driverNumber}:${lap}`);
      if (source === undefined) continue;
      sheet.setFormula(row, index + 1, `=IF(ISNUMBER(Data!C${source + 1}),Data!C${source + 1},"")`);
      const observation = driver.laps.find(item => item.lapNumber === lap)!;
      if (observation.neutralizationEventIds.length || observation.restartAdjacent) sheet.getCell(row, index + 1).backColor(palette.caution);
      if (observation.pitIn || observation.pitOut) sheet.getCell(row, index + 1).foreColor('#a63b15').font('bold 11px Inter, Arial, sans-serif');
    }
  }
  seconds(sheet, 7, 1, 57, data.drivers.length);
  const summaries = [
    ['BEST RECORDED', 'MIN'],
    ['RECORDED AVG', 'AVERAGE'],
    ['CLEAN AVG', 'AVERAGE'],
    ['CLEAN MEDIAN', 'MEDIAN'],
    ['CLEAN STDEV', 'STDEV.S'],
    ['CLEAN COUNT', 'COUNT']
  ] as const;
  section(sheet, 65, 0, 21, 'COMPARABLE PACE / EXCLUSIONS');
  for (const [offset, [label, aggregation]] of summaries.entries()) {
    const row = 66 + offset;
    sheet.setValue(row, 0, label);
    for (const [index, driver] of data.drivers.entries()) {
      const ref = `Data!$A$2:$A$${ranges.lapEnd}`;
      const measured = `Data!$C$2:$C$${ranges.lapEnd}`;
      const clean = `Data!$W$2:$W$${ranges.lapEnd}`;
      const mask = `Data!$U$2:$U$${ranges.lapEnd}`;
      if (offset === 0) sheet.setFormula(row, index + 1, `=IFERROR(MIN(FILTER(Data!$AO$2:$AO$${ranges.lapEnd},(${ref}=${driver.driverNumber})*ISNUMBER(Data!$AO$2:$AO$${ranges.lapEnd}))),"")`);
      else if (offset === 1) sheet.setFormula(row, index + 1, `=IFERROR(${aggregation}(FILTER(${measured},(${ref}=${driver.driverNumber})*(${measured}>0))),"")`);
      else if (offset === 5) sheet.setFormula(row, index + 1, `=COUNTIFS(${ref},${driver.driverNumber},${mask},1)`);
      else sheet.setFormula(row, index + 1, `=IF(COUNTIFS(${ref},${driver.driverNumber},${mask},1)<5,"",${aggregation}(FILTER(${clean},(${ref}=${driver.driverNumber})*(${mask}=1))))`);
    }
  }
  section(sheet, 72, 0, 15, 'SELECTED DRIVER / EXPLAIN EACH LAP');
  headers(sheet, detailHeader, 0, ['LAP', 'TIME s', 'S1', 'S2', 'S3', 'TIRE', 'AGE', 'POSITION', 'CLEAN', 'WHY EXCLUDED', 'Δ OWN BEST', 'Δ LAP BEST']);
  sheet.setColumnWidth(9, 185);
  sheet.setColumnWidth(10, 105);
  sheet.setColumnWidth(11, 105);
  for (let lap = 1; lap <= 57; lap++) sheet.setValue(detailHeader + lap, 0, lap);
  sheet.charts.add('SelectedLapTimes', GC.Spread.Sheets.Charts.ChartType.line, 50, 3350, 850, 280, 'A74:B131');
  sheet.setFormula(71, 22, `=MIN(Data!$AO$2:$AO$${ranges.lapEnd})`);
  for (let col = 1; col <= data.drivers.length; col++) {
    sheet.conditionalFormats.add3ScaleRule(
      GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.lowestValue, 0, '#ccebe6',
      GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.percentile, 50, '#ffffff',
      GC.Spread.Sheets.ConditionalFormatting.ScaleValueType.highestValue, 0, '#f7d7d3',
      [new GC.Spread.Sheets.Range(7, col, 57, 1)]
    );
    const bestStyle = new GC.Spread.Sheets.Style();
    bestStyle.backColor = '#c8edce';
    const letter = String.fromCharCode(65 + col);
    sheet.conditionalFormats.addFormulaRule(`=AND(ISNUMBER(${letter}8),${letter}8=${letter}67)`, bestStyle, [new GC.Spread.Sheets.Range(7, col, 57, 1)]);
  }
  const fastestStyle = new GC.Spread.Sheets.Style();
  fastestStyle.backColor = '#d7c3ff';
  sheet.conditionalFormats.addFormulaRule('=AND(ISNUMBER(B8),B8=$W$72)', fastestStyle, [new GC.Spread.Sheets.Range(7, 1, 57, data.drivers.length)]);
  seconds(sheet, detailHeader + 1, 1, 57, 4);
  signedSeconds(sheet, detailHeader + 1, 10, 57, 2);
  sheet.frozenRowCount(7);
  sheet.frozenColumnCount(1);
}

export function updateLapSelection(sheet: GC.Spread.Sheets.Worksheet, driver: DriverRace, ranges: DataRanges): void {
  sheet.setValue(71, 0, `${driver.name.toUpperCase()} / CLEAN LAP DETAIL`);
  for (let lap = 1; lap <= 57; lap++) {
    const row = detailHeader + lap;
    const source = ranges.lapRows.get(`${driver.driverNumber}:${lap}`);
    if (source === undefined) {
      for (let col = 1; col <= 11; col++) sheet.setValue(row, col, null);
      continue;
    }
    const sr = source + 1;
    for (const [col, dataCol] of [[1, 'C'], [2, 'D'], [3, 'E'], [4, 'F'], [5, 'H'], [6, 'Q'], [7, 'I'], [8, 'U']] as const) {
      sheet.setFormula(row, col, `=Data!${dataCol}${sr}`);
    }
    sheet.setFormula(row, 9, `=IF(Data!U${sr}=1,"",IF(Data!P${sr}<>"",Data!P${sr},IF(A${row + 1}=1,"START",IF(Data!L${sr}=1,"PIT IN",IF(Data!M${sr}=1,"PIT OUT",IF(Data!N${sr}=1,"CAUTION",IF(Data!O${sr}=1,"RESTART","OUTLIER")))))))`);
    sheet.setFormula(row, 10, `=IF(ISNUMBER(Data!AO${sr}),B${row + 1}-MIN(FILTER(Data!$AO$2:$AO$${ranges.lapEnd},(Data!$A$2:$A$${ranges.lapEnd}=${driver.driverNumber})*ISNUMBER(Data!$AO$2:$AO$${ranges.lapEnd}))),"")`);
    sheet.setFormula(row, 11, `=IFERROR(IF(AND(ISNUMBER(B${row + 1}),I${row + 1}=1),B${row + 1}-MIN(FILTER(Data!$C$2:$C$${ranges.lapEnd},(Data!$B$2:$B$${ranges.lapEnd}=A${row + 1})*(Data!$U$2:$U$${ranges.lapEnd}=1))),""),"")`);
  }
}
