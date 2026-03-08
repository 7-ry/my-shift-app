import React from 'react';

const StaffManagementModal = ({
  showStaffModal,
  setShowStaffModal,
  staffs,
  editingStaffId,
  setEditingStaffId,
  staffEditData,
  setStaffEditData,
  handleUpdateStaff,
  handleStartEditStaff,
  handleMoveStaff,
  setIsProcessing,
  deleteDoc,
  doc,
  db,
  setStaffs,
  newStaff,
  setNewStaff,
  addDoc,
  collection,
  isProcessing,
  t,
}) => {
  if (!showStaffModal) return null;
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
      onClick={() => {
        if (!isProcessing) setShowStaffModal(false);
      }}
    >
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {t.manage}
          </h2>
          <button
            onClick={() => setShowStaffModal(false)}
            className="text-slate-400 hover:text-slate-800 font-bold"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {staffs.map((s, index) => (
            <div
              key={s.id}
              className={`p-5 rounded-[28px] border-2 transition-all ${
                editingStaffId === s.id
                  ? 'bg-blue-50 border-blue-400 shadow-inner'
                  : 'bg-slate-50 border-transparent hover:border-slate-200'
              }`}
            >
              {editingStaffId === s.id ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-widest">
                        {t.staffName}
                      </label>
                      <input
                        type="text"
                        className="w-full px-5 py-3 rounded-2xl border-2 border-blue-200 font-black text-sm uppercase focus:border-blue-500 outline-none"
                        value={staffEditData.name}
                        onChange={(e) =>
                          setStaffEditData({
                            ...staffEditData,
                            name: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-widest">
                        {t.target}
                      </label>
                      <input
                        type="number"
                        className="w-full px-5 py-3 rounded-2xl border-2 border-blue-200 font-black text-sm focus:border-blue-500 outline-none"
                        value={staffEditData.target}
                        onChange={(e) =>
                          setStaffEditData({
                            ...staffEditData,
                            target: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-full cursor-pointer border-4 border-white shadow-md"
                        value={staffEditData.color}
                        onChange={(e) =>
                          setStaffEditData({
                            ...staffEditData,
                            color: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingStaffId(null)}
                        className="px-5 py-2 text-sm font-black text-slate-400 uppercase"
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={() => handleUpdateStaff(s.id)}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all uppercase"
                      >
                        {t.save}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-5 group">
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleMoveStaff(index, -1)}
                      disabled={index === 0}
                      className="text-xs text-slate-300 hover:text-slate-900 disabled:opacity-0 transition-all"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveStaff(index, 1)}
                      disabled={index === staffs.length - 1}
                      className="text-xs text-slate-300 hover:text-slate-900 disabled:opacity-0 transition-all"
                    >
                      ▼
                    </button>
                  </div>
                  <div
                    className="w-14 h-14 rounded-full shadow-xl border-4 border-white flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">
                      {s.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 tracking-tighter flex items-center gap-3 uppercase">
                      {t.target}: {s.target}h{' '}
                      <span className="opacity-20">|</span>{' '}
                      <span
                        style={{ color: s.color }}
                        className="font-mono text-[10px]"
                      >
                        {s.color}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditStaff(s)}
                      className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-full transition-all shadow-sm hover:shadow-md"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(t.confirmStaffDelete)) {
                          setIsProcessing(true);
                          await deleteDoc(doc(db, 'staffs', s.id));
                          setStaffs(
                            staffs.filter((staff) => staff.id !== s.id)
                          );
                          setIsProcessing(false);
                        }
                      }}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-white rounded-full transition-all shadow-sm hover:shadow-md"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setIsProcessing(true);
            const newOrder = staffs.length;
            const docRef = await addDoc(collection(db, 'staffs'), {
              ...newStaff,
              order: newOrder,
            });
            setStaffs([
              ...staffs,
              { id: docRef.id, ...newStaff, order: newOrder },
            ]);
            setNewStaff({ name: '', color: '#cbd5e1', target: 24 });
            setIsProcessing(false);
          }}
          className="p-8 border-t bg-slate-900 space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={t.staffName}
              className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm uppercase placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500"
              value={newStaff.name}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  name: e.target.value.toUpperCase(),
                })
              }
              required
            />
            <input
              type="number"
              placeholder={t.target}
              className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500"
              value={newStaff.target}
              onChange={(e) =>
                setNewStaff({ ...newStaff, target: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex items-center gap-4">
            <input
              type="color"
              className="w-12 h-12 rounded-full cursor-pointer border-4 border-white/10 bg-transparent"
              value={newStaff.color}
              onChange={(e) =>
                setNewStaff({ ...newStaff, color: e.target.value })
              }
            />
            <button
              type="submit"
              className="flex-1 bg-white text-slate-900 rounded-2xl py-3 font-black uppercase text-sm hover:bg-blue-400 transition-all shadow-2xl active:scale-95 tracking-widest"
            >
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default StaffManagementModal;
