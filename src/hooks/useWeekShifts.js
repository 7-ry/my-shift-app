import { useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export const useWeekShifts = ({ user, weekId, setShifts }) => {
  useEffect(() => {
    if (!user) return; // 🌟 ログイン前は実行しない
    localStorage.setItem('lastViewedWeek', weekId);
    const fetchShifts = async () => {
      const q = query(collection(db, 'shifts'), where('weekId', '==', weekId));
      const querySnapshot = await getDocs(q);
      setShifts(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchShifts();
  }, [weekId, user, setShifts]);
};
