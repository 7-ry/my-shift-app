/**
 * [1] メニュー作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('★SHIFT SYSTEM')
    .addItem('🔄 Firebaseから同期', 'showWeekSelector')
    .addSeparator()
    .addItem('🗑️ SHIFT_DATAをクリア', 'clearInputForNextWeek')
    .addToUi();
}

/**
 * [2] ダイアログ表示
 */
function showWeekSelector() {
  const html = HtmlService.createHtmlOutputFromFile('WeekSelector')
    .setWidth(350)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, '同期する週の選択');
}

/**
 * [3] 週リスト生成 (前後1ヶ月分：未来4週 〜 過去4週)
 */
function getWeekOptions() {
  const options = [];
  const now = new Date();

  // i = 4 (1ヶ月後) から i = -4 (1ヶ月前) までをループ
  for (let i = 4; i >= -4; i--) {
    const d = new Date();
    d.setDate(now.getDate() + i * 7);

    const weekId = getISOWeekId(d);
    const mon = getDateFromISOWeek(weekId);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    // ラベル作成（例：3/30〜4/5）
    const label = `${mon.getMonth() + 1}/${mon.getDate()}〜${
      sun.getMonth() + 1
    }/${sun.getDate()} (${weekId})`;

    options.push({ id: weekId, label: label });
  }
  return options;
}

/**
 * [4] 同期メイン処理
 */
function executeSync(targetWeek, weekLabel) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const projectId = 'my-restaurant-shift';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shifts`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200)
      throw new Error('Firebaseの読み込みに失敗しました。');

    const data = JSON.parse(response.getContentText());
    const rawShifts = [];

    if (data.documents) {
      data.documents.forEach((doc) => {
        const f = doc.fields;
        if (!f || (f.weekId && f.weekId.stringValue !== targetWeek)) return;

        const totalH = f.totalHours
          ? Number(
              f.totalHours.doubleValue ||
                f.totalHours.integerValue ||
                f.totalHours.stringValue
            ) || 0
          : 0;
        const breakH = f.breakHours
          ? Number(
              f.breakHours.doubleValue ||
                f.breakHours.integerValue ||
                f.breakHours.stringValue
            ) || 0
          : 0;

        rawShifts.push({
          staffName: f.staffName ? f.staffName.stringValue : 'Unknown',
          day: f.day ? f.day.stringValue : '',
          startTime: f.startTime ? f.startTime.stringValue : '',
          endTime: f.endTime ? f.endTime.stringValue : '',
          lane: f.lane
            ? parseInt(f.lane.integerValue || f.lane.stringValue)
            : 1,
          breakHours: breakH,
          totalHours: isFinite(totalH) ? totalH : 0,
          color: f.color ? f.color.stringValue : '#f3f3f3',
        });
      });
    }

    if (rawShifts.length === 0) {
      ui.alert(
        'お知らせ',
        `${weekLabel} のデータは見つかりませんでした。`,
        ui.ButtonSet.OK
      );
      return;
    }

    buildScheduleWithAdvancedLogic(ss, rawShifts, targetWeek);
    updateShiftDataSheet(ss, rawShifts);
    updateDashboardSheet(ss, rawShifts, weekLabel);

    ss.toast(`${weekLabel} の同期が完了しました！`, '成功', 5);
  } catch (e) {
    ui.alert('エラー', e.message, ui.ButtonSet.OK);
  }
}

/**
 * [5] SCHEDULE描画
 */
function buildScheduleWithAdvancedLogic(ss, shifts, targetWeek) {
  const target = ss.getSheetByName('SCHEDULE');
  const template = ss.getSheetByName('TEMPLATE_MASTER');
  if (!target || !template) return;

  target.clear().clearFormats();
  template.getDataRange().copyTo(target.getRange(1, 1));

  const dayMap = {
    MON: 2,
    TUE: 7,
    WED: 12,
    THU: 17,
    FRI: 22,
    SAT: 27,
    SUN: 32,
  };
  const mondayDate = getDateFromISOWeek(targetWeek);
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((dayKey, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    target.getRange(1, dayMap[dayKey]).setValue(`${dayKey} ${d.getDate()}`);
  });

  shifts.forEach((s) => {
    s.drawEndTime = null;
  });
  let groups = {};
  shifts.forEach((s) => {
    let key = s.day + '_' + s.lane;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  for (let key in groups) {
    let ls = groups[key];
    ls.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 0; i < ls.length - 1; i++) {
      if (timeToMinutes(ls[i].endTime) > timeToMinutes(ls[i + 1].startTime))
        ls[i].drawEndTime = ls[i + 1].startTime;
    }
  }

  target
    .getRange('B5:AJ40')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontWeight('bold');

  shifts.forEach((s) => {
    if (!s.startTime || !s.endTime || !dayMap[s.day]) return;
    let sR = getRowNum(s.startTime),
      eR = getRowNum(s.drawEndTime || s.endTime) - 1;
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
    let range = target.getRange(
      sR,
      dayMap[s.day] + (s.lane - 1),
      eR - sR + 1,
      1
    );
    range
      .breakApart()
      .merge()
      .setBackground(s.color)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        'black',
        SpreadsheetApp.BorderStyle.SOLID
      )
      .setFontSize(20);

    let startStr = formatTime12(s.startTime),
      endStr = formatTime12(s.endTime);
    let tL =
      (startStr + '-' + endStr).length >= 9
        ? startStr + '-\n' + endStr
        : startStr + '-' + endStr;
    let breakL =
      s.breakHours === 0.5
        ? '\n30mins'
        : s.breakHours >= 1
        ? `\n${s.breakHours}HR`
        : '';
    range.setValue(`${s.staffName}\n${tL}${breakL}`);
  });

  const medium = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  [
    'B5:E16',
    'G5:J16',
    'L5:O16',
    'Q5:T16',
    'V5:Y16',
    'B21:E29',
    'G21:J29',
    'L21:O29',
    'Q21:T29',
    'V21:Y29',
    'AA5:AD29',
    'AF5:AI29',
  ].forEach((r) => {
    target
      .getRange(r)
      .setBorder(true, true, true, true, null, null, 'black', medium);
  });
}

/**
 * [6] DASHBOARD更新
 */
function updateDashboardSheet(ss, shifts, weekLabel) {
  const sheet = ss.getSheetByName('DASHBOARD');
  const prefSheet = ss.getSheetByName('Preferred hours');
  if (!sheet || !prefSheet) return;

  if (sheet.getMaxRows() > 2) {
    sheet
      .getRange(3, 1, sheet.getMaxRows() - 2, 6)
      .clearContent()
      .clearDataValidations();
  }

  sheet.getRange('A1').setValue(`Summary: ${weekLabel}`);

  const dashboardMap = {};
  const prefValues = prefSheet.getDataRange().getValues();
  prefValues.forEach((row) => {
    let name = String(row[1] || '').trim();
    let targetVal = String(row[2] || '');
    if (!name || name === 'Name' || name === 'Preferred hours') return;

    let targetNum = 0;
    let matches = targetVal.match(/\d+/g);
    if (matches) targetNum = parseFloat(matches.pop());
    dashboardMap[name.toUpperCase()] = {
      target: targetNum,
      current: 0,
      originalName: name,
    };
  });

  shifts.forEach((s) => {
    let n = s.staffName.toUpperCase();
    if (dashboardMap[n]) dashboardMap[n].current += Number(s.totalHours) || 0;
  });

  const output = [];
  for (let key in dashboardMap) {
    let d = dashboardMap[key];
    let cur = Math.floor((Number(d.current) || 0) * 100) / 100;
    let targetNum = Number(d.target) || 0;
    let rem = Math.floor((targetNum - cur) * 100) / 100;
    let status = targetNum === 0 ? '-' : rem < 0 ? '⚠️ OVER' : 'OK';

    // カナダ(英語)環境用 SPARKLINE
    let bar =
      targetNum > 0
        ? `=SPARKLINE(${Math.min(
            cur,
            targetNum
          )}, {"charttype", "bar"; "max", ${targetNum}; "color1", "${
            rem < 0 ? 'red' : 'green'
          }"})`
        : '';

    output.push([d.originalName, cur, targetNum, bar, rem, status]);
  }

  if (output.length > 0) {
    const dataRange = sheet.getRange(3, 1, output.length, 6);
    dataRange
      .setValues(output)
      .setHorizontalAlignment('center')
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        '#cccccc',
        SpreadsheetApp.BorderStyle.SOLID
      );
    for (let i = 0; i < output.length; i++) {
      if (output[i][5] === '⚠️ OVER')
        sheet
          .getRange(i + 3, 6)
          .setFontColor('red')
          .setFontWeight('bold');
    }
  }
}

