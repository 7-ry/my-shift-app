// src/services/gasService.js

/**
 * GAS（Google Apps Script）へデータを同期するサービス
 * @param {Object} params
 * @param {string} params.gasUrl - GASのウェブアプリURL
 * @param {Array} params.shifts - 同期するシフトデータ
 * @param {Array} params.staffs - スタッフデータ
 * @param {Date} params.currentWeekStart - 表示中の週の開始日
 * @param {Function} params.formatDate - 日付フォーマット関数
 * @param {Function} params.formatTime12 - 時間フォーマット関数
 */
export const syncToGAS = async ({
  gasUrl,
  shifts,
  staffs,
  weekId,
  lang,
  t,
  helpers, // timeToMins, getSheetRowNum などの関数をAppから受け取る
}) => {
  const {
    timeToMins,
    getSheetRowNum,
    getSheetCellByRow,
    formatTime12,
    getWeekDisplayVerbose,
  } = helpers;

  let processedShifts = [...shifts].sort(
    (a, b) => timeToMins(a.startTime) - timeToMins(b.startTime)
  );

  const groups = {};
  processedShifts.forEach((s) => {
    const key = `${s.day}_${s.lane}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...s, drawEndTime: s.endTime });
  });

  for (let key in groups) {
    let ls = groups[key];
    for (let i = 0; i < ls.length - 1; i++) {
      if (timeToMins(ls[i].endTime) > timeToMins(ls[i + 1].startTime)) {
        ls[i].drawEndTime = ls[i + 1].startTime;
      }
    }
  }

  const scheduleCommands = [];
  Object.values(groups)
    .flat()
    .forEach((s) => {
      let sR = getSheetRowNum(s.startTime);
      let eR = getSheetRowNum(s.drawEndTime) - 1;
      const isWeekend = s.day === 'SAT' || s.day === 'SUN';
      if (!isWeekend) {
        if (sR <= 16) eR = Math.min(eR, 16);
        else {
          sR = Math.max(sR, 21);
          eR = Math.min(eR, 29);
        }
      } else {
        sR = Math.max(sR, 5);
        eR = Math.min(eR, 29);
      }
      if (sR > 40 || sR < 5 || eR < sR) return;

      const startStr = formatTime12(s.startTime),
        endStr = formatTime12(s.endTime);
      const timeLabel =
        (startStr + '-' + endStr).length >= 9
          ? `${startStr}-\n${endStr}`
          : `${startStr}-${endStr}`;

      const breakLabel =
        s.breakHours === 0.5
          ? `\n30m`
          : s.breakHours >= 1
          ? `\n${s.breakHours}h`
          : '';

      scheduleCommands.push({
        cell: getSheetCellByRow(s.day, sR, s.lane),
        endCell: getSheetCellByRow(s.day, eR, s.lane),
        value: `${s.staffName}\n${timeLabel}${breakLabel}`,
        color: s.color,
      });
    });

  const dashboardRows = staffs.map((staff) => {
    const total = shifts
      .filter((s) => s.staffName === staff.name)
      .reduce((acc, s) => acc + s.totalHours, 0);
    const current = Math.floor(total * 100) / 100,
      rem = Math.floor((staff.target - current) * 100) / 100;
    let statusLabel = t.met;
    if (rem < 0) statusLabel = `⚠️ ${t.over}`;
    else if (rem > 0) statusLabel = t.room;
    return [staff.name, current, staff.target, '', rem, statusLabel];
  });

  const payload = {
    weekId,
    weekLabel: getWeekDisplayVerbose(weekId, lang),
    scheduleCommands,
    dashboardRows,
    shiftDataRows: shifts.map((s) => [
      s.day,
      s.staffName,
      s.startTime,
      s.endTime,
      s.lane,
      s.breakHours,
      s.totalHours,
    ]),
  };

  return await fetch(gasUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};
