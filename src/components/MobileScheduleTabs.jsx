import { useRef } from 'react';
import { getMobileTabFromSwipe } from '../utils/mobileTabSwipe';

export default function MobileScheduleTabs({ activeTab, onTabChange, t, children }) {
  const touchStart = useRef(null);

  const handleTouchStart = (event) => {
    touchStart.current = null;
    if (
      event.touches.length !== 1 ||
      window.matchMedia('(min-width: 768px)').matches ||
      event.target.closest('[data-table-scroll]')
    ) return;

    const { identifier, clientX, clientY } = event.touches[0];
    touchStart.current = { identifier, clientX, clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === start.identifier);
    if (!touch) return;

    const nextTab = getMobileTabFromSwipe(touch.clientX - start.clientX, touch.clientY - start.clientY);
    if (nextTab && nextTab !== activeTab) onTabChange(nextTab);
  };

  return (
    <>
      <div className="sticky top-28 z-40 grid h-10 grid-cols-2 border-b border-slate-200 bg-white md:hidden">
        {[
          ['shift', t.shiftTableTab],
          ['totals', t.totalsTab],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            aria-controls={`mobile-${tab}-panel`}
            aria-pressed={activeTab === tab}
            onClick={() => onTabChange(tab)}
            className={`border-b-2 text-sm font-bold ${
              activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="max-w-[1600px] mx-auto px-4 md:px-6 mt-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        {children}
      </div>
    </>
  );
}
