// screens.jsx — all VWRT screens (used by app.jsx)

const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

// ─── helpers ──────────────────────────────────────────────────────────────
function t(L) {
  return window.I18N[window.__lang || "vi"][L] || L;
}
function fmtBps(mbps) {
  if (mbps >= 1000) return (mbps / 1000).toFixed(2) + " GB/s";
  if (mbps >= 1) return mbps.toFixed(2) + " MB/s";
  return (mbps * 1024).toFixed(0) + " KB/s";
}
function signalStrength(rsrp) {
  // -65 strong … -110 dead
  return Math.max(0, Math.min(5, Math.round((rsrp + 110) / 9)));
}

// ─── shared bits ──────────────────────────────────────────────────────────
function Pill({ children, tone = "" }) {
  return <span className={`tag tag-${tone}`}><span className="dot" />{children}</span>;
}

function StatCard({ label, value, sub, color, sparkData, unit, live }) {
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="metric" style={{ color }}>
        {value}{unit && <small>{unit}</small>}
      </div>
      {sub && <div className="dim small" style={{ marginTop: 6 }}>{sub}</div>}
      {sparkData && (
        <div style={{ marginTop: 10, color }}>
          <Sparkline data={sparkData} width={220} height={36} fill />
        </div>
      )}
      {live && (
        <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10 }} className="mono dim">
          <span className="dot dot-live" style={{ color: "var(--ok)", marginRight: 5 }} />LIVE
        </div>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, lang }) {
  const [u, setU] = uS("root");
  const [p, setP] = uS("");
  const [loading, setLoading] = uS(false);
  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 700);
  };
  return (
    <div className="login-wrap">
      <div className="login-card fade-in">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 22, borderRadius: 14 }}>V</div>
        </div>
        <div className="h1" style={{ marginBottom: 6 }}>{t("appName")}</div>
        <div className="dim" style={{ marginBottom: 26 }}>{t("loginSub")}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: 10, color: "var(--text-faint)" }}>
              <Icon name="user" size={16} />
            </div>
            <input className="input" style={{ paddingLeft: 38, height: 40 }} value={u} onChange={(e) => setU(e.target.value)} placeholder={t("username")} />
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: 10, color: "var(--text-faint)" }}>
              <Icon name="lock" size={16} />
            </div>
            <input className="input" type="password" style={{ paddingLeft: 38, height: 40 }} value={p} onChange={(e) => setP(e.target.value)} placeholder={t("password")} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ height: 42, justifyContent: "center", marginTop: 6, fontSize: 14 }}>
            {loading ? "..." : t("signIn")}
            {!loading && <Icon name="arrowRight" size={14} />}
          </button>
        </form>
        <div className="dim tiny" style={{ marginTop: 22, fontFamily: "var(--font-mono)" }}>
          OpenWrt 24.10.1 · aarch64_cortex-a53 · v2.4.0
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function DashboardScreen({ go }) {
  const d = useLiveData();
  const rsrp = d.rsrp[d.rsrp.length - 1];
  const sinr = d.sinr[d.sinr.length - 1];
  const cpu = d.cpu[d.cpu.length - 1];
  const ram = d.ram[d.ram.length - 1];
  const rom = d.rom[d.rom.length - 1];
  const temp = d.temp[d.temp.length - 1];
  const ping = d.ping[d.ping.length - 1];
  const sig = signalStrength(rsrp);
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 18 }}>
        <div>
          <div className="h1">{t("dashboard")}</div>
          <div className="dim">{t("dashboardSub")} · <span className="mono">openwrt-mt3000</span></div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Pill tone="ok">{t("online")}</Pill>
          <span className="mono tiny dim">↑ 3d 14h 22m</span>
        </div>
      </div>

      {/* Big top KPIs row */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label={t("signal") + " · RSRP"} value={rsrp.toFixed(0)} unit="dBm" color="var(--ok)" sparkData={d.rsrp} live />
        <StatCard label="SINR" value={sinr.toFixed(1)} unit="dB" color="var(--info)" sparkData={d.sinr} />
        <StatCard label={t("ping")} value={ping.toFixed(0)} unit="ms" color="var(--warn)" sparkData={d.ping} />
        <StatCard label={t("temp")} value={temp.toFixed(0)} unit="°C" color="var(--danger)" sparkData={d.temp} />
      </div>

      {/* Modem + System */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        {/* Modem card */}
        <div className="card" onClick={() => go("modem")} style={{ cursor: "pointer" }}>
          <div className="card-head">
            <div style={{ color: "var(--info)" }}><Icon name="antenna" size={20} /></div>
            <div className="card-title">{t("modem")}</div>
            <div style={{ marginLeft: "auto" }}><Pill tone="info">5G NSA</Pill></div>
          </div>
          <div className="row" style={{ alignItems: "flex-end", gap: 18, marginBottom: 16 }}>
            <div>
              <div className="metric-label">{t("operator")}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>Viettel</div>
              <div className="dim small">Quectel RM520N-GL</div>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--ok)" }}>
              <SignalBars strength={sig} height={28} />
            </div>
          </div>
          <div className="grid grid-4" style={{ gap: 8 }}>
            <Mini label="Band" value="n78+B3" />
            <Mini label="CA" value="2CC" />
            <Mini label="RSRQ" value={d.rsrq[d.rsrq.length - 1].toFixed(1)} />
            <Mini label="RSSI" value={d.rssi[d.rssi.length - 1].toFixed(0)} />
          </div>
          <div style={{ marginTop: 12, color: "var(--info)" }}>
            <AreaChart data={d.rsrp} width={520} height={110} color="var(--info)" min={-110} max={-60} formatValue={v => v.toFixed(0)} label="rsrp" live />
          </div>
        </div>

        {/* System card */}
        <div className="card">
          <div className="card-head">
            <div style={{ color: "var(--accent)" }}><Icon name="router" size={20} /></div>
            <div className="card-title">{t("system")}</div>
            <div style={{ marginLeft: "auto" }} className="mono tiny dim">MT3000 · OpenWrt</div>
          </div>
          <div className="grid grid-3" style={{ gap: 12, marginBottom: 16 }}>
            <Gauge value={cpu} size={104} color="var(--accent)" track="var(--border)" label={t("cpu")} thickness={9} />
            <Gauge value={ram} size={104} color="var(--info)" track="var(--border)" label={t("ram")} thickness={9} />
            <Gauge value={rom} size={104} color="var(--warn)" track="var(--border)" label={t("rom")} thickness={9} />
          </div>
          <div className="grid grid-3" style={{ gap: 8 }}>
            <Mini label="Load" value={(cpu / 100).toFixed(2)} />
            <Mini label="Mem" value="412/1024 MB" />
            <Mini label="↑" value="3d 14h" />
          </div>
        </div>
      </div>

      {/* Network traffic + SMS preview */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div style={{ color: "var(--ok)" }}><Icon name="network" size={20} /></div>
            <div className="card-title">Realtime Traffic</div>
            <div style={{ marginLeft: "auto" }} className="row" style={{ gap: 12 }}>
              <span className="row tiny mono"><span className="dot" style={{ color: "var(--ok)" }} />RX {fmtBps(d.rx[d.rx.length - 1])}</span>
              <span className="row tiny mono"><span className="dot" style={{ color: "var(--danger)" }} />TX {fmtBps(d.tx[d.tx.length - 1])}</span>
            </div>
          </div>
          <div style={{ position: "relative", color: "var(--ok)" }}>
            <AreaChart data={d.rx} width={520} height={140} color="var(--ok)" min={0} max={6} formatValue={v => v.toFixed(1)} label="rx" />
          </div>
          <div style={{ position: "relative", color: "var(--danger)", marginTop: -50 }}>
            <AreaChart data={d.tx} width={520} height={90} color="var(--danger)" min={0} max={3} formatValue={v => v.toFixed(1)} label="tx" />
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-head">
            <div style={{ color: "var(--warn)" }}><Icon name="sms" size={20} /></div>
            <div className="card-title">{t("sms")}</div>
            <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={() => go("sms")}>
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div className="scrollbox" style={{ maxHeight: 280, marginRight: -8, paddingRight: 8 }}>
            {window.VData.state.sms.slice(0, 4).map(m => (
              <div key={m.id} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", gap: 10 }}>
                <div className="sms-avatar">{m.sender[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ marginBottom: 2 }}>
                    <span className="bold" style={{ fontSize: 13 }}>{m.sender}</span>
                    <span className="dim tiny mono">{m.time}</span>
                  </div>
                  <div className="dim small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.body}
                  </div>
                </div>
                {m.unread && <span className="dot" style={{ color: "var(--accent)" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MultiWAN + AdGuard */}
      <div className="grid grid-2">
        <div className="card" onClick={() => go("multiwan")} style={{ cursor: "pointer" }}>
          <div className="card-head">
            <div style={{ color: "var(--ok)" }}><Icon name="network" size={20} /></div>
            <div className="card-title">{t("multiwan")}</div>
            <div style={{ marginLeft: "auto" }}><Pill tone="ok">2/3</Pill></div>
          </div>
          {window.VData.state.wans.map(w => (
            <div key={w.name} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", gap: 10 }}>
              <span className="dot" style={{ color: w.status === "online" ? "var(--ok)" : "var(--danger)" }} />
              <div style={{ flex: 1 }}>
                <div className="row between">
                  <span className="bold small">{w.label}</span>
                  <span className="mono tiny dim">{w.ip}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 3 }}>
                  <span className="tag">{w.name}</span>
                  <span className="tiny dim mono">↑{w.tx.toFixed(2)} ↓{w.rx.toFixed(2)} MB/s</span>
                  <span className="tiny mono" style={{ marginLeft: "auto", color: w.latency < 30 ? "var(--ok)" : "var(--warn)" }}>{w.latency}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" onClick={() => go("adguard")} style={{ cursor: "pointer" }}>
          <div className="card-head">
            <div style={{ color: "var(--ok)" }}><Icon name="shield" size={20} /></div>
            <div className="card-title">{t("adguard")}</div>
            <div style={{ marginLeft: "auto" }}><Pill tone="ok">{t("connected")}</Pill></div>
          </div>
          <div className="grid grid-4" style={{ gap: 8, marginBottom: 14 }}>
            <Mini label={t("queries")} value="142K" color="var(--info)" />
            <Mini label={t("blocked")} value="28.4K" color="var(--danger)" />
            <Mini label={t("blockedPct")} value="19.9%" color="var(--warn)" />
            <Mini label={t("avgTime")} value="4ms" color="var(--accent)" />
          </div>
          <div style={{ color: "var(--info)" }}>
            <BarChart data={window.VData.state.dns24.map(x => x.q)} width={520} height={100} color="var(--info)" labels={Array.from({ length: 24 }, (_, i) => `${i}h`)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, color }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: "8px 10px", border: "1px solid var(--border)" }}>
      <div className="metric-label" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: color || "inherit" }}>{value}</div>
    </div>
  );
}

// ─── Modem details ────────────────────────────────────────────────────────
function ModemScreen() {
  const d = useLiveData();
  const charts = [
    { k: "rsrp", title: "RSRP", unit: "dBm", color: "var(--ok)", min: -110, max: -60 },
    { k: "sinr", title: "SINR", unit: "dB", color: "var(--info)", min: -2, max: 28 },
    { k: "rsrq", title: "RSRQ", unit: "dB", color: "var(--warn)", min: -18, max: -6 },
    { k: "rssi", title: "RSSI", unit: "dBm", color: "var(--danger)", min: -85, max: -45 },
  ];
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("modem")}</div>
          <div className="dim">Quectel RM520N-GL · Viettel · {t("connected")}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Pill tone="info">5G NSA</Pill>
          <Pill tone="ok">{t("connected")}</Pill>
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label">{t("operator")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>Viettel</div>
            <span className="mono dim small">VN · 45204</span>
          </div>
          <div className="row" style={{ marginTop: 12, gap: 6 }}>
            <Pill tone="info">APN: v-internet</Pill>
          </div>
        </div>
        <div className="card">
          <div className="metric-label">{t("band")} / CA</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>n78 + B3</div>
          <div className="dim small mono" style={{ marginTop: 4 }}>2CC · BW 100+20 MHz · PCI 184</div>
        </div>
        <div className="card">
          <div className="metric-label">{t("publicIp")}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>10.41.23.18</div>
          <div className="dim small mono" style={{ marginTop: 4 }}>v6: 2001:ee0:4f00:::e/64</div>
        </div>
        <div className="card">
          <div className="metric-label">{t("ttl")}</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>64</div>
          <div className="dim small mono" style={{ marginTop: 4 }}>iptables mangle · OK</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        {charts.map(c => (
          <div className="card" key={c.k}>
            <div className="card-head">
              <div className="card-title" style={{ color: c.color }}>{c.title}</div>
              <div style={{ marginLeft: "auto" }}>
                <span className="metric mono" style={{ fontSize: 24, color: c.color }}>{d[c.k][d[c.k].length - 1].toFixed(1)}</span>
                <span className="dim small mono"> {c.unit}</span>
              </div>
            </div>
            <div style={{ color: c.color }}>
              <AreaChart data={d[c.k]} width={560} height={150} color={c.color} min={c.min} max={c.max} formatValue={v => v.toFixed(0)} label={c.k} live />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">{t("temp")} · {t("ping")}</div>
            <div style={{ marginLeft: "auto" }} className="row" style={{ gap: 12 }}>
              <span className="mono small"><span className="dot" style={{ color: "var(--danger)" }} /> {d.temp[d.temp.length - 1].toFixed(0)}°C</span>
              <span className="mono small"><span className="dot" style={{ color: "var(--warn)" }} /> {d.ping[d.ping.length - 1].toFixed(0)}ms</span>
            </div>
          </div>
          <div style={{ color: "var(--danger)" }}>
            <AreaChart data={d.temp} width={560} height={130} color="var(--danger)" min={35} max={75} formatValue={v => v.toFixed(0)} label="temp" />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Signal Heatmap · 60s</div>
            <span className="dim small mono" style={{ marginLeft: "auto" }}>weakest → strongest</span>
          </div>
          <div style={{ color: "var(--ok)", marginTop: 6 }}>
            <Heatmap data={d.rsrp} width={560} height={60} color="var(--ok)" />
          </div>
          <div className="row between dim small mono" style={{ marginTop: 8 }}>
            <span>-60s</span><span>-30s</span><span>now</span>
          </div>
          <div className="div" />
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Pill>EARFCN 627264</Pill>
            <Pill>PCI 184</Pill>
            <Pill>TAC 0x1f3c</Pill>
            <Pill>Cell ID 0x012d0a01</Pill>
            <Pill>MCS 23</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SMS ──────────────────────────────────────────────────────────────────
function SmsScreen() {
  const [sel, setSel] = uS(window.VData.state.sms[0]);
  const [compose, setCompose] = uS(false);
  const [ussd, setUssd] = uS(false);
  const [tab, setTab] = uS("inbox");
  return (
    <div className="fade-in" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("sms")}</div>
          <div className="dim">{t("smsSub")} · 6 {t("inbox").toLowerCase()}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setUssd(true)}><Icon name="phone" size={14} />USSD</button>
          <button className="btn btn-primary" onClick={() => setCompose(true)}><Icon name="edit" size={14} />{t("compose")}</button>
        </div>
      </div>

      <div className="row" style={{ gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {["inbox", "sent"].map(x => (
          <button key={x}
            onClick={() => setTab(x)}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: tab === x ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "10px 14px",
              color: tab === x ? "var(--text)" : "var(--text-dim)",
            }}>
            {t(x)} <span className="tag" style={{ marginLeft: 6 }}>{x === "inbox" ? 6 : 12}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-2" style={{ flex: 1, minHeight: 0, gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        {/* List */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <input className="input" placeholder={t("search")} />
          </div>
          <div className="scrollbox" style={{ flex: 1 }}>
            {window.VData.state.sms.map(m => (
              <div key={m.id}
                className={`sms-row ${m.unread ? "unread" : ""} ${sel.id === m.id ? "active" : ""}`}
                onClick={() => setSel(m)}>
                <div className="sms-avatar" style={{
                  background: m.type === "operator" ? "rgba(74,168,255,0.15)" : m.type === "otp" ? "rgba(255,182,72,0.15)" : "var(--surface-2)",
                  color: m.type === "operator" ? "var(--info)" : m.type === "otp" ? "var(--warn)" : "var(--text)",
                }}>
                  {m.sender[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between"><span className="bold small">{m.sender}</span><span className="dim tiny mono">{m.time}</span></div>
                  <div className="dim small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{m.body}</div>
                </div>
                {m.unread && <span className="dot" style={{ color: "var(--accent)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div className="modal-head">
            <div className="sms-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{sel.sender[0]}</div>
            <div style={{ flex: 1 }}>
              <div className="bold">{sel.sender}</div>
              <div className="dim small mono">{sel.phone} · {sel.time}</div>
            </div>
            <button className="btn btn-icon btn-ghost"><Icon name="trash" size={16} /></button>
          </div>
          <div className="modal-body">
            <div style={{ background: "var(--surface-2)", padding: "16px 18px", borderRadius: "var(--radius)", lineHeight: 1.6, fontSize: 14 }}>
              {sel.body}
            </div>
            <div className="dim tiny mono" style={{ marginTop: 12 }}>SMS · GSM-7 · 1 segment · received via wwan0</div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn"><Icon name="arrowDown" size={14} />Reply</button>
            <button className="btn btn-ghost"><Icon name="send" size={14} />Forward</button>
          </div>
        </div>
      </div>

      {compose && <ComposeModal onClose={() => setCompose(false)} />}
      {ussd && <UssdModal onClose={() => setUssd(false)} />}
    </div>
  );
}

function ComposeModal({ onClose }) {
  const [to, setTo] = uS("");
  const [body, setBody] = uS("");
  const [sending, setSending] = uS(false);
  const send = () => {
    setSending(true);
    setTimeout(() => { setSending(false); onClose(); window.toast && window.toast(t("sendSms") + " ✓ " + to); }, 800);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <Icon name="edit" size={18} />
          <div className="bold">{t("compose")}</div>
          <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="metric-label">{t("to")}</div>
            <input className="input" placeholder="+84..." value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <div className="metric-label">{t("message")}</div>
            <textarea className="input" rows={6} placeholder="..." value={body} onChange={e => setBody(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--font-sans)" }} />
            <div className="row between dim tiny mono" style={{ marginTop: 6 }}>
              <span>{body.length} / 160 chars</span>
              <span>{Math.ceil(body.length / 160) || 1} segment</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>{t("cancel")}</button>
          <button className="btn btn-primary" onClick={send} disabled={sending || !to || !body}>
            <Icon name="send" size={14} />{sending ? "..." : t("sendSms")}
          </button>
        </div>
      </div>
    </div>
  );
}

function UssdModal({ onClose }) {
  const [code, setCode] = uS("*101#");
  const [result, setResult] = uS(null);
  const [loading, setLoading] = uS(false);
  const send = () => {
    setLoading(true);
    setTimeout(() => {
      setResult("TK chinh: 28.500d\nTKKM: 200.000d\nHan KM: 30/05/2026\nSoan TK gui 191 de KT chi tiet.");
      setLoading(false);
    }, 900);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <Icon name="phone" size={18} />
          <div className="bold">USSD</div>
          <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="row" style={{ gap: 8 }}>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
            <button className="btn btn-primary" onClick={send}>{loading ? "..." : "Send"}</button>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {["*101#", "*102#", "*098#", "*100#", "*123#"].map(c => (
              <button key={c} className="btn" onClick={() => setCode(c)} style={{ fontFamily: "var(--font-mono)" }}>{c}</button>
            ))}
          </div>
          {result && (
            <div className="codeblock" style={{ marginTop: 16, whiteSpace: "pre-wrap", color: "var(--text)" }}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Clients ──────────────────────────────────────────────────────────────
function ClientsScreen() {
  const [q, setQ] = uS("");
  const list = window.VData.state.clients.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.ip.includes(q) || c.mac.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("clients")}</div>
          <div className="dim">{list.length} {t("online")} · DHCP lease pool 192.168.1.100–250</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder={t("search")} value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
          <button className="btn"><Icon name="refresh" size={14} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Mini label="Total" value={list.length} color="var(--text)" />
        <Mini label="WiFi 5G" value={list.filter(c => c.iface === "WiFi 5G").length} color="var(--info)" />
        <Mini label="WiFi 2.4G" value={list.filter(c => c.iface === "WiFi 2.4G").length} color="var(--warn)" />
        <Mini label="LAN" value={list.filter(c => c.iface.startsWith("LAN")).length} color="var(--ok)" />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              {["Device", "IP", "MAC", "Interface", "RX / TX", "Lease"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={c.mac} style={{ borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-dim)" }}>
                      <Icon name={c.icon} size={16} />
                    </div>
                    <div>
                      <div className="bold small">{c.name}</div>
                      <div className="dim tiny mono">{c.vendor}</div>
                    </div>
                  </div>
                </td>
                <td className="mono small" style={{ padding: "12px 14px" }}>{c.ip}</td>
                <td className="mono tiny dim" style={{ padding: "12px 14px" }}>{c.mac}</td>
                <td style={{ padding: "12px 14px" }}>
                  <Pill tone={c.iface === "WiFi 5G" ? "info" : c.iface === "WiFi 2.4G" ? "warn" : "ok"}>{c.iface}</Pill>
                </td>
                <td className="mono small" style={{ padding: "12px 14px" }}>
                  <span style={{ color: "var(--ok)" }}>↓{c.rx.toFixed(1)}</span> · <span style={{ color: "var(--danger)" }}>↑{c.tx.toFixed(1)}</span> MB/s
                </td>
                <td className="mono tiny dim" style={{ padding: "12px 14px" }}>{c.lease}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MultiWAN ─────────────────────────────────────────────────────────────
function MultiwanScreen() {
  const d = useLiveData();
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("multiwan")}</div>
          <div className="dim">{t("multiwanSub")} · failover policy: balanced</div>
        </div>
        <Pill tone="ok">2 / 3 {t("online")}</Pill>
      </div>

      {window.VData.state.wans.map(w => (
        <div key={w.name} className="card" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: w.status === "online" ? "var(--ok)" : "var(--danger)" }}>
                <Icon name="network" size={20} />
              </div>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="bold" style={{ fontSize: 16 }}>{w.label}</span>
                  <Pill tone={w.role === "primary" ? "info" : w.role === "backup" ? "warn" : ""}>{t(w.role)}</Pill>
                </div>
                <div className="dim small mono" style={{ marginTop: 3 }}>{w.name} · weight {w.weight} · {w.ip}</div>
              </div>
            </div>
            <Pill tone={w.status === "online" ? "ok" : "bad"}>{w.status}</Pill>
          </div>
          <div className="grid grid-4" style={{ gap: 12 }}>
            <Mini label="Latency" value={`${w.latency} ms`} color={w.latency < 30 ? "var(--ok)" : "var(--warn)"} />
            <Mini label="Loss" value={`${w.loss}%`} color={w.loss > 0 ? "var(--danger)" : "var(--ok)"} />
            <Mini label="↓ RX" value={fmtBps(w.rx)} color="var(--ok)" />
            <Mini label="↑ TX" value={fmtBps(w.tx)} color="var(--danger)" />
          </div>
          {w.status === "online" && (
            <div style={{ color: w.role === "primary" ? "var(--info)" : "var(--warn)", marginTop: 12 }}>
              <Sparkline data={w.role === "primary" ? d.rx : d.rx.map(v => v * 0.05)} width={1000} height={40} fill strokeWidth={1.5} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── AdGuard ──────────────────────────────────────────────────────────────
function AdguardScreen() {
  const d = useLiveData();
  const dns24 = window.VData.state.dns24;
  const maxQ = Math.max(...window.VData.state.topQueried.map(x => x.n));
  const maxB = Math.max(...window.VData.state.topBlocked.map(x => x.n));
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("adguard")}</div>
          <div className="dim">{t("adguardSub")} · 3 lists active · 1,284,021 rules</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Pill tone="ok">{t("connected")}</Pill>
          <button className="btn">Open ↗</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label={t("queries")} value="142.4K" sub={t("last24h")} color="var(--info)" sparkData={d.dnsQ} />
        <StatCard label={t("blocked")} value="28.4K" sub={t("last24h")} color="var(--danger)" sparkData={d.dnsB} />
        <StatCard label={t("blockedPct")} value="19.9" unit="%" sub="filter rate" color="var(--warn)" />
        <StatCard label={t("avgTime")} value="4" unit="ms" sub="DNS response" color="var(--accent)" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">DNS Queries · {t("last24h")}</div>
          <div className="row" style={{ marginLeft: "auto", gap: 12 }}>
            <span className="row tiny mono"><span className="dot" style={{ color: "var(--info)" }} />{t("queries")}</span>
            <span className="row tiny mono"><span className="dot" style={{ color: "var(--danger)" }} />{t("blocked")}</span>
          </div>
        </div>
        <div style={{ position: "relative", color: "var(--info)" }}>
          <BarChart data={dns24.map(x => x.q)} width={1100} height={160} color="var(--info)" labels={Array.from({ length: 24 }, (_, i) => `${i}h`)} />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">{t("topQueried")}</div>
            <span className="dim small mono" style={{ marginLeft: "auto" }}>last 24h</span>
          </div>
          <div style={{ color: "var(--info)" }}>
            {window.VData.state.topQueried.map(x => <HBar key={x.d} label={x.d} value={x.n} max={maxQ} color="var(--info)" />)}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">{t("topBlocked")}</div>
            <span className="dim small mono" style={{ marginLeft: "auto" }}>last 24h</span>
          </div>
          <div style={{ color: "var(--danger)" }}>
            {window.VData.state.topBlocked.map(x => <HBar key={x.d} label={x.d} value={x.n} max={maxB} color="var(--danger)" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WiFi ─────────────────────────────────────────────────────────────────
function WifiScreen() {
  const [show, setShow] = uS(false);
  const networks = [
    { ssid: "VWRT_5G", band: "5GHz", ch: 36, clients: 4, pwd: "VietterRouter@2026", enabled: true, sec: "WPA3" },
    { ssid: "VWRT_2.4G", band: "2.4GHz", ch: 6, clients: 3, pwd: "VietterRouter@2026", enabled: true, sec: "WPA2" },
    { ssid: "VWRT_Guest", band: "2.4GHz", ch: "auto", clients: 0, pwd: "guest1234", enabled: false, sec: "Open" },
  ];
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("wifi")}</div>
          <div className="dim">{t("wifiSub")} · MT7981 · MT7915 · 802.11ax</div>
        </div>
        <button className="btn btn-primary"><Icon name="key" size={14} />New SSID</button>
      </div>

      <div className="grid grid-2">
        {networks.map(n => (
          <div className="card" key={n.ssid}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: n.enabled ? "var(--info)" : "var(--text-faint)" }}>
                  <Icon name="wifi" size={20} />
                </div>
                <div>
                  <div className="bold" style={{ fontSize: 16 }}>{n.ssid}</div>
                  <div className="dim small mono" style={{ marginTop: 3 }}>{n.band} · ch {n.ch} · {n.sec}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Pill tone={n.enabled ? "ok" : ""}>{n.enabled ? "ON" : "OFF"}</Pill>
              </div>
            </div>
            <div className="grid grid-3" style={{ gap: 8, marginBottom: 12 }}>
              <Mini label="Clients" value={n.clients} />
              <Mini label="Tx Power" value="20 dBm" />
              <Mini label="Mode" value="ax" />
            </div>
            <div className="metric-label">Password</div>
            <div className="row" style={{ gap: 8 }}>
              <input className="input mono" readOnly value={show ? n.pwd : "•".repeat(n.pwd.length)} />
              <button className="btn btn-icon" onClick={() => setShow(s => !s)}><Icon name="eye" size={14} /></button>
              <button className="btn btn-icon"><Icon name="edit" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tailscale ────────────────────────────────────────────────────────────
function TailscaleScreen() {
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("tailscale")}</div>
          <div className="dim">{t("tailscaleSub")} · tailnet: tuanlong.gmail.com</div>
        </div>
        <Pill tone="ok">{t("connected")}</Pill>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Mini label="This node" value="vwrt-mt3000" color="var(--accent)" />
        <Mini label="Tailscale IP" value="100.81.12.2" color="var(--info)" />
        <Mini label="Exit node" value="OFF" color="var(--text-dim)" />
        <Mini label="Subnet route" value="192.168.1.0/24" color="var(--ok)" />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-head" style={{ padding: 16, marginBottom: 0, borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">Peers · {window.VData.state.tsPeers.length}</div>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }}><Icon name="refresh" size={14} />Refresh</button>
        </div>
        {window.VData.state.tsPeers.map((p, i) => (
          <div key={p.ip} className="row" style={{ padding: "14px 18px", borderBottom: i < 3 ? "1px solid var(--border)" : "none", gap: 14 }}>
            <span className="dot" style={{ color: p.online ? "var(--ok)" : "var(--text-faint)" }} />
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="bold small">{p.name}</span>
                <Pill>{p.os}</Pill>
              </div>
              <div className="mono dim tiny" style={{ marginTop: 3 }}>{p.ip}</div>
            </div>
            <div className="mono tiny dim">{p.last}</div>
            <button className="btn btn-icon btn-ghost"><Icon name="arrowRight" size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────
function SettingsScreen({ onLogout }) {
  const [hour, setHour] = uS(4);
  const [days, setDays] = uS([0, 3]); // Sun, Wed
  const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{t("settings")}</div>
          <div className="dim">{t("settingsSub")}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <div style={{ color: "var(--warn)" }}><Icon name="calendar" size={18} /></div>
            <div className="card-title">{t("rebootSched")}</div>
          </div>
          <div className="metric-label">Time of day</div>
          <input type="range" min="0" max="23" value={hour} onChange={e => setHour(+e.target.value)} style={{ width: "100%" }} />
          <div className="row between mono" style={{ marginTop: 4 }}>
            <span className="dim tiny">00:00</span>
            <span style={{ color: "var(--warn)", fontWeight: 700, fontSize: 18 }}>{String(hour).padStart(2, "0")}:00</span>
            <span className="dim tiny">23:00</span>
          </div>

          <div className="metric-label" style={{ marginTop: 16 }}>Days</div>
          <div className="row" style={{ gap: 6 }}>
            {dayLabels.map((dl, i) => (
              <button key={i}
                onClick={() => setDays(days.includes(i) ? days.filter(d => d !== i) : [...days, i])}
                className="btn"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  justifyContent: "center",
                  background: days.includes(i) ? "var(--accent)" : "var(--surface-2)",
                  color: days.includes(i) ? "#0a0d12" : "var(--text-dim)",
                  borderColor: days.includes(i) ? "var(--accent)" : "var(--border)",
                  fontWeight: 600,
                }}>
                {dl}
              </button>
            ))}
          </div>
          <div className="codeblock" style={{ marginTop: 14 }}>
            0 {hour} * * {days.length === 7 ? "*" : days.join(",")}   /sbin/reboot
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div style={{ color: "var(--danger)" }}><Icon name="power" size={18} /></div>
            <div className="card-title">{t("reboot")} & {t("logout")}</div>
          </div>
          <div className="col" style={{ gap: 10 }}>
            <button className="btn" style={{ justifyContent: "flex-start", padding: 14 }}>
              <Icon name="refresh" size={16} />
              <div style={{ textAlign: "left" }}>
                <div className="bold small">Restart Network</div>
                <div className="dim tiny">/etc/init.d/network restart</div>
              </div>
            </button>
            <button className="btn" style={{ justifyContent: "flex-start", padding: 14 }}>
              <Icon name="zap" size={16} />
              <div style={{ textAlign: "left" }}>
                <div className="bold small">Restart Modem</div>
                <div className="dim tiny">mmcli -m 0 --disable && --enable</div>
              </div>
            </button>
            <button className="btn" style={{ justifyContent: "flex-start", padding: 14, color: "var(--danger)", borderColor: "var(--danger)" }}>
              <Icon name="power" size={16} />
              <div style={{ textAlign: "left" }}>
                <div className="bold small">{t("reboot")} now</div>
                <div className="dim tiny">/sbin/reboot</div>
              </div>
            </button>
            <button className="btn" onClick={onLogout} style={{ justifyContent: "flex-start", padding: 14 }}>
              <Icon name="logout" size={16} />
              <div style={{ textAlign: "left" }}>
                <div className="bold small">{t("logout")}</div>
                <div className="dim tiny">Clear session token</div>
              </div>
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head">
            <div style={{ color: "var(--info)" }}><Icon name="led" size={18} /></div>
            <div className="card-title">LED Control</div>
          </div>
          <div className="grid grid-4" style={{ gap: 10 }}>
            {["status", "wan", "lan", "wifi"].map(k => (
              <div key={k} style={{ background: "var(--surface-2)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div className="row between">
                  <span className="bold small up mono">{k}</span>
                  <span className="dot" style={{ color: "var(--ok)" }} />
                </div>
                <select className="input" style={{ marginTop: 8, height: 32 }}>
                  <option>default</option>
                  <option>always on</option>
                  <option>off</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// expose
Object.assign(window, {
  LoginScreen, DashboardScreen, ModemScreen, SmsScreen,
  ClientsScreen, MultiwanScreen, AdguardScreen, WifiScreen,
  TailscaleScreen, SettingsScreen,
});
