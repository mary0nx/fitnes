import { useEffect, useRef } from 'react';

const H = 56;

/** Колесо выбора значения (scroll-snap, работает пальцем, колесом мыши и клавиатурой). */
export function Wheel({ min, max, value, onChange, label }: { min: number; max: number; value: number; onChange: (v: number) => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = (value - min) * H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const v = Math.max(min, Math.min(max, min + Math.round(el.scrollTop / H)));
    if (v !== value) onChange(v);
    clearTimeout(timer.current);
  };
  const go = (v: number) => {
    const nv = Math.max(min, Math.min(max, v));
    ref.current?.scrollTo({ top: (nv - min) * H, behavior: 'smooth' });
  };

  return (
    <div className="wheel">
      <div className="wheel-hi" />
      <div
        className="wheel-scroll" ref={ref} onScroll={onScroll} tabIndex={0} role="spinbutton"
        aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); go(value - 1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); go(value + 1); }
        }}
      >
        {items.map((n) => (
          <div key={n} className={`wheel-item num ${n === value ? 'on' : ''}`} onClick={() => go(n)}>{n}</div>
        ))}
      </div>
    </div>
  );
}
