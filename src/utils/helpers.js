// --- 🌟 ヘルパー関数 ---
export const getColumnLetter = (colIndex) => {
  let letter = '';
  while (colIndex > 0) {
    let temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
};

export const getSheetRowNum = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h - 9) * 2 + (m >= 30 ? 1 : 0) + 5;
};

export const getSheetCellByRow = (day, row, lane, DAYS) => {
  const dayIdx = DAYS.indexOf(day);
  const baseCol = 2 + dayIdx * 5;
  const colLetter = getColumnLetter(baseCol + (lane - 1));
  return `${colLetter}${row}`;
};

export const formatTime12 = (t) => {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const displayM = m === 0 ? '' : ':' + m.toString().padStart(2, '0');
  return `${displayH}${displayM}`;
};

export const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const minsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const calcTotalHours = (start, end, breakHours) => {
  const durationMins = timeToMins(end) - timeToMins(start);
  let total = durationMins / 60 - (breakHours || 0);
  if (total < 0) total = 0;
  return Math.floor(total * 100) / 100;
};

export const getWeekDisplayVerbose = (weekId, lang = 'en') => {
  if (!weekId || !weekId.includes('-W')) return '';
  try {
    const [year, week] = weekId.split('-W').map(Number);
    if (isNaN(year) || isNaN(week)) return '';

    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

    const end = new Date(ISOweekStart);
    end.setDate(ISOweekStart.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    const locale = lang === 'en' ? 'en-CA' : 'ja-JP';

    return `${ISOweekStart.toLocaleDateString(
      locale,
      options
    )} - ${end.toLocaleDateString(locale, options)}`;
  } catch (e) {
    console.error('Date formatting error:', e);
    return '';
  }
};

export const getCurrentWeekId = (date = new Date()) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};
