import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export const useClearWeek = ({ shifts, setShifts, t, setShowMenu }) => {
  const handleClearWeek = async () => {
    if (window.confirm(t.confirmClear)) {
      setShowMenu(false);
      const b = writeBatch(db);
      shifts.forEach((s) => b.delete(doc(db, 'shifts', s.id)));
      await b.commit();
      setShifts([]);
    }
  };

  return { handleClearWeek };
};
