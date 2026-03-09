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
}) => {
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');

  // 存在する週のリストを取得
  useEffect(() => {
    if (showCopyModal) {
      const fetchWeeks = async () => {
        const q = query(collection(db, 'shifts'), orderBy('day'), limit(500));
        const snap = await getDocs(q);
        const weeks = [
          ...new Set(snap.docs.map((d) => d.data().weekId)),
        ].filter((id) => id !== weekId);
        setAvailableWeeks(weeks.sort().reverse()); // 新しい順
      };
      fetchWeeks();
    }
  }, [showCopyModal, weekId]);

  // CopyWeekModal.jsx 内の executeCopy 関数を修正

  const executeCopy = async () => {
    if (!selectedWeek) return;
    if (!window.confirm(t.confirmCopy || 'Copy shifts to current week?'))
      return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      // 1. 現在の週のデータを全削除（上書きするためのクリーンアップ）
      const currentQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', weekId)
      );
      const currentSnap = await getDocs(currentQ);
      currentSnap.forEach((d) => batch.delete(d.ref));

      // 2. コピー元のデータを取得
      const sourceQ = query(
        collection(db, 'shifts'),
        where('weekId', '==', selectedWeek)
      );
      const sourceSnap = await getDocs(sourceQ);

      const newShifts = [];
      sourceSnap.forEach((docSnap) => {
        const sourceData = docSnap.data();

        // 【重要】元のドキュメントの「メタデータ」や内部の「id」を混入させない
        // 純粋なデータのみを取り出し、weekId を現在の週に書き換える
        const { id: _oldId, ...cleanData } = sourceData;

        // 【重要】新しいドキュメント参照を作成（ここで新しいランダムIDが発行される）
        const newDocRef = doc(collection(db, 'shifts'));

        const duplicatedData = {
          ...cleanData,
          weekId: weekId, // 現在表示中の週IDをセット
        };

        // 新しいドキュメントとして保存
        batch.set(newDocRef, duplicatedData);

        // State更新用の配列にも新しいIDを含めて追加
        newShifts.push({ id: newDocRef.id, ...duplicatedData });
      });

      // 3. バッチ処理を一括実行
      await batch.commit();

      // 4. ローカルの shifts 状態を更新して即時反映
      setShifts(newShifts);
      setShowCopyModal(false);
      alert('Success! Shifts duplicated to this week.');
    } catch (e) {
      console.error('Copy Error:', e);
      alert('Copy failed.');
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
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase mb-6">{t.copy}</h2>
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Select Source Week
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {availableWeeks.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`w-full p-4 rounded-2xl text-left font-black transition-all ${
                  selectedWeek === w
                    ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {getWeekDisplayVerbose(w, lang)}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-6">
            <button
              onClick={() => setShowCopyModal(false)}
              className="flex-1 py-4 font-black text-slate-400 uppercase text-xs"
            >
              Cancel
            </button>
            <button
              onClick={executeCopy}
              disabled={!selectedWeek}
              className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-20 transition-all active:scale-95"
            >
              Copy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyWeekModal;
