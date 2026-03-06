import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase';
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
} from 'firebase/firestore';

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
    room: 'ROOM',
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
    room: '余裕',
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
const DRAG_THRESHOLD = 5;

// --- 🌟 ヘルパー関数群 ---
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
  if (!weekId) return '';
  const [year, week] = weekId.split('-W').map(Number);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  const end = new Date(ISOweekStart);
  end.setDate(ISOweekStart.setDate() + 6);
  return `${ISOweekStart.toLocaleDateString(lang === 'en' ? 'en-CA' : 'ja-JP', {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString(lang === 'en' ? 'en-CA' : 'ja-JP', {
    month: 'short',
    day: 'numeric',
  })}`;
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
  const menuRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    localStorage.setItem('appLang', lang);
  }, [lang]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 👥 スタッフフェッチ & 初期化 (ここを復元しました) ---
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
        { name: 'EITO', color: '#fecdd3', target: 24, order: 3 },
        { name: 'KEITO', color: '#e2e8f0', target: 24, order: 4 },
        { name: 'DAISUKE', color: '#bfdbfe', target: 24, order: 5 },
        { name: 'AIRA', color: '#fed7aa', target: 24, order: 6 },
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
    if (!gasUrl) return alert('.env Error: VITE_GAS_URL');
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
        let statusLabel = rem < 0 ? `⚠️ ${t.over}` : rem === 0 ? t.met : t.room;
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
      if (selectedStaff === oldStaff.name) setSelectedStaff(staffEditData.name);
      setEditingStaffId(null);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
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

  const handlePointerDownShift = (e, shift, type) => {
    e.stopPropagation();
    setDragInfo({
      id: shift.id,
      type,
      startY: e.clientY,
      startX: e.clientX,
      initStartMins: timeToMins(shift.startTime),
      initEndMins: timeToMins(shift.endTime),
      initDay: shift.day,
      initLane: shift.lane,
    });
    setIsActuallyDragging(false);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragInfo) return;
      const deltaY = e.clientY - dragInfo.startY;
      const deltaX = e.clientX - dragInfo.startX;
      if (
        !isActuallyDragging &&
        (Math.abs(deltaY) > DRAG_THRESHOLD || Math.abs(deltaX) > DRAG_THRESHOLD)
      ) {
        setIsActuallyDragging(true);
      }
      if (!isActuallyDragging) return;
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

  const handlePointerUp = useCallback(
    async (e) => {
      if (!dragInfo) return;
      e.target.releasePointerCapture(e.pointerId);
      if (isActuallyDragging) {
        const updated = shifts.find((s) => s.id === dragInfo.id);
        if (updated) {
          await updateDoc(doc(db, 'shifts', updated.id), updated);
        }
      }
      setDragInfo(null);
      setIsActuallyDragging(false);
    },
    [dragInfo, shifts, isActuallyDragging]
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-blue-200">
      <header className="sticky top-0 z-[100] bg-white border-b border-slate-200 shadow-sm px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 h-16 md:h-[72px]">
        <div className="flex items-center gap-3 md:gap-5 min-w-fit">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-800 leading-none">
              Saku Burquitlam
            </h1>
            <span className="text-[10px] font-bold text-blue-600 uppercase mt-1 tracking-wider">
              {getWeekDisplayVerbose(weekId, lang)}
            </span>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => changeWeek(-1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all text-sm"
            >
              ◀
            </button>
            <input
              type="week"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="bg-transparent border-none text-xs font-black w-32 cursor-pointer text-center focus:ring-0"
            />
            <button
              onClick={() => changeWeek(1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all text-sm"
            >
              ▶
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button
              onClick={jumpToToday}
              className="px-3 py-1 text-[10px] font-black uppercase hover:bg-white rounded-lg transition-all"
            >
              {t.today}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <button
            onClick={() => setLang(lang === 'en' ? 'ja' : 'en')}
            className="w-10 h-10 flex items-center justify-center text-xs font-black border-2 border-slate-200 rounded-full hover:bg-slate-100 transition-all uppercase"
          >
            {lang}
          </button>
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 border-r border-slate-100 mr-2 pr-2 py-2">
            {staffs.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStaff(s.name)}
                style={{ backgroundColor: s.color }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  selectedStaff === s.name
                    ? 'ring-2 ring-slate-800 shadow-md scale-105'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {' '}
                {s.name}{' '}
              </button>
            ))}
          </div>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 text-xl transition-all shadow-lg active:scale-90"
            >
              ⚙️
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-top-2">
                <button
                  onClick={handleSyncToGAS}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-3"
                >
                  🔄 {t.sync}
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    fetchAvailableWeeks();
                    setShowCopyModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
                >
                  📋 {t.copy}
                </button>
                <button
                  onClick={() => {
                    setShowStaffModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
                >
                  👥 {t.manage}
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={async () => {
                    if (window.confirm(t.confirmClear)) {
                      setShowMenu(false);
                      const b = writeBatch(db);
                      shifts.forEach((s) => b.delete(doc(db, 'shifts', s.id)));
                      await b.commit();
                      setShifts([]);
                    }
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3"
                >
                  🗑️ {t.clear}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6">
          {dashboardData.map((d) => (
            <div
              key={d.id}
              onClick={() => setViewingStaffDetail(d)}
              className="group bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer relative overflow-hidden active:scale-95"
            >
              <div className="flex justify-between items-center mb-2 relative z-10">
                <span className="text-xs font-black text-slate-600 group-hover:text-blue-600 transition-colors uppercase">
                  {d.name}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black transition-all ${
                    d.remaining < 0
                      ? 'bg-red-500 text-white shadow-sm'
                      : d.remaining === 0
                      ? 'bg-blue-600 text-white'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {d.remaining < 0
                    ? t.over
                    : d.remaining === 0
                    ? t.met
                    : t.room}
                </span>
              </div>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">
                  {d.currentHours}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  / {d.target}h
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden relative z-10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    d.remaining < 0
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-slate-800'
                  }`}
                  style={{ width: `${d.progressPercent}%` }}
                ></div>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-full -mr-8 -mt-8 group-hover:bg-blue-50 transition-colors duration-500"></div>
            </div>
          ))}
        </div>

        {/* 📅 タイムテーブルコンテナ: 2軸固定の実装 */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative border-t-2 border-t-slate-900">
          <div className="overflow-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full border-collapse table-fixed min-w-[1200px] md:min-w-[1400px] select-none">
              <thead className="sticky top-0 z-40 bg-white">
                <tr className="bg-white">
                  <th className="w-16 border-b border-r-2 border-slate-200 bg-slate-50 sticky left-0 top-0 z-50 p-2 text-[10px] font-black text-slate-400 uppercase h-12">
                    {t.time}
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      colSpan={4}
                      className="border-b border-r-2 border-slate-200 bg-white p-3 text-center font-black text-slate-800 tracking-widest text-sm"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time) => (
                  <tr key={time} className="h-9 group">
                    <td className="border-b border-r-2 border-slate-200 text-center text-[10px] md:text-[11px] font-black text-slate-400 bg-slate-50 sticky left-0 z-30 group-hover:bg-slate-50 transition-colors uppercase">
                      <span
                        className={
                          time.endsWith(':00') ? 'text-slate-800' : 'opacity-40'
                        }
                      >
                        {formatTime12(time)}
                      </span>
                    </td>
                    {DAYS.map((day) =>
                      LANES.map((lane) => {
                        const cellShifts = shifts.filter(
                          (s) =>
                            s.day === day &&
                            s.lane === lane &&
                            timeToMins(s.startTime) >= timeToMins(time) &&
                            timeToMins(s.startTime) < timeToMins(time) + 30
                        );
                        return (
                          <td
                            key={`${day}-${time}-${lane}`}
                            data-day={day}
                            data-lane={lane}
                            onDoubleClick={() =>
                              handleAddShift(day, time, lane)
                            }
                            className={`border-b ${
                              time.endsWith(':30')
                                ? 'border-slate-100'
                                : 'border-slate-50 border-dashed'
                            } ${
                              lane === 4
                                ? 'border-r-2 border-r-slate-200'
                                : 'border-r border-slate-50'
                            } p-0 hover:bg-blue-50/50 cursor-crosshair relative transition-colors duration-100`}
                            title={t.doubleClickHint}
                          >
                            {cellShifts.map((shift) => (
                              <div
                                key={shift.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingShift(shift);
                                }}
                                onPointerDown={(e) =>
                                  handlePointerDownShift(e, shift, 'move')
                                }
                                className={`absolute inset-x-1 rounded-lg p-2 flex flex-col items-start overflow-hidden shadow-sm ring-1 ring-black/10 z-10 cursor-grab active:cursor-grabbing transition-shadow ${
                                  dragInfo?.id === shift.id &&
                                  isActuallyDragging
                                    ? 'z-[100] opacity-90 scale-[1.02] shadow-2xl ring-2 ring-blue-500'
                                    : ''
                                }`}
                                style={{
                                  top: `${
                                    ((timeToMins(shift.startTime) -
                                      timeToMins(time)) /
                                      30) *
                                      ROW_HEIGHT +
                                    2
                                  }px`,
                                  height: `${
                                    ((timeToMins(shift.endTime) -
                                      timeToMins(shift.startTime)) /
                                      30) *
                                      ROW_HEIGHT -
                                    4
                                  }px`,
                                  backgroundColor: shift.color,
                                  touchAction: 'none',
                                }}
                              >
                                <div
                                  className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-20"
                                  onPointerDown={(e) =>
                                    handlePointerDownShift(
                                      e,
                                      shift,
                                      'resize-top'
                                    )
                                  }
                                />
                                <span className="font-black text-[10px] text-slate-900 truncate w-full pointer-events-none uppercase tracking-tighter">
                                  {shift.staffName}
                                </span>
                                <span className="hidden md:block text-[9px] text-slate-800/60 pointer-events-none mt-1 font-black tracking-tighter">
                                  {formatTime12(shift.startTime)}-
                                  {formatTime12(shift.endTime)}
                                </span>
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-20"
                                  onPointerDown={(e) =>
                                    handlePointerDownShift(
                                      e,
                                      shift,
                                      'resize-bottom'
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- モーダル: スタッフ詳細ポップアップ --- */}
      {viewingStaffDetail && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4"
          onClick={() => setViewingStaffDetail(null)}
        >
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-8 border-b flex justify-between items-center bg-slate-50"
              style={{ borderTop: `12px solid ${viewingStaffDetail.color}` }}
            >
              <div>
                <h2 className="text-3xl font-black text-slate-800 leading-none uppercase">
                  {viewingStaffDetail.name}
                </h2>
                <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">
                  {t.shiftsDetail}
                </p>
              </div>
              <button
                onClick={() => setViewingStaffDetail(null)}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-md text-slate-400 hover:text-slate-800 font-bold transition-all active:scale-90"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-8 space-y-4">
              {shifts
                .filter((s) => s.staffName === viewingStaffDetail.name)
                .sort(
                  (a, b) =>
                    DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
                    timeToMins(a.startTime) - timeToMins(b.startTime)
                )
                .map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-white shadow-lg"
                        style={{ backgroundColor: viewingStaffDetail.color }}
                      >
                        <span className="text-[10px] leading-none opacity-80 uppercase">
                          {s.day}
                        </span>
                        <span className="text-xl leading-none mt-1">
                          L{s.lane}
                        </span>
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-800 tracking-tight">
                          {formatTime12(s.startTime)} -{' '}
                          {formatTime12(s.endTime)}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {t.break}: {s.breakHours}h
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-black text-slate-800">
                      {s.totalHours} hrs
                    </div>
                  </div>
                ))}
              {shifts.filter((s) => s.staffName === viewingStaffDetail.name)
                .length === 0 && (
                <div className="text-center py-12 text-slate-400 font-black italic uppercase tracking-widest">
                  {t.noShifts}
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-900 flex justify-between items-center text-white">
              <span className="text-xs font-black uppercase tracking-widest opacity-60">
                {t.totalHours}
              </span>
              <span className="text-3xl font-black">
                {viewingStaffDetail.currentHours}{' '}
                <span className="text-sm opacity-40">
                  / {viewingStaffDetail.target}h
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- モーダル: スタッフ管理 --- */}
      {showStaffModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4"
          onClick={() => setShowStaffModal(false)}
        >
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                {t.manage}
              </h2>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-800 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {staffs.map((s, index) => (
                <div
                  key={s.id}
                  className={`p-5 rounded-[28px] border-2 transition-all ${
                    editingStaffId === s.id
                      ? 'bg-blue-50 border-blue-400 shadow-inner'
                      : 'bg-slate-50 border-transparent hover:border-slate-200'
                  }`}
                >
                  {editingStaffId === s.id ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-widest">
                            {t.staffName}
                          </label>
                          <input
                            type="text"
                            className="w-full px-5 py-3 rounded-2xl border-2 border-blue-200 font-black text-sm uppercase outline-none focus:border-blue-500"
                            value={staffEditData.name}
                            onChange={(e) =>
                              setStaffEditData({
                                ...staffEditData,
                                name: e.target.value.toUpperCase(),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-widest">
                            {t.target}
                          </label>
                          <input
                            type="number"
                            className="w-full px-5 py-3 rounded-2xl border-2 border-blue-200 font-black text-sm focus:border-blue-500 outline-none"
                            value={staffEditData.target}
                            onChange={(e) =>
                              setStaffEditData({
                                ...staffEditData,
                                target: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-6 pt-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            className="w-10 h-10 rounded-full cursor-pointer border-4 border-white shadow-md"
                            value={staffEditData.color}
                            onChange={(e) =>
                              setStaffEditData({
                                ...staffEditData,
                                color: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setEditingStaffId(null)}
                            className="px-5 py-2 text-sm font-black text-slate-400 uppercase"
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={() => handleUpdateStaff(s.id)}
                            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all uppercase"
                          >
                            {t.save}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-5 group">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleMoveStaff(index, -1)}
                          disabled={index === 0}
                          className="text-xs text-slate-300 hover:text-slate-900 transition-all"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveStaff(index, 1)}
                          disabled={index === staffs.length - 1}
                          className="text-xs text-slate-300 hover:text-slate-900 transition-all"
                        >
                          ▼
                        </button>
                      </div>
                      <div
                        className="w-14 h-14 rounded-full shadow-xl border-4 border-white flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">
                          {s.name}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 tracking-tighter flex items-center gap-3 uppercase">
                          {t.target}: {s.target}h{' '}
                          <span className="opacity-20">|</span>{' '}
                          <span
                            style={{ color: s.color }}
                            className="font-mono text-[10px]"
                          >
                            {s.color}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEditStaff(s)}
                          className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-full transition-all shadow-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(t.confirmStaffDelete)) {
                              setIsProcessing(true);
                              await deleteDoc(doc(db, 'staffs', s.id));
                              setStaffs(
                                staffs.filter((staff) => staff.id !== s.id)
                              );
                              setIsProcessing(false);
                            }
                          }}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-white rounded-full transition-all shadow-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsProcessing(true);
                const newOrder = staffs.length;
                const docRef = await addDoc(collection(db, 'staffs'), {
                  ...newStaff,
                  order: newOrder,
                });
                setStaffs([
                  ...staffs,
                  { id: docRef.id, ...newStaff, order: newOrder },
                ]);
                setNewStaff({ name: '', color: '#cbd5e1', target: 24 });
                setIsProcessing(false);
              }}
              className="p-8 border-t bg-slate-900 space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={t.staffName}
                  className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm uppercase placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                  required
                />
                <input
                  type="number"
                  placeholder={t.target}
                  className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStaff.target}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, target: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  className="w-12 h-12 rounded-full cursor-pointer border-4 border-white/10 bg-transparent"
                  value={newStaff.color}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, color: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="flex-1 bg-white text-slate-900 rounded-2xl py-3 font-black uppercase text-sm hover:bg-blue-400 transition-all shadow-2xl active:scale-95 tracking-widest uppercase"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- モーダル: シフト編集 --- */}
      {editingShift && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4"
          onClick={() => setEditingShift(null)}
        >
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-4 h-12 rounded-full shadow-sm"
                style={{ backgroundColor: editingShift.color }}
              ></div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 uppercase leading-none tracking-tight">
                  {editingShift.staffName}
                </h2>
                <p className="text-[10px] font-black text-slate-400 mt-1 tracking-widest">
                  {t.editShift}
                </p>
              </div>
            </div>
            <form onSubmit={handleUpdateShift} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                    Start
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-black focus:border-blue-500 focus:bg-white outline-none shadow-inner"
                    value={editingShift.startTime}
                    onChange={(e) =>
                      setEditingShift({
                        ...editingShift,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                    End
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-black focus:border-blue-500 focus:bg-white outline-none shadow-inner"
                    value={editingShift.endTime}
                    onChange={(e) =>
                      setEditingShift({
                        ...editingShift,
                        endTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  {t.break}
                </label>
                <select
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-black appearance-none cursor-pointer focus:border-blue-500 shadow-inner"
                  value={editingShift.breakHours}
                  onChange={(e) =>
                    setEditingShift({
                      ...editingShift,
                      breakHours: parseFloat(e.target.value),
                    })
                  }
                >
                  <option value="0">None (0h)</option>
                  <option value="0.5">30 mins (0.5h)</option>
                  <option value="1">1 hour (1.0h)</option>
                  <option value="1.5">1.5 hours (1.5h)</option>
                </select>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleDeleteShift}
                  className="flex-1 bg-rose-50 text-rose-600 font-black py-5 rounded-[24px] transition-all hover:bg-rose-100 active:scale-95 uppercase text-xs"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-2xl active:scale-95 transition-all uppercase text-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-[4px] z-[300] flex items-center justify-center">
          <div className="bg-slate-900 text-white px-10 py-6 rounded-[32px] font-black shadow-2xl animate-bounce flex items-center gap-4 border-2 border-white/20">
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
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 3px solid white; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        thead.sticky { top: 0 !important; }
      `,
        }}
      />
    </div>
  );
}

export default App;
