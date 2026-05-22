import React, { useState } from 'react';
import { getWeekDisplayVerbose } from '../utils/helpers';
import { useCopyWeek } from '../hooks/useCopyWeek';
import { useCopyWeekTemplates } from '../hooks/useCopyWeekTemplates';

const CopyWeekModal = ({
  showCopyModal,
  setShowCopyModal,
  weekId,
  setShifts,
  setIsProcessing,
  t,
  lang,
  handleSaveAsTemplate, // 🌟 追加
  shifts, // 🌟 追加
}) => {
  const [newTemplateName, setNewTemplateName] = useState(''); // 🌟 保存入力用
  const { availableWeeks, selectedWeek, setSelectedWeek, executeCopy } =
    useCopyWeek({
      showCopyModal,
      weekId,
      setShifts,
      setShowCopyModal,
      setIsProcessing,
      t,
    });
  const {
    templates,
    fetchTemplates,
    executeApplyTemplate,
    handleDeleteTemplate,
  } = useCopyWeekTemplates({
    showCopyModal,
    weekId,
    setShifts,
    setShowCopyModal,
    setIsProcessing,
    t,
  });

  if (!showCopyModal) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
      onClick={() => setShowCopyModal(false)}
    >
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {t.copy}
          </h2>
          <button
            onClick={() => setShowCopyModal(false)}
            className="text-slate-400 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* 🌟 1. 現在の週をテンプレートとして保存 */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              {t.saveCurrentWeek}
            </h3>
            <div className="bg-blue-50 p-5 rounded-[28px] border-2 border-blue-100 space-y-3">
              <input
                type="text"
                placeholder={t.templatePlaceholder}
                className="w-full px-4 py-3 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <button
                onClick={async () => {
                  await handleSaveAsTemplate(newTemplateName);
                  setNewTemplateName('');
                  fetchTemplates();
                }}
                disabled={!newTemplateName || shifts.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-30 transition-all"
              >
                {t.saveAsTemplate}
              </button>
            </div>
          </div>

          {/* 🌟 2. 保存済みテンプレートから適用 */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              {t.template}
            </h3>
            <div className="space-y-2">
              {templates.length === 0 && (
                <p className="text-center py-4 text-slate-300 font-bold italic text-xs">
                  {t.noTemplates}
                </p>
              )}
              {templates.map((temp) => (
                <div
                  key={temp.id}
                  onClick={() => executeApplyTemplate(temp.shifts)}
                  className="group bg-slate-50 hover:bg-white hover:shadow-md border-2 border-transparent hover:border-slate-200 p-4 rounded-2xl cursor-pointer transition-all flex justify-between items-center"
                >
                  <div>
                    <div className="font-black text-slate-800 text-sm uppercase">
                      {temp.name}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                      {t.shiftsCount.replace('{count}', temp.shifts.length)} ·{' '}
                      {t.staffsCount.replace('{count}', temp.staffCount)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(e, temp.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 過去の週からコピー（既存機能） */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              {t.shiftHistory}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {availableWeeks.slice(0, 5).map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`w-full p-4 rounded-2xl text-left font-black transition-all text-xs ${
                    selectedWeek === w
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {getWeekDisplayVerbose(w, lang)}
                </button>
              ))}
            </div>
            {selectedWeek && (
              <button
                onClick={executeCopy}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95 mt-2"
              >
                {t.copySelectedWeek}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyWeekModal;
