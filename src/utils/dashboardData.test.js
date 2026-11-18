import { describe, expect, it } from 'vitest';
import { buildDashboardData } from './dashboardData';

describe('buildDashboardData', () => {
  it('preserves staff order and includes current dashboard fields', () => {
    const staffs = [
      { name: 'KANA', color: '#bae6fd', target: 8, order: 0 },
      { name: 'RYUSHIN', color: '#bbf7d0', target: 6, order: 1 },
    ];
    const shifts = [
      { staffName: 'RYUSHIN', totalHours: 2 },
      { staffName: 'KANA', totalHours: 3 },
    ];

    expect(buildDashboardData(staffs, shifts)).toEqual([
      {
        name: 'KANA',
        color: '#bae6fd',
        target: 8,
        order: 0,
        rawHours: 3,
        statHours: 0,
        weightedHours: 3,
        currentHours: 3,
        remaining: 5,
        progressPercent: 37.5,
      },
      {
        name: 'RYUSHIN',
        color: '#bbf7d0',
        target: 6,
        order: 1,
        rawHours: 2,
        statHours: 0,
        weightedHours: 2,
        currentHours: 2,
        remaining: 4,
        progressPercent: 33.33333333333333,
      },
    ]);
  });

  it('sums only shifts matching staffName', () => {
    const staffs = [{ name: 'KANA', target: 8 }];
    const shifts = [
      { staffName: 'KANA', totalHours: 2 },
      { staffName: 'KANA', totalHours: 3 },
      { staffName: 'SAYAKA', totalHours: 4 },
    ];

    expect(buildDashboardData(staffs, shifts)[0]).toMatchObject({
      currentHours: 5,
      remaining: 3,
      progressPercent: 62.5,
    });
  });

  it('weights Christmas Day hours and counts Boxing Day and ordinary shifts at face value', () => {
    const staffs = [{ name: 'KANA', target: 16 }];
    const shifts = [
      { staffName: 'KANA', day: 'FRI', weekId: '2026-W52', totalHours: 4 },
      { staffName: 'KANA', day: 'SAT', weekId: '2026-W52', totalHours: 3 },
      { staffName: 'KANA', day: 'THU', weekId: '2026-W52', totalHours: 1 },
    ];

    expect(buildDashboardData(staffs, shifts)[0]).toMatchObject({
      rawHours: 8,
      statHours: 4,
      weightedHours: 10,
      currentHours: 10,
      remaining: 6,
      progressPercent: 62.5,
    });
  });

  it('uses the shift week across a calendar year boundary and rounds the weighted sum once', () => {
    const staffs = [{ name: 'KANA', target: 8 }];
    const shifts = [
      { staffName: 'KANA', day: 'FRI', weekId: '2026-W53', totalHours: 1.236 },
      { staffName: 'KANA', day: 'SAT', weekId: '2026-W53', totalHours: 2.35 },
    ];

    expect(buildDashboardData(staffs, shifts, '2027-W01')[0]).toMatchObject({
      rawHours: 3.59,
      statHours: 1.24,
      weightedHours: 4.2,
      currentHours: 4.2,
    });
  });

  it('preserves current rounding and flooring behavior', () => {
    const staffs = [{ name: 'KANA', target: 8 }];
    const shifts = [
      { staffName: 'KANA', totalHours: 1.234 },
      { staffName: 'KANA', totalHours: 2.345 },
    ];

    expect(buildDashboardData(staffs, shifts)[0]).toMatchObject({
      currentHours: 3.58,
      remaining: 4.42,
      progressPercent: 44.75,
    });
  });

  it('caps progressPercent at 100', () => {
    const staffs = [{ name: 'KANA', target: 8 }];
    const shifts = [{ staffName: 'KANA', totalHours: 10 }];

    expect(buildDashboardData(staffs, shifts)[0]).toMatchObject({
      currentHours: 10,
      remaining: -2,
      progressPercent: 100,
    });
  });
});
