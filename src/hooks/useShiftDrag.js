import { useState, useCallback, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useShiftDrag = ({
  shifts,
  setShifts,
  selectedShiftId,
  setSelectedShiftId,
  timeToMins,
  minsToTime,
  calcTotalHours,
  ROW_HEIGHT,
  DRAG_THRESHOLD,
  isReadOnly,
}) => {
  const [dragInfo, setDragInfo] = useState(null);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

  // 1. ドラッグ開始：要素の保存と拘束
  const handlePointerDownShift = (e, shift, type) => {
    if (isReadOnly) return;
    e.stopPropagation();
    // 🌟 追加：現在選択されていないシフトを触った場合、選択するだけでドラッグは開始しない
    if (selectedShiftId !== shift.id) {
      setSelectedShiftId(shift.id);
      return; // ここで終了
    }
    const currentTarget = e.currentTarget; // ★要素を取得
    setDragInfo({
      id: shift.id,
      type,
      startY: e.clientY,
      startX: e.clientX,
      initStartMins: timeToMins(shift.startTime),
      initEndMins: timeToMins(shift.endTime),
      initDay: shift.day,
      initLane: shift.lane,
      targetElement: currentTarget, // ★dragInfoに要素を保存
    });
    setIsActuallyDragging(false);
    currentTarget.setPointerCapture(e.pointerId); // ★この要素にポインターを拘束
  };

  // 2. ドラッグ中：UIの即時更新
  const handlePointerMove = useCallback(
    (e) => {
      if (!dragInfo) return;
      const deltaY = e.clientY - dragInfo.startY;
      const deltaX = e.clientX - dragInfo.startX;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!isActuallyDragging) {
        if (distance > DRAG_THRESHOLD) {
          setIsActuallyDragging(true);
        } else {
          return;
        }
      }

      const deltaMins = Math.round(((deltaY / ROW_HEIGHT) * 30) / 5) * 5;
      const targetTd = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => el.tagName === 'TD' && el.dataset.day);

      setShifts((prev) =>
        prev.map((s) => {
          if (s.id !== dragInfo.id) return s;
          let nS = dragInfo.initStartMins,
            nE = dragInfo.initEndMins,
            nD = s.day,
            nL = s.lane;
          if (dragInfo.type === 'move') {
            nS += deltaMins;
            nE += deltaMins;
            if (targetTd) {
              nD = targetTd.dataset.day;
              nL = Number(targetTd.dataset.lane);
            }
          } else if (dragInfo.type === 'resize-top') {
            nS += deltaMins;
          } else if (dragInfo.type === 'resize-bottom') {
            nE += deltaMins;
          }
          const limitStart = timeToMins('09:00'),
            limitEnd = timeToMins('24:00');
          nS = Math.max(limitStart, Math.min(nS, nE - 15));
          nE = Math.min(limitEnd, Math.max(nE, nS + 15));
          const sStr = minsToTime(nS),
            eStr = minsToTime(nE);
          return {
            ...s,
            startTime: sStr,
            endTime: eStr,
            totalHours: calcTotalHours(sStr, eStr, s.breakHours),
            day: nD,
            lane: nL,
          };
        })
      );
    },
    [dragInfo, isActuallyDragging]
  );

  // 3. ドラッグ終了：Firebaseへの保存 (★重要)
  const handlePointerUp = useCallback(
    async (e) => {
      if (!dragInfo) return;

      // ポインターの拘束を解除
      if (
        dragInfo.targetElement &&
        dragInfo.targetElement.hasPointerCapture(e.pointerId)
      ) {
        dragInfo.targetElement.releasePointerCapture(e.pointerId);
      }

      // ドラッグ終了時の最新データを取得
      const draggedId = dragInfo.id;
      const finalShift = shifts.find((s) => s.id === draggedId);
      const wasDragging = isActuallyDragging;

      // 状態をリセット
      setDragInfo(null);
      setIsActuallyDragging(false);

      // ★実際に移動が行われていた場合のみFirebaseを更新
      if (wasDragging && finalShift) {
        try {
          const shiftRef = doc(db, 'shifts', draggedId);
          await updateDoc(shiftRef, {
            startTime: finalShift.startTime,
            endTime: finalShift.endTime,
            day: finalShift.day,
            lane: finalShift.lane,
            totalHours: finalShift.totalHours,
          });
          console.log('Firebase synced: ', finalShift.staffName);
        } catch (error) {
          console.error('Firebase update failed:', error);
        }
      }
    },
    [dragInfo, isActuallyDragging, shifts] // ★最新のshiftsを参照するために依存関係に追加
  );

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    handlePointerUp,
    handlePointerMove,
    handlePointerDownShift,
    dragInfo,
    isActuallyDragging,
  };
};
