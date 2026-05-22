import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useStaffUpdateActions = ({
  staffs,
  setStaffs,
  setShifts,
  staffEditData,
  setEditingStaffId,
  isProcessing,
  setIsProcessing,
}) => {
  const handleUpdateStaff = async (staffId) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const oldStaff = staffs.find((s) => s.id === staffId);
      if (!oldStaff) throw new Error(`Staff with ID ${staffId} not found.`);
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

  return { handleUpdateStaff };
};
