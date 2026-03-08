import React from 'react';

const Dashboard = ({ dashboardData, setViewingStaffDetail, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4 mb-6">
          {' '}
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
                      : d.remaining === 0
                      ? 'bg-blue-600'
                      : 'bg-slate-800'
                  }`}
                  style={{ width: `${d.progressPercent}%` }}
                ></div>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-full -mr-8 -mt-8 group-hover:bg-blue-50 transition-colors duration-500"></div>
            </div>
          ))}
        </div>
  );
};

export default Dashboard;
