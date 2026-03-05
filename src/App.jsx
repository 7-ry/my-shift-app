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

const ROW_HEIGHT = 40;

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

// 週ID（2026-W10）を「3月2日〜3月8日」形式に変換する関数
const getWeekRangeLabel = (weekId) => {
  if (!weekId) return '';
  const [year, week] = weekId.split('-W').map(Number);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
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
  const [availableWeeks, setAvailableWeeks] = useState([]); // コピー可能な週リスト
  const [selectedCopyWeek, setSelectedCopyWeek] = useState('');
  const menuRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    color: '#cbd5e1',
    target: 24,
  });

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 📦 データ取得 ---
  const fetchStaffs = useCallback(async () => {
    const q = query(collection(db, 'staffs'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (list.length === 0) {
      const initial = [
        { name: 'KANA', color: '#bae6fd', target: 39 },
        { name: 'RYUSHIN', color: '#bbf7d0', target: 38 },
        { name: 'SAYAKA', color: '#e9d5ff', target: 24 },
        { name: 'EITO', color: '#fecdd3', target: 24 },
        { name: 'KEITO', color: '#e2e8f0', target: 24 },
        { name: 'DAISUKE', color: '#bfdbfe', target: 24 },
        { name: 'AIRA', color: '#fed7aa', target: 24 },
      ];
      for (const s of initial) await addDoc(collection(db, 'staffs'), s);
      window.location.reload();
      return;
    }
    setStaffs(list);
    if (!selectedStaff && list.length > 0) setSelectedStaff(list[0].name);
  }, [selectedStaff]);

  // Firebaseからコピー可能な「過去の週」のリストを取得
  const fetchAvailableWeeks = async () => {
    const q = query(collection(db, 'shifts'));
    const snapshot = await getDocs(q);
    const weeks = new Set();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.weekId && data.weekId !== weekId) weeks.add(data.weekId);
    });
    // 新しい順に並び替え
    const sorted = Array.from(weeks).sort().reverse();
    setAvailableWeeks(sorted);
    if (sorted.length > 0) setSelectedCopyWeek(sorted[0]);
  };

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

  const updateShiftsSafely = useCallback((newItemsArray) => {
    setShifts((prev) => {
      const uniqueMap = new Map();
      prev.forEach((s) => uniqueMap.set(s.id, s));
      newItemsArray.forEach((s) => uniqueMap.set(s.id, s));
      return Array.from(uniqueMap.values());
    });
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || isProcessing) return;
    setIsProcessing(true);
    try {
      const docRef = await addDoc(collection(db, 'staffs'), newStaff);
      setStaffs(
        [...staffs, { id: docRef.id, ...newStaff }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewStaff({ name: '', color: '#cbd5e1', target: 24 });
    } catch (err) {
      console.error(err);
    }
    setIsProcessing(false);
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`${name} さんを削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, 'staffs', id));
      setStaffs(staffs.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
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
      updateShiftsSafely([{ id: docRef.id, ...newShift }]);
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

  const dashboardData = staffs.map((staff) => {
    const total = shifts
      .filter((s) => s.staffName === staff.name)
      .reduce((acc, s) => acc + s.totalHours, 0);
    return {
      ...staff,
      currentHours: Math.floor(total * 100) / 100,
      remaining: Math.floor((staff.target - total) * 100) / 100,
      progress: Math.min((total / staff.target) * 100, 100),
    };
  });

  const executeCopy = async () => {
    if (!selectedCopyWeek || isProcessing) return;
    const currentQ = query(
      collection(db, 'shifts'),
      where('weekId', '==', weekId)
    );
    const currentSnap = await getDocs(currentQ);
    if (
      !currentSnap.empty &&
      !window.confirm(
        '現在の週には既にデータが存在します。追加でコピーしますか？'
      )
    )
      return;

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
        const newRef = doc(collection(db, 'shifts'));
        batch.set(newRef, { ...data, weekId: weekId });
      });
      await batch.commit();
      window.location.reload(); // 確実に反映させるためリロード
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10 selection:bg-blue-200">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight">Shift Builder</h1>
            <span className="text-[10px] font-bold text-blue-600 uppercase">
              {getWeekRangeLabel(weekId)}
            </span>
          </div>
          <input
            type="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4 mr-2">
            {staffs.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStaff(s.name)}
                style={{ backgroundColor: s.color }}
                className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all ${
                  selectedStaff === s.name
                    ? 'ring-2 ring-slate-800 shadow-md scale-105'
                    : 'opacity-40 hover:opacity-100'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 transition-colors text-xl"
            >
              ⚙️
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                    if (window.confirm('この週の全シフトを削除しますか？')) {
                      setShowMenu(false);
                      const b = writeBatch(db);
                      shifts.forEach((s) => b.delete(doc(db, 'shifts', s.id)));
                      await b.commit();
                      setShifts([]);
                    }
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3"
                >
                  🗑️ 全データをクリア
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 mt-6">
        {/* Dashboard */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {dashboardData.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-slate-500 truncate mr-1">
                  {d.name}
                </span>
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                    d.remaining < 0
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  {d.remaining < 0 ? 'OVER' : 'OK'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-800">
                  {d.currentHours}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  / {d.target}h
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    d.remaining < 0 ? 'bg-red-500' : 'bg-slate-800'
                  }`}
                  style={{ width: `${d.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Wrapper for Sticky Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[1400px] select-none">
              <thead className="sticky top-0 z-40 shadow-sm">
                <tr className="bg-white">
                  <th className="w-16 border-b border-r-2 border-slate-200 sticky left-0 z-50 p-2 text-[10px] font-bold text-slate-400 bg-white uppercase">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      colSpan={4}
                      className="border-b border-r-2 border-slate-200 p-3 text-center text-xs font-black text-slate-600 tracking-widest uppercase bg-white"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50/50">
                  <th className="border-b border-r-2 border-slate-200 sticky left-0 z-50 h-6 bg-slate-50"></th>
                  {DAYS.map((day) =>
                    LANES.map((lane) => (
                      <th
                        key={`${day}-${lane}`}
                        className={`border-b border-slate-100 text-[8px] font-black text-slate-300 w-12 text-center bg-white ${
                          lane === 4
                            ? 'border-r-2 border-r-slate-200'
                            : 'border-r border-r-slate-50'
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
                  <tr key={time} className="h-10 group">
                    <td className="border-b border-r-2 border-slate-200 text-center text-[10px] font-black text-slate-400 bg-white sticky left-0 z-30 group-hover:bg-slate-50 transition-colors">
                      <span
                        className={
                          time.endsWith(':00')
                            ? 'text-slate-800'
                            : 'text-slate-300'
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
                                : 'border-slate-50 border-dashed'
                            } ${
                              lane === 4
                                ? 'border-r-2 border-r-slate-200'
                                : 'border-r border-r-slate-50'
                            } p-0 hover:bg-blue-50/30 cursor-crosshair relative`}
                            onClick={() => handleAddShift(day, time, lane)}
                          >
                            {cellShifts.map((shift) => (
                              <div
                                key={shift.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingShift(shift);
                                }}
                                onPointerDown={(e) =>
                                  handlePointerDown(e, shift, 'move')
                                }
                                className={`absolute inset-x-0.5 rounded-lg p-2 flex flex-col items-start overflow-hidden shadow-sm ring-1 ring-black/5 z-10 cursor-grab ${
                                  dragInfo?.id === shift.id
                                    ? 'z-50 opacity-90 scale-[1.02] shadow-xl rotate-1'
                                    : 'hover:ring-black/20 hover:shadow-md transition-shadow'
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
                                <span className="font-black text-[10px] text-slate-900 truncate w-full pointer-events-none leading-none">
                                  {shift.staffName}
                                </span>
                                <span className="text-[8px] font-bold text-slate-800/60 pointer-events-none mt-1">
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

      {/* --- Modals --- */}
      {showStaffModal && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowStaffModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-black">Staff Settings</h2>
              <button
                onClick={() => setShowStaffModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {staffs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl group transition-all hover:bg-slate-100"
                >
                  <div
                    className="w-10 h-10 rounded-full shadow-sm border-2 border-white"
                    style={{ backgroundColor: s.color }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-black text-sm">{s.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">
                      Target: {s.target}h
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteStaff(s.id, s.name)}
                    className="text-[10px] bg-rose-100 text-rose-600 px-3 py-1.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <form
              onSubmit={handleAddStaff}
              className="p-6 bg-white border-t space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="NAME"
                  className="px-4 py-3 rounded-2xl bg-slate-100 border-none font-bold text-sm w-full"
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
                  placeholder="HOURS"
                  className="px-4 py-3 rounded-2xl bg-slate-100 border-none font-bold text-sm w-full"
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
                  className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-none"
                  value={newStaff.color}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, color: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white rounded-2xl py-3 font-black text-sm active:scale-95 transition-all shadow-lg"
                >
                  ADD STAFF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Improved Copy Modal */}
      {showCopyModal && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-6">過去からコピー</h2>
            <p className="text-xs font-bold text-slate-500 mb-2">
              コピー元の週を選択してください
            </p>

            <select
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-4 font-bold mb-8 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              value={selectedCopyWeek}
              onChange={(e) => setSelectedCopyWeek(e.target.value)}
            >
              {availableWeeks.length > 0 ? (
                availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    {getWeekRangeLabel(w)}
                  </option>
                ))
              ) : (
                <option value="">データなし</option>
              )}
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
                disabled={!selectedCopyWeek || isProcessing}
                className="flex-[2] bg-indigo-600 text-white font-black py-3 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                コピーを実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal (維持) */}
      {editingShift && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setEditingShift(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-6 text-center">
              {editingShift.staffName}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateShift(e);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2">
                    START
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editingShift.startTime}
                    onChange={(e) =>
                      setEditingShift({
                        ...editingShift,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2">
                    END
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold"
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
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2">
                  BREAK HOURS
                </label>
                <select
                  className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold"
                  value={editingShift.breakHours}
                  onChange={(e) =>
                    setEditingShift({
                      ...editingShift,
                      breakHours: parseFloat(e.target.value),
                    })
                  }
                >
                  <option value="0">なし</option>
                  <option value="0.5">30分</option>
                  <option value="1">1時間</option>
                  <option value="1.5">1.5時間</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('このシフトを削除しますか？')) {
                      await deleteDoc(doc(db, 'shifts', editingShift.id));
                      setShifts(shifts.filter((s) => s.id !== editingShift.id));
                      setEditingShift(null);
                    }
                  }}
                  className="flex-1 bg-rose-50 text-rose-600 font-bold py-3 rounded-2xl"
                >
                  削除
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-slate-900 text-white font-black py-3 rounded-2xl shadow-lg"
                >
                  保存する
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
