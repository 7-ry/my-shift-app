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
} from 'firebase/firestore';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const LANES = [1, 2, 3, 4];
const TIMES = [];
for (let h = 9; h <= 23; h++) {
  TIMES.push(`${h.toString().padStart(2, '0')}:00`);
  if (h !== 23) TIMES.push(`${h.toString().padStart(2, '0')}:30`);
}

const ROW_HEIGHT = 36;

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

  const firstDayOfMonth = new Date(year, ISOweekStart.getMonth(), 1);
  const offset =
    firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const weekOfMonth = Math.ceil((startDate + offset) / 7);

  return `${startMonth}月 第${weekOfMonth}週 (${startMonth}/${startDate} - ${endMonth}/${endDate})`;
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
  const [selectedStaff, setSelectedStaff] = useState('KANA');
  const [shifts, setShifts] = useState([]);
  const [editingShift, setEditingShift] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);

  // ★ ページロード時に LocalStorage から前回の週を取得。なければ現在の週を設定
  const [weekId, setWeekId] = useState(() => {
    const savedWeek = localStorage.getItem('lastViewedWeek');
    return savedWeek ? savedWeek : getCurrentWeekId();
  });

  // ★ weekId が変わるたびに LocalStorage に保存する
  useEffect(() => {
    localStorage.setItem('lastViewedWeek', weekId);
  }, [weekId]);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedCopyWeek, setSelectedCopyWeek] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  const staffs = [
    { name: 'KANA', color: '#bae6fd', target: 39 },
    { name: 'RYUSHIN', color: '#bbf7d0', target: 38 },
    { name: 'SAYAKA', color: '#e9d5ff', target: 24 },
    { name: 'EITO', color: '#fecdd3', target: 24 },
    { name: 'KEITO', color: '#e2e8f0', target: 24 },
    { name: 'DAISUKE', color: '#bfdbfe', target: 24 },
    { name: 'AIRA', color: '#fed7aa', target: 24 },
  ];

  const updateShiftsSafely = useCallback((newItemsArray) => {
    setShifts((prev) => {
      const uniqueMap = new Map();
      prev.forEach((s) => uniqueMap.set(s.id, s));
      newItemsArray.forEach((s) => uniqueMap.set(s.id, s));
      return Array.from(uniqueMap.values());
    });
  }, []);

  useEffect(() => {
    const fetchShifts = async () => {
      const q = query(collection(db, 'shifts'), where('weekId', '==', weekId));
      const querySnapshot = await getDocs(q);
      const loadedShifts = [];
      querySnapshot.forEach((doc) => {
        loadedShifts.push({ id: doc.id, ...doc.data() });
      });
      const uniqueMap = new Map();
      loadedShifts.forEach((s) => uniqueMap.set(s.id, s));
      setShifts(Array.from(uniqueMap.values()));
    };
    fetchShifts();
  }, [weekId]);

  const fetchAvailableWeeks = async () => {
    try {
      const q = query(collection(db, 'shifts'));
      const querySnapshot = await getDocs(q);
      const uniqueWeeks = new Set();
      querySnapshot.forEach((doc) => {
        if (doc.data().weekId) uniqueWeeks.add(doc.data().weekId);
      });
      const weekArray = Array.from(uniqueWeeks)
        .filter((w) => w !== weekId)
        .sort()
        .reverse();
      setAvailableWeeks(weekArray);
      if (weekArray.length > 0) setSelectedCopyWeek(weekArray[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const openCopyModal = () => {
    fetchAvailableWeeks();
    setShowCopyModal(true);
  };

  const executeCopy = async () => {
    if (!selectedCopyWeek || isProcessing) return;

    const currentQ = query(
      collection(db, 'shifts'),
      where('weekId', '==', weekId)
    );
    const currentSnap = await getDocs(currentQ);
    if (!currentSnap.empty) {
      if (
        !window.confirm(
          '現在の週には既にデータが存在します。追加でコピーするとデータが重複する可能性があります。続行しますか？'
        )
      ) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      const q = query(
        collection(db, 'shifts'),
        where('weekId', '==', selectedCopyWeek)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('選択した週にデータがありません。');
        setIsProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      snap.forEach((d) => {
        const data = d.data();
        const newRef = doc(collection(db, 'shifts'));

        const calculatedTotal =
          data.totalHours !== undefined
            ? data.totalHours
            : calcTotalHours(data.startTime, data.endTime, data.breakHours);

        const newShiftData = {
          ...data,
          weekId: weekId,
          totalHours: calculatedTotal,
        };
        batch.set(newRef, newShiftData);
      });

      await batch.commit();

      const fetchQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', weekId)
      );
      const fetchSnap = await getDocs(fetchQ);
      const loadedShifts = [];
      fetchSnap.forEach((document) => {
        loadedShifts.push({ id: document.id, ...document.data() });
      });
      setShifts(loadedShifts);

      setShowCopyModal(false);
      alert('コピーが完了しました！');
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToSheets = () => {
    alert(
      'シフトデータは既にFirebaseに自動保存されています。\nスプレッドシート側で同期ボタンを押してください。'
    );
  };

  const handleClearAll = async () => {
    if (isProcessing) return;
    if (
      !window.confirm(
        'この週の全てのシフトを削除しますか？\n（※この操作は元に戻せません）'
      )
    )
      return;

    setIsProcessing(true);
    try {
      const deletePromises = shifts.map((shift) =>
        deleteDoc(doc(db, 'shifts', shift.id))
      );
      await Promise.all(deletePromises);
      setShifts([]);
      alert('Firebaseから全てのシフトデータを完全に削除しました！');
    } catch (error) {
      console.error('削除中にエラー:', error);
      alert('一部または全ての削除に失敗しました: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddShift = async (day, time, lane) => {
    if (isProcessing) return;
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
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
    } finally {
      setIsProcessing(false);
    }
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

          let newStartMins = dragInfo.initStartMins;
          let newEndMins = dragInfo.initEndMins;
          let newDay = s.day;
          let newLane = s.lane;

          if (dragInfo.type === 'move') {
            newStartMins += deltaMins;
            newEndMins += deltaMins;
            if (targetTd) {
              newDay = targetTd.dataset.day;
              newLane = Number(targetTd.dataset.lane);
            }
          } else if (dragInfo.type === 'resize-top') {
            newStartMins += deltaMins;
          } else if (dragInfo.type === 'resize-bottom') {
            newEndMins += deltaMins;
          }

          const minDuration = 15;
          const limitStart = timeToMins('09:00');
          const limitEnd = timeToMins('24:00');

          if (newStartMins < limitStart) {
            newStartMins = limitStart;
            if (dragInfo.type === 'move')
              newEndMins =
                dragInfo.initEndMins - dragInfo.initStartMins + newStartMins;
          }
          if (newEndMins > limitEnd) {
            newEndMins = limitEnd;
            if (dragInfo.type === 'move')
              newStartMins =
                newEndMins - (dragInfo.initEndMins - dragInfo.initStartMins);
          }
          if (newEndMins - newStartMins < minDuration) {
            if (dragInfo.type === 'resize-top')
              newStartMins = newEndMins - minDuration;
            if (dragInfo.type === 'resize-bottom')
              newEndMins = newStartMins + minDuration;
          }

          const startStr = minsToTime(newStartMins);
          const endStr = minsToTime(newEndMins);

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
          const shiftRef = doc(db, 'shifts', updatedShift.id);
          await updateDoc(shiftRef, {
            startTime: updatedShift.startTime,
            endTime: updatedShift.endTime,
            day: updatedShift.day,
            lane: updatedShift.lane,
            totalHours: updatedShift.totalHours,
          });
        } catch (error) {
          console.error(error);
          if (error.code === 'not-found') {
            alert(
              'エラー：このシフトは既に削除されているか存在しません。\n自動的に画面を更新します。'
            );
            window.location.reload();
          }
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
      const shiftRef = doc(db, 'shifts', editingShift.id);
      const finalTotalHours = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours
      );
      const shiftToSave = { ...editingShift, totalHours: finalTotalHours };

      await updateDoc(shiftRef, shiftToSave);
      setShifts(
        shifts.map((s) => (s.id === editingShift.id ? shiftToSave : s))
      );
      setEditingShift(null);
    } catch (error) {
      console.error(error);
      if (error.code === 'not-found') {
        alert(
          'エラー：このシフトは既に存在しません。\n自動的に画面を更新します。'
        );
        window.location.reload();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteShift = async () => {
    if (window.confirm('このシフトを削除しますか？')) {
      setIsProcessing(true);
      try {
        await deleteDoc(doc(db, 'shifts', editingShift.id));
        setShifts(shifts.filter((s) => s.id !== editingShift.id));
        setEditingShift(null);
      } catch (error) {
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const dashboardData = staffs.map((staff) => {
    const staffShifts = shifts.filter((s) => s.staffName === staff.name);

    let totalHours = staffShifts.reduce((acc, s) => {
      return acc + calcTotalHours(s.startTime, s.endTime, s.breakHours);
    }, 0);

    totalHours = Math.floor(totalHours * 100) / 100;
    const remaining = Math.floor((staff.target - totalHours) * 100) / 100;

    return {
      ...staff,
      currentHours: totalHours,
      remaining: remaining,
      progressPercent: Math.min((totalHours / staff.target) * 100, 100),
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-blue-200">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 leading-tight">
              Shift Builder
            </h1>
            <span className="text-sm font-bold text-blue-600">
              {getWeekDisplayVerbose(weekId)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center gap-2">
            <input
              type="week"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCopyModal}
            disabled={isProcessing}
            className={`text-xs bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm border border-indigo-100 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            📋 過去からコピー
          </button>
          <button
            onClick={handleClearAll}
            disabled={isProcessing}
            className={`text-xs bg-rose-50 text-rose-700 font-bold px-4 py-2 rounded-full hover:bg-rose-100 transition shadow-sm border border-rose-100 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            🗑️ クリア
          </button>
          <button
            onClick={handleSyncToSheets}
            className="text-xs bg-slate-900 text-white font-bold px-5 py-2 rounded-full shadow-md hover:bg-slate-800 hover:scale-105 transition-all ml-2"
          >
            🚀 Sheets
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 xl:justify-end">
          <div className="flex flex-wrap gap-2">
            {staffs.map((s) => (
              <button
                key={s.name}
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
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {dashboardData.map((d) => (
            <div
              key={d.name}
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
                  <th className="w-16 border-b border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-30 p-2 text-xs font-semibold text-slate-500 uppercase">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      colSpan={4}
                      className="border-b border-r-2 border-slate-400 bg-slate-50 p-3 text-center font-bold text-slate-700 tracking-widest last:border-r-0"
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
                        } last:border-r-0`}
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
                          const startMins = timeToMins(s.startTime);
                          const cellStartMins = timeToMins(time);
                          return (
                            startMins >= cellStartMins &&
                            startMins < cellStartMins + 30
                          );
                        });

                        const borderBottomClass = time.endsWith(':30')
                          ? 'border-slate-200'
                          : 'border-slate-100 border-dashed';
                        const dayBorderClass =
                          lane === 4
                            ? 'border-r-2 border-r-slate-400'
                            : 'border-r border-r-slate-100';

                        return (
                          <td
                            key={`${day}-${time}-${lane}`}
                            data-day={day}
                            data-lane={lane}
                            className={`border-b ${borderBottomClass} ${dayBorderClass} p-0 hover:bg-blue-50/50 cursor-crosshair relative last:border-r-0 transition-colors`}
                            onClick={() => handleAddShift(day, time, lane)}
                          >
                            {cellShifts.map((shift) => {
                              const startMins = timeToMins(shift.startTime);
                              const endMins = timeToMins(shift.endTime);
                              const cellStartMins = timeToMins(time);
                              const topOffsetPx =
                                ((startMins - cellStartMins) / 30) * ROW_HEIGHT;
                              const heightPx =
                                ((endMins - startMins) / 30) * ROW_HEIGHT;
                              const isDraggingThis = dragInfo?.id === shift.id;

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
                                  className={`absolute inset-x-0.5 rounded-md p-1.5 flex flex-col items-start overflow-hidden shadow-sm ring-1 ring-black/5 hover:ring-black/20 hover:shadow-md transition-shadow cursor-grab group/block ${
                                    isDraggingThis
                                      ? 'z-50 opacity-90 scale-[1.02] shadow-xl cursor-grabbing pointer-events-none'
                                      : 'z-10'
                                  }`}
                                  style={{
                                    top: `${topOffsetPx + 1}px`,
                                    height: `${heightPx - 2}px`,
                                    backgroundColor: shift.color,
                                    touchAction: 'none',
                                  }}
                                >
                                  <div
                                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-20 pointer-events-auto"
                                    onPointerDown={(e) =>
                                      handlePointerDown(e, shift, 'resize-top')
                                    }
                                  />
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10"></div>
                                  <span className="font-bold text-[10px] text-slate-800 leading-tight pl-1.5 truncate w-full pointer-events-none">
                                    {shift.staffName}
                                  </span>
                                  <span className="text-[9px] text-slate-700/80 font-medium pl-1.5 mt-0.5 whitespace-nowrap pointer-events-none">
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                  {shift.breakHours > 0 && (
                                    <span className="text-[8px] bg-white/40 px-1 rounded font-semibold text-slate-600 mt-1 ml-1.5 inline-block pointer-events-none">
                                      休 {shift.breakHours}h
                                    </span>
                                  )}
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/10 z-20 flex justify-center items-center pointer-events-auto"
                                    onPointerDown={(e) =>
                                      handlePointerDown(
                                        e,
                                        shift,
                                        'resize-bottom'
                                      )
                                    }
                                  >
                                    <div className="w-4 h-0.5 bg-black/20 rounded-full"></div>
                                  </div>
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

      {showCopyModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">過去のシフトをコピー</h2>
            {availableWeeks.length === 0 ? (
              <p className="text-sm text-slate-500">
                コピー可能な過去のデータがありません。
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  コピー元の週を選択してください：
                </p>
                <select
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  value={selectedCopyWeek}
                  onChange={(e) => setSelectedCopyWeek(e.target.value)}
                >
                  {availableWeeks.map((w) => (
                    <option key={w} value={w}>
                      {getWeekDisplayVerbose(w)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-rose-500 font-semibold bg-rose-50 p-2 rounded">
                  ※現在の週 ({getWeekDisplayVerbose(weekId)})
                  にデータが追加されます。
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition"
              >
                キャンセル
              </button>
              {availableWeeks.length > 0 && (
                <button
                  onClick={executeCopy}
                  disabled={isProcessing}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition ${
                    isProcessing ? 'opacity-50' : ''
                  }`}
                >
                  コピー実行
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingShift && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity"
          onClick={() => setEditingShift(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: editingShift.color }}
                ></div>
                {editingShift.staffName} のシフト調整
              </h2>
            </div>
            <form onSubmit={handleUpdateShift} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Start
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 transition-shadow"
                      value={editingShift.startTime}
                      onChange={(e) =>
                        setEditingShift({
                          ...editingShift,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      End
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 transition-shadow"
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Break
                  </label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 transition-shadow"
                    value={editingShift.breakHours}
                    onChange={(e) =>
                      setEditingShift({
                        ...editingShift,
                        breakHours: parseFloat(e.target.value),
                      })
                    }
                  >
                    <option value="0">なし</option>
                    <option value="0.5">30分 (0.5h)</option>
                    <option value="1">1時間 (1.0h)</option>
                    <option value="1.5">1時間30分 (1.5h)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-8">
                <button
                  type="button"
                  onClick={handleDeleteShift}
                  disabled={isProcessing}
                  className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  削除する
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShift(null)}
                    className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 hover:shadow-lg transition-all"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
