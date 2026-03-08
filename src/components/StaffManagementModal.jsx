import React from 'react';
// 1. Firebase 関連の関数を App.jsx から渡すのではなく、ここで直接インポートします
import {
  doc,
  deleteDoc,
  addDoc,
  collection,
  updateDoc,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore'; // ★ 必要な関数をすべて追加
import { db } from '../firebase';

const StaffManagementModal = ({
  showStaffModal,
  setShowStaffModal,
  staffs,
  setStaffs, // 親（App.jsx）の表示状態を更新するために必要
  editingStaffId,
  setEditingStaffId,
  staffEditData,
  setStaffEditData,
  setIsProcessing,
  newStaff,
  setNewStaff,
  isProcessing,
  t,
  shifts,
  setShifts,
}) => {
  if (!showStaffModal) return null;

  // --- 🚀 スタッフ追加ロジック ---
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (isProcessing) return; // 二重送信防止

    setIsProcessing(true);
    try {
      const newOrder = staffs.length;
      // Firestore に保存
      const docRef = await addDoc(collection(db, 'staffs'), {
        ...newStaff,
        order: newOrder,
      });
      // 画面上のステートを更新
      setStaffs([...staffs, { id: docRef.id, ...newStaff, order: newOrder }]);
      // 入力フォームをリセット
      setNewStaff({ name: '', color: '#334155', target: 20 });
    } catch (e) {
      console.error('Add Staff Error:', e);
      alert('スタッフの追加に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 🗑️ スタッフ削除ロジック ---
  const handleDeleteStaff = async (id) => {
    if (!window.confirm(t.confirmStaffDelete || 'スタッフを削除しますか？'))
      return;

    setIsProcessing(true);
    try {
      // Firestore から削除
      await deleteDoc(doc(db, 'staffs', id));
      // 画面上のステートから削除したスタッフを除外
      setStaffs(staffs.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Delete Staff Error:', e);
      alert('スタッフの削除に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  // ★ 既存の handleUpdateStaff を以下のように「イベント(e)」を受け取る形にラップします
  const onSaveEdit = async (e, staffId) => {
    e.preventDefault(); // フォーム送信によるリロードを防止
    await handleUpdateStaff(staffId); // 既存のロジックを実行
  };

  const handleStartEditStaff = (staff) => {
    setEditingStaffId(staff.id);
    setStaffEditData({
      name: staff.name,
      color: staff.color,
      target: staff.target,
    });
  };

  const handleMoveStaff = async (index, direction) => {
    if (isProcessing) return;
    const newStaffs = [...staffs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStaffs.length) return;
    setIsProcessing(true);
    [newStaffs[index], newStaffs[targetIndex]] = [
      newStaffs[targetIndex],
      newStaffs[index],
    ];
    const batch = writeBatch(db);
    newStaffs.forEach((s, i) => {
      batch.update(doc(db, 'staffs', s.id), { order: i });
    });
    try {
      await batch.commit();
      setStaffs(newStaffs);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleUpdateStaff = async (staffId) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const oldStaff = staffs.find((s) => s.id === staffId);
      await updateDoc(doc(db, 'staffs', staffId), staffEditData);
      if (
        oldStaff.name !== staffEditData.name ||
        oldStaff.color !== staffEditData.color
      ) {
        const batch = writeBatch(db);
        const q = query(
          collection(db, 'shifts'),
          where('staffName', '==', oldStaff.name)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          batch.update(doc(db, 'shifts', d.id), {
            staffName: staffEditData.name,
            color: staffEditData.color,
          });
        });
        await batch.commit();
        setShifts((prev) =>
          prev.map((s) =>
            s.staffName === oldStaff.name
              ? {
                  ...s,
                  staffName: staffEditData.name,
                  color: staffEditData.color,
                }
              : s
          )
        );
      }
      setStaffs((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, ...staffEditData } : s))
      );
      setEditingStaffId(null);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
      onClick={() => !isProcessing && setShowStaffModal(false)}
    >
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {t.manage}
          </h2>
          <button
            onClick={() => setShowStaffModal(false)}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-800 font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* スタッフ一覧リスト */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {staffs.map((s, index) => (
            <div
              key={s.id}
              className={`p-5 rounded-[28px] border-2 transition-all ${
                editingStaffId === s.id
                  ? 'bg-blue-50 border-blue-400 shadow-inner'
                  : 'bg-slate-50 border-transparent hover:border-slate-200 shadow-sm'
              }`}
            >
              {editingStaffId === s.id ? (
                /* 編集モードのUI */
                <form
                  onSubmit={(e) => onSaveEdit(e, s.id)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-black uppercase focus:border-blue-500 outline-none"
                      value={staffEditData.name}
                      onChange={(e) =>
                        setStaffEditData({
                          ...staffEditData,
                          name: e.target.value.toUpperCase(),
                        })
                      }
                    />
                    <input
                      type="number"
                      className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-black focus:border-blue-500 outline-none"
                      value={staffEditData.target}
                      onChange={(e) =>
                        setStaffEditData({
                          ...staffEditData,
                          target: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer"
                      value={staffEditData.color}
                      onChange={(e) =>
                        setStaffEditData({
                          ...staffEditData,
                          color: e.target.value,
                        })
                      }
                    />
                    <div className="flex-1 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStaffId(null)}
                        className="flex-1 bg-slate-200 text-slate-600 font-black py-2 rounded-xl text-xs uppercase tracking-widest"
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* 通常モードのUI */
                <div className="flex items-center gap-5 group">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveStaff(index, -1)}
                      disabled={index === 0}
                      className="text-slate-300 hover:text-slate-600 disabled:opacity-10 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveStaff(index, 1)}
                      disabled={index === staffs.length - 1}
                      className="text-slate-300 hover:text-slate-600 disabled:opacity-10 text-xs"
                    >
                      ▼
                    </button>
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl shadow-lg ring-4 ring-white"
                    style={{ backgroundColor: s.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-lg uppercase leading-tight truncate">
                      {s.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                      {t.target}: {s.target}h
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditStaff(s)}
                      className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-full transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-white rounded-full transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 新規スタッフ追加フォーム */}
        <form
          onSubmit={handleAddStaff}
          className="p-8 border-t bg-slate-900 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder={t.staffName}
              className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              value={newStaff.name}
              onChange={(e) =>
                setNewStaff({ ...newStaff, name: e.target.value.toUpperCase() })
              }
              required
            />
            <input
              type="number"
              placeholder={t.target}
              className="px-5 py-3 rounded-2xl bg-white/10 border-none text-white font-black text-sm placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              disabled={isProcessing}
              className="flex-1 bg-white text-slate-900 rounded-2xl py-3 font-black uppercase text-sm hover:bg-blue-400 transition-all shadow-2xl active:scale-95 tracking-widest disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : t.newStaff}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffManagementModal;
