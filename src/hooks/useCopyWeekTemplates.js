import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useCopyWeekTemplates = ({
  showCopyModal,
  weekId,
  setShifts,
  setShowCopyModal,
  setIsProcessing,
  t,
}) => {
  const [templates, setTemplates] = useState([]);

  const fetchTemplates = useCallback(async () => {
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
  }, []);

  // 存在する週のリストとテンプレートの両方を取得
  useEffect(() => {
    if (showCopyModal) {
      fetchTemplates(); // 🌟 初期表示時に実行
    }
  }, [fetchTemplates, showCopyModal, weekId]);

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
      const newShifts = (templateShifts || []).map((s) => {
        const newDocRef = doc(collection(db, 'shifts'));
        const data = { ...s, weekId: weekId };
        batch.set(newDocRef, data);
        return { id: newDocRef.id, ...data };
      });

      if (!currentSnap.empty || (templateShifts && templateShifts.length > 0)) {
        await batch.commit();
      }
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

  return {
    templates,
    fetchTemplates,
    executeApplyTemplate,
    handleDeleteTemplate,
  };
};
