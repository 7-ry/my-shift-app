import { useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export const useWeekShifts = ({ user, weekId, setShifts }) => {
  useEffect(() => {
    if (!user) {
      setShifts([]);
      return; // 🌟 ログイン前は実行しない
    }

    let isActive = true;

    localStorage.setItem('lastViewedWeek', weekId);

    const fetchShifts = async () => {
      try {
        const q = query(collection(db, 'shifts'), where('weekId', '==', weekId));
        const querySnapshot = await getDocs(q);

        if (!isActive) return;

        setShifts(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        if (isActive) {
          console.error('Failed to fetch week shifts:', error);
        }
      }
    };

    fetchShifts();

    return () => {
      isActive = false;
    };
  }, [weekId, user, setShifts]);
};
