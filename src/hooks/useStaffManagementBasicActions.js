import {
  addDoc,
  collection,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useStaffManagementBasicActions = ({
  staffs,
  setStaffs,
  newStaff,
  setNewStaff,
  isProcessing,
  setIsProcessing,
  t,
}) => {
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const newOrder = staffs.length;
      const docRef = await addDoc(collection(db, 'staffs'), {
        ...newStaff,
        order: newOrder,
      });
      setStaffs((prev) => [
        ...prev,
        { id: docRef.id, ...newStaff, order: newOrder },
      ]);
      setNewStaff({ name: '', color: '#cbd5e1', target: 24, offDays: [] });
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleDeleteStaff = async (id) => {
    if (isProcessing) return;
    if (!window.confirm(t.confirmStaffDelete)) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'staffs', id), {
        isActive: false,
      });
      setStaffs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleMoveStaff = async (index, direction) => {
    if (isProcessing) return;
    const newStaffs = [...staffs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStaffs.length) return;
    setIsProcessing(true);
    [newStaffs[index], newStaffs[targetIndex]] = [
      newStaffs[targetIndex],
      newStaffs[index],
    ];
    const batch = writeBatch(db);
    newStaffs.forEach((s, i) => {
      batch.update(doc(db, 'staffs', s.id), { order: i });
    });
    try {
      await batch.commit();
      setStaffs(newStaffs);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  return { handleAddStaff, handleDeleteStaff, handleMoveStaff };
};
