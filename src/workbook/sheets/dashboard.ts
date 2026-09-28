import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset, DriverRace } from '../../types/race';
import type { DataRanges } from './data';
import { baseSheet, headers, rowTop, section, seconds, signedSeconds, title } from '../styles';
import { palette } from '../config';

export function buildDashboard(sheet: GC.Spread.Sheets.Worksheet, data: BahrainRaceDataset, ranges: DataRanges): void {
  baseSheet(sheet, 100, 28);
  title(sheet, '2025 BAHRAIN / RACE DASHBOARD', 13);
  sheet.setValue(2, 0, `${data.race.circuitName.toUpperCase()} · ${data.race.scheduledLaps} LAPS · ${data.race.year}`);
  sheet.setValue(3, 0, 'Select a driver above to follow position and strategy. All pace values come from workbook formulas.');
  sheet.addSpan(3, 0, 1, 12);
  sheet.setFormula(2, 10, `=IF(COUNT(Data!$BU$2:$BU$${ranges.weatherEnd})>0,"TRACK "&ROUND(MIN(Data!$BU$2:$BU$${ranges.weatherEnd}),1)&"–"&ROUND(MAX(Data!$BU$2:$BU$${ranges.weatherEnd}),1)&" °C","WEATHER UNAVAILABLE")`);
  section(sheet, 5, 0, 13, 'FINAL CLASSIFICATION AND PACE');
  headers(sheet, 6, 0, ['DRIVER', 'TEAM', 'GRID', 'FINISH', '+/− POS', 'BEST s', 'REC AVG s', 'CLEAN PACE s', 'CLEAN N', 'PITS', 'TIRES', 'GAP', 'STATUS']);
  sheet.setColumnWidth(0, 160);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(10, 95);
  sheet.setColumnWidth(12, 90);
  const end = ranges.lapEnd;
  for (const [index, driver] of data.drivers.entries()) {
    const row = index + 7;
    const r = row + 1;
    const source = index + 2;
    sheet.setFormula(row, 0, `=Data!AD${source}`);
    sheet.setFormula(row, 1, `=Data!AE${source}`);
    sheet.setFormula(row, 2, `=IF(ISNUMBER(Data!AF${source}),Data!AF${source},"")`);
    sheet.setFormula(row, 3, `=IF(ISNUMBER(Data!AG${source}),Data!AG${source},"")`);
    sheet.setFormula(row, 4, `=IF(AND(ISNUMBER(C${r}),ISNUMBER(D${r})),C${r}-D${r},"")`);
    sheet.setFormula(row, 5, `=IFERROR(MIN(FILTER(Data!$AO$2:$AO$${end},(Data!$A$2:$A$${end}=${driver.driverNumber})*ISNUMBER(Data!$AO$2:$AO$${end}))),"")`);
    sheet.setFormula(row, 6, `=IFERROR(AVERAGE(FILTER(Data!$C$2:$C$${end},(Data!$A$2:$A$${end}=${driver.driverNumber})*(Data!$C$2:$C$${end}>0))),"")`);
    sheet.setFormula(row, 8, `=COUNTIFS(Data!$A$2:$A$${end},${driver.driverNumber},Data!$U$2:$U$${end},1)`);
    sheet.setFormula(row, 7, `=IF(I${r}<5,"",AVERAGE(FILTER(Data!$W$2:$W$${end},(Data!$A$2:$A$${end}=${driver.driverNumber})*(Data!$U$2:$U$${end}=1))))`);
    sheet.setFormula(row, 9, `=Data!AM${source}`);
    sheet.setFormula(row, 10, `=Data!AN${source}`);
    sheet.setFormula(row, 11, `=IF(ISNUMBER(Data!AJ${source}),Data!AJ${source},IF(ISNUMBER(Data!AK${source}),"+"&Data!AK${source}&" lap(s)",""))`);
    sheet.setFormula(row, 12, `=Data!AH${source}`);
    sheet.setFormula(row, 14, `=A${r}`);
    sheet.setFormula(row, 15, `=IF(ISNUMBER(H${r}),H${r},NA())`);
    if (driver.result.position === 1) sheet.getRange(row, 0, 1, 13).backColor('#edf8f6');
  }
  seconds(sheet, 7, 5, data.drivers.length, 3);
  signedSeconds(sheet, 7, 4, data.drivers.length);
  sheet.frozenRowCount(7);
  sheet.rowFilter(new GC.Spread.Sheets.Filter.HideRowFilter(new GC.Spread.Sheets.Range(6, 0, data.drivers.length + 1, 13)));
  const chartRow = data.drivers.length + 10;
  section(sheet, chartRow, 0, 13, 'RACE STORY');
  sheet.setValue(chartRow + 1, 0, 'Representative clean-lap pace');
  sheet.setValue(chartRow + 1, 7, 'Selected driver · position at lap end');
  sheet.setArray(6, 14, [['Driver', 'Clean-lap pace (s)']]);
  sheet.setArray(chartRow + 3, 23, [['Lap', 'Position']]);
  for (let lap = 1; lap <= data.race.scheduledLaps; lap++) sheet.setValue(chartRow + 3 + lap, 23, lap);
  const chartTop = rowTop(sheet, chartRow + 2) + 8;
  const paceChart = sheet.charts.add('RacePace', GC.Spread.Sheets.Charts.ChartType.barClustered, 30, chartTop, 660, rowTop(sheet, 50) - chartTop);
  paceChart.series().add({ name: 'P7', xValues: `O8:O${data.drivers.length + 7}`, yValues: `P8:P${data.drivers.length + 7}` });
  paceChart.title({ text: 'Representative clean-lap pace by driver (s)' });
  const paceAxes = paceChart.axes();
  paceAxes.primaryCategory.tickLabelSpacing = 1;
  paceAxes.primaryCategory.style = { fontSize: 10 };
  paceChart.axes(paceAxes);
  const positionChart = sheet.charts.add('DriverPosition', GC.Spread.Sheets.Charts.ChartType.line, 730, chartTop, 650, 380);
  positionChart.series().add({ name: `Y${chartRow + 4}`, xValues: `X${chartRow + 5}:X${chartRow + 61}`, yValues: `Y${chartRow + 5}:Y${chartRow + 61}` });
  positionChart.title({ text: 'Selected driver position at lap end' });
  sheet.getRange(0, 0, 1, 13).backColor(palette.navy);
  sheet.setValue(chartRow + 20, 0, 'OpenF1 data used with permission · race results remain distinct from on-track positions.');
}

export function updateDashboardSelection(sheet: GC.Spread.Sheets.Worksheet, driver: DriverRace, driverCount: number): void {
  const chartRow = driverCount + 10;
  for (let lap = 1; lap <= 57; lap++) {
    const observed = driver.laps.find(item => item.lapNumber === lap);
    sheet.setValue(chartRow + 3 + lap, 24, observed?.positionAtEnd ?? null);
  }
  sheet.setValue(2, 7, `${driver.name.toUpperCase()} · ${driver.teamName.toUpperCase()}`);
}
