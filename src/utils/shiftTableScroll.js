export const getInitialShiftDay = (days, weekDates, today) =>
  days.find((day) => weekDates[day]?.toDateString() === today.toDateString()) ??
  days[0];

export const getVisibleShiftDays = (columns, visibleLeft, visibleRight) => {
  const fullDays = [];
  let mostVisibleDay;
  let largestOverlap = 0;

  for (const { day, left, right } of columns) {
    const overlap = Math.min(right, visibleRight) - Math.max(left, visibleLeft);
    if (overlap <= 0) continue;
    // Snapping and the collapsed table borders can round to different pixels.
    if (overlap >= right - left - 1) fullDays.push(day);
    if (overlap > largestOverlap) {
      largestOverlap = overlap;
      mostVisibleDay = day;
    }
  }

  if (fullDays.length) return fullDays;
  return mostVisibleDay ? [mostVisibleDay] : [];
};
