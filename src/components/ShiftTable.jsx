import React from 'react';

const ShiftTable = ({
  DAYS,
  LANES,
  TIMES,
  ROW_HEIGHT,
  shifts,
  dragInfo,
  isActuallyDragging,
  t,
  formatTime12,
  timeToMins,
  handleAddShift,
  setEditingShift,
  handlePointerDownShift,
  handlePointerMove,
  handlePointerUp,
}) => {
  return (
    /* 📅 タイムテーブルコンテナ: 2軸固定の実装 */
    /* sticky と top を追加し、z-index を調整して他の要素との重なりを制御します */
    <div className="sticky top-16 md:top-[72px] z-30 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative border-t-2 border-t-slate-900 transition-all duration-300">
      {' '}
      {/* overflow-auto を追加し、max-h を指定することでコンテナ内スクロールを有効化 */}
      {/* max-h を調整することで、一度に表示できる時間の範囲（縦幅）が変わります */}
      {/* calc(100vh - ヘッダー高さ) を使うことで、画面の下端までピッタリ表示されます */}
      <div
        className="overflow-auto max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-160px)] custom-scrollbar"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} // ← これがセットされていること
        onPointerLeave={handlePointerUp} // ← 念のため画面外に出た時も確定させる
      >
        {' '}
        <table className="w-full border-collapse table-fixed min-w-[1200px] md:min-w-[1400px] select-none">
          {/* 曜日ヘッダー: sticky top-0 (コンテナ上部に吸着) */}
          <thead className="sticky top-0 z-40 bg-white">
            <tr className="bg-white">
              {/* 左上 Timeヘッダー: sticky left-0 かつ top-0 で交差点を最前面(z-50)で固定 */}
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
                {/* Time列: sticky left-0 (コンテナ左端に吸着、z-30) */}
                <td className="border-b border-r-2 border-slate-200 text-center text-[10px] md:text-[11px] font-black text-slate-400 bg-white sticky left-0 z-30 group-hover:bg-slate-50 transition-colors uppercase">
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
                        onDoubleClick={() => handleAddShift(day, time, lane)}
                        className={`border-b ${
                          time.endsWith(':30')
                            ? 'border-slate-100'
                            : 'border-slate-50 border-dashed'
                        } ${
                          lane === 4
                            ? 'border-r-2 border-r-slate-200'
                            : 'border-r border-slate-50'
                        } p-0 hover:bg-blue-50/50 cursor-crosshair relative transition-colors`}
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
                              dragInfo?.id === shift.id && isActuallyDragging
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
                                handlePointerDownShift(e, shift, 'resize-top')
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
  );
};

export default ShiftTable;
