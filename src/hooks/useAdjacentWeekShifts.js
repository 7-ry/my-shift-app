import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { nextWeekId, prevWeekId } from '../utils/helpers';

export const useAdjacentWeekShifts = ({ user, weekId }) => {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!user) return;

    const adjacentWeekIds = [prevWeekId(weekId), nextWeekId(weekId)].filter(Boolean);
    if (!adjacentWeekIds.length) return;

    let isActive = true;
    const fetchShifts = async () => {
      try {
        const adjacentWeeksQuery = query(
          collection(db, 'shifts'),
          where('weekId', 'in', adjacentWeekIds)
        );
        const result = await getDocs(adjacentWeeksQuery);
        if (isActive) {
          setSnapshot({ user, weekId, shifts: result.docs.map((doc) => doc.data()) });
        }
      } catch (error) {
        if (isActive) console.error('Failed to fetch adjacent week shifts:', error);
      }
    };

    fetchShifts();

    return () => {
      isActive = false;
    };
  }, [user, weekId]);

  return snapshot?.user === user && snapshot?.weekId === weekId
    ? snapshot.shifts
    : [];
};
