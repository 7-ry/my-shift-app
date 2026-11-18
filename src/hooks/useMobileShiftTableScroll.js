import { useLayoutEffect, useRef, useState } from 'react';
import { getWeekDates } from '../utils/helpers';
import { getInitialShiftDay, getVisibleShiftDays } from '../utils/shiftTableScroll';

export const useMobileShiftTableScroll = (weekId, days) => {
  const scrollRef = useRef(null);
  const timeHeaderRef = useRef(null);
  const [visibleDays, setVisibleDays] = useState([]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const timeHeader = timeHeaderRef.current;
    const dayHeaders = Array.from(scroller.querySelectorAll('th[data-day]'));
    const desktop = window.matchMedia('(min-width: 1024px)');
    let needsInitialScroll = true;

    const updateVisibleDay = () => {
      if (desktop.matches) return;
      const visibleLeft = timeHeader.getBoundingClientRect().right;
      const visibleRight = scroller.getBoundingClientRect().left +
        scroller.clientLeft + scroller.clientWidth;
      const columns = dayHeaders.map((header) => {
        const { left, right } = header.getBoundingClientRect();
        return { day: header.dataset.day, left, right };
      });
      const nextDays = getVisibleShiftDays(columns, visibleLeft, visibleRight);
      setVisibleDays((previous) =>
        previous.length === nextDays.length && previous.every((day, index) => day === nextDays[index])
          ? previous
          : nextDays
      );
    };

    const updateLayout = () => {
      if (desktop.matches || !scroller.clientWidth) return;

      if (needsInitialScroll) {
        needsInitialScroll = false;
        const initialDay = getInitialShiftDay(days, getWeekDates(weekId), new Date());
        const header = dayHeaders.find((item) => item.dataset.day === initialDay);
        if (header) {
          scroller.scrollLeft += header.getBoundingClientRect().left -
            timeHeader.getBoundingClientRect().right;
        }
      }
      updateVisibleDay();
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(scroller);
    observer.observe(scroller.querySelector('table'));
    desktop.addEventListener('change', updateLayout);
    scroller.addEventListener('scroll', updateVisibleDay, { passive: true });

    return () => {
      observer.disconnect();
      desktop.removeEventListener('change', updateLayout);
      scroller.removeEventListener('scroll', updateVisibleDay);
    };
  }, [weekId, days]);

  return { scrollRef, timeHeaderRef, visibleDays };
};
