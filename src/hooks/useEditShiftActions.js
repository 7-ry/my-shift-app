import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useEditShiftActions = ({
  editingShift,
  setEditingShift,
  setShifts,
  calcTotalHours,
  isProcessing,
  setIsProcessing,
  t,
}) => {
  const onSave = async (e) => {
    if (e) e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const total = calcTotalHours(
        editingShift.startTime,
        editingShift.endTime,
        editingShift.breakHours,
        0
      );
      await updateDoc(doc(db, 'shifts', editingShift.id), {
        ...editingShift,
        totalHours: total,
      });
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id ? { ...editingShift, totalHours: total } : s
        )
      );
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  const onDelete = async () => {
    if (isProcessing) return;
    if (!window.confirm(t.confirmDelete)) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'shifts', editingShift.id));
      setShifts((prev) => prev.filter((s) => s.id !== editingShift.id));
      setEditingShift(null);
    } catch (error) {
      console.error(error);
    }
    setIsProcessing(false);
  };

  return { onSave, onDelete };
};
