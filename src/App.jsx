import React, { useState, useEffect, useCallback } from 'react';
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

  const startMonth = ISOweekStart.getMonth() + 1;
  const startDate = ISOweekStart.getDate();
  const endMonth = end.getMonth() + 1;
  const endDate = end.getDate();

  return `${startMonth}月 第${Math.ceil(
    startDate / 7
  )}週 (${startMonth}/${startDate} - ${endMonth}/${endDate})`;
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
  const [staffs, setStaffs] = useState([]); // 動的スタッフリスト
  const [selectedStaff, setSelectedStaff] = useState('');
  const [shifts, setShifts] = useState([]);
  const [editingShift, setEditingShift] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);

  const [weekId, setWeekId] = useState(() => {
    const savedWeek = localStorage.getItem('lastViewedWeek');
    return savedWeek ? savedWeek : getCurrentWeekId();
  });

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false); // スタッフ管理モーダル
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedCopyWeek, setSelectedCopyWeek] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 新規スタッフ入力用
  const [newStaff, setNewStaff] = useState({
    name: '',
    color: '#cbd5e1',
    target: 24,
  });

  // --- 📦 データ取得 (スタッフ & シフト) ---

  // スタッフリスト取得
  const fetchStaffs = useCallback(async () => {
    const q = query(collection(db, 'staffs'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 初回起動時（データが空の場合）の初期設定
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
      for (const s of initial) {
        await addDoc(collection(db, 'staffs'), s);
      }
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
      const loadedShifts = [];
      querySnapshot.forEach((doc) => {
        loadedShifts.push({ id: doc.id, ...doc.data() });
      });
      setShifts(loadedShifts);
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

  // --- 👥 スタッフ管理ロジック ---

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
    if (
      !window.confirm(
        `${name} さんを削除しますか？\n（※既存のシフトデータは残りますが、管理から外れます）`
      )
    )
      return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'staffs', id));
      setStaffs(staffs.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
    setIsProcessing(false);
  };

  // --- 📅 シフト管理ロジック ---

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
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const handleAddShift = async (day, time, lane) => {
    if (isProcessing) return;
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
    if (!staffInfo) return;

    const startMins = timeToMins(time);
    const endMins = Math.min(startMins + 120, timeToMins('23:30'));
    const startStr = minsToTime(startMins);
    const endStr = minsToTime(endMins);

    const newShift = {
      staffName: selectedStaff,
      day: day,
      startTime: startStr,
      endTime: endStr,
      lane: lane,
      breakHours: 0,
      totalHours: calcTotalHours(startStr, endStr, 0),
      color: staffInfo.color,
      weekId: weekId,
    };

    setIsProcessing(true);
    try {
      const docRef = await addDoc(collection(db, 'shifts'), newShift);
      updateShiftsSafely([{ id: docRef.id, ...newShift }]);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handlePointerDown = (e, shift, type) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setDragInfo({
      id: shift.id,
      type: type,
      startY: e.clientY,
      initStartMins: timeToMins(shift.startTime),
      initEndMins: timeToMins(shift.endTime),
      initDay: shift.day,
      initLane: shift.lane,
    });
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

      setShifts((prevShifts) =>
        prevShifts.map((s) => {
          if (s.id !== dragInfo.id) return s;
          let newStartMins = dragInfo.initStartMins,
            newEndMins = dragInfo.initEndMins,
            newDay = s.day,
            newLane = s.lane;
          if (dragInfo.type === 'move') {
            newStartMins += deltaMins;
            newEndMins += deltaMins;
            if (targetTd) {
              newDay = targetTd.dataset.day;
              newLane = Number(targetTd.dataset.lane);
            }
          } else if (dragInfo.type === 'resize-top') newStartMins += deltaMins;
          else if (dragInfo.type === 'resize-bottom') newEndMins += deltaMins;

          const limitStart = timeToMins('09:00'),
            limitEnd = timeToMins('24:00');
          if (newStartMins < limitStart) newStartMins = limitStart;
          if (newEndMins > limitEnd) newEndMins = limitEnd;
          const startStr = minsToTime(newStartMins),
            endStr = minsToTime(newEndMins);

          return {
            ...s,
            startTime: startStr,
            endTime: endStr,
            totalHours: calcTotalHours(startStr, endStr, s.breakHours),
            day: newDay,
            lane: newLane,
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
      const updatedShift = shifts.find((s) => s.id === dragInfo.id);
      if (updatedShift) {
        try {
          await updateDoc(doc(db, 'shifts', updatedShift.id), {
            startTime: updatedShift.startTime,
            endTime: updatedShift.endTime,
            day: updatedShift.day,
            lane: updatedShift.lane,
            totalHours: updatedShift.totalHours,
          });
        } catch (error) {
          console.error(error);
          if (error.code === 'not-found') window.location.reload();
        }
      }
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

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const finalTotalHours = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours
      );
      const shiftToSave = { ...editingShift, totalHours: finalTotalHours };
      await updateDoc(doc(db, 'shifts', editingShift.id), shiftToSave);
      setShifts(
        shifts.map((s) => (s.id === editingShift.id ? shiftToSave : s))
      );
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const dashboardData = staffs.map((staff) => {
    const staffShifts = shifts.filter((s) => s.staffName === staff.name);
    const totalHours =
      Math.floor(staffShifts.reduce((acc, s) => acc + s.totalHours, 0) * 100) /
      100;
    return {
      ...staff,
      currentHours: totalHours,
      remaining: Math.floor((staff.target - totalHours) * 100) / 100,
      progressPercent: Math.min((totalHours / staff.target) * 100, 100),
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-blue-200">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
              Shift Builder
            </h1>
            <span className="text-sm font-bold text-blue-600">
              {getWeekDisplayVerbose(weekId)}
            </span>
          </div>
          <input
            type="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="text-xs bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-full hover:bg-indigo-100 transition border border-indigo-100"
          >
            📋 コピー
          </button>
          <button
            onClick={() => setShowStaffModal(true)}
            className="text-xs bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-full hover:bg-slate-200 transition border border-slate-200"
          >
            ⚙️ スタッフ管理
          </button>
          <button
            onClick={async () => {
              if (window.confirm('全削除しますか？')) {
                const b = writeBatch(db);
                shifts.forEach((s) => b.delete(doc(db, 'shifts', s.id)));
                await b.commit();
                setShifts([]);
              }
            }}
            className="text-xs bg-rose-50 text-rose-700 font-bold px-4 py-2 rounded-full hover:bg-rose-100 transition border border-rose-100"
          >
            🗑️ クリア
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 xl:justify-end">
          {staffs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStaff(s.name)}
              style={{ backgroundColor: s.color }}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                selectedStaff === s.name
                  ? 'ring-2 ring-slate-800 shadow-md scale-105'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </header>

      {/* --- Dashboard & Table (省略せず維持) --- */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {dashboardData.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
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
              <thead>
                <tr>
                  <th className="w-16 border-b border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-30 p-2 text-xs font-semibold text-slate-500">
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
                <tr>
                  <th className="border-b border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-30 h-6"></th>
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
                    <td className="border-b border-r-2 border-slate-300 text-center text-[11px] font-medium text-slate-500 bg-white sticky left-0 z-20 group-hover:bg-slate-50">
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
                        const cellShifts = shifts.filter((s) => {
                          if (s.day !== day || s.lane !== lane) return false;
                          const sM = timeToMins(s.startTime);
                          const cM = timeToMins(time);
                          return sM >= cM && sM < cM + 30;
                        });
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
                            {cellShifts.map((shift) => {
                              const isDraggingThis = dragInfo?.id === shift.id;
                              const hPx =
                                ((timeToMins(shift.endTime) -
                                  timeToMins(shift.startTime)) /
                                  30) *
                                ROW_HEIGHT;
                              return (
                                <div
                                  key={shift.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingShift(shift);
                                  }}
                                  onPointerDown={(e) =>
                                    handlePointerDown(e, shift, 'move')
                                  }
                                  className={`absolute inset-x-0.5 rounded-md p-1.5 flex flex-col items-start overflow-hidden shadow-sm ring-1 ring-black/5 z-10 cursor-grab ${
                                    isDraggingThis
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
                                    height: `${hPx - 2}px`,
                                    backgroundColor: shift.color,
                                    touchAction: 'none',
                                  }}
                                >
                                  <div
                                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20"
                                    onPointerDown={(e) =>
                                      handlePointerDown(e, shift, 'resize-top')
                                    }
                                  />
                                  <span className="font-bold text-[10px] text-slate-800 truncate w-full">
                                    {shift.staffName}
                                  </span>
                                  <span className="text-[9px] text-slate-700/80 whitespace-nowrap">
                                    {shift.startTime}-{shift.endTime}
                                  </span>
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-20"
                                    onPointerDown={(e) =>
                                      handlePointerDown(
                                        e,
                                        shift,
                                        'resize-bottom'
                                      )
                                    }
                                  />
                                </div>
                              );
                            })}
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

      {/* --- ⚙️ スタッフ管理モーダル --- */}
      {showStaffModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowStaffModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">スタッフ設定</h2>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {staffs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl group"
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-inner"
                    style={{ backgroundColor: s.color }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-[10px] text-slate-400">
                      目標: {s.target}h
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteStaff(s.id, s.name)}
                    className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all font-bold"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddStaff}
              className="p-6 bg-slate-50 border-t border-slate-100 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="名前"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
                  value={newStaff.target}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, target: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500">
                  ラベル色:
                </label>
                <input
                  type="color"
                  className="w-10 h-8 rounded cursor-pointer"
                  value={newStaff.color}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, color: e.target.value })
                  }
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  スタッフを追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- コピーモーダル & 編集モーダル (以前と同じ) --- */}
      {showCopyModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">過去からコピー</h2>
            <select
              className="w-full border p-2 rounded-lg mb-4"
              onChange={(e) => setSelectedCopyWeek(e.target.value)}
            >
              <option value="">週を選択...</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-slate-600"
              >
                キャンセル
              </button>
              <button
                onClick={executeCopy}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}

      {editingShift && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingShift(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleUpdateShift} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="time"
                    className="w-full border rounded-lg px-3 py-2"
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
                    className="w-full border rounded-lg px-3 py-2"
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
                  className="w-full border rounded-lg px-3 py-2"
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
                </select>
              </div>
              <div className="flex justify-between items-center mt-8">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('削除しますか？')) {
                      await deleteDoc(doc(db, 'shifts', editingShift.id));
                      setShifts(shifts.filter((s) => s.id !== editingShift.id));
                      setEditingShift(null);
                    }
                  }}
                  className="text-red-500 font-bold"
                >
                  削除
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold"
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
