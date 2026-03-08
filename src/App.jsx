import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  orderBy,
  getFirestore,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

// components import
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ShiftTable from './components/ShiftTable';
import StaffDetailModal from './components/StaffDetailModal';
import EditShiftModal from './components/EditShiftModal';
import StaffManagementModal from './components/StaffManagementModal';

// --- 🌐 多言語辞書 ---
const translations = {
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
  },
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const LANES = [1, 2, 3, 4];
const TIMES = [];
for (let h = 9; h <= 23; h++) {
  TIMES.push(`${h.toString().padStart(2, '0')}:00`);
  if (h !== 23) TIMES.push(`${h.toString().padStart(2, '0')}:30`);
}

const ROW_HEIGHT = 36;
const DRAG_THRESHOLD = 20;

// --- 🌟 ヘルパー関数 ---
const getColumnLetter = (colIndex) => {
  let letter = '';
  while (colIndex > 0) {
    let temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
};

const getSheetRowNum = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h - 9) * 2 + (m >= 30 ? 1 : 0) + 5;
};

const getSheetCellByRow = (day, row, lane) => {
  const dayIdx = DAYS.indexOf(day);
  const baseCol = 2 + dayIdx * 5;
  const colLetter = getColumnLetter(baseCol + (lane - 1));
  return `${colLetter}${row}`;
};

const formatTime12 = (t) => {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const displayM = m === 0 ? '' : ':' + m.toString().padStart(2, '0');
  return `${displayH}${displayM}`;
};

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const calcTotalHours = (start, end, breakHours) => {
  const durationMins = timeToMins(end) - timeToMins(start);
  let total = durationMins / 60 - (breakHours || 0);
  if (total < 0) total = 0;
  return Math.floor(total * 100) / 100;
};

