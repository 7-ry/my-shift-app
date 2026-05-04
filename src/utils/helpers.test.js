import { describe, expect, it } from 'vitest';
import {
  calcTotalHours,
  formatTime12,
  getColumnLetter,
  getCurrentWeekId,
  getSheetCellByRow,
  getSheetRowNum,
  getWeekDisplayVerbose,
  minsToTime,
  timeToMins,
} from './helpers';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

describe('time helpers', () => {
  it('converts HH:mm strings to minutes', () => {
    expect(timeToMins('09:00')).toBe(540);
    expect(timeToMins('23:30')).toBe(1410);
    expect(timeToMins('')).toBe(0);
  });

  it('converts minutes to padded HH:mm strings', () => {
    expect(minsToTime(540)).toBe('09:00');
    expect(minsToTime(1410)).toBe('23:30');
  });

  it('formats times for 12-hour sheet labels without am/pm', () => {
    expect(formatTime12('00:00')).toBe('12');
    expect(formatTime12('09:30')).toBe('9:30');
    expect(formatTime12('13:00')).toBe('1');
    expect(formatTime12('')).toBe('');
  });
});

describe('calcTotalHours', () => {
  it('calculates same-day shifts with breaks', () => {
    expect(calcTotalHours('09:00', '17:00', 1)).toBe(7);
    expect(calcTotalHours('09:00', '17:30', 0.5)).toBe(8);
  });

  it('handles overnight shifts', () => {
    expect(calcTotalHours('22:00', '02:00', 0)).toBe(4);
    expect(calcTotalHours('22:30', '01:00', 0.5)).toBe(2);
  });

  it('does not return negative hours when break exceeds duration', () => {
    expect(calcTotalHours('09:00', '10:00', 2)).toBe(0);
  });

  it('preserves the existing 15-minute rounding behavior', () => {
    expect(calcTotalHours('09:00', '17:07', 0, 15)).toBe(8);
    expect(calcTotalHours('09:00', '17:08', 0, 15)).toBe(8.25);
  });
});

describe('Google Sheet coordinate helpers', () => {
  it('converts column indexes to spreadsheet letters', () => {
    expect(getColumnLetter(1)).toBe('A');
    expect(getColumnLetter(26)).toBe('Z');
    expect(getColumnLetter(27)).toBe('AA');
    expect(getColumnLetter(35)).toBe('AI');
  });

  it('maps shift times to sheet row numbers', () => {
    expect(getSheetRowNum('09:00')).toBe(5);
    expect(getSheetRowNum('09:30')).toBe(6);
    expect(getSheetRowNum('23:30')).toBe(34);
    expect(getSheetRowNum('')).toBe(0);
  });

  it('maps day, row, and lane to sheet cells using current day order', () => {
    expect(getSheetCellByRow('MON', 5, 1, DAYS)).toBe('B5');
    expect(getSheetCellByRow('FRI', 16, 3, DAYS)).toBe('X16');
    expect(getSheetCellByRow('SUN', 29, 4, DAYS)).toBe('AI29');
  });
});

describe('week helpers', () => {
  it('returns current ISO-style week ids for known calendar dates', () => {
    expect(getCurrentWeekId(new Date(2026, 4, 3))).toBe('2026-W18');
    expect(getCurrentWeekId(new Date(2026, 4, 4))).toBe('2026-W19');
    expect(getCurrentWeekId(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(getCurrentWeekId(new Date(2024, 11, 30))).toBe('2025-W01');
  });

  it('formats week ranges in English and Japanese locales', () => {
    expect(getWeekDisplayVerbose('2026-W19', 'en')).toBe('May 4 - May 10');
    expect(getWeekDisplayVerbose('2026-W19', 'ja')).toBe(
      '5月4日 - 5月10日'
    );
  });

  it('returns an empty string for invalid week ids', () => {
    expect(getWeekDisplayVerbose('', 'en')).toBe('');
    expect(getWeekDisplayVerbose('not-a-week', 'ja')).toBe('');
  });
});
