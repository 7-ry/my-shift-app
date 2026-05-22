import { syncToGAS } from '../services/gasService';
import {
  timeToMins,
  formatTime12,
  getWeekDisplayVerbose,
  getSheetRowNum,
  getSheetCellByRow,
} from '../utils/helpers.js';
import { DAYS } from '../constants/config';

export const useGasSync = ({
  isProcessing,
  isReadOnly,
  shifts,
  staffs,
  weekId,
  lang,
  t,
  setIsProcessing,
}) => {
  const handleSyncToGAS = async () => {
    if (isProcessing || isReadOnly) return; // 🌟 isReadOnly を追加
    const gasUrl = import.meta.env.VITE_GAS_URL;
    if (!gasUrl) {
      alert('.env Error: VITE_GAS_URL');
      return;
    }

    if (
      !window.confirm(`${t.confirmSync} ${getWeekDisplayVerbose(weekId, lang)}`)
    )
      return;

    setIsProcessing(true);

    try {
      // 外部化したサービスを呼び出す
      await syncToGAS({
        gasUrl,
        shifts,
        staffs,
        weekId,
        lang,
        t,
        helpers: {
          timeToMins,
          getSheetRowNum,
          formatTime12,
          getWeekDisplayVerbose,
          getSheetCellByRow: (day, row, lane) =>
            getSheetCellByRow(day, row, lane, DAYS), // ★ DAYSを追加
        },
      });
      alert(t.syncSuccess);
    } catch (error) {
      console.error(error);
      alert(t.syncError);
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleSyncToGAS };
};
