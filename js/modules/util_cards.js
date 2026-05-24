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
        this.refreshNetwork();
        this.refreshMwan3();
        this.refreshAdblock();
        this.refreshTailscale();
    },

    // ---------- Click handlers — delegate to existing modules ----------

    openNetwork:    function () { if (typeof SidebarModule !== 'undefined') SidebarModule.showNetworkStatusModal(); },
    openMwan3:      function () { if (typeof Mwan3Module       !== 'undefined') Mwan3Module.showModal();    },
    openAdblock:    function () { if (typeof AdBlockModule     !== 'undefined') AdBlockModule.showModal();  },
    openTailscale:  function () { if (typeof TailscaleModule   !== 'undefined') TailscaleModule.showModal(); },

    // AdGuard Home lives on a separate port (3000 default). Many fork firmwares
    // also serve it under /adguard/ via reverse proxy. Try the well-known port
    // first; fall back to /adguard/ path on the same origin.
    openAdGuard: function () {
        const host = window.location.hostname;
        const candidates = [
            `http://${host}:3000/`,
            `http://${host}:3001/`,
            `http://${host}/adguard/`,
        ];
        // Open the first candidate; user can switch in browser tab if wrong port.
        window.open(candidates[0], '_blank');
    },

    // ---------- Network interfaces card ----------
    refreshNetwork: function () {
        fetch('/cgi-bin/mobile/network')
            .then(r => r.json())
            .then(list => {
                const listEl    = document.getElementById('util-net-list');
                const countEl   = document.getElementById('util-net-count');
                const summaryEl = document.getElementById('util-net-summary');
                if (!listEl) return;

                if (!Array.isArray(list) || list.length === 0) {
                    listEl.innerHTML = '<div style="text-align:center; color:#999; padding:15px; font-size:14px;">Không có kết nối</div>';
                    if (countEl) countEl.innerText = '0';
                    if (summaryEl) summaryEl.innerText = 'Không có kết nối';
                    return;
                }

                if (countEl) countEl.innerText = list.length;
                if (summaryEl) summaryEl.innerText = `${list.length} kết nối`;

                const esc = (window.Security && Security.escapeHtml)
                    ? (v) => Security.escapeHtml(String(v ?? ''))
                    : (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

                listEl.innerHTML = list.slice(0, 5).map(n => {
                    const ip = n.ipv4 !== '--' ? n.ipv4 : (n.ipv6 !== '--' ? n.ipv6 : '');
                    const stateColor = n.state === 'up' ? '#48bb78' : (n.state === 'pending' ? '#ed8936' : '#a0aec0');
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 5px; border-bottom:1px solid var(--border-color, #edf2f7); font-size:14px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="width:8px; height:8px; background:${stateColor}; border-radius:50%;"></span>
                                <span style="font-weight:600;">${esc(n.label)}</span>
                                <span style="color:var(--text-sub); font-size:13px;">${esc(n.name)}</span>
                            </div>
                            <span style="font-family:monospace; color:#3182ce; font-size:13px;">${esc(ip)}</span>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                const el = document.getElementById('util-net-list');
                if (el) el.innerHTML = '<div style="text-align:center; color:#e53e3e; padding:15px;">Lỗi kết nối</div>';
            });
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

    // ---------- AdBlock / AdGuard status ----------
    refreshAdblock: function () {
        // Light check: ask uhttpd for /cgi-bin/adblock/get (existing endpoint).
        // We just want a coarse "is service enabled" signal here.
        fetch('/cgi-bin/adblock/get')
            .then(r => r.json())
            .then(data => {
                const statusEl = document.getElementById('util-ad-status');
                const sumEl    = document.getElementById('util-ad-summary');
                if (statusEl) {
                    const enabled = data && data.success && data.enabled;
                    statusEl.innerText = enabled ? 'BẬT' : 'TẮT';
                    statusEl.style.background = enabled ? '#c6f6d5' : '#fed7d7';
                    statusEl.style.color      = enabled ? '#22543d' : '#822727';
                }
                if (sumEl && data && data.lists) {
                    sumEl.innerText = `${data.lists.length} danh sách`;
                }
            })
            .catch(() => {
                const statusEl = document.getElementById('util-ad-status');
                if (statusEl) statusEl.innerText = 'N/A';
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
