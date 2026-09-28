import * as GC from '@mescius/spread-sheets';
import { palette } from './config';
import type { Compound } from '../types/race';

type Worksheet = GC.Spread.Sheets.Worksheet;

export function baseSheet(sheet: Worksheet, rowCount: number, columnCount: number): void {
  sheet.setRowCount(rowCount);
  sheet.setColumnCount(columnCount);
  sheet.defaults.rowHeight = 25;
  sheet.defaults.colWidth = 110;
  sheet.getRange(0, 0, rowCount, columnCount).font('12px Inter, Arial, sans-serif').foreColor(palette.ink).backColor('#fff');
  sheet.setColumnWidth(0, 150);
  sheet.options.gridline = { showVerticalGridline: true, showHorizontalGridline: true, color: '#e8eef3' };
}

export function title(sheet: Worksheet, text: string, endColumn = 12, startColumn = 0): void {
  sheet.addSpan(0, startColumn, 1, endColumn - startColumn);
  sheet.setValue(0, startColumn, text);
  sheet.getRange(0, 0, 1, endColumn).backColor(palette.navy).foreColor('#fff').font('bold 20px Inter, Arial, sans-serif');
  sheet.setRowHeight(0, 44);
}

export function section(sheet: Worksheet, row: number, start: number, width: number, text: string): void {
  sheet.addSpan(row, start, 1, width);
  sheet.setValue(row, start, text);
  sheet.getRange(row, start, 1, width).backColor(palette.navy).foreColor('#fff').font('bold 12px Inter, Arial, sans-serif');
  sheet.setRowHeight(row, 30);
}

export function headers(sheet: Worksheet, row: number, start: number, values: string[]): void {
  sheet.setArray(row, start, [values]);
  sheet.getRange(row, start, 1, values.length).backColor('#e6ecf1').foreColor(palette.navy).font('bold 11px Inter, Arial, sans-serif');
  sheet.setRowHeight(row, 32);
}

export function inputCell(sheet: Worksheet, row: number, column: number): void {
  sheet.getCell(row, column).backColor(palette.blue).foreColor('#0b507a').font('bold 12px Inter, Arial, sans-serif');
}

export function resultCell(sheet: Worksheet, row: number, column: number): void {
  sheet.getCell(row, column).backColor(palette.teal).foreColor('#005765').font('bold 14px Inter, Arial, sans-serif');
}

export function compoundColors(compound: Compound): { background: string; foreground: string } {
  if (compound === 'SOFT') return { background: palette.soft, foreground: '#fff' };
  if (compound === 'MEDIUM') return { background: palette.medium, foreground: '#222' };
  if (compound === 'HARD') return { background: palette.hard, foreground: palette.ink };
  return { background: '#b9c3cd', foreground: palette.ink };
}

export function seconds(sheet: Worksheet, row: number, col: number, rows = 1, cols = 1): void {
  sheet.getRange(row, col, rows, cols).formatter('0.000');
}

export function signedSeconds(sheet: Worksheet, row: number, col: number, rows = 1, cols = 1): void {
  sheet.getRange(row, col, rows, cols).formatter('+0.000;-0.000;0.000');
}
