import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// components import
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ShiftTable from './components/ShiftTable';
import StaffDetailModal from './components/StaffDetailModal';
import EditShiftModal from './components/EditShiftModal';
import StaffManagementModal from './components/StaffManagementModal';
import Login from './components/Login'; // 追加
import { syncToGAS } from './services/gasService';
import CopyWeekModal from './components/CopyWeekModal';
import {
  timeToMins,
  minsToTime,
  calcTotalHours,
  formatTime12,
  getWeekDisplayVerbose,
  getCurrentWeekId,
  getSheetRowNum,
  getSheetCellByRow,
} from './utils/helpers.js';
import { useShiftDrag } from './hooks/useShiftDrag';
import {
  translations,
  DAYS,
  LANES,
  TIMES,
  ROW_HEIGHT,
  DRAG_THRESHOLD,
} from './constants/config';
import { useWeekShifts } from './hooks/useWeekShifts';
import { useStaffs } from './hooks/useStaffs';

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
  const [weekId, setWeekId] = useState(
    () => localStorage.getItem('lastViewedWeek') || getCurrentWeekId()
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const hasInitialized = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingStaffDetail, setViewingStaffDetail] = useState(null);
  const [loginPw, setLoginPw] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isEditLocked, setIsEditLocked] = useState(true);

  // 認証状態の監視（ブラウザを閉じてもログインを維持するための処理）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsReadOnly(u.email === import.meta.env.VITE_FB_VIEWER_EMAIL);
      } else {
        setUser(null);
        setIsReadOnly(false);
      }
      setLoading(false); //
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (window.confirm(t.logoutConfirm)) {
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

  useStaffs({ user, isReadOnly, hasInitialized, setStaffs, setSelectedStaff });

  useWeekShifts({ user, weekId, setShifts });

  const {
    handlePointerMove,
    handlePointerUp,
    handlePointerDownShift,
    dragInfo,
    isActuallyDragging,
  } = useShiftDrag({
    shifts,
    setShifts,
    selectedShiftId,
    setSelectedShiftId,
    timeToMins,
    minsToTime,
    calcTotalHours,
    ROW_HEIGHT,
    DRAG_THRESHOLD,
    isReadOnly: isReadOnly || isEditLocked,
  });

  const changeWeek = (offset) => {
    const [year, week] = weekId.split('-W').map(Number);
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    date.setDate(date.getDate() + offset * 7);
    setWeekId(getCurrentWeekId(date));
  };

  const jumpToToday = () => setWeekId(getCurrentWeekId());

  const handleSyncToGAS = async () => {
    if (isProcessing || isReadOnly) return; // 🌟 isReadOnly を追加
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

    try {
      // 外部化したサービスを呼び出す
      await syncToGAS({
        gasUrl,
        shifts,
        staffs,
        weekId,
        lang,
        t,
        helpers: {
          timeToMins,
          getSheetRowNum,
          formatTime12,
          getWeekDisplayVerbose,
          getSheetCellByRow: (day, row, lane) =>
            getSheetCellByRow(day, row, lane, DAYS), // ★ DAYSを追加
        },
      });
      alert(t.syncSuccess);
    } catch (error) {
      console.error(error);
      alert(t.syncError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddShift = async (day, time, lane) => {
    if (isProcessing || !selectedStaff || isReadOnly || isEditLocked) return; // 🌟 isReadOnly を追加
    setIsProcessing(true);
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
    const dayIndexMap = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };
    const dayIndex = dayIndexMap[day];
    if (staffInfo?.offDays?.includes(dayIndex)) {
      const msg = t.offDayWarning
        .replace('{name}', selectedStaff)
        .replace('{day}', day);
      if (!window.confirm(msg)) {
        setIsProcessing(false); // 🌟 処理中フラグを戻すのを忘れずに
        return;
      }
    }
    const startMins = timeToMins(time);
    const endStr = minsToTime(Math.min(startMins + 120, timeToMins('23:30')));
    const total = calcTotalHours(time, endStr, 0, 15); // 🌟 第4引数に 15
    const newShift = {
      staffName: selectedStaff,
      day,
      startTime: time,
      endTime: endStr,
      extendedEndTime: '',
      lane,
      breakHours: 0,
      totalHours: total,
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

  const handleSaveAsTemplate = async (templateName) => {
    if (isProcessing || isReadOnly || !templateName || shifts.length === 0)
      return;
    setIsProcessing(true);
    try {
      // 🌟 保存用にデータをクリーンアップ（個別のIDやweekIdを除去）
      const templateShifts = shifts.map((shift) => {
        const rest = { ...shift };
        delete rest.id;
        delete rest.weekId;
        delete rest.totalHours;
        return {
          ...rest,
          totalHours: calcTotalHours(
            rest.startTime,
            rest.endTime,
            rest.breakHours,
            0
          ),
        };
      });

      await addDoc(collection(db, 'shiftTemplates'), {
        name: templateName,
        shifts: templateShifts,
        createdAt: new Date(),
        createdBy: user.email,
        staffCount: [...new Set(shifts.map((s) => s.staffName))].length,
      });

      alert(t.templateSaveSuccess.replace('{name}', templateName));
    } catch (e) {
      console.error(e);
      alert(t.templateSaveError);
    } finally {
      setIsProcessing(false);
    }
  };

  const dashboardData = staffs.map((staff) => {
    const total = shifts
      .filter((s) => s.staffName === staff.name)
      .reduce((acc, s) => acc + s.totalHours, 0);
    const totalFixed = Math.round(total * 100) / 100;
    return {
      ...staff,
      currentHours: totalFixed,
      remaining: Math.floor((staff.target - totalFixed) * 100) / 100,
      progressPercent: Math.min((totalFixed / staff.target) * 100, 100),
    };
  });

  // 1. Login
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 text-xs tracking-widest uppercase">
            {t.checkingAccess}
          </p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <Login
        loginPw={loginPw}
        setLoginPw={setLoginPw}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-blue-200">
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
        handleSyncToGAS={handleSyncToGAS}
        setShowCopyModal={setShowCopyModal}
        setShowStaffModal={setShowStaffModal}
        handleLogout={handleLogout}
        shifts={shifts}
        setShifts={setShifts}
        isReadOnly={isReadOnly}
        isEditLocked={isEditLocked}
        setIsEditLocked={setIsEditLocked}
      />
      {/* DASHBOARD */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6">
        <Dashboard
          dashboardData={dashboardData}
          setViewingStaffDetail={setViewingStaffDetail}
          t={t}
        />

        {/* 📅 タイムテーブルコンテナ */}
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
          isEditLocked={isEditLocked}
          isReadOnly={isReadOnly}
          handleAddShift={handleAddShift}
          setEditingShift={setEditingShift}
          handlePointerDownShift={handlePointerDownShift}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          selectedShiftId={selectedShiftId}
          setSelectedShiftId={setSelectedShiftId}
          staffs={staffs} // 🌟 追加
          selectedStaff={selectedStaff} // 🌟 追加
        />
      </div>
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
        setShifts={setShifts} // ★追加
        setIsProcessing={setIsProcessing}
        isProcessing={isProcessing}
        t={t}
      />
      <EditShiftModal
        editingShift={editingShift}
        setEditingShift={setEditingShift}
        setShifts={setShifts} // ★ 追加
        calcTotalHours={calcTotalHours} // ★ 追加
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        t={t}
        isReadOnly={isReadOnly}
      />
      <CopyWeekModal
        showCopyModal={showCopyModal}
        setShowCopyModal={setShowCopyModal}
        weekId={weekId}
        setShifts={setShifts}
        setIsProcessing={setIsProcessing}
        t={t}
        lang={lang}
        handleSaveAsTemplate={handleSaveAsTemplate} // 🌟 追加
        shifts={shifts} // 🌟 現在のシフト数などを表示するために追加
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
