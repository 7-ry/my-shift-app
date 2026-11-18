import { describe, expect, it } from 'vitest';
import { buildDashboardData, buildDashboardDataWithStreaks } from '../utils/dashboardData';
import { buildGASPayload } from './gasService';
import {
  formatTime12,
  getSheetCellByRow,
  getSheetRowNum,
  getWeekDisplayVerbose,
  timeToMins,
} from '../utils/helpers';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const helpers = {
  timeToMins,
  getSheetRowNum,
  formatTime12,
  getWeekDisplayVerbose,
  getSheetCellByRow: (day, row, lane) =>
    getSheetCellByRow(day, row, lane, DAYS),
};

const t = {
  met: 'MET',
  over: 'OVER',
  room: 'AVAIL',
};

const staffs = [
  { name: 'KANA', target: 8 },
  { name: 'RYUSHIN', target: 8 },
];

const buildPayload = (shifts, translations = t, staffRows = staffs, weekId = '2026-W19') =>
  buildGASPayload({
    shifts,
    staffs: staffRows,
    weekId,
    lang: 'en',
    t: translations,
    helpers,
  });

describe('buildGASPayload', () => {
  it('builds the expected top-level payload keys', () => {
    const payload = buildPayload([]);

    expect(Object.keys(payload)).toEqual([
      'weekId',
      'weekLabel',
      'scheduleCommands',
      'dashboardRows',
      'shiftDataRows',
    ]);
    expect(payload.weekId).toBe('2026-W19');
    expect(payload.weekLabel).toBe('May 4 - May 10');
  });

  it('appends one dashboard column and preserves the schedule and shift data shapes', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '11:00',
        lane: 1,
        breakHours: 0,
        totalHours: 2,
        color: '#bae6fd',
      },
    ]);

    expect(Object.keys(payload.scheduleCommands[0])).toEqual([
      'cell',
      'endCell',
      'value',
      'color',
    ]);
    expect(payload.dashboardRows.every((row) => row.length === 7)).toBe(true);
    expect(payload.shiftDataRows.every((row) => row.length === 7)).toBe(true);
  });

  it('maps MON lane 1 shifts to the expected schedule cells', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '11:00',
        lane: 1,
        breakHours: 0,
        totalHours: 2,
        color: '#bae6fd',
      },
    ]);

    expect(payload.scheduleCommands[0]).toMatchObject({
      cell: 'B5',
      endCell: 'B8',
      value: 'KANA\n9-11',
      color: '#bae6fd',
    });
  });

  it('preserves weekend row range behavior', () => {
    const payload = buildPayload([
      {
        day: 'SUN',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '22:00',
        lane: 4,
        breakHours: 0,
        totalHours: 13,
        color: '#bae6fd',
      },
    ]);

    expect(payload.scheduleCommands[0]).toMatchObject({
      cell: 'AI5',
      endCell: 'AI29',
    });
  });

  it('shortens drawEndTime only for the visible block when shifts overlap', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '12:00',
        lane: 1,
        breakHours: 0,
        totalHours: 3,
        color: '#bae6fd',
      },
      {
        day: 'MON',
        staffName: 'RYUSHIN',
        startTime: '10:00',
        endTime: '13:00',
        lane: 1,
        breakHours: 0,
        totalHours: 3,
        color: '#bbf7d0',
      },
    ]);

    expect(payload.scheduleCommands[0]).toMatchObject({
      cell: 'B5',
      endCell: 'B6',
      value: 'KANA\n9-12',
    });
    expect(payload.shiftDataRows[0]).toEqual([
      'MON',
      'KANA',
      '09:00',
      '12:00',
      1,
      0,
      3,
    ]);
  });

  it('uses extendedEndTime only in the display label', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '17:00',
        extendedEndTime: '18:00',
        lane: 1,
        breakHours: 0,
        totalHours: 8,
        color: '#bae6fd',
      },
    ]);

    expect(payload.scheduleCommands[0]).toMatchObject({
      cell: 'B5',
      endCell: 'B16',
      value: 'KANA\n9-5(6)',
    });
    expect(payload.shiftDataRows[0]).toEqual([
      'MON',
      'KANA',
      '09:00',
      '17:00',
      1,
      0,
      8,
    ]);
  });

  it('displays 30m for 0.5 breakHours', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '11:00',
        lane: 1,
        breakHours: 0.5,
        totalHours: 1.5,
        color: '#bae6fd',
      },
    ]);

    expect(payload.scheduleCommands[0].value).toBe('KANA\n9-11\n30m');
  });

  it('preserves the original shifts order in shiftDataRows', () => {
    const payload = buildPayload([
      {
        day: 'FRI',
        staffName: 'RYUSHIN',
        startTime: '13:00',
        endTime: '15:00',
        lane: 3,
        breakHours: 0,
        totalHours: 2,
        color: '#bbf7d0',
      },
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '11:00',
        lane: 1,
        breakHours: 0,
        totalHours: 2,
        color: '#bae6fd',
      },
    ]);

    expect(payload.shiftDataRows).toEqual([
      ['FRI', 'RYUSHIN', '13:00', '15:00', 3, 0, 2],
      ['MON', 'KANA', '09:00', '11:00', 1, 0, 2],
    ]);
  });

  it('uses the GAS-compatible OVER status for Japanese over rows', () => {
    const payload = buildPayload(
      [
        {
          day: 'MON',
          staffName: 'KANA',
          startTime: '09:00',
          endTime: '18:00',
          lane: 1,
          breakHours: 0,
          totalHours: 9,
          color: '#bae6fd',
        },
      ],
      {
        met: '達成',
        over: '超過',
        room: '追加可能',
      }
    );

    expect(payload.dashboardRows[0]).toEqual([
      'KANA',
      9,
      8,
      '',
      -1,
      '⚠️ OVER',
      9,
    ]);
  });

  it('sums multiple shifts for the same staff in dashboardRows', () => {
    const payload = buildPayload([
      {
        day: 'MON',
        staffName: 'KANA',
        startTime: '09:00',
        endTime: '11:00',
        lane: 1,
        breakHours: 0,
        totalHours: 2.25,
        color: '#bae6fd',
      },
      {
        day: 'TUE',
        staffName: 'KANA',
        startTime: '12:00',
        endTime: '15:00',
        lane: 1,
        breakHours: 0,
        totalHours: 3.5,
        color: '#bae6fd',
      },
    ]);

    expect(payload.dashboardRows[0]).toEqual([
      'KANA',
      5.75,
      8,
      '',
      2.25,
      'AVAIL',
      5.75,
    ]);
  });

  it('appends weighted hours while keeping the original columns based on raw hours', () => {
    const christmasShift = {
      day: 'FRI',
      staffName: 'KANA',
      startTime: '09:00',
      endTime: '13:00',
      lane: 1,
      breakHours: 0,
      totalHours: 4,
      color: '#bae6fd',
    };
    const boxingDayShift = {
      ...christmasShift,
      day: 'SAT',
      endTime: '12:00',
      totalHours: 3,
    };
    const payload = buildPayload([christmasShift, boxingDayShift], t, staffs, '2026-W52');

    expect(payload.dashboardRows[0]).toEqual(['KANA', 7, 8, '', 1, 'AVAIL', 9]);
    expect(payload.shiftDataRows.map((row) => row[6])).toEqual([4, 3]);
  });

  it('uses zero current hours for staff with no shifts', () => {
    const payload = buildPayload([], t, [{ name: 'NO_SHIFT', target: 6 }]);

    expect(payload.dashboardRows[0]).toEqual([
      'NO_SHIFT',
      0,
      6,
      '',
      6,
      'AVAIL',
      0,
    ]);
  });
});

