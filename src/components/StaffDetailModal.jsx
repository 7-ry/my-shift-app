import React from 'react';

const StaffDetailModal = ({
  viewingStaffDetail,
  setViewingStaffDetail,
  shifts,
  DAYS,
  timeToMins,
  formatTime12,
  t,
}) => {
  if (!viewingStaffDetail) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
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
            <h2 className="text-3xl font-black text-slate-800 uppercase leading-none tracking-tight">
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
                    <span className="text-xl leading-none mt-1">L{s.lane}</span>
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-800 tracking-tight">
                      {formatTime12(s.startTime)} - {formatTime12(s.endTime)}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.break}: {s.breakHours}h
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800 leading-none">
                    {s.totalHours}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                    hrs
                  </div>
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
  );
};

export default StaffDetailModal;
