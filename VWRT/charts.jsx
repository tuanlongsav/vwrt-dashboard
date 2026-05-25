// charts.jsx — chart primitives (sparkline, area, bars, gauge, radial)

const { useMemo, useRef, useEffect, useState } = React;

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = "currentColor", width = 120, height = 32, fill = false, strokeWidth = 1.5, dotted = false }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => [
    (i / (n - 1)) * width,
    height - ((v - min) / range) * height,
  ]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {fill && (
        <path d={`${d} L${width},${height} L0,${height} Z`} fill={color} opacity="0.12" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dotted ? "2 2" : "none"} />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

// ── Area chart with grid + axes ──────────────────────────────────────────────
function AreaChart({ data, color = "currentColor", width = 640, height = 200, unit = "", min: minProp, max: maxProp, label = "", live = false, formatValue }) {
  if (!data || data.length === 0) return null;
  const min = minProp != null ? minProp : Math.min(...data);
  const max = maxProp != null ? maxProp : Math.max(...data);
  const range = max - min || 1;
  const pad = { l: 36, r: 12, t: 14, b: 22 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const n = data.length;
  const pts = data.map((v, i) => [
    pad.l + (i / (n - 1)) * W,
    pad.t + H - ((v - min) / range) * H,
  ]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`)).join(" ");
  const last = pts[pts.length - 1];
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i) / ticks);
  const fmt = formatValue || ((v) => v.toFixed(0));
  return (
    <svg width={width} height={height} style={{ display: "block", maxWidth: "100%" }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* horizontal grid */}
      {yTicks.map((v, i) => {
        const y = pad.t + H - (i / ticks) * H;
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + W} y1={y} y2={y} stroke="currentColor" opacity="0.08" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5" fontFamily="ui-monospace,monospace">
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {/* x-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const x = pad.l + p * W;
        const t = Math.round((1 - p) * (n - 1) * 1.5);
        return (
          <text key={i} x={x} y={height - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5" fontFamily="ui-monospace,monospace">
            -{t}s
          </text>
        );
      })}
      <defs>
        <linearGradient id={`grad-${label.replace(/\W/g, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${d} L${pad.l + W},${pad.t + H} L${pad.l},${pad.t + H} Z`} fill={`url(#grad-${label.replace(/\W/g, "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {live && <circle cx={last[0]} cy={last[1]} r="3" fill={color}>
        <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>}
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── Bars (vertical) ──────────────────────────────────────────────────────────
function BarChart({ data, color = "currentColor", width = 640, height = 160, labels = [], unit = "" }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const pad = { l: 30, r: 8, t: 10, b: 22 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const bw = W / data.length * 0.72;
  const gap = W / data.length * 0.28;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", maxWidth: "100%" }}>
      {[0, 0.5, 1].map((p, i) => {
        const y = pad.t + H * (1 - p);
        return <line key={i} x1={pad.l} x2={pad.l + W} y1={y} y2={y} stroke="currentColor" opacity="0.08" />;
      })}
      {data.map((v, i) => {
        const h = (v / max) * H;
        const x = pad.l + i * (bw + gap) + gap / 2;
        const y = pad.t + H - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} fill={color} opacity="0.85" rx="1.5" />
            {labels[i] != null && i % 3 === 0 && (
              <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5" fontFamily="ui-monospace,monospace">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
      {[0, 0.5, 1].map((p, i) => {
        const v = max * p;
        const y = pad.t + H * (1 - p);
        return <text key={"yt" + i} x={pad.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5" fontFamily="ui-monospace,monospace">{Math.round(v)}</text>;
      })}
    </svg>
  );
}

// ── Radial gauge ─────────────────────────────────────────────────────────────
function Gauge({ value, max = 100, size = 110, color = "currentColor", track = "rgba(127,127,127,.2)", label, unit = "%", thickness = 8 }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={thickness} fill="none"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize={size * 0.22} fontWeight="700" fill="currentColor" fontFamily="ui-monospace,monospace">
        {Math.round(value)}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" fontSize={size * 0.10} fill="currentColor" opacity="0.55" fontFamily="ui-monospace,monospace">
        {unit}
      </text>
      {label && (
        <text x={size / 2} y={size - 4} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">{label}</text>
      )}
    </svg>
  );
}

// ── Signal bars (4 bars like phone signal) ───────────────────────────────────
function SignalBars({ strength = 4, color = "currentColor", height = 14 }) {
  // strength 0–5
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "flex-end", height }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          width: 3, height: (i / 5) * height,
          background: i <= strength ? color : "currentColor",
          opacity: i <= strength ? 1 : 0.18,
          borderRadius: 1,
        }} />
      ))}
    </span>
  );
}

// ── Horizontal bar (for top domains) ─────────────────────────────────────────
function HBar({ label, value, max, color = "currentColor", showValue = true }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12 }}>
      <span style={{ flex: "0 0 38%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "ui-monospace, monospace" }}>{label}</span>
      <span style={{ flex: 1, position: "relative", height: 18, background: "currentColor", opacity: 0.06, borderRadius: 3, overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, opacity: 0.85, borderRadius: 3, transition: "width .5s" }} />
      </span>
      {showValue && <span style={{ flex: "0 0 auto", fontFamily: "ui-monospace, monospace", fontVariantNumeric: "tabular-nums", opacity: 0.7, fontSize: 11 }}>{value.toLocaleString()}</span>}
    </div>
  );
}

// ── Signal heatmap (5x12 grid showing rsrp over time as cells) ───────────────
function Heatmap({ data, width = 320, height = 60, color = "currentColor" }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const cols = data.length;
  const cw = width / cols;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", maxWidth: "100%" }}>
      {data.map((v, i) => {
        const t = (v - min) / range;
        return <rect key={i} x={i * cw} y={0} width={cw - 1} height={height} fill={color} opacity={0.15 + t * 0.7} />;
      })}
    </svg>
  );
}

// expose
Object.assign(window, { Sparkline, AreaChart, BarChart, Gauge, SignalBars, HBar, Heatmap });
