export function getMobileTabFromSwipe(deltaX, deltaY) {
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return null;
  return deltaX < 0 ? 'totals' : 'shift';
}
