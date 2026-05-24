/**
 * UtilCards — dashboard utility cards (Network status, MultiWAN, AdBlock, Tailscale).
 *
 * These were previously hidden in the left sidebar; now they live on the
 * Dashboard so users see live state without opening the menu.
 *
 * Each card has a short summary that polls every 10s, plus a click action
 * that opens the existing full-modal modules (NetworkModule, Mwan3Module,
 * AdBlockModule, TailscaleModule). No backend changes required — we just
 * surface a slice of what those modules already fetch.
 */
const UtilCards = {

    POLL_INTERVAL: 10000,
    _timer: null,

    init: function () {
        this.refresh();
        if (!this._timer) {
            this._timer = setInterval(() => this.refresh(), this.POLL_INTERVAL);
        }
    },

    refresh: function () {
        this.refreshMwan3();
        this.refreshTailscale();
        this.refreshAdguard();
    },

    // ---------- Click handlers — delegate to existing modules ----------

    openMwan3:      function () { if (typeof Mwan3Module     !== 'undefined') Mwan3Module.showModal();     },
    openTailscale:  function () { if (typeof TailscaleModule !== 'undefined') TailscaleModule.showModal(); },

    // AdGuard Home: open its web UI on the detected port (defaults to 3000).
    openAdGuard: function () {
        const host = window.location.hostname;
        const port = this._aghPort || 3000;
        window.open(`http://${host}:${port}/`, '_blank');
    },

    // Generic HTML-escape (used by all cards) and number formatter for big counts
    _esc: function (v) {
        if (window.Security && Security.escapeHtml) return Security.escapeHtml(String(v ?? ''));
        return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    },
    _fmtNum: function (n) {
        n = Number(n) || 0;
        if (n < 1000)       return n.toString();
        if (n < 1_000_000)  return (n/1000).toFixed(n < 10_000 ? 1 : 0) + 'K';
        return (n/1_000_000).toFixed(n < 10_000_000 ? 1 : 0) + 'M';
    },

    // ---------- MultiWAN card ----------
    refreshMwan3: function () {
        fetch('/cgi-bin/mwan3/status')
            .then(r => r.json())
            .then(data => {
                const listEl    = document.getElementById('util-mwan-list');
                const statusEl  = document.getElementById('util-mwan-status');
                const summaryEl = document.getElementById('util-mwan-summary');
                if (!listEl) return;

                const ifaces = data.interfaces || {};
                const names = Object.keys(ifaces);
                if (names.length === 0) {
                    listEl.innerHTML = '<div style="text-align:center; color:#999; padding:15px; font-size:14px;">mwan3 chưa cài / chưa cấu hình</div>';
                    if (statusEl)  statusEl.innerText = 'N/A';
                    if (summaryEl) summaryEl.innerText = 'Chưa cấu hình';
                    return;
                }

                const onlineCount = names.filter(n => (ifaces[n].status || '').toLowerCase() === 'online').length;
                if (statusEl)  statusEl.innerText = `${onlineCount}/${names.length}`;
                if (summaryEl) summaryEl.innerText = `${onlineCount}/${names.length} kết nối online`;

                const esc = (window.Security && Security.escapeHtml)
                    ? (v) => Security.escapeHtml(String(v ?? ''))
                    : (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

                listEl.innerHTML = names.slice(0, 4).map(n => {
                    const iface = ifaces[n];
                    const isOnline = (iface.status || '').toLowerCase() === 'online';
                    const color = isOnline ? '#48bb78' : '#e53e3e';
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 5px; border-bottom:1px solid var(--border-color, #edf2f7); font-size:14px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="width:8px; height:8px; background:${color}; border-radius:50%;"></span>
                                <span style="font-weight:600;">${esc(n)}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-sub);">
                                <span>load: ${esc(iface.load || '0%')}</span>
                                <span style="color:${color}; font-weight:600;">${esc(iface.status || 'unknown')}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                const el = document.getElementById('util-mwan-list');
                if (el) el.innerHTML = '<div style="text-align:center; color:#999; padding:15px;">mwan3 không khả dụng</div>';
            });
    },

    // ---------- AdGuard Home stats card (Row 4, full-width) ----------
    refreshAdguard: function () {
        fetch('/cgi-bin/adguard/info')
            .then(r => r.json())
            .then(data => {
                const statusEl  = document.getElementById('util-agh-status');
                const summaryEl = document.getElementById('util-agh-summary');
                const qEl       = document.getElementById('util-agh-queries');
                const bEl       = document.getElementById('util-agh-blocked');
                const rEl       = document.getElementById('util-agh-rate');
                const tEl       = document.getElementById('util-agh-avgtime');
                const topQEl    = document.getElementById('util-agh-top-queried');
                const topBEl    = document.getElementById('util-agh-top-blocked');

                // Helper to set a coloured badge
                const setBadge = (text, bg, color) => {
                    if (!statusEl) return;
                    statusEl.innerText = text;
                    statusEl.style.background = bg;
                    statusEl.style.color = color;
                };

                if (!data || !data.installed) {
                    setBadge('CHƯA CÀI', '#fed7d7', '#822727');
                    if (summaryEl) summaryEl.innerText = data && data.message ? data.message : 'AdGuard Home không có trên router';
                    if (qEl) qEl.innerText = '--';
                    if (bEl) bEl.innerText = '--';
                    if (rEl) rEl.innerText = '--';
                    if (tEl) tEl.innerText = '--';
                    if (topQEl) topQEl.innerHTML = '<div style="color:#a0aec0; padding:8px; text-align:center;">N/A</div>';
                    if (topBEl) topBEl.innerHTML = '<div style="color:#a0aec0; padding:8px; text-align:center;">N/A</div>';
                    return;
                }

                // Remember port so the "Mở AdGuard" button opens the right URL
                if (data.port) this._aghPort = data.port;

                if (!data.running) {
                    setBadge('TẮT', '#fed7d7', '#822727');
                    if (summaryEl) summaryEl.innerText = `Đã cài (port ${data.port}) nhưng chưa chạy`;
                    return;
                }

                if (data.auth_required) {
                    setBadge('CẦN AUTH', '#feebc8', '#7b341e');
                    if (summaryEl) summaryEl.innerText = `Port ${data.port}: cần Basic Auth — cho phép 127.0.0.1 trong AGH`;
                    return;
                }

                // Running + reachable. Use protection_enabled for the BẬT/TẮT signal.
                const protectionOn = (data.status && data.status.protection_enabled) || data.protection_enabled;
                setBadge(protectionOn ? 'BẬT' : 'TẠM TẮT',
                         protectionOn ? '#c6f6d5' : '#feebc8',
                         protectionOn ? '#22543d' : '#7b341e');

                if (summaryEl) {
                    const v = data.version ? ` · v${data.version}` : '';
                    summaryEl.innerText = `Bảo vệ DNS qua port ${data.port}${v}`;
                }

                // Stats grid
                const queries = data.num_dns_queries || 0;
                const blocked = data.num_blocked || 0;
                const rate = queries > 0 ? (100 * blocked / queries) : 0;
                const avgMs = (data.avg_processing_time || 0) * 1000;  // s → ms

                if (qEl) qEl.innerText = this._fmtNum(queries);
                if (bEl) bEl.innerText = this._fmtNum(blocked);
                if (rEl) rEl.innerText = (queries === 0 ? '--' : rate.toFixed(rate < 10 ? 2 : 1) + '%');
                if (tEl) tEl.innerText = avgMs < 1 ? '< 1 ms' : avgMs.toFixed(avgMs < 10 ? 2 : 0) + ' ms';

                // Top domain tables
                const stats = data.stats || {};
                const renderTopList = (arr, color) => {
                    if (!Array.isArray(arr) || arr.length === 0) {
                        return '<div style="color:#a0aec0; padding:8px; text-align:center;">Chưa có dữ liệu</div>';
                    }
                    return arr.slice(0, 5).map(item => {
                        // Each item is either { "domain": count } or { name, count }
                        let name = '', count = 0;
                        if (typeof item === 'object' && item !== null) {
                            const keys = Object.keys(item);
                            if (keys.length === 1 && typeof item[keys[0]] === 'number') {
                                name = keys[0]; count = item[keys[0]];
                            } else {
                                name = item.name || item.domain || keys[0] || '';
                                count = item.count || item[keys[0]] || 0;
                            }
                        }
                        return `
                            <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px dashed var(--border-color, #edf2f7); font-size:13px;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:75%;" title="${this._esc(name)}">${this._esc(name)}</span>
                                <span style="color:${color}; font-weight:600; flex-shrink:0;">${this._fmtNum(count)}</span>
                            </div>
                        `;
                    }).join('');
                };
                if (topQEl) topQEl.innerHTML = renderTopList(stats.top_queried_domains, '#3182ce');
                if (topBEl) topBEl.innerHTML = renderTopList(stats.top_blocked_domains, '#e53e3e');
            })
            .catch(() => {
                const statusEl = document.getElementById('util-agh-status');
                const sumEl    = document.getElementById('util-agh-summary');
                if (statusEl) { statusEl.innerText = 'LỖI'; statusEl.style.background = '#fed7d7'; statusEl.style.color = '#822727'; }
                if (sumEl) sumEl.innerText = 'Lỗi kết nối endpoint';
            });
    },

    // ---------- Tailscale ----------
    refreshTailscale: function () {
        fetch('/cgi-bin/tailscale/status')
            .then(r => r.json())
            .then(data => {
                const stEl  = document.getElementById('util-ts-status');
                const dEl   = document.getElementById('util-ts-detail');
                const sumEl = document.getElementById('util-ts-summary');

                if (!data || data.status === 'error' || !data.installed) {
                    if (stEl)  stEl.innerText = 'Chưa cài';
                    if (sumEl) sumEl.innerText = 'opkg install tailscale';
                    if (dEl)   dEl.innerHTML = '<div style="text-align:center; color:#999; padding:15px; font-size:14px;">Tailscale chưa cài đặt</div>';
                    return;
                }

                const running = data.running === true || data.state === 'Running';
                const ip = data.ipv4 || data.ip || '';
                const hostname = data.hostname || data.self || '';

                if (stEl) {
                    stEl.innerText = running ? 'ĐÃ KẾT NỐI' : 'NGẮT';
                    stEl.style.background = running ? '#c6f6d5' : '#fed7d7';
                    stEl.style.color      = running ? '#22543d' : '#822727';
                }
                if (sumEl) sumEl.innerText = hostname || (running ? 'Connected' : 'Disconnected');

                const esc = (window.Security && Security.escapeHtml)
                    ? (v) => Security.escapeHtml(String(v ?? ''))
                    : (v) => String(v ?? '');

                if (dEl) {
                    dEl.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:6px; padding:5px; font-size:14px;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-sub);">Trạng thái</span>
                                <span style="font-weight:600; color:${running ? '#38a169' : '#e53e3e'};">${running ? 'Online' : 'Offline'}</span>
                            </div>
                            ${ip ? `
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-sub);">IP Tailscale</span>
                                <span style="font-family:monospace; color:#3182ce; font-weight:600;">${esc(ip)}</span>
                            </div>` : ''}
                            ${hostname ? `
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-sub);">Hostname</span>
                                <span style="font-weight:600;">${esc(hostname)}</span>
                            </div>` : ''}
                        </div>
                    `;
                }
            })
            .catch(() => {
                const stEl = document.getElementById('util-ts-status');
                if (stEl) stEl.innerText = 'N/A';
            });
    },
};

window.UtilCards = UtilCards;
