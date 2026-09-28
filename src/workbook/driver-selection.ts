import * as GC from '@mescius/spread-sheets';
import type { BahrainRaceDataset, DriverRace } from '../types/race';
import type { WhatIfController } from './what-if';
import type { DataRanges } from './sheets/data';
import { updateDashboardSelection } from './sheets/dashboard';
import { updateLapSelection } from './sheets/lap-analysis';
import { defaultInputs, updateSimulatorDriver } from './sheets/strategy-simulator';
import { updateTireSelection } from './sheets/tire-strategy';
import { sheets } from './config';

export interface DriverSelectionController {
  select(driverNumber: number): Promise<DriverRace>;
  current(): DriverRace | null;
}

export function createDriverSelection(workbook: GC.Spread.Sheets.Workbook, data: BahrainRaceDataset, ranges: DataRanges, whatIf: WhatIfController): DriverSelectionController {
  let selected: DriverRace | null = null;
  const select = async (driverNumber: number): Promise<DriverRace> => {
    const driver = data.drivers.find(item => item.driverNumber === driverNumber);
    if (!driver) throw new Error(`Driver ${driverNumber} is absent from the bundled race.`);
    const activeIndex = workbook.getActiveSheetIndex();
    workbook.suspendPaint();
    try {
      const dashboard = workbook.getSheetFromName(sheets.dashboard)!;
      const laps = workbook.getSheetFromName(sheets.laps)!;
      const tires = workbook.getSheetFromName(sheets.tires)!;
      const simulator = workbook.getSheetFromName(sheets.simulator)!;
      updateSimulatorDriver(simulator, driver, data.race.scheduledLaps);
      updateDashboardSelection(dashboard, driver, data.drivers.length);
      updateLapSelection(laps, driver, ranges);
      updateTireSelection(tires, driver);
      workbook.calculate();
      await workbook.waitForAllCalculations();
      const defaults = defaultInputs(simulator, tires, driver);
      await whatIf.setDriver(driver, defaults);
      selected = driver;
      workbook.setActiveSheetIndex(activeIndex);
      return driver;
    } finally {
      workbook.resumePaint();
    }
  };
  return { select, current: () => selected };
}
