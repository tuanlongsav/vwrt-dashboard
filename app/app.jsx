// app.jsx — VWRT prototype: app shell, command palette, tweaks integration

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "noc",
  "dark": true,
  "accent": "#00d9a6",
  "lang": "vi"
}/*EDITMODE-END*/;

const ACCENTS = ["#00d9a6", "#4aa8ff", "#ffb648", "#ff5a5f", "#b46aff", "#39ff14"];

const NAV_GROUPS = [
  {
    label: "system",
    items: [
      { id: "dashboard", icon: "dashboard" },
      { id: "modem", icon: "antenna" },
      { id: "clients", icon: "users" },
    ],
  },
  {
    label: "network",
    items: [
      { id: "wifi", icon: "wifi" },
      { id: "multiwan", icon: "network" },
      { id: "tailscale", icon: "vpn" },
    ],
  },
  {
    label: "tools",
    items: [
      { id: "sms", icon: "sms" },
      { id: "adguard", icon: "shield" },
      { id: "settings", icon: "settings" },
    ],
  },
];

const ALL_SCREENS = NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Start authed if a session is already present (login was handled by the
  // legacy index.html flow). Phase 3 will move login into React itself.
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('vwrt_session'));
  const [screen, setScreen] = useState("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // expose lang globally for t()
  window.__lang = tweaks.lang;

  // Logout: clear session + return to legacy login page (Phase 3 will move
  // login into React so we can just flip authed=false instead).
  const doLogout = () => {
    try {
      localStorage.removeItem('vwrt_session');
      localStorage.removeItem('vwrt_user');
    } catch (e) { /* ignore */ }
    if (window.VWRT_API && typeof window.VWRT_API.logout === 'function') {
      window.VWRT_API.logout();
    }
    setAuthed(false);
    window.location.href = 'index.html';
  };

  useEffect(() => {
    document.documentElement.dataset.variant = tweaks.variant;
    document.documentElement.dataset.theme = tweaks.dark ? "dark" : "light";
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty("--ok", tweaks.accent);
  }, [tweaks.variant, tweaks.dark, tweaks.accent]);

  // ⌘K / Ctrl-K opens palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // toast helper
  useEffect(() => {
    window.toast = (msg) => {
      const id = Date.now() + Math.random();
      setToasts(ts => [...ts, { id, msg }]);
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 2800);
    };
  }, []);

  const lang = tweaks.lang;
  const T = (k) => window.I18N[lang][k] || k;

  if (!authed) {
    return (
      <>
        <LoginScreen onLogin={() => setAuthed(true)} lang={lang} />
        <TweaksPanelInline tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  const current = ALL_SCREENS.find(s => s.id === screen) || ALL_SCREENS[0];

  return (
    <div className="app" data-screen-label={current.id}>
      <div className="shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">V</div>
            <div className="brand-text">
              <div className="brand-name">{T("appName")}</div>
              <div className="brand-sub">v2.4.0 · MT3000</div>
            </div>
          </div>

          <button className="btn" onClick={() => setPaletteOpen(true)} style={{ justifyContent: "space-between", padding: "8px 10px", margin: "0 4px" }}>
            <span className="row" style={{ gap: 8 }}><Icon name="search" size={14} />{T("search")}</span>
            <span className="kbd">⌘K</span>
          </button>

          <nav className="nav">
            {NAV_GROUPS.map(group => (
              <React.Fragment key={group.label}>
                <div className="nav-label">{group.label}</div>
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className={`nav-link ${screen === item.id ? "active" : ""}`}
                    onClick={() => setScreen(item.id)}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{T(item.id)}</span>
                    {item.id === "sms" && <span className="nav-badge">2</span>}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </nav>

          <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#0a0d12", display: "grid", placeItems: "center", fontWeight: 700, fontFamily: "var(--font-mono)" }}>R</div>
              <div style={{ flex: 1 }}>
                <div className="bold small">root</div>
                <div className="dim tiny mono">admin · 192.168.1.1</div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => doLogout()} title={T("logout")}><Icon name="logout" size={14} /></button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="topbar">
            <div className="crumb">
              <span>{T("appName")}</span><Icon name="chevronRight" size={12} />
              <b>{T(current.id)}</b>
            </div>
            <div className="spacer" />
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setTweak("dark", !tweaks.dark)} title="Toggle theme">
                <Icon name={tweaks.dark ? "sun" : "moon"} size={14} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={() => setTweak("lang", lang === "vi" ? "en" : "vi")} title="Language">
                <span className="mono tiny bold">{lang.toUpperCase()}</span>
              </button>
              <button className="btn btn-ghost btn-icon" onClick={() => setPaletteOpen(true)}>
                <Icon name="command" size={14} />
              </button>
            </div>
          </div>

          <div className="page scrollbox" data-screen-label={current.id}>
            <ScreenSwitch screen={screen} go={setScreen} onLogout={() => doLogout()} />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} go={(s) => { setScreen(s); setPaletteOpen(false); }} actions={[
        { id: "toggle-theme", label: tweaks.dark ? "Switch to light mode" : "Switch to dark mode", icon: tweaks.dark ? "sun" : "moon", run: () => setTweak("dark", !tweaks.dark) },
        { id: "toggle-variant", label: `Switch to ${tweaks.variant === "noc" ? "Apple Glass" : "NOC Terminal"}`, icon: "refresh", run: () => setTweak("variant", tweaks.variant === "noc" ? "apple" : "noc") },
        { id: "toggle-lang", label: `Switch to ${lang === "vi" ? "English" : "Tiếng Việt"}`, icon: "globe", run: () => setTweak("lang", lang === "vi" ? "en" : "vi") },
        { id: "logout", label: T("logout"), icon: "logout", run: () => doLogout() },
      ]} />

      <div className="toasts">
        {toasts.map(t => (
          <div className="toast" key={t.id}>
            <span style={{ color: "var(--ok)" }}><Icon name="check" size={16} /></span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      <TweaksPanelInline tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

function ScreenSwitch({ screen, go, onLogout }) {
  switch (screen) {
    case "dashboard": return <DashboardScreen go={go} />;
    case "modem": return <ModemScreen />;
    case "sms": return <SmsScreen />;
    case "clients": return <ClientsScreen />;
    case "multiwan": return <MultiwanScreen />;
    case "adguard": return <AdguardScreen />;
    case "wifi": return <WifiScreen />;
    case "tailscale": return <TailscaleScreen />;
    case "settings": return <SettingsScreen onLogout={onLogout} />;
    default: return <DashboardScreen go={go} />;
  }
}

// ─── Command palette ──────────────────────────────────────────────────────
function CommandPalette({ open, onClose, go, actions }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const lang = window.__lang || "vi";
  const T = (k) => window.I18N[lang][k] || k;

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const scrs = ALL_SCREENS.map(s => ({
      kind: "screen",
      id: s.id,
      label: T(s.id),
      sub: T(s.id + "Sub"),
      icon: s.icon,
      group: s.group,
    }));
    const acts = actions.map(a => ({ ...a, kind: "action", group: "actions" }));
    const all = [...scrs, ...acts];
    if (!q) return all;
    return all.filter(x =>
      x.label.toLowerCase().includes(q.toLowerCase()) ||
      x.id.toLowerCase().includes(q.toLowerCase()) ||
      (x.sub || "").toLowerCase().includes(q.toLowerCase())
    );
  }, [q, actions, lang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const it = items[sel];
        if (it) {
          if (it.kind === "screen") go(it.id);
          else { it.run(); onClose(); }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, sel]);

  // group items
  const grouped = useMemo(() => {
    const m = {};
    items.forEach((it, idx) => {
      const g = it.group || "other";
      if (!m[g]) m[g] = [];
      m[g].push({ it, idx });
    });
    return m;
  }, [items]);

  return (
    <div className={`palette-bg ${open ? "open" : ""}`} onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={T("cmdHint")}
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
        />
        <div className="palette-list scrollbox">
          {Object.entries(grouped).map(([g, list]) => (
            <div key={g}>
              <div className="palette-group-label">{g}</div>
              {list.map(({ it, idx }) => (
                <div
                  key={it.id}
                  className={`palette-item ${sel === idx ? "sel" : ""}`}
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => {
                    if (it.kind === "screen") go(it.id);
                    else { it.run(); onClose(); }
                  }}
                >
                  <Icon name={it.icon} size={16} />
                  <span>{it.label}</span>
                  {it.sub && <span className="palette-item-sub">{it.sub}</span>}
                </div>
              ))}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 30, textAlign: "center" }} className="dim small">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tweaks panel wrapper ─────────────────────────────────────────────────
function TweaksPanelInline({ tweaks, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Style" />
      <TweakRadio label="Variant" value={tweaks.variant}
        options={[{ value: "noc", label: "NOC" }, { value: "apple", label: "Glass" }]}
        onChange={v => setTweak("variant", v)} />
      <TweakToggle label="Dark mode" value={tweaks.dark} onChange={v => setTweak("dark", v)} />
      <TweakRadio label="Language" value={tweaks.lang}
        options={[{ value: "vi", label: "VI" }, { value: "en", label: "EN" }]}
        onChange={v => setTweak("lang", v)} />
      <TweakSection label="Accent" />
      <TweakColor label="Color" value={tweaks.accent}
        options={ACCENTS}
        onChange={v => setTweak("accent", v)} />
    </TweaksPanel>
  );
}

// mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
