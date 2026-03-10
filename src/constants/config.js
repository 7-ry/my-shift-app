// src/constants/config.js

export const translations = {
  en: {
    week: 'Week',
    today: 'Today',
    sync: 'Sync to Sheet',
    copy: 'Copy from Past',
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
  },
  ja: {
    week: '週',
    today: '今日',
    sync: 'スプレッドシートへ同期',
    copy: '過去からコピー',
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
