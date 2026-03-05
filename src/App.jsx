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

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const LANES = [1, 2, 3, 4];
const TIMES = [];
for (let h = 9; h <= 23; h++) {
  TIMES.push(`${h.toString().padStart(2, '0')}:00`);
  if (h !== 23) TIMES.push(`${h.toString().padStart(2, '0')}:30`);
}

const ROW_HEIGHT = 36;

// --- 🌟 ヘルパー関数 ---
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

const getWeekDisplayVerbose = (weekId) => {
  if (!weekId) return '';
  const [year, week] = weekId.split('-W').map(Number);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  const end = new Date(ISOweekStart);
  end.setDate(ISOweekStart.getDate() + 6);
  return `${ISOweekStart.getMonth() + 1}月${ISOweekStart.getDate()}日〜${
    end.getMonth() + 1
  }月${end.getDate()}日`;
};

const getCurrentWeekId = () => {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

function App() {
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
  const menuRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    color: '#cbd5e1',
    target: 24,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 📦 データ取得 (staffs は order 順に取得) ---
  const fetchStaffs = useCallback(async () => {
    const q = query(collection(db, 'staffs'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 初期データ投入時に order を付与
    if (list.length === 0) {
      const initial = [
        { name: 'KANA', color: '#bae6fd', target: 39, order: 0 },
        { name: 'RYUSHIN', color: '#bbf7d0', target: 38, order: 1 },
        { name: 'SAYAKA', color: '#e9d5ff', target: 24, order: 2 },
        { name: 'EITO', color: '#fecdd3', target: 24, order: 3 },
        { name: 'KEITO', color: '#e2e8f0', target: 24, order: 4 },
        { name: 'DAISUKE', color: '#bfdbfe', target: 24, order: 5 },
        { name: 'AIRA', color: '#fed7aa', target: 24, order: 6 },
      ];
      for (const s of initial) await addDoc(collection(db, 'staffs'), s);
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

  // --- 👥 スタッフ管理ロジック (並べ替え) ---

  const handleMoveStaff = async (index, direction) => {
    if (isProcessing) return;
    const newStaffs = [...staffs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStaffs.length) return;

    setIsProcessing(true);
    // 配列内をスワップ
    [newStaffs[index], newStaffs[targetIndex]] = [
      newStaffs[targetIndex],
      newStaffs[index],
    ];

    // Firestoreを一括更新 (Batch)
    const batch = writeBatch(db);
    newStaffs.forEach((s, i) => {
      const ref = doc(db, 'staffs', s.id);
      batch.update(ref, { order: i });
      s.order = i; // ローカル状態も更新
    });

    try {
      await batch.commit();
      setStaffs(newStaffs);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    if (!editingShift || isProcessing) return;
    setIsProcessing(true);
    try {
      const total = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours
      );
      const { id, ...dataToSave } = editingShift;
      await updateDoc(doc(db, 'shifts', id), {
        ...dataToSave,
        totalHours: total,
      });
      setShifts((prev) =>
        prev.map((s) =>
          s.id === id ? { ...editingShift, totalHours: total } : s
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
    if (!window.confirm('このシフトを削除しますか？')) return;
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

  const handleAddShift = async (day, time, lane) => {
    if (isProcessing || !selectedStaff) return;
    setIsProcessing(true);
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
    const endStr = minsToTime(
      Math.min(timeToMins(time) + 120, timeToMins('23:30'))
    );
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

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragInfo) return;
      const deltaY = e.clientY - dragInfo.startY;
      const deltaMins = Math.round(((deltaY / ROW_HEIGHT) * 30) / 5) * 5;
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetTd = elements.find(
        (el) => el.tagName === 'TD' && el.dataset.day
      );

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
          } else if (dragInfo.type === 'resize-top') nS += deltaMins;
          else if (dragInfo.type === 'resize-bottom') nE += deltaMins;
          const sStr = minsToTime(Math.max(timeToMins('09:00'), nS));
          const eStr = minsToTime(Math.min(timeToMins('24:00'), nE));
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
    [dragInfo]
  );

  const handlePointerUp = useCallback(
    async (e) => {
      if (!dragInfo) return;
      e.target.releasePointerCapture(e.pointerId);
      const updated = shifts.find((s) => s.id === dragInfo.id);
      if (updated)
        await updateDoc(doc(db, 'shifts', updated.id), {
          startTime: updated.startTime,
          endTime: updated.endTime,
          day: updated.day,
          lane: updated.lane,
          totalHours: updated.totalHours,
        });
      setDragInfo(null);
    },
    [dragInfo, shifts]
  );

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

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
      snap.forEach((d) => {
        const data = d.data();
        batch.set(doc(collection(db, 'shifts')), { ...data, weekId: weekId });
      });
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
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6 min-w-fit">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-800 leading-tight">
              Shift Builder
            </h1>
            <span className="text-[10px] font-bold text-blue-600 uppercase whitespace-nowrap">
              {getWeekDisplayVerbose(weekId)}
            </span>
          </div>
          <input
            type="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-bold cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div className="md:hidden flex-1 max-w-[140px]">
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {staffs.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

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
                {s.name}
              </button>
            ))}
          </div>

          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 text-lg md:text-xl transition-colors"
            >
              ⚙️
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    fetchAvailableWeeks();
                    setShowCopyModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
                >
                  📋 過去からコピー
                </button>
                <button
                  onClick={() => {
                    setShowStaffModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
                >
                  👥 スタッフ管理
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={async () => {
                    if (window.confirm('この週のデータを全削除しますか？')) {
                      setShowMenu(false);
                      const b = writeBatch(db);
                      shifts.forEach((s) => b.delete(doc(db, 'shifts', s.id)));
                      await b.commit();
                      setShifts([]);
                    }
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3"
                >
                  🗑️ クリア
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- ✨ ダッシュボード (スタッフ管理の並び順で表示) --- */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {dashboardData.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600">
                  {d.name}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    d.remaining < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {d.remaining < 0 ? 'OVER' : 'OK'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {d.currentHours}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {d.target}h
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    d.remaining < 0 ? 'bg-red-500' : 'bg-slate-800'
                  }`}
                  style={{ width: `${d.progressPercent}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[1400px] select-none">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50">
                  <th className="w-16 border-b border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-40 p-2 text-xs font-semibold text-slate-500">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      colSpan={4}
                      className="border-b border-r-2 border-slate-400 bg-slate-50 p-3 text-center font-bold text-slate-700 tracking-widest"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50">
                  <th className="border-b border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-40 h-6"></th>
                  {DAYS.map((day) =>
                    LANES.map((lane) => (
                      <th
                        key={`${day}-${lane}`}
                        className={`border-b border-slate-100 bg-slate-50/50 text-[9px] font-semibold text-slate-400 w-12 text-center ${
                          lane === 4
                            ? 'border-r-2 border-r-slate-400'
                            : 'border-r border-r-slate-100'
                        }`}
                      >
                        L{lane}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time) => (
                  <tr key={time} className="h-9 group">
                    <td className="border-b border-r-2 border-slate-300 text-center text-[11px] font-medium text-slate-500 bg-white sticky left-0 z-20 group-hover:bg-slate-50 transition-colors">
                      <span
                        className={
                          time.endsWith(':00')
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }
                      >
                        {time.endsWith(':00') ? time : time.split(':')[1]}
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
                            className={`border-b ${
                              time.endsWith(':30')
                                ? 'border-slate-200'
                                : 'border-slate-100 border-dashed'
                            } ${
                              lane === 4
                                ? 'border-r-2 border-r-slate-400'
                                : 'border-r border-r-slate-100'
                            } p-0 hover:bg-blue-50/50 cursor-crosshair relative`}
                            onClick={() => handleAddShift(day, time, lane)}
                          >
                            {cellShifts.map((shift) => (
                              <div
                                key={shift.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingShift(shift);
                                }}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  setDragInfo({
                                    id: shift.id,
                                    type: 'move',
                                    startY: e.clientY,
                                    initStartMins: timeToMins(shift.startTime),
                                    initEndMins: timeToMins(shift.endTime),
                                    initDay: shift.day,
                                    initLane: shift.lane,
                                  });
                                  e.target.setPointerCapture(e.pointerId);
                                }}
                                className={`absolute inset-x-0.5 rounded-md p-1.5 flex flex-col items-start overflow-hidden shadow-sm ring-1 ring-black/5 z-10 cursor-grab ${
                                  dragInfo?.id === shift.id
                                    ? 'z-50 opacity-90 scale-[1.02] shadow-xl'
                                    : ''
                                }`}
                                style={{
                                  top: `${
                                    ((timeToMins(shift.startTime) -
                                      timeToMins(time)) /
                                      30) *
                                      ROW_HEIGHT +
                                    1
                                  }px`,
                                  height: `${
                                    ((timeToMins(shift.endTime) -
                                      timeToMins(shift.startTime)) /
                                      30) *
                                      ROW_HEIGHT -
                                    2
                                  }px`,
                                  backgroundColor: shift.color,
                                  touchAction: 'none',
                                }}
                              >
                                <span className="font-bold text-[10px] text-slate-800 truncate w-full pointer-events-none leading-none">
                                  {shift.staffName}
                                </span>
                                <span className="text-[9px] text-slate-700/80 pointer-events-none mt-1">
                                  {shift.startTime}-{shift.endTime}
                                </span>
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

      {/* --- モーダル (並べ替えボタン追加) --- */}
      {showStaffModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowStaffModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">スタッフ設定</h2>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {staffs.map((s, index) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl group transition-colors hover:bg-slate-100"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveStaff(index, -1)}
                      disabled={index === 0}
                      className="text-xs text-slate-400 hover:text-slate-800 disabled:opacity-0 transition-colors"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveStaff(index, 1)}
                      disabled={index === staffs.length - 1}
                      className="text-xs text-slate-400 hover:text-slate-800 disabled:opacity-0 transition-colors"
                    >
                      ▼
                    </button>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full shadow-inner border-2 border-white"
                    style={{ backgroundColor: s.color }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 tracking-tight">
                      目標: {s.target}h
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm(`${s.name}さんを削除しますか？`)) {
                        await deleteDoc(doc(db, 'staffs', s.id));
                        setStaffs(staffs.filter((staff) => staff.id !== s.id));
                      }
                    }}
                    className="text-xs text-rose-500 opacity-0 group-hover:opacity-100 font-bold px-3 py-1 bg-rose-50 rounded-full"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
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
              }}
              className="p-6 border-t bg-slate-50 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="名前"
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none"
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
                  placeholder="目標時間"
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newStaff.target}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, target: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-10 rounded cursor-pointer border-none bg-transparent"
                  value={newStaff.color}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, color: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white rounded-xl py-2 font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                  スタッフを追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy & Edit Modals (ロジック維持) */}
      {showCopyModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6 text-center">
              過去からコピー
            </h2>
            <select
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-4 font-bold mb-8 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              value={selectedCopyWeek}
              onChange={(e) => setSelectedCopyWeek(e.target.value)}
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {getWeekDisplayVerbose(w)}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-3 font-bold text-slate-500"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  await executeCopy();
                  setShowCopyModal(false);
                }}
                className="flex-[2] bg-indigo-600 text-white font-black py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                コピーを実行
              </button>
            </div>
          </div>
        </div>
      )}

      {editingShift && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setEditingShift(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-6 text-center text-slate-800">
              {editingShift.staffName}
            </h2>
            <form onSubmit={handleUpdateShift} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold"
                  value={editingShift.startTime}
                  onChange={(e) =>
                    setEditingShift({
                      ...editingShift,
                      startTime: e.target.value,
                    })
                  }
                />
                <input
                  type="time"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold"
                  value={editingShift.endTime}
                  onChange={(e) =>
                    setEditingShift({
                      ...editingShift,
                      endTime: e.target.value,
                    })
                  }
                />
              </div>
              <select
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 font-bold appearance-none"
                value={editingShift.breakHours}
                onChange={(e) =>
                  setEditingShift({
                    ...editingShift,
                    breakHours: parseFloat(e.target.value),
                  })
                }
              >
                <option value="0">休憩なし</option>
                <option value="0.5">30分</option>
                <option value="1">1時間</option>
                <option value="1.5">1.5時間</option>
              </select>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleDeleteShift}
                  className="flex-1 bg-rose-50 text-rose-600 font-bold py-3 rounded-xl transition-colors hover:bg-rose-100"
                >
                  削除
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
