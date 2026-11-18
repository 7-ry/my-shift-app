import { getWeekDates } from './helpers';

const MS_PER_DAY = 86_400_000;

export const getStaffStreak = (shifts, staffName) => {
  const workedDays = new Map();
  const datesByWeek = new Map();

  for (const shift of shifts) {
    if (shift.staffName !== staffName) continue;
    if (!datesByWeek.has(shift.weekId)) {
      datesByWeek.set(shift.weekId, getWeekDates(shift.weekId));
    }
    const date = datesByWeek.get(shift.weekId)[shift.day];
    if (!(date instanceof Date)) continue;

    // Use local calendar dates with UTC arithmetic so DST cannot break a run.
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
    workedDays.set(day, date);
  }

  let previousDay;
  let run = 0;
  let longestStreak = 0;
  let streakEndDate = null;
  for (const day of [...workedDays.keys()].sort((a, b) => a - b)) {
    run = day === previousDay + 1 ? run + 1 : 1;
    if (run >= longestStreak) {
      longestStreak = run;
      streakEndDate = workedDays.get(day);
    }
    previousDay = day;
  }

  return { longestStreak, hasSixDayStreak: longestStreak >= 6, streakEndDate };
};