/**
 * [7] SHIFT_DATA更新
 */
function updateShiftDataSheet(ss, shifts) {
  const sheet = ss.getSheetByName('SHIFT_DATA');
  if (!sheet) return;

  if (sheet.getMaxRows() > 1) {
    sheet
      .getRange(2, 1, sheet.getMaxRows() - 1, 7)
      .clearContent()
      .clearDataValidations();
  }

  const dayOrder = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
  shifts.sort(
    (a, b) =>
      (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99) ||
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const rows = shifts.map((s) => [
    s.day,
    s.staffName,
    s.startTime,
    s.endTime,
    s.lane,
    s.breakHours,
    s.totalHours,
  ]);
  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, 7)
      .setValues(rows)
      .setHorizontalAlignment('center');
  }
}

/**
 * [8] 補助関数
 */
function getISOWeekId(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(
    ((d - yearStart) / 86400000 + 1) / 7
  )
    .toString()
    .padStart(2, '0')}`;
}
function getDateFromISOWeek(weekId) {
  const p = weekId.split('-W');
  const d = new Date(parseInt(p[0]), 0, 1 + (parseInt(p[1]) - 1) * 7);
  const dow = d.getDay();
  if (dow <= 4) d.setDate(d.getDate() - d.getDay() + 1);
  else d.setDate(d.getDate() + 8 - d.getDay());
  return d;
}
function timeToMinutes(t) {
  if (!t) return 0;
  const p = t.split(':').map(Number);
  return p[0] * 60 + p[1];
}
function formatTime12(t) {
  if (!t) return '';
  let p = t.split(':'),
    h = parseInt(p[0], 10);
  return (
    (h > 12 ? h - 12 : h === 0 ? 12 : h) + (p[1] === '00' ? '' : ':' + p[1])
  );
}
function getRowNum(t) {
  if (!t) return 0;
  const p = t.split(':'),
    h = parseInt(p[0], 10),
    m = parseInt(p[1], 10);
  return (h - 9) * 2 + (m >= 30 ? 1 : 0) + 5;
}
function clearInputForNextWeek() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SHIFT_DATA');
  if (s && s.getMaxRows() > 1) {
    s.getRange(2, 1, s.getMaxRows() - 1, 7)
      .clearContent()
      .clearDataValidations();
  }
}
