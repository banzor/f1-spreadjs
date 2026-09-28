import * as GC from '@mescius/spread-sheets';
import '@mescius/spread-sheets-charts';
import type { BahrainRaceDataset } from '../types/race';
import { sheets, sim } from './config';
import { buildData } from './sheets/data';
import { buildDashboard } from './sheets/dashboard';
import { buildLapAnalysis } from './sheets/lap-analysis';
import { buildTireStrategy } from './sheets/tire-strategy';
import { buildSimulator } from './sheets/strategy-simulator';
import { createWhatIf } from './what-if';
import { createDriverSelection } from './driver-selection';

export interface RaceWorkbook {
  spread: GC.Spread.Sheets.Workbook;
  driverSelection: ReturnType<typeof createDriverSelection>;
  whatIf: ReturnType<typeof createWhatIf>;
  destroy(): void;
}

export async function createRaceWorkbook(host: HTMLElement, panelHost: HTMLElement, data: BahrainRaceDataset, report: (message: string) => void): Promise<RaceWorkbook> {
  const spread = new GC.Spread.Sheets.Workbook(host, { sheetCount: 0, allowDynamicArray: true });
  spread.options.allowDynamicArray = true;
  spread.suspendPaint();
  spread.suspendCalcService(false);
  spread.suspendEvent();
  const dashboard = new GC.Spread.Sheets.Worksheet(sheets.dashboard);
  const laps = new GC.Spread.Sheets.Worksheet(sheets.laps);
  const tires = new GC.Spread.Sheets.Worksheet(sheets.tires);
  const simulator = new GC.Spread.Sheets.Worksheet(sheets.simulator);
  const observations = new GC.Spread.Sheets.Worksheet(sheets.data);
  for (const sheet of [dashboard, laps, tires, simulator, observations]) spread.addSheet(spread.getSheetCount(), sheet);
  const ranges = buildData(observations, data);
  buildDashboard(dashboard, data, ranges);
  buildLapAnalysis(laps, data, ranges);
  buildTireStrategy(tires, observations, data, ranges);
  buildSimulator(simulator, data, ranges);
  const names: [string, number, number][] = [
    ['SelectedDriver', 2, 6],
    ['StopCount', sim.rows.stops, sim.inputColumn],
    ['FirstPitLap', sim.rows.pit1, sim.inputColumn],
    ['SecondPitLap', sim.rows.pit2, sim.inputColumn],
    ['BasePace', sim.rows.base, sim.inputColumn],
    ['PitLoss', sim.rows.pitLoss, sim.inputColumn],
    ['ProjectedRaceTime', sim.projected.row, sim.projected.col],
    ['StrategyDelta', sim.delta.row, sim.delta.col]
  ];
  for (const [name, row, column] of names) {
    const letter = String.fromCharCode(65 + column);
    spread.addCustomName(name, `='Strategy Simulator'!$${letter}$${row + 1}`, 0, 0);
  }
  spread.setActiveSheetIndex(0);
  spread.resumeCalcService(true);
  spread.resumeEvent();
  spread.resumePaint();
  const whatIf = createWhatIf(spread, simulator, panelHost, report);
  const driverSelection = createDriverSelection(spread, data, ranges, whatIf);
  await driverSelection.select(data.race.winnerDriverNumber);
  return { spread, driverSelection, whatIf, destroy: () => { whatIf.destroy(); spread.destroy(); } };
}
