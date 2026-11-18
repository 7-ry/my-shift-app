import { describe, expect, it } from 'vitest';
import { DAYS } from '../constants/config';
import { getStaffStreak } from './streak';

const shiftsFor = (days, weekId = '2026-W19', staffName = 'KANA') =>
  days.map((day) => ({ day, weekId, staffName, totalHours: 0 }));

describe('getStaffStreak', () => {
  it.each([
    [5, false],
    [6, true],
    [7, true],
  ])('counts %i consecutive days within one week (alert: %s)', (days, alert) => {
    expect(getStaffStreak(shiftsFor(DAYS.slice(0, days)), 'KANA')).toEqual({
      longestStreak: days,
      hasSixDayStreak: alert,
      streakEndDate: new Date(2026, 4, 3 + days),
    });
  });

  it('counts across Sunday into Monday and across an ISO year boundary', () => {
    const shifts = [
      ...shiftsFor(['MON', 'TUE', 'WED'], '2027-W01'),
      ...shiftsFor(['FRI', 'SAT', 'SUN'], '2026-W53'),
    ];
    expect(getStaffStreak(shifts, 'KANA')).toEqual({
      longestStreak: 6,
      hasSixDayStreak: true,
      streakEndDate: new Date(2027, 0, 6),
    });
  });

  it('resets after a day off', () => {
    const shifts = shiftsFor(DAYS.filter((day) => day !== 'THU'));
    expect(getStaffStreak(shifts, 'KANA')).toMatchObject({
      longestStreak: 3,
      hasSixDayStreak: false,
    });
  });

  it('deduplicates shifts and counts each staff member independently', () => {
    const shifts = [
      ...shiftsFor(['MON', 'MON', 'TUE', 'WED', 'THU', 'FRI']),
      ...shiftsFor(['FRI', 'SAT', 'SUN'], '2026-W19', 'SAYAKA'),
    ];
    expect(getStaffStreak(shifts, 'KANA')).toMatchObject({
      longestStreak: 5,
      hasSixDayStreak: false,
    });
    expect(getStaffStreak(shifts, 'SAYAKA')).toMatchObject({
      longestStreak: 3,
      hasSixDayStreak: false,
    });
    expect(getStaffStreak(shifts, 'RYUSHIN')).toEqual({
      longestStreak: 0,
      hasSixDayStreak: false,
      streakEndDate: null,
    });
  });
});
