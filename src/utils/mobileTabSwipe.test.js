import { describe, expect, it } from 'vitest';
import { getMobileTabFromSwipe } from './mobileTabSwipe';

describe('getMobileTabFromSwipe', () => {
  it.each([
    [-50, 5, 'totals'],
    [70, -12, 'shift'],
    [-49, 0, null],
    [8, 90, null],
    [65, -65, null],
    [-60, 75, null],
    [0, 0, null],
  ])('maps a touch delta of (%i, %i) to %s', (deltaX, deltaY, expected) => {
    expect(getMobileTabFromSwipe(deltaX, deltaY)).toBe(expected);
  });
});
