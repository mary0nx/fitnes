import { useId } from 'react';

export interface Point { label: string; value: number }

/** Линейный график с заливкой (SVG, без библиотек). */
export function LineChart({ points, height = 150, unit = '', color = '#EE4E95', target, digits = 1 }: {
  points: Point[]; height?: number; unit?: string; color?: string; target?: number; digits?: number;
}) {
  const id = useId();
  const W = 320, H = height, L = 30, R = 10, T = 12, B = 22;
  if (!points.length) return null;
  const vals = points.map((p) => p.value).concat(target !== undefined ? [target] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.18;
  min -= pad; max += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
  const ticks = [0, 1, 2, 3].map((i) => min + pad + ((max - min - 2 * pad) * i) / 3);
  const every = Math.ceil(points.length / 5);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 6} y={y(t) + 3.5} textAnchor="end">{t.toFixed(digits === 0 ? 0 : t % 1 === 0 ? 0 : 1)}</text>
        </g>
      ))}
      {target !== undefined ? (
        <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke={color} strokeDasharray="4 5" strokeWidth="1.3" opacity="0.6" />
      ) : null}
      {points.length > 1 ? <path d={area} fill={`url(#${id})`} /> : null}
      {points.length > 1 ? <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {points.map((p, i) => (
        <g key={i}>
          {(points.length <= 14 || i === points.length - 1) ? <circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3.5} fill="#fff" stroke={color} strokeWidth="2.4" /> : null}
          {i % every === 0 || i === points.length - 1 ? <text x={x(i)} y={H - 6} textAnchor="middle">{p.label}</text> : null}
        </g>
      ))}
      <title>{points.map((p) => `${p.label}: ${p.value}${unit}`).join(', ')}</title>
    </svg>
  );
}

/** Столбики (активность по неделям). */
export function BarChart({ points, height = 120, color = '#EE4E95' }: { points: Point[]; height?: number; color?: string }) {
  const W = 320, H = height, B = 20, T = 14;
  const max = Math.max(1, ...points.map((p) => p.value));
  const bw = Math.min(34, (W / points.length) * 0.56);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      {points.map((p, i) => {
        const cx = (W / points.length) * (i + 0.5);
        const h = Math.max(4, ((H - B - T) * p.value) / max);
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={H - B - h} width={bw} height={h} rx={Math.min(8, bw / 2)} fill={p.value ? color : 'var(--field)'} opacity={i === points.length - 1 ? 1 : 0.55} />
            {p.value ? <text x={cx} y={H - B - h - 4} textAnchor="middle" style={{ fontWeight: 800, fill: 'var(--text)' }}>{p.value}</text> : null}
            <text x={cx} y={H - 5} textAnchor="middle">{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
