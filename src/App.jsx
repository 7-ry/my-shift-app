import React, { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

// components import
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ShiftTable from './components/ShiftTable';
import StaffDetailModal from './components/StaffDetailModal';
import EditShiftModal from './components/EditShiftModal';
import StaffManagementModal from './components/StaffManagementModal';
import Login from './components/Login'; // 追加
import CopyWeekModal from './components/CopyWeekModal';
import {
  timeToMins,
  minsToTime,
  calcTotalHours,
  formatTime12,
  getWeekDisplayVerbose,
} from './utils/helpers.js';
import { buildDashboardData } from './utils/dashboardData';
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
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useAuthUser } from './hooks/useAuthUser';
import { useShiftCreation } from './hooks/useShiftCreation';
import { useShiftTemplates } from './hooks/useShiftTemplates';
import { useGasSync } from './hooks/useGasSync';

function App() {
  const [lang, setLang] = useState(
    () => localStorage.getItem('appLang') || 'en'
  );
  const t = translations[lang];

  const [staffs, setStaffs] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [shifts, setShifts] = useState([]);
  const { user, loading, isReadOnly } = useAuthUser();
  const [editingShift, setEditingShift] = useState(null);
  const { weekId, setWeekId, changeWeek, jumpToToday } = useWeekNavigation();
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const hasInitialized = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingStaffDetail, setViewingStaffDetail] = useState(null);
  const [loginPw, setLoginPw] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [isEditLocked, setIsEditLocked] = useState(true);

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

  const { handleSyncToGAS } = useGasSync({
    isProcessing,
    isReadOnly,
    shifts,
    staffs,
    weekId,
    lang,
    t,
    setIsProcessing,
  });

  const { handleAddShift } = useShiftCreation({
    isProcessing,
    setIsProcessing,
    selectedStaff,
    isReadOnly,
    isEditLocked,
    staffs,
    t,
    weekId,
    setShifts,
    timeToMins,
    minsToTime,
    calcTotalHours,
  });

  const { handleSaveAsTemplate } = useShiftTemplates({
    isProcessing,
    isReadOnly,
    shifts,
    setIsProcessing,
    calcTotalHours,
    user,
    t,
  });

  const dashboardData = buildDashboardData(staffs, shifts);

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
