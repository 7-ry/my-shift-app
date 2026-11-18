import { describe, expect, it } from 'vitest';
import { DAYS } from '../constants/config';
import { getWeekDates } from './helpers';
import { getInitialShiftDay, getVisibleShiftDays } from './shiftTableScroll';

describe('initial shift table day', () => {
  it('matches the local calendar date across an ISO year boundary', () => {
    expect(getInitialShiftDay(DAYS, getWeekDates('2026-W01'), new Date(2026, 0, 1, 16))).toBe('THU');
  });

  it('falls back to Monday in another week or with unavailable dates', () => {
    const today = new Date(2026, 0, 1);
    expect(getInitialShiftDay(DAYS, getWeekDates('2026-W02'), today)).toBe('MON');
    expect(getInitialShiftDay(DAYS, {}, today)).toBe('MON');
  });
});

describe('visible shift table days', () => {
  const columns = [
    { day: 'MON', left: 0, right: 150 },
    { day: 'TUE', left: 150, right: 300 },
    { day: 'WED', left: 300, right: 450 },
  ];

  it('only counts the portions past the sticky time column', () => {
    expect(getVisibleShiftDays(columns, 135, 220)).toEqual(['TUE']);
  });

  it('reports all fully visible days, allowing subpixel alignment', () => {
    expect(getVisibleShiftDays(columns, 150.5, 450)).toEqual(['TUE', 'WED']);
  });

  it('prefers the leading day when two partially visible days tie', () => {
    expect(getVisibleShiftDays(columns, 100, 200)).toEqual(['MON']);
  });

  it('reports no day when the viewport misses all columns', () => {
    expect(getVisibleShiftDays(columns, 450, 500)).toEqual([]);
  });
});
