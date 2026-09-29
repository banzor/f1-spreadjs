import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset, DriverRace } from '../../types/race';
import type { DataRanges } from './data';
import { baseSheet, compoundColors, headers, section, seconds, signedSeconds, title } from '../styles';
import { palette, policy } from '../config';

export const calibrationRows = { SOFT: 103, MEDIUM: 104, HARD: 105 } as const;
const offsetHelperStart = 115;
const pitHelperStart = 185;

export function buildTireStrategy(sheet: GC.Spread.Sheets.Worksheet, dataSheet: GC.Spread.Sheets.Worksheet, data: BahrainRaceDataset, ranges: DataRanges): void {
  baseSheet(sheet, 360, 64);
  title(sheet, 'TIRE STRATEGY / STINT ENGINEERING', 58, 1);
  sheet.addSpan(1, 1, 1, 32);
  sheet.setValue(2, 0, 'S = Soft · M = Medium · H = Hard · vertical marks indicate end-of-lap pit entries');
  sheet.addSpan(2, 0, 1, 18);
  section(sheet, 4, 0, 58, 'ACTUAL TIRE TIMELINE');
  sheet.setValue(5, 0, 'DRIVER / LAP');
  sheet.setColumnWidth(0, 150);
  for (let lap = 1; lap <= 57; lap++) {
    sheet.setValue(5, lap, lap);
    sheet.setColumnWidth(lap, 25);
  }
  sheet.getRange(5, 0, 1, 58).backColor('#e6ecf1').font('bold 10px Inter, Arial, sans-serif');
  for (const [index, driver] of data.drivers.entries()) {
    const row = index + 6;
    sheet.setValue(row, 0, driver.abbreviation);
    for (const observation of driver.laps) {
      const col = observation.lapNumber;
      if (col < 1 || col > 57) continue;
      const colors = compoundColors(observation.compound);
      sheet.setValue(row, col, observation.compound === 'UNKNOWN' ? '?' : observation.compound[0]);
      sheet.getCell(row, col).backColor(colors.background).foreColor(colors.foreground).font('bold 10px Arial');
      if (observation.pitIn) sheet.setValue(row, col, '▸');
    }
  }
  for (let lap = 1; lap <= 57; lap++) {
    const leaderLap = data.drivers[0].laps.find(item => item.lapNumber === lap);
    if (leaderLap?.neutralizationEventIds.length) sheet.getCell(4, lap).backColor(palette.caution);
  }
  section(sheet, 29, 0, 17, 'OBSERVED STINTS / CALCULATED PACE');
  headers(sheet, 30, 0, ['DRIVER', 'STINT', 'TIRE', 'START', 'END', 'LENGTH', 'INITIAL AGE', 'CLEAN N', 'MEAN s', 'BEST s', 'SLOPE', 'ADJ SLOPE', 'PIT LANE', 'STOP s', 'QUALITY', 'TREND']);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(8, 90);
  sheet.setColumnWidth(9, 90);
  sheet.setColumnWidth(10, 105);
  sheet.setColumnWidth(11, 110);
  sheet.setColumnWidth(12, 90);
  sheet.setColumnWidth(13, 85);
  sheet.setColumnWidth(14, 125);
  sheet.setColumnWidth(15, 115);
  let row = 31;
  for (const driver of data.drivers) {
    for (const stint of driver.stints) {
      const source = ranges.stintRows.get(`${driver.driverNumber}:${stint.stintNumber}`)! + 1;
      const display = row + 1;
      sheet.setArray(row, 0, [[driver.abbreviation, stint.stintNumber, stint.compound, stint.startLap, stint.endLap, null, stint.startingTireAgeLaps]]);
      sheet.setFormula(row, 5, `=E${display}-D${display}+1`);
      for (const [col, dataCol] of [[7, 'AZ'], [8, 'BA'], [9, 'BB'], [10, 'BC'], [11, 'BD'], [12, 'BE'], [13, 'BF'], [14, 'BG']] as const) sheet.setFormula(row, col, `=Data!${dataCol}${source}`);
      const colors = compoundColors(stint.compound);
      sheet.getCell(row, 2).backColor(colors.background).foreColor(colors.foreground);
      const helperRow = 280 + row - 31;
      const length = Math.min(57, stint.endLap - stint.startLap + 1);
      if (length >= 5) {
        for (let offset = 0; offset < length; offset++) {
          const lapRow = ranges.lapRows.get(`${driver.driverNumber}:${stint.startLap + offset}`);
          if (lapRow !== undefined) sheet.setFormula(helperRow, offset, `=Data!W${lapRow + 1}`);
        }
        sheet.setSparkline(row, 15, new GC.Spread.Sheets.Range(helperRow, 0, 1, length), GC.Spread.Sheets.Sparklines.DataOrientation.horizontal, GC.Spread.Sheets.Sparklines.SparklineType.line, new GC.Spread.Sheets.Sparklines.SparklineSetting());
      }
      row++;
    }
  }
  seconds(sheet, 31, 8, row - 31, 6);
  sheet.rowFilter(new GC.Spread.Sheets.Filter.HideRowFilter(new GC.Spread.Sheets.Range(30, 0, row - 30, 16)));
  section(sheet, 100, 0, 10, 'CALIBRATION / HISTORICAL OBSERVATIONS, FORMULA DERIVED');
  sheet.setValue(101, 0, 'Fuel assumption');
  sheet.setValue(101, 1, policy.fuelEffect);
  sheet.setValue(101, 3, 'secs gained each race lap · illustrative, not measured');
  sheet.getCell(101, 1).backColor(palette.blue);
  headers(sheet, 102, 0, ['COMPOUND', 'DEGRADATION', 'SOURCE', 'STINTS', 'PACE OFFSET']);
  const stints = `$AS$2:$AS$${ranges.stintEnd}`;
  const adjusted = `$BD$2:$BD$${ranges.stintEnd}`;
  const driverNumber = `$AQ$2:$AQ$${ranges.stintEnd}`;
  for (const compound of ['SOFT', 'MEDIUM', 'HARD'] as const) {
    const cr = calibrationRows[compound];
    const r = cr + 1;
    sheet.setValue(cr, 0, compound);
    sheet.setFormula(cr, 3, `=COUNTIFS(Data!${stints},A${r},Data!${driverNumber},'Strategy Simulator'!$G$3,Data!${adjusted},">=-1")`);
    sheet.setFormula(cr, 1, `=MAX(0,IFERROR(MEDIAN(FILTER(Data!${adjusted},(Data!${stints}=A${r})*(Data!${driverNumber}='Strategy Simulator'!$G$3)*ISNUMBER(Data!${adjusted}))),IFERROR(MEDIAN(FILTER(Data!${adjusted},(Data!${stints}=A${r})*ISNUMBER(Data!${adjusted}))),${policy.fallbackDegradation})))`);
    sheet.setFormula(cr, 2, `=IF(D${r}>0,"Selected driver",IF(COUNTIFS(Data!${stints},A${r},Data!${adjusted},">=-1")>0,"Field median","Provisional"))`);
  }
  sheet.setValue(calibrationRows.MEDIUM, 4, 0);
  headers(sheet, offsetHelperStart - 1, 0, ['DRIVER #', 'TIRE', 'ADJUSTED MEDIAN', 'MEDIUM MEDIAN', 'OFFSET DIFFERENCE']);
  let helperRow = offsetHelperStart;
  for (const driver of data.drivers) {
    for (const compound of ['SOFT', 'MEDIUM', 'HARD'] as const) {
      const r = helperRow + 1;
      sheet.setArray(helperRow, 0, [[driver.driverNumber, compound]]);
      sheet.setFormula(helperRow, 2, `=IFERROR(MEDIAN(FILTER(Data!$AA$2:$AA$${ranges.lapEnd},(Data!$A$2:$A$${ranges.lapEnd}=A${r})*(Data!$H$2:$H$${ranges.lapEnd}=B${r})*(Data!$U$2:$U$${ranges.lapEnd}=1))),"")`);
      sheet.setFormula(helperRow, 3, `=IFERROR(MEDIAN(FILTER(Data!$AA$2:$AA$${ranges.lapEnd},(Data!$A$2:$A$${ranges.lapEnd}=A${r})*(Data!$H$2:$H$${ranges.lapEnd}="MEDIUM")*(Data!$U$2:$U$${ranges.lapEnd}=1))),"")`);
      sheet.setFormula(helperRow, 4, `=IF(AND(ISNUMBER(C${r}),ISNUMBER(D${r})),C${r}-D${r},"")`);
      helperRow++;
    }
  }
  for (const compound of ['SOFT', 'HARD'] as const) {
    const cr = calibrationRows[compound];
    sheet.setFormula(cr, 4, `=IFERROR(MEDIAN(FILTER($E$${offsetHelperStart + 1}:$E$${helperRow},($B$${offsetHelperStart + 1}:$B$${helperRow}=A${cr + 1})*ISNUMBER($E$${offsetHelperStart + 1}:$E$${helperRow}))),0)`);
  }
  const rate = `'Tire Strategy'!$B$${calibrationRows.SOFT + 1}`;
  for (let dataRow = 1; dataRow < ranges.lapEnd; dataRow++) {
    const r = dataRow + 1;
    dataSheet.setFormula(dataRow, 26, `=IF(U${r}=1,V${r}-IF(H${r}="SOFT",${rate},IF(H${r}="MEDIUM",'Tire Strategy'!$B$${calibrationRows.MEDIUM + 1},'Tire Strategy'!$B$${calibrationRows.HARD + 1}))*Q${r},"")`);
    dataSheet.setFormula(dataRow, 27, `=IF(U${r}=1,AA${r}-IF(H${r}="SOFT",'Tire Strategy'!$E$${calibrationRows.SOFT + 1},IF(H${r}="HARD",'Tire Strategy'!$E$${calibrationRows.HARD + 1},0)),"")`);
  }
  section(sheet, pitHelperStart - 3, 0, 8, 'GREEN-FLAG PIT LOSS / APPROXIMATE PAIR EXCESS');
  headers(sheet, pitHelperStart - 2, 0, ['DRIVER', 'PIT LAP', 'PIT PAIR s', 'EXPECTED PAIR s', 'NET LOSS s', 'CLEAN PAIR']);
  let pitRow = pitHelperStart - 1;
  for (const [index, driver] of data.drivers.entries()) {
    for (const pit of driver.pitStops) {
      const thisLap = ranges.lapRows.get(`${driver.driverNumber}:${pit.reportedLap}`);
      const nextLap = ranges.lapRows.get(`${driver.driverNumber}:${pit.reportedLap + 1}`);
      const r = pitRow + 1;
      sheet.setArray(pitRow, 0, [[driver.abbreviation, pit.reportedLap]]);
      if (thisLap !== undefined && nextLap !== undefined) {
        const a = thisLap + 1;
        const b = nextLap + 1;
        sheet.setFormula(pitRow, 2, `=IF(AND(ISNUMBER(Data!C${a}),ISNUMBER(Data!C${b})),Data!C${a}+Data!C${b},"")`);
        sheet.setFormula(pitRow, 3, `=IF(ISNUMBER('Race Dashboard'!H${index + 8}),2*'Race Dashboard'!H${index + 8},"")`);
        sheet.setFormula(pitRow, 5, `=IF(OR(Data!N${a}=1,Data!N${b}=1,Data!O${a}=1,Data!O${b}=1),0,1)`);
        sheet.setFormula(pitRow, 4, `=IF(AND(ISNUMBER(C${r}),ISNUMBER(D${r}),F${r}=1),C${r}-D${r},"")`);
      }
      pitRow++;
    }
  }
  sheet.setValue(108, 0, 'Net pit loss');
  sheet.setFormula(108, 1, `=IF(COUNT($E$${pitHelperStart}:$E$${pitRow})<3,${policy.fallbackPitLoss},MEDIAN($E$${pitHelperStart}:$E$${pitRow}))`);
  sheet.setFormula(108, 2, `=IF(COUNT($E$${pitHelperStart}:$E$${pitRow})<3,"Provisional","Observed pair median")`);
  sheet.setValue(110, 0, 'Rates mix tire wear, fuel, traffic and track changes. Net pit loss is not lane duration.');
  sheet.addSpan(110, 0, 1, 12);
  signedSeconds(sheet, calibrationRows.SOFT, 4, 3);
  sheet.frozenRowCount(6);
  sheet.frozenColumnCount(1);
  for (let hiddenRow = 278; hiddenRow < 343; hiddenRow++) sheet.setRowVisible(hiddenRow, false);
}

export function updateTireSelection(sheet: GC.Spread.Sheets.Worksheet, driver: DriverRace): void {
  sheet.setValue(1, 1, `${driver.name.toUpperCase()} / ${driver.stints.map(stint => stint.compound[0]).join('–')} / PITS ${driver.pitStops.map(pit => pit.endOfLapBoundary ?? '?').join(' + ')}`);
}
