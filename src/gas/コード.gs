/**
 * [1] アプリからのPOSTリクエストを受け取る (メイン・エントリーポイント)
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // デバッグ用：シートのどこかに実行時間を記録（動いているか確認用）
  ss.toast('同期リクエストを受信しました', '実行中...');

  try {
    const data = JSON.parse(e.postData.contents);
    // ...（中身は前回の提供通り）...

    // 完了通知
    ss.toast('同期が完了しました！', '成功');
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    // エラー時はスプレッドシート上にアラートを出す
    SpreadsheetApp.getUi().alert('GASエラー: ' + err.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * [2] SCHEDULEシートの描画
 */
function updateScheduleSheet(ss, commands, weekId, weekLabel) {
  const target = ss.getSheetByName('SCHEDULE');
  const template = ss.getSheetByName('TEMPLATE_MASTER');
  if (!target || !template) return;

  // 1. テンプレートのコピー
  target.clear().clearFormats();
  template.getDataRange().copyTo(target.getRange(1, 1));

  // 2. ヘッダーの日付更新
  const dayMap = {
    MON: 2,
    TUE: 7,
    WED: 12,
    THU: 17,
    FRI: 22,
    SAT: 27,
    SUN: 32,
  };
  const mondayDate = getDateFromISOWeek(weekId);
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((dayKey, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    target.getRange(1, dayMap[dayKey]).setValue(`${dayKey} ${d.getDate()}`);
  });

  // 3. アプリから届いた各シフトを描画
  commands.forEach((cmd) => {
    // 命令に基づいて範囲を特定し、結合・着色
    const rangeStr = `${cmd.cell}:${cmd.endCell}`;
    const range = target.getRange(rangeStr);

    range
      .breakApart() // 念のため既存の結合を解除
      .merge()
      .setBackground(cmd.color)
      .setValue(cmd.value)
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
      .setFontSize(20)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold');
  });

  // 4. 外枠の装飾（固定範囲）
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
 * [3] DASHBOARDシートの描画
 */
function updateDashboardSheet(ss, rows, weekLabel) {
  const sheet = ss.getSheetByName('DASHBOARD');
  if (!sheet) return;

  // 初期化（3行目以降をクリア）
  if (sheet.getMaxRows() > 2) {
    sheet
      .getRange(3, 1, sheet.getMaxRows() - 2, 6)
      .clearContent()
      .clearDataValidations();
  }

  sheet.getRange('A1').setValue(`Summary: ${weekLabel}`);

  if (rows.length > 0) {
    const range = sheet.getRange(3, 1, rows.length, 6);
    range
      .setValues(rows)
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

    // ステータス列（6列目）の色付けと、4列目へのSPARKLINE挿入
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 3;
      const status = rows[i][5];
      const targetVal = rows[i][2];
      const curVal = rows[i][1];

      if (status === '⚠️ OVER') {
        sheet.getRange(rowNum, 6).setFontColor('red').setFontWeight('bold');
      }

      // SPARKLINEの動的挿入 (GASで関数としてセット)
      if (targetVal > 0) {
        const color = status === '⚠️ OVER' ? 'red' : 'green';
        const formula = `=SPARKLINE(${curVal}, {"charttype", "bar"; "max", ${targetVal}; "color1", "${color}"})`;
        sheet.getRange(rowNum, 4).setFormula(formula);
      }
    }
  }
}

/**
 * [4] SHIFT_DATAシートの更新 (履歴用)
 */
function updateShiftDataSheet(ss, rows) {
  const sheet = ss.getSheetByName('SHIFT_DATA');
  if (!sheet) return;

  if (sheet.getMaxRows() > 1) {
    sheet
      .getRange(2, 1, sheet.getMaxRows() - 1, 7)
      .clearContent()
      .clearDataValidations();
  }

  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, 7)
      .setValues(rows)
      .setHorizontalAlignment('center');
  }
}

/**
 * [5] 補助関数（日付計算用のみ残す）
 */
function getDateFromISOWeek(weekId) {
  const p = weekId.split('-W');
  const d = new Date(parseInt(p[0]), 0, 1 + (parseInt(p[1]) - 1) * 7);
  const dow = d.getDay();
  if (dow <= 4) d.setDate(d.getDate() - d.getDay() + 1);
  else d.setDate(d.getDate() + 8 - d.getDay());
  return d;
}

/**
 * メニュー作成（スプレッドシート上からの同期は廃止するが、クリア機能などは残しておいてもOK）
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('★SHIFT SYSTEM')
    .addItem('🗑️ SHIFT_DATAをクリア', 'clearInputForNextWeek')
    .addToUi();
}

function clearInputForNextWeek() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SHIFT_DATA');
  if (s && s.getMaxRows() > 1)
    s.getRange(2, 1, s.getMaxRows() - 1, 7).clearContent();
}
