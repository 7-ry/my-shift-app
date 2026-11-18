import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { addDoc, updateDoc } from 'firebase/firestore';
import { ROW_HEIGHT, DRAG_THRESHOLD, translations } from '../constants/config';
import { calcTotalHours, minsToTime, timeToMins } from '../utils/helpers';
import { useEditShiftActions } from './useEditShiftActions';
import { useShiftCreation } from './useShiftCreation';
import { useShiftDrag } from './useShiftDrag';

vi.mock('react', () => ({
  useState: vi.fn(),
  useCallback: (callback) => callback,
  useEffect: vi.fn(),
}));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'new' }),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

const timeHelpers = { timeToMins, minsToTime, calcTotalHours };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shift drag table hours', () => {
  it.each([
    ['move', '22:30'],
    ['resize-bottom', '22:30'],
    ['resize-top', '23:00'],
  ])('clamps a downward %s before writing', async (type, expectedStart) => {
    const shift = { id: 'shift', startTime: '22:30', endTime: '23:30', day: 'MON', lane: 1 };
    const expectedTimes = { startTime: expectedStart, endTime: '23:30' };
    const targetElement = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
    };
    let shifts = [shift];
    let dragInfo = null;
    let isDragging = false;
    const renderHook = () => {
      vi.mocked(useState)
        .mockReturnValueOnce([dragInfo, (value) => {
          dragInfo = value;
        }])
        .mockReturnValueOnce([isDragging, (value) => {
          isDragging = value;
        }]);
      // eslint-disable-next-line react-hooks/rules-of-hooks -- React hooks are mocked in this harness.
      return useShiftDrag({
        ...timeHelpers,
        shifts,
        setShifts: (update) => { shifts = update(shifts); },
        selectedShiftId: shift.id,
        ROW_HEIGHT,
        DRAG_THRESHOLD,
      });
    };
    vi.stubGlobal('document', { elementsFromPoint: () => [] });

    renderHook().handlePointerDownShift({
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      currentTarget: targetElement,
      stopPropagation: vi.fn(),
    }, shift, type);
    renderHook().handlePointerMove({ clientX: 0, clientY: ROW_HEIGHT });
    expect(shifts[0]).toMatchObject(expectedTimes);
    await renderHook().handlePointerUp({ pointerId: 1 });
    expect(updateDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining(expectedTimes)
    );
  });
});

describe('edit-save table hours', () => {
  it.each([
    ['22:00', '02:00'],
    ['12:00', '12:00'],
    ['12:00', '11:59'],
  ])('rejects %s–%s before writing', async (startTime, endTime) => {
    const alert = vi.fn();
    vi.stubGlobal('window', { alert });
    const setEditingShift = vi.fn();
    const setIsProcessing = vi.fn();
    const { onSave } = useEditShiftActions({
      editingShift: { id: 'shift', startTime, endTime },
      setEditingShift,
      setIsProcessing,
      calcTotalHours,
      t: translations.en,
    });

    await onSave();

    expect(alert).toHaveBeenCalledWith(translations.en.invalidTableHours);
    expect(setEditingShift).not.toHaveBeenCalled();
    expect(setIsProcessing).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});

it('rejects an invalid creation slot and keeps the 23:30 cap for a valid one', async () => {
  const { handleAddShift } = useShiftCreation({
    ...timeHelpers,
    selectedStaff: 'Staff',
    staffs: [{ name: 'Staff', color: '#000' }],
    setIsProcessing: vi.fn(),
    setShifts: vi.fn(),
  });

  await handleAddShift('MON', '23:30', 1);
  expect(addDoc).not.toHaveBeenCalled();

  await handleAddShift('MON', '23:00', 1);
  expect(addDoc).toHaveBeenCalledWith(
    undefined,
    expect.objectContaining({ startTime: '23:00', endTime: '23:30', totalHours: 0.5 })
  );
});
