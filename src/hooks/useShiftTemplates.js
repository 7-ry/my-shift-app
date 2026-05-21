import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const useShiftTemplates = ({
  isProcessing,
  isReadOnly,
  shifts,
  setIsProcessing,
  calcTotalHours,
  user,
  t,
}) => {
  const handleSaveAsTemplate = async (templateName) => {
    if (isProcessing || isReadOnly || !templateName || shifts.length === 0)
      return;
    setIsProcessing(true);
    try {
      // 🌟 保存用にデータをクリーンアップ（個別のIDやweekIdを除去）
      const templateShifts = shifts.map((shift) => {
        const rest = { ...shift };
        delete rest.id;
        delete rest.weekId;
        delete rest.totalHours;
        return {
          ...rest,
          totalHours: calcTotalHours(
            rest.startTime,
            rest.endTime,
            rest.breakHours,
            0
          ),
        };
      });

      await addDoc(collection(db, 'shiftTemplates'), {
        name: templateName,
        shifts: templateShifts,
        createdAt: new Date(),
        createdBy: user.email,
        staffCount: [...new Set(shifts.map((s) => s.staffName))].length,
      });

      alert(t.templateSaveSuccess.replace('{name}', templateName));
    } catch (e) {
      console.error(e);
      alert(t.templateSaveError);
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleSaveAsTemplate };
};
