import { describe, expect, it } from 'vitest';
import { DAYS } from '../constants/config';
import {
  calcTotalHours,
  formatShiftDate,
  formatTime12,
  getColumnLetter,
  getCurrentWeekId,
  getSheetCellByRow,
  getSheetRowNum,
  getWeekDates,
  getWeekDisplayVerbose,
  isStatHoliday,
  isWithinTableHours,
  minsToTime,
  timeToMins,
} from './helpers';

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
  it('maps every weekday of 2026-W01 to its local calendar date in order', () => {
    const dates = getWeekDates('2026-W01');
    expect(Object.keys(dates)).toEqual(DAYS);
    expect(Object.values(dates)).toEqual([
      new Date(2025, 11, 29),
      new Date(2025, 11, 30),
      new Date(2025, 11, 31),
      new Date(2026, 0, 1),
      new Date(2026, 0, 2),
      new Date(2026, 0, 3),
      new Date(2026, 0, 4),
    ]);
  });

  it('keeps the first days of January in the previous ISO year in week 53', () => {
    const dates = getWeekDates('2026-W53');
    expect(dates.MON).toEqual(new Date(2026, 11, 28));
    expect(dates.FRI).toEqual(new Date(2027, 0, 1));
    expect(dates.SUN).toEqual(new Date(2027, 0, 3));
  });

  it('starts ISO week 1 after January 1 when January 1 is a Sunday', () => {
    expect(getWeekDates('2023-W01').MON).toEqual(new Date(2023, 0, 2));
  });

  it('returns no dates for an invalid or nonexistent ISO week', () => {
    expect(getWeekDates('not-a-week')).toEqual({});
    expect(getWeekDates('2027-W53')).toEqual({});
  });

  it('formats compact shift dates using the app language', () => {
    const { MON, FRI } = getWeekDates('2026-W01');
    expect(formatShiftDate(MON, 'en')).toBe('12/29');
    expect(formatShiftDate(MON, 'ja')).toBe('12/29');
    expect(formatShiftDate(FRI, 'en')).toBe('01/02');
    expect(formatShiftDate(FRI, 'ja')).toBe('1/2');
  });

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

describe('isStatHoliday', () => {
  it('recognizes Christmas Day and New Year’s Day across ISO weeks', () => {
    expect(isStatHoliday(getWeekDates('2026-W52').FRI)).toBe(true);
    expect(isStatHoliday(getWeekDates('2026-W53').FRI)).toBe(true);
  });

  it('excludes Boxing Day, Easter Monday, and a regular weekday', () => {
    expect(isStatHoliday(new Date(2026, 11, 26))).toBe(false);
    expect(isStatHoliday(new Date(2026, 3, 6))).toBe(false);
    expect(isStatHoliday(new Date(2027, 0, 5))).toBe(false);
  });

  it('returns false when no holiday data is available for the date', () => {
    expect(isStatHoliday(new Date(2028, 0, 1))).toBe(false);
    expect(isStatHoliday(undefined)).toBe(false);
  });
});

describe('isWithinTableHours', () => {
  it.each([
    ['09:00', '09:30'],
    ['23:00', '23:30'],
    ['10:00', '10:01'],
  ])('accepts %s–%s', (start, end) => {
    expect(isWithinTableHours(start, end)).toBe(true);
  });

  it.each([
    ['08:59', '09:30'],
    ['23:01', '23:30'],
    ['09:00', '09:29'],
    ['23:00', '23:31'],
    ['23:00', '24:00'],
    ['22:00', '02:00'],
    ['12:00', '12:00'],
    ['12:00', '11:59'],
    ['09:60', '11:00'],
    ['09:00', ''],
  ])('rejects %s–%s', (start, end) => {
    expect(isWithinTableHours(start, end)).toBe(false);
  });
});