const getWeekDisplayVerbose = (weekId, lang = 'en') => {
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

const getCurrentWeekId = (date = new Date()) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

function App() {
  const [lang, setLang] = useState(
    () => localStorage.getItem('appLang') || 'en'
  );
  const t = translations[lang];

  const [staffs, setStaffs] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [shifts, setShifts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingShift, setEditingShift] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [weekId, setWeekId] = useState(
    () => localStorage.getItem('lastViewedWeek') || getCurrentWeekId()
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedCopyWeek, setSelectedCopyWeek] = useState('');
  const menuRef = useRef(null);
  const hasInitialized = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    color: '#cbd5e1',
    target: 24,
  });
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffEditData, setStaffEditData] = useState({});
  const [viewingStaffDetail, setViewingStaffDetail] = useState(null);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // 認証状態の監視（ブラウザを閉じてもログインを維持するための処理）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false); // 状態の確認が終わったらロード終了
    });
    return unsubscribe;
  }, []);

  // 合言葉による共通ログイン
  const handleSecretLogin = async () => {
    // 環境変数から期待値をロード
    const targetId = import.meta.env.VITE_UI_USERID;
    const targetPw = import.meta.env.VITE_UI_PASSCODE;
    const fbAdminEmail = import.meta.env.VITE_FB_ADMIN_EMAIL;
    const fbAdminPass = import.meta.env.VITE_FB_ADMIN_PASS;

    // 1. UI入力値と環境変数の照合
    if (loginPw === targetPw) {
      try {
        // 2. 照合成功時のみ、裏側でFirebaseの共通アカウントでサインイン
        await signInWithEmailAndPassword(auth, fbAdminEmail, fbAdminPass);
      } catch (error) {
        console.error('Firebase Auth Error:', error.code);
        alert(
          'システム認証エラーが発生しました。Firebaseコンソールの設定を確認してください。'
        );
      }
    } else {
      alert('ユーザー名またはパスワードが正しくありません。');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？')) {
      try {
        await signOut(auth);
        // signOut が成功すると onAuthStateChanged が検知して
        // 自動的に user が null になり、ログイン画面に戻ります。
      } catch (error) {
        console.error('Logout Error:', error);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('appLang', lang);
  }, [lang]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStaffs = useCallback(async () => {
    const q = query(collection(db, 'staffs'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (list.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const initial = [
        { name: 'KANA', color: '#bae6fd', target: 39, order: 0 },
        { name: 'RYUSHIN', color: '#bbf7d0', target: 38, order: 1 },
        { name: 'SAYAKA', color: '#e9d5ff', target: 24, order: 2 },
      ];
      const batch = writeBatch(db);
      initial.forEach((s) => batch.set(doc(collection(db, 'staffs')), s));
      await batch.commit();
      window.location.reload();
      return;
    }
    setStaffs(list);
    if (!selectedStaff && list.length > 0) setSelectedStaff(list[0].name);
  }, [selectedStaff]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  useEffect(() => {
    localStorage.setItem('lastViewedWeek', weekId);
    const fetchShifts = async () => {
      const q = query(collection(db, 'shifts'), where('weekId', '==', weekId));
      const querySnapshot = await getDocs(q);
      setShifts(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchShifts();
  }, [weekId]);

  const changeWeek = (offset) => {
    const [year, week] = weekId.split('-W').map(Number);
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    date.setDate(date.getDate() + offset * 7);
    setWeekId(getCurrentWeekId(date));
  };

  const jumpToToday = () => setWeekId(getCurrentWeekId());

  const handleSyncToGAS = async () => {
    if (isProcessing) return;
    const gasUrl = import.meta.env.VITE_GAS_URL;
    if (!gasUrl) {
      alert('.env Error: VITE_GAS_URL');
      return;
    }
    if (
      !window.confirm(`${t.confirmSync} ${getWeekDisplayVerbose(weekId, lang)}`)
    )
      return;
    setIsProcessing(true);
    setShowMenu(false);
    try {
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
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      alert('Success!');
    } catch (error) {
      console.error(error);
      alert('Error');
    }
    setIsProcessing(false);
  };

  const handleMoveStaff = async (index, direction) => {
    if (isProcessing) return;
    const newStaffs = [...staffs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStaffs.length) return;
    setIsProcessing(true);
    [newStaffs[index], newStaffs[targetIndex]] = [
      newStaffs[targetIndex],
      newStaffs[index],
    ];
    const batch = writeBatch(db);
    newStaffs.forEach((s, i) => {
      batch.update(doc(db, 'staffs', s.id), { order: i });
    });
    try {
      await batch.commit();
      setStaffs(newStaffs);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleUpdateStaff = async (staffId) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const oldStaff = staffs.find((s) => s.id === staffId);
      await updateDoc(doc(db, 'staffs', staffId), staffEditData);
      if (
        oldStaff.name !== staffEditData.name ||
        oldStaff.color !== staffEditData.color
      ) {
        const batch = writeBatch(db);
        const q = query(
          collection(db, 'shifts'),
          where('staffName', '==', oldStaff.name)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          batch.update(doc(db, 'shifts', d.id), {
            staffName: staffEditData.name,
            color: staffEditData.color,
          });
        });
        await batch.commit();
        setShifts((prev) =>
          prev.map((s) =>
            s.staffName === oldStaff.name
              ? {
                  ...s,
                  staffName: staffEditData.name,
                  color: staffEditData.color,
                }
              : s
          )
        );
      }
      setStaffs((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, ...staffEditData } : s))
      );
      setEditingStaffId(null);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleStartEditStaff = (staff) => {
    setEditingStaffId(staff.id);
    setStaffEditData({
      name: staff.name,
      color: staff.color,
      target: staff.target,
    });
  };

  const handleUpdateShift = async (e) => {
    if (e) e.preventDefault();
    if (!editingShift || isProcessing) return;
    setIsProcessing(true);
    try {
      const total = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours
      );
      await updateDoc(doc(db, 'shifts', editingShift.id), {
        ...editingShift,
        totalHours: total,
      });
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id ? { ...editingShift, totalHours: total } : s
        )
      );
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const handleDeleteShift = async () => {
    if (!editingShift || isProcessing) return;
    if (!window.confirm(t.confirmDelete)) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'shifts', editingShift.id));
      setShifts((prev) => prev.filter((s) => s.id !== editingShift.id));
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  // 1. ドラッグ開始：要素の保存と拘束
  const handlePointerDownShift = (e, shift, type) => {
    e.stopPropagation();
    const currentTarget = e.currentTarget; // ★要素を取得
    setDragInfo({
      id: shift.id,
      type,
      startY: e.clientY,
      startX: e.clientX,
      initStartMins: timeToMins(shift.startTime),
      initEndMins: timeToMins(shift.endTime),
      initDay: shift.day,
      initLane: shift.lane,
      targetElement: currentTarget, // ★dragInfoに要素を保存
    });
    setIsActuallyDragging(false);
    currentTarget.setPointerCapture(e.pointerId); // ★この要素にポインターを拘束
  };

  // 2. ドラッグ中：UIの即時更新
  const handlePointerMove = useCallback(
    (e) => {
      if (!dragInfo) return;
      const deltaY = e.clientY - dragInfo.startY;
      const deltaX = e.clientX - dragInfo.startX;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!isActuallyDragging) {
        if (distance > DRAG_THRESHOLD) {
          setIsActuallyDragging(true);
        } else {
          return;
        }
      }

      const deltaMins = Math.round(((deltaY / ROW_HEIGHT) * 30) / 5) * 5;
      const targetTd = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => el.tagName === 'TD' && el.dataset.day);

      setShifts((prev) =>
        prev.map((s) => {
          if (s.id !== dragInfo.id) return s;
          let nS = dragInfo.initStartMins,
            nE = dragInfo.initEndMins,
            nD = s.day,
            nL = s.lane;
          if (dragInfo.type === 'move') {
            nS += deltaMins;
            nE += deltaMins;
            if (targetTd) {
              nD = targetTd.dataset.day;
              nL = Number(targetTd.dataset.lane);
            }
          } else if (dragInfo.type === 'resize-top') {
            nS += deltaMins;
          } else if (dragInfo.type === 'resize-bottom') {
            nE += deltaMins;
          }
          const limitStart = timeToMins('09:00'),
            limitEnd = timeToMins('24:00');
          nS = Math.max(limitStart, Math.min(nS, nE - 15));
          nE = Math.min(limitEnd, Math.max(nE, nS + 15));
          const sStr = minsToTime(nS),
            eStr = minsToTime(nE);
          return {
            ...s,
            startTime: sStr,
            endTime: eStr,
            totalHours: calcTotalHours(sStr, eStr, s.breakHours),
            day: nD,
            lane: nL,
          };
        })
      );
    },
    [dragInfo, isActuallyDragging]
  );

  // 3. ドラッグ終了：Firebaseへの保存 (★重要)
  const handlePointerUp = useCallback(
    async (e) => {
      if (!dragInfo) return;

      // ポインターの拘束を解除
      if (
        dragInfo.targetElement &&
        dragInfo.targetElement.hasPointerCapture(e.pointerId)
      ) {
        dragInfo.targetElement.releasePointerCapture(e.pointerId);
      }

      // ドラッグ終了時の最新データを取得
      const draggedId = dragInfo.id;
      const finalShift = shifts.find((s) => s.id === draggedId);
      const wasDragging = isActuallyDragging;

      // 状態をリセット
      setDragInfo(null);
      setIsActuallyDragging(false);

      // ★実際に移動が行われていた場合のみFirebaseを更新
      if (wasDragging && finalShift) {
        try {
          const shiftRef = doc(db, 'shifts', draggedId);
          await updateDoc(shiftRef, {
            startTime: finalShift.startTime,
            endTime: finalShift.endTime,
            day: finalShift.day,
            lane: finalShift.lane,
            totalHours: finalShift.totalHours,
          });
          console.log('Firebase synced: ', finalShift.staffName);
        } catch (error) {
          console.error('Firebase update failed:', error);
        }
      }
    },
    [dragInfo, isActuallyDragging, shifts] // ★最新のshiftsを参照するために依存関係に追加
  );

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleAddShift = async (day, time, lane) => {
    if (isProcessing || !selectedStaff) return;
    setIsProcessing(true);
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
    const startMins = timeToMins(time);
    const endStr = minsToTime(Math.min(startMins + 120, timeToMins('23:30')));
    const newShift = {
      staffName: selectedStaff,
      day,
      startTime: time,
      endTime: endStr,
      lane,
      breakHours: 0,
      totalHours: calcTotalHours(time, endStr, 0),
      color: staffInfo.color,
      weekId,
    };
    try {
      const docRef = await addDoc(collection(db, 'shifts'), newShift);
      setShifts((prev) => [...prev, { id: docRef.id, ...newShift }]);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const fetchAvailableWeeks = async () => {
    const q = query(collection(db, 'shifts'));
    const snapshot = await getDocs(q);
    const weeks = new Set();
    snapshot.docs.forEach((doc) => {
      if (doc.data().weekId) weeks.add(doc.data().weekId);
    });
    setAvailableWeeks(Array.from(weeks).sort().reverse());
  };

  const executeCopy = async () => {
    if (!selectedCopyWeek || isProcessing) return;
    setIsProcessing(true);
    try {
      const q = query(
        collection(db, 'shifts'),
        where('weekId', '==', selectedCopyWeek)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) =>
        batch.set(doc(collection(db, 'shifts')), {
          ...d.data(),
          weekId: weekId,
        })
      );
      await batch.commit();
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const dashboardData = staffs.map((staff) => {
    const total = shifts
      .filter((s) => s.staffName === staff.name)
      .reduce((acc, s) => acc + s.totalHours, 0);
    const totalFixed = Math.floor(total * 100) / 100;
    return {
      ...staff,
      currentHours: totalFixed,
      remaining: Math.floor((staff.target - totalFixed) * 100) / 100,
      progressPercent: Math.min((totalFixed / staff.target) * 100, 100),
    };
  });

  // 1. セッション確認中のローディング
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 text-xs tracking-widest uppercase">
            Checking Access...
          </p>
        </div>
      </div>
    );
  }

  // 2. 未ログイン時の壁（ログインページ）
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter mb-2">SAKU</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              Staff Only Portal
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              autoFocus
              value={loginPw}
              placeholder="ENTER PASSCODE"
              className="w-full bg-slate-800 border-none rounded-3xl py-5 px-6 text-center text-2xl font-black tracking-[0.4em] focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
              onChange={(e) => setLoginPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSecretLogin();
              }}
            />
            <p className="text-center text-[10px] text-slate-600 font-black uppercase animate-pulse">
              Press Enter to Login
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-blue-200">
      {' '}
      {/* Header */}
      <Header
        lang={lang}
        setLang={setLang}
        weekId={weekId}
        setWeekId={setWeekId}
        changeWeek={changeWeek}
        jumpToToday={jumpToToday}
        getWeekDisplayVerbose={getWeekDisplayVerbose}
        t={t}
        staffs={staffs}
        selectedStaff={selectedStaff}
        setSelectedStaff={setSelectedStaff}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        handleSyncToGAS={handleSyncToGAS}
        fetchAvailableWeeks={fetchAvailableWeeks}
        setShowCopyModal={setShowCopyModal}
        setShowStaffModal={setShowStaffModal}
        handleLogout={handleLogout}
        shifts={shifts}
        setShifts={setShifts}
      />
      {/* DASHBOARD */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6">
        <Dashboard
          dashboardData={dashboardData}
          setViewingStaffDetail={setViewingStaffDetail}
          t={t}
        />

        {/* 📅 タイムテーブルコンテナ: 2軸固定の実装 */}
        <ShiftTable
          DAYS={DAYS}
          LANES={LANES}
          TIMES={TIMES}
          ROW_HEIGHT={ROW_HEIGHT}
          shifts={shifts}
          dragInfo={dragInfo}
          isActuallyDragging={isActuallyDragging}
          t={t}
          formatTime12={formatTime12}
          timeToMins={timeToMins}
          handleAddShift={handleAddShift}
          setEditingShift={setEditingShift}
          handlePointerDownShift={handlePointerDownShift}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
        />
      </div>
      {/* --- モーダル類 --- */}
      <StaffDetailModal
        viewingStaffDetail={viewingStaffDetail}
        setViewingStaffDetail={setViewingStaffDetail}
        shifts={shifts}
        DAYS={DAYS}
        timeToMins={timeToMins}
        formatTime12={formatTime12}
        t={t}
      />
      <StaffManagementModal
        showStaffModal={showStaffModal}
        setShowStaffModal={setShowStaffModal}
        staffs={staffs}
        setStaffs={setStaffs}
        editingStaffId={editingStaffId}
        setEditingStaffId={setEditingStaffId}
        staffEditData={staffEditData}
        setStaffEditData={setStaffEditData}
        handleUpdateStaff={handleUpdateStaff}
        handleStartEditStaff={handleStartEditStaff}
        handleMoveStaff={handleMoveStaff}
        setIsProcessing={setIsProcessing}
        deleteDoc={deleteDoc}
        doc={doc}
        db={db}
        newStaff={newStaff}
        setNewStaff={setNewStaff}
        addDoc={addDoc}
        collection={collection}
        isProcessing={isProcessing}
        t={t}
      />
      <EditShiftModal
        editingShift={editingShift}
        setEditingShift={setEditingShift}
        handleUpdateShift={handleUpdateShift}
        handleDeleteShift={handleDeleteShift}
        t={t}
      />
      {isProcessing && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-[4px] z-[100] flex items-center justify-center transition-all duration-500">
          <div className="bg-slate-900 text-white px-10 py-6 rounded-[32px] font-black shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-bounce flex items-center gap-4 border-2 border-white/20">
            <span className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></span>
            <span className="uppercase tracking-[0.3em] text-sm">
              {t.processing}
            </span>
          </div>
        </div>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          body {
            margin: 0;
            overflow-x: hidden; /* rootではなくbodyにかけるのが鉄則です */
            width: 100%;
            position: relative;
          }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 3px solid white; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        /* thead自体のstickyを有効化 */
        thead.sticky { top: 0 !important; }
        `,
        }}
      />
    </div>
  );
}

export default App;
