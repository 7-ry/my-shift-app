// src/constants/config.js

export const translations = {
  en: {
    week: 'Week',
    today: 'Today',
    sync: 'Sync to Sheet',
    copy: 'Copy from',
    manage: 'Manage Staff',
    clear: 'Clear Week',
    target: 'Target',
    over: 'OVER',
    met: 'MET',
    room: 'AVAIL',
    time: 'Time',
    addShift: 'Add Shift',
    editShift: 'Edit Shift',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    break: 'Break',
    staffName: 'Name',
    newStaff: 'New Staff',
    totalHours: 'Total Hours',
    shiftsDetail: 'Weekly Shift Details',
    noShifts: 'No shifts assigned this week.',
    processing: 'PROCESSING...',
    confirmSync: 'Sync data to Spreadsheet for',
    confirmDelete: 'Delete this shift?',
    confirmClear: 'Clear all data for this week?',
    confirmStaffDelete: 'Delete this staff member?',
    doubleClickHint: 'Double-click to add',
    logout: 'Logout',
    start: 'START',
    end: 'END',
    lockTitle: 'Enable Editing',
    unlockTitle: 'Disable Editing',
    template: 'Template',
    shiftHistory: 'History: COPY FROM PAST',
    saveAsTemplate: 'SAVE AS TEMPLATE',
    checkingAccess: 'Checking Access...',
    logoutConfirm: 'Are you sure you want to logout?',
    syncSuccess: 'Sync completed successfully!',
    syncError: 'Error occurred during sync.',
    templateSaveSuccess: 'Success: "{name}" saved!',
    templateSaveError: 'Failed to save template.',
    templateApplySuccess: 'Template applied successfully!',
    templateApplyError: 'Failed to apply template.',
    templateDeleteConfirm: 'Delete this template?',
    offDayWarning: '{name} is set to be OFF on {day}. Add anyway?',
    saveCurrentWeek: 'Save Current Week',
    templatePlaceholder: 'Template Name (e.g. Standard Winter)',
    addStaffBtn: 'Add Staff',
    defaultOffDays: 'Default Off Days',
    close: 'Close',
    syncSuccess: 'Sync completed successfully!', // 追加
    syncError: 'Error occurred during sync.', // 追加
    noTemplates: 'No templates saved.', // 追加
    shiftsCount: '{count} Shifts', // 追加
    staffsCount: '{count} Staffs', // 追加
    copySelectedWeek: 'Copy Selected Week', // 追加
    none: 'None', // 追加
    minutes: 'mins', // 追加
    hour: 'hour', // 追加
    hours: 'hours', // 追加
    unitHrs: 'hrs', // 追加
    staffOnlyPortal: 'Staff Only Portal', // 追加
    enterPasscode: 'ENTER PASSCODE', // 追加
    pressEnterToLogin: 'Press Enter to Login', // 追加
    offWatermark: 'OFF', // 追加
  },
  ja: {
    week: '週',
    today: '今日',
    sync: 'スプレッドシートへ同期',
    copy: 'コピー元を選択',
    manage: 'スタッフ管理',
    clear: 'クリア',
    target: '目標',
    over: '超過',
    met: '達成',
    room: '追加可能',
    time: '時間',
    addShift: 'シフト追加',
    editShift: 'シフト編集',
    delete: '削除',
    save: '保存',
    cancel: 'キャンセル',
    break: '休憩',
    staffName: '名前',
    newStaff: '新規スタッフ',
    totalHours: '合計時間',
    shiftsDetail: '週間シフト詳細',
    noShifts: '今週のシフトはありません。',
    processing: '処理中...',
    confirmSync: 'スプレッドシートへ同期しますか？：',
    confirmDelete: 'このシフトを削除しますか？',
    confirmClear: '今週のデータを全削除しますか？',
    confirmStaffDelete: 'このスタッフを削除しますか？',
    doubleClickHint: 'ダブルクリックで追加',
    logout: 'ログアウト',
    start: '開始時刻',
    end: '終了時刻',
    lockTitle: '編集を有効にする',
    unlockTitle: '編集を無効にする',
    template: 'テンプレート',
    shiftHistory: '履歴: 過去からコピー',
    saveAsTemplate: 'テンプレートとして保存',
    checkingAccess: 'アクセス権を確認中...',
    logoutConfirm: 'ログアウトしますか？',
    syncSuccess: '同期が完了しました！',
    syncError: '同期中にエラーが発生しました。',
    templateSaveSuccess: '成功：テンプレート「{name}」を保存しました',
    templateSaveError: 'テンプレートの保存に失敗しました。',
    templateApplySuccess: 'テンプレートを適用しました！',
    templateApplyError: 'テンプレートの適用に失敗しました。',
    templateDeleteConfirm: 'このテンプレートを削除しますか？',
    offDayWarning: '{name} は {day} が休み設定です。追加しますか？',
    saveCurrentWeek: '現在の週を保存',
    templatePlaceholder: 'テンプレート名（例：基本の冬シフト）',
    addStaffBtn: 'スタッフを追加',
    defaultOffDays: '既定の休日',
    close: '閉じる',
    syncSuccess: '同期が完了しました！',
    syncError: '同期中にエラーが発生しました。',
    noTemplates: '保存されたテンプレートはありません。',
    shiftsCount: '{count} シフト',
    staffsCount: '{count} 名',
    copySelectedWeek: '選択した週をコピー',
    none: 'なし',
    minutes: '分',
    hour: '時間',
    hours: '時間',
    unitHrs: '時間',
    staffOnlyPortal: 'スタッフ専用ポータル',
    enterPasscode: 'パスコードを入力',
    pressEnterToLogin: 'Enterキーでログイン',
    offWatermark: '休日',
  },
};

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const LANES = [1, 2, 3, 4];
export const TIMES = (() => {
  const times = [];
  for (let h = 9; h <= 23; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
    if (h !== 23) times.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return times;
})();

export const ROW_HEIGHT = 36;
export const DRAG_THRESHOLD = 20;
