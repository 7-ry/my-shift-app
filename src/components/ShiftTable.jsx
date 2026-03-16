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
  selectedShiftId,
  setSelectedShiftId,
  staffs,
  selectedStaff,
}) => {
  return (
    <div className="sticky top-16 md:top-[72px] z-30 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative border-t-2 border-t-slate-900 transition-all duration-300">
      <div
        className="overflow-auto max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-160px)] custom-scrollbar"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        // 背景クリックで選択を解除
        onClick={() => setSelectedShiftId(null)}
      >
        <table className="w-full border-collapse table-fixed min-w-[1200px] md:min-w-[1400px] select-none">
          <thead className="sticky top-0 z-40 bg-white">
            <tr className="bg-white">
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
                <td className="border-b border-r-2 border-slate-200 text-center text-[10px] md:text-[11px] font-black text-slate-400 bg-white sticky left-0 z-30 group-hover:bg-slate-50 transition-colors uppercase">
                  <span
                    className={
                      time.endsWith(':00') ? 'text-slate-800' : 'opacity-40'
                    }
                  >
                    {formatTime12(time)}
                  </span>
                </td>
                {DAYS.map((day) => {
                  const dayIndexMap = {
                    SUN: 0,
                    MON: 1,
                    TUE: 2,
                    WED: 3,
                    THU: 4,
                    FRI: 5,
                    SAT: 6,
                  };
                  const currentDayIdx = dayIndexMap[day];

                  // 🌟 追加: スタッフ情報を LANES ループの外で取得（パフォーマンス向上）
                  const staffInfo = staffs.find(
                    (s) => s.name === selectedStaff
                  );
                  const isOffDay = staffInfo?.offDays?.includes(currentDayIdx);
                  return LANES.map((lane) => {
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
                        } p-0 relative transition-colors ${
                          isOffDay
                            ? 'bg-rose-100/60'
                            : 'hover:bg-blue-50/50 cursor-crosshair'
                        }`}
                        title={t.doubleClickHint}
                      >
                        {isOffDay && time === '13:00' && lane === 1 && (
                          <div
                            className="absolute top-0 left-0 w-[400%] h-full flex items-center justify-center pointer-events-none select-none z-[30] opacity-30"
                            style={{ pointerEvents: 'none' }}
                          >
                            <span className="text-rose-600 font-black text-7xl rotate-12 whitespace-nowrap tracking-tighter drop-shadow-sm">
                              OFF
                            </span>
                          </div>
                        )}

                        {cellShifts.map((shift) => {
                          const isSelected = selectedShiftId === shift.id;
                          const durationMins =
                            timeToMins(shift.endTime) -
                            timeToMins(shift.startTime);
                          const isShortCard = durationMins <= 60;

                          return (
                            <div
                              key={shift.id}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingShift(shift);
                              }}
                              onPointerDown={(e) =>
                                handlePointerDownShift(e, shift, 'move')
                              }
                              className={`absolute inset-x-[3px] rounded-lg flex flex-col items-center justify-center overflow-hidden shadow-sm ring-1 ring-black/10 z-10 cursor-grab active:cursor-grabbing transition-all ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 z-50 shadow-lg scale-[1.02] border-l-blue-600'
                                  : 'border-l-black/20'
                              } ${
                                dragInfo?.id === shift.id && isActuallyDragging
                                  ? 'opacity-90'
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
                              {/* 選択中のみ上ハンドル表示 */}
                              {isSelected && (
                                <div
                                  className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize z-20"
                                  onPointerDown={(e) =>
                                    handlePointerDownShift(
                                      e,
                                      shift,
                                      'resize-top'
                                    )
                                  }
                                />
                              )}
                              <div className="flex flex-col items-center justify-center w-full px-0.5 text-center pointer-events-none leading-none">
                                {/* 🌟 名前：4文字切り出し、サイズ最大化、完璧な中央配置 */}
                                <span className="font-black text-slate-900 uppercase tracking-tighter w-full block text-[10px]">
                                  {shift.staffName.substring(0, 4)}
                                </span>

                                {/* 🌟 時間：名前の直下に小さく配置 */}
                                {durationMins >= 45 && (
                                  <span
                                    className={`font-bold text-slate-900/60 tracking-tighter block ${
                                      isShortCard ? 'text-[8px]' : 'text-[9px]'
                                    }`}
                                    style={{ lineHeight: '1' }}
                                  >
                                    {(() => {
                                      const start = formatTime12(
                                        shift.startTime
                                      );
                                      const end = formatTime12(shift.endTime);
                                      const ext = shift.extendedEndTime
                                        ? `(${formatTime12(
                                            shift.extendedEndTime
                                          )})`
                                        : '';
                                      return `${start}-${end}${ext}`; // 例: 9:30-2(3)
                                    })()}
                                  </span>
                                )}

                                {!isShortCard && shift.breakHours > 0 && (
                                  <span className="text-[8px] font-black text-slate-900/40 mt-0.5 uppercase">
                                    {shift.breakHours === 0.5
                                      ? '30m'
                                      : `${shift.breakHours}h`}
                                  </span>
                                )}
                              </div>

                              {/* 選択中のみ下ハンドル表示 */}
                              {isSelected && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-20"
                                  onPointerDown={(e) =>
                                    handlePointerDownShift(
                                      e,
                                      shift,
                                      'resize-bottom'
                                    )
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShiftTable;
