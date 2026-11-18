import { getWeekDates, isStatHoliday } from './helpers';

export const isStatShift = (shift, weekId) =>
  isStatHoliday(getWeekDates(shift.weekId ?? weekId)[shift.day]);

const roundHours = (hours) => Math.round(hours * 100) / 100;

export const buildDashboardData = (staffs, shifts, weekId) => {
  const totalsByStaff = new Map();
  for (const shift of shifts) {
    const totals = totalsByStaff.get(shift.staffName) ?? { raw: 0, stat: 0 };
    totals.raw += shift.totalHours;
    if (isStatShift(shift, weekId)) totals.stat += shift.totalHours;
    totalsByStaff.set(shift.staffName, totals);
  }

  return staffs.map((staff) => {
    const { raw, stat } = totalsByStaff.get(staff.name) ?? { raw: 0, stat: 0 };
    const weightedHours = roundHours(raw + 0.5 * stat);
    return {
      ...staff,
      rawHours: roundHours(raw),
      statHours: roundHours(stat),
      weightedHours,
      currentHours: weightedHours,
      remaining: Math.floor((staff.target - weightedHours) * 100) / 100,
      progressPercent: Math.min((weightedHours / staff.target) * 100, 100),
    };
  });
};