it('uses both adjacent weeks for streaks while preserving totals and the GAS payload', () => {
  const weekId = '2026-W52';
  const shiftFor = (day, shiftWeekId, staffName) => ({
    day,
    weekId: shiftWeekId,
    staffName,
    startTime: '09:00',
    endTime: '11:00',
    lane: 1,
    breakHours: 0,
    totalHours: 2,
    color: '#bae6fd',
  });
  const shifts = [
    ...DAYS.slice(0, 3).map((day) => shiftFor(day, weekId, 'KANA')),
    ...DAYS.slice(4).map((day) => shiftFor(day, weekId, 'RYUSHIN')),
  ];
  const adjacentShifts = [
    ...DAYS.slice(4).map((day) => shiftFor(day, '2026-W51', 'KANA')),
    ...DAYS.slice(0, 3).map((day) => shiftFor(day, '2026-W53', 'RYUSHIN')),
  ];

  const payloadBefore = buildPayload(shifts, t, staffs, weekId);
  const totalsBefore = buildDashboardData(staffs, shifts, weekId);
  const dashboard = buildDashboardDataWithStreaks(staffs, shifts, weekId, adjacentShifts);

  expect(dashboard).toEqual(totalsBefore.map((totals, index) => ({
    ...totals,
    longestStreak: 6,
    hasSixDayStreak: true,
    streakEndDate: index === 0 ? new Date(2026, 11, 23) : new Date(2026, 11, 30),
  })));
  expect(buildPayload(shifts, t, staffs, weekId)).toEqual(payloadBefore);
});
