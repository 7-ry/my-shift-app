import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  orderBy,
  limit,
  deleteDoc, // 🌟 追加
} from 'firebase/firestore';
import { getWeekDisplayVerbose } from '../utils/helpers';

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
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [templates, setTemplates] = useState([]); // 🌟 テンプレート一覧用
  const [newTemplateName, setNewTemplateName] = useState(''); // 🌟 保存入力用

  const fetchTemplates = async () => {
    try {
      const tempQ = query(
        collection(db, 'shiftTemplates'),
        orderBy('createdAt', 'desc')
      );
      const tempSnap = await getDocs(tempQ);
      setTemplates(tempSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Template fetch error:', e);
    }
  };

  // 存在する週のリストとテンプレートの両方を取得
  useEffect(() => {
    if (showCopyModal) {
      const fetchWeeks = async () => {
        const weekQ = query(
          collection(db, 'shifts'),
          orderBy('day'),
          limit(500)
        );
        const weekSnap = await getDocs(weekQ);
        const weeks = [
          ...new Set(weekSnap.docs.map((d) => d.data().weekId)),
        ].filter((id) => id !== weekId);
        setAvailableWeeks(weeks.sort().reverse());
      };

      fetchWeeks();
      fetchTemplates(); // 🌟 初期表示時に実行
    }
  }, [showCopyModal, weekId]);

  // 🌟 テンプレートを適用する処理
  const executeApplyTemplate = async (templateShifts) => {
    if (
      !window.confirm(t.confirmCopy || 'Apply this template to current week?')
    )
      return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      // 1. 現週のクリーンアップ
      const currentQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', weekId)
      );
      const currentSnap = await getDocs(currentQ);
      currentSnap.forEach((d) => batch.delete(d.ref));

      // 2. テンプレートのデータを現在の週として投入
      const newShifts = templateShifts.map((s) => {
        const newDocRef = doc(collection(db, 'shifts'));
        const data = { ...s, weekId: weekId };
        batch.set(newDocRef, data);
        return { id: newDocRef.id, ...data };
      });

      await batch.commit();
      setShifts(newShifts);
      setShowCopyModal(false);
      alert(t.templateApplySuccess);
    } catch (e) {
      console.error(e);
      alert(t.templateApplyError);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 テンプレートを削除する処理
  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t.templateDeleteConfirm)) return;
    try {
      await deleteDoc(doc(db, 'shiftTemplates', id));
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // 既存の過去週コピー処理
  const executeCopy = async () => {
    if (!selectedWeek) return;
    if (!window.confirm(t.confirmCopy || 'Copy shifts to current week?'))
      return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const currentQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', weekId)
      );
      const currentSnap = await getDocs(currentQ);
      currentSnap.forEach((d) => batch.delete(d.ref));

      const sourceQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', selectedWeek)
      );
      const sourceSnap = await getDocs(sourceQ);

      const newShifts = [];
      sourceSnap.forEach((docSnap) => {
        const { id: _oldId, ...cleanData } = docSnap.data();
        const newDocRef = doc(collection(db, 'shifts'));
        const duplicatedData = { ...cleanData, weekId: weekId };
        batch.set(newDocRef, duplicatedData);
        newShifts.push({ id: newDocRef.id, ...duplicatedData });
      });

      await batch.commit();
      setShifts(newShifts);
      setShowCopyModal(false);
      alert('Success!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

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
