import React, { useRef, useEffect } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const Header = ({
  lang,
  setLang,
  weekId,
  setWeekId,
  changeWeek,
  jumpToToday,
  getWeekDisplayVerbose,
  t,
  staffs,
  selectedStaff,
  setSelectedStaff,
  showMenu,
  setShowMenu,
  handleSyncToGAS,
  fetchAvailableWeeks,
  setShowCopyModal,
  setShowStaffModal,
  handleLogout,
  shifts,
  setShifts,
}) => {
  const menuRef = useRef(null);

  // メニュー外クリックで閉じる処理をHeader内に移動してカプセル化
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMenu]);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-lg px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 h-[72px]">
      {' '}
      <div className="flex items-center gap-3 md:gap-5 min-w-fit">
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">
            SAKU{' '}
            <span className="text-yellow-500 font-bold not-italic ml-1">
              Burquitlam
            </span>{' '}
          </h1>
          <span className="text-[10px] font-black text-white uppercase mt-1 tracking-large">
            {' '}
            {getWeekDisplayVerbose(weekId, lang)}
          </span>
        </div>
        <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1 text-white border border-white/5">
          {' '}
          <button
            onClick={() => changeWeek(-1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-all"
          >
            ◀
          </button>
          <div className="relative group">
            <input
              type="week"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="bg-transparent border-none text-xs font-black w-32 text-center focus:ring-0"
            />
            <div className="absolute inset-0 pointer-events-none bg-transparent group-hover:bg-black/5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] bg-slate-800 text-white px-1.5 rounded uppercase">
                {t.week}
              </span>
            </div>
          </div>
          <button
            onClick={() => changeWeek(1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-all"
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
          className="w-10 h-10 border-2 border-white/70 text-white rounded-full font-black text-xs hover:bg-white/10 transition-all uppercase"
        >
          {lang}
        </button>
        <div className="md:hidden flex-1 max-w-[120px]">
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
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
              {' '}
              {s.name}{' '}
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 border-2 border-white/70 flex items-center justify-center text-white font-black rounded-full hover:bg-white/10 text-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-90"
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
              <div className="h-px bg-slate-300 my-1"></div>
              <button
                onClick={() => {
                  setShowCopyModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
              >
                📋 {t.copy}
              </button>
              <div className="h-px bg-slate-300 my-1"></div>
              <button
                onClick={() => {
                  setShowStaffModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3"
              >
                👥 {t.manage}
              </button>
              <div className="h-px bg-slate-300 my-1"></div>
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
              <div className="h-px bg-slate-300 my-1"></div>

              {/* ★ログアウトボタンを追加 */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 transition-colors"
              >
                🚪 {t.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
