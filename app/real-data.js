// real-data.js — Phase 2: real-data bridge for the React prototype.
//
// Mirrors the shape data.js exposes (window.VData / useLiveData) but fed
// from the router's /cgi-bin/* endpoints instead of fake series. Each
// numeric series is a 60-sample ring buffer so the prototype's charts
// (rsrp / cpu / rx / etc.) keep working without changes.
//
// Drop-in: if you load this AFTER data.js the i18n strings + VData
// initial seeds stay, but pollers overwrite the ring buffers on every
// tick with real values. Subscribers fire as before.
//
// Polling cadence:
//   * dashboard/stats     — every 2 s (CPU/RAM/ROM/temp + modem signals)
//   * clients/get         — every 8 s
//   * mwan3/status        — every 5 s
//   * sms/get             — every 30 s (or on demand)
//   * adguard/info        — every 30 s
//   * tailscale/status    — every 30 s
//   * wifi/get            — every 60 s (mostly static)

(function () {
    const N = 60;
    function makeSeries(seed) {
        const a = new Array(N);
        for (let i = 0; i < N; i++) a[i] = seed;
        return a;
    }
    function push(arr, v) {
        if (typeof v !== 'number' || isNaN(v)) v = arr[arr.length - 1];
        arr.shift();
        arr.push(v);
    }

    // ─── Initial state (placeholders until first poll) ──────────────────
    const state = {
        // ring buffers
        cpu: makeSeries(0),
        ram: makeSeries(0),
        rom: makeSeries(0),
        temp: makeSeries(0),
        rsrp: makeSeries(-100),
        sinr: makeSeries(0),
        rsrq: makeSeries(-15),
        rssi: makeSeries(-80),
        ping: makeSeries(0),
        rx: makeSeries(0),
        tx: makeSeries(0),
        dnsQ: makeSeries(0),
        dnsB: makeSeries(0),
        // long-form 24h
        dns24: Array.from({ length: 24 }, () => ({ q: 0, b: 0 })),
        // static snapshots refreshed on their own cadence
        sms: [],
        clients: [],
        wans: [],
        topQueried: [],
        topBlocked: [],
        tsPeers: [],
        // extra fields the prototype reads directly
        sys: { model: '--', uptime: 0, ramTotal: 0, ramUsed: 0, romTotal: 0, romUsed: 0 },
        mob: { operator: '--', mode: '--', band: '--', imei: '--', ip: '--', model: '--' },
        agh: { enabled: false, queries: 0, blocked: 0, blockedPct: 0, avgTime: 0 },
        ts:  { running: false, ip: '--', exit: false },
        wifi: [],
    };

    // ─── Subscribers ────────────────────────────────────────────────────
    const subs = new Set();
    function fire() { subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

    // ─── Fetch helper (silent on failure to avoid console flooding) ─────
    async function getJson(url, opts) {
        try {
            const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts || {}));
            if (!r.ok) return null;
            return await r.json();
        } catch (e) {
            return null;
        }
    }

    // ─── /cgi-bin/dashboard/stats (sys + mob) ───────────────────────────
    let lastLanBytes = 0;
    let lastLanTs = 0;
    async function pollStats() {
        const d = await getJson('/cgi-bin/dashboard/stats');
        if (!d) return;
        if (d.sys) {
            push(state.cpu, Number(d.sys.cpu) || 0);
            if (d.sys.ram && typeof d.sys.ram === 'object') {
                push(state.ram, Number(d.sys.ram.percent) || 0);
                state.sys.ramTotal = d.sys.ram.total || 0;
                state.sys.ramUsed = d.sys.ram.used || 0;
            }
            if (d.sys.rom && typeof d.sys.rom === 'object') {
                push(state.rom, Number(d.sys.rom.percent) || 0);
                state.sys.romTotal = d.sys.rom.total || 0;
                state.sys.romUsed = d.sys.rom.used || 0;
            }
            push(state.temp, Number(d.sys.temp) || 0);
            state.sys.model = d.sys.model || state.sys.model;
            state.sys.uptime = Number(d.sys.uptime) || 0;

            // Compute RX/TX rate (MB/s) from cumulative LAN bytes
            const now = Date.now();
            const bytes = Number(d.sys.lan_total) || 0;
            if (lastLanTs && bytes >= lastLanBytes) {
                const dtSec = Math.max(0.5, (now - lastLanTs) / 1000);
                const rateMBps = ((bytes - lastLanBytes) / dtSec) / (1024 * 1024);
                // We don't have separate RX/TX here, so split heuristically:
                // download is usually 80% of total. The Modem screen has
                // dedicated charts that read these — good enough until we
                // split rx/tx server-side.
                push(state.rx, rateMBps * 0.8);
                push(state.tx, rateMBps * 0.2);
            }
            lastLanBytes = bytes;
            lastLanTs = now;
        }
        if (d.mob) {
            const m = d.mob;
            push(state.rsrp, Number(m.rsrp) || state.rsrp[N - 1]);
            push(state.sinr, Number(m.sinr) || state.sinr[N - 1]);
            push(state.rsrq, Number(m.rsrq) || state.rsrq[N - 1]);
            push(state.rssi, Number(m.rssi) || state.rssi[N - 1]);
            state.mob.operator = m.operator_name || m.operator || state.mob.operator;
            state.mob.mode = m.active_mode || m.mode || state.mob.mode;
            state.mob.band = m.active_band || m.band || state.mob.band;
            state.mob.imei = m.imei || state.mob.imei;
            state.mob.model = m.model || m.modem || state.mob.model;
            state.mob.ping = Number(m.ping) || state.mob.ping;
            if (typeof m.ping === 'number') push(state.ping, m.ping);
            state.mob.cellid = m.cell_id || state.mob.cellid;
            state.mob.signal = m.signal || state.mob.signal;
        }
        fire();
    }

    // ─── /cgi-bin/mobile/network (modem IP) ─────────────────────────────
    async function pollMobileNetwork() {
        const arr = await getJson('/cgi-bin/mobile/network');
        if (!Array.isArray(arr)) return;
        const modemIf = arr.find(x => x && (x.proto === 'modemmanager' ||
            (x.name && x.name.indexOf('wwan') >= 0) || x.label === '4G') && x.ipv4 && x.ipv4 !== '--');
        if (modemIf) state.mob.ip = modemIf.ipv4;
        fire();
    }

    // ─── /cgi-bin/clients/get ───────────────────────────────────────────
    async function pollClients() {
        const d = await getJson('/cgi-bin/clients/get');
        if (!d || !Array.isArray(d.clients)) return;
        state.clients = d.clients.map(c => ({
            name: c.name || c.hostname || c.mac || '--',
            mac: c.mac || '--',
            ip: c.ip || '--',
            iface: c.iface || c.network || '--',
            rx: Number(c.rx) || 0,
            tx: Number(c.tx) || 0,
            lease: c.lease || c.lease_remaining || '--',
            vendor: c.vendor || '',
            icon: pickClientIcon(c),
        }));
        fire();
    }
    function pickClientIcon(c) {
        const n = ((c.name || '') + ' ' + (c.vendor || '')).toLowerCase();
        if (/iphone|samsung|pixel|xiaomi.*phone|oppo|vivo/.test(n)) return 'phone';
        if (/macbook|laptop|notebook|thinkpad/.test(n)) return 'laptop';
        if (/tv|chromecast|apple ?tv|firetv/.test(n)) return 'tv';
        if (/cam(era)?|nvr|hikvision|dahua/.test(n)) return 'cam';
        if (/echo|alexa|homepod|speaker/.test(n)) return 'speaker';
        if (/esp|sensor|chip/.test(n)) return 'chip';
        return 'router';
    }

    // ─── /cgi-bin/mwan3/status ──────────────────────────────────────────
    async function pollMwan3() {
        const d = await getJson('/cgi-bin/mwan3/status');
        if (!d) return;
        const ifaces = d.interfaces || d.members || [];
        if (!Array.isArray(ifaces)) { return; }
        state.wans = ifaces.map(w => ({
            name: w.name || w.iface || '--',
            label: w.label || w.name || '--',
            status: (w.status === 'online' || w.up === true) ? 'online' : 'offline',
            role: w.role || (w.is_default ? 'primary' : 'backup'),
            weight: Number(w.weight) || 1,
            rx: Number(w.rx) || 0,
            tx: Number(w.tx) || 0,
            latency: Number(w.latency || w.rtt) || 0,
            loss: Number(w.loss) || 0,
            ip: w.ip || w.ipv4 || '--',
        }));
        fire();
    }

    // ─── /cgi-bin/sms/get ───────────────────────────────────────────────
    async function pollSms() {
        const d = await getJson('/cgi-bin/sms/get');
        if (!d || !Array.isArray(d.messages || d)) return;
        const msgs = d.messages || d;
        state.sms = msgs.map((m, i) => ({
            id: m.id != null ? m.id : i,
            sender: m.sender || m.from || '--',
            phone: m.phone || m.from || '--',
            time: m.time || m.date || '',
            body: m.body || m.text || '',
            unread: !!m.unread,
            type: classifySms(m.sender || ''),
        }));
        fire();
    }
    function classifySms(sender) {
        if (/^\+?\d+$/.test(sender)) return 'personal';
        if (/otp|^\d{4,6}$/i.test(sender)) return 'otp';
        return 'operator';
    }

    // ─── /cgi-bin/adguard/info ──────────────────────────────────────────
    async function pollAdGuard() {
        const d = await getJson('/cgi-bin/adguard/info');
        if (!d) return;
        const stats = d.stats || d;
        state.agh.enabled = d.enabled !== false;
        state.agh.queries = Number(stats.num_dns_queries) || Number(stats.queries) || 0;
        state.agh.blocked = Number(stats.num_blocked_filtering) || Number(stats.blocked) || 0;
        state.agh.blockedPct = state.agh.queries ?
            (state.agh.blocked / state.agh.queries * 100) : 0;
        state.agh.avgTime = Number(stats.avg_processing_time) * 1000 || Number(stats.avg_time) || 0;
        // Live ring buffers for the small-area chart
        push(state.dnsQ, state.agh.queries);
        push(state.dnsB, state.agh.blocked);
        // Top domains
        const tq = stats.top_queried_domains || stats.topQueried || [];
        const tb = stats.top_blocked_domains || stats.topBlocked || [];
        state.topQueried = tq.slice(0, 8).map(x =>
            typeof x === 'object' ? { d: Object.keys(x)[0] || x.name || x.d, n: Object.values(x)[0] || x.n || 0 } : { d: x, n: 0 });
        state.topBlocked = tb.slice(0, 8).map(x =>
            typeof x === 'object' ? { d: Object.keys(x)[0] || x.name || x.d, n: Object.values(x)[0] || x.n || 0 } : { d: x, n: 0 });
        // 24h chart (if available)
        if (Array.isArray(stats.dns_queries) && stats.dns_queries.length) {
            const step = Math.max(1, Math.floor(stats.dns_queries.length / 24));
            state.dns24 = Array.from({ length: 24 }, (_, i) => ({
                q: Number(stats.dns_queries[i * step]) || 0,
                b: Number((stats.blocked_filtering || [])[i * step]) || 0,
            }));
        }
        fire();
    }

    // ─── /cgi-bin/tailscale/status ──────────────────────────────────────
    async function pollTailscale() {
        const d = await getJson('/cgi-bin/tailscale/status');
        if (!d) return;
        state.ts.running = !!(d.BackendState === 'Running' || d.running);
        state.ts.ip = (d.TailscaleIPs && d.TailscaleIPs[0]) || d.ip || '--';
        const peers = d.Peer || d.peers || {};
        const arr = Array.isArray(peers) ? peers : Object.values(peers);
        state.tsPeers = arr.map(p => ({
            name: p.HostName || p.name || '--',
            ip: (p.TailscaleIPs && p.TailscaleIPs[0]) || p.ip || '--',
            os: p.OS || p.os || '',
            online: !!(p.Online || p.online),
            last: p.LastSeen || p.last || '',
        }));
        fire();
    }

    // ─── /cgi-bin/wifi/get ──────────────────────────────────────────────
    async function pollWifi() {
        const d = await getJson('/cgi-bin/wifi/get');
        if (!Array.isArray(d)) return;
        state.wifi = d;
        fire();
    }

    // ─── Cadenced pollers ───────────────────────────────────────────────
    const timers = [];
    function loop(fn, ms) {
        fn(); // initial
        timers.push(setInterval(fn, ms));
    }
    function start() {
        loop(pollStats, 2000);
        loop(pollMobileNetwork, 15000);
        loop(pollClients, 8000);
        loop(pollMwan3, 5000);
        loop(pollSms, 30000);
        loop(pollAdGuard, 30000);
        loop(pollTailscale, 30000);
        loop(pollWifi, 60000);
    }
    function stop() { timers.forEach(clearInterval); timers.length = 0; }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    // ─── Public API matching data.js's VData ────────────────────────────
    window.VData = {
        state,
        subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
        last(name) { const s = state[name]; return Array.isArray(s) ? s[s.length - 1] : s; },
    };
    // useLiveData hook (same as data.js but driven by real fetches)
    window.useLiveData = function () {
        const [, force] = React.useReducer(x => x + 1, 0);
        React.useEffect(() => window.VData.subscribe(force), []);
        return window.VData.state;
    };

    start();
})();
