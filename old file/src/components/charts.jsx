import { useLayoutEffect, useRef, useState } from 'react';
import { moneyShort } from '../lib/format.js';

/* Lightweight SVG charts, no charting library needed. */

export const CATEGORY_COLORS = {
  vehicles: 'var(--cat-vehicles)',
  parts: 'var(--cat-parts)',
  services: 'var(--cat-services)',
  haulage: 'var(--cat-haulage)',
  insurance: 'var(--cat-insurance)',
};

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Stacked bars, one per period.
 * data: [{ label, tooltipLabel, [key]: number }], keys: [{ key, label, color }]
 */
export function StackedBars({ data, keys, height = 260, format = moneyShort }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { t: 12, r: 8, b: 26, l: 62 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const totals = data.map((d) => keys.reduce((s, k) => s + d[k.key], 0));
  const max = niceMax(Math.max(...totals));
  const step = innerW / data.length;
  const barW = Math.min(36, step * 0.62);
  const y = (v) => innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Gross merchandise value by week and category">
          <g transform={`translate(${pad.l},${pad.t})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} className="chart__grid" />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              let acc = 0;
              const x = i * step + (step - barW) / 2;
              return (
                <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.45}>
                  <rect x={i * step} y={0} width={step} height={innerH} fill="transparent" />
                  {keys.map((k) => {
                    const v = d[k.key];
                    const top = y(acc + v);
                    const h = y(acc) - top;
                    acc += v;
                    return <rect key={k.key} x={x} y={top + 1} width={barW} height={Math.max(0, h - 1)} fill={k.color} rx={1.5} />;
                  })}
                  {(i % Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64))) === 0 || i === data.length - 1) && (
                    <text x={x + barW / 2} y={innerH + 18} textAnchor="middle" className="chart__tick">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="chart__tooltip"
          style={{
            left: Math.min(width - 190, Math.max(0, pad.l + hover * step + step / 2 - 95)),
            top: 4,
          }}
        >
          <strong>{data[hover].tooltipLabel || data[hover].label}</strong>
          {[...keys].reverse().map((k) => (
            <div key={k.key} className="chart__tooltip-row">
              <span className="swatch" style={{ background: k.color }} />
              <span>{k.label}</span>
              <span className="num">{format(data[hover][k.key])}</span>
            </div>
          ))}
          <div className="chart__tooltip-row chart__tooltip-total">
            <span />
            <span>Total</span>
            <span className="num">{format(totals[hover])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Legend({ keys }) {
  return (
    <ul className="legend">
      {keys.map((k) => (
        <li key={k.key}>
          <span className="swatch" style={{ background: k.color }} />
          {k.label}
        </li>
      ))}
    </ul>
  );
}

/** Area line for a single daily series, with hover readout. */
export function AreaLine({ data, height = 120, format = (v) => v.toLocaleString(), label }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { t: 8, r: 4, b: 4, l: 4 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals) * 0.92;
  const max = Math.max(...vals) * 1.03;
  const x = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - ((v - min) / (max - min)) * h;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const area = `${line}L${w},${h}L0,${h}Z`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - pad.l) / w) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={label}>
          <g transform={`translate(${pad.l},${pad.t})`}>
            <path d={area} className="chart__area" />
            <path d={line} className="chart__line" />
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} className="chart__cursor" />
                <circle cx={x(hover)} cy={y(data[hover].value)} r={4} className="chart__dot" />
              </>
            )}
          </g>
        </svg>
      )}
      {hover !== null && (
        <div className="chart__tooltip chart__tooltip--small" style={{ left: Math.min(width - 130, Math.max(0, x(hover) - 60)), top: 0 }}>
          <strong>{format(data[hover].value)}</strong>
          <span>{new Date(data[hover].day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </div>
  );
}

/** Horizontal share bars: [{ key, label, value, color, extra }] */
export function ShareBars({ items, format = moneyShort }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="share">
      {items.map((it) => (
        <li key={it.key}>
          <div className="share__top">
            <span className="share__label">
              <span className="swatch" style={{ background: it.color }} />
              {it.label}
            </span>
            <span className="num">{format(it.value)}</span>
          </div>
          <div className="share__track">
            <div className="share__fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />
          </div>
          <div className="share__meta">
            <span>{((it.value / total) * 100).toFixed(1)}% of GMV</span>
            {it.extra}
          </div>
        </li>
      ))}
    </ul>
  );
}
