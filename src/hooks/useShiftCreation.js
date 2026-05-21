import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const useShiftCreation = ({
  isProcessing,
  setIsProcessing,
  selectedStaff,
  isReadOnly,
  isEditLocked,
  staffs,
  t,
  weekId,
  setShifts,
  timeToMins,
  minsToTime,
  calcTotalHours,
}) => {
  const handleAddShift = async (day, time, lane) => {
    if (isProcessing || !selectedStaff || isReadOnly || isEditLocked) return; // 🌟 isReadOnly を追加
    setIsProcessing(true);
    const staffInfo = staffs.find((s) => s.name === selectedStaff);
    const dayIndexMap = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };
    const dayIndex = dayIndexMap[day];
    if (staffInfo?.offDays?.includes(dayIndex)) {
      const msg = t.offDayWarning
        .replace('{name}', selectedStaff)
        .replace('{day}', day);
      if (!window.confirm(msg)) {
        setIsProcessing(false); // 🌟 処理中フラグを戻すのを忘れずに
        return;
      }
    }
    const startMins = timeToMins(time);
    const endStr = minsToTime(Math.min(startMins + 120, timeToMins('23:30')));
    const total = calcTotalHours(time, endStr, 0, 15); // 🌟 第4引数に 15
    const newShift = {
      staffName: selectedStaff,
      day,
      startTime: time,
      endTime: endStr,
      extendedEndTime: '',
      lane,
      breakHours: 0,
      totalHours: total,
      color: staffInfo.color,
      weekId,
    };
    try {
      const docRef = await addDoc(collection(db, 'shifts'), newShift);
      setShifts((prev) => [...prev, { id: docRef.id, ...newShift }]);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  return { handleAddShift };
};
