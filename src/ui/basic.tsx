import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, Minus, Plus, X } from 'lucide-react';
import { create } from 'zustand';
import { back } from '../router';
import { thumbUrl } from '../data/exercises';

/* ---------- шапка ---------- */
export function Header({ title, sub, onBack, right, large }: { title: ReactNode; sub?: ReactNode; onBack?: (() => void) | true; right?: ReactNode; large?: boolean }) {
  return (
    <div className={`header ${large ? '' : 'center'}`}>
      {onBack ? (
        <button className="icon-btn" aria-label="Назад" onClick={() => (onBack === true ? back() : onBack())}><ChevronLeft size={22} /></button>
      ) : !large ? <div className="spacer" /> : null}
      <div className="grow">
        <h1 className="ellipsis">{title}</h1>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {right ?? (!large ? <div className="spacer" /> : null)}
    </div>
  );
}

/* ---------- нижний лист ---------- */
export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn sm" aria-label="Закрыть" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div style={{ padding: '4px 18px calc(var(--safe-b) + 16px)' }}>{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---------- сегменты ---------- */
export function Seg<T extends string | number>({ value, onChange, options, pink }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; pink?: boolean }) {
  return (
    <div className={`seg ${pink ? 'pink' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

/* ---------- степпер ---------- */
export function Stepper({ value, onChange, step = 1, min = 0, max = 999, unit, digits = 0, label }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; digits?: number; label?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const shown = text ?? (digits ? value.toFixed(digits).replace(/\.0+$/, '') : String(Math.round(value * 10) / 10));
  const commit = () => {
    if (text === null) return;
    const v = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(v)) onChange(clamp(v));
    setText(null);
  };
  return (
    <div className="stepper">
      <button aria-label={`${label ?? ''} −`} onClick={() => onChange(clamp(value - step))}><Minus size={16} /></button>
      <input
        inputMode="decimal" aria-label={label} value={shown}
        onChange={(e) => setText(e.target.value)} onBlur={commit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {unit ? <span className="u">{unit}</span> : null}
      <button aria-label={`${label ?? ''} +`} onClick={() => onChange(clamp(value + step))}><Plus size={16} /></button>
    </div>
  );
}

/* ---------- кольцо прогресса ---------- */
export function Ring({ value, size = 120, stroke = 11, children, color = 'url(#ring-grad)', track = 'var(--field)' }: {
  value: number; size?: number; stroke?: number; children?: ReactNode; color?: string; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F9A0C8" /><stop offset="1" stopColor="#EC4B93" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="inner">{children}</div>
    </div>
  );
}

export function Bar({ value, cls = '' }: { value: number; cls?: string }) {
  return <div className={`bar ${cls}`}><i style={{ width: `${Math.max(0, Math.min(1, value || 0)) * 100}%` }} /></div>;
}

/* ---------- миниатюра упражнения ---------- */
export function Thumb({ id, size = '', style }: { id: string; size?: 'lg' | 'sm' | ''; style?: CSSProperties }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`thumb ${size}`} style={style}>
      {ok ? <img src={thumbUrl(id)} alt="" loading="lazy" onError={() => setOk(false)} /> : null}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <div className="bold" style={{ color: 'var(--text)' }}>{title}</div>
      {text ? <div className="small">{text}</div> : null}
      {action}
    </div>
  );
}

/* ---------- тосты ---------- */
const useToast = create<{ msg: string | null; id: number }>(() => ({ msg: null, id: 0 }));
export const toast = (msg: string) => useToast.setState((s) => ({ msg, id: s.id + 1 }));
export function ToastHost() {
  const { msg, id } = useToast();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => useToast.setState({ msg: null }), 2400);
    return () => clearTimeout(t);
  }, [msg, id]);
  return msg ? <div className="toast" key={id} role="status">{msg}</div> : null;
}

/* ---------- подтверждение ---------- */
export function Confirm({ title, text, yes, no, danger, onYes, onNo }: { title: string; text?: string; yes: string; no: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Sheet title={title} onClose={onNo}>
      {text ? <p className="muted" style={{ lineHeight: 1.45 }}>{text}</p> : null}
      <button className={`btn block ${danger ? 'danger' : 'primary'}`} onClick={onYes}>{yes}</button>
      <button className="btn block soft md" onClick={onNo}>{no}</button>
    </Sheet>
  );
}

/** значение с задержкой анимации (счётчик) */
export function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current, start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - (1 - k) ** 3;
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
