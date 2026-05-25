/**
 * UI — visual primitives ported from VWRT/charts.jsx + screens.jsx
 *
 * Each helper returns an HTML/SVG string the caller can drop into innerHTML.
 * Pure functions, no DOM access. Designed to play with the design.css token
 * system (vars like --accent, --info, --warn, --danger, --text-dim).
 *
 *   UI.pill(text, tone)             → small badge with status dot
 *   UI.gauge(percent, opts)         → circular progress SVG with center value
 *   UI.signalBars(strength, opts)   → 5-bar cellular indicator
 *   UI.sparkline(data, opts)        → tiny line chart for trends
 *   UI.areaChart(data, opts)        → larger area chart with grid + Y labels
 *   UI.statCard(opts)               → label + big value + sparkline card
 *   UI.mini(label, value, opts)     → small label/value pair
 */
(function () {
    'use strict';

    function esc(s) {
        if (window.Security && Security.escapeHtml) return Security.escapeHtml(String(s ?? ''));
        return String(s ?? '').replace(/[&<>"']/g, ch =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    // ----------------------------------------------------------------------
    // Pill — colored badge with leading dot. Tones map to CSS classes from
    // design.css (.tag-ok / .tag-info / .tag-warn / .tag-danger).
    // ----------------------------------------------------------------------
    function pill(text, tone) {
        tone = tone || '';
        return `<span class="tag tag-${esc(tone)}"><span class="dot"></span>${esc(text)}</span>`;
    }

    // ----------------------------------------------------------------------
    // Gauge — circular percentage ring. Matches charts.jsx exactly.
    // ----------------------------------------------------------------------
    function gauge(value, opts) {
        opts = opts || {};
        const max       = opts.max       || 100;
        const size      = opts.size      || 110;
        const color     = opts.color     || 'var(--accent)';
        const track     = opts.track     || 'var(--border)';
        const label     = opts.label     || '';
        const unit      = opts.unit != null ? opts.unit : '%';
        const thickness = opts.thickness || 8;

        const r   = (size - thickness) / 2;
        const c   = 2 * Math.PI * r;
        const pct = Math.max(0, Math.min(1, value / max));
        const arc = (c * pct).toFixed(2);

        const cx = size / 2, cy = size / 2;
        const valueText = Math.round(value);
        const fs = (size * 0.22).toFixed(0);
        const lfs = (size * 0.10).toFixed(0);

        return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;">
                <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${track}" stroke-width="${thickness}" fill="none"/>
                <circle cx="${cx}" cy="${cy}" r="${r}"
                        stroke="${color}" stroke-width="${thickness}" fill="none"
                        stroke-dasharray="${arc} ${c.toFixed(2)}"
                        stroke-linecap="round"
                        transform="rotate(-90 ${cx} ${cy})"
                        style="transition: stroke-dasharray 0.6s ease;"/>
                <text x="${cx}" y="${cy - 2}" text-anchor="middle"
                      font-size="${fs}" font-weight="700"
                      fill="currentColor" font-family="ui-monospace, monospace">${valueText}${esc(unit)}</text>
                ${label ? `<text x="${cx}" y="${cy + size * 0.18}" text-anchor="middle"
                              font-size="${lfs}" fill="currentColor" opacity="0.55"
                              font-family="ui-monospace, monospace">${esc(label)}</text>` : ''}
            </svg>
        `;
    }

    // ----------------------------------------------------------------------
    // SignalBars — 5 increasing bars indicating cellular strength.
    // strength is 0..5.
    // ----------------------------------------------------------------------
    function signalBars(strength, opts) {
        opts = opts || {};
        const color  = opts.color  || 'var(--ok)';
        const height = opts.height || 14;
        const s      = Math.max(0, Math.min(5, Math.round(strength)));

        let bars = '';
        for (let i = 1; i <= 5; i++) {
            const h = ((i / 5) * height).toFixed(1);
            const on = i <= s;
            bars += `<span style="
                width:3px; height:${h}px;
                background:${on ? color : 'currentColor'};
                opacity:${on ? 1 : 0.18};
                border-radius:1px;
            "></span>`;
        }
        return `<span style="display:inline-flex; gap:2px; align-items:flex-end; height:${height}px;">${bars}</span>`;
    }

    // Convert RSRP (dBm) into a 0–5 bar strength. Maps:
    //   -65 or better → 5
    //   -75 → 4
    //   -85 → 3
    //   -95 → 2
    //   -105 → 1
    //   -120 or worse → 0
    function rsrpToBars(rsrp) {
        const v = Number(rsrp);
        if (isNaN(v)) return 0;
        if (v >= -65)  return 5;
        if (v >= -75)  return 4;
        if (v >= -85)  return 3;
        if (v >= -95)  return 2;
        if (v >= -105) return 1;
        return 0;
    }

    // ----------------------------------------------------------------------
    // Sparkline — small line chart, no axes
    // ----------------------------------------------------------------------
    function sparkline(data, opts) {
        opts = opts || {};
        const w     = opts.width  || 120;
        const h     = opts.height || 32;
        const color = opts.color  || 'var(--accent)';

        if (!Array.isArray(data) || data.length < 2) {
            return `<svg width="${w}" height="${h}"></svg>`;
        }

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const pts = data.map((v, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        return `
            <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;">
                <polyline fill="none" stroke="${color}" stroke-width="1.5"
                          stroke-linecap="round" stroke-linejoin="round"
                          points="${pts.join(' ')}"/>
            </svg>
        `;
    }

    // ----------------------------------------------------------------------
    // AreaChart — line + filled gradient, with horizontal grid + Y labels
    // ----------------------------------------------------------------------
    function areaChart(data, opts) {
        opts = opts || {};
        const w       = opts.width  || 520;
        const h       = opts.height || 110;
        const color   = opts.color  || 'var(--info)';
        const minProp = opts.min;
        const maxProp = opts.max;
        const formatV = opts.formatValue || ((v) => Math.round(v));

        if (!Array.isArray(data) || data.length < 2) {
            return `<svg width="${w}" height="${h}"></svg>`;
        }
        const min = (minProp != null) ? minProp : Math.min(...data);
        const max = (maxProp != null) ? maxProp : Math.max(...data);
        const range = max - min || 1;

        const pad = { l: 36, r: 12, t: 14, b: 22 };
        const W = w - pad.l - pad.r;
        const H = h - pad.t - pad.b;

        const pts = data.map((v, i) => [
            pad.l + (i / (data.length - 1)) * W,
            pad.t + H - ((v - min) / range) * H,
        ]);

        const path = pts.map(([x, y], i) =>
            (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)).join(' ');

        // Filled area below the line
        const lastX = pts[pts.length - 1][0].toFixed(1);
        const firstX = pts[0][0].toFixed(1);
        const baseY = (pad.t + H).toFixed(1);
        const area = `${path} L${lastX},${baseY} L${firstX},${baseY} Z`;

        // Y-axis labels
        const ticks = 4;
        let yLabels = '';
        let grid = '';
        for (let i = 0; i <= ticks; i++) {
            const tickVal = min + (range * i) / ticks;
            const y = (pad.t + H - (i / ticks) * H).toFixed(1);
            yLabels += `<text x="${pad.l - 6}" y="${parseFloat(y) + 3}"
                              text-anchor="end" font-size="9"
                              fill="currentColor" opacity="0.5"
                              font-family="ui-monospace, monospace">${formatV(tickVal)}</text>`;
            grid += `<line x1="${pad.l}" x2="${(pad.l + W).toFixed(1)}"
                            y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="0.08"/>`;
        }

        const gradId = 'g' + Math.floor(Math.random() * 1e9);
        return `
            <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
                 preserveAspectRatio="none" style="display:block; max-width:100%;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                ${grid}
                <path d="${area}" fill="url(#${gradId})"/>
                <path d="${path}" fill="none" stroke="${color}" stroke-width="1.6"
                      stroke-linecap="round" stroke-linejoin="round"/>
                ${yLabels}
            </svg>
        `;
    }

    // ----------------------------------------------------------------------
    // StatCard — label + big value + sparkline. Matches screens.jsx StatCard.
    // ----------------------------------------------------------------------
    function statCard(opts) {
        const { label, value, unit, sub, color, sparkData, live } = opts;
        const colorVar = color || 'var(--accent)';
        const liveDot  = live ? `<span class="dot live" style="background:${colorVar}; box-shadow:0 0 6px ${colorVar};"></span>` : '';
        const spark    = (Array.isArray(sparkData) && sparkData.length > 1)
                            ? sparkline(sparkData, { color: colorVar, width: 100, height: 24 })
                            : '';
        return `
            <div class="card stat-card">
                <div class="metric-label" style="display:flex; align-items:center; gap:6px;">
                    ${liveDot}<span>${esc(label || '')}</span>
                </div>
                <div style="display:flex; align-items:flex-end; justify-content:space-between; margin-top:6px;">
                    <div>
                        <span class="metric-value" style="color:${colorVar};">${esc(value)}</span>
                        ${unit ? `<span class="metric-unit dim">${esc(unit)}</span>` : ''}
                    </div>
                    <div style="color:${colorVar};">${spark}</div>
                </div>
                ${sub ? `<div class="dim tiny" style="margin-top:4px;">${esc(sub)}</div>` : ''}
            </div>
        `;
    }

    // ----------------------------------------------------------------------
    // Mini — tiny label/value pair (used inside cards)
    // ----------------------------------------------------------------------
    function mini(label, value, opts) {
        opts = opts || {};
        const colorVar = opts.color || 'var(--text)';
        return `
            <div class="mini">
                <div class="metric-label" style="font-size:11px;">${esc(label)}</div>
                <div style="font-weight:700; font-family:var(--font-mono); color:${colorVar};">${esc(value)}</div>
            </div>
        `;
    }

    // Public API
    window.UI = {
        esc:         esc,
        pill:        pill,
        gauge:       gauge,
        signalBars:  signalBars,
        rsrpToBars:  rsrpToBars,
        sparkline:   sparkline,
        areaChart:   areaChart,
        statCard:    statCard,
        mini:        mini,
    };
})();
