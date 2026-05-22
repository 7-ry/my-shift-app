import { useState } from 'react';
import { getCurrentWeekId } from '../utils/helpers';

export const useWeekNavigation = () => {
  const [weekId, setWeekId] = useState(
    () => localStorage.getItem('lastViewedWeek') || getCurrentWeekId()
  );

  const changeWeek = (offset) => {
    const [year, week] = weekId.split('-W').map(Number);
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    date.setDate(date.getDate() + offset * 7);
    setWeekId(getCurrentWeekId(date));
  };

  const jumpToToday = () => setWeekId(getCurrentWeekId());

  return { weekId, setWeekId, changeWeek, jumpToToday };
};
