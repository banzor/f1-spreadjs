import * as GC from '@mescius/spread-sheets';
import type { DriverRace } from '../types/race';
import type { GoalSeekOutcome, StrategyInputs } from '../types/strategy';
import { inputRows, sim } from './config';
import { readInputs, writeInputs } from './sheets/strategy-simulator';

type Workbook = GC.Spread.Sheets.Workbook;
type Worksheet = GC.Spread.Sheets.Worksheet;

export interface WhatIfController {
  saveScenario(name: string): Promise<void>;
  applyScenario(name: string): Promise<void>;
  compareScenarios(): Promise<void>;
  goalSeek(): Promise<GoalSeekOutcome>;
  restoreActual(): Promise<void>;
  setDriver(driver: DriverRace, defaults: StrategyInputs): Promise<void>;
  updateTable(): void;
  destroy(): void;
}

export function createWhatIf(workbook: Workbook, sheet: Worksheet, panelHost: HTMLElement, report: (message: string) => void): WhatIfController {
  const manager = workbook.scenarioManager;
  const panel = new GC.Spread.Sheets.Scenarios.ScenarioPanel(panelHost);
  panel.attach(workbook);
  let driver: DriverRace | null = null;
  let actualDefaults: StrategyInputs | null = null;
  let internal = false;
  let busy = false;
  let comparisonCurrent = false;
  const nameFor = (label: string) => `2025 ${driver?.abbreviation ?? 'UNK'} · ${label}`;
  const withBusy = async (task: () => Promise<void>): Promise<void> => {
    if (busy) return;
    busy = true;
    try { await task(); } finally { busy = false; }
  };
  const changed = (_sender: unknown, args: GC.Spread.Sheets.IScenarioChangingEventArgs) => {
    if (internal || !driver) return;
    const name = args.scenario.name;
    const own = name.startsWith(`2025 ${driver.abbreviation} · `);
    if ((args.action === 'apply' || args.action === 'activate' || args.action === 'update') && !own) {
      args.cancel = true;
      report('Select the matching driver before using this scenario.');
    }
    if ((args.action === 'remove' || args.action === 'update') && name.endsWith('Actual Strategy')) {
      args.cancel = true;
      report('Use Restore Actual Strategy to return to the observed setup.');
    }
  };
  workbook.bind(GC.Spread.Sheets.Events.ScenarioChanging, changed);
  workbook.bind(GC.Spread.Sheets.Events.ValueChanged, (_sender: unknown, args: GC.Spread.Sheets.IValueChangedEventArgs) => {
    if (internal || args.sheet !== sheet || args.col !== sim.inputColumn || args.row < sim.rows.stops || args.row > sim.rows.target) return;
    if (args.row === sim.rows.compound1) updateTable();
    if (comparisonCurrent) {
      sheet.setValue(40, 0, 'Scenario comparison snapshots need refreshing.');
      comparisonCurrent = false;
    }
  });
  const writeScenario = (name: string, values: StrategyInputs) => {
    const prior = readInputs(sheet);
    internal = true;
    manager.setActiveScenario(name);
    writeInputs(sheet, values);
    for (const row of inputRows) sheet.setValue(row, sim.inputColumn, sheet.getValue(row, sim.inputColumn));
    manager.setActiveScenario(null);
    manager.set({
      name,
      overrides: [{
        sheetName: sheet.name(),
        cells: inputRows.map(row => ({ ref: `C${row + 1}`, value: sheet.getValue(row, sim.inputColumn) as GC.Spread.Sheets.Scenarios.OverrideValue }))
      }]
    });
    writeInputs(sheet, prior);
    internal = false;
  };
  const updateTable = () => {
    const compound = String(sheet.getValue(sim.rows.compound1, sim.inputColumn));
    const input = compound === 'MEDIUM' ? sim.rows.mediumDeg : compound === 'HARD' ? sim.rows.hardDeg : sim.rows.softDeg;
    sheet.setFormula(32, 3, `=SJS.TABLE($G$13,$D$32:$L$32,$C$9,$C$33:$C$38,$C$${input + 1})`);
    sheet.setValue(29, 10, `START TIRE: ${compound}`);
  };
  const setDriver = async (next: DriverRace, defaults: StrategyInputs) => withBusy(async () => {
    internal = true;
    manager.setActiveScenario(null);
    manager.restore();
    driver = next;
    actualDefaults = defaults;
    writeInputs(sheet, defaults);
    const observedLabel = next.stints.length > 3 ? 'Observed Two-Stop Approximation' : 'Actual Strategy';
    for (const [label, options] of [
      [observedLabel, defaults],
      ['Aggressive One-Stop', { ...defaults, stops: 1, firstPitLap: 22, compounds: ['SOFT', 'HARD', 'HARD'], startingTireAges: [0, 0, 0] }],
      ['Conservative One-Stop', { ...defaults, stops: 1, firstPitLap: 28, compounds: ['MEDIUM', 'HARD', 'HARD'], startingTireAges: [0, 0, 0] }],
      ['Two-Stop Attack', { ...defaults, stops: 2, firstPitLap: 14, secondPitLap: 36, compounds: ['SOFT', 'MEDIUM', 'MEDIUM'], startingTireAges: [0, 0, 0] }]
    ] as [string, StrategyInputs][]) {
      if (!manager.get(nameFor(label))) writeScenario(nameFor(label), options);
    }
    writeInputs(sheet, defaults);
    updateTable();
    comparisonCurrent = false;
    sheet.setValue(40, 0, 'Select Compare to refresh the current driver’s scenario snapshots.');
    internal = false;
    panel.refresh();
    await workbook.waitForAllCalculations();
  });
  const saveScenario = async (label: string) => withBusy(async () => {
    if (!driver) return;
    const trimmed = label.trim().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length > 48 || trimmed === 'Actual Strategy') throw new Error('Enter a distinct scenario name up to 48 characters.');
    const name = nameFor(trimmed);
    if (manager.get(name)) throw new Error('That scenario name is already in use.');
    writeScenario(name, readInputs(sheet));
    panel.refresh();
    report(`Saved ${name} for this workbook session.`);
  });
  const applyScenario = async (name: string) => withBusy(async () => {
    if (!driver || !name.startsWith(`2025 ${driver.abbreviation} · `)) throw new Error('Select the matching driver first.');
    manager.setActiveScenario(null);
    manager.restore();
    if (!manager.apply(name)) throw new Error(`Could not apply ${name}.`);
    updateTable();
    await workbook.waitForAllCalculations();
    report(`Applied ${name}.`);
  });
  const restoreActual = async () => withBusy(async () => {
    if (!driver || !actualDefaults) return;
    internal = true;
    manager.setActiveScenario(null);
    manager.restore();
    writeInputs(sheet, actualDefaults);
    internal = false;
    updateTable();
    await workbook.waitForAllCalculations();
    report(driver.stints.length > 3
      ? `Restored ${driver.abbreviation}'s two-stop approximation. The observed ${driver.stints.length - 1}-stop schedule cannot fit the candidate editor.`
      : `Restored ${driver.abbreviation}'s observed strategy inputs.`);
  });
  const compareScenarios = async () => withBusy(async () => {
    if (!driver) return;
    const before = readInputs(sheet);
    const applied = manager.getAppliedScenarios();
    const matching = manager.all().filter(item => item.name.startsWith(`2025 ${driver!.abbreviation} · `));
    const scenarios = matching.slice(0, 8);
    internal = true;
    try {
      manager.setActiveScenario(null);
      manager.restore();
      for (let row = 44; row < 52; row++) sheet.getRange(row, 0, 1, 9).clear(GC.Spread.Sheets.StorageType.data);
      for (const [index, scenario] of scenarios.entries()) {
        writeInputs(sheet, before);
        manager.restore();
        manager.apply(scenario.name);
        await workbook.waitForAllCalculations();
        const values = readInputs(sheet);
        const projected = sheet.getValue(sim.projected.row, sim.projected.col);
        const delta = sheet.getValue(sim.delta.row, sim.delta.col);
        sheet.setArray(44 + index, 0, [[scenario.name, values.stops, values.compounds.slice(0, values.stops + 1).map(item => item[0]).join('–'), values.firstPitLap, values.stops === 2 ? values.secondPitLap : null, values.basePace, typeof projected === 'number' ? projected : null, typeof delta === 'number' ? delta : null, values.stops === 1 ? 'Long stint may extrapolate' : 'Shared model assumptions']]);
      }
    } finally {
      manager.restore();
      writeInputs(sheet, before);
      for (const name of applied) manager.apply(name);
      internal = false;
      updateTable();
      await workbook.waitForAllCalculations();
    }
    comparisonCurrent = true;
    sheet.setValue(40, 0, 'Scenario snapshots current for the applied assumptions.');
    report(matching.length > 8
      ? `Compared the first 8 of ${matching.length} native scenarios. Values are snapshots.`
      : `Compared ${scenarios.length} native scenarios. Values are snapshots.`);
  });
  const goalSeek = async (): Promise<GoalSeekOutcome> => {
    if (busy) throw new Error('Another workbook operation is running.');
    busy = true;
    const previousPace = Number(sheet.getValue(sim.rows.base, sim.inputColumn));
    try {
      if (sheet.getValue(sim.validity.row, sim.validity.col) !== 'READY') throw new Error('Correct the strategy inputs before Goal Seek.');
      const actual = sheet.getValue(sim.actualDuration.row, sim.actualDuration.col);
      if (typeof actual !== 'number' || !Number.isFinite(actual)) throw new Error('This driver has no comparable official race time.');
      const target = actual - Number(sheet.getValue(sim.rows.target, sim.inputColumn));
      if (!Number.isFinite(target)) throw new Error('Enter a valid target improvement.');
      manager.setActiveScenario(null);
      await workbook.waitForAllCalculations();
      const success = await GC.Spread.Sheets.CalcEngine.goalSeek(sheet, sim.rows.base, sim.inputColumn, sheet, sim.projected.row, sim.projected.col, target);
      await workbook.waitForAllCalculations();
      const requiredPace = Number(sheet.getValue(sim.rows.base, sim.inputColumn));
      const residualSeconds = Math.abs(Number(sheet.getValue(sim.projected.row, sim.projected.col)) - target);
      if (!success || !Number.isFinite(requiredPace) || requiredPace < 70 || requiredPace > 130 || residualSeconds > 0.01) {
        sheet.setValue(sim.rows.base, sim.inputColumn, previousPace);
        report('Goal Seek did not find a valid pace in the allowed range.');
        return { success: false, previousPace, requiredPace: null, residualSeconds: null };
      }
      report(`Required base pace: ${requiredPace.toFixed(3)} s/lap. Improvement: ${(previousPace - requiredPace).toFixed(3)} s/lap.`);
      return { success: true, previousPace, requiredPace, residualSeconds };
    } catch (error) {
      sheet.setValue(sim.rows.base, sim.inputColumn, previousPace);
      throw error;
    } finally { busy = false; }
  };
  return { saveScenario, applyScenario, compareScenarios, goalSeek, restoreActual, setDriver, updateTable, destroy: () => panel.destroy() };
}
