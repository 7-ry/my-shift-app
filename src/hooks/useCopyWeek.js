import { useEffect, useState } from 'react';
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
import { db } from '../firebase';

export const useCopyWeek = ({
  showCopyModal,
  weekId,
  setShifts,
  setShowCopyModal,
  setIsProcessing,
  t,
}) => {
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');

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
    }
  }, [showCopyModal, weekId]);

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

  return { availableWeeks, selectedWeek, setSelectedWeek, executeCopy };
};
