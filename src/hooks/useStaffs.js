import { useCallback, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  query,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useStaffs = ({
  user,
  isReadOnly,
  hasInitialized: hasInitializedRef,
  setStaffs,
  setSelectedStaff,
}) => {
  const fetchStaffs = useCallback(async () => {
    if (!user) return; // 🌟 ログイン前は実行しない
    const q = query(collection(db, 'staffs'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.isActive !== false);
    if (list.length === 0 && !hasInitializedRef.current) {
      if (isReadOnly) return;
      hasInitializedRef.current = true;
      const initial = [
        { name: 'KANA', color: '#bae6fd', target: 39, order: 0 },
        { name: 'RYUSHIN', color: '#bbf7d0', target: 38, order: 1 },
        { name: 'SAYAKA', color: '#e9d5ff', target: 24, order: 2 },
      ];
      const batch = writeBatch(db);
      initial.forEach((s) => batch.set(doc(collection(db, 'staffs')), s));
      await batch.commit();
      window.location.reload();
      return;
    }
    setStaffs(list);
    if (list.length > 0) {
      setSelectedStaff((prev) => prev || list[0].name);
    }
  }, [hasInitializedRef, isReadOnly, setSelectedStaff, setStaffs, user]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);
};
