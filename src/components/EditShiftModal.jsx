import React from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const EditShiftModal = ({
  editingShift,
  setEditingShift,
  shifts,
  setShifts,
  calcTotalHours,
  isProcessing,
  setIsProcessing,
  t,
}) => {
  if (!editingShift) return null;

  const onSave = async (e) => {
    if (e) e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const total = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours
      );
      await updateDoc(doc(db, 'shifts', editingShift.id), {
        ...editingShift,
        totalHours: total,
      });
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id ? { ...editingShift, totalHours: total } : s
        )
      );
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const onDelete = async () => {
    if (isProcessing) return;
    if (!window.confirm(t.confirmDelete)) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'shifts', editingShift.id));
      setShifts((prev) => prev.filter((s) => s.id !== editingShift.id));
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
      onClick={() => !isProcessing && setEditingShift(null)}
    >
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-4 h-12 rounded-full shadow-sm"
            style={{ backgroundColor: editingShift.color }}
          ></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase leading-none tracking-tight">
              {editingShift.staffName}
            </h2>
            <p className="text-[10px] font-black text-slate-400 mt-1 tracking-widest">
              {t.editShift}
            </p>
          </div>
        </div>
        <form onSubmit={onSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[0.2em]">
                Start
              </label>
              <input
                type="time"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-black focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                value={editingShift.startTime}
                onChange={(e) =>
                  setEditingShift({
                    ...editingShift,
                    startTime: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[0.2em]">
                End
              </label>
              <input
                type="time"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 font-black focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                value={editingShift.endTime}
                onChange={(e) =>
                  setEditingShift({ ...editingShift, endTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[0.2em]">
              {t.break}
            </label>
            <div className="relative">
              <select
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-black appearance-none cursor-pointer focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                value={editingShift.breakHours}
                onChange={(e) =>
                  setEditingShift({
                    ...editingShift,
                    breakHours: parseFloat(e.target.value),
                  })
                }
              >
                <option value="0">None (0h)</option>
                <option value="0.5">30 mins (0.5h)</option>
                <option value="1">1 hour (1.0h)</option>
                <option value="1.5">1.5 hours (1.5h)</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                ▼
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 bg-rose-50 text-rose-600 font-black py-5 rounded-[24px] transition-all hover:bg-rose-100 active:scale-95 uppercase text-xs tracking-widest"
            >
              {t.delete}
            </button>
            <button
              type="submit"
              className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;
