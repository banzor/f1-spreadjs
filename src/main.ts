import * as GC from '@mescius/spread-sheets';
import { loadRace } from './data/load-race';
import { createRaceWorkbook, type RaceWorkbook } from './workbook/create-workbook';
import { sim } from './workbook/config';
import { eligibility } from './workbook/sheets/strategy-simulator';
import './styles.css';

const licenseKey = import.meta.env.VITE_SPREADJS_LICENSE_KEY;
if (licenseKey) GC.Spread.Sheets.LicenseKey = licenseKey;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing application element ${id}`);
  return element as T;
};

const host = byId<HTMLElement>('spread-host');
const panelHost = byId<HTMLElement>('scenario-panel');
const selector = byId<HTMLSelectElement>('driver-select');
const status = byId<HTMLElement>('status');
const drawer = byId<HTMLElement>('scenario-drawer');
const drawerButton = byId<HTMLButtonElement>('scenarios-button');
const scenarioSelect = byId<HTMLSelectElement>('scenario-select');
const dialog = byId<HTMLDialogElement>('goal-dialog');
let application: RaceWorkbook | null = null;
let busy = false;
let raceLaps = 57;

function report(message: string): void { status.textContent = message; }

function refreshScenarios(): void {
  if (!application) return;
  const driver = application.driverSelection.current();
  if (!driver) return;
  const names = application.spread.scenarioManager.all().map(item => item.name).filter(name => name.startsWith(`2025 ${driver.abbreviation} · `));
  scenarioSelect.replaceChildren(...names.map(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.replace(`2025 ${driver.abbreviation} · `, '');
    return option;
  }));
}

function refreshDriverActions(): void {
  const driver = application?.driverSelection.current();
  if (!driver) return;
  byId<HTMLButtonElement>('goal-button').disabled = !eligibility(driver, raceLaps).eligible;
  byId<HTMLButtonElement>('restore-button').textContent = driver.stints.length > 3 ? 'Restore Approximation' : 'Actual Strategy';
}

async function operation(action: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  try { await action(); } catch (error) { report(error instanceof Error ? error.message : String(error)); } finally { busy = false; }
}

function attachFormulaBar(spread: GC.Spread.Sheets.Workbook): void {
  const refresh = () => {
    const sheet = spread.getActiveSheet();
    const row = sheet.getActiveRowIndex();
    const col = sheet.getActiveColumnIndex();
    let index = col + 1;
    let column = '';
    while (index > 0) { column = String.fromCharCode(65 + (index - 1) % 26) + column; index = Math.floor((index - 1) / 26); }
    byId('cell-address').textContent = `${column}${row + 1}`;
    byId('cell-formula').textContent = sheet.getFormula(row, col) || String(sheet.getValue(row, col) ?? '');
  };
  spread.bind(GC.Spread.Sheets.Events.SelectionChanged, refresh);
  spread.bind(GC.Spread.Sheets.Events.ActiveSheetChanged, refresh);
  refresh();
}

async function initialize(): Promise<void> {
  const data = loadRace();
  raceLaps = data.race.scheduledLaps;
  selector.replaceChildren(...data.drivers.map(driver => {
    const option = document.createElement('option');
    option.value = String(driver.driverNumber);
    const status = driver.result.dsq ? 'DSQ' : driver.result.dnf ? 'DNF' : driver.result.position === null ? 'NC' : `P${driver.result.position}`;
    option.textContent = `${driver.abbreviation} · ${driver.name} · ${status}`;
    return option;
  }));
  application = await createRaceWorkbook(host, panelHost, data, report);
  if (import.meta.env.DEV) (window as unknown as { __f1?: RaceWorkbook }).__f1 = application;
  selector.value = String(data.race.winnerDriverNumber);
  refreshScenarios();
  refreshDriverActions();
  attachFormulaBar(application.spread);
  report(`${data.race.year} ${data.race.eventName} loaded from bundled OpenF1 observations.`);
}

selector.addEventListener('change', () => operation(async () => {
  if (!application) return;
  report('Switching driver…');
  const driver = await application.driverSelection.select(Number(selector.value));
  refreshScenarios();
  refreshDriverActions();
  report(`${driver.name} selected. Actual stints and calibrated assumptions are ready.`);
}));

byId<HTMLButtonElement>('reset-button').addEventListener('click', () => operation(async () => {
  application?.destroy();
  application = null;
  host.replaceChildren();
  panelHost.replaceChildren();
  report('Rebuilding the workbook from bundled observations…');
  await initialize();
}));

byId<HTMLButtonElement>('restore-button').addEventListener('click', () => operation(async () => {
  await application?.whatIf.restoreActual();
}));

byId<HTMLButtonElement>('save-button').addEventListener('click', () => operation(async () => {
  if (!application) return;
  const value = window.prompt('Name this strategy scenario');
  if (value !== null) {
    await application.whatIf.saveScenario(value);
    refreshScenarios();
  }
}));

byId<HTMLButtonElement>('apply-button').addEventListener('click', () => operation(async () => {
  if (application && scenarioSelect.value) await application.whatIf.applyScenario(scenarioSelect.value);
}));

byId<HTMLButtonElement>('compare-button').addEventListener('click', () => operation(async () => {
  await application?.whatIf.compareScenarios();
  if (application) application.spread.setActiveSheetIndex(3);
}));

byId<HTMLButtonElement>('goal-button').addEventListener('click', () => operation(async () => {
  if (!application) return;
  const outcome = await application.whatIf.goalSeek();
  if (!outcome.success || outcome.requiredPace === null) return;
  const target = application.spread.getSheetFromName('Strategy Simulator')?.getValue(sim.rows.target, sim.inputColumn);
  byId('goal-description').textContent = `To target a ${Number(target).toFixed(1)}-second improvement with this strategy, base pace moves from ${outcome.previousPace.toFixed(3)} to ${outcome.requiredPace.toFixed(3)} seconds per lap. Required improvement: ${(outcome.previousPace - outcome.requiredPace).toFixed(3)} seconds per lap.`;
  dialog.showModal();
  byId<HTMLButtonElement>('goal-cancel').onclick = () => {
    application?.spread.getSheetFromName('Strategy Simulator')?.setValue(sim.rows.base, sim.inputColumn, outcome.previousPace);
    dialog.close();
    report('Goal Seek cancelled; base pace restored.');
  };
  byId<HTMLButtonElement>('goal-keep').onclick = () => { dialog.close(); report('Goal Seek pace kept in the simulator.'); };
}));

dialog.addEventListener('cancel', event => {
  event.preventDefault();
  byId<HTMLButtonElement>('goal-cancel').click();
});

function toggleDrawer(open: boolean): void {
  drawer.hidden = !open;
  drawerButton.setAttribute('aria-expanded', String(open));
  if (open) refreshScenarios();
  application?.spread.refresh();
}

drawerButton.addEventListener('click', () => toggleDrawer(drawer.hidden));
byId<HTMLButtonElement>('drawer-close').addEventListener('click', () => toggleDrawer(false));

initialize().catch(error => { console.error(error); report(error instanceof Error ? error.message : String(error)); });
